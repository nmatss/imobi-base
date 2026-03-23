/**
 * ISA (Inside Sales Agent) API Routes
 *
 * Endpoints for managing the virtual ISA agent:
 * - Conversations management
 * - Settings configuration
 * - Statistics/dashboard
 * - WhatsApp webhook for incoming messages
 * - Test endpoint for simulated messages
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { processIncomingMessage, getConversationState } from "./integrations/whatsapp/isa-engine";
import { log } from "./index";
import { checkFeatureAccess } from "./middleware/plan-limits";

export function registerIsaRoutes(app: Express) {
  // Auth middleware (reuses the same pattern from routes.ts)
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: "Nao autenticado" });
    }
    next();
  };

  // ==================== CONVERSATIONS ====================

  /**
   * GET /api/isa/conversations
   * List all ISA conversations for the tenant, with optional filters
   */
  app.get("/api/isa/conversations", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { status, temperature } = req.query;

      const conversations = await storage.getIsaConversationsByTenant(tenantId, {
        status: status as string | undefined,
        temperature: temperature as string | undefined,
      });

      res.json(conversations);
    } catch (error) {
      log(`ISA: Error fetching conversations: ${error}`);
      res.status(500).json({ error: "Erro ao buscar conversas" });
    }
  });

  /**
   * GET /api/isa/conversations/:id
   * Get a single conversation with all its messages
   */
  app.get("/api/isa/conversations/:id", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const conversationState = await getConversationState(req.params.id);

      if (!conversationState || conversationState.conversation.tenantId !== tenantId) {
        return res.status(404).json({ error: "Conversa nao encontrada" });
      }

      res.json(conversationState);
    } catch (error) {
      log(`ISA: Error fetching conversation: ${error}`);
      res.status(500).json({ error: "Erro ao buscar conversa" });
    }
  });

  /**
   * POST /api/isa/conversations/:id/transfer
   * Transfer conversation to a human agent
   */
  app.post("/api/isa/conversations/:id/transfer", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const conversation = await storage.getIsaConversation(req.params.id);

      if (!conversation || conversation.tenantId !== tenantId) {
        return res.status(404).json({ error: "Conversa nao encontrada" });
      }

      const { agentId } = req.body;

      const updated = await storage.updateIsaConversation(req.params.id, {
        status: "transferred",
        assignedAgentId: agentId || (req.user as any).id,
        transferredAt: new Date().toISOString(),
      });

      res.json(updated);
    } catch (error) {
      log(`ISA: Error transferring conversation: ${error}`);
      res.status(500).json({ error: "Erro ao transferir conversa" });
    }
  });

  /**
   * POST /api/isa/conversations/:id/close
   * Close a conversation
   */
  app.post("/api/isa/conversations/:id/close", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const conversation = await storage.getIsaConversation(req.params.id);

      if (!conversation || conversation.tenantId !== tenantId) {
        return res.status(404).json({ error: "Conversa nao encontrada" });
      }

      const updated = await storage.updateIsaConversation(req.params.id, {
        status: "closed",
      });

      res.json(updated);
    } catch (error) {
      log(`ISA: Error closing conversation: ${error}`);
      res.status(500).json({ error: "Erro ao fechar conversa" });
    }
  });

  // ==================== SETTINGS ====================

  /**
   * GET /api/isa/settings
   * Get ISA settings for the current tenant
   */
  app.get("/api/isa/settings", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const settings = await storage.getIsaSettings(tenantId);

      // Return defaults if no settings exist
      if (!settings) {
        return res.json({
          enabled: false,
          greeting: "Ola! Sou a assistente virtual da {companyName}. Como posso ajudar?",
          personality: "professional",
          workingHours: JSON.stringify({ start: "08:00", end: "20:00", days: [1, 2, 3, 4, 5] }),
          autoQualify: true,
          autoScheduleVisits: false,
          transferToHumanThreshold: 10,
          faqResponses: "[]",
        });
      }

      res.json(settings);
    } catch (error) {
      log(`ISA: Error fetching settings: ${error}`);
      res.status(500).json({ error: "Erro ao buscar configuracoes" });
    }
  });

  /**
   * PUT /api/isa/settings
   * Update ISA settings for the current tenant
   */
  app.put("/api/isa/settings", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const {
        enabled,
        greeting,
        personality,
        workingHours,
        autoQualify,
        autoScheduleVisits,
        transferToHumanThreshold,
        faqResponses,
      } = req.body;

      const settings = await storage.createOrUpdateIsaSettings(tenantId, {
        enabled,
        greeting,
        personality,
        workingHours: typeof workingHours === "string" ? workingHours : JSON.stringify(workingHours),
        autoQualify,
        autoScheduleVisits,
        transferToHumanThreshold,
        faqResponses: typeof faqResponses === "string" ? faqResponses : JSON.stringify(faqResponses),
      });

      res.json(settings);
    } catch (error) {
      log(`ISA: Error updating settings: ${error}`);
      res.status(500).json({ error: "Erro ao atualizar configuracoes" });
    }
  });

  // ==================== STATS ====================

  /**
   * GET /api/isa/stats
   * Get ISA dashboard statistics
   */
  app.get("/api/isa/stats", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const stats = await storage.getIsaStats(tenantId);

      // Calculate conversion rate
      const conversionRate = stats.total > 0
        ? Math.round(((stats.qualified + stats.transferred) / stats.total) * 100)
        : 0;

      res.json({
        ...stats,
        conversionRate,
      });
    } catch (error) {
      log(`ISA: Error fetching stats: ${error}`);
      res.status(500).json({ error: "Erro ao buscar estatisticas" });
    }
  });

  // ==================== WEBHOOK ====================

  /**
   * POST /api/isa/webhook
   * Webhook endpoint for incoming WhatsApp messages
   * Processes through the ISA engine
   * Requires X-ISA-API-Key header matching ISA_WEBHOOK_SECRET in production
   */
  app.post("/api/isa/webhook", async (req: Request, res: Response) => {
    try {
      // Verify webhook API key in production
      const isProduction = process.env.NODE_ENV === "production";
      const webhookSecret = process.env.ISA_WEBHOOK_SECRET;
      const apiKey = req.headers["x-isa-api-key"] as string | undefined;

      if (isProduction) {
        if (!webhookSecret || !apiKey || apiKey !== webhookSecret) {
          return res.status(401).json({ error: "Unauthorized: invalid or missing API key" });
        }
      }

      const { tenantId, phoneNumber, message } = req.body;

      if (!tenantId || !phoneNumber || !message) {
        return res.status(400).json({ error: "tenantId, phoneNumber e message sao obrigatorios" });
      }

      const response = await processIncomingMessage(tenantId, phoneNumber, message);

      res.json({
        success: true,
        response,
      });
    } catch (error) {
      log(`ISA Webhook error: ${error}`);
      res.status(500).json({ error: "Erro ao processar mensagem" });
    }
  });

  // ==================== TEST ====================

  /**
   * POST /api/isa/test
   * Test ISA with a simulated message (for configuration testing)
   */
  app.post("/api/isa/test", requireAuth, checkFeatureAccess('ai_isa'), async (req: Request, res: Response) => {
    try {
      const tenantId = (req.user as any).tenantId;
      const { phoneNumber, message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "message e obrigatorio" });
      }

      // Use a test phone number if not provided
      const testPhone = phoneNumber || `test_${Date.now()}`;

      const response = await processIncomingMessage(tenantId, testPhone, message);

      // Get the conversation state after processing
      const conversation = await storage.getIsaConversationByPhone(tenantId, testPhone);
      let conversationState = null;
      if (conversation) {
        conversationState = await getConversationState(conversation.id);
      }

      res.json({
        success: true,
        response,
        conversationState,
      });
    } catch (error) {
      log(`ISA Test error: ${error}`);
      res.status(500).json({ error: "Erro ao testar ISA" });
    }
  });
}
