// @ts-nocheck
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';

export interface EmailJobData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  templateName?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
  }>;
  replyTo?: string;
  headers?: Record<string, string>;
  tenantId?: string;
  priority?: number;
  retries?: number;
}

export interface EmailQueueConfig {
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class EmailQueue {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private connection: Redis | null = null;
  private sendEmailFn?: (data: EmailJobData) => Promise<{ success: boolean; error?: string }>;

  constructor(private config: EmailQueueConfig = {}) {}

  async initialize(sendEmailFn: (data: EmailJobData) => Promise<{ success: boolean; error?: string }>) {
    this.sendEmailFn = sendEmailFn;

    // Create Redis connection
    if (this.config.redisUrl) {
      this.connection = new Redis(this.config.redisUrl, {
        maxRetriesPerRequest: null,
      });
    } else if (this.config.redisHost) {
      this.connection = new Redis({
        host: this.config.redisHost,
        port: this.config.redisPort || 6379,
        password: this.config.redisPassword,
        maxRetriesPerRequest: null,
      });
    } else {
      // Use in-memory queue (not recommended for production)
      console.warn('No Redis configuration provided. Email queue will not persist across restarts.');
      return;
    }

    // Create queue
    this.queue = new Queue('email-queue', {
      connection: this.connection,
      defaultJobOptions: {
        attempts: this.config.maxRetries || 3,
        backoff: {
          type: 'exponential',
          delay: this.config.retryDelay || 5000,
        },
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000,
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
      },
    });

    // Create worker
    this.worker = new Worker(
      'email-queue',
      async (job: Job<EmailJobData>) => {
        if (!this.sendEmailFn) {
          throw new Error('Send email function not configured');
        }

        const result = await this.sendEmailFn(job.data);

        if (!result.success) {
          throw new Error(result.error || 'Failed to send email');
        }

        return result;
      },
      {
        connection: this.connection,
        concurrency: 5, // Process 5 emails concurrently
      }
    );

    // Event handlers
    this.worker.on('completed', (job) => {
      console.log(`Email job ${job.id} completed successfully`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Email job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('Email worker error:', err);
    });

    console.log('Email queue initialized successfully');
  }

  async addEmail(data: EmailJobData, options?: { priority?: number; delay?: number }): Promise<string | null> {
    if (!this.queue) {
      // If queue is not initialized, send email immediately
      if (this.sendEmailFn) {
        await this.sendEmailFn(data);
      }
      return null;
    }

    const job = await this.queue.add('send-email', data, {
      priority: options?.priority || data.priority || 0,
      delay: options?.delay,
    });

    return job.id || undefined;
  }

  async addBulkEmails(emails: EmailJobData[]): Promise<void> {
    if (!this.queue) {
      // If queue is not initialized, send emails immediately
      if (this.sendEmailFn) {
        await Promise.all(emails.map(email => this.sendEmailFn!(email)));
      }
      return;
    }

    await this.queue.addBulk(
      emails.map((email, index) => ({
        name: 'send-email',
        data: email,
        opts: {
          priority: email.priority || 0,
        },
      }))
    );
  }

  async getJobStatus(jobId: string): Promise<any> {
    if (!this.queue) {
      return null;
    }

    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      id: job.id,
      state,
      data: job.data,
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  }

  async getQueueStats(): Promise<any> {
    if (!this.queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    if (this.connection) {
      await this.connection.quit();
    }
  }

  isInitialized(): boolean {
    return this.queue !== null && this.worker !== null;
  }
}

// Singleton instance
let emailQueueInstance: EmailQueue | null = null;

export function getEmailQueue(config?: EmailQueueConfig): EmailQueue {
  if (!emailQueueInstance) {
    emailQueueInstance = new EmailQueue(config);
  }
  return emailQueueInstance;
}
