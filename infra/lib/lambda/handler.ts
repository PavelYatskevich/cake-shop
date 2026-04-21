import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Pool, type PoolConfig } from "pg";
import { v4 as uuidv4 } from "uuid";
import { ensureTables } from "./db/migrate.js";

const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
};

type ProductWithStock = Product & { count: number };

type RdsSecretPayload = {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
};

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION ?? "us-east-1" });

let pool: Pool | null = null;
let schemaReady = false;

const invalidJsonSentinel = Symbol("invalid-json");

const parseRequestBody = (raw: string | null | undefined): unknown | undefined | typeof invalidJsonSentinel => {
  if (raw === undefined || raw === null || raw === "") {
    return undefined;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return invalidJsonSentinel;
  }
};

const logIncomingRequest = (handlerName: string, event: APIGatewayProxyEvent): void => {
  const parsedBody = parseRequestBody(event.body);
  const bodyForLog =
    parsedBody === invalidJsonSentinel ? "[invalid JSON]" : parsedBody === undefined ? null : parsedBody;

  console.log(
    JSON.stringify({
      level: "info",
      message: "incoming request",
      handler: handlerName,
      httpMethod: event.httpMethod,
      path: event.path,
      pathParameters: event.pathParameters ?? null,
      queryStringParameters: event.queryStringParameters ?? null,
      body: bodyForLog,
    }),
  );
};

const internalServerError = (): APIGatewayProxyResult => ({
  statusCode: 500,
  headers: defaultHeaders,
  body: JSON.stringify({ message: "Internal server error" }),
});

const readSecretPayload = async (): Promise<RdsSecretPayload> => {
  const secretArn = process.env.DATABASE_SECRET_ARN;
  if (!secretArn) {
    throw new Error("DATABASE_SECRET_ARN environment variable is required");
  }

  const response = await secretsClient.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!response.SecretString) {
    throw new Error("Secret value is empty");
  }

  return JSON.parse(response.SecretString) as RdsSecretPayload;
};

const getPool = async (): Promise<Pool> => {
  if (pool) {
    return pool;
  }

  const secret = await readSecretPayload();
  const config: PoolConfig = {
    host: secret.host,
    port: secret.port,
    user: secret.username,
    password: secret.password,
    database: secret.dbname,
    max: 4,
    ssl: { rejectUnauthorized: false },
  };

  pool = new Pool(config);
  return pool;
};

const getPoolWithSchema = async (): Promise<Pool> => {
  const p = await getPool();
  if (!schemaReady) {
    await ensureTables(p);
    schemaReady = true;
  }
  return p;
};

const rowToNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    return Number(value);
  }
  return Number(value);
};

type ValidatedCreateProduct = {
  title: string;
  description: string;
  price: number;
  count: number;
};

const validateCreateProductPayload = (payload: unknown): { ok: true; data: ValidatedCreateProduct } | { ok: false; message: string } => {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, message: "Request body must be a JSON object" };
  }

  const body = payload as Record<string, unknown>;

  if (body.title === undefined || body.title === null) {
    return { ok: false, message: "title is required" };
  }
  if (typeof body.title !== "string") {
    return { ok: false, message: "title must be a string" };
  }
  const title = body.title.trim();
  if (!title) {
    return { ok: false, message: "title must be a non-empty string" };
  }

  if (body.description !== undefined && body.description !== null && typeof body.description !== "string") {
    return { ok: false, message: "description must be a string" };
  }
  const description =
    body.description === undefined || body.description === null
      ? ""
      : typeof body.description === "string"
        ? body.description.trim()
        : "";

  if (body.price === undefined || body.price === null) {
    return { ok: false, message: "price is required" };
  }
  if (typeof body.price !== "number" || !Number.isFinite(body.price)) {
    return { ok: false, message: "price must be a finite number" };
  }
  if (body.price <= 0) {
    return { ok: false, message: "price must be positive" };
  }

  let count = 0;
  if (body.count !== undefined && body.count !== null) {
    if (typeof body.count !== "number" || !Number.isInteger(body.count)) {
      return { ok: false, message: "count must be an integer" };
    }
    if (body.count < 0) {
      return { ok: false, message: "count must be at least 0" };
    }
    count = body.count;
  }

  return { ok: true, data: { title, description, price: body.price, count } };
};

export async function getProductsList(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  logIncomingRequest("getProductsList", event);

  try {
    const p = await getPoolWithSchema();
    const result = await p.query<{
      id: string;
      title: string;
      description: string;
      price: unknown;
      count: unknown;
    }>(
      `
        SELECT p.id, p.title, p.description, p.price, COALESCE(s.count, 0)::int AS count
        FROM products p
        LEFT JOIN stocks s ON s.product_id = p.id
        ORDER BY p.title
      `,
    );

    const joinedProducts: ProductWithStock[] = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      price: rowToNumber(row.price),
      count: rowToNumber(row.count),
    }));

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify(joinedProducts),
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        handler: "getProductsList",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return internalServerError();
  }
}

export async function getProductsById(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  logIncomingRequest("getProductsById", event);

  try {
    const productId = event.pathParameters?.productId;
    if (!productId) {
      return {
        statusCode: 400,
        headers: defaultHeaders,
        body: JSON.stringify({ message: "Product id is required" }),
      };
    }

    const p = await getPoolWithSchema();
    const result = await p.query<{
      id: string;
      title: string;
      description: string;
      price: unknown;
      count: unknown;
    }>(
      `
        SELECT p.id, p.title, p.description, p.price, COALESCE(s.count, 0)::int AS count
        FROM products p
        LEFT JOIN stocks s ON s.product_id = p.id
        WHERE p.id = $1
      `,
      [productId],
    );

    const row = result.rows[0];
    if (!row) {
      return {
        statusCode: 404,
        headers: defaultHeaders,
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    const product: ProductWithStock = {
      id: row.id,
      title: row.title,
      description: row.description,
      price: rowToNumber(row.price),
      count: rowToNumber(row.count),
    };

    return {
      statusCode: 200,
      headers: defaultHeaders,
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        handler: "getProductsById",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return internalServerError();
  }
}

export async function createProduct(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  logIncomingRequest("createProduct", event);

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: defaultHeaders,
        body: JSON.stringify({ message: "Request body is required" }),
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(event.body) as unknown;
    } catch {
      return {
        statusCode: 400,
        headers: defaultHeaders,
        body: JSON.stringify({ message: "Invalid JSON body" }),
      };
    }

    const validation = validateCreateProductPayload(payload);
    if (!validation.ok) {
      return {
        statusCode: 400,
        headers: defaultHeaders,
        body: JSON.stringify({ message: validation.message }),
      };
    }

    const { title, description, price, count } = validation.data;
    const id = uuidv4();

    const p = await getPoolWithSchema();
    const client = await p.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `
          INSERT INTO products (id, title, description, price)
          VALUES ($1, $2, $3, $4)
        `,
        [id, title, description, price],
      );
      await client.query(
        `
          INSERT INTO stocks (product_id, count)
          VALUES ($1, $2)
        `,
        [id, count],
      );
      await client.query("COMMIT");
    } catch (transactionError) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw transactionError;
    } finally {
      client.release();
    }

    const product: ProductWithStock = {
      id,
      title,
      description,
      price,
      count,
    };

    return {
      statusCode: 201,
      headers: defaultHeaders,
      body: JSON.stringify(product),
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        handler: "createProduct",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return internalServerError();
  }
}
