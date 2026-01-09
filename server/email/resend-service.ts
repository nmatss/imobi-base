import { Resend } from 'resend';

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
  }>;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: Array<{ name: string; value: string }>;
}

export class ResendService {
  private client: Resend | null = null;
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
    if (config.apiKey) {
      this.client = new Resend(config.apiKey);
    }
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Resend is not configured. Please set RESEND_API_KEY environment variable.'
      };
    }

    try {
      const { data, error } = await this.client.emails.send({
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map(att => ({
          content: att.content,
          filename: att.filename,
          contentType: att.type,
        })),
        replyTo: options.replyTo,
        headers: options.headers,
        tags: options.tags,
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to send email',
        };
      }

      return {
        success: true,
        messageId: data?.id,
      };
    } catch (error: any) {
      console.error('Resend error:', error);

      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  async sendBulk(
    emails: EmailOptions[]
  ): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    if (!this.client) {
      return {
        success: false,
        sent: 0,
        failed: emails.length,
        errors: ['Resend is not configured'],
      };
    }

    const results = await Promise.allSettled(
      emails.map(email => this.send(email))
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

  async sendBatch(emails: EmailOptions[]): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Resend is not configured',
      };
    }

    try {
      const { data, error } = await this.client.batch.send(
        emails.map(email => ({
          from: `${this.config.fromName} <${this.config.fromEmail}>`,
          to: Array.isArray(email.to) ? email.to : [email.to],
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: email.attachments?.map(att => ({
            content: att.content,
            filename: att.filename,
            contentType: att.type,
          })),
          reply_to: email.replyTo,
          headers: email.headers,
          tags: email.tags,
        }))
      );

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to send batch emails',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send batch emails',
      };
    }
  }

  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return {
        success: false,
        error: 'Resend is not configured',
      };
    }

    try {
      // Resend doesn't have a verify endpoint, but we can check domains
      const { data, error } = await this.client.domains.list();

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to verify Resend connection',
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify Resend connection',
      };
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }
}
