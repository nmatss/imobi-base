/**
 * Vercel Cron Routes
 *
 * HTTP endpoints for scheduled jobs triggered by Vercel Cron.
 * Each endpoint is protected by CRON_SECRET verification.
 *
 * For non-Vercel deployments (Docker, Railway), the node-cron
 * fallback in scheduled-jobs.ts handles scheduling instead.
 */

import type { Express, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import * as Sentry from "@sentry/node";
import {
  runPaymentReminders,
  runDailyReports,
  runWeeklyReports,
  runMonthlyReports,
  runCleanupSessions,
  runCleanupLogs,
  runIntegrationSync,
  runDatabaseBackup,
  runCleanupTempFiles,
  runCleanupSoftDeletes,
  runEnforcePlanLimits,
} from "./jobs/scheduled-jobs";
import { CRON_JOB_MANIFEST, type CronJobName } from "./jobs/cron-manifest";
import { getRedisClient } from "./cache/redis-client";

type CronRunState = "running" | "succeeded" | "failed" | "skipped";

interface CronRunStatus {
  job: CronJobName;
  state: CronRunState;
  lockMode: "redis" | "local";
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  skippedAt?: string;
  durationMs?: number;
  error?: string;
}

interface AcquiredCronLock {
  acquired: true;
  mode: "redis" | "local";
  token: string;
  release: () => Promise<void>;
}

interface SkippedCronLock {
  acquired: false;
  mode: "redis" | "local";
  reason: string;
}

type CronLock = AcquiredCronLock | SkippedCronLock;

const CRON_LOCK_TTL_SECONDS = Number(process.env.CRON_LOCK_TTL_SECONDS || 15 * 60);
const localCronLocks = new Map<CronJobName, { token: string; expiresAt: number }>();
const localCronStatuses = new Map<CronJobName, CronRunStatus>();

function requiresDistributedCronLock(): boolean {
  return process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
}

function cronLockKey(jobName: CronJobName): string {
  return `imobibase:cron:lock:${jobName}`;
}

function cronStatusKey(jobName: CronJobName): string {
  return `imobibase:cron:status:${jobName}`;
}

function getCronRedis() {
  try {
    return getRedisClient();
  } catch (error) {
    if (requiresDistributedCronLock()) {
      throw error;
    }
    return null;
  }
}

async function acquireCronLock(jobName: CronJobName): Promise<CronLock> {
  const token = randomUUID();
  const redis = getCronRedis();

  if (redis) {
    const result = await redis.set(cronLockKey(jobName), token, "EX", CRON_LOCK_TTL_SECONDS, "NX");
    if (result !== "OK") {
      return {
        acquired: false,
        mode: "redis",
        reason: `Job ${jobName} is already running`,
      };
    }

    return {
      acquired: true,
      mode: "redis",
      token,
      release: async () => {
        await redis.eval(
          "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
          1,
          cronLockKey(jobName),
          token,
        );
      },
    };
  }

  const existing = localCronLocks.get(jobName);
  if (existing && existing.expiresAt > Date.now()) {
    return {
      acquired: false,
      mode: "local",
      reason: `Job ${jobName} is already running in this process`,
    };
  }

  localCronLocks.set(jobName, {
    token,
    expiresAt: Date.now() + CRON_LOCK_TTL_SECONDS * 1000,
  });

  return {
    acquired: true,
    mode: "local",
    token,
    release: async () => {
      const current = localCronLocks.get(jobName);
      if (current?.token === token) {
        localCronLocks.delete(jobName);
      }
    },
  };
}

async function saveCronStatus(status: CronRunStatus): Promise<void> {
  localCronStatuses.set(status.job, status);

  try {
    const redis = getCronRedis();
    if (!redis) return;
    await redis.set(cronStatusKey(status.job), JSON.stringify(status), "EX", 7 * 24 * 60 * 60);
  } catch (error) {
    console.warn("[Cron] Could not persist cron status", {
      job: status.job,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function readCronStatus(jobName: CronJobName): Promise<CronRunStatus | null> {
  try {
    const redis = getCronRedis();
    if (redis) {
      const raw = await redis.get(cronStatusKey(jobName));
      if (raw) return JSON.parse(raw) as CronRunStatus;
    }
  } catch {
    // Fall back to process-local status.
  }

  return localCronStatuses.get(jobName) ?? null;
}

/**
 * Verify the Vercel Cron secret from the Authorization header.
 * Returns true if the request is authorized, false otherwise.
 */
function verifyCronSecret(req: Request, res: Response): boolean {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET environment variable is not set");
    res.status(500).json({
      ok: false,
      error: "Server misconfiguration: CRON_SECRET not set",
    });
    return false;
  }

  const authHeader = req.headers.authorization;

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[Cron] Unauthorized cron request", {
      path: req.path,
      ip: req.ip,
    });
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return false;
  }

  return true;
}

/**
 * Wraps a job function with standard error handling, logging, and response formatting.
 */
function createCronHandler(
  jobName: CronJobName,
  jobFn: () => Promise<void>
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    if (!verifyCronSecret(req, res)) return;

    const startTime = Date.now();
    let lock: CronLock | null = null;
    console.log(`[Cron] Starting job: ${jobName}`);

    try {
      lock = await acquireCronLock(jobName);
      if (!lock.acquired) {
        const skippedAt = new Date().toISOString();
        await saveCronStatus({
          job: jobName,
          state: "skipped",
          lockMode: lock.mode,
          skippedAt,
          durationMs: Date.now() - startTime,
          error: lock.reason,
        });
        console.warn(`[Cron] Skipping duplicate job: ${jobName} (${lock.reason})`);
        res.status(200).json({
          ok: true,
          skipped: true,
          job: jobName,
          lockMode: lock.mode,
          reason: lock.reason,
          skippedAt,
        });
        return;
      }

      await saveCronStatus({
        job: jobName,
        state: "running",
        lockMode: lock.mode,
        startedAt: new Date(startTime).toISOString(),
      });

      await jobFn();
      const duration = Date.now() - startTime;
      const completedAt = new Date().toISOString();

      await saveCronStatus({
        job: jobName,
        state: "succeeded",
        lockMode: lock.mode,
        startedAt: new Date(startTime).toISOString(),
        completedAt,
        durationMs: duration,
      });

      console.log(`[Cron] Job completed: ${jobName} (${duration}ms)`);
      res.status(200).json({
        ok: true,
        job: jobName,
        lockMode: lock.mode,
        duration: `${duration}ms`,
        completedAt,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      const failedAt = new Date().toISOString();

      await saveCronStatus({
        job: jobName,
        state: "failed",
        lockMode: lock?.acquired ? lock.mode : "local",
        startedAt: new Date(startTime).toISOString(),
        failedAt,
        durationMs: duration,
        error: message,
      });

      console.error(`[Cron] Job failed: ${jobName} (${duration}ms)`, error);
      Sentry.captureException(error, {
        tags: { component: "cron", job: jobName },
      });

      res.status(500).json({
        ok: false,
        job: jobName,
        error: message,
        duration: `${duration}ms`,
        failedAt,
      });
    } finally {
      if (lock?.acquired) {
        await lock.release().catch((error) => {
          console.warn("[Cron] Failed to release cron lock", {
            job: jobName,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }
    }
  };
}

/**
 * Register all cron job HTTP endpoints.
 */
export function registerCronRoutes(app: Express): void {
  console.log("[Cron] Registering Vercel Cron endpoints...");

  const jobHandlers: Record<CronJobName, () => Promise<void>> = {
    "payment-reminders": runPaymentReminders,
    "daily-reports": runDailyReports,
    "weekly-reports": runWeeklyReports,
    "monthly-reports": runMonthlyReports,
    "cleanup-sessions": runCleanupSessions,
    "cleanup-logs": runCleanupLogs,
    "integration-sync": runIntegrationSync,
    "database-backup": runDatabaseBackup,
    "cleanup-temp-files": runCleanupTempFiles,
    "cleanup-soft-deletes": runCleanupSoftDeletes,
    "enforce-plan-limits": runEnforcePlanLimits,
  };

  for (const job of CRON_JOB_MANIFEST) {
    app.get(job.path, createCronHandler(job.name, jobHandlers[job.name]));
  }

  // Health check / status endpoint for all cron jobs
  app.get("/api/cron/status", async (req: Request, res: Response) => {
    if (!verifyCronSecret(req, res)) return;

    res.status(200).json({
      ok: true,
      lockMode: requiresDistributedCronLock() ? "redis-required" : "local-fallback-allowed",
      jobs: await Promise.all(
        CRON_JOB_MANIFEST.map(async (job) => ({
          name: job.name,
          label: job.label,
          path: job.path,
          schedule: job.localSchedule,
          vercelSchedule: job.vercelSchedule,
          timezone: job.timezone,
          lastRun: await readCronStatus(job.name),
        })),
      ),
    });
  });

  console.log(`[Cron] ${CRON_JOB_MANIFEST.length} cron endpoints registered under /api/cron/*`);
}
