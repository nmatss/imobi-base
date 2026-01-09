import { getTwilioService } from './twilio-service';
import { renderSMSTemplate, calculateSMSSegments, type SMSTemplateContext } from './templates';
import { db } from '../../db';
// NOTE: smsLogs and smsQueue tables not yet implemented in schema
// import { smsLogs, smsQueue as smsQueueTable } from '../../../shared/schema';
import { eq, and, lte, or, isNull } from 'drizzle-orm';

// Placeholder types until schema is updated
const smsLogs: any = null;
const smsQueueTable: any = null;

interface QueuedSMS {
  id?: number;
  to: string;
  body: string;
  templateName?: string;
  templateContext?: Record<string, any>;
  scheduledFor?: Date;
  priority: 'high' | 'normal' | 'low';
  maxRetries: number;
  retryCount: number;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
  metadata?: Record<string, any>;
}

interface SMSQueueOptions {
  rateLimit?: number; // Messages per minute
  batchSize?: number; // Messages to process per batch
  retryDelay?: number; // Delay in ms between retries
  maxRetries?: number; // Maximum retry attempts
}

interface BulkSMSJob {
  recipients: string[];
  template: string;
  context: SMSTemplateContext | ((recipient: string) => SMSTemplateContext);
  scheduledFor?: Date;
  priority?: 'high' | 'normal' | 'low';
}

export class SMSQueue {
  private twilioService = getTwilioService();
  private options: Required<SMSQueueOptions>;
  private processing = false;
  private rateLimitTokens: number;
  private lastTokenRefill: number;

  constructor(options: SMSQueueOptions = {}) {
    this.options = {
      rateLimit: options.rateLimit || 60, // 60 msgs/minute default
      batchSize: options.batchSize || 10,
      retryDelay: options.retryDelay || 5000, // 5 seconds
      maxRetries: options.maxRetries || 3,
    };

    // Initialize rate limiting
    this.rateLimitTokens = this.options.rateLimit;
    this.lastTokenRefill = Date.now();
  }

  /**
   * Add a single SMS to the queue
   */
  async enqueue(sms: Omit<QueuedSMS, 'id' | 'retryCount' | 'status'>): Promise<number> {
    try {
      const segments = calculateSMSSegments(sms.body);
      const estimatedCost = segments * 0.0075; // Estimate cost

      const [result] = await db.insert(smsQueueTable).values({
        to: sms.to,
        body: sms.body,
        templateName: sms.templateName,
        templateContext: sms.templateContext,
        scheduledFor: sms.scheduledFor || new Date(),
        priority: sms.priority || 'normal',
        maxRetries: sms.maxRetries || this.options.maxRetries,
        retryCount: 0,
        status: 'pending',
        metadata: sms.metadata,
        segments,
        estimatedCost,
      }).returning({ id: smsQueueTable.id });

      console.log(`SMS queued for ${sms.to} with ID: ${result.id}`);
      return result.id;
    } catch (error: any) {
      console.error('Error enqueueing SMS:', error);
      throw new Error(`Failed to queue SMS: ${error.message}`);
    }
  }

  /**
   * Add multiple SMS messages to the queue (bulk)
   */
  async enqueueBulk(job: BulkSMSJob): Promise<number[]> {
    const ids: number[] = [];

    for (const recipient of job.recipients) {
      const context =
        typeof job.context === 'function'
          ? job.context(recipient)
          : job.context;

      const body = renderSMSTemplate(job.template, context);

      const id = await this.enqueue({
        to: recipient,
        body,
        templateName: job.template,
        templateContext: context,
        scheduledFor: job.scheduledFor,
        priority: job.priority || 'normal',
        maxRetries: this.options.maxRetries,
      });

      ids.push(id);
    }

    console.log(`Bulk SMS queued: ${ids.length} messages`);
    return ids;
  }

  /**
   * Process the queue (should be called periodically)
   */
  async processQueue(): Promise<void> {
    if (this.processing) {
      return; // Already processing
    }

    this.processing = true;

    try {
      // Refill rate limit tokens
      this.refillRateLimitTokens();

      // Get pending messages, prioritized and scheduled
      const pendingMessages = await db
        .select()
        .from(smsQueueTable)
        .where(
          and(
            or(
              eq(smsQueueTable.status, 'pending'),
              eq(smsQueueTable.status, 'processing')
            ),
            lte(smsQueueTable.scheduledFor, new Date())
          )
        )
        .orderBy(smsQueueTable.priority, smsQueueTable.scheduledFor)
        .limit(this.options.batchSize);

      console.log(`Processing ${pendingMessages.length} pending SMS messages`);

      for (const message of pendingMessages) {
        // Check rate limit
        if (this.rateLimitTokens <= 0) {
          console.log('Rate limit reached, pausing queue processing');
          break;
        }

        await this.processMessage(message);
        this.rateLimitTokens--;
      }
    } catch (error) {
      console.error('Error processing SMS queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(message: any): Promise<void> {
    try {
      // Update status to processing
      await db
        .update(smsQueueTable)
        .set({ status: 'processing' })
        .where(eq(smsQueueTable.id, message.id));

      // Send the SMS
      const result = await this.twilioService.sendSMS({
        to: message.to,
        body: message.body,
        statusCallback: process.env.TWILIO_STATUS_CALLBACK_URL,
      });

      // Log the sent message
      await db.insert(smsLogs).values({
        queueId: message.id,
        to: message.to,
        from: result.from,
        body: message.body,
        status: result.status,
        twilioSid: result.sid,
        segments: message.segments,
        cost: parseFloat(result.price || '0'),
        direction: 'outbound',
        templateName: message.templateName,
        sentAt: new Date(),
        metadata: message.metadata,
      });

      // Update queue status to sent
      await db
        .update(smsQueueTable)
        .set({
          status: 'sent',
          sentAt: new Date(),
          twilioSid: result.sid,
        })
        .where(eq(smsQueueTable.id, message.id));

      console.log(`SMS sent successfully: ${message.id} -> ${message.to}`);
    } catch (error: any) {
      console.error(`Error sending SMS ${message.id}:`, error);

      // Handle retry logic
      const newRetryCount = message.retryCount + 1;

      if (newRetryCount < message.maxRetries) {
        // Retry with exponential backoff
        const nextRetryAt = new Date(
          Date.now() + this.options.retryDelay * Math.pow(2, newRetryCount)
        );

        await db
          .update(smsQueueTable)
          .set({
            status: 'pending',
            retryCount: newRetryCount,
            scheduledFor: nextRetryAt,
            lastError: error.message,
          })
          .where(eq(smsQueueTable.id, message.id));

        console.log(
          `SMS ${message.id} will retry (${newRetryCount}/${message.maxRetries}) at ${nextRetryAt}`
        );
      } else {
        // Max retries exceeded, mark as failed
        await db
          .update(smsQueueTable)
          .set({
            status: 'failed',
            lastError: error.message,
          })
          .where(eq(smsQueueTable.id, message.id));

        // Log the failure
        await db.insert(smsLogs).values({
          queueId: message.id,
          to: message.to,
          from: process.env.TWILIO_PHONE_NUMBER || '',
          body: message.body,
          status: 'failed',
          segments: message.segments,
          cost: 0,
          direction: 'outbound',
          templateName: message.templateName,
          errorCode: error.code,
          errorMessage: error.message,
          metadata: message.metadata,
        });

        console.log(`SMS ${message.id} failed after ${message.maxRetries} retries`);
      }
    }
  }

  /**
   * Refill rate limit tokens (token bucket algorithm)
   */
  private refillRateLimitTokens(): void {
    const now = Date.now();
    const timePassed = now - this.lastTokenRefill;
    const tokensToAdd = Math.floor(
      (timePassed / 60000) * this.options.rateLimit
    );

    if (tokensToAdd > 0) {
      this.rateLimitTokens = Math.min(
        this.rateLimitTokens + tokensToAdd,
        this.options.rateLimit
      );
      this.lastTokenRefill = now;
    }
  }

  /**
   * Cancel a queued message
   */
  async cancel(messageId: number): Promise<boolean> {
    try {
      const [result] = await db
        .update(smsQueueTable)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(smsQueueTable.id, messageId),
            or(
              eq(smsQueueTable.status, 'pending'),
              eq(smsQueueTable.status, 'processing')
            )
          )
        )
        .returning({ id: smsQueueTable.id });

      return !!result;
    } catch (error) {
      console.error('Error cancelling SMS:', error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats() {
    try {
      const stats = await db
        .select({
          status: smsQueueTable.status,
          count: db.$count(),
        })
        .from(smsQueueTable)
        .groupBy(smsQueueTable.status);

      const totalCost = await db
        .select({
          total: db.$sum(smsQueueTable.estimatedCost),
        })
        .from(smsQueueTable)
        .where(eq(smsQueueTable.status, 'sent'));

      return {
        byStatus: stats.reduce((acc: any, stat: any) => {
          acc[stat.status] = stat.count;
          return acc;
        }, {}),
        totalEstimatedCost: totalCost[0]?.total || 0,
        rateLimitTokens: this.rateLimitTokens,
        maxRateLimit: this.options.rateLimit,
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return null;
    }
  }

  /**
   * Clear old completed/failed messages
   */
  async cleanup(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deleted = await db
        .delete(smsQueueTable)
        .where(
          and(
            or(
              eq(smsQueueTable.status, 'sent'),
              eq(smsQueueTable.status, 'failed'),
              eq(smsQueueTable.status, 'cancelled')
            ),
            lte(smsQueueTable.createdAt, cutoffDate)
          )
        );

      console.log(`Cleaned up old SMS queue entries: ${deleted}`);
      return deleted as any;
    } catch (error) {
      console.error('Error cleaning up SMS queue:', error);
      return 0;
    }
  }
}

// Export singleton instance
let smsQueueInstance: SMSQueue | null = null;

export function getSMSQueue(): SMSQueue {
  if (!smsQueueInstance) {
    smsQueueInstance = new SMSQueue();
  }
  return smsQueueInstance;
}

export default SMSQueue;
