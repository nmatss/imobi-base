import { Queue, Worker, QueueEvents, Job, QueueOptions, WorkerOptions } from 'bullmq';
import { getRedisClient } from '../cache/redis-client';
import * as Sentry from '@sentry/node';

// Queue names
export enum QueueName {
  EMAIL = 'email',
  INVOICE = 'invoice',
  REPORT = 'report',
  PAYMENT_REMINDER = 'payment-reminder',
  BACKUP = 'backup',
  CLEANUP = 'cleanup',
  NOTIFICATION = 'notification',
  EXPORT = 'export',
  INTEGRATION_SYNC = 'integration-sync',
}

// Job data types
export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  data?: Record<string, any>;
  from?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
  }>;
}

export interface InvoiceJobData {
  invoiceId: number;
  userId: number;
  sendEmail?: boolean;
}

export interface ReportJobData {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  userId?: number;
  startDate?: string;
  endDate?: string;
  format: 'pdf' | 'excel' | 'csv';
  email?: string;
}

export interface PaymentReminderJobData {
  contractId: number;
  type: 'overdue' | 'upcoming' | 'final-notice';
  daysOverdue?: number;
}

export interface BackupJobData {
  type: 'full' | 'incremental';
  includeFiles?: boolean;
  retention?: number;
}

export interface CleanupJobData {
  target: 'sessions' | 'logs' | 'temp-files' | 'old-exports';
  olderThan?: number; // days
}

export interface NotificationJobData {
  userId: number | number[];
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  actionUrl?: string;
  data?: Record<string, any>;
}

export interface ExportJobData {
  userId: number;
  type: 'user-data' | 'properties' | 'contracts' | 'all';
  format: 'json' | 'csv' | 'zip';
  email: string;
}

export interface IntegrationSyncJobData {
  provider: string;
  action: 'sync' | 'push' | 'pull';
  entityType?: 'property' | 'lead' | 'contract';
  entityId?: number;
}

// Queue registry
const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();
const queueEvents = new Map<string, QueueEvents>();

// Default queue options
const defaultQueueOptions: QueueOptions = {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Default worker options
const defaultWorkerOptions: Omit<WorkerOptions, 'connection'> = {
  concurrency: 5,
  lockDuration: 30000, // 30 seconds
  maxStalledCount: 3,
};

/**
 * Initialize a queue
 */
export function createQueue<T = any>(
  name: QueueName,
  options?: Partial<QueueOptions>
): Queue<T> {
  if (queues.has(name)) {
    return queues.get(name) as Queue<T>;
  }

  const queue = new Queue<T>(name, {
    ...defaultQueueOptions,
    ...options,
  });

  queues.set(name, queue);

  // Set up queue events for monitoring
  const events = new QueueEvents(name, {
    connection: getRedisClient(),
  });

  events.on('completed', ({ jobId }) => {
    console.log(`[Queue:${name}] Job ${jobId} completed`);
  });

  events.on('failed', ({ jobId, failedReason }) => {
    console.error(`[Queue:${name}] Job ${jobId} failed:`, failedReason);
    Sentry.captureMessage(`Job failed in queue ${name}`, {
      level: 'error',
      extra: { jobId, failedReason, queue: name },
    });
  });

  events.on('stalled', ({ jobId }) => {
    console.warn(`[Queue:${name}] Job ${jobId} stalled`);
    Sentry.captureMessage(`Job stalled in queue ${name}`, {
      level: 'warning',
      extra: { jobId, queue: name },
    });
  });

  queueEvents.set(name, events);

  console.log(`[QueueManager] Queue '${name}' initialized`);
  return queue;
}

/**
 * Register a worker for a queue
 */
export function registerWorker<T = any>(
  queueName: QueueName,
  processor: (job: Job<T>) => Promise<any>,
  options?: Partial<WorkerOptions>
): Worker<T> {
  if (workers.has(queueName)) {
    console.warn(`[QueueManager] Worker for '${queueName}' already exists`);
    return workers.get(queueName) as Worker<T>;
  }

  const worker = new Worker<T>(
    queueName,
    async (job: Job<T>) => {
      console.log(`[Worker:${queueName}] Processing job ${job.id}`, job.data);

      try {
        const result = await processor(job);
        console.log(`[Worker:${queueName}] Job ${job.id} completed successfully`);
        return result;
      } catch (error) {
        console.error(`[Worker:${queueName}] Job ${job.id} failed:`, error);

        Sentry.captureException(error, {
          tags: {
            component: 'queue-worker',
            queue: queueName,
            jobId: job.id || 'unknown',
          },
          extra: {
            jobData: job.data,
            attemptsMade: job.attemptsMade,
          },
        });

        throw error;
      }
    },
    {
      ...defaultWorkerOptions,
      ...options,
      connection: getRedisClient(),
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`[Worker:${queueName}] Job ${job.id} completed`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[Worker:${queueName}] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err: Error) => {
    console.error(`[Worker:${queueName}] Worker error:`, err);
    Sentry.captureException(err, {
      tags: { component: 'queue-worker', queue: queueName },
    });
  });

  workers.set(queueName, worker);
  console.log(`[QueueManager] Worker for '${queueName}' registered`);

  return worker;
}

/**
 * Get a queue by name
 */
export function getQueue<T = any>(name: QueueName): Queue<T> {
  const queue = queues.get(name);
  if (!queue) {
    throw new Error(`Queue '${name}' not found. Initialize it first.`);
  }
  return queue as Queue<T>;
}

/**
 * Get all queues
 */
export function getAllQueues(): Map<string, Queue> {
  return new Map(queues);
}

/**
 * Get queue health status
 */
export async function getQueueHealth(name: QueueName): Promise<{
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}> {
  const queue = getQueue(name);

  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused: isPaused,
  };
}

/**
 * Get health status for all queues
 */
export async function getAllQueuesHealth(): Promise<Array<{
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}>> {
  const healthPromises = Array.from(queues.keys()).map((name) =>
    getQueueHealth(name as QueueName)
  );

  return Promise.all(healthPromises);
}

/**
 * Pause a queue
 */
export async function pauseQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name);
  await queue.pause();
  console.log(`[QueueManager] Queue '${name}' paused`);
}

/**
 * Resume a queue
 */
export async function resumeQueue(name: QueueName): Promise<void> {
  const queue = getQueue(name);
  await queue.resume();
  console.log(`[QueueManager] Queue '${name}' resumed`);
}

/**
 * Clean old jobs from a queue
 */
export async function cleanQueue(
  name: QueueName,
  grace: number = 24 * 3600 * 1000, // 24 hours in ms
  status: 'completed' | 'failed' = 'completed'
): Promise<string[]> {
  const queue = getQueue(name);
  const jobs = await queue.clean(grace, 1000, status);
  console.log(`[QueueManager] Cleaned ${jobs.length} ${status} jobs from '${name}'`);
  return jobs;
}

/**
 * Gracefully close all queues and workers
 */
export async function closeAll(): Promise<void> {
  console.log('[QueueManager] Closing all queues and workers...');

  // Close all workers first
  const workerClosePromises = Array.from(workers.values()).map((worker) =>
    worker.close()
  );
  await Promise.all(workerClosePromises);
  workers.clear();

  // Close all queue events
  const eventsClosePromises = Array.from(queueEvents.values()).map((events) =>
    events.close()
  );
  await Promise.all(eventsClosePromises);
  queueEvents.clear();

  // Close all queues
  const queueClosePromises = Array.from(queues.values()).map((queue) =>
    queue.close()
  );
  await Promise.all(queueClosePromises);
  queues.clear();

  console.log('[QueueManager] All queues and workers closed');
}

/**
 * Retry a failed job
 */
export async function retryFailedJob(queueName: QueueName, jobId: string): Promise<void> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queueName}`);
  }

  await job.retry();
  console.log(`[QueueManager] Job ${jobId} in queue '${queueName}' retried`);
}

/**
 * Get failed jobs from a queue
 */
export async function getFailedJobs(queueName: QueueName, limit: number = 100): Promise<Job[]> {
  const queue = getQueue(queueName);
  return queue.getFailed(0, limit - 1);
}

/**
 * Remove a job from a queue
 */
export async function removeJob(queueName: QueueName, jobId: string): Promise<void> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(jobId);

  if (!job) {
    throw new Error(`Job ${jobId} not found in queue ${queueName}`);
  }

  await job.remove();
  console.log(`[QueueManager] Job ${jobId} removed from queue '${queueName}'`);
}
