// @ts-nocheck
import sgMail from '@sendgrid/mail';

export interface SendGridConfig {
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
    disposition?: string;
  }>;
  replyTo?: string;
  headers?: Record<string, string>;
}

export class SendGridService {
  private initialized = false;
  private config: SendGridConfig;

  constructor(config: SendGridConfig) {
    this.config = config;
    if (config.apiKey) {
      sgMail.setApiKey(config.apiKey);
      this.initialized = true;
    }
  }

  async send(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'SendGrid is not configured. Please set SENDGRID_API_KEY environment variable.'
      };
    }

    try {
      const msg = {
        to: options.to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        attachments: options.attachments,
        replyTo: options.replyTo,
        headers: options.headers,
      };

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error: any) {
      console.error('SendGrid error:', error);

      // Handle rate limiting
      if (error.code === 429) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  async sendBulk(
    emails: EmailOptions[]
  ): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> {
    if (!this.initialized) {
      return {
        success: false,
        sent: 0,
        failed: emails.length,
        errors: ['SendGrid is not configured'],
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

  async verifyConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.initialized) {
      return {
        success: false,
        error: 'SendGrid is not configured',
      };
    }

    try {
      // SendGrid doesn't have a verify endpoint, but we can check if the API key is valid
      // by trying to get the user's profile
      const request = {
        method: 'GET' as const,
        url: '/v3/user/profile',
      };

      await sgMail.client.request(request);

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to verify SendGrid connection',
      };
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  isConfigured(): boolean {
    return this.initialized;
  }
}
