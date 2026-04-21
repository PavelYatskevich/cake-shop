import type { Pool } from "pg";

export async function ensureTables(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price NUMERIC(12, 2) NOT NULL CHECK (price > 0)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stocks (
      product_id TEXT PRIMARY KEY REFERENCES products (id) ON DELETE CASCADE,
      count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
    );
  `);
}
