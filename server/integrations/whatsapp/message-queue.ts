/**
 * WhatsApp Message Queue
 *
 * Manages message sending queue with:
 * - Rate limiting (80 msgs/second per WhatsApp limit)
 * - Priority handling
 * - Retry logic
 * - Scheduled messages
 * - Bulk sending
 */

import { db } from "../../db";
import { whatsappMessageQueue, whatsappMessages, whatsappConversations, type InsertWhatsappMessageQueue } from "@shared/schema";
import { eq, and, or, lte, isNull } from "drizzle-orm";
import { whatsappAPI } from "./business-api";
import { templateManager } from "./template-manager";
import { conversationManager } from "./conversation-manager";
import { log } from "../../index";

interface QueueMessageParams {
  tenantId: string;
  phoneNumber: string;
  messageType: "text" | "template" | "media";
  templateId?: string;
  content?: string;
  mediaUrl?: string;
  variables?: Record<string, string>;
  priority?: number;
  scheduledFor?: Date;
  maxRetries?: number;
  metadata?: any;
}

export class MessageQueue {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Start processing queue every 5 seconds
    this.startQueueProcessor();
  }

  /**
   * Add message to queue
   */
  async queueMessage(params: QueueMessageParams): Promise<any> {
    const queueItem: InsertWhatsappMessageQueue = {
      tenantId: params.tenantId,
      phoneNumber: params.phoneNumber,
      messageType: params.messageType,
      templateId: params.templateId,
      content: params.content,
      mediaUrl: params.mediaUrl,
      variables: params.variables,
      priority: params.priority || 5,
      status: "pending",
      retryCount: 0,
      maxRetries: params.maxRetries || 3,
      scheduledFor: params.scheduledFor,
      metadata: params.metadata,
    };

    const [queued] = await db.insert(whatsappMessageQueue).values(queueItem).returning();

    log(`Message queued: ${queued.id} (priority: ${queued.priority})`, "whatsapp");

    // Trigger immediate processing if high priority
    if (params.priority && params.priority >= 8) {
      this.processQueue().catch(err => log(`Queue processing error: ${err.message}`, "whatsapp"));
    }

    return queued;
  }

  /**
   * Start queue processor
   */
  private startQueueProcessor(): void {
    if (this.processingInterval) {
      return;
    }

    log("Starting WhatsApp message queue processor", "whatsapp");

    // Process every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(err => {
        log(`Queue processor error: ${err.message}`, "whatsapp");
      });
    }, 5000);
  }

  /**
   * Stop queue processor
   */
  stopQueueProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      log("WhatsApp message queue processor stopped", "whatsapp");
    }
  }

  /**
   * Process pending messages in queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    if (!whatsappAPI.isConfigured()) {
      return; // API not configured
    }

    this.isProcessing = true;

    try {
      // Get pending messages (including scheduled ones that are due)
      const now = new Date();
      const pendingMessages = await db
        .select()
        .from(whatsappMessageQueue)
        .where(
          and(
            eq(whatsappMessageQueue.status, "pending"),
            or(
              isNull(whatsappMessageQueue.scheduledFor),
              lte(whatsappMessageQueue.scheduledFor, now)
            )
          )
        )
        .limit(50); // Process in batches

      if (pendingMessages.length === 0) {
        this.isProcessing = false;
        return;
      }

      // Sort by priority (higher first), then by creation time
      pendingMessages.sort((a: any, b: any) => {
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

      log(`Processing ${pendingMessages.length} queued messages`, "whatsapp");

      // Process messages with rate limiting
      for (const message of pendingMessages) {
        try {
          await this.processMessage(message);
        } catch (error: any) {
          log(`Error processing message ${message.id}: ${error.message}`, "whatsapp");
        }

        // Small delay to respect rate limits (WhatsApp allows 80 msg/s)
        // We'll be conservative and do ~20 msg/s
        await new Promise(resolve => setTimeout(resolve, 50));
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual message
   */
  private async processMessage(queueItem: any): Promise<void> {
    log(`Processing message ${queueItem.id}`, "whatsapp");

    // Mark as processing
    await db
      .update(whatsappMessageQueue)
      .set({ status: "processing" })
      .where(eq(whatsappMessageQueue.id, queueItem.id));

    try {
      let wabaMessageId: string | undefined;

      // Send message based on type
      switch (queueItem.messageType) {
        case "text":
          const textResponse = await whatsappAPI.sendTextMessage({
            to: queueItem.phoneNumber,
            message: queueItem.content || "",
          });
          wabaMessageId = textResponse.messages[0]?.id;
          break;

        case "template":
          if (!queueItem.templateId) {
            throw new Error("Template ID required for template message");
          }

          const template = await templateManager.getTemplateById(
            queueItem.tenantId,
            queueItem.templateId
          );

          if (!template) {
            throw new Error("Template not found");
          }

          // Build template message content
          let messageContent = template.bodyText;
          if (queueItem.variables) {
            messageContent = templateManager.replaceVariables(messageContent, queueItem.variables);
          }

          // For now, send as text (in production, use actual template API)
          const templateResponse = await whatsappAPI.sendTextMessage({
            to: queueItem.phoneNumber,
            message: messageContent,
          });
          wabaMessageId = templateResponse.messages[0]?.id;

          // Increment template usage
          await templateManager.incrementUsageCount(queueItem.templateId);
          break;

        case "media":
          if (!queueItem.mediaUrl) {
            throw new Error("Media URL required for media message");
          }

          // Determine media type from URL
          const mediaType = this.getMediaType(queueItem.mediaUrl);

          const mediaResponse = await whatsappAPI.sendMediaMessage({
            to: queueItem.phoneNumber,
            type: mediaType,
            mediaUrl: queueItem.mediaUrl,
            caption: queueItem.content,
          });
          wabaMessageId = mediaResponse.messages[0]?.id;
          break;

        default:
          throw new Error(`Unknown message type: ${queueItem.messageType}`);
      }

      // Get or create conversation
      const conversation = await conversationManager.getOrCreateConversation({
        tenantId: queueItem.tenantId,
        phoneNumber: queueItem.phoneNumber,
      });

      // Store message in database
      await db.insert(whatsappMessages).values({
        tenantId: queueItem.tenantId,
        conversationId: conversation.id,
        wabaMessageId,
        direction: "outbound",
        messageType: queueItem.messageType === "template" ? "text" : queueItem.messageType,
        content: queueItem.content,
        mediaUrl: queueItem.mediaUrl,
        templateId: queueItem.templateId,
        status: "sent",
        metadata: queueItem.metadata,
        sentAt: new Date(),
      });

      // Update conversation
      await conversationManager.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageFrom: "user",
      });

      // Mark as sent
      await db
        .update(whatsappMessageQueue)
        .set({
          status: "sent",
          processedAt: new Date(),
        })
        .where(eq(whatsappMessageQueue.id, queueItem.id));

      log(`Message ${queueItem.id} sent successfully`, "whatsapp");

    } catch (error: any) {
      log(`Failed to send message ${queueItem.id}: ${error.message}`, "whatsapp");

      // Check if we should retry
      const newRetryCount = queueItem.retryCount + 1;

      if (newRetryCount < queueItem.maxRetries) {
        // Schedule retry with exponential backoff
        const retryDelay = Math.pow(2, newRetryCount) * 1000; // 2s, 4s, 8s...
        const scheduledFor = new Date(Date.now() + retryDelay);

        await db
          .update(whatsappMessageQueue)
          .set({
            status: "pending",
            retryCount: newRetryCount,
            scheduledFor,
            errorMessage: error.message,
          })
          .where(eq(whatsappMessageQueue.id, queueItem.id));

        log(`Message ${queueItem.id} will retry in ${retryDelay}ms (attempt ${newRetryCount})`, "whatsapp");
      } else {
        // Max retries reached, mark as failed
        await db
          .update(whatsappMessageQueue)
          .set({
            status: "failed",
            errorMessage: error.message,
            processedAt: new Date(),
          })
          .where(eq(whatsappMessageQueue.id, queueItem.id));

        log(`Message ${queueItem.id} failed after ${newRetryCount} attempts`, "whatsapp");
      }
    }
  }

  /**
   * Determine media type from URL
   */
  private getMediaType(url: string): "image" | "document" | "video" | "audio" {
    const ext = url.split('.').pop()?.toLowerCase() || "";

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      return "image";
    }

    if (["mp4", "avi", "mov", "wmv"].includes(ext)) {
      return "video";
    }

    if (["mp3", "wav", "ogg", "m4a"].includes(ext)) {
      return "audio";
    }

    return "document";
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(tenantId?: string) {
    let query = db.select().from(whatsappMessageQueue);

    if (tenantId) {
      query = query.where(eq(whatsappMessageQueue.tenantId, tenantId)) as any;
    }

    const messages = await query;

    return {
      total: messages.length,
      pending: messages.filter((m: any) => m.status === "pending").length,
      processing: messages.filter((m: any) => m.status === "processing").length,
      sent: messages.filter((m: any) => m.status === "sent").length,
      failed: messages.filter((m: any) => m.status === "failed").length,
      scheduled: messages.filter((m: any) => m.scheduledFor && m.scheduledFor > new Date()).length,
    };
  }

  /**
   * Clear old processed messages (cleanup)
   */
  async cleanupQueue(olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db
      .delete(whatsappMessageQueue)
      .where(
        and(
          or(
            eq(whatsappMessageQueue.status, "sent"),
            eq(whatsappMessageQueue.status, "failed")
          ),
          lte(whatsappMessageQueue.processedAt, cutoffDate)
        )
      );

    log(`Cleaned up old queue items`, "whatsapp");

    return 0; // Drizzle doesn't return affected rows easily
  }

  /**
   * Bulk queue messages
   */
  async queueBulkMessages(messages: QueueMessageParams[]): Promise<void> {
    log(`Queuing ${messages.length} bulk messages`, "whatsapp");

    const queueItems = messages.map(msg => ({
      tenantId: msg.tenantId,
      phoneNumber: msg.phoneNumber,
      messageType: msg.messageType,
      templateId: msg.templateId,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      variables: msg.variables,
      priority: msg.priority || 3, // Lower priority for bulk
      status: "pending" as const,
      retryCount: 0,
      maxRetries: msg.maxRetries || 3,
      scheduledFor: msg.scheduledFor,
      metadata: msg.metadata,
    }));

    await db.insert(whatsappMessageQueue).values(queueItems);

    log(`${queueItems.length} messages queued for bulk sending`, "whatsapp");
  }

  /**
   * Cancel scheduled message
   */
  async cancelMessage(messageId: string, tenantId: string): Promise<void> {
    await db
      .delete(whatsappMessageQueue)
      .where(
        and(
          eq(whatsappMessageQueue.id, messageId),
          eq(whatsappMessageQueue.tenantId, tenantId),
          eq(whatsappMessageQueue.status, "pending")
        )
      );

    log(`Message ${messageId} cancelled`, "whatsapp");
  }
}

// Export singleton instance
export const messageQueue = new MessageQueue();
