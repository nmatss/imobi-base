import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runBackup } from "../../server/jobs/processors/backup-processor";

const ENV_KEYS = [
  "DATABASE_URL",
  "BACKUP_BUCKET",
  "BACKUP_UPLOAD_URL",
  "BACKUP_UPLOAD_URL_TEMPLATE",
  "BACKUP_OPTIONAL",
  "SUPABASE_PITR_ENABLED",
] as const;

describe("backup PITR readiness", () => {
  const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("does not require pg_dump when Supabase PITR is the explicit DR strategy", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/imobibase_test";
    process.env.BACKUP_OPTIONAL = "true";
    process.env.SUPABASE_PITR_ENABLED = "true";

    const result = await runBackup({
      type: "full",
      includeFiles: false,
      retention: 30,
    });

    expect(result.backupName).toMatch(/^supabase-pitr-/);
    expect(result.sizeBytes).toBe(0);
    expect(result.storageUrl).toBe("supabase-pitr");
  });
});
