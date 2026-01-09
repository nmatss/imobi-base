/**
 * WhatsApp Webhook Handler
 *
 * Processes incoming webhooks from WhatsApp Business API
 * Handles messages, status updates, and user interactions
 */

import { db } from "../../db";
import { whatsappMessages, whatsappConversations, leads } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { conversationManager } from "./conversation-manager";
import { autoResponder } from "./auto-responder";
import { log } from "../../index";

interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "document" | "audio" | "video" | "location" | "contacts" | "button" | "interactive";
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256: string;
    filename: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  contacts?: any[];
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
}

interface WebhookStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WebhookMessage[];
        statuses?: WebhookStatus[];
      };
      field: string;
    }>;
  }>;
}

export class WebhookHandler {
  /**
   * Process incoming webhook from WhatsApp
   */
  async processWebhook(payload: WebhookPayload, tenantId: string): Promise<void> {
    log("Processing WhatsApp webhook", "whatsapp");

    if (payload.object !== "whatsapp_business_account") {
      log("Invalid webhook object type", "whatsapp");
      return;
    }

    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === "messages") {
          const { value } = change;

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              await this.handleIncomingMessage(message, value, tenantId);
            }
          }

          // Process status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await this.handleStatusUpdate(status, tenantId);
            }
          }
        }
      }
    }
  }

  /**
   * Handle incoming message
   */
  private async handleIncomingMessage(
    message: WebhookMessage,
    value: any,
    tenantId: string
  ): Promise<void> {
    log(`Incoming WhatsApp message from ${message.from}`, "whatsapp");

    try {
      // Get or create conversation
      const conversation = await conversationManager.getOrCreateConversation({
        tenantId,
        phoneNumber: message.from,
        contactName: value.contacts?.[0]?.profile?.name || message.from,
      });

      // Extract message content based on type
      let content = "";
      let mediaUrl: string | undefined;
      let caption: string | undefined;

      switch (message.type) {
        case "text":
          content = message.text?.body || "";
          break;
        case "image":
          mediaUrl = message.image?.id;
          caption = message.image?.caption;
          content = caption || "[Image]";
          break;
        case "document":
          mediaUrl = message.document?.id;
          caption = message.document?.caption;
          content = caption || message.document?.filename || "[Document]";
          break;
        case "audio":
          content = "[Audio]";
          break;
        case "video":
          content = "[Video]";
          break;
        case "location":
          content = `[Location: ${message.location?.name || ""}]`;
          break;
        case "button":
          content = message.button?.text || "";
          break;
        case "interactive":
          if (message.interactive?.button_reply) {
            content = message.interactive.button_reply.title;
          } else if (message.interactive?.list_reply) {
            content = message.interactive.list_reply.title;
          }
          break;
      }

      // Store message in database
      await db.insert(whatsappMessages).values({
        tenantId,
        conversationId: conversation.id,
        wabaMessageId: message.id,
        direction: "inbound",
        messageType: message.type,
        content,
        mediaUrl,
        caption,
        status: "read",
        createdAt: new Date(parseInt(message.timestamp) * 1000),
      });

      // Update conversation
      await conversationManager.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageFrom: "contact",
        unreadCount: conversation.unreadCount + 1,
      });

      // Check for auto-response triggers
      await autoResponder.processIncomingMessage({
        tenantId,
        conversationId: conversation.id,
        phoneNumber: message.from,
        messageText: content,
        messageType: message.type,
      });

      // Try to match with existing lead or create new one
      await this.matchOrCreateLead(tenantId, conversation, value.contacts?.[0]?.profile?.name);

    } catch (error: any) {
      log(`Error handling incoming message: ${error.message}`, "whatsapp");
    }
  }

  /**
   * Handle message status update
   */
  private async handleStatusUpdate(status: WebhookStatus, tenantId: string): Promise<void> {
    log(`Status update for message ${status.id}: ${status.status}`, "whatsapp");

    try {
      const updates: any = {
        status: status.status,
      };

      // Set timestamp based on status
      const statusTimestamp = new Date(parseInt(status.timestamp) * 1000);

      switch (status.status) {
        case "sent":
          updates.sentAt = statusTimestamp;
          break;
        case "delivered":
          updates.deliveredAt = statusTimestamp;
          break;
        case "read":
          updates.readAt = statusTimestamp;
          break;
        case "failed":
          if (status.errors && status.errors.length > 0) {
            updates.errorCode = status.errors[0].code.toString();
            updates.errorMessage = status.errors[0].message;
          }
          break;
      }

      // Update message in database
      await db
        .update(whatsappMessages)
        .set(updates)
        .where(
          and(
            eq(whatsappMessages.wabaMessageId, status.id),
            eq(whatsappMessages.tenantId, tenantId)
          )
        );

    } catch (error: any) {
      log(`Error handling status update: ${error.message}`, "whatsapp");
    }
  }

  /**
   * Match conversation with existing lead or create new one
   */
  private async matchOrCreateLead(
    tenantId: string,
    conversation: any,
    contactName?: string
  ): Promise<void> {
    try {
      // Check if conversation already linked to a lead
      if (conversation.leadId) {
        return;
      }

      // Try to find existing lead by phone
      const phoneNumber = conversation.phoneNumber.replace(/\D/g, "");
      const [existingLead] = await db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.tenantId, tenantId),
            eq(leads.phone, phoneNumber)
          )
        )
        .limit(1);

      if (existingLead) {
        // Link conversation to existing lead
        await conversationManager.updateConversation(conversation.id, {
          leadId: existingLead.id,
          contactName: contactName || existingLead.name,
        });

        log(`Conversation linked to existing lead ${existingLead.id}`, "whatsapp");
      } else {
        // Create new lead from WhatsApp contact
        const [newLead] = await db.insert(leads).values({
          tenantId,
          name: contactName || phoneNumber,
          email: `${phoneNumber}@whatsapp.temp`, // Temporary email
          phone: phoneNumber,
          source: "WhatsApp",
          status: "new",
          notes: `Lead criado automaticamente via WhatsApp em ${new Date().toLocaleString("pt-BR")}`,
        }).returning();

        // Link conversation to new lead
        await conversationManager.updateConversation(conversation.id, {
          leadId: newLead.id,
          contactName: contactName || phoneNumber,
        });

        log(`New lead ${newLead.id} created from WhatsApp conversation`, "whatsapp");
      }
    } catch (error: any) {
      log(`Error matching/creating lead: ${error.message}`, "whatsapp");
    }
  }

}

// Export singleton instance
export const webhookHandler = new WebhookHandler();
