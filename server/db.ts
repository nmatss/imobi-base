import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import Database from "better-sqlite3";
import pkg from "pg";
const { Pool } = pkg;

import * as schemaPg from "@shared/schema";
import * as schemaSqlite from "@shared/schema-sqlite";

// Determine which database to use. Development can fall back to SQLite when
// DATABASE_URL is absent; production/serverless must configure Postgres unless
// SQLite is explicitly requested for a controlled environment.
const isProductionRuntime = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
const useSqlite =
  process.env.USE_SQLITE === "true" ||
  (!process.env.DATABASE_URL && !isProductionRuntime);

if (!useSqlite && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required outside explicit SQLite mode");
}

// SQLite setup
let sqliteDb: ReturnType<typeof drizzleSqlite> | null = null;
let sqliteClient: Database.Database | null = null;

// PostgreSQL setup
let pgDb: ReturnType<typeof drizzlePg> | null = null;
let pgPool: InstanceType<typeof Pool> | null = null;

if (useSqlite) {
  console.log("Using SQLite database (development mode)");
  // Caminho padrão de dev; testes de integração podem isolar o banco via
  // SQLITE_DB_PATH (arquivo único por execução), sem tocar no db de dev.
  const sqlitePath = process.env.SQLITE_DB_PATH || "./data/imobibase.db";
  sqliteClient = new Database(sqlitePath);
  sqliteClient.pragma("journal_mode = WAL");
  sqliteDb = drizzleSqlite(sqliteClient, { schema: schemaSqlite });
} else {
  // Detect serverless runtime (Vercel). In serverless every function instance
  // owns its own pool, so a large `max` multiplied by hundreds of concurrent
  // instances will exhaust the Supabase pooler. Use a tiny, ephemeral pool that
  // lets idle connections drain between invocations. The persistent-server mode
  // keeps the original warm pool. All values stay overridable via env.
  const isServerless = !!process.env.VERCEL;

  const poolMaxDefault = isServerless ? 3 : 20;
  const poolMinDefault = isServerless ? 0 : 2;
  const idleTimeoutDefault = isServerless ? 10000 : 30000;
  const allowExitOnIdleDefault = isServerless;

  // Allow explicit env override; PG_POOL_ALLOW_EXIT_ON_IDLE accepts "true"/"false".
  const allowExitOnIdleEnv = process.env.PG_POOL_ALLOW_EXIT_ON_IDLE;
  const allowExitOnIdle =
    allowExitOnIdleEnv === undefined
      ? allowExitOnIdleDefault
      : allowExitOnIdleEnv === "true";

  console.log(
    `Using PostgreSQL database (${isServerless ? "serverless" : "persistent-server"} mode)`,
  );
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX ?? poolMaxDefault),
    min: Number(process.env.PG_POOL_MIN ?? poolMinDefault),
    idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT_MS ?? idleTimeoutDefault),
    connectionTimeoutMillis: Number(process.env.PG_POOL_CONN_TIMEOUT_MS ?? 5000),
    allowExitOnIdle,
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
