import {
  queueDailyReport,
  queueWeeklyReport,
  queueMonthlyReport,
} from "./report-queue";
import { queueBatchPaymentReminders } from "./payment-queue";
import {
  createQueue,
  QueueName,
  BackupJobData,
  CleanupJobData,
  IntegrationSyncJobData,
} from "./queue-manager";
import * as Sentry from "@sentry/node";

// ===================================================================
// EXPORTED JOB FUNCTIONS
// These are called by both:
//   1. Vercel Cron HTTP endpoints (server/routes-cron.ts)
//   2. node-cron fallback below (for Docker/Railway deployments)
// ===================================================================

/**
 * Run payment reminders
 */
export async function runPaymentReminders(): Promise<void> {
  // In production, fetch contracts with upcoming or overdue payments from database
  const contractsToRemind = [
    { contractId: 1, type: "upcoming" as const },
    { contractId: 2, type: "overdue" as const, daysOverdue: 5 },
    { contractId: 3, type: "final-notice" as const, daysOverdue: 30 },
  ];

  await queueBatchPaymentReminders(contractsToRemind);
  console.log(
    `[ScheduledJobs] Queued ${contractsToRemind.length} payment reminders`,
  );
}

/**
 * Run daily reports
 */
export async function runDailyReports(): Promise<void> {
  // In production, fetch users who want daily reports
  const usersWithDailyReports = [{ userId: 1, email: "admin@imobibase.com" }];

  for (const user of usersWithDailyReports) {
    await queueDailyReport(user.userId, user.email);
  }

  console.log(
    `[ScheduledJobs] Queued ${usersWithDailyReports.length} daily reports`,
  );
}

/**
 * Run weekly reports
 */
export async function runWeeklyReports(): Promise<void> {
  // In production, fetch users who want weekly reports
  const usersWithWeeklyReports = [{ userId: 1, email: "admin@imobibase.com" }];

  for (const user of usersWithWeeklyReports) {
    await queueWeeklyReport(user.userId, user.email);
  }

  console.log(
    `[ScheduledJobs] Queued ${usersWithWeeklyReports.length} weekly reports`,
  );
}

/**
 * Run monthly reports
 */
export async function runMonthlyReports(): Promise<void> {
  // In production, fetch users who want monthly reports
  const usersWithMonthlyReports = [{ userId: 1, email: "admin@imobibase.com" }];

  for (const user of usersWithMonthlyReports) {
    await queueMonthlyReport(user.userId, user.email);
  }

  console.log(
    `[ScheduledJobs] Queued ${usersWithMonthlyReports.length} monthly reports`,
  );
}

/**
 * Run session cleanup
 */
export async function runCleanupSessions(): Promise<void> {
  const cleanupQueue = createQueue<CleanupJobData>(QueueName.CLEANUP);

  await cleanupQueue.add("cleanup-sessions", {
    target: "sessions",
    olderThan: 7, // 7 days
  });

  console.log("[ScheduledJobs] Session cleanup queued");
}

/**
 * Run log cleanup
 */
export async function runCleanupLogs(): Promise<void> {
  const cleanupQueue = createQueue<CleanupJobData>(QueueName.CLEANUP);

  await cleanupQueue.add("cleanup-logs", {
    target: "logs",
    olderThan: 30, // 30 days
  });

  console.log("[ScheduledJobs] Log cleanup queued");
}

/**
 * Run temp files cleanup
 */
export async function runCleanupTempFiles(): Promise<void> {
  const cleanupQueue = createQueue<CleanupJobData>(QueueName.CLEANUP);

  await cleanupQueue.add("cleanup-temp-files", {
    target: "temp-files",
    olderThan: 7, // 7 days
  });

  console.log("[ScheduledJobs] Temp files cleanup queued");
}

/**
 * Run integration sync
 */
export async function runIntegrationSync(): Promise<void> {
  const integrationQueue = createQueue<IntegrationSyncJobData>(
    QueueName.INTEGRATION_SYNC,
  );

  // Sync with configured integrations
  const integrations = ["zapier", "real-estate-portal"];

  for (const provider of integrations) {
    await integrationQueue.add(`sync-${provider}`, {
      provider,
      action: "sync",
    });
  }

  console.log(
    `[ScheduledJobs] Queued sync for ${integrations.length} integrations`,
  );
}

/**
 * Run database backup
 */
export async function runDatabaseBackup(): Promise<void> {
  const backupQueue = createQueue<BackupJobData>(QueueName.BACKUP);

  await backupQueue.add("database-backup", {
    type: "full",
    includeFiles: false,
    retention: 30,
  });

  console.log("[ScheduledJobs] Database backup queued");
}

/**
 * Revalida limites de plano para todos os tenants ativos.
 * Safety net diario: desconecta integracoes excedentes em casos onde o webhook
 * customer.subscription.updated falhou ou o downgrade ocorreu manualmente.
 * Executar via cron as 3h da manha (baixa carga).
 */
export async function runEnforcePlanLimits(): Promise<void> {
  const { storage } = await import("../storage");
  const { enforceAllPlanLimits } = await import(
    "../middleware/plan-limits"
  );

  console.log("[Cron] Running plan limits enforcement sweep...");
  const tenants = await storage.getAllTenants();
  let affected = 0;
  let total = 0;

  for (const tenant of tenants) {
    try {
      const result = await enforceAllPlanLimits(tenant.id);
      if (result.integrationsDisconnected > 0) {
        affected++;
        total += result.integrationsDisconnected;
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { cron: "enforce-plan-limits" },
        extra: { tenantId: tenant.id },
      });
    }
  }

  console.log(
    `[Cron] Plan enforcement complete: ${affected} tenants affected, ${total} integrations disconnected`,
  );
}

/**
 * Run cleanup of soft-deleted records older than 90 days
 */
export async function runCleanupSoftDeletes(): Promise<void> {
  console.log("[Cron] Cleaning up soft-deleted records older than 90 days...");
  const { purgeDeletedRecords } = await import("../utils/soft-delete");
  const { schema } = await import("../db");

  const tables = [
    schema.tenants,
    schema.users,
    schema.properties,
    schema.leads,
    schema.contracts,
    schema.owners,
    schema.renters,
    schema.rentalContracts,
    schema.financeCategories,
  ];

  let totalDeleted = 0;
  for (const table of tables) {
    if ("deletedAt" in table) {
      const result = await purgeDeletedRecords(table, 90);
      // result.rowCount may be available depending on driver
      console.log(`[Cron] Purged soft-deleted records from table`);
    }
  }

  console.log("[Cron] Soft-delete cleanup completed");
}

// ===================================================================
// NODE-CRON FALLBACK (for non-Vercel deployments: Docker, Railway, etc.)
//
// On Vercel, initializeScheduledJobs() should NOT be called.
// Instead, Vercel Cron triggers HTTP endpoints in routes-cron.ts.
//
// On persistent servers, call initializeScheduledJobs() at startup
// to use node-cron for in-process scheduling.
// ===================================================================

const scheduledTasks: Array<{ stop: () => void; getStatus: () => string }> = [];

/**
 * Initialize all scheduled jobs using node-cron.
 * Only call this on persistent server deployments (NOT on Vercel/serverless).
 *
 * On Vercel, use the HTTP cron endpoints registered in routes-cron.ts instead.
 */
export function initializeScheduledJobs(): void {
  // Skip on Vercel - cron is handled via HTTP endpoints
  if (process.env.VERCEL) {
    console.log(
      "[ScheduledJobs] Running on Vercel - skipping node-cron initialization",
    );
    console.log(
      "[ScheduledJobs] Cron jobs will be triggered via Vercel Cron HTTP endpoints",
    );
    return;
  }

  // Dynamic import to avoid loading node-cron on Vercel where it's unnecessary
  let cron: {
    schedule: (
      expression: string,
      fn: () => void,
      options: Record<string, unknown>,
    ) => { stop: () => void; getStatus: () => string };
  };
  try {
    cron = require("node-cron");
  } catch {
    console.warn(
      "[ScheduledJobs] node-cron not available - skipping cron initialization",
    );
    console.warn(
      "[ScheduledJobs] If running on Vercel, this is expected. Jobs run via HTTP cron endpoints.",
    );
    return;
  }

  console.log(
    "[ScheduledJobs] Initializing node-cron scheduled jobs (persistent server mode)...",
  );

  const jobs: Array<{
    name: string;
    schedule: string;
    fn: () => Promise<void>;
    options?: { timezone?: string };
  }> = [
    {
      name: "payment-reminders",
      schedule: "0 9 * * *",
      fn: runPaymentReminders,
      options: { timezone: "America/Sao_Paulo" },
    },
    {
      name: "daily-reports",
      schedule: "0 0 * * *",
      fn: runDailyReports,
      options: { timezone: "America/Sao_Paulo" },
    },
    {
      name: "weekly-reports",
      schedule: "0 8 * * 1",
      fn: runWeeklyReports,
      options: { timezone: "America/Sao_Paulo" },
    },
    {
      name: "monthly-reports",
      schedule: "0 8 1 * *",
      fn: runMonthlyReports,
      options: { timezone: "America/Sao_Paulo" },
    },
    { name: "cleanup-sessions", schedule: "0 * * * *", fn: runCleanupSessions },
    { name: "cleanup-logs", schedule: "0 */6 * * *", fn: runCleanupLogs },
    {
      name: "integration-sync",
      schedule: "0 */6 * * *",
      fn: runIntegrationSync,
    },
    {
      name: "database-backup",
      schedule: "0 2 * * *",
      fn: runDatabaseBackup,
      options: { timezone: "America/Sao_Paulo" },
    },
    {
      name: "cleanup-temp-files",
      schedule: "0 3 * * 0",
      fn: runCleanupTempFiles,
      options: { timezone: "America/Sao_Paulo" },
    },
  ];

  for (const job of jobs) {
    const task = cron.schedule(
      job.schedule,
      async () => {
        console.log(`[ScheduledJobs] Running ${job.name}...`);
        try {
          await job.fn();
        } catch (error) {
          console.error(`[ScheduledJobs] ${job.name} failed:`, error);
          Sentry.captureException(error, {
            tags: { component: "scheduled-jobs", job: job.name },
          });
        }
      },
      job.options || {},
    );

    scheduledTasks.push(task);
  }

  console.log(
    `[ScheduledJobs] ${scheduledTasks.length} scheduled jobs initialized`,
  );
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(): void {
  console.log("[ScheduledJobs] Stopping all scheduled jobs...");

  for (const task of scheduledTasks) {
    task.stop();
  }

  scheduledTasks.length = 0;
  console.log("[ScheduledJobs] All scheduled jobs stopped");
}

/**
 * Get scheduled jobs status
 */
export function getScheduledJobsStatus(): Array<{
  name: string;
  running: boolean;
}> {
  const jobNames = [
    "Payment Reminders (Daily 9 AM)",
    "Daily Reports (Midnight)",
    "Weekly Reports (Monday 8 AM)",
    "Monthly Reports (1st day 8 AM)",
    "Session Cleanup (Hourly)",
    "Log Cleanup (Every 6 hours)",
    "Integration Sync (Every 6 hours)",
    "Database Backup (Daily 2 AM)",
    "Temp Files Cleanup (Sunday 3 AM)",
  ];

  // On Vercel, there are no node-cron tasks; report status from cron config
  if (process.env.VERCEL || scheduledTasks.length === 0) {
    return jobNames.map((name) => ({
      name,
      running: !!process.env.VERCEL, // On Vercel, cron jobs are always "running" via HTTP triggers
    }));
  }

  return scheduledTasks.map((task, index) => ({
    name: jobNames[index] || `Unknown Job ${index}`,
    running: task.getStatus() === "scheduled",
  }));
}
