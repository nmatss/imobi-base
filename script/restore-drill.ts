#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fetchExternalUrl } from "../server/security/url-validator";

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function spawnAsync(command: string, args: string[], env?: Record<string, string>): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function parseDatabaseUrl(value: string, label: string): URL {
  try {
    return new URL(value);
  } catch (error) {
    fail(`${label} must be a valid PostgreSQL connection URL: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function databaseIdentity(url: URL): string {
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ""));
  return `${url.hostname}/${databaseName}`;
}

function allowlistEntries(): Set<string> {
  return new Set(
    (process.env.RESTORE_DRILL_TARGET_ALLOWLIST || "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function assertSafeRestoreTarget(target: string): void {
  const targetDatabase = parseDatabaseUrl(target, "RESTORE_DRILL_DATABASE_URL");
  const targetHost = targetDatabase.hostname.toLowerCase();
  const targetName = decodeURIComponent(targetDatabase.pathname.replace(/^\//, "")).toLowerCase();
  const targetIdentity = databaseIdentity(targetDatabase).toLowerCase();

  if (process.env.DATABASE_URL) {
    const productionDatabase = parseDatabaseUrl(process.env.DATABASE_URL, "DATABASE_URL");
    if (databaseIdentity(productionDatabase).toLowerCase() === targetIdentity) {
      fail("RESTORE_DRILL_DATABASE_URL must not point to the same host/database as DATABASE_URL.");
    }
  }

  const productionLikePattern = /(^|[-_.])(prod|production)([-_.]|$)/i;
  if (productionLikePattern.test(targetHost) || productionLikePattern.test(targetName)) {
    fail("RESTORE_DRILL_DATABASE_URL looks production-like. Use an isolated scratch database.");
  }

  const scratchPattern = /(restore[-_]?drill|scratch|sandbox|test|testing)/i;
  const allowlist = allowlistEntries();
  const isAllowlisted = allowlist.has(targetHost) || allowlist.has(targetIdentity);
  if (!scratchPattern.test(targetHost) && !scratchPattern.test(targetName) && !isAllowlisted) {
    fail(
      "RESTORE_DRILL_DATABASE_URL must target an isolated database whose host or database name contains restore-drill, scratch, sandbox or test. Alternatively set RESTORE_DRILL_TARGET_ALLOWLIST to the exact host or host/database after confirming the target is disposable.",
    );
  }
}

const targetUrl = process.env.RESTORE_DRILL_DATABASE_URL;
const backupFile = process.env.RESTORE_DRILL_BACKUP_FILE;
const backupUrl = process.env.RESTORE_DRILL_BACKUP_URL;

if (process.env.RESTORE_DRILL_CONFIRM !== "restore-drill") {
  fail("Set RESTORE_DRILL_CONFIRM=restore-drill to acknowledge the target database may be cleaned/restored.");
}

if (!targetUrl) {
  fail("RESTORE_DRILL_DATABASE_URL is required.");
}

if (!backupFile && !backupUrl) {
  fail("Set RESTORE_DRILL_BACKUP_FILE or RESTORE_DRILL_BACKUP_URL.");
}

if (process.env.DATABASE_URL && process.env.DATABASE_URL === targetUrl) {
  fail("RESTORE_DRILL_DATABASE_URL must not equal DATABASE_URL.");
}

assertSafeRestoreTarget(targetUrl);

const tempDir = await mkdtemp(path.join(os.tmpdir(), "imobibase-restore-drill-"));
let resolvedBackupFile = backupFile;

try {
  if (backupUrl) {
    const response = await fetchExternalUrl(backupUrl, {
      maxRedirects: 3,
      timeoutMs: 60_000,
    });
    if (!response.ok) {
      fail(`Failed to download backup: HTTP ${response.status}`);
    }
    const data = Buffer.from(await response.arrayBuffer());
    resolvedBackupFile = path.join(tempDir, "restore-drill.dump");
    await writeFile(resolvedBackupFile, data);
  }

  if (!resolvedBackupFile) {
    fail("Backup file could not be resolved.");
  }

  await spawnAsync("pg_restore", [
    "--clean",
    "--if-exists",
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    "--dbname",
    targetUrl,
    resolvedBackupFile,
  ]);

  console.log("Restore drill completed successfully.");
} finally {
  await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
}
