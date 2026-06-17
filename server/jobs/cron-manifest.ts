export type CronJobName =
  | "payment-reminders"
  | "daily-reports"
  | "weekly-reports"
  | "monthly-reports"
  | "cleanup-sessions"
  | "cleanup-logs"
  | "integration-sync"
  | "database-backup"
  | "cleanup-temp-files"
  | "cleanup-soft-deletes"
  | "enforce-plan-limits";

export interface CronJobManifestEntry {
  name: CronJobName;
  label: string;
  path: `/api/cron/${CronJobName}`;
  localSchedule: string;
  vercelSchedule: string;
  timezone?: string;
}

export const CRON_TIMEZONE = "America/Sao_Paulo";

export const CRON_JOB_MANIFEST: CronJobManifestEntry[] = [
  {
    name: "payment-reminders",
    label: "Payment Reminders",
    path: "/api/cron/payment-reminders",
    localSchedule: "0 9 * * *",
    vercelSchedule: "0 12 * * *",
    timezone: CRON_TIMEZONE,
  },
  {
    name: "daily-reports",
    label: "Daily Reports",
    path: "/api/cron/daily-reports",
    localSchedule: "0 0 * * *",
    vercelSchedule: "0 3 * * *",
    timezone: CRON_TIMEZONE,
  },
  {
    name: "weekly-reports",
    label: "Weekly Reports",
    path: "/api/cron/weekly-reports",
    localSchedule: "0 8 * * 1",
    vercelSchedule: "0 11 * * 1",
    timezone: CRON_TIMEZONE,
  },
  {
    name: "monthly-reports",
    label: "Monthly Reports",
    path: "/api/cron/monthly-reports",
    localSchedule: "0 8 1 * *",
    vercelSchedule: "0 11 1 * *",
    timezone: CRON_TIMEZONE,
  },
  {
    name: "cleanup-sessions",
    label: "Session Cleanup",
    path: "/api/cron/cleanup-sessions",
    localSchedule: "0 * * * *",
    vercelSchedule: "0 * * * *",
  },
  {
    name: "cleanup-logs",
    label: "Log Cleanup",
    path: "/api/cron/cleanup-logs",
    localSchedule: "0 */6 * * *",
    vercelSchedule: "0 */6 * * *",
  },
  {
    name: "integration-sync",
    label: "Integration Sync",
    path: "/api/cron/integration-sync",
    localSchedule: "0 */6 * * *",
    vercelSchedule: "0 */6 * * *",
  },
  {
    name: "database-backup",
    label: "Database Backup",
    path: "/api/cron/database-backup",
    localSchedule: "0 2 * * *",
    vercelSchedule: "0 5 * * *",
    timezone: CRON_TIMEZONE,
  },
  {
    name: "cleanup-temp-files",
    label: "Temp Files Cleanup",
    path: "/api/cron/cleanup-temp-files",
    localSchedule: "0 3 * * 0",
    vercelSchedule: "0 6 * * 0",
    timezone: CRON_TIMEZONE,
  },
  {
    name: "cleanup-soft-deletes",
    label: "Soft Delete Cleanup",
    path: "/api/cron/cleanup-soft-deletes",
    localSchedule: "0 3 * * *",
    vercelSchedule: "0 6 * * *",
    timezone: CRON_TIMEZONE,
  },
  {
    name: "enforce-plan-limits",
    label: "Plan Limit Enforcement",
    path: "/api/cron/enforce-plan-limits",
    localSchedule: "30 3 * * *",
    vercelSchedule: "30 6 * * *",
    timezone: CRON_TIMEZONE,
  },
];
