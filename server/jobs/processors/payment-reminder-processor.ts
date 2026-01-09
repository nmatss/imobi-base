import { Job } from 'bullmq';
import { PaymentReminderJobData, EmailJobData, QueueName } from '../queue-manager';
import { getQueue } from '../queue-manager';
import * as Sentry from '@sentry/node';

/**
 * Payment reminder processor - handles sending payment reminders
 */
export async function processPaymentReminder(job: Job<PaymentReminderJobData>): Promise<void> {
  const { contractId, type, daysOverdue } = job.data;

  try {
    console.log(`[PaymentReminderProcessor] Processing ${type} reminder for contract ${contractId}`);

    await job.updateProgress(20);

    // Fetch contract and user details
    // In production, fetch from database
    const contractData = {
      id: contractId,
      propertyAddress: 'Rua Example, 123',
      tenantEmail: 'tenant@example.com',
      tenantName: 'John Doe',
      rentAmount: 1500.00,
      dueDate: new Date(Date.now() - (daysOverdue || 0) * 24 * 60 * 60 * 1000).toISOString(),
      lastPaymentDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    console.log(`[PaymentReminderProcessor] Contract data retrieved for ${contractData.propertyAddress}`);
    await job.updateProgress(50);

    // Determine email template and subject based on reminder type
    let subject: string;
    let template: string;
    const emailData: Record<string, any> = {
      tenantName: contractData.tenantName,
      propertyAddress: contractData.propertyAddress,
      rentAmount: contractData.rentAmount,
      dueDate: contractData.dueDate,
    };

    switch (type) {
      case 'upcoming':
        subject = 'Payment Due Soon - Rent Reminder';
        template = 'payment-reminder';
        emailData.message = 'Your rent payment is due soon. Please ensure payment is made by the due date.';
        break;

      case 'overdue':
        subject = `Payment Overdue - ${daysOverdue} Days`;
        template = 'payment-overdue';
        emailData.daysOverdue = daysOverdue;
        emailData.message = `Your rent payment is ${daysOverdue} days overdue. Please make payment as soon as possible.`;
        break;

      case 'final-notice':
        subject = 'Final Notice - Immediate Action Required';
        template = 'payment-overdue';
        emailData.daysOverdue = daysOverdue;
        emailData.message = 'This is a final notice. Please contact us immediately to resolve this matter.';
        emailData.isFinalNotice = true;
        break;

      default:
        throw new Error(`Unknown reminder type: ${type}`);
    }

    await job.updateProgress(70);

    // Queue email
    const emailQueue = getQueue<EmailJobData>(QueueName.EMAIL);
    await emailQueue.add('payment-reminder', {
      to: contractData.tenantEmail,
      subject,
      template,
      data: emailData,
    });

    console.log(`[PaymentReminderProcessor] Email queued for ${contractData.tenantEmail}`);

    await job.updateProgress(100);

    console.log(`[PaymentReminderProcessor] Payment reminder processed successfully`);

    Sentry.addBreadcrumb({
      category: 'payment-reminder',
      message: `Payment reminder sent: ${type}`,
      level: 'info',
      data: {
        contractId,
        type,
        daysOverdue,
      },
    });
  } catch (error) {
    console.error(`[PaymentReminderProcessor] Failed to process payment reminder:`, error);

    Sentry.captureException(error, {
      tags: {
        component: 'payment-reminder-processor',
        contractId: contractId.toString(),
        reminderType: type,
      },
      extra: {
        daysOverdue,
      },
    });

    throw error;
  }
}
