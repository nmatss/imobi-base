/**
 * WhatsApp Auto-Responder
 *
 * Handles automatic responses based on:
 * - Business hours
 * - Keywords
 * - First contact
 * - Message patterns
 */

import { db } from "../../db";
import { whatsappAutoResponses, whatsappConversations, tenantSettings } from "@shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { messageQueue } from "./message-queue";
import { log } from "../../index";

interface ProcessMessageParams {
  tenantId: string;
  conversationId: string;
  phoneNumber: string;
  messageText: string;
  messageType: string;
}

interface BusinessHours {
  enabled: boolean;
  monday: { start: string; end: string; closed: boolean };
  tuesday: { start: string; end: string; closed: boolean };
  wednesday: { start: string; end: string; closed: boolean };
  thursday: { start: string; end: string; closed: boolean };
  friday: { start: string; end: string; closed: boolean };
  saturday: { start: string; end: string; closed: boolean };
  sunday: { start: string; end: string; closed: boolean };
  timezone: string;
}

export class AutoResponder {
  /**
   * Process incoming message and trigger auto-responses
   */
  async processIncomingMessage(params: ProcessMessageParams): Promise<void> {
    log(`Processing auto-responder for conversation ${params.conversationId}`, "whatsapp");

    try {
      // Get active auto-responses for tenant
      const autoResponses = await db
        .select()
        .from(whatsappAutoResponses)
        .where(
          and(
            eq(whatsappAutoResponses.tenantId, params.tenantId),
            eq(whatsappAutoResponses.isActive, true)
          )
        );

      if (autoResponses.length === 0) {
        return;
      }

      // Check business hours
      const isBusinessHours = await this.isWithinBusinessHours(params.tenantId);

      // Sort by priority (higher first)
      autoResponses.sort((a: any, b: any) => b.priority - a.priority);

      // Find matching auto-response
      for (const autoResponse of autoResponses) {
        // Skip if requires business hours and we're outside them
        if (autoResponse.businessHoursOnly && !isBusinessHours) {
          continue;
        }

        const shouldRespond = await this.shouldTriggerResponse(
          autoResponse,
          params,
          isBusinessHours
        );

        if (shouldRespond) {
          await this.sendAutoResponse(autoResponse, params);
          break; // Only send first matching response
        }
      }
    } catch (error: any) {
      log(`Auto-responder error: ${error.message}`, "whatsapp");
    }
  }

  /**
   * Check if auto-response should be triggered
   */
  private async shouldTriggerResponse(
    autoResponse: any,
    params: ProcessMessageParams,
    isBusinessHours: boolean
  ): Promise<boolean> {
    switch (autoResponse.triggerType) {
      case "keyword":
        return this.matchesKeyword(params.messageText, autoResponse.keywords || []);

      case "business_hours":
        return !isBusinessHours;

      case "first_contact":
        return await this.isFirstContact(params.conversationId);

      case "all_messages":
        return true;

      default:
        return false;
    }
  }

  /**
   * Check if message matches keywords
   */
  private matchesKeyword(messageText: string, keywords: string[]): boolean {
    if (!keywords || keywords.length === 0) {
      return false;
    }

    const lowerMessage = messageText.toLowerCase().trim();

    return keywords.some(keyword => {
      const lowerKeyword = keyword.toLowerCase().trim();

      // Exact match
      if (lowerMessage === lowerKeyword) {
        return true;
      }

      // Contains keyword
      if (lowerMessage.includes(lowerKeyword)) {
        return true;
      }

      // Word boundary match
      const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'i');
      return regex.test(lowerMessage);
    });
  }

  /**
   * Check if this is the first message in conversation
   */
  private async isFirstContact(conversationId: string): Promise<boolean> {
    const [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.id, conversationId));

    // Consider it first contact if conversation was just created (within last 5 minutes)
    if (conversation?.createdAt) {
      const timeSinceCreation = Date.now() - conversation.createdAt.getTime();
      return timeSinceCreation < 5 * 60 * 1000; // 5 minutes
    }

    return false;
  }

  /**
   * Send auto-response
   */
  private async sendAutoResponse(autoResponse: any, params: ProcessMessageParams): Promise<void> {
    log(`Sending auto-response: ${autoResponse.name}`, "whatsapp");

    // Queue the response message
    await messageQueue.queueMessage({
      tenantId: params.tenantId,
      phoneNumber: params.phoneNumber,
      messageType: autoResponse.templateId ? "template" : "text",
      templateId: autoResponse.templateId,
      content: autoResponse.responseText,
      priority: 8, // High priority for auto-responses
      metadata: {
        autoResponse: true,
        autoResponseId: autoResponse.id,
        autoResponseName: autoResponse.name,
        conversationId: params.conversationId,
      },
    });
  }

  /**
   * Check if current time is within business hours
   */
  private async isWithinBusinessHours(tenantId: string): Promise<boolean> {
    try {
      // Get tenant settings
      const [settings] = await db
        .select()
        .from(tenantSettings)
        .where(eq(tenantSettings.tenantId, tenantId));

      if (!settings?.businessHours) {
        // Default to always open if not configured
        return true;
      }

      const businessHours = settings.businessHours as any as BusinessHours;

      if (!businessHours.enabled) {
        return true;
      }

      // Get current time in tenant's timezone
      const now = new Date();
      const dayOfWeek = now.toLocaleDateString('en-US', {
        weekday: 'lowercase',
        timeZone: businessHours.timezone || 'America/Sao_Paulo',
      } as any) as keyof Omit<BusinessHours, 'enabled' | 'timezone'>;

      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        timeZone: businessHours.timezone || 'America/Sao_Paulo',
      });

      const daySchedule = businessHours[dayOfWeek];

      if (!daySchedule || daySchedule.closed) {
        return false;
      }

      // Compare times
      return currentTime >= daySchedule.start && currentTime <= daySchedule.end;
    } catch (error: any) {
      log(`Error checking business hours: ${error.message}`, "whatsapp");
      return true; // Default to open on error
    }
  }

  /**
   * Create default auto-responses for a tenant
   */
  async initializeDefaultAutoResponses(tenantId: string): Promise<void> {
    log(`Initializing default auto-responses for tenant ${tenantId}`, "whatsapp");

    const defaultResponses = [
      {
        tenantId,
        name: "Resposta Fora do Horário",
        triggerType: "business_hours",
        keywords: [],
        responseText: "Olá! No momento estamos fora do horário de atendimento. Nossa equipe retornará seu contato em breve. Horário de atendimento: Segunda a Sexta, 9h às 18h.",
        isActive: true,
        priority: 10,
        businessHoursOnly: false,
      },
      {
        tenantId,
        name: "Primeiro Contato",
        triggerType: "first_contact",
        keywords: [],
        responseText: "Olá! 👋 Bem-vindo(a)! Obrigado por entrar em contato. Como posso ajudá-lo hoje?",
        isActive: true,
        priority: 9,
        businessHoursOnly: false,
      },
      {
        tenantId,
        name: "Palavra-chave: Informações",
        triggerType: "keyword",
        keywords: ["informação", "informações", "info", "detalhes"],
        responseText: "Ficarei feliz em fornecer mais informações! Sobre qual imóvel você gostaria de saber mais? Por favor, me informe o código ou endereço.",
        isActive: true,
        priority: 7,
        businessHoursOnly: false,
      },
      {
        tenantId,
        name: "Palavra-chave: Visita",
        triggerType: "keyword",
        keywords: ["visita", "visitar", "agendar", "agendamento", "ver"],
        responseText: "Ótimo! Vamos agendar uma visita. Qual imóvel você gostaria de visitar? E qual seria o melhor dia e horário para você?",
        isActive: true,
        priority: 7,
        businessHoursOnly: false,
      },
      {
        tenantId,
        name: "Palavra-chave: Preço",
        triggerType: "keyword",
        keywords: ["preço", "valor", "quanto custa", "custo"],
        responseText: "Claro! Para informar o valor correto, qual imóvel você está interessado? Me informe o código ou endereço.",
        isActive: true,
        priority: 7,
        businessHoursOnly: false,
      },
    ];

    await db.insert(whatsappAutoResponses).values(defaultResponses);

    log(`${defaultResponses.length} default auto-responses created`, "whatsapp");
  }

  /**
   * Get all auto-responses for a tenant
   */
  async getAutoResponses(tenantId: string) {
    return db
      .select()
      .from(whatsappAutoResponses)
      .where(eq(whatsappAutoResponses.tenantId, tenantId));
  }

  /**
   * Create auto-response
   */
  async createAutoResponse(data: any) {
    const [created] = await db
      .insert(whatsappAutoResponses)
      .values(data)
      .returning();

    return created;
  }

  /**
   * Update auto-response
   */
  async updateAutoResponse(id: string, tenantId: string, updates: any) {
    const [updated] = await db
      .update(whatsappAutoResponses)
      .set({ ...updates, updatedAt: new Date() })
      .where(
        and(
          eq(whatsappAutoResponses.id, id),
          eq(whatsappAutoResponses.tenantId, tenantId)
        )
      )
      .returning();

    return updated;
  }

  /**
   * Delete auto-response
   */
  async deleteAutoResponse(id: string, tenantId: string) {
    await db
      .delete(whatsappAutoResponses)
      .where(
        and(
          eq(whatsappAutoResponses.id, id),
          eq(whatsappAutoResponses.tenantId, tenantId)
        )
      );
  }

  /**
   * Toggle auto-response active status
   */
  async toggleAutoResponse(id: string, tenantId: string, isActive: boolean) {
    return this.updateAutoResponse(id, tenantId, { isActive });
  }

  /**
   * Test auto-response matching
   */
  async testAutoResponse(id: string, tenantId: string, testMessage: string): Promise<boolean> {
    const [autoResponse] = await db
      .select()
      .from(whatsappAutoResponses)
      .where(
        and(
          eq(whatsappAutoResponses.id, id),
          eq(whatsappAutoResponses.tenantId, tenantId)
        )
      );

    if (!autoResponse) {
      return false;
    }

    if (autoResponse.triggerType === "keyword") {
      return this.matchesKeyword(testMessage, autoResponse.keywords || []);
    }

    return false;
  }
}

// Export singleton instance
export const autoResponder = new AutoResponder();
