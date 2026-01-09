import { createQueue, QueueName, EmailJobData } from './queue-manager';
import { Queue } from 'bullmq';

let emailQueue: Queue<EmailJobData>;

/**
 * Initialize email queue
 */
export function initEmailQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    emailQueue = createQueue<EmailJobData>(QueueName.EMAIL);
  }
  return emailQueue;
}

/**
 * Queue an email to be sent
 */
export async function queueEmail(data: EmailJobData, options?: {
  priority?: number;
  delay?: number;
  jobId?: string;
}): Promise<string> {
  const queue = initEmailQueue();

  const job = await queue.add('send-email', data, {
    priority: options?.priority,
    delay: options?.delay,
    jobId: options?.jobId,
  });

  console.log(`[EmailQueue] Email queued with job ID: ${job.id}`);
  return job.id!;
}

/**
 * Queue a welcome email
 */
export async function queueWelcomeEmail(email: string, userName: string): Promise<string> {
  return queueEmail({
    to: email,
    subject: 'Welcome to ImobiBase!',
    template: 'welcome',
    data: {
      userName,
      loginUrl: `${process.env.APP_URL}/login`,
    },
  });
}

/**
 * Queue a password reset email
 */
export async function queuePasswordResetEmail(
  email: string,
  resetToken: string
): Promise<string> {
  return queueEmail({
    to: email,
    subject: 'Reset Your Password',
    template: 'password-reset',
    data: {
      resetUrl: `${process.env.APP_URL}/reset-password?token=${resetToken}`,
      expiresIn: '1 hour',
    },
  });
}

/**
 * Queue an email verification email
 */
export async function queueVerificationEmail(
  email: string,
  verificationToken: string
): Promise<string> {
  return queueEmail({
    to: email,
    subject: 'Verify Your Email',
    template: 'verification',
    data: {
      verificationUrl: `${process.env.APP_URL}/verify-email?token=${verificationToken}`,
    },
  });
}

/**
 * Queue a bulk email (e.g., newsletter)
 */
export async function queueBulkEmail(
  recipients: string[],
  subject: string,
  template: string,
  data: Record<string, any>
): Promise<string[]> {
  const jobIds: string[] = [];

  for (const recipient of recipients) {
    const jobId = await queueEmail({
      to: recipient,
      subject,
      template,
      data,
    }, {
      priority: 5, // Lower priority for bulk emails
    });

    jobIds.push(jobId);
  }

  console.log(`[EmailQueue] Queued ${jobIds.length} bulk emails`);
  return jobIds;
}
