import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CRON_JOB_MANIFEST } from "../../server/jobs/cron-manifest";

describe("cron manifest", () => {
  it("keeps Vercel cron definitions aligned with the runtime manifest", () => {
    const vercelConfig = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      crons: Array<{ path: string; schedule: string }>;
    };
    const vercelCrons = new Map(vercelConfig.crons.map((cron) => [cron.path, cron.schedule]));

    expect(vercelCrons.size).toBe(CRON_JOB_MANIFEST.length);
    for (const job of CRON_JOB_MANIFEST) {
      expect(vercelCrons.get(job.path)).toBe(job.vercelSchedule);
    }
  });

  it("includes critical operational jobs exactly once", () => {
    const names = CRON_JOB_MANIFEST.map((job) => job.name);
    const paths = CRON_JOB_MANIFEST.map((job) => job.path);

    expect(new Set(names).size).toBe(names.length);
    expect(new Set(paths).size).toBe(paths.length);
    expect(names).toContain("database-backup");
    expect(names).toContain("enforce-plan-limits");
    expect(names).toContain("cleanup-soft-deletes");
  });
});
