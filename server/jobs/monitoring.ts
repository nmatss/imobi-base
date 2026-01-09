// @ts-nocheck
import { Job } from 'bullmq';
import {
  getAllQueues,
  getAllQueuesHealth,
  getQueue,
  getFailedJobs,
  retryFailedJob,
  cleanQueue,
  QueueName,
} from './queue-manager';
import { getRedisInfo } from '../cache/redis-client';

/**
 * Get overall job statistics across all queues
 */
export async function getOverallStats(): Promise<{
  totalQueues: number;
  totalWaiting: number;
  totalActive: number;
  totalCompleted: number;
  totalFailed: number;
  totalDelayed: number;
  redisStatus: any;
}> {
  const queuesHealth = await getAllQueuesHealth();
  const redisInfo = await getRedisInfo();

  const stats = {
    totalQueues: queuesHealth.length,
    totalWaiting: 0,
    totalActive: 0,
    totalCompleted: 0,
    totalFailed: 0,
    totalDelayed: 0,
    redisStatus: redisInfo,
  };

  for (const queue of queuesHealth) {
    stats.totalWaiting += queue.waiting;
    stats.totalActive += queue.active;
    stats.totalCompleted += queue.completed;
    stats.totalFailed += queue.failed;
    stats.totalDelayed += queue.delayed;
  }

  return stats;
}

/**
 * Get detailed statistics for a specific queue
 */
export async function getQueueStats(queueName: QueueName): Promise<{
  name: string;
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  };
  jobs: {
    waiting: Job[];
    active: Job[];
    failed: Job[];
  };
}> {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  const [waitingJobs, activeJobs, failedJobs] = await Promise.all([
    queue.getWaiting(0, 9), // Get first 10
    queue.getActive(0, 9),
    queue.getFailed(0, 9),
  ]);

  return {
    name: queueName,
    counts: {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    },
    jobs: {
      waiting: waitingJobs,
      active: activeJobs,
      failed: failedJobs,
    },
  };
}

/**
 * Get all failed jobs across all queues
 */
export async function getAllFailedJobs(limit: number = 100): Promise<Array<{
  queue: string;
  job: Job;
  error?: string;
}>> {
  const queues = getAllQueues();
  const failedJobs: Array<{ queue: string; job: Job; error?: string }> = [];

  for (const [queueName, queue] of queues) {
    const failed = await queue.getFailed(0, limit - 1);

    for (const job of failed) {
      failedJobs.push({
        queue: queueName,
        job,
        error: job.failedReason,
      });
    }
  }

  // Sort by timestamp (most recent first)
  failedJobs.sort((a, b) => {
    const timeA = a.job.timestamp || 0;
    const timeB = b.job.timestamp || 0;
    return timeB - timeA;
  });

  return failedJobs.slice(0, limit);
}

/**
 * Retry all failed jobs in a queue
 */
export async function retryAllFailedJobs(queueName: QueueName): Promise<number> {
  const failedJobs = await getFailedJobs(queueName);

  let retried = 0;
  for (const job of failedJobs) {
    try {
      await retryFailedJob(queueName, job.id!);
      retried++;
    } catch (error) {
      console.error(`[Monitoring] Failed to retry job ${job.id}:`, error);
    }
  }

  console.log(`[Monitoring] Retried ${retried} failed jobs in queue '${queueName}'`);
  return retried;
}

/**
 * Clean completed jobs from a queue
 */
export async function cleanCompletedJobs(
  queueName: QueueName,
  olderThanHours: number = 24
): Promise<number> {
  const grace = olderThanHours * 60 * 60 * 1000; // Convert to milliseconds
  const cleaned = await cleanQueue(queueName, grace, 'completed');

  console.log(`[Monitoring] Cleaned ${cleaned.length} completed jobs from queue '${queueName}'`);
  return cleaned.length;
}

/**
 * Clean failed jobs from a queue
 */
export async function cleanFailedJobs(
  queueName: QueueName,
  olderThanDays: number = 7
): Promise<number> {
  const grace = olderThanDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
  const cleaned = await cleanQueue(queueName, grace, 'failed');

  console.log(`[Monitoring] Cleaned ${cleaned.length} failed jobs from queue '${queueName}'`);
  return cleaned.length;
}

/**
 * Get job details by ID
 */
export async function getJobDetails(
  queueName: QueueName,
  jobId: string
): Promise<Job | null> {
  const queue = getQueue(queueName);
  return queue.getJob(jobId);
}

/**
 * Get job logs (recent activity)
 */
export async function getJobLogs(
  queueName: QueueName,
  limit: number = 50
): Promise<Array<{
  jobId: string;
  name: string;
  status: 'completed' | 'failed' | 'active';
  timestamp: number;
  data?: any;
  error?: string;
}>> {
  const queue = getQueue(queueName);

  const [completed, failed, active] = await Promise.all([
    queue.getCompleted(0, Math.floor(limit / 2) - 1),
    queue.getFailed(0, Math.floor(limit / 4) - 1),
    queue.getActive(0, Math.floor(limit / 4) - 1),
  ]);

  const logs: Array<{
    jobId: string;
    name: string;
    status: 'completed' | 'failed' | 'active';
    timestamp: number;
    data?: any;
    error?: string;
  }> = [];

  for (const job of completed) {
    logs.push({
      jobId: job.id!,
      name: job.name,
      status: 'completed',
      timestamp: job.finishedOn || job.timestamp || 0,
      data: job.data,
    });
  }

  for (const job of failed) {
    logs.push({
      jobId: job.id!,
      name: job.name,
      status: 'failed',
      timestamp: job.finishedOn || job.timestamp || 0,
      data: job.data,
      error: job.failedReason,
    });
  }

  for (const job of active) {
    logs.push({
      jobId: job.id!,
      name: job.name,
      status: 'active',
      timestamp: job.processedOn || job.timestamp || 0,
      data: job.data,
    });
  }

  // Sort by timestamp (most recent first)
  logs.sort((a, b) => b.timestamp - a.timestamp);

  return logs.slice(0, limit);
}

/**
 * Get performance metrics for a queue
 */
export async function getQueuePerformance(queueName: QueueName): Promise<{
  avgProcessingTime: number;
  successRate: number;
  throughput: number;
  recentJobs: number;
}> {
  const queue = getQueue(queueName);

  const [completed, failed] = await Promise.all([
    queue.getCompleted(0, 99), // Last 100 completed jobs
    queue.getFailed(0, 99), // Last 100 failed jobs
  ]);

  // Calculate average processing time
  let totalProcessingTime = 0;
  let jobsWithProcessingTime = 0;

  for (const job of completed) {
    if (job.finishedOn && job.processedOn) {
      totalProcessingTime += job.finishedOn - job.processedOn;
      jobsWithProcessingTime++;
    }
  }

  const avgProcessingTime = jobsWithProcessingTime > 0
    ? Math.round(totalProcessingTime / jobsWithProcessingTime)
    : 0;

  // Calculate success rate
  const totalJobs = completed.length + failed.length;
  const successRate = totalJobs > 0
    ? Math.round((completed.length / totalJobs) * 100)
    : 0;

  // Calculate throughput (jobs per minute)
  const now = Date.now();
  const recentJobs = [...completed, ...failed].filter((job) => {
    const timestamp = job.finishedOn || job.timestamp || 0;
    return now - timestamp < 60 * 60 * 1000; // Last hour
  });

  const throughput = Math.round((recentJobs.length / 60) * 100) / 100;

  return {
    avgProcessingTime,
    successRate,
    throughput,
    recentJobs: recentJobs.length,
  };
}

/**
 * Get health check for all queues
 */
export interface QueueHealthCheck {
  healthy: boolean;
  queues: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
  }>;
  redis: {
    status: 'healthy' | 'unhealthy';
    latency?: number;
  };
}

export async function performHealthCheck(): Promise<QueueHealthCheck> {
  const queuesHealth = await getAllQueuesHealth();
  const redisInfo = await getRedisInfo();

  const result: QueueHealthCheck = {
    healthy: true,
    queues: [],
    redis: {
      status: redisInfo.connected ? 'healthy' : 'unhealthy',
    },
  };

  for (const queue of queuesHealth) {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check for too many failed jobs
    if (queue.failed > 50) {
      issues.push(`High number of failed jobs: ${queue.failed}`);
      status = 'warning';
    }

    if (queue.failed > 200) {
      issues.push(`Critical: ${queue.failed} failed jobs`);
      status = 'critical';
      result.healthy = false;
    }

    // Check if queue is paused
    if (queue.paused) {
      issues.push('Queue is paused');
      status = 'warning';
    }

    // Check for stalled jobs (high waiting count with no active)
    if (queue.waiting > 100 && queue.active === 0) {
      issues.push('Queue may be stalled');
      status = 'warning';
    }

    result.queues.push({
      name: queue.name,
      status,
      issues,
    });

    if (status === 'critical') {
      result.healthy = false;
    }
  }

  if (!redisInfo.connected) {
    result.healthy = false;
  }

  return result;
}
