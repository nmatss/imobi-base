import { createQueue, QueueName, PaymentReminderJobData } from './queue-manager';
import { Queue } from 'bullmq';

let paymentQueue: Queue<PaymentReminderJobData>;

/**
 * Initialize payment reminder queue
 */
export function initPaymentQueue(): Queue<PaymentReminderJobData> {
  if (!paymentQueue) {
    paymentQueue = createQueue<PaymentReminderJobData>(QueueName.PAYMENT_REMINDER);
  }
  return paymentQueue;
}

/**
 * Queue a payment reminder
 */
export async function queuePaymentReminder(
  data: PaymentReminderJobData,
  options?: {
    priority?: number;
    delay?: number;
  }
): Promise<string> {
  const queue = initPaymentQueue();

  const job = await queue.add('send-payment-reminder', data, {
    priority: options?.priority || 2,
    delay: options?.delay,
  });

  console.log(`[PaymentQueue] Payment reminder queued with job ID: ${job.id}`);
  return job.id!;
}

/**
 * Queue upcoming payment reminder
 */
export async function queueUpcomingPaymentReminder(
  contractId: number
): Promise<string> {
  return queuePaymentReminder({
    contractId,
    type: 'upcoming',
  }, {
    priority: 3,
  });
}

/**
 * Queue overdue payment reminder
 */
export async function queueOverduePaymentReminder(
  contractId: number,
  daysOverdue: number
): Promise<string> {
  return queuePaymentReminder({
    contractId,
    type: 'overdue',
    daysOverdue,
  }, {
    priority: 1, // Highest priority
  });
}

/**
 * Queue final notice for severely overdue payments
 */
export async function queueFinalNotice(
  contractId: number,
  daysOverdue: number
): Promise<string> {
  return queuePaymentReminder({
    contractId,
    type: 'final-notice',
    daysOverdue,
  }, {
    priority: 1, // Highest priority
  });
}

/**
 * Queue batch payment reminders
 */
export async function queueBatchPaymentReminders(
  contracts: Array<{
    contractId: number;
    type: 'upcoming' | 'overdue' | 'final-notice';
    daysOverdue?: number;
  }>
): Promise<string[]> {
  const jobIds: string[] = [];

  for (const contract of contracts) {
    const jobId = await queuePaymentReminder({
      contractId: contract.contractId,
      type: contract.type,
      daysOverdue: contract.daysOverdue,
    }, {
      priority: contract.type === 'final-notice' ? 1 : 2,
      delay: Math.random() * 60000, // Spread over 1 minute
    });

    jobIds.push(jobId);
  }

  console.log(`[PaymentQueue] Queued ${jobIds.length} batch payment reminders`);
  return jobIds;
}
