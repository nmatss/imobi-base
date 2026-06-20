#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isIP } from "node:net";
import path from "node:path";
import Redis from "ioredis";
import { Pool } from "pg";

type VerifyMode = "static" | "deploy" | "strict";

interface CheckResult {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

const mode = getMode();
const results: CheckResult[] = [];
const root = process.cwd();

await loadEnvironmentFiles();
await checkStaticReadiness();

if (mode !== "static") {
  checkEnvironmentReadiness();
}

if (mode === "strict") {
  await checkRedisConnectivity();
  await checkDatabaseReadiness();
  await runCommand("Backup readiness", "npm", ["run", "ops:backup:verify"]);
  await runCommand("RLS runtime verification", "npm", ["run", "db:rls:verify"]);
  await checkRestoreDrillProof();
  await checkPentestProof();
}

printSummary();

if (results.some((result) => result.status === "fail")) {
  process.exit(1);
}

function getMode(): VerifyMode {
  const rawMode = process.env.GO_LIVE_VERIFY_MODE ?? "deploy";
  if (rawMode === "static" || rawMode === "deploy" || rawMode === "strict") {
    return rawMode;
  }

  console.error(`Invalid GO_LIVE_VERIFY_MODE="${rawMode}". Use static, deploy or strict.`);
  process.exit(1);
}

async function loadEnvironmentFiles(): Promise<void> {
  const envFiles = [
    ".env",
    ".env.local",
    `.env.${process.env.NODE_ENV ?? "production"}`,
    `.env.${process.env.NODE_ENV ?? "production"}.local`,
    ".env.production",
    ".env.production.local",
    ".vercel/.env.production.local",
  ];

  for (const envFile of envFiles) {
    const fullPath = path.resolve(root, envFile);
    if (!existsSync(fullPath)) continue;

    const content = await readFile(fullPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

      const [key, ...rest] = trimmed.split("=");
      if (!key || process.env[key]) continue;

      process.env[key] = unquote(rest.join("="));
    }
  }
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function checkStaticReadiness(): Promise<void> {
  const packageJson = JSON.parse(
    await readFile(path.resolve(root, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const scripts = packageJson.scripts ?? {};

  const requiredScripts = [
    "db:rls:verify",
    "ops:backup:verify",
    "ops:cron:verify",
    "ops:restore:drill",
    "security:pentest",
  ];
  for (const script of requiredScripts) {
    addResult(
      `script:${script}`,
      scripts[script] ? "pass" : "fail",
      scripts[script] ? scripts[script] : "missing package.json script",
    );
  }

  const webhookMigration = await readFile(
    path.resolve(root, "migrations/20260617_001_webhook_events.sql"),
    "utf8",
  );
  addResult(
    "webhook_events migration",
    webhookMigration.includes("CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_provider_event")
      ? "pass"
      : "fail",
    "requires unique provider/event idempotency index",
  );

  const newsletterOptOutMigration = await readFile(
    path.resolve(root, "migrations/20260617_002_newsletter_opt_out.sql"),
    "utf8",
  );
  addResult(
    "newsletter opt-out migration",
    newsletterOptOutMigration.includes("ADD COLUMN IF NOT EXISTS unsubscribed_at") &&
      newsletterOptOutMigration.includes("idx_newsletter_subscriptions_active_email")
      ? "pass"
      : "fail",
    "requires durable unsubscribe audit fields and active/email lookup index",
  );

  const whatsappPhoneNumberMigration = await readFile(
    path.resolve(root, "migrations/20260618_001_whatsapp_phone_number_unique.sql"),
    "utf8",
  );
  addResult(
    "WhatsApp phoneNumberId uniqueness migration",
    whatsappPhoneNumberMigration.includes("uq_integration_configs_whatsapp_phone_number_id") &&
      whatsappPhoneNumberMigration.includes("integration_name = 'whatsapp'")
      ? "pass"
      : "fail",
    "requires a partial unique index for configured WhatsApp phoneNumberId values",
  );

  const rlsMigration = await readFile(path.resolve(root, "migrations/RLS_enable.sql"), "utf8");
  addResult(
    "RLS covers webhook_events",
    /ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY/.test(rlsMigration)
      ? "pass"
      : "fail",
    "webhook_events must be protected by RLS",
  );

  const workflow = await readFile(
    path.resolve(root, ".github/workflows/deploy-production.yml"),
    "utf8",
  );
  const executableWorkflow = workflow
    .split(/\r?\n/)
    .filter((line) => !line.trim().startsWith("#"))
    .join("\n");
  const buildIndex = executableWorkflow.indexOf("vercel build --prod");
  const goLiveStrictIndex = executableWorkflow.indexOf("npm run ops:go-live:verify:strict");
  const deployIndex = executableWorkflow.indexOf("vercel deploy --prebuilt --prod");
  addResult(
    "production workflow strict go-live gate",
    buildIndex > -1 && goLiveStrictIndex > buildIndex && deployIndex > goLiveStrictIndex
      ? "pass"
      : "fail",
    "production workflow must run the strict readiness gate after build and before deploy",
  );
  addResult(
    "production workflow Vercel binding",
    executableWorkflow.includes("VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}") &&
      executableWorkflow.includes("VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}")
      ? "pass"
      : "fail",
    "Vercel CLI needs VERCEL_ORG_ID and VERCEL_PROJECT_ID in clean CI checkouts",
  );
  addResult(
    "script typecheck gate",
    executableWorkflow.includes("npm run check:scripts") ? "pass" : "fail",
    "production workflow should typecheck operational scripts",
  );

  await runCommand("Cron manifest", "npm", ["run", "ops:cron:verify"]);
}

function checkEnvironmentReadiness(): void {
  requireEnv("DATABASE_URL", "production PostgreSQL URL for runtime and migrations", (value) =>
    isPublicServiceUrl(value, ["postgres:", "postgresql:"]),
  );
  requireEnv("SESSION_SECRET", "32+ char random session secret", isStrongSecret);
  requireEnv("REDIS_URL", "production Redis for distributed rate limit/cache/cron locks", (value) =>
    isPublicServiceUrl(value, ["redis:", "rediss:"]),
  );
  requireEnv("CRON_SECRET", "32+ char bearer secret for /api/cron/*", isStrongSecret);

  const appUrl = process.env.APP_URL || process.env.SITE_URL || process.env.VITE_APP_URL;
  addResult(
    "canonical app url",
    appUrl === "https://imobibase.com.br" ? "pass" : "fail",
    appUrl ? `resolved ${appUrl}` : "APP_URL/SITE_URL/VITE_APP_URL missing",
  );

  requireEnv("STRIPE_SECRET_KEY", "Stripe live secret key", (value) =>
    hasLiveSecretShape(value, "sk_live_", 32),
  );
  requireEnv("STRIPE_WEBHOOK_SECRET", "Stripe webhook signing secret", (value) =>
    hasLiveSecretShape(value, "whsec_", 24),
  );
  requireEnv("WHATSAPP_APP_SECRET", "Meta app secret for webhook HMAC", (value) =>
    isNonPlaceholder(value, 16),
  );
  requireEnv("WHATSAPP_VERIFY_TOKEN", "Meta webhook verify token", (value) =>
    isNonPlaceholder(value, 16),
  );

  const hasBackupUpload = Boolean(process.env.BACKUP_UPLOAD_URL_TEMPLATE || process.env.BACKUP_UPLOAD_URL);
  const usesPitr =
    process.env.BACKUP_OPTIONAL === "true" && process.env.SUPABASE_PITR_ENABLED === "true";
  addResult(
    "backup strategy",
    hasBackupUpload || usesPitr ? "pass" : "fail",
    hasBackupUpload
      ? "durable backup upload configured"
      : usesPitr
        ? "Supabase PITR explicitly configured"
        : "configure backup upload or BACKUP_OPTIONAL=true + SUPABASE_PITR_ENABLED=true",
  );
}

async function checkRedisConnectivity(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const pong = await redis.ping();
    addResult("Redis connectivity", pong === "PONG" ? "pass" : "fail", `PING returned ${pong}`);
  } catch (error) {
    addResult("Redis connectivity", "fail", errorMessage(error));
  } finally {
    redis.disconnect();
  }
}

async function checkDatabaseReadiness(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

  try {
    const webhookTable = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'webhook_events'
      ) AS exists
    `);
    addResult(
      "webhook_events table",
      webhookTable.rows[0]?.exists ? "pass" : "fail",
      "persistent webhook ledger table must exist",
    );

    const webhookIndex = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'webhook_events'
          AND indexname = 'uq_webhook_events_provider_event'
      ) AS exists
    `);
    addResult(
      "webhook_events unique index",
      webhookIndex.rows[0]?.exists ? "pass" : "fail",
      "provider/event unique index must exist",
    );

    const webhookRls = await pool.query<{ rlsEnabled: boolean; rlsForced: boolean }>(`
      SELECT relrowsecurity AS "rlsEnabled", relforcerowsecurity AS "rlsForced"
      FROM pg_class
      WHERE oid = 'public.webhook_events'::regclass
    `);
    addResult(
      "webhook_events RLS",
      webhookRls.rows[0]?.rlsEnabled && webhookRls.rows[0]?.rlsForced ? "pass" : "fail",
      "webhook_events must have ENABLE and FORCE row level security",
    );

    const newsletterColumns = await pool.query<{ columnName: string }>(`
      SELECT column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'newsletter_subscriptions'
        AND column_name IN ('unsubscribed_at', 'unsubscribe_reason', 'resubscribed_at')
    `);
    const newsletterColumnNames = new Set(
      newsletterColumns.rows.map((row) => row.columnName),
    );
    addResult(
      "newsletter opt-out columns",
      ["unsubscribed_at", "unsubscribe_reason", "resubscribed_at"].every((column) =>
        newsletterColumnNames.has(column),
      )
        ? "pass"
        : "fail",
      "newsletter_subscriptions must include durable opt-out audit fields",
    );

    const newsletterIndex = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'newsletter_subscriptions'
          AND indexname = 'idx_newsletter_subscriptions_active_email'
      ) AS exists
    `);
    addResult(
      "newsletter active email index",
      newsletterIndex.rows[0]?.exists ? "pass" : "fail",
      "active/lower(email) index must exist for unsubscribe and bulk filters",
    );

    const whatsappPhoneNumberIndex = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'integration_configs'
          AND indexname = 'uq_integration_configs_whatsapp_phone_number_id'
      ) AS exists
    `);
    addResult(
      "WhatsApp phoneNumberId unique index",
      whatsappPhoneNumberIndex.rows[0]?.exists ? "pass" : "fail",
      "configured WhatsApp phoneNumberId values must be unique across tenants",
    );

    const migration = await pool.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_migrations'
      ) AS exists
    `);
    const migrationTableExists = migration.rows[0]?.exists;
    addResult(
      "migrations audit table",
      migrationTableExists ? "pass" : "fail",
      "_migrations must exist so critical production migrations are auditable",
    );

    if (migrationTableExists) {
      const record = await pool.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM _migrations WHERE filename = $1) AS exists",
        ["20260617_001_webhook_events.sql"],
      );
      addResult(
        "webhook_events migration record",
        record.rows[0]?.exists ? "pass" : "fail",
        record.rows[0]?.exists
          ? "migration recorded"
          : "critical migration missing from _migrations audit table",
      );
      const newsletterRecord = await pool.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM _migrations WHERE filename = $1) AS exists",
        ["20260617_002_newsletter_opt_out.sql"],
      );
      addResult(
        "newsletter opt-out migration record",
        newsletterRecord.rows[0]?.exists ? "pass" : "fail",
        newsletterRecord.rows[0]?.exists
          ? "migration recorded"
          : "critical migration missing from _migrations audit table",
      );
      const whatsappRecord = await pool.query<{ exists: boolean }>(
        "SELECT EXISTS (SELECT 1 FROM _migrations WHERE filename = $1) AS exists",
        ["20260618_001_whatsapp_phone_number_unique.sql"],
      );
      addResult(
        "WhatsApp phoneNumberId migration record",
        whatsappRecord.rows[0]?.exists ? "pass" : "fail",
        whatsappRecord.rows[0]?.exists
          ? "migration recorded"
          : "critical migration missing from _migrations audit table",
      );
    }
  } catch (error) {
    addResult("database readiness", "fail", errorMessage(error));
  } finally {
    await pool.end().catch(() => undefined);
  }
}

async function checkRestoreDrillProof(): Promise<void> {
  if (process.env.GO_LIVE_RUN_RESTORE_DRILL === "true") {
    await runCommand("Restore drill", "npm", ["run", "ops:restore:drill"]);
    return;
  }

  addResult(
    "restore drill evidence",
    process.env.GO_LIVE_RESTORE_DRILL_VERIFIED === "true" ? "pass" : "fail",
    "set GO_LIVE_RESTORE_DRILL_VERIFIED=true after a real isolated restore drill, or GO_LIVE_RUN_RESTORE_DRILL=true to execute it",
  );
}

async function checkPentestProof(): Promise<void> {
  if (process.env.GO_LIVE_RUN_PENTEST === "true") {
    const hasValidTarget = requireEnv("TEST_URL", "public HTTPS target URL for automated pentest", (value) =>
      isPublicServiceUrl(value, ["https:"]),
    );
    if (hasValidTarget) {
      await runCommand("Automated pentest", "npm", ["run", "security:pentest"]);
    }
    return;
  }

  addResult(
    "pentest evidence",
    process.env.GO_LIVE_PENTEST_VERIFIED === "true" ? "pass" : "fail",
    "set GO_LIVE_PENTEST_VERIFIED=true after staging/prod pentest evidence, or GO_LIVE_RUN_PENTEST=true with TEST_URL",
  );
}

async function runCommand(name: string, command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve) => {
    const child = spawn(command, args, {
      cwd: root,
      env: process.env,
      stdio: "pipe",
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", (error) => {
      addResult(name, "fail", error.message);
      resolve();
    });
    child.on("close", (code) => {
      addResult(
        name,
        code === 0 ? "pass" : "fail",
        code === 0
          ? firstLine(output) || "ok"
          : summarizeCommandOutput(output) || `${command} exited with ${code}`,
      );
      resolve();
    });
  });
}

function requireEnv(
  name: string,
  detail: string,
  validator: (value: string) => boolean,
): boolean {
  const value = process.env[name];
  const passed = Boolean(value && validator(value));
  addResult(
    `env:${name}`,
    passed ? "pass" : "fail",
    value ? detail : "missing",
  );
  return passed;
}

function isPublicServiceUrl(value: string, protocols: string[]): boolean {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) && !isLocalOrPrivateHost(url.hostname);
  } catch {
    return false;
  }
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    normalized === "localhost" ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal") ||
    normalized.endsWith(".test")
  ) {
    return true;
  }

  if (isIP(normalized) === 0) {
    return false;
  }

  if (normalized === "::1") {
    return true;
  }

  const parts = normalized.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = parts;
  return (
    first === 10 ||
    first === 127 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254) ||
    first === 0
  );
}

function isStrongSecret(value: string): boolean {
  return isNonPlaceholder(value, 32);
}

function hasLiveSecretShape(value: string, prefix: string, minLength: number): boolean {
  return value.startsWith(prefix) && isNonPlaceholder(value, minLength);
}

function isNonPlaceholder(value: string, minLength: number): boolean {
  const normalized = value.trim().toLowerCase();
  const weakValues = new Set([
    "changeme",
    "change-me",
    "default",
    "example",
    "fake",
    "placeholder",
    "secret",
    "test",
    "todo",
    "your-secret",
    "your-token",
  ]);

  return (
    value.trim().length >= minLength &&
    !weakValues.has(normalized) &&
    !normalized.includes("change-me") &&
    !normalized.includes("changeme") &&
    !normalized.includes("placeholder") &&
    !normalized.includes("example") &&
    !normalized.includes("fake_") &&
    !normalized.includes("_fake")
  );
}

function addResult(name: string, status: CheckResult["status"], detail: string): void {
  results.push({ name, status, detail });
}

function firstLine(output: string): string {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1) ?? "";
}

function summarizeCommandOutput(output: string): string {
  const lines = output
    .split(/\r?\n/)
    .map((line) => stripAnsi(line).trim())
    .filter((line) => line && !line.startsWith(">"));
  const failureLines = lines.filter((line) =>
    /\b(error|fail|failed|missing|invalid|denied|authentication|ECONN|timeout|RLS)\b/i.test(line),
  );
  const selected = failureLines.length > 0 ? failureLines : lines.slice(-5);
  return selected.join(" | ").slice(0, 500);
}

function stripAnsi(value: string): string {
  let output = "";
  for (let index = 0; index < value.length; index++) {
    if (value.charCodeAt(index) !== 27) {
      output += value[index];
      continue;
    }

    index++;
    if (value[index] !== "[") {
      continue;
    }

    while (index + 1 < value.length) {
      index++;
      const code = value.charCodeAt(index);
      if (code >= 64 && code <= 126) {
        break;
      }
    }
  }
  return output;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printSummary(): void {
  const icon = { pass: "PASS", warn: "WARN", fail: "FAIL" } as const;

  console.log(`Go Live readiness (${mode})`);
  for (const result of results) {
    console.log(`[${icon[result.status]}] ${result.name}: ${result.detail}`);
  }

  const totals = results.reduce(
    (acc, result) => {
      acc[result.status] += 1;
      return acc;
    },
    { pass: 0, warn: 0, fail: 0 },
  );
  console.log(`Summary: ${totals.pass} pass, ${totals.warn} warn, ${totals.fail} fail.`);
}
