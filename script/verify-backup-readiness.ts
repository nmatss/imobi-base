#!/usr/bin/env tsx
import { spawn } from "node:child_process";

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"], { stdio: "ignore" });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

const failures: string[] = [];
const warnings: string[] = [];

if (!process.env.DATABASE_URL) {
  failures.push("DATABASE_URL is required for backup/restore readiness.");
}

const hasUploadTarget = Boolean(process.env.BACKUP_UPLOAD_URL_TEMPLATE || process.env.BACKUP_UPLOAD_URL);
const usesPitr = process.env.BACKUP_OPTIONAL === "true" && process.env.SUPABASE_PITR_ENABLED === "true";

if (!hasUploadTarget && !usesPitr) {
  failures.push(
    "Configure BACKUP_UPLOAD_URL_TEMPLATE/BACKUP_UPLOAD_URL for durable dump uploads, or explicitly set BACKUP_OPTIONAL=true and SUPABASE_PITR_ENABLED=true when PITR is the official DR strategy.",
  );
}

if (process.env.BACKUP_BUCKET && !hasUploadTarget) {
  failures.push("BACKUP_BUCKET is set but no BACKUP_UPLOAD_URL_TEMPLATE/BACKUP_UPLOAD_URL is configured.");
}

if (process.env.BACKUP_UPLOAD_HEADERS) {
  try {
    const parsed = JSON.parse(process.env.BACKUP_UPLOAD_HEADERS) as Record<string, unknown>;
    if (
      !parsed ||
      Array.isArray(parsed) ||
      Object.values(parsed).some((value) => typeof value !== "string")
    ) {
      failures.push("BACKUP_UPLOAD_HEADERS must be a JSON object with string values.");
    }
  } catch (error) {
    failures.push(`BACKUP_UPLOAD_HEADERS is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (hasUploadTarget && !(process.env.BACKUP_UPLOAD_URL_TEMPLATE ?? process.env.BACKUP_UPLOAD_URL)?.includes("{backupName}")) {
  warnings.push("BACKUP upload URL does not contain {backupName}; ensure the target creates a unique object per run.");
}

if (!(await commandExists("pg_dump"))) {
  failures.push("pg_dump is not available on PATH.");
}

if (!(await commandExists("pg_restore"))) {
  failures.push("pg_restore is not available on PATH for restore drills.");
}

if (!process.env.RESTORE_DRILL_DATABASE_URL && !usesPitr) {
  warnings.push("RESTORE_DRILL_DATABASE_URL is not set; automated restore drills cannot be executed against an isolated database.");
}

if (warnings.length > 0) {
  console.warn("Backup readiness warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("Backup readiness verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Backup readiness verified.");
