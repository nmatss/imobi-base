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

  // Daily at 9 AM (Brazil) - Send payment reminders
  app.get(
    "/api/cron/payment-reminders",
    createCronHandler("payment-reminders", runPaymentReminders)
  );

  // Daily at midnight (Brazil) - Generate daily reports
  app.get(
    "/api/cron/daily-reports",
    createCronHandler("daily-reports", runDailyReports)
  );

  // Weekly on Monday at 8 AM (Brazil) - Generate weekly reports
  app.get(
    "/api/cron/weekly-reports",
    createCronHandler("weekly-reports", runWeeklyReports)
  );

  // Monthly on 1st day at 8 AM (Brazil) - Generate monthly reports
  app.get(
    "/api/cron/monthly-reports",
    createCronHandler("monthly-reports", runMonthlyReports)
  );

  // Hourly - Cleanup old sessions
  app.get(
    "/api/cron/cleanup-sessions",
    createCronHandler("cleanup-sessions", runCleanupSessions)
  );

  // Every 6 hours - Cleanup logs
  app.get(
    "/api/cron/cleanup-logs",
    createCronHandler("cleanup-logs", runCleanupLogs)
  );

  // Every 6 hours - Sync with external APIs
  app.get(
    "/api/cron/integration-sync",
    createCronHandler("integration-sync", runIntegrationSync)
  );

  // Daily at 2 AM (Brazil) - Database backup
  app.get(
    "/api/cron/database-backup",
    createCronHandler("database-backup", runDatabaseBackup)
  );

  // Weekly on Sunday at 3 AM (Brazil) - Cleanup temp files
  app.get(
    "/api/cron/cleanup-temp-files",
    createCronHandler("cleanup-temp-files", runCleanupTempFiles)
  );

  // Daily at 3 AM (Brazil) - Cleanup soft-deleted records older than 90 days
  app.get(
    "/api/cron/cleanup-soft-deletes",
    createCronHandler("cleanup-soft-deletes", runCleanupSoftDeletes)
  );

  // Daily at 3:30 AM (Brazil) - Enforce plan limits (revoke integrations over limit)
  app.get(
    "/api/cron/enforce-plan-limits",
    createCronHandler("enforce-plan-limits", runEnforcePlanLimits)
  );

  // Health check / status endpoint for all cron jobs
  app.get("/api/cron/status", (req: Request, res: Response) => {
    if (!verifyCronSecret(req, res)) return;

    res.status(200).json({
      ok: true,
      jobs: [
        { name: "payment-reminders", schedule: "0 9 * * *", path: "/api/cron/payment-reminders" },
        { name: "daily-reports", schedule: "0 0 * * *", path: "/api/cron/daily-reports" },
        { name: "weekly-reports", schedule: "0 8 * * 1", path: "/api/cron/weekly-reports" },
        { name: "monthly-reports", schedule: "0 8 1 * *", path: "/api/cron/monthly-reports" },
        { name: "cleanup-sessions", schedule: "0 * * * *", path: "/api/cron/cleanup-sessions" },
        { name: "cleanup-logs", schedule: "0 */6 * * *", path: "/api/cron/cleanup-logs" },
        { name: "integration-sync", schedule: "0 */6 * * *", path: "/api/cron/integration-sync" },
        { name: "database-backup", schedule: "0 2 * * *", path: "/api/cron/database-backup" },
        { name: "cleanup-temp-files", schedule: "0 3 * * 0", path: "/api/cron/cleanup-temp-files" },
        { name: "cleanup-soft-deletes", schedule: "0 3 * * *", path: "/api/cron/cleanup-soft-deletes" },
      ],
    });
  });

  console.log("[Cron] 10 cron endpoints registered under /api/cron/*");
}
