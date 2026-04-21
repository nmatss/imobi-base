import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import pkg from "pg";
const { Pool } = pkg;

import * as schemaPg from "@shared/schema";
import * as schemaSqlite from "@shared/schema-sqlite";

// Determine which database to use
const useSqlite = !process.env.DATABASE_URL || process.env.USE_SQLITE === "true";

// SQLite setup
let sqliteDb: ReturnType<typeof drizzleSqlite> | null = null;
let sqliteClient: Database.Database | null = null;

// PostgreSQL setup
let pgDb: ReturnType<typeof drizzlePg> | null = null;
let pgPool: InstanceType<typeof Pool> | null = null;

if (useSqlite) {
  console.log("Using SQLite database (development mode)");
  sqliteClient = new Database("./data/imobibase.db");
  sqliteClient.pragma("journal_mode = WAL");
  sqliteDb = drizzleSqlite(sqliteClient, { schema: schemaSqlite });
} else {
  console.log("Using PostgreSQL database (production mode)");
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? 20),
    min: Number(process.env.PG_POOL_MIN ?? 2),
    idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT_MS ?? 30000),
    connectionTimeoutMillis: Number(process.env.PG_POOL_CONN_TIMEOUT_MS ?? 5000),
    allowExitOnIdle: false,
  });
  pgPool.on("error", (err) => {
    console.error("[pg-pool] unexpected error on idle client", err);
  });
  pgDb = drizzlePg(pgPool, { schema: schemaPg });
}

// Export the appropriate database and schema
// Using 'as any' to bypass TypeScript's strict union type checking
// This is necessary because Drizzle's SQLite and PostgreSQL types aren't compatible
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = useSqlite ? sqliteDb! : pgDb!;
export const schema = useSqlite ? schemaSqlite : schemaPg;
export const isSqlite = useSqlite;

// Export connection for cleanup
export const closeDb = async () => {
  if (sqliteClient) {
    sqliteClient.close();
  }
  if (pgPool) {
    await pgPool.end();
  }
};
