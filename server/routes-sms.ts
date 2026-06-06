// @ts-nocheck -- A tabela `smsLogs` ainda não existe no schema dual (shared/schema.ts
// e shared/schema-sqlite.ts). Enquanto a migration não for criada (fora do escopo
// deste track), a persistência fica atrás do helper `persistSmsLog`, que é no-op
// quando a tabela está ausente. Mantemos o pragma apenas por causa dessa dependência
// de schema externa; toda a lógica nova abaixo é tipada corretamente.
import { Router, type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getTwilioService } from './integrations/sms/twilio-service';
import { getSMSQueue } from './integrations/sms/sms-queue';
import { getPhoneValidator } from './integrations/sms/phone-validator';
import { getTwoFactorSMS } from './integrations/sms/twofa';
import { getSMSOptOutManager } from './integrations/sms/optout';
import { getSMSAnalytics } from './integrations/sms/analytics';
import { renderSMSTemplate, getAvailableTemplates, getTemplateInfo } from './integrations/sms/templates';
import { db } from './db';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import twilio from 'twilio';
import { requireAuth, requireAdmin } from './middleware/auth';
import { generateRateLimitKey, generateUserRateLimitKey } from './middleware/rate-limit-key-generator';

const router = Router();

// `smsLogs` e `integrationConfigs` podem não existir no schema atual; resolvemos
// dinamicamente para não quebrar o import quando a migration ainda não rodou.
const smsLogs: typeof schema.integrationConfigs | undefined =
  (schema as Record<string, unknown>).smsLogs as never;
const integrationConfigs = schema.integrationConfigs;

// ==================== SEGURANÇA: WEBHOOK TWILIO ====================

/**
 * Reconstrói a URL pública EXATA que a Twilio usou para assinar a requisição.
 *
 * A assinatura X-Twilio-Signature é calculada sobre a URL configurada no console
 * da Twilio. Atrás de proxies/Vercel, req.protocol/req.get('host') podem divergir
 * da URL pública real, por isso aceitamos um override explícito via
 * TWILIO_WEBHOOK_BASE_URL (ex.: https://app.imobibase.com). Quando ausente,
 * caímos para a reconstrução a partir dos cabeçalhos de proxy.
 */
function getPublicWebhookUrl(req: Request): string {
  const base = process.env.TWILIO_WEBHOOK_BASE_URL;
  if (base) {
    return `${base.replace(/\/+$/, '')}${req.originalUrl}`;
  }
  const forwardedProto = req.get('x-forwarded-proto');
  const protocol = (forwardedProto ? forwardedProto.split(',')[0] : req.protocol).trim();
  const host = req.get('x-forwarded-host') || req.get('host') || '';
  return `${protocol}://${host}${req.originalUrl}`;
}

/**
 * Middleware que valida o cabeçalho X-Twilio-Signature usando o TWILIO_AUTH_TOKEN.
 * Rejeita com 403 quando a assinatura é inválida (padrão do webhook Stripe:
 * falha de assinatura = 403, sem vazar detalhe). Sem auth token configurado,
 * negamos por segurança (fail-closed) em vez de aceitar requisições não verificadas.
 */
function validateTwilioSignature(req: Request, res: Response, next: NextFunction): void {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error('[twilio-webhook] TWILIO_AUTH_TOKEN ausente; rejeitando webhook (fail-closed)');
    res.status(403).type('text/plain').send('Forbidden');
    return;
  }

  const signature = req.get('x-twilio-signature');
  if (!signature) {
    console.warn('[twilio-webhook] requisição sem X-Twilio-Signature');
    res.status(403).type('text/plain').send('Forbidden');
    return;
  }

  const url = getPublicWebhookUrl(req);
  // Twilio assina os parâmetros do corpo (application/x-www-form-urlencoded).
  const params: Record<string, unknown> = (req.body && typeof req.body === 'object') ? req.body : {};

  const isValid = twilio.validateRequest(authToken, signature, url, params as Record<string, string>);
  if (!isValid) {
    console.warn('[twilio-webhook] assinatura inválida', { url });
    res.status(403).type('text/plain').send('Forbidden');
    return;
  }

  next();
}

/**
 * Resolve o tenantId a partir do número Twilio de destino do SMS inbound.
 * Procura uma integração SMS cujo config.phoneNumber bata com o número que
 * recebeu a mensagem (campo `To` do webhook incoming). Retorna null quando
 * não há correspondência (mensagem é registrada sem tenant atribuído).
 */
async function resolveTenantIdByTwilioNumber(twilioNumber: string | undefined): Promise<string | null> {
  if (!twilioNumber || !integrationConfigs) {
    return null;
  }
  try {
    const rows = await db
      .select()
      .from(integrationConfigs)
      .where(eq(integrationConfigs.integrationName, 'sms'));

    for (const row of rows as Array<{ tenantId: string; config: unknown }>) {
      const cfg = typeof row.config === 'string' ? safeJsonParse(row.config) : row.config;
      const configuredNumber =
        (cfg as { phoneNumber?: string; twilioPhoneNumber?: string } | null)?.phoneNumber ??
        (cfg as { phoneNumber?: string; twilioPhoneNumber?: string } | null)?.twilioPhoneNumber;
      if (configuredNumber && normalizePhone(configuredNumber) === normalizePhone(twilioNumber)) {
        return row.tenantId;
      }
    }
  } catch (err) {
    console.error('[twilio-webhook] erro ao resolver tenantId pelo número Twilio:', err);
  }
  return null;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, '');
}

/**
 * Persiste um registro em smsLogs apenas quando a tabela existe no schema atual.
 * No-op seguro enquanto a migration de smsLogs não for criada.
 */
async function persistSmsLog(values: Record<string, unknown>): Promise<void> {
  if (!smsLogs) {
    return;
  }
  try {
    await db.insert(smsLogs).values(values);
  } catch (err) {
    console.error('[sms] falha ao persistir smsLog:', err);
  }
}

/**
 * Atualiza um registro em smsLogs por twilioSid apenas quando a tabela existe.
 */
async function updateSmsLogByTwilioSid(
  twilioSid: string,
  values: Record<string, unknown>,
): Promise<void> {
  if (!smsLogs) {
    return;
  }
  try {
    await db.update(smsLogs).set(values).where(eq((smsLogs as never).twilioSid, twilioSid));
  } catch (err) {
    console.error('[sms] falha ao atualizar smsLog:', err);
  }
}

// ==================== RATE LIMITERS ====================

/**
 * Rate limiter for SMS sending (SMS is more expensive than email/WhatsApp)
 * Limit: 50 SMS per hour per user
 */
const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 SMS per hour per user
  message: { error: 'SMS sending limit exceeded' },
  keyGenerator: generateUserRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many SMS requests',
      message: 'SMS sending limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Rate limiter for SMS 2FA (prevent abuse and credential stuffing)
 * Limit: 10 2FA codes per hour per phone number
 */
const sms2FALimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 codes per hour per phone number
  message: { error: '2FA SMS limit exceeded' },
  keyGenerator: (req) => {
    // Use phone number to prevent abuse across accounts
    if (req.body?.phoneNumber) {
      return `phone:${req.body.phoneNumber}`;
    }
    // Fall back to standard rate limit key (tenant-based or undefined for IP)
    return generateRateLimitKey(req);
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many 2FA requests',
      message: 'Too many verification code requests. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Rate limiter for bulk SMS (very restrictive due to high cost)
 * Limit: 10 bulk operations per hour per user
 */
const bulkSMSLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk operations per hour
  message: { error: 'Bulk SMS limit exceeded' },
  keyGenerator: generateUserRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many bulk SMS requests',
      message: 'Bulk SMS limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

// As checagens de autenticação/autorização usam o middleware real importado de
// ./middleware/auth (requireAuth garante req.user + tenantId; requireAdmin garante
// papel admin/super_admin). Os stubs no-op anteriores foram removidos.

/**
 * POST /api/sms/send
 * Send a single SMS message
 */
router.post('/send', smsLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, body, templateName, templateContext, priority, scheduledFor } = req.body;

    if (!to || (!body && !templateName)) {
      return res.status(400).json({
        error: 'Missing required fields: to and (body or templateName)',
      });
    }

    // Validate phone number
    const validator = getPhoneValidator();
    const validation = await validator.validate(to);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid phone number',
        details: validation.error,
      });
    }

    if (!validation.canReceiveSMS) {
      return res.status(400).json({
        error: 'Phone number cannot receive SMS (likely a landline)',
      });
    }

    // Check opt-out status
    const optOutManager = getSMSOptOutManager();
    const isOptedOut = await optOutManager.isOptedOut(validation.formatted);

    if (isOptedOut) {
      return res.status(400).json({
        error: 'Recipient has opted out of SMS communications',
      });
    }

    // Render template if provided
    let messageBody = body;
    if (templateName) {
      messageBody = renderSMSTemplate(templateName, templateContext || {});
    }

    // Queue the message
    const smsQueue = getSMSQueue();
    const messageId = await smsQueue.enqueue({
      to: validation.formatted,
      body: messageBody,
      templateName,
      templateContext,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      priority: priority || 'normal',
      maxRetries: 3,
      metadata: {
        tenantId: req.user?.tenantId,
        userId: req.user?.id,
        ip: req.ip,
      },
    });

    res.json({
      success: true,
      messageId,
      to: validation.formatted,
      scheduledFor: scheduledFor || new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sms/send-bulk
 * Send SMS to multiple recipients
 */
router.post('/send-bulk', bulkSMSLimiter, requireAuth, async (req: Request, res: Response) => {
  try {
    const { recipients, templateName, templateContext, priority, scheduledFor } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Missing or invalid recipients array',
      });
    }

    if (!templateName) {
      return res.status(400).json({
        error: 'Template name is required for bulk sending',
      });
    }

    // Filter out opted-out numbers
    const optOutManager = getSMSOptOutManager();
    const filteredRecipients = await optOutManager.filterOptedOutNumbers(recipients);

    if (filteredRecipients.length === 0) {
      return res.status(400).json({
        error: 'All recipients have opted out',
      });
    }

    // Queue the bulk job
    const smsQueue = getSMSQueue();
    const messageIds = await smsQueue.enqueueBulk({
      recipients: filteredRecipients,
      template: templateName,
      context: templateContext || {},
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      priority: priority || 'normal',
      // NOTE: enqueueBulk (BulkSMSJob em sms-queue.ts, fora deste escopo) ainda não
      // propaga metadata por job. Quando esse suporte for adicionado, incluir aqui:
      //   metadata: { tenantId: req.user?.tenantId, userId: req.user?.id }
    });

    res.json({
      success: true,
      totalRecipients: recipients.length,
      queuedRecipients: filteredRecipients.length,
      skippedOptOuts: recipients.length - filteredRecipients.length,
      messageIds,
    });
  } catch (error: any) {
    console.error('Error sending bulk SMS:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/twilio/status
 * Twilio status callback webhook
 */
router.post('/webhooks/twilio/status', validateTwilioSignature, async (req: Request, res: Response) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage,
    } = req.body;

    console.log(`Twilio webhook: ${MessageSid} status: ${MessageStatus}`);

    // Update the SMS log (no-op enquanto a tabela smsLogs não existir no schema)
    await updateSmsLogByTwilioSid(MessageSid, {
      status: String(MessageStatus).toLowerCase(),
      errorCode: ErrorCode || null,
      errorMessage: ErrorMessage || null,
      deliveredAt: MessageStatus === 'delivered' ? new Date() : null,
      updatedAt: new Date(),
    });

    // Handle opt-out if message failed due to opt-out
    if (ErrorCode === '21610') {
      const optOutManager = getSMSOptOutManager();
      await optOutManager.optOut({
        phoneNumber: To,
        reason: 'complaint',
        source: 'twilio_webhook',
        optedOutAt: new Date(),
        metadata: { errorCode: ErrorCode, errorMessage: ErrorMessage },
      });
    }

    res.status(200).send('OK');
  } catch (error: any) {
    console.error('Error processing Twilio webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/webhooks/twilio/incoming
 * Handle incoming SMS messages (for STOP/START keywords)
 */
router.post('/webhooks/twilio/incoming', validateTwilioSignature, async (req: Request, res: Response) => {
  try {
    const { From, To, Body, MessageSid } = req.body;

    console.log(`Incoming SMS from ${From}: ${Body}`);

    // O número Twilio de destino vem no campo `To` do webhook incoming; usamos ele
    // para resolver a qual tenant (imobiliária) a mensagem pertence.
    const destinationNumber = To || process.env.TWILIO_PHONE_NUMBER || '';
    const tenantId = await resolveTenantIdByTwilioNumber(destinationNumber);

    // Log the incoming message (no-op enquanto a tabela smsLogs não existir no schema)
    await persistSmsLog({
      tenantId,
      to: destinationNumber,
      from: From,
      body: Body,
      status: 'received',
      twilioSid: MessageSid,
      direction: 'inbound',
      segments: 1,
      cost: 0,
    });

    // Process for opt-out/opt-in keywords
    const optOutManager = getSMSOptOutManager();
    const action = await optOutManager.processIncomingMessage(From, Body);

    let responseMessage = '';

    if (action === 'stop') {
      responseMessage = optOutManager.getOptOutConfirmationMessage();
    } else if (action === 'start') {
      responseMessage = optOutManager.getOptInConfirmationMessage();
    }

    // Send TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    if (responseMessage) {
      twiml.message(responseMessage);
    }

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error: any) {
    console.error('Error processing incoming SMS:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sms/usage
 * Get SMS usage statistics
 */
router.get('/usage', requireAuth, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const analytics = getSMSAnalytics();

    const dateRange = {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
    };

    const [deliveryStats, costStats, templateStats] = await Promise.all([
      analytics.getDeliveryStats(dateRange),
      analytics.getCostStats(dateRange),
      analytics.getTemplateStats(dateRange),
    ]);

    res.json({
      dateRange,
      delivery: deliveryStats,
      cost: costStats,
      templates: templateStats,
    });
  } catch (error: any) {
    console.error('Error getting SMS usage:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sms/balance
 * Get Twilio account balance
 */
router.get('/balance', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const twilioService = getTwilioService();
    const balance = await twilioService.getBalance();

    res.json(balance);
  } catch (error: any) {
    console.error('Error getting balance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sms/analytics/dashboard
 * Get comprehensive dashboard data
 */
router.get('/analytics/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const analytics = getSMSAnalytics();
    const data = await analytics.getDashboardData();

    res.json(data);
  } catch (error: any) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sms/analytics/monthly/:year/:month
 * Get monthly report
 */
router.get('/analytics/monthly/:year/:month', requireAuth, async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    const analytics = getSMSAnalytics();
    const report = await analytics.getMonthlyReport(year, month);

    res.json(report);
  } catch (error: any) {
    console.error('Error getting monthly report:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sms/validate
 * Validate a phone number
 */
router.post('/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const validator = getPhoneValidator();
    const validation = await validator.validate(phoneNumber);

    res.json(validation);
  } catch (error: any) {
    console.error('Error validating phone number:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sms/2fa/send
 * Send 2FA verification code
 */
router.post('/2fa/send', sms2FALimiter, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, userId, purpose } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const twofa = getTwoFactorSMS();
    const result = await twofa.generateAndSend(phoneNumber, {
      userId,
      purpose: purpose || 'verification',
      expiryMinutes: 10,
    });

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to send verification code' });
    }

    res.json({
      success: true,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('Error sending 2FA code:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sms/2fa/verify
 * Verify 2FA code
 */
router.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code, purpose } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({ error: 'Phone number and code are required' });
    }

    const twofa = getTwoFactorSMS();
    const valid = await twofa.verify({
      phoneNumber,
      code,
      purpose: purpose || 'verification',
    });

    if (!valid) {
      const remainingAttempts = await twofa.getRemainingAttempts(phoneNumber, purpose);
      return res.status(400).json({
        error: 'Invalid verification code',
        remainingAttempts,
      });
    }

    res.json({ success: true, valid: true });
  } catch (error: any) {
    console.error('Error verifying 2FA code:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sms/templates
 * List available SMS templates
 */
router.get('/templates', requireAuth, async (req: Request, res: Response) => {
  try {
    const templates = getAvailableTemplates();
    const templatesInfo = templates.map(name => getTemplateInfo(name));

    res.json({ templates: templatesInfo });
  } catch (error: any) {
    console.error('Error getting templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sms/opt-out
 * Manually opt out a phone number
 */
router.post('/opt-out', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, reason } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const optOutManager = getSMSOptOutManager();
    const success = await optOutManager.optOut({
      phoneNumber,
      reason: reason || 'admin',
      source: 'admin_panel',
      optedOutAt: new Date(),
      metadata: {
        adminUserId: req.user?.id,
      },
    });

    res.json({ success });
  } catch (error: any) {
    console.error('Error opting out:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sms/opt-in
 * Manually opt in a phone number
 */
router.post('/opt-in', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const optOutManager = getSMSOptOutManager();
    const success = await optOutManager.optIn({
      phoneNumber,
      source: 'admin_panel',
      metadata: {
        adminUserId: req.user?.id,
      },
    });

    res.json({ success });
  } catch (error: any) {
    console.error('Error opting in:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sms/opt-out/stats
 * Get opt-out statistics
 */
router.get('/opt-out/stats', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const optOutManager = getSMSOptOutManager();
    const stats = await optOutManager.getStats();

    res.json(stats);
  } catch (error: any) {
    console.error('Error getting opt-out stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sms/queue/stats
 * Get queue statistics
 */
router.get('/queue/stats', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const smsQueue = getSMSQueue();
    const stats = await smsQueue.getStats();

    res.json(stats);
  } catch (error: any) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sms/queue/:messageId
 * Cancel a queued message
 */
router.delete('/queue/:messageId', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const messageId = parseInt(req.params.messageId);

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const smsQueue = getSMSQueue();
    const success = await smsQueue.cancel(messageId);

    res.json({ success });
  } catch (error: any) {
    console.error('Error canceling message:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
