import { createQueue, QueueName, ReportJobData } from './queue-manager';
import { Queue } from 'bullmq';

let reportQueue: Queue<ReportJobData>;

/**
 * Initialize report queue
 */
export function initReportQueue(): Queue<ReportJobData> {
  if (!reportQueue) {
    reportQueue = createQueue<ReportJobData>(QueueName.REPORT);
  }
  return reportQueue;
}

/**
 * Queue a report generation job
 */
export async function queueReport(data: ReportJobData, options?: {
  priority?: number;
  delay?: number;
}): Promise<string> {
  const queue = initReportQueue();

  const job = await queue.add('generate-report', data, {
    priority: options?.priority || 3,
    delay: options?.delay,
  });

  console.log(`[ReportQueue] Report queued with job ID: ${job.id}`);
  return job.id!;
}

/**
 * Queue daily report generation
 */
export async function queueDailyReport(
  userId?: number,
  email?: string
): Promise<string> {
  return queueReport({
    type: 'daily',
    userId,
    format: 'pdf',
    email,
  }, {
    priority: 4,
  });
}

/**
 * Queue weekly report generation
 */
export async function queueWeeklyReport(
  userId?: number,
  email?: string
): Promise<string> {
  return queueReport({
    type: 'weekly',
    userId,
    format: 'pdf',
    email,
  }, {
    priority: 4,
  });
}

/**
 * Queue monthly report generation
 */
export async function queueMonthlyReport(
  userId?: number,
  email?: string
): Promise<string> {
  return queueReport({
    type: 'monthly',
    userId,
    format: 'pdf',
    email,
  }, {
    priority: 3,
  });
}

/**
 * Queue custom report generation
 */
export async function queueCustomReport(
  startDate: string,
  endDate: string,
  format: 'pdf' | 'excel' | 'csv',
  email: string,
  userId?: number
): Promise<string> {
  return queueReport({
    type: 'custom',
    userId,
    startDate,
    endDate,
    format,
    email,
  }, {
    priority: 2, // Higher priority for user-requested reports
  });
}

/**
 * Queue reports for all users (admin function)
 */
export async function queueBatchReports(
  type: 'daily' | 'weekly' | 'monthly',
  userEmails: Array<{ userId: number; email: string }>
): Promise<string[]> {
  const jobIds: string[] = [];

  for (const user of userEmails) {
    const jobId = await queueReport({
      type,
      userId: user.userId,
      format: 'pdf',
      email: user.email,
    }, {
      priority: 5,
      delay: Math.random() * 300000, // Spread over 5 minutes
    });

    jobIds.push(jobId);
  }

  console.log(`[ReportQueue] Queued ${jobIds.length} batch reports`);
  return jobIds;
}
