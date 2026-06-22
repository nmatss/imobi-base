import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type TableBlock = {
  table: string;
  body: string;
};

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function extractPgTableBlocks(schema: string): TableBlock[] {
  const blocks: TableBlock[] = [];
  let currentTable: string | null = null;
  let depth = 0;
  let lines: string[] = [];

  for (const line of schema.split("\n")) {
    const match = line.match(/export const \w+ = pgTable\("([^"]+)"/);
    if (match) {
      currentTable = match[1];
      lines = [line];
      depth = countMatches(line, /\{/g) - countMatches(line, /\}/g);
      continue;
    }

    if (!currentTable) continue;

    lines.push(line);
    depth += countMatches(line, /\{/g) - countMatches(line, /\}/g);

    if (line.includes("});") && depth <= 0) {
      blocks.push({ table: currentTable, body: lines.join("\n") });
      currentTable = null;
      lines = [];
      depth = 0;
    }
  }

  return blocks;
}

function tenantTablesFromSchema(schema: string): string[] {
  return extractPgTableBlocks(schema)
    .filter(({ body }) => /\btenantId\s*:/.test(body) || /"tenant_id"/.test(body))
    .map(({ table }) => table)
    .sort();
}

function nullableTenantTablesFromSchema(schema: string): string[] {
  return extractPgTableBlocks(schema)
    .filter(({ body }) => {
      const tenantLine = body.split("\n").find((line) => line.includes("tenantId:"));
      return tenantLine && !tenantLine.includes(".notNull()");
    })
    .map(({ table }) => table)
    .sort();
}

function rlsTablesFromMigration(sql: string): string[] {
  return [
    ...new Set(
      [...sql.matchAll(/ALTER TABLE "([^"]+)" ENABLE ROW LEVEL SECURITY/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
}

function policyBlockForTable(sql: string, table: string): string {
  const pattern = new RegExp(
    `CREATE POLICY tenant_isolation ON "${table}"[\\s\\S]*?(?=\\n-- ----|\\nCOMMIT;)`,
    "m",
  );
  return sql.match(pattern)?.[0] ?? "";
}

describe("RLS migration parity", () => {
  const schema = readProjectFile("shared/schema.ts");
  const rlsSql = readProjectFile("migrations/RLS_enable.sql");
  const migrateScript = readProjectFile("script/migrate.ts");

  it("covers every pg schema table with tenant_id", () => {
    const schemaTenantTables = tenantTablesFromSchema(schema);
    const rlsTables = rlsTablesFromMigration(rlsSql);

    expect(rlsTables).toEqual(schemaTenantTables);
  });

  it("forces RLS and creates tenant policies for every covered table", () => {
    for (const table of rlsTablesFromMigration(rlsSql)) {
      expect(rlsSql).toContain(`ALTER TABLE "${table}" FORCE  ROW LEVEL SECURITY;`);

      const policy = policyBlockForTable(rlsSql, table);
      expect(policy).toContain(`CREATE POLICY tenant_isolation ON "${table}"`);
      expect(policy).toContain("current_setting('app.tenant_id', true)");
      expect(policy).toContain("WITH CHECK");
    }
  });

  it("allows null tenant_id only for schema tables where tenant_id is nullable", () => {
    const nullableTenantTables = nullableTenantTablesFromSchema(schema);
    const policiesAllowingNullTenant = rlsTablesFromMigration(rlsSql)
      .filter((table) => policyBlockForTable(rlsSql, table).includes("tenant_id IS NULL"))
      .sort();

    expect(policiesAllowingNullTenant).toEqual(nullableTenantTables);
  });

  it("allows only explicit authentication contexts to read users without tenant context", () => {
    const policy = policyBlockForTable(rlsSql, "users");

    expect(policy).toContain("id = current_setting('app.user_id', true)");
    expect(policy).toContain("lower(email) = current_setting('app.auth_email', true)");
    expect(policy).toContain(
      "password_reset_token = current_setting('app.password_reset_token_hash', true)",
    );
    expect(policy).toContain("password_reset_expires > now()");
    expect(policy).toContain(
      "verification_token = current_setting('app.email_verification_token_hash', true)",
    );
    expect(policy).toContain("verification_token_expires > now()");
    expect(policy).toContain("WITH CHECK (\n        tenant_id = current_setting('app.tenant_id', true)");
  });

  it("allows contracts access only through tenant, signed ClickSign document, or valid signature token contexts", () => {
    const policy = policyBlockForTable(rlsSql, "contracts");

    expect(policy).toContain("tenant_id = current_setting('app.tenant_id', true)");
    expect(policy).toContain(
      "clicksign_document_key = current_setting('app.clicksign_document_key', true)",
    );
    expect(policy).toContain("FROM \"digital_signatures\" ds");
    expect(policy).toContain("ds.token = current_setting('app.digital_signature_token', true)");
    expect(policy).toContain("ds.expires_at IS NULL OR ds.expires_at > now()");
  });

  it("allows anonymous comparison flows only through explicit public property/comparison contexts", () => {
    const propertiesPolicy = policyBlockForTable(rlsSql, "properties");
    const comparisonsPolicy = policyBlockForTable(rlsSql, "property_comparisons");

    expect(propertiesPolicy).toContain("status = 'available'");
    expect(propertiesPolicy).toContain(
      "id = ANY(string_to_array(current_setting('app.public_property_ids', true), ','))",
    );
    expect(comparisonsPolicy).toContain(
      "id = current_setting('app.property_comparison_id', true)",
    );
    expect(comparisonsPolicy).toContain("WITH CHECK (\n        tenant_id = current_setting('app.tenant_id', true)");
  });

  it("keeps RLS migrations (parent + child) out of the default migration run", () => {
    // DB-2: parent e child tables sao gatilhados juntos e aplicados via db:rls:apply.
    expect(migrateScript).toContain("RLS_MIGRATION_FILENAMES");
    expect(migrateScript).toContain("RLS_enable.sql");
    expect(migrateScript).toContain("RLS_enable_child_tables.sql");
    expect(migrateScript).toContain("options.includeRls || !isRlsMigration(f)");
    expect(migrateScript).toContain("!options.onlyRls || isRlsMigration(f)");
    expect(migrateScript).toContain("runMigrations({ includeRls: true, onlyRls: true })");
  });
});
