/**
 * SCHEMA PARITY TEST
 * ----------------------------------------------------------------------------
 * The project ships a DUAL Drizzle schema:
 *   - shared/schema.ts        -> Postgres (production, via server/db.ts)
 *   - shared/schema-sqlite.ts -> SQLite   (local dev)
 *
 * The runtime currently imports from @shared/schema-sqlite, but production runs
 * on @shared/schema. If a table or column exists only in one of them, the
 * portal / maps / compliance features 500 in production. This test locks the
 * parity that has been reconciled and FAILS loudly when a new divergence is
 * introduced, so the dual schema cannot silently drift again.
 *
 * It is intentionally strict on the reconciled tables and tolerant (documented)
 * on the columns that are still known to diverge. Shrink KNOWN_COLUMN_DIVERGENCES
 * as the schemas converge; do NOT grow it without a reason in the comment.
 */
import { describe, it, expect } from "vitest";
import { getTableConfig as pgTableConfig } from "drizzle-orm/pg-core";
import { getTableConfig as sqliteTableConfig } from "drizzle-orm/sqlite-core";
import { is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { SQLiteTable } from "drizzle-orm/sqlite-core";

import * as pgSchema from "@shared/schema";
import * as sqliteSchema from "@shared/schema-sqlite";

type TableInfo = { sqlName: string; columns: Set<string> };

function collectPgTables(): Map<string, TableInfo> {
  const out = new Map<string, TableInfo>();
  for (const [exportName, value] of Object.entries(pgSchema)) {
    if (value && is(value, PgTable)) {
      const cfg = pgTableConfig(value as PgTable);
      out.set(cfg.name, {
        sqlName: cfg.name,
        columns: new Set(cfg.columns.map((c) => c.name)),
      });
      void exportName;
    }
  }
  return out;
}

function collectSqliteTables(): Map<string, TableInfo> {
  const out = new Map<string, TableInfo>();
  for (const [exportName, value] of Object.entries(sqliteSchema)) {
    if (value && is(value, SQLiteTable)) {
      const cfg = sqliteTableConfig(value as SQLiteTable);
      out.set(cfg.name, {
        sqlName: cfg.name,
        columns: new Set(cfg.columns.map((c) => c.name)),
      });
      void exportName;
    }
  }
  return out;
}

/**
 * Tables that are deliberately allowed to exist in only ONE schema.
 * Keep this list small and justified. Empty = strict full table parity.
 *
 * (At the time of writing, the table SETS are in full parity after the Onda 1
 * reconciliation, so this is empty. Anything added here must explain why.)
 */
const KNOWN_TABLE_DIVERGENCES: Record<string, string> = {
  // --- Postgres-only tables (whatsapp) — not yet mirrored to SQLite dev.
  // The whatsapp module só roda contra a Business API em prod (PG); dev usa
  // mocks e nunca toca nessas tabelas. Tracked for a future port.
  whatsapp_auto_responses: "PG-only whatsapp table",
  whatsapp_conversations: "PG-only whatsapp table",
  whatsapp_message_queue: "PG-only whatsapp table",
  whatsapp_messages: "PG-only whatsapp table",
  whatsapp_templates: "PG-only whatsapp table",
  // --- SQLite-only tables ---
  // legal_documents: nenhum código de servidor consulta esta tabela hoje
  // (documentos legais são servidos estaticamente); port para PG quando o
  // CMS de documentos legais sair do backlog.
  legal_documents: "SQLite-only, sem consumidor em prod, pending PG port",
};

/**
 * Columns allowed to exist in only one schema, keyed by `table.column`.
 * These are remaining, KNOWN divergences after the Onda 1 reconciliation.
 * They do not break production today (the code that runs in prod uses the
 * snake_case columns present on BOTH sides, or these are additive aliases).
 * Shrink this list over time.
 */
const KNOWN_COLUMN_DIVERGENCES = new Set<string>([
  // --- compliance: columns that live only on the Postgres side ---
  // user_consents: PG keeps a legacy "consent_method"; SQLite never had it.
  "user_consents.consent_method",
  // compliance_audit_log: PG keeps legacy resource_type/resource_id + "timestamp"
  // column name; SQLite uses entity_type/entity_id + created_at.
  "compliance_audit_log.resource_type",
  "compliance_audit_log.resource_id",
  "compliance_audit_log.timestamp",
  // account_deletion_requests: PG-only workflow fields.
  "account_deletion_requests.requested_at",
  "account_deletion_requests.processed_by",
  "account_deletion_requests.deletion_date",
  // data_export_requests: PG-only workflow fields.
  "data_export_requests.requested_at",
  "data_export_requests.export_url",
  "data_export_requests.error",
  // cookie_preferences: PG-only "necessary"/"preferences" (SQLite uses
  // essential/personalization). Both kept additively on PG.
  "cookie_preferences.necessary",
  "cookie_preferences.preferences",
  // data_processing_activities: PG-only "name" (SQLite uses activity_name).
  "data_processing_activities.name",
  // user_consents: PG keeps updated_at (SQLite consent rows are append-only).
  "user_consents.updated_at",
  // account_deletion_requests / data_export_requests: PG keeps a denormalized
  // "email" for the request (SQLite resolves it via user_id join).
  "account_deletion_requests.email",
  "data_export_requests.email",
  // cookie_preferences: PG keeps tenant_id + created_at (SQLite is per-session,
  // tenant-agnostic and uses accepted_at as its primary timestamp).
  "cookie_preferences.tenant_id",
  "cookie_preferences.created_at",

  // --- compliance: columns that live only on the SQLite side ---
  // These exist in SQLite dev but are not yet ported to PG (not used by the
  // prod code paths exercised today). Port + db:push before relying on them.
  "data_export_requests.data_scope",
  "account_deletion_requests.data_retention",

  // --- columns intentionally present on only one DB due to type/dialect ---
]);

describe("schema parity: schema.ts (Postgres) vs schema-sqlite.ts (SQLite)", () => {
  const pg = collectPgTables();
  const sqlite = collectSqliteTables();

  it("both schemas expose at least one table (sanity)", () => {
    expect(pg.size).toBeGreaterThan(0);
    expect(sqlite.size).toBeGreaterThan(0);
  });

  it("has no unexpected table-level divergence", () => {
    const onlyPg = [...pg.keys()].filter(
      (t) => !sqlite.has(t) && !(t in KNOWN_TABLE_DIVERGENCES),
    );
    const onlySqlite = [...sqlite.keys()].filter(
      (t) => !pg.has(t) && !(t in KNOWN_TABLE_DIVERGENCES),
    );

    const messages: string[] = [];
    if (onlyPg.length) {
      messages.push(`Tables only in schema.ts (Postgres): ${onlyPg.sort().join(", ")}`);
    }
    if (onlySqlite.length) {
      messages.push(
        `Tables only in schema-sqlite.ts (SQLite): ${onlySqlite.sort().join(", ")}`,
      );
    }

    expect(messages, messages.join(" | ")).toEqual([]);
  });

  it("reconciled tables match column-by-column (modulo known divergences)", () => {
    // Tables that MUST stay in column parity (the ones reconciled in Onda 1).
    const reconciled = [
      "property_coordinates",
      "client_portal_access",
      "maintenance_tickets",
      "user_consents",
      "compliance_audit_log",
      "account_deletion_requests",
      "data_export_requests",
      "cookie_preferences",
      "data_processing_activities",
      // Reconciliadas na paridade auth/auditoria/sessão (2026-06-10):
      "users",
      "tenants",
      "properties",
      "leads",
      "contracts",
      "rental_contracts",
      "audit_logs",
      "user_sessions",
      "login_history",
      "two_factor_auth",
      "integration_configs",
      // Reconciliadas na paridade billing/features/módulos (2026-06-10):
      "plans",
      "tenant_subscriptions",
      "usage_logs",
      "analytics_events",
      "lead_scores",
      "drip_campaigns",
      "campaign_steps",
      "campaign_enrollments",
      "virtual_tours",
      "property_comparisons",
      "digital_signatures",
      "contract_documents",
      "dashboard_layouts",
      "widget_types",
      // Novas tabelas de módulos (AVM/ISA/Marketing/Vistorias), criadas já em
      // paridade nos dois schemas (2026-06-10):
      "property_inspections",
      "inspection_rooms",
      "inspection_items",
      "property_valuations",
      "market_indices",
      "isa_conversations",
      "isa_messages",
      "isa_settings",
      "auto_marketing_content",
    ];

    const divergences: string[] = [];

    for (const table of reconciled) {
      const a = pg.get(table);
      const b = sqlite.get(table);
      if (!a || !b) {
        divergences.push(
          `${table}: missing in ${!a ? "schema.ts" : "schema-sqlite.ts"}`,
        );
        continue;
      }
      for (const col of a.columns) {
        const key = `${table}.${col}`;
        if (!b.columns.has(col) && !KNOWN_COLUMN_DIVERGENCES.has(key)) {
          divergences.push(`${key}: only in schema.ts (Postgres)`);
        }
      }
      for (const col of b.columns) {
        const key = `${table}.${col}`;
        if (!a.columns.has(col) && !KNOWN_COLUMN_DIVERGENCES.has(key)) {
          divergences.push(`${key}: only in schema-sqlite.ts (SQLite)`);
        }
      }
    }

    expect(divergences, `Unexpected column divergences:\n${divergences.join("\n")}`).toEqual([]);
  });
});
