import type { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getEmailService, initializeEmailService } from './email/email-service';
import { validateUnsubscribeToken } from './email/utils';
import { storage } from './storage';
import { validateBody, validateParams } from './middleware/validate';
import {
  sendEmailSchema,
  sendBulkEmailSchema,
  testEmailSchema,
  previewTemplateSchema,
  templateNameParamSchema,
} from './schemas/email';
import { generateRateLimitKey } from "./middleware/rate-limit-key-generator";

// ==================== RATE LIMITERS ====================

/**
 * Rate limiter for individual email sending
 * Limit: 100 emails per hour per user
 */
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 emails per hour per user
  message: { error: 'Email sending limit exceeded. Try again in an hour.' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many email requests',
      message: 'Email sending limit exceeded. Please try again in an hour.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Rate limiter for bulk email sending (more restrictive)
 * Limit: 10 bulk operations per hour per tenant
 */
const bulkEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk sends per hour per tenant
  message: { error: 'Bulk email limit exceeded. Try again in an hour.' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many bulk email requests',
      message: 'Bulk email sending limit exceeded. Please try again in an hour.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Rate limiter for email test endpoint
 * Limit: 20 tests per hour per user
 */
const emailTestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 tests per hour
  message: { error: 'Email test limit exceeded. Try again in an hour.' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerEmailRoutes(app: Express) {
  // Initialize email service
  const emailConfig = {
    provider: (process.env.EMAIL_PROVIDER || 'sendgrid') as 'sendgrid' | 'resend',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    resendApiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.EMAIL_FROM || 'noreply@imobibase.com',
    fromName: process.env.EMAIL_FROM_NAME || 'ImobiBase',
    redisUrl: process.env.REDIS_URL,
    redisHost: process.env.REDIS_HOST,
    redisPort: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined,
    redisPassword: process.env.REDIS_PASSWORD,
  };

  const emailService = initializeEmailService(emailConfig);

  // Initialize the service
  emailService.initialize().catch(err => {
    console.error('Failed to initialize email service:', err);
  });

  /**
   * POST /api/email/send
   * Send a single email
   * Validation: sendEmailSchema
   */
  app.post('/api/email/send', emailLimiter, validateBody(sendEmailSchema), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      // req.body is already validated and typed by Zod
      const {
        to,
        subject,
        html,
        text,
        templateName,
        templateData,
        tenantBranding,
        attachments,
        replyTo,
        priority,
        queue,
      } = req.body;

      const result = await emailService.send({
        to,
        subject,
        html,
        text,
        templateName,
        templateData,
        tenantBranding,
        attachments,
        replyTo,
        priority,
        queue,
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        success: true,
        messageId: result.messageId,
      });
    } catch (error: unknown) {
      console.error('Error sending email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/email/send-bulk
   * Send bulk emails
   * Validation: sendBulkEmailSchema
   */
  app.post('/api/email/send-bulk', bulkEmailLimiter, validateBody(sendBulkEmailSchema), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      // req.body is already validated and typed by Zod
      const { emails } = req.body;

      const result = await emailService.sendBulk(emails);

      res.json({
        success: result.success,
        sent: result.sent,
        failed: result.failed,
        errors: result.errors,
      });
    } catch (error: unknown) {
      console.error('Error sending bulk emails:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send bulk emails';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/email/test
   * Test email configuration
   * Validation: testEmailSchema
   */
  app.post('/api/email/test', emailTestLimiter, validateBody(testEmailSchema), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      // req.body is already validated and typed by Zod
      const { to } = req.body;
      const testEmail = to || req.user!.email;

      // Verify connection first
      const verifyResult = await emailService.verify();
      if (!verifyResult.success) {
        return res.status(500).json({
          error: `Email service connection failed: ${verifyResult.error}`,
        });
      }

      // Send test email
      const result = await emailService.send({
        to: testEmail,
        subject: 'Test Email - ImobiBase',
        html: `
          <h1>Email Configuration Test</h1>
          <p>This is a test email sent from ImobiBase.</p>
          <p>If you received this email, your email service is configured correctly!</p>
          <p><strong>Provider:</strong> ${emailConfig.provider}</p>
          <p><strong>From:</strong> ${emailConfig.fromEmail}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        `,
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error });
      }

      res.json({
        success: true,
        message: `Test email sent to ${testEmail}`,
        messageId: result.messageId,
        provider: emailConfig.provider,
      });
    } catch (error: unknown) {
      console.error('Error testing email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to test email';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /api/email/templates
   * List available email templates
   */
  app.get('/api/email/templates', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      const templates = await emailService.getTemplates();

      res.json({
        templates: templates.map(name => ({
          name,
          displayName: name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
        })),
      });
    } catch (error: unknown) {
      console.error('Error listing templates:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to list templates';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/email/preview/:templateName
   * Preview an email template
   * Validation: templateNameParamSchema, previewTemplateSchema
   */
  app.post('/api/email/preview/:templateName', validateParams(templateNameParamSchema), validateBody(previewTemplateSchema), async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      // req.params and req.body are already validated and typed by Zod
      const { templateName } = req.params;
      const { data, branding } = req.body;

      const html = await emailService.previewTemplate(
        templateName,
        data || {},
        branding
      );

      res.send(html);
    } catch (error: unknown) {
      console.error('Error previewing template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to preview template';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /api/email/queue/stats
   * Get email queue statistics
   */
  app.get('/api/email/queue/stats', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      const stats = await emailService.getQueueStats();

      res.json(stats || { message: 'Queue not initialized' });
    } catch (error: unknown) {
      console.error('Error getting queue stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get queue stats';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /api/email/status
   * Get email service status
   */
  app.get('/api/email/status', async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    try {
      const isConfigured = emailService.isConfigured();
      const verifyResult = isConfigured ? await emailService.verify() : { success: false, error: 'Not configured' };

      res.json({
        configured: isConfigured,
        provider: emailConfig.provider,
        connected: verifyResult.success,
        error: verifyResult.error,
        fromEmail: emailConfig.fromEmail,
        fromName: emailConfig.fromName,
      });
    } catch (error: unknown) {
      console.error('Error getting email status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get email status';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /api/email/unsubscribe/:token
   * Unsubscribe from emails
   */
  app.get('/api/email/unsubscribe/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      const tokenData = validateUnsubscribeToken(token);

      if (!tokenData) {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head><title>Invalid Token</title></head>
          <body style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1>❌ Invalid or Expired Token</h1>
            <p>This unsubscribe link is invalid or has expired.</p>
          </body>
          </html>
        `);
      }

      // Here you would update the user's email preferences in your database
      // For now, we'll just show a success message

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Unsubscribed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center;
              padding: 50px;
              background-color: #f3f4f6;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 { color: #10b981; }
            p { color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Unsubscribed Successfully</h1>
            <p>You have been unsubscribed from our email list.</p>
            <p>Email: <strong>${tokenData.email}</strong></p>
            <p>You will no longer receive marketing emails from us.</p>
          </div>
        </body>
        </html>
      `);
    } catch (error: unknown) {
      console.error('Error unsubscribing:', error);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>⚠️ Error</h1>
          <p>An error occurred while processing your request.</p>
        </body>
        </html>
      `);
    }
  });

  console.log('Email routes registered successfully');
}
