import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { S3Event } from "aws-lambda";
import {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import csv from "csv-parser";
import { Readable } from "stream";

/** Normalizes CSV header keys to match product fields expected by catalogBatchProcess. */
function rowToCatalogMessage(row: Record<string, string>): { title: string; description: string; price: string; count: string } {
  const norm: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    norm[key.trim().toLowerCase()] = (value ?? "").trim();
  }
  return {
    title: norm.title ?? "",
    description: norm.description ?? "",
    price: norm.price ?? "",
    count: norm.count !== undefined && norm.count !== "" ? norm.count : "0",
  };
}

const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function badRequest(message: string): APIGatewayProxyResult {
  return {
    statusCode: 400,
    headers: defaultHeaders,
    body: JSON.stringify({ message }),
  };
}

/** Presigned PUT URL for key uploaded/${fileName}; file name from query ?name= */
export async function importProductsFile(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {
  const bucketName = process.env.IMPORT_BUCKET_NAME;
  if (!bucketName) {
    console.error("IMPORT_BUCKET_NAME is not set");
    return {
      statusCode: 500,
      headers: defaultHeaders,
      body: JSON.stringify({ message: "Server configuration error" }),
    };
  }

  const rawName = event.queryStringParameters?.name;
  if (!rawName?.trim()) {
    return badRequest("Query parameter name is required");
  }

  let fileName: string;
  try {
    fileName = decodeURIComponent(rawName).trim();
  } catch {
    return badRequest("Invalid name parameter");
  }

  if (!fileName || fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return badRequest("Invalid file name");
  }

  const key = `uploaded/${fileName}`;

  const client = new S3Client({});
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: "text/csv",
  });

  const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });

  return {
    statusCode: 200,
    headers: defaultHeaders,
    body: JSON.stringify({ url: signedUrl }),
  };
}

export async function importFileParser(event: S3Event): Promise<void> {
  const client = new S3Client({});

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

    if (!key.startsWith("uploaded/")) {
      continue;
    }

    // Folder marker from CDK deployment — not a CSV to parse
    if (key === "uploaded/.keep") {
      continue;
    }

    const getResponse = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const body = getResponse.Body;
    if (!(body instanceof Readable)) {
      console.error("S3 object body is not a readable stream", key);
      continue;
    }

    const queueUrl = process.env.CATALOG_ITEMS_QUEUE_URL;
    if (!queueUrl) {
      throw new Error("CATALOG_ITEMS_QUEUE_URL is not configured");
    }

    const rows: Record<string, string>[] = [];
    await new Promise<void>((resolve, reject) => {
      body
        .pipe(csv())
        .on("data", (row: Record<string, string>) => {
          rows.push(row);
        })
        .on("error", reject)
        .on("end", resolve);
    });

    const sqsClient = new SQSClient({});
    for (const row of rows) {
      const payload = rowToCatalogMessage(row);
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify({
            title: payload.title,
            description: payload.description,
            price: payload.price,
            count: payload.count,
          }),
        }),
      );
    }

    const relative = key.slice("uploaded/".length);
    const destKey = `parsed/${relative}`;
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: destKey,
        CopySource: `${bucket}/${key}`,
      }),
    );
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }
}
