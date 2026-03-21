import { z } from "zod";
import { pool } from "./db.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface McpTool {
  name: string;
  description: string;
  inputSchema: object;
  execute: (args: unknown) => Promise<string>;
}

// ── Safety check ──────────────────────────────────────────────────────────────

function assertSelectOnly(sql: string): string {
  // Strip trailing semicolon — agents often add one, it's harmless
  const cleaned = sql.trim().replace(/;+$/, "");
  const normalized = cleaned.toLowerCase();

  if (!normalized.startsWith("select")) {
    throw new Error(
      "Only SELECT queries are allowed. This server is read-only."
    );
  }
  // Block statement stacking (e.g. SELECT 1; DROP TABLE ...)
  if (normalized.includes(";")) {
    throw new Error("Multiple statements are not allowed.");
  }
  return cleaned;
}

// ── Tool: list_tables ─────────────────────────────────────────────────────────

export const listTablesTool: McpTool = {
  name: "list_tables",
  description:
    "Returns the names and column definitions for every table in the F1 database. " +
    "Call this first to understand the schema before writing a query.",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
  async execute(_args) {
    console.log(`[${new Date().toISOString()}] list_tables called`);
    const result = await pool.query(`
      SELECT
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
      ORDER BY c.table_name, c.ordinal_position
    `);

    // Group columns by table
    const tables: Record<string, { column: string; type: string; nullable: string }[]> = {};
    for (const row of result.rows) {
      if (!tables[row.table_name]) tables[row.table_name] = [];
      tables[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
      });
    }

    return JSON.stringify(tables, null, 2);
  },
};

// ── Tool: query_sql ───────────────────────────────────────────────────────────

const QuerySqlInput = z.object({
  sql: z.string().min(1).describe("A read-only SELECT query to run against the F1 database."),
});

export const querySqlTool: McpTool = {
  name: "query_sql",
  description:
    "Executes a read-only SELECT query against the F1 PostgreSQL database and returns " +
    "the results as a JSON array. Maximum 500 rows are returned.",
  inputSchema: {
    type: "object",
    properties: {
      sql: {
        type: "string",
        description: "A read-only SELECT query to run against the F1 database.",
      },
    },
    required: ["sql"],
  },
  async execute(args) {
    const { sql } = QuerySqlInput.parse(args);
    console.log(`[${new Date().toISOString()}] query_sql called: ${sql}`);
    const cleaned = assertSelectOnly(sql);

    // Wrap the query in a LIMIT to prevent runaway full-table scans
    const limited = `SELECT * FROM (${cleaned}) _q LIMIT 500`;
    const result = await pool.query(limited);
    return JSON.stringify(result.rows, null, 2);
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const tools: McpTool[] = [listTablesTool, querySqlTool];
