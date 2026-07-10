#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

const RLS_MIGRATIONS = ["RLS_enable.sql", "RLS_enable_child_tables.sql"];
const migrationSqlByFile = await Promise.all(
  RLS_MIGRATIONS.map(async (filename) => {
    const filePath = path.resolve(process.cwd(), "migrations", filename);
    return { filename, filePath, sql: await readFile(filePath, "utf8") };
  }),
);
const rlsTables = [
  ...new Set(
    migrationSqlByFile.flatMap(({ sql }) =>
      [...sql.matchAll(/ALTER TABLE "([^"]+)" ENABLE ROW LEVEL SECURITY/g)].map(
        (match) => match[1],
      ),
    ),
  ),
].sort();

if (rlsTables.length === 0) {
  console.error(`No RLS tables found in ${RLS_MIGRATIONS.join(", ")}.`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for RLS verification.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const failures: string[] = [];
const warnings: string[] = [];

try {
  const roleResult = await pool.query<{
    current_user: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
  }>(`
    SELECT current_user, r.rolsuper, r.rolbypassrls
    FROM pg_roles r
    WHERE r.rolname = current_user
  `);
  const role = roleResult.rows[0];

  if (!role) {
    failures.push("Could not resolve current database role.");
  } else {
    if (role.rolsuper) failures.push(`Current role "${role.current_user}" is superuser; runtime app role must not be superuser.`);
    if (role.rolbypassrls) failures.push(`Current role "${role.current_user}" has BYPASSRLS; runtime app role must not bypass RLS.`);
  }

  const migrationsTable = await pool.query<{ exists: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = '_migrations'
    ) AS exists
  `);
  if (migrationsTable.rows[0]?.exists) {
    const migrationRecords = await pool.query<{ filename: string }>(
      "SELECT filename FROM _migrations WHERE filename = ANY($1::text[])",
      [RLS_MIGRATIONS],
    );
    const recordedMigrations = new Set(migrationRecords.rows.map((row) => row.filename));
    for (const filename of RLS_MIGRATIONS) {
      if (!recordedMigrations.has(filename)) {
        warnings.push(`${filename} is not recorded in _migrations. If it was applied manually, keep an audit note.`);
      }
    }
  } else {
    warnings.push("_migrations table does not exist; cannot verify migration history.");
  }

  const tableResult = await pool.query<{
    tablename: string;
    rowsecurity: boolean;
    forcerowsecurity: boolean;
    tableowner: string;
  }>(
    `
      SELECT tablename, rowsecurity, forcerowsecurity, tableowner
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = ANY($1::text[])
    `,
    [rlsTables],
  );
  const tableByName = new Map(tableResult.rows.map((row) => [row.tablename, row]));

  for (const tableName of rlsTables) {
    const table = tableByName.get(tableName);
    if (!table) {
      failures.push(`RLS table missing in database: ${tableName}`);
      continue;
    }
    if (!table.rowsecurity) failures.push(`RLS is not enabled on ${tableName}.`);
    if (!table.forcerowsecurity) failures.push(`FORCE ROW LEVEL SECURITY is not enabled on ${tableName}.`);
    if (role && table.tableowner === role.current_user && process.env.RLS_VERIFY_ALLOW_OWNER !== "true") {
      failures.push(`Current app role "${role.current_user}" owns ${tableName}; use a non-owner runtime role.`);
    }
  }

  const policyResult = await pool.query<{ tablename: string; policyname: string }>(
    `
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = ANY($1::text[])
    `,
    [rlsTables],
  );
  const policyTables = new Set(policyResult.rows.map((row) => row.tablename));
  for (const tableName of rlsTables) {
    if (!policyTables.has(tableName)) failures.push(`No RLS policy found for ${tableName}.`);
  }

  await verifyFailClosedSmoke();

  if (warnings.length > 0) {
    console.warn("RLS verification warnings:");
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  if (failures.length > 0) {
    console.error("RLS verification failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(
    `RLS verified for ${rlsTables.length} tables from ${RLS_MIGRATIONS.join(", ")} with runtime role "${role?.current_user ?? "unknown"}".`,
  );
} finally {
  await pool.end();
}

async function verifyFailClosedSmoke(): Promise<void> {
  if (!rlsTables.includes("leads")) return;

  const noContextResult = await pool.query<{ count: string }>('SELECT count(*)::text AS count FROM "leads"');
  const noContextCount = Number(noContextResult.rows[0]?.count ?? 0);
  if (noContextCount > 0) {
    failures.push(`Fail-closed smoke failed: "leads" returned ${noContextCount} rows without app.tenant_id.`);
  }

  const tenantId = process.env.RLS_VERIFY_TENANT_ID;
  if (!tenantId) {
    warnings.push("RLS_VERIFY_TENANT_ID is not set; tenant-context positive smoke was skipped.");
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
    await client.query('SELECT count(*) FROM "leads"');
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    failures.push(`Tenant-context smoke failed for RLS_VERIFY_TENANT_ID=${tenantId}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    client.release();
  }
}
