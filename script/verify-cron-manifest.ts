#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CRON_JOB_MANIFEST } from "../server/jobs/cron-manifest";

interface VercelConfig {
  crons?: Array<{ path: string; schedule: string }>;
}

const vercelJsonPath = path.resolve(process.cwd(), "vercel.json");
const vercelConfig = JSON.parse(await readFile(vercelJsonPath, "utf8")) as VercelConfig;

const expected = new Map(
  CRON_JOB_MANIFEST.map((job) => [
    job.path,
    {
      schedule: job.vercelSchedule,
      name: job.name,
    },
  ]),
);
const actual = new Map((vercelConfig.crons ?? []).map((cron) => [cron.path, cron.schedule]));
const failures: string[] = [];

for (const [pathName, job] of expected.entries()) {
  const schedule = actual.get(pathName);
  if (!schedule) {
    failures.push(`Missing Vercel cron for ${job.name}: ${pathName}`);
    continue;
  }
  if (schedule !== job.schedule) {
    failures.push(`Schedule mismatch for ${job.name}: expected "${job.schedule}", got "${schedule}"`);
  }
}

for (const pathName of actual.keys()) {
  if (!expected.has(pathName)) {
    failures.push(`Unexpected Vercel cron not present in manifest: ${pathName}`);
  }
}

if (failures.length > 0) {
  console.error("Cron manifest verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Cron manifest verified: ${expected.size} jobs aligned with vercel.json.`);
