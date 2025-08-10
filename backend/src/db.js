import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inspections (
      id SERIAL PRIMARY KEY,
      site VARCHAR(120) NOT NULL,
      inspection_date DATE NOT NULL,
      findings TEXT NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'Draft',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// Simple retry wrapper for initial DB contact
export async function waitForDb(maxTries = 20, delayMs = 1000) {
  for (let i = 1; i <= maxTries; i++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e) {
      console.log(`DB not ready (try ${i}/${maxTries}): ${e.code || e.message}`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error("DB not reachable after retries");
}

