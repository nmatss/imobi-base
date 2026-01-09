// @ts-nocheck
import cron from 'node-cron';
import { queueDailyReport, queueWeeklyReport, queueMonthlyReport } from './report-queue';
import { queueBatchPaymentReminders } from './payment-queue';
import { createQueue, QueueName, BackupJobData, CleanupJobData, IntegrationSyncJobData } from './queue-manager';
import * as Sentry from '@sentry/node';

const scheduledTasks: cron.ScheduledTask[] = [];

/**
 * Initialize all scheduled jobs
 */
export function initializeScheduledJobs(): void {
  console.log('[ScheduledJobs] Initializing scheduled jobs...');

  // Daily at 9 AM - Send payment reminders
  const paymentRemindersJob = cron.schedule('0 9 * * *', async () => {
    console.log('[ScheduledJobs] Running daily payment reminders...');
    try {
      await runPaymentReminders();
    } catch (error) {
      console.error('[ScheduledJobs] Payment reminders failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'payment-reminders' },
      });
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });
  scheduledTasks.push(paymentRemindersJob);

  // Daily at midnight - Generate daily reports
  const dailyReportsJob = cron.schedule('0 0 * * *', async () => {
    console.log('[ScheduledJobs] Running daily reports...');
    try {
      await runDailyReports();
    } catch (error) {
      console.error('[ScheduledJobs] Daily reports failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'daily-reports' },
      });
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });
  scheduledTasks.push(dailyReportsJob);

  // Weekly on Monday at 8 AM - Generate weekly reports
  const weeklyReportsJob = cron.schedule('0 8 * * 1', async () => {
    console.log('[ScheduledJobs] Running weekly reports...');
    try {
      await runWeeklyReports();
    } catch (error) {
      console.error('[ScheduledJobs] Weekly reports failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'weekly-reports' },
      });
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });
  scheduledTasks.push(weeklyReportsJob);

  // Monthly on 1st day at 8 AM - Generate monthly reports
  const monthlyReportsJob = cron.schedule('0 8 1 * *', async () => {
    console.log('[ScheduledJobs] Running monthly reports...');
    try {
      await runMonthlyReports();
    } catch (error) {
      console.error('[ScheduledJobs] Monthly reports failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'monthly-reports' },
      });
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });
  scheduledTasks.push(monthlyReportsJob);

  // Hourly - Cleanup old sessions
  const cleanupSessionsJob = cron.schedule('0 * * * *', async () => {
    console.log('[ScheduledJobs] Running session cleanup...');
    try {
      await runCleanupSessions();
    } catch (error) {
      console.error('[ScheduledJobs] Session cleanup failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'cleanup-sessions' },
      });
    }
  });
  scheduledTasks.push(cleanupSessionsJob);

  // Every 6 hours - Cleanup logs
  const cleanupLogsJob = cron.schedule('0 */6 * * *', async () => {
    console.log('[ScheduledJobs] Running log cleanup...');
    try {
      await runCleanupLogs();
    } catch (error) {
      console.error('[ScheduledJobs] Log cleanup failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'cleanup-logs' },
      });
    }
  });
  scheduledTasks.push(cleanupLogsJob);

  // Every 6 hours - Sync with external APIs
  const integrationSyncJob = cron.schedule('0 */6 * * *', async () => {
    console.log('[ScheduledJobs] Running integration sync...');
    try {
      await runIntegrationSync();
    } catch (error) {
      console.error('[ScheduledJobs] Integration sync failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'integration-sync' },
      });
    }
  });
  scheduledTasks.push(integrationSyncJob);

  // Daily at 2 AM - Database backup
  const backupJob = cron.schedule('0 2 * * *', async () => {
    console.log('[ScheduledJobs] Running database backup...');
    try {
      await runDatabaseBackup();
    } catch (error) {
      console.error('[ScheduledJobs] Database backup failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'database-backup' },
      });
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });
  scheduledTasks.push(backupJob);

  // Weekly cleanup of temp files on Sunday at 3 AM
  const cleanupTempFilesJob = cron.schedule('0 3 * * 0', async () => {
    console.log('[ScheduledJobs] Running temp files cleanup...');
    try {
      await runCleanupTempFiles();
    } catch (error) {
      console.error('[ScheduledJobs] Temp files cleanup failed:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduled-jobs', job: 'cleanup-temp-files' },
      });
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });
  scheduledTasks.push(cleanupTempFilesJob);

  console.log(`[ScheduledJobs] ${scheduledTasks.length} scheduled jobs initialized`);
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduledJobs(): void {
  console.log('[ScheduledJobs] Stopping all scheduled jobs...');

  for (const task of scheduledTasks) {
    task.stop();
  }

  scheduledTasks.length = 0;
  console.log('[ScheduledJobs] All scheduled jobs stopped');
}

/**
 * Run payment reminders
 */
async function runPaymentReminders(): Promise<void> {
  // In production, fetch contracts with upcoming or overdue payments from database
  const contractsToRemind = [
    { contractId: 1, type: 'upcoming' as const },
    { contractId: 2, type: 'overdue' as const, daysOverdue: 5 },
    { contractId: 3, type: 'final-notice' as const, daysOverdue: 30 },
  ];

  await queueBatchPaymentReminders(contractsToRemind);
  console.log(`[ScheduledJobs] Queued ${contractsToRemind.length} payment reminders`);
}

/**
 * Run daily reports
 */
async function runDailyReports(): Promise<void> {
  // In production, fetch users who want daily reports
  const usersWithDailyReports = [
    { userId: 1, email: 'admin@imobibase.com' },
  ];

  for (const user of usersWithDailyReports) {
    await queueDailyReport(user.userId, user.email);
  }

  console.log(`[ScheduledJobs] Queued ${usersWithDailyReports.length} daily reports`);
}

/**
 * Run weekly reports
 */
async function runWeeklyReports(): Promise<void> {
  // In production, fetch users who want weekly reports
  const usersWithWeeklyReports = [
    { userId: 1, email: 'admin@imobibase.com' },
  ];

  for (const user of usersWithWeeklyReports) {
    await queueWeeklyReport(user.userId, user.email);
  }

  console.log(`[ScheduledJobs] Queued ${usersWithWeeklyReports.length} weekly reports`);
}

/**
 * Run monthly reports
 */
async function runMonthlyReports(): Promise<void> {
  // In production, fetch users who want monthly reports
  const usersWithMonthlyReports = [
    { userId: 1, email: 'admin@imobibase.com' },
  ];

  for (const user of usersWithMonthlyReports) {
    await queueMonthlyReport(user.userId, user.email);
  }

  console.log(`[ScheduledJobs] Queued ${usersWithMonthlyReports.length} monthly reports`);
}

/**
 * Run session cleanup
 */
async function runCleanupSessions(): Promise<void> {
  const cleanupQueue = createQueue<CleanupJobData>(QueueName.CLEANUP);

  await cleanupQueue.add('cleanup-sessions', {
    target: 'sessions',
    olderThan: 7, // 7 days
  });

  console.log('[ScheduledJobs] Session cleanup queued');
}

/**
 * Run log cleanup
 */
async function runCleanupLogs(): Promise<void> {
  const cleanupQueue = createQueue<CleanupJobData>(QueueName.CLEANUP);

  await cleanupQueue.add('cleanup-logs', {
    target: 'logs',
    olderThan: 30, // 30 days
  });

  console.log('[ScheduledJobs] Log cleanup queued');
}

/**
 * Run temp files cleanup
 */
async function runCleanupTempFiles(): Promise<void> {
  const cleanupQueue = createQueue<CleanupJobData>(QueueName.CLEANUP);

  await cleanupQueue.add('cleanup-temp-files', {
    target: 'temp-files',
    olderThan: 7, // 7 days
  });

  console.log('[ScheduledJobs] Temp files cleanup queued');
}

/**
 * Run integration sync
 */
async function runIntegrationSync(): Promise<void> {
  const integrationQueue = createQueue<IntegrationSyncJobData>(QueueName.INTEGRATION_SYNC);

  // Sync with configured integrations
  const integrations = ['zapier', 'real-estate-portal'];

  for (const provider of integrations) {
    await integrationQueue.add(`sync-${provider}`, {
      provider,
      action: 'sync',
    });
  }

  console.log(`[ScheduledJobs] Queued sync for ${integrations.length} integrations`);
}

/**
 * Run database backup
 */
async function runDatabaseBackup(): Promise<void> {
  const backupQueue = createQueue<BackupJobData>(QueueName.BACKUP);

  await backupQueue.add('database-backup', {
    type: 'full',
    includeFiles: false,
    retention: 30,
  });

  console.log('[ScheduledJobs] Database backup queued');
}

/**
 * Get scheduled jobs status
 */
export function getScheduledJobsStatus(): Array<{
  name: string;
  running: boolean;
}> {
  // Since node-cron doesn't provide names, we'll return a status for each task
  return scheduledTasks.map((task, index) => ({
    name: getJobNameByIndex(index),
    running: task.getStatus() === 'scheduled',
  }));
}

/**
 * Get job name by index
 */
function getJobNameByIndex(index: number): string {
  const names = [
    'Payment Reminders (Daily 9 AM)',
    'Daily Reports (Midnight)',
    'Weekly Reports (Monday 8 AM)',
    'Monthly Reports (1st day 8 AM)',
    'Session Cleanup (Hourly)',
    'Log Cleanup (Every 6 hours)',
    'Integration Sync (Every 6 hours)',
    'Database Backup (Daily 2 AM)',
    'Temp Files Cleanup (Sunday 3 AM)',
  ];

  return names[index] || `Unknown Job ${index}`;
}
