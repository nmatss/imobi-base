/**
 * WhatsApp API Routes
 *
 * All WhatsApp-related endpoints for:
 * - Sending messages
 * - Managing templates
 * - Handling webhooks
 * - Managing conversations
 */

import type { Express, Request, Response } from "express";
import rateLimit from 'express-rate-limit';
import { whatsappAPI } from "./integrations/whatsapp/business-api";
import { templateManager } from "./integrations/whatsapp/template-manager";
import { conversationManager } from "./integrations/whatsapp/conversation-manager";
import { autoResponder } from "./integrations/whatsapp/auto-responder";
import { messageQueue } from "./integrations/whatsapp/message-queue";
import { webhookHandler } from "./integrations/whatsapp/webhook-handler";
import { log } from "./index";
import { validateExternalUrl } from "./security/url-validator";
import { generateRateLimitKey } from "./middleware/rate-limit-key-generator";

// ==================== RATE LIMITERS ====================

/**
 * Rate limiter for WhatsApp messages (regular messages and media)
 * Limit: 200 messages per hour per tenant
 */
const whatsappLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 200, // 200 messages per hour per tenant
  message: { error: 'WhatsApp messaging limit exceeded' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many WhatsApp messages',
      message: 'WhatsApp messaging limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Rate limiter for WhatsApp template messages (more restrictive - templates cost more)
 * Limit: 100 template messages per hour per tenant
 */
const templateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 templates per hour
  message: { error: 'WhatsApp template limit exceeded' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many WhatsApp template messages',
      message: 'Template messaging limit exceeded. Please try again later.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Rate limiter for bulk WhatsApp operations
 * Limit: 20 bulk operations per hour per tenant
 */
const bulkWhatsAppLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 bulk operations per hour
  message: { error: 'Bulk WhatsApp limit exceeded' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerWhatsAppRoutes(app: Express) {
  // ==================== MESSAGES ====================

  /**
   * Send a text message
   * POST /api/whatsapp/send
   */
  app.post("/api/whatsapp/send", whatsappLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { phoneNumber, message, priority } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ error: "Phone number and message are required" });
      }

      // Queue the message
      const queued = await messageQueue.queueMessage({
        tenantId: req.user.tenantId,
        phoneNumber,
        messageType: "text",
        content: message,
        priority: priority || 5,
      });

      res.json({
        success: true,
        messageId: queued.id,
        status: "queued",
      });
    } catch (error: any) {
      log(`Error sending WhatsApp message: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Send a template message
   * POST /api/whatsapp/send-template
   */
  app.post("/api/whatsapp/send-template", templateLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { phoneNumber, templateId, variables, priority } = req.body;

      if (!phoneNumber || !templateId) {
        return res.status(400).json({ error: "Phone number and template ID are required" });
      }

      // Get template
      const template = await templateManager.getTemplateById(req.user.tenantId, templateId);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Validate template
      const validation = templateManager.validateTemplate(template, variables || {});
      if (!validation.valid) {
        return res.status(400).json({ error: "Template validation failed", errors: validation.errors });
      }

      // Queue the message
      const queued = await messageQueue.queueMessage({
        tenantId: req.user.tenantId,
        phoneNumber,
        messageType: "template",
        templateId,
        variables: variables || {},
        priority: priority || 5,
      });

      res.json({
        success: true,
        messageId: queued.id,
        status: "queued",
      });
    } catch (error: any) {
      log(`Error sending WhatsApp template: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Send media message
   * POST /api/whatsapp/send-media
   */
  app.post("/api/whatsapp/send-media", whatsappLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { phoneNumber, mediaUrl, caption, priority } = req.body;

      if (!phoneNumber || !mediaUrl) {
        return res.status(400).json({ error: "Phone number and media URL are required" });
      }

      // Validar mediaUrl para prevenir SSRF
      const validation = validateExternalUrl(mediaUrl);
      if (!validation.valid) {
        return res.status(400).json({
          error: `Invalid media URL: ${validation.error}`,
        });
      }

      // Queue the message
      const queued = await messageQueue.queueMessage({
        tenantId: req.user.tenantId,
        phoneNumber,
        messageType: "media",
        mediaUrl,
        content: caption,
        priority: priority || 5,
      });

      res.json({
        success: true,
        messageId: queued.id,
        status: "queued",
      });
    } catch (error: any) {
      log(`Error sending WhatsApp media: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== TEMPLATES ====================

  /**
   * Get all templates
   * GET /api/whatsapp/templates
   */
  app.get("/api/whatsapp/templates", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { category } = req.query;

      const templates = await templateManager.getTemplates(
        req.user.tenantId,
        category as string | undefined
      );

      res.json({ templates });
    } catch (error: any) {
      log(`Error fetching templates: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get template by ID
   * GET /api/whatsapp/templates/:id
   */
  app.get("/api/whatsapp/templates/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const template = await templateManager.getTemplateById(req.user.tenantId, req.params.id);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ template });
    } catch (error: any) {
      log(`Error fetching template: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Create template
   * POST /api/whatsapp/templates
   */
  app.post("/api/whatsapp/templates", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const template = await templateManager.createTemplate({
        tenantId: req.user.tenantId,
        ...req.body,
      });

      res.json({ template });
    } catch (error: any) {
      log(`Error creating template: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Update template
   * PUT /api/whatsapp/templates/:id
   */
  app.put("/api/whatsapp/templates/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const template = await templateManager.updateTemplate(
        req.user.tenantId,
        req.params.id,
        req.body
      );

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ template });
    } catch (error: any) {
      log(`Error updating template: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Delete template
   * DELETE /api/whatsapp/templates/:id
   */
  app.delete("/api/whatsapp/templates/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await templateManager.deleteTemplate(req.user.tenantId, req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      log(`Error deleting template: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get template statistics
   * GET /api/whatsapp/templates/stats
   */
  app.get("/api/whatsapp/templates-stats", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await templateManager.getTemplateStats(req.user.tenantId);

      res.json({ stats });
    } catch (error: any) {
      log(`Error fetching template stats: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CONVERSATIONS ====================

  /**
   * Get all conversations
   * GET /api/whatsapp/conversations
   */
  app.get("/api/whatsapp/conversations", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { status, assignedTo, leadId, limit, offset } = req.query;

      const result = await conversationManager.getConversations(req.user.tenantId, {
        status: status as string,
        assignedTo: assignedTo as string,
        leadId: leadId as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error: any) {
      log(`Error fetching conversations: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get conversation by ID with messages
   * GET /api/whatsapp/conversation/:id
   */
  app.get("/api/whatsapp/conversation/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { limit } = req.query;

      const result = await conversationManager.getConversationWithMessages(
        req.params.id,
        req.user.tenantId,
        limit ? parseInt(limit as string) : undefined
      );

      if (!result) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      res.json(result);
    } catch (error: any) {
      log(`Error fetching conversation: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Mark conversation as read
   * POST /api/whatsapp/conversation/:id/read
   */
  app.post("/api/whatsapp/conversation/:id/read", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await conversationManager.markAsRead(req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      log(`Error marking conversation as read: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Assign conversation to user
   * POST /api/whatsapp/conversation/:id/assign
   */
  app.post("/api/whatsapp/conversation/:id/assign", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const conversation = await conversationManager.assignToUser(req.params.id, userId);

      res.json({ conversation });
    } catch (error: any) {
      log(`Error assigning conversation: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Close conversation
   * POST /api/whatsapp/conversation/:id/close
   */
  app.post("/api/whatsapp/conversation/:id/close", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await conversationManager.closeConversation(req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      log(`Error closing conversation: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Get conversation statistics
   * GET /api/whatsapp/conversations/stats
   */
  app.get("/api/whatsapp/conversations-stats", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await conversationManager.getConversationStats(req.user.tenantId);

      res.json({ stats });
    } catch (error: any) {
      log(`Error fetching conversation stats: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== AUTO-RESPONDER ====================

  /**
   * Get auto-responses
   * GET /api/whatsapp/auto-responses
   */
  app.get("/api/whatsapp/auto-responses", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const autoResponses = await autoResponder.getAutoResponses(req.user.tenantId);

      res.json({ autoResponses });
    } catch (error: any) {
      log(`Error fetching auto-responses: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Create auto-response
   * POST /api/whatsapp/auto-responses
   */
  app.post("/api/whatsapp/auto-responses", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const autoResponse = await autoResponder.createAutoResponse({
        tenantId: req.user.tenantId,
        ...req.body,
      });

      res.json({ autoResponse });
    } catch (error: any) {
      log(`Error creating auto-response: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Update auto-response
   * PUT /api/whatsapp/auto-responses/:id
   */
  app.put("/api/whatsapp/auto-responses/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const autoResponse = await autoResponder.updateAutoResponse(
        req.params.id,
        req.user.tenantId,
        req.body
      );

      res.json({ autoResponse });
    } catch (error: any) {
      log(`Error updating auto-response: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * Delete auto-response
   * DELETE /api/whatsapp/auto-responses/:id
   */
  app.delete("/api/whatsapp/auto-responses/:id", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      await autoResponder.deleteAutoResponse(req.params.id, req.user.tenantId);

      res.json({ success: true });
    } catch (error: any) {
      log(`Error deleting auto-response: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== WEBHOOKS ====================

  /**
   * WhatsApp webhook verification endpoint
   * GET /api/webhooks/whatsapp
   *
   * WhatsApp sends a GET request to verify the webhook URL
   */
  app.get("/api/webhooks/whatsapp", (req: Request, res: Response) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (!verifyToken) {
      log('[WHATSAPP] CRITICAL: WHATSAPP_VERIFY_TOKEN not configured', "whatsapp");
      return res.status(500).send('Server misconfiguration - verify token not set');
    }

    if (mode === "subscribe" && token === verifyToken) {
      log('[WHATSAPP] Webhook verified successfully', "whatsapp");
      return res.status(200).send(challenge);
    } else {
      log('[WHATSAPP] Webhook verification failed', "whatsapp");
      return res.status(403).send('Forbidden');
    }
  });

  /**
   * WhatsApp webhook endpoint
   * POST /api/webhooks/whatsapp
   *
   * Receives incoming messages and status updates from WhatsApp Business API
   * Validates webhook signature for security
   */
  app.post("/api/webhooks/whatsapp", async (req: Request, res: Response) => {
    try {
      // Validate signature from WhatsApp
      const signature = req.headers["x-hub-signature-256"] as string;
      const appSecret = process.env.WHATSAPP_APP_SECRET;

      if (!appSecret) {
        log('[WHATSAPP] CRITICAL: WHATSAPP_APP_SECRET not configured', "whatsapp");
        return res.status(500).json({
          error: 'Server misconfiguration - webhook secret not set'
        });
      }

      if (!signature) {
        log('[WHATSAPP] Webhook received without signature', "whatsapp");
        return res.status(401).json({ error: 'Missing signature' });
      }

      // Validate signature using HMAC SHA256
      const crypto = require('crypto');
      const payload = JSON.stringify(req.body);
      const hmac = crypto.createHmac('sha256', appSecret);
      const expectedSignature = 'sha256=' + hmac.update(payload).digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        log('[WHATSAPP] Invalid webhook signature', "whatsapp");
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Process webhook (tenant ID should be determined from webhook payload or configuration)
      // For now, we'll assume a default tenant or extract from payload
      const tenantId = req.body.entry?.[0]?.id || "default";

      await webhookHandler.processWebhook(req.body, tenantId);

      res.json({ success: true });
    } catch (error: any) {
      log(`Webhook error: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== QUEUE ====================

  /**
   * Get queue statistics
   * GET /api/whatsapp/queue/stats
   */
  app.get("/api/whatsapp/queue/stats", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const stats = await messageQueue.getQueueStats(req.user.tenantId);

      res.json({ stats });
    } catch (error: any) {
      log(`Error fetching queue stats: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CONFIG ====================

  /**
   * Get WhatsApp configuration status
   * GET /api/whatsapp/config/status
   */
  app.get("/api/whatsapp/config/status", (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const status = whatsappAPI.getConfigStatus();

      res.json({ status });
    } catch (error: any) {
      log(`Error fetching config status: ${error.message}`, "whatsapp");
      res.status(500).json({ error: error.message });
    }
  });

  log("WhatsApp routes registered", "whatsapp");
}
