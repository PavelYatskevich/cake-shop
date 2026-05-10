import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";
import { ensureTables } from "./db/migrate.js";
import { products } from "./mock-data.js";

const region = process.env.AWS_REGION ?? process.env.CDK_DEFAULT_REGION ?? "us-east-1";
const secretArn = process.env.DATABASE_SECRET_ARN;

type RdsSecretPayload = {
  username: string;
  password: string;
  host: string;
  port: number;
  dbname: string;
};

const loadSecret = async (): Promise<RdsSecretPayload> => {
  if (!secretArn) {
    throw new Error("DATABASE_SECRET_ARN is required to seed the database (set it in your shell or a local .env file that is gitignored)");
  }

  const client = new SecretsManagerClient({ region });
  const response = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  if (!response.SecretString) {
    throw new Error("Secret value is empty");
  }

  return JSON.parse(response.SecretString) as RdsSecretPayload;
};

export const fillRdsWithData = async (): Promise<void> => {
  const secret = await loadSecret();
  const pool = new Pool({
    host: secret.host,
    port: secret.port,
    user: secret.username,
    password: secret.password,
    database: secret.dbname,
    max: 2,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await ensureTables(pool);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("TRUNCATE TABLE products CASCADE");

      for (const product of products) {
        await client.query(
          `INSERT INTO products (id, title, description, price) VALUES ($1, $2, $3, $4)`,
          [product.id, product.title, product.description, product.price],
        );
      }

      for (const [index, product] of products.entries()) {
        const count = 5 + index * 3;
        await client.query(`INSERT INTO stocks (product_id, count) VALUES ($1, $2)`, [product.id, count]);
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
};

const run = async (): Promise<void> => {
  try {
    await fillRdsWithData();
    console.log(`Seed complete. products=${products.length}, region=${region}`);
  } catch (error) {
    console.error("Failed to seed RDS", error);
    process.exitCode = 1;
  }
};

void run();
