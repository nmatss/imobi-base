/**
 * WhatsApp Conversation Manager
 *
 * Manages WhatsApp conversations and message threading
 * Handles conversation states, assignment, and analytics
 */

import { db } from "../../db";
import { whatsappConversations, whatsappMessages, type InsertWhatsappConversation } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { log } from "../../index";

interface CreateConversationParams {
  tenantId: string;
  phoneNumber: string;
  contactName?: string;
  leadId?: string;
  assignedTo?: string;
}

interface UpdateConversationParams {
  status?: "active" | "waiting" | "closed";
  assignedTo?: string | null;
  lastMessageAt?: Date;
  lastMessageFrom?: "user" | "contact";
  unreadCount?: number;
  leadId?: string;
  contactName?: string;
  metadata?: any;
}

interface ConversationWithMessages {
  conversation: any;
  messages: any[];
  lead?: any;
  assignedUser?: any;
}

export class ConversationManager {
  /**
   * Get or create conversation by phone number
   */
  async getOrCreateConversation(params: CreateConversationParams): Promise<any> {
    // Try to find existing conversation
    const [existing] = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.tenantId, params.tenantId),
          eq(whatsappConversations.phoneNumber, params.phoneNumber)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create new conversation
    const conversation: InsertWhatsappConversation = {
      tenantId: params.tenantId,
      phoneNumber: params.phoneNumber,
      contactName: params.contactName,
      leadId: params.leadId,
      assignedTo: params.assignedTo,
      status: "active",
      unreadCount: 0,
    };

    const [created] = await db.insert(whatsappConversations).values(conversation).returning();

    log(`New WhatsApp conversation created: ${created.id}`, "whatsapp");

    return created;
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(conversationId: string, tenantId: string): Promise<any> {
    const [conversation] = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.id, conversationId),
          eq(whatsappConversations.tenantId, tenantId)
        )
      );

    return conversation;
  }

  /**
   * Get conversation with messages
   */
  async getConversationWithMessages(
    conversationId: string,
    tenantId: string,
    limit: number = 50
  ): Promise<ConversationWithMessages | null> {
    const conversation = await this.getConversationById(conversationId, tenantId);

    if (!conversation) {
      return null;
    }

    // Get messages
    const messages = await db
      .select()
      .from(whatsappMessages)
      .where(eq(whatsappMessages.conversationId, conversationId))
      .orderBy(desc(whatsappMessages.createdAt))
      .limit(limit);

    return {
      conversation,
      messages: messages.reverse(), // Chronological order
    };
  }

  /**
   * Get all conversations for a tenant
   */
  async getConversations(
    tenantId: string,
    filters?: {
      status?: string;
      assignedTo?: string;
      leadId?: string;
      limit?: number;
      offset?: number;
    }
  ) {
    let query = db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.tenantId, tenantId));

    const conversations = await query;

    // Apply filters
    let filtered = conversations;

    if (filters?.status) {
      filtered = filtered.filter((c: any) => c.status === filters.status);
    }

    if (filters?.assignedTo) {
      filtered = filtered.filter((c: any) => c.assignedTo === filters.assignedTo);
    }

    if (filters?.leadId) {
      filtered = filtered.filter((c: any) => c.leadId === filters.leadId);
    }

    // Sort by last message time
    filtered.sort((a: any, b: any) => {
      const aTime = a.lastMessageAt?.getTime() || 0;
      const bTime = b.lastMessageAt?.getTime() || 0;
      return bTime - aTime;
    });

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;

    return {
      conversations: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationId: string,
    updates: UpdateConversationParams
  ): Promise<any> {
    const [updated] = await db
      .update(whatsappConversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(whatsappConversations.id, conversationId))
      .returning();

    return updated;
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    await db
      .update(whatsappConversations)
      .set({ unreadCount: 0, updatedAt: new Date() })
      .where(eq(whatsappConversations.id, conversationId));

    log(`Conversation ${conversationId} marked as read`, "whatsapp");
  }

  /**
   * Assign conversation to user
   */
  async assignToUser(conversationId: string, userId: string): Promise<any> {
    const [updated] = await db
      .update(whatsappConversations)
      .set({ assignedTo: userId, updatedAt: new Date() })
      .where(eq(whatsappConversations.id, conversationId))
      .returning();

    log(`Conversation ${conversationId} assigned to user ${userId}`, "whatsapp");

    return updated;
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationId: string): Promise<void> {
    await db
      .update(whatsappConversations)
      .set({ status: "closed", updatedAt: new Date() })
      .where(eq(whatsappConversations.id, conversationId));

    log(`Conversation ${conversationId} closed`, "whatsapp");
  }

  /**
   * Reopen conversation
   */
  async reopenConversation(conversationId: string): Promise<void> {
    await db
      .update(whatsappConversations)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(whatsappConversations.id, conversationId));

    log(`Conversation ${conversationId} reopened`, "whatsapp");
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(tenantId: string) {
    const conversations = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.tenantId, tenantId));

    const stats = {
      total: conversations.length,
      active: conversations.filter((c: any) => c.status === "active").length,
      waiting: conversations.filter((c: any) => c.status === "waiting").length,
      closed: conversations.filter((c: any) => c.status === "closed").length,
      unassigned: conversations.filter((c: any) => !c.assignedTo).length,
      withUnread: conversations.filter((c: any) => c.unreadCount > 0).length,
      totalUnread: conversations.reduce((sum: any, c: any) => sum + c.unreadCount, 0),
    };

    return stats;
  }

  /**
   * Get conversations by lead
   */
  async getConversationsByLead(leadId: string, tenantId: string) {
    return db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.leadId, leadId),
          eq(whatsappConversations.tenantId, tenantId)
        )
      );
  }

  /**
   * Get conversations assigned to user
   */
  async getConversationsByUser(userId: string, tenantId: string) {
    return db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.assignedTo, userId),
          eq(whatsappConversations.tenantId, tenantId)
        )
      );
  }

  /**
   * Search conversations
   */
  async searchConversations(tenantId: string, query: string) {
    const conversations = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.tenantId, tenantId));

    // Simple text search in contact name and phone number
    const lowerQuery = query.toLowerCase();
    return conversations.filter((c: any) =>
      c.contactName?.toLowerCase().includes(lowerQuery) ||
      c.phoneNumber.includes(query)
    );
  }

  /**
   * Auto-assign conversations based on rules
   */
  async autoAssignConversation(conversationId: string, tenantId: string): Promise<void> {
    // Simple round-robin assignment
    // In production, you might want more sophisticated assignment logic

    // Get all active users (you would need to join with users table)
    // For now, we'll just log the intent
    log(`Auto-assignment triggered for conversation ${conversationId}`, "whatsapp");

    // You can implement custom assignment logic here:
    // - Round-robin
    // - Based on workload
    // - Based on expertise
    // - Based on availability
  }

  /**
   * Get recent conversations (last 24 hours)
   */
  async getRecentConversations(tenantId: string) {
    const conversations = await db
      .select()
      .from(whatsappConversations)
      .where(eq(whatsappConversations.tenantId, tenantId));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return conversations
      .filter((c: any) => c.lastMessageAt && c.lastMessageAt > yesterday)
      .sort((a: any, b: any) => {
        const aTime = a.lastMessageAt?.getTime() || 0;
        const bTime = b.lastMessageAt?.getTime() || 0;
        return bTime - aTime;
      });
  }

  /**
   * Delete conversation and all its messages
   */
  async deleteConversation(conversationId: string): Promise<void> {
    // Delete messages first
    await db
      .delete(whatsappMessages)
      .where(eq(whatsappMessages.conversationId, conversationId));

    // Delete conversation
    await db
      .delete(whatsappConversations)
      .where(eq(whatsappConversations.id, conversationId));

    log(`Conversation ${conversationId} and all messages deleted`, "whatsapp");
  }
}

// Export singleton instance
export const conversationManager = new ConversationManager();
