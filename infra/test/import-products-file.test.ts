import type { APIGatewayProxyEvent } from "aws-lambda";
import { importProductsFile } from "../lib/import-service/handlers";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://test-bucket.s3.amazonaws.com/presigned-put-url"),
}));

describe("importProductsFile", () => {
  const prevBucket = process.env.IMPORT_BUCKET_NAME;

  beforeEach(() => {
    process.env.IMPORT_BUCKET_NAME = "test-import-bucket";
  });

  afterEach(() => {
    process.env.IMPORT_BUCKET_NAME = prevBucket;
  });

  it("returns 200 with presigned url for valid name query param", async () => {
    const event = {
      queryStringParameters: { name: "products.csv" },
    } as unknown as APIGatewayProxyEvent;

    const res = await importProductsFile(event);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? "{}") as { url?: string };
    expect(body.url).toBe("https://test-bucket.s3.amazonaws.com/presigned-put-url");
  });

  it("returns 400 when name is missing", async () => {
    const event = {
      queryStringParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const res = await importProductsFile(event);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 for path traversal in name", async () => {
    const event = {
      queryStringParameters: { name: "../../etc/passwd" },
    } as unknown as APIGatewayProxyEvent;

    const res = await importProductsFile(event);
    expect(res.statusCode).toBe(400);
  });
});
