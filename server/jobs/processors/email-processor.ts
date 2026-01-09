import { Job } from 'bullmq';
import { EmailJobData } from '../queue-manager';
import * as Sentry from '@sentry/node';

/**
 * Email processor - handles email sending jobs
 *
 * In production, this would integrate with:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - etc.
 */
export async function processEmail(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, template, data, from, attachments } = job.data;

  try {
    console.log(`[EmailProcessor] Sending email to ${to}`);
    console.log(`[EmailProcessor] Subject: ${subject}`);
    console.log(`[EmailProcessor] Template: ${template}`);

    // Update job progress
    await job.updateProgress(10);

    // In production, replace this with actual email service
    // Example with SendGrid:
    /*
    import sgMail from '@sendgrid/mail';
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

    const msg = {
      to,
      from: from || process.env.FROM_EMAIL!,
      subject,
      templateId: template,
      dynamicTemplateData: data,
      attachments,
    };

    await sgMail.send(msg);
    */

    // Simulate email sending delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await job.updateProgress(50);

    // For now, just log the email details
    const recipients = Array.isArray(to) ? to.join(', ') : to;
    console.log(`[EmailProcessor] Email sent successfully to: ${recipients}`);
    console.log(`[EmailProcessor] Template data:`, data);

    await job.updateProgress(100);

    // Log to monitoring
    Sentry.addBreadcrumb({
      category: 'email',
      message: `Email sent: ${subject}`,
      level: 'info',
      data: {
        to: recipients,
        template,
      },
    });
  } catch (error) {
    console.error('[EmailProcessor] Failed to send email:', error);

    Sentry.captureException(error, {
      tags: {
        component: 'email-processor',
        template,
      },
      extra: {
        to,
        subject,
      },
    });

    throw error;
  }
}

/**
 * Helper function to get email templates
 */
export function getEmailTemplates(): Record<string, string> {
  return {
    'welcome': 'Welcome to ImobiBase',
    'invoice': 'Invoice Generated',
    'payment-reminder': 'Payment Reminder',
    'payment-overdue': 'Payment Overdue Notice',
    'contract-expiring': 'Contract Expiring Soon',
    'property-inquiry': 'New Property Inquiry',
    'report-ready': 'Your Report is Ready',
    'export-ready': 'Your Data Export is Ready',
    'password-reset': 'Password Reset Request',
    'verification': 'Email Verification',
  };
}
