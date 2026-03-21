import pg from "pg";

const connectionString = process.env.POSTGRES_CONNECTION_STRING;

if (!connectionString) {
  throw new Error("POSTGRES_CONNECTION_STRING environment variable is required");
}

export const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // required for Neon
  max: 5,                             // small pool — Container Apps has limited resources
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});
