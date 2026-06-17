import * as Sentry from "@sentry/node";
import {
  sendPaymentReminder,
  type PaymentReminderContext,
} from "./processors/payment-reminder-processor";
import { runReport, type ReportContext } from "./processors/report-processor";
import { runCleanupTarget } from "./processors/cleanup-processor";
import { runIntegrationSyncProvider } from "./processors/integration-sync-processor";
import { runBackup } from "./processors/backup-processor";
import { CRON_JOB_MANIFEST, type CronJobName } from "./cron-manifest";

// ===================================================================
// EXPORTED JOB FUNCTIONS
//
// These run the work INLINE (no BullMQ enqueue). On Vercel/serverless
// there is NO persistent BullMQ worker, so anything merely enqueued would
// pile up in Redis and never execute. These functions are invoked by:
//   1. Vercel Cron HTTP endpoints (server/routes-cron.ts) -> primary path
//   2. node-cron fallback below (for Docker/Railway persistent servers)
//
// The per-item logic lives in processors/* as directly-callable functions
// (e.g. sendPaymentReminder, runReport) and is ALSO reused by the BullMQ
// worker entrypoints (processX) when a persistent worker exists.
// ===================================================================

const REMINDER_WINDOW_DAYS = 3; // notify this many days before due date
const FINAL_NOTICE_DAYS = 30; // overdue threshold for "final notice"

/**
 * Classify a pending payment into a reminder type relative to today.
 * Returns null when the payment is neither due-soon nor overdue.
 */
function classifyReminder(
  dueDate: Date,
  now: Date,
): { type: PaymentReminderContext["type"]; daysOverdue?: number } | null {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(
    (dueDate.getTime() - now.getTime()) / msPerDay,
  );

  if (diffDays >= 0 && diffDays <= REMINDER_WINDOW_DAYS) {
    return { type: "upcoming" };
  }
  if (diffDays < 0) {
    const daysOverdue = Math.abs(diffDays);
    return {
      type: daysOverdue >= FINAL_NOTICE_DAYS ? "final-notice" : "overdue",
      daysOverdue,
    };
  }
  return null;
}

/**
 * Run payment reminders for every active tenant.
 *
 * Queries REAL pending rental payments whose due date is upcoming or overdue,
 * joins renter + property for contact/branding, and sends the reminder e-mail
 * inline.
 */
export async function runPaymentReminders(): Promise<void> {
  const { db, schema } = await import("../db");
  const { eq } = await import("drizzle-orm");

  const now = new Date();
  let sent = 0;
  let scanned = 0;

  const rows = await db
    .select({
      tenantId: schema.rentalPayments.tenantId,
      rentalPaymentId: schema.rentalPayments.id,
      rentalContractId: schema.rentalPayments.rentalContractId,
      dueDate: schema.rentalPayments.dueDate,
      totalValue: schema.rentalPayments.totalValue,
      renterEmail: schema.renters.email,
      renterName: schema.renters.name,
      propertyAddress: schema.properties.address,
      agencyName: schema.tenants.name,
    })
    .from(schema.rentalPayments)
    .innerJoin(
      schema.rentalContracts,
      eq(schema.rentalPayments.rentalContractId, schema.rentalContracts.id),
    )
    .innerJoin(
      schema.renters,
      eq(schema.rentalContracts.renterId, schema.renters.id),
    )
    .innerJoin(
      schema.properties,
      eq(schema.rentalContracts.propertyId, schema.properties.id),
    )
    .innerJoin(
      schema.tenants,
      eq(schema.rentalPayments.tenantId, schema.tenants.id),
    )
    .where(eq(schema.rentalPayments.status, "pending"));

  for (const row of rows) {
    scanned++;
    const classification = classifyReminder(new Date(row.dueDate), now);
    if (!classification) continue;

    const ctx: PaymentReminderContext = {
      tenantId: row.tenantId,
      rentalContractId: row.rentalContractId,
      rentalPaymentId: row.rentalPaymentId,
      type: classification.type,
      daysOverdue: classification.daysOverdue,
      renterEmail: row.renterEmail ?? "",
      renterName: row.renterName,
      propertyAddress: row.propertyAddress,
      totalValue: row.totalValue,
      dueDate: new Date(row.dueDate).toISOString(),
      agencyName: row.agencyName,
    };

    try {
      const ok = await sendPaymentReminder(ctx);
      if (ok) sent++;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { cron: "payment-reminders" },
        extra: { rentalContractId: row.rentalContractId },
      });
    }
  }

  console.log(
    `[ScheduledJobs] Payment reminders: ${sent} sent / ${scanned} pending payments scanned`,
  );
}

/**
 * Fetch the report recipients for every active tenant: the agency e-mail plus
 * each admin/owner user. Falls back to the tenant e-mail when no admin user
 * exists.
 */
async function getReportRecipients(): Promise<
  Array<{
    tenantId: string;
    email: string;
    name: string;
    agencyName: string;
  }>
> {
  const { db, schema } = await import("../db");
  const { inArray } = await import("drizzle-orm");

  const tenants = await db
    .select({
      id: schema.tenants.id,
      name: schema.tenants.name,
      email: schema.tenants.email,
    })
    .from(schema.tenants);

  if (tenants.length === 0) return [];

  const tenantIds = tenants.map((t: { id: string }) => t.id);

  const adminUsers = await db
    .select({
      tenantId: schema.users.tenantId,
      email: schema.users.email,
      name: schema.users.name,
      role: schema.users.role,
    })
    .from(schema.users)
    .where(inArray(schema.users.tenantId, tenantIds));

  const recipients: Array<{
    tenantId: string;
    email: string;
    name: string;
    agencyName: string;
  }> = [];

  for (const tenant of tenants as Array<{
    id: string;
    name: string;
    email: string | null;
  }>) {
    const admins = (
      adminUsers as Array<{
        tenantId: string;
        email: string;
        name: string;
        role: string;
      }>
    ).filter(
      (u) =>
        u.tenantId === tenant.id &&
        (u.role === "admin" || u.role === "super_admin" || u.role === "owner"),
    );

    if (admins.length > 0) {
      for (const admin of admins) {
        recipients.push({
          tenantId: tenant.id,
          email: admin.email,
          name: admin.name,
          agencyName: tenant.name,
        });
      }
    } else if (tenant.email) {
      recipients.push({
        tenantId: tenant.id,
        email: tenant.email,
        name: tenant.name,
        agencyName: tenant.name,
      });
    }
  }

  return recipients;
}

async function runReportsForAll(
  type: ReportContext["type"],
): Promise<void> {
  const recipients = await getReportRecipients();
  let sent = 0;

  for (const recipient of recipients) {
    try {
      await runReport({
        type,
        tenantId: recipient.tenantId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        agencyName: recipient.agencyName,
      });
      sent++;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { cron: `${type}-reports` },
        extra: { tenantId: recipient.tenantId, email: recipient.email },
      });
    }
  }

  console.log(
    `[ScheduledJobs] ${type} reports: ${sent}/${recipients.length} sent`,
  );
}

export async function runDailyReports(): Promise<void> {
  await runReportsForAll("daily");
}

export async function runWeeklyReports(): Promise<void> {
  await runReportsForAll("weekly");
}

export async function runMonthlyReports(): Promise<void> {
  await runReportsForAll("monthly");
}

/**
 * Run session cleanup inline.
 */
export async function runCleanupSessions(): Promise<void> {
  const deleted = await runCleanupTarget("sessions", 7);
  console.log(`[ScheduledJobs] Session cleanup: ${deleted} removed`);
}

/**
 * Run log cleanup inline.
 */
export async function runCleanupLogs(): Promise<void> {
  const deleted = await runCleanupTarget("logs", 30);
  console.log(`[ScheduledJobs] Log cleanup: ${deleted} removed`);
}

/**
 * Run temp files cleanup inline.
 */
export async function runCleanupTempFiles(): Promise<void> {
  const deleted = await runCleanupTarget("temp-files", 7);
  console.log(`[ScheduledJobs] Temp files cleanup: ${deleted} removed`);
}

/**
 * Run integration sync inline for the configured providers.
 */
export async function runIntegrationSync(): Promise<void> {
  const providers = ["zapier", "salesforce", "hubspot", "real-estate-portal"];
  let synced = 0;

  for (const provider of providers) {
    try {
      const result = await runIntegrationSyncProvider(provider, "sync");
      if (result.status === "synced") synced++;
    } catch (err) {
      Sentry.captureException(err, {
        tags: { cron: "integration-sync", provider },
      });
    }
  }

  console.log(
    `[ScheduledJobs] Integration sync: ${synced}/${providers.length} providers processed`,
  );
}

/**
 * Run database backup inline.
 *
 * NOTE: This will THROW if no durable backup target is configured (see
 * runBackup). That is intentional - a silent "simulated" success previously
 * hid the fact that no real backup existed. The official DR strategy in
 * production is Supabase Point-In-Time Recovery (PITR); set
 * BACKUP_OPTIONAL=true to treat the missing off-site bucket as a warning.
 */
export async function runDatabaseBackup(): Promise<void> {
  const result = await runBackup({
    type: "full",
    includeFiles: false,
    retention: 30,
  });
  console.log(`[ScheduledJobs] Database backup completed: ${result.backupName}`);
}

/**
 * Revalida limites de plano para todos os tenants ativos.
 * Safety net diario: desconecta integracoes excedentes em casos onde o webhook
 * customer.subscription.updated falhou ou o downgrade ocorreu manualmente.
 * Executar via cron as 3h da manha (baixa carga).
 */
export async function runEnforcePlanLimits(): Promise<void> {
  const { storage } = await import("../storage");
  const { enforceAllPlanLimits } = await import("../middleware/plan-limits");

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
 * Run cleanup of soft-deleted records older than 90 days.
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

  for (const table of tables) {
    if ("deletedAt" in table) {
      await purgeDeletedRecords(table, 90);
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
    const task = cron.schedule(
      job.localSchedule,
      async () => {
        console.log(`[ScheduledJobs] Running ${job.name}...`);
        try {
          await jobHandlers[job.name]();
        } catch (error) {
          console.error(`[ScheduledJobs] ${job.name} failed:`, error);
          Sentry.captureException(error, {
            tags: { component: "scheduled-jobs", job: job.name },
          });
        }
      },
      job.timezone ? { timezone: job.timezone } : {},
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
  // On Vercel, there are no node-cron tasks; report status from cron config
  if (process.env.VERCEL || scheduledTasks.length === 0) {
    return CRON_JOB_MANIFEST.map((job) => ({
      name: job.label,
      running: !!process.env.VERCEL, // On Vercel, cron jobs are always "running" via HTTP triggers
    }));
  }

  return scheduledTasks.map((task, index) => ({
    name: CRON_JOB_MANIFEST[index]?.label || `Unknown Job ${index}`,
    running: task.getStatus() === "scheduled",
  }));
}
