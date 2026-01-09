import { SendGridService } from './sendgrid-service';
import { ResendService } from './resend-service';
import { getTemplateRenderer, type TenantBranding } from './template-renderer';
import { getEmailQueue, type EmailJobData } from './email-queue';
import { isValidEmail, generateUnsubscribeToken } from './utils';

export interface EmailConfig {
  provider: 'sendgrid' | 'resend';
  sendgridApiKey?: string;
  resendApiKey?: string;
  fromEmail: string;
  fromName: string;
  redisUrl?: string;
  redisHost?: string;
  redisPort?: number;
  redisPassword?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateName?: string;
  templateData?: Record<string, any>;
  tenantBranding?: TenantBranding;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
  }>;
  replyTo?: string;
  priority?: number;
  queue?: boolean; // Whether to queue the email or send immediately
}

export class EmailService {
  private provider: SendGridService | ResendService;
  private config: EmailConfig;
  private templateRenderer = getTemplateRenderer();
  private emailQueue = getEmailQueue();
  private initialized = false;

  constructor(config: EmailConfig) {
    this.config = config;

    if (config.provider === 'sendgrid') {
      this.provider = new SendGridService({
        apiKey: config.sendgridApiKey || '',
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
    } else {
      this.provider = new ResendService({
        apiKey: config.resendApiKey || '',
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
    }
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize email queue if Redis is configured
    if (this.config.redisUrl || this.config.redisHost) {
      await this.emailQueue.initialize((data: EmailJobData) => {
        return this.sendEmailDirect({
          to: data.to,
          subject: data.subject,
          html: data.html,
          text: data.text,
          templateName: data.templateName,
          templateData: data.templateData,
          attachments: data.attachments,
          replyTo: data.replyTo,
        });
      });
    }

    this.initialized = true;
  }

  /**
   * Send an email (with optional queueing)
   */
  async send(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Validate email addresses
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    const invalidEmails = recipients.filter(email => !isValidEmail(email));

    if (invalidEmails.length > 0) {
      return {
        success: false,
        error: `Invalid email addresses: ${invalidEmails.join(', ')}`,
      };
    }

    // Render template if specified
    let html = options.html;
    if (options.templateName) {
      try {
        html = await this.templateRenderer.render(
          options.templateName,
          options.templateData || {},
          options.tenantBranding
        );
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to render template: ${error.message}`,
        };
      }
    }

    if (!html) {
      return {
        success: false,
        error: 'No email content provided (html or templateName required)',
      };
    }

    // Queue the email if requested and queue is initialized
    if (options.queue && this.emailQueue.isInitialized()) {
      const jobId = await this.emailQueue.addEmail({
        to: options.to,
        subject: options.subject,
        html,
        text: options.text,
        attachments: options.attachments,
        replyTo: options.replyTo,
        priority: options.priority,
      });

      return {
        success: true,
        messageId: jobId || undefined,
      };
    }

    // Send immediately
    return this.sendEmailDirect(options);
  }

  /**
   * Send email directly (bypass queue)
   */
  private async sendEmailDirect(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    let html = options.html;

    // Render template if needed
    if (options.templateName && !html) {
      try {
        html = await this.templateRenderer.render(
          options.templateName,
          options.templateData || {},
          options.tenantBranding
        );
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to render template: ${error.message}`,
        };
      }
    }

    if (!html) {
      return {
        success: false,
        error: 'No email content provided',
      };
    }

    return this.provider.send({
      to: options.to,
      subject: options.subject,
      html,
      text: options.text,
      attachments: options.attachments,
      replyTo: options.replyTo,
    });
  }

  /**
   * Send bulk emails
   */
  async sendBulk(emails: SendEmailOptions[]): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    if (this.emailQueue.isInitialized()) {
      // Use queue for bulk sending
      await this.emailQueue.addBulkEmails(
        await Promise.all(
          emails.map(async (email) => {
            let html = email.html;
            if (email.templateName) {
              html = await this.templateRenderer.render(
                email.templateName,
                email.templateData || {},
                email.tenantBranding
              );
            }

            return {
              to: email.to,
              subject: email.subject,
              html: html || '',
              text: email.text,
              attachments: email.attachments,
              replyTo: email.replyTo,
              priority: email.priority,
            };
          })
        )
      );

      return {
        success: true,
        sent: emails.length,
        failed: 0,
        errors: [],
      };
    }

    // Send directly if no queue
    const results = await Promise.allSettled(
      emails.map(email => this.send({ ...email, queue: false }))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - sent;
    const errors = results
      .filter(r => r.status === 'fulfilled' && !r.value.success)
      .map(r => (r as PromiseFulfilledResult<any>).value.error);

    return {
      success: failed === 0,
      sent,
      failed,
      errors,
    };
  }

  /**
   * Send templated email
   */
  async sendTemplate(
    templateName: string,
    to: string | string[],
    subject: string,
    data: Record<string, any>,
    branding?: TenantBranding,
    options?: { queue?: boolean; priority?: number; replyTo?: string }
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.send({
      to,
      subject,
      templateName,
      templateData: data,
      tenantBranding: branding,
      queue: options?.queue,
      priority: options?.priority,
      replyTo: options?.replyTo,
    });
  }

  /**
   * Verify email service connection
   */
  async verify(): Promise<{ success: boolean; error?: string }> {
    return this.provider.verifyConnection();
  }

  /**
   * Check if email service is configured
   */
  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  /**
   * Get available templates
   */
  async getTemplates(): Promise<string[]> {
    return this.templateRenderer.listTemplates();
  }

  /**
   * Preview a template
   */
  async previewTemplate(
    templateName: string,
    data: Record<string, any>,
    branding?: TenantBranding
  ): Promise<string> {
    return this.templateRenderer.render(templateName, data, branding);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return this.emailQueue.getQueueStats();
  }

  /**
   * Generate unsubscribe token
   */
  generateUnsubscribeToken(userId: string, email: string): string {
    return generateUnsubscribeToken(userId, email);
  }

  /**
   * Shutdown the email service
   */
  async shutdown(): Promise<void> {
    await this.emailQueue.close();
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export function getEmailService(config?: EmailConfig): EmailService {
  if (!emailServiceInstance && config) {
    emailServiceInstance = new EmailService(config);
  }

  if (!emailServiceInstance) {
    throw new Error('Email service not initialized. Please provide configuration.');
  }

  return emailServiceInstance;
}

export function initializeEmailService(config: EmailConfig): EmailService {
  emailServiceInstance = new EmailService(config);
  return emailServiceInstance;
}
