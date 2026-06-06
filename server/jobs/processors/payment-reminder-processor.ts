import { Job } from 'bullmq';
import { PaymentReminderJobData } from '../queue-manager';
import * as Sentry from '@sentry/node';

/**
 * Resolved data needed to render and send a single payment reminder.
 * Built from real DB rows by the caller (scheduled-jobs) so this stays
 * pure and reusable both inline (serverless) and via the BullMQ worker.
 */
export interface PaymentReminderContext {
  tenantId: string;
  rentalContractId: string;
  rentalPaymentId: string;
  type: 'overdue' | 'upcoming' | 'final-notice';
  daysOverdue?: number;
  renterEmail: string;
  renterName: string;
  propertyAddress: string;
  totalValue: string;
  dueDate: string;
  /** Agency branding/recipient used for template rendering. */
  agencyName: string;
}

interface ReminderTemplate {
  subject: string;
  templateName: string;
  message: string;
}

function buildReminderTemplate(ctx: PaymentReminderContext): ReminderTemplate {
  switch (ctx.type) {
    case 'upcoming':
      return {
        subject: 'Lembrete: aluguel a vencer',
        templateName: 'payment-failed',
        message:
          'Seu aluguel esta proximo do vencimento. Por favor, garanta o pagamento ate a data de vencimento.',
      };
    case 'overdue':
      return {
        subject: `Aluguel em atraso - ${ctx.daysOverdue} dia(s)`,
        templateName: 'payment-failed',
        message: `Seu aluguel esta ${ctx.daysOverdue} dia(s) em atraso. Por favor, regularize o pagamento o quanto antes.`,
      };
    case 'final-notice':
      return {
        subject: 'Aviso final - acao imediata necessaria',
        templateName: 'payment-failed',
        message:
          'Este e um aviso final. Por favor, entre em contato imediatamente para regularizar a pendencia.',
      };
    default: {
      const exhaustive: never = ctx.type;
      throw new Error(`Unknown reminder type: ${String(exhaustive)}`);
    }
  }
}

/**
 * Core logic for a single payment reminder. Sends the e-mail directly via the
 * email service (works on serverless where no BullMQ worker is running).
 *
 * Returns true if an e-mail was dispatched, false if it was skipped (e.g. the
 * renter has no e-mail on file).
 */
export async function sendPaymentReminder(
  ctx: PaymentReminderContext,
): Promise<boolean> {
  if (!ctx.renterEmail) {
    console.warn(
      `[PaymentReminder] Skipping contract ${ctx.rentalContractId}: renter has no e-mail`,
    );
    return false;
  }

  const { subject, templateName, message } = buildReminderTemplate(ctx);

  const { getEmailService } = await import('../../email/email-service');
  const emailService = getEmailService();

  const result = await emailService.sendTemplate(
    templateName,
    ctx.renterEmail,
    subject,
    {
      renterName: ctx.renterName,
      propertyAddress: ctx.propertyAddress,
      amount: `R$ ${Number(ctx.totalValue).toFixed(2)}`,
      dueDate: new Date(ctx.dueDate).toLocaleDateString('pt-BR'),
      daysOverdue: ctx.daysOverdue,
      message,
      isFinalNotice: ctx.type === 'final-notice',
    },
    { companyName: ctx.agencyName, email: ctx.renterEmail },
    { queue: false },
  );

  if (!result.success) {
    throw new Error(
      `Failed to send payment reminder for contract ${ctx.rentalContractId}: ${result.error}`,
    );
  }

  console.log(
    `[PaymentReminder] ${ctx.type} reminder sent to ${ctx.renterEmail} (contract ${ctx.rentalContractId})`,
  );

  Sentry.addBreadcrumb({
    category: 'payment-reminder',
    message: `Payment reminder sent: ${ctx.type}`,
    level: 'info',
    data: {
      tenantId: ctx.tenantId,
      rentalContractId: ctx.rentalContractId,
      type: ctx.type,
      daysOverdue: ctx.daysOverdue,
    },
  });

  return true;
}

/**
 * BullMQ worker entrypoint. Kept for persistent-server deployments where the
 * scheduled job enqueues per-contract jobs. The job payload must carry a fully
 * resolved {@link PaymentReminderContext} so the worker does not re-query.
 */
export async function processPaymentReminder(
  job: Job<PaymentReminderJobData & { context?: PaymentReminderContext }>,
): Promise<void> {
  const ctx = job.data.context;

  if (!ctx) {
    throw new Error(
      '[PaymentReminderProcessor] Missing resolved context in job payload',
    );
  }

  try {
    await job.updateProgress(20);
    await sendPaymentReminder(ctx);
    await job.updateProgress(100);
  } catch (error) {
    console.error(
      '[PaymentReminderProcessor] Failed to process payment reminder:',
      error,
    );
    Sentry.captureException(error, {
      tags: {
        component: 'payment-reminder-processor',
        reminderType: ctx.type,
      },
      extra: { rentalContractId: ctx.rentalContractId },
    });
    throw error;
  }
}
