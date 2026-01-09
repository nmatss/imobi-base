import { registerWorker, QueueName } from './queue-manager';
import { processEmail } from './processors/email-processor';
import { processInvoice } from './processors/invoice-processor';
import { processReport } from './processors/report-processor';
import { processPaymentReminder } from './processors/payment-reminder-processor';
import { processBackup } from './processors/backup-processor';
import { processCleanup } from './processors/cleanup-processor';
import { processNotification } from './processors/notification-processor';
import { processExport } from './processors/export-processor';
import { processIntegrationSync } from './processors/integration-sync-processor';
import { initEmailQueue } from './email-queue';
import { initInvoiceQueue } from './invoice-queue';
import { initReportQueue } from './report-queue';
import { initPaymentQueue } from './payment-queue';
import { initializeScheduledJobs, stopScheduledJobs } from './scheduled-jobs';
import { closeAll } from './queue-manager';
import * as Sentry from '@sentry/node';

/**
 * Initialize all job queues and workers
 */
export async function initializeJobs(): Promise<void> {
  console.log('[Jobs] Initializing job system...');

  try {
    // Initialize all queues
    initEmailQueue();
    initInvoiceQueue();
    initReportQueue();
    initPaymentQueue();

    console.log('[Jobs] All queues initialized');

    // Register all workers with their processors
    registerWorker(QueueName.EMAIL, processEmail, {
      concurrency: 10, // Can send multiple emails concurrently
    });

    registerWorker(QueueName.INVOICE, processInvoice, {
      concurrency: 5,
    });

    registerWorker(QueueName.REPORT, processReport, {
      concurrency: 3, // Reports are resource-intensive
    });

    registerWorker(QueueName.PAYMENT_REMINDER, processPaymentReminder, {
      concurrency: 5,
    });

    registerWorker(QueueName.BACKUP, processBackup, {
      concurrency: 1, // Only one backup at a time
    });

    registerWorker(QueueName.CLEANUP, processCleanup, {
      concurrency: 2,
    });

    registerWorker(QueueName.NOTIFICATION, processNotification, {
      concurrency: 10,
    });

    registerWorker(QueueName.EXPORT, processExport, {
      concurrency: 3,
    });

    registerWorker(QueueName.INTEGRATION_SYNC, processIntegrationSync, {
      concurrency: 2,
    });

    console.log('[Jobs] All workers registered');

    // Initialize scheduled jobs
    initializeScheduledJobs();

    console.log('[Jobs] Job system initialized successfully');

    Sentry.addBreadcrumb({
      category: 'jobs',
      message: 'Job system initialized',
      level: 'info',
    });
  } catch (error) {
    console.error('[Jobs] Failed to initialize job system:', error);

    Sentry.captureException(error, {
      tags: { component: 'jobs', action: 'initialize' },
    });

    throw error;
  }
}

/**
 * Gracefully shutdown the job system
 */
export async function shutdownJobs(): Promise<void> {
  console.log('[Jobs] Shutting down job system...');

  try {
    // Stop scheduled jobs first
    stopScheduledJobs();

    // Close all queues and workers
    await closeAll();

    console.log('[Jobs] Job system shut down successfully');

    Sentry.addBreadcrumb({
      category: 'jobs',
      message: 'Job system shut down',
      level: 'info',
    });
  } catch (error) {
    console.error('[Jobs] Error during job system shutdown:', error);

    Sentry.captureException(error, {
      tags: { component: 'jobs', action: 'shutdown' },
    });

    throw error;
  }
}

// Export all queue functions for easy access
export * from './email-queue';
export * from './invoice-queue';
export * from './report-queue';
export * from './payment-queue';
export * from './queue-manager';
export * from './monitoring';
