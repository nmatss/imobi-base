/**
 * SMS Scheduler - Cron jobs and background tasks
 *
 * This file contains scheduled tasks for:
 * - Processing SMS queue
 * - Sending automated reminders
 * - Cleaning up old data
 * - Checking overdue payments
 */

import { getSMSQueue } from './sms-queue';
import { getTwoFactorSMS } from './twofa';
import { getSMSAnalytics } from './analytics';
import {
  scheduleVisitReminders,
  schedulePaymentReminders,
  checkOverduePayments,
} from './integration-helpers';

let queueProcessorInterval: NodeJS.Timeout | null = null;
let dailyTasksInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Start the SMS queue processor
 * Processes queued messages every 1 minute
 */
export function startQueueProcessor() {
  if (queueProcessorInterval) {
    console.log('SMS queue processor already running');
    return;
  }

  const smsQueue = getSMSQueue();

  // Run immediately on start
  smsQueue.processQueue().catch(error => {
    console.error('Error in initial queue processing:', error);
  });

  // Then run every minute
  queueProcessorInterval = setInterval(async () => {
    try {
      await smsQueue.processQueue();
    } catch (error) {
      console.error('Error processing SMS queue:', error);
    }
  }, 60000); // 1 minute

  console.log('SMS queue processor started (runs every 1 minute)');
}

/**
 * Stop the SMS queue processor
 */
export function stopQueueProcessor() {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
    console.log('SMS queue processor stopped');
  }
}

/**
 * Start daily scheduled tasks
 * Runs at 8 AM every day
 */
export function startDailyTasks() {
  if (dailyTasksInterval) {
    console.log('Daily SMS tasks already running');
    return;
  }

  const runDailyTasks = async () => {
    const now = new Date();
    const hours = now.getHours();

    // Run at 8 AM
    if (hours === 8) {
      console.log('Running daily SMS tasks...');

      try {
        // Send visit reminders for tomorrow's appointments
        await scheduleVisitReminders();

        // Send payment reminders (3 days before due)
        await schedulePaymentReminders();

        // Check and notify overdue payments
        await checkOverduePayments();

        console.log('Daily SMS tasks completed');
      } catch (error) {
        console.error('Error running daily SMS tasks:', error);
      }
    }
  };

  // Check every hour
  dailyTasksInterval = setInterval(runDailyTasks, 3600000); // 1 hour

  console.log('Daily SMS tasks scheduler started (runs at 8 AM daily)');
}

/**
 * Stop daily scheduled tasks
 */
export function stopDailyTasks() {
  if (dailyTasksInterval) {
    clearInterval(dailyTasksInterval);
    dailyTasksInterval = null;
    console.log('Daily SMS tasks stopped');
  }
}

/**
 * Start cleanup tasks
 * Runs weekly on Sunday at midnight
 */
export function startCleanupTasks() {
  if (cleanupInterval) {
    console.log('Cleanup tasks already running');
    return;
  }

  const runCleanup = async () => {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();

    // Run on Sunday (0) at midnight (0)
    if (day === 0 && hours === 0) {
      console.log('Running SMS cleanup tasks...');

      try {
        const analytics = getSMSAnalytics();
        const twofa = getTwoFactorSMS();
        const smsQueue = getSMSQueue();

        // Clean up old SMS logs (90 days)
        const logsDeleted = await analytics.cleanupOldLogs(90);
        console.log(`Deleted ${logsDeleted} old SMS logs`);

        // Clean up old queue entries (30 days)
        const queueDeleted = await smsQueue.cleanup(30);
        console.log(`Deleted ${queueDeleted} old queue entries`);

        // Clean up expired verification codes
        const codesDeleted = await twofa.cleanup();
        console.log(`Deleted ${codesDeleted} expired verification codes`);

        console.log('SMS cleanup tasks completed');
      } catch (error) {
        console.error('Error running SMS cleanup tasks:', error);
      }
    }
  };

  // Check every hour
  cleanupInterval = setInterval(runCleanup, 3600000); // 1 hour

  console.log('Cleanup tasks scheduler started (runs Sunday at midnight)');
}

/**
 * Stop cleanup tasks
 */
export function stopCleanupTasks() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    console.log('Cleanup tasks stopped');
  }
}

/**
 * Start all SMS schedulers
 */
export function startAllSchedulers() {
  console.log('Starting all SMS schedulers...');
  startQueueProcessor();
  startDailyTasks();
  startCleanupTasks();
}

/**
 * Stop all SMS schedulers
 */
export function stopAllSchedulers() {
  console.log('Stopping all SMS schedulers...');
  stopQueueProcessor();
  stopDailyTasks();
  stopCleanupTasks();
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    queueProcessor: !!queueProcessorInterval,
    dailyTasks: !!dailyTasksInterval,
    cleanupTasks: !!cleanupInterval,
  };
}

// Auto-start schedulers if not in test environment
if (process.env.NODE_ENV !== 'test') {
  startAllSchedulers();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, stopping SMS schedulers...');
    stopAllSchedulers();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, stopping SMS schedulers...');
    stopAllSchedulers();
  });
}

export default {
  startQueueProcessor,
  stopQueueProcessor,
  startDailyTasks,
  stopDailyTasks,
  startCleanupTasks,
  stopCleanupTasks,
  startAllSchedulers,
  stopAllSchedulers,
  getSchedulerStatus,
};
