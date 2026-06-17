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
  jobName: string,
  jobFn: () => Promise<void>
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    if (!verifyCronSecret(req, res)) return;

    const startTime = Date.now();
    console.log(`[Cron] Starting job: ${jobName}`);

    try {
      await jobFn();
      const duration = Date.now() - startTime;

      console.log(`[Cron] Job completed: ${jobName} (${duration}ms)`);
      res.status(200).json({
        ok: true,
        job: jobName,
        duration: `${duration}ms`,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);

      console.error(`[Cron] Job failed: ${jobName} (${duration}ms)`, error);
      Sentry.captureException(error, {
        tags: { component: "cron", job: jobName },
      });

      res.status(500).json({
        ok: false,
        job: jobName,
        error: message,
        duration: `${duration}ms`,
        failedAt: new Date().toISOString(),
      });
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
  app.get("/api/cron/status", (req: Request, res: Response) => {
    if (!verifyCronSecret(req, res)) return;

    res.status(200).json({
      ok: true,
      jobs: CRON_JOB_MANIFEST.map((job) => ({
        name: job.name,
        label: job.label,
        path: job.path,
        schedule: job.localSchedule,
        vercelSchedule: job.vercelSchedule,
        timezone: job.timezone,
      })),
    });
  });

  console.log(`[Cron] ${CRON_JOB_MANIFEST.length} cron endpoints registered under /api/cron/*`);
}
