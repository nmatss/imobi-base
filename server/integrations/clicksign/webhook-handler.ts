// @ts-nocheck
/**
 * ClickSign Webhook Handler
 * Processes webhook events from ClickSign and updates database
 */

import type { Request, Response } from 'express';
import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// ClickSign Webhook Event Types
export type ClickSignEventType =
  | 'document.created'
  | 'document.updated'
  | 'document.signed'
  | 'document.closed'
  | 'document.cancelled'
  | 'signer.added'
  | 'signer.signed'
  | 'signer.viewed'
  | 'signer.refused';

export interface ClickSignWebhookEvent {
  event: ClickSignEventType;
  occurred_at: string;
  data: {
    document?: {
      key: string;
      status: string;
      finished_at?: string;
    };
    signer?: {
      key: string;
      email: string;
      signed_at?: string;
      viewed_at?: string;
      refused_at?: string;
    };
    list?: {
      key: string;
    };
  };
}

export class WebhookHandler {
  /**
   * Main webhook handler
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body as ClickSignWebhookEvent;

      // Validate webhook signature (OBRIGATÓRIO)
      if (!this.validateWebhookSignature(req)) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }

      // Validate timestamp (se disponível)
      if (!this.validateWebhookTimestamp(req)) {
        res.status(401).json({ error: 'Invalid webhook timestamp' });
        return;
      }

      console.log('Received ClickSign webhook:', event.event, event.data);

      // Route to appropriate handler based on event type
      switch (event.event) {
        case 'document.signed':
        case 'document.closed':
          await this.handleDocumentSigned(event);
          break;

        case 'document.cancelled':
          await this.handleDocumentCancelled(event);
          break;

        case 'signer.signed':
          await this.handleSignerSigned(event);
          break;

        case 'signer.viewed':
          await this.handleSignerViewed(event);
          break;

        case 'signer.refused':
          await this.handleSignerRefused(event);
          break;

        default:
          console.log('Unhandled webhook event:', event.event);
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook handling error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle document fully signed event
   */
  private async handleDocumentSigned(event: ClickSignWebhookEvent): Promise<void> {
    const documentKey = event.data.document?.key;
    if (!documentKey) return;

    try {
      // Find contract by ClickSign document key
      const contracts = await db
        .select()
        .from(schema.contracts)
        .where(eq(schema.contracts.clicksignDocumentKey, documentKey))
        .limit(1);

      if (contracts.length === 0) {
        console.log('No contract found for document key:', documentKey);
        return;
      }

      const contract = contracts[0];

      // Update contract status to signed
      await db
        .update(schema.contracts)
        .set({
          status: 'signed',
          signedAt: new Date(event.occurred_at),
          updatedAt: new Date(),
        })
        .where(eq(schema.contracts.id, contract.id));

      // Log the event in audit trail
      await this.logAuditEvent({
        tenantId: contract.tenantId,
        contractId: contract.id,
        eventType: 'document_signed',
        documentKey,
        occurredAt: new Date(event.occurred_at),
        metadata: event.data,
      });

      // TODO: Send notification to relevant parties
      // TODO: Download and store signed document
      // TODO: Update rental contract status if applicable

      console.log('Contract signed successfully:', contract.id);
    } catch (error) {
      console.error('Error handling document signed event:', error);
      throw error;
    }
  }

  /**
   * Handle document cancelled event
   */
  private async handleDocumentCancelled(event: ClickSignWebhookEvent): Promise<void> {
    const documentKey = event.data.document?.key;
    if (!documentKey) return;

    try {
      const contracts = await db
        .select()
        .from(schema.contracts)
        .where(eq(schema.contracts.clicksignDocumentKey, documentKey))
        .limit(1);

      if (contracts.length === 0) return;

      const contract = contracts[0];

      await db
        .update(schema.contracts)
        .set({
          status: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(schema.contracts.id, contract.id));

      await this.logAuditEvent({
        tenantId: contract.tenantId,
        contractId: contract.id,
        eventType: 'document_cancelled',
        documentKey,
        occurredAt: new Date(event.occurred_at),
        metadata: event.data,
      });

      console.log('Contract cancelled:', contract.id);
    } catch (error) {
      console.error('Error handling document cancelled event:', error);
      throw error;
    }
  }

  /**
   * Handle signer signed event
   */
  private async handleSignerSigned(event: ClickSignWebhookEvent): Promise<void> {
    const signerEmail = event.data.signer?.email;
    const signedAt = event.data.signer?.signed_at;

    if (!signerEmail || !signedAt) return;

    try {
      await this.logAuditEvent({
        tenantId: '', // Will be filled from contract lookup
        eventType: 'signer_signed',
        documentKey: '',
        occurredAt: new Date(event.occurred_at),
        metadata: {
          email: signerEmail,
          signedAt: signedAt,
          signerKey: event.data.signer?.key,
        },
      });

      // TODO: Update signer status in database
      // TODO: Send notification to contract creator
      // TODO: Check if all signers have signed and trigger completion

      console.log('Signer signed:', signerEmail);
    } catch (error) {
      console.error('Error handling signer signed event:', error);
    }
  }

  /**
   * Handle signer viewed event
   */
  private async handleSignerViewed(event: ClickSignWebhookEvent): Promise<void> {
    const signerEmail = event.data.signer?.email;
    const viewedAt = event.data.signer?.viewed_at;

    if (!signerEmail || !viewedAt) return;

    try {
      await this.logAuditEvent({
        tenantId: '',
        eventType: 'signer_viewed',
        documentKey: '',
        occurredAt: new Date(event.occurred_at),
        metadata: {
          email: signerEmail,
          viewedAt: viewedAt,
        },
      });

      console.log('Signer viewed document:', signerEmail);
    } catch (error) {
      console.error('Error handling signer viewed event:', error);
    }
  }

  /**
   * Handle signer refused event
   */
  private async handleSignerRefused(event: ClickSignWebhookEvent): Promise<void> {
    const signerEmail = event.data.signer?.email;
    const refusedAt = event.data.signer?.refused_at;

    if (!signerEmail || !refusedAt) return;

    try {
      await this.logAuditEvent({
        tenantId: '',
        eventType: 'signer_refused',
        documentKey: '',
        occurredAt: new Date(event.occurred_at),
        metadata: {
          email: signerEmail,
          refusedAt: refusedAt,
        },
      });

      // TODO: Update contract status to rejected/refused
      // TODO: Notify contract creator about refusal

      console.log('Signer refused document:', signerEmail);
    } catch (error) {
      console.error('Error handling signer refused event:', error);
    }
  }

  /**
   * Validate webhook signature (HMAC-SHA256)
   * SECURITY: FAIL-FAST if secret not configured
   */
  private validateWebhookSignature(req: Request): boolean {
    const signature = req.headers['x-clicksign-signature'] as string;
    const webhookSecret = process.env.CLICKSIGN_WEBHOOK_SECRET;

    // FAIL-FAST: Rejeitar se secret não configurado
    if (!webhookSecret) {
      console.error('[CLICKSIGN] CRITICAL: CLICKSIGN_WEBHOOK_SECRET not configured');
      throw new Error(
        'CLICKSIGN_WEBHOOK_SECRET is required for webhook validation. ' +
        'Configure it before processing webhooks.'
      );
    }

    if (!signature) {
      console.warn('[CLICKSIGN] Webhook received without signature');
      return false;
    }

    try {
      // Implementar validação HMAC
      const payload = JSON.stringify(req.body);

      // ClickSign usa HMAC-SHA256
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const expectedSignature = hmac.update(payload).digest('hex');

      // Verify lengths match before timing-safe comparison
      if (signature.length !== expectedSignature.length) {
        console.warn('[CLICKSIGN] Invalid webhook signature (length mismatch)', {
          receivedLength: signature.length,
          expectedLength: expectedSignature.length,
        });
        return false;
      }

      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.warn('[CLICKSIGN] Invalid webhook signature', {
          received: signature.substring(0, 10) + '...',
          expected: expectedSignature.substring(0, 10) + '...',
        });
      }

      return isValid;
    } catch (error: any) {
      console.error('[CLICKSIGN] Signature validation error:', error);
      return false;
    }
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   */
  private validateWebhookTimestamp(req: Request): boolean {
    const timestamp = req.headers['x-clicksign-timestamp'] as string;

    if (!timestamp) {
      // Se ClickSign não envia timestamp, aceitar mas logar
      console.warn('[CLICKSIGN] Webhook without timestamp (replay protection disabled)');
      return true;
    }

    const MAX_AGE_SECONDS = 300; // 5 minutos
    const webhookTime = parseInt(timestamp, 10);
    const now = Math.floor(Date.now() / 1000);
    const age = now - webhookTime;

    if (age > MAX_AGE_SECONDS) {
      console.warn('[CLICKSIGN] Webhook too old', {
        timestamp: webhookTime,
        age: age,
        maxAge: MAX_AGE_SECONDS,
      });
      return false;
    }

    if (age < -30) {
      console.warn('[CLICKSIGN] Webhook from future (clock skew)', {
        timestamp: webhookTime,
        age: age,
      });
      return false;
    }

    return true;
  }

  /**
   * Log audit event to database
   */
  private async logAuditEvent(event: {
    tenantId: string;
    contractId?: string;
    eventType: string;
    documentKey: string;
    occurredAt: Date;
    metadata: unknown;
  }): Promise<void> {
    try {
      // Store in audit logs table
      // This would require an audit_logs table in the schema
      console.log('Audit log:', event);

      // TODO: Implement proper audit logging when table is available
      // await db.insert(schema.auditLogs).values({
      //   tenantId: event.tenantId,
      //   entityType: 'contract',
      //   entityId: event.contractId,
      //   action: event.eventType,
      //   metadata: event.metadata,
      //   occurredAt: event.occurredAt,
      // });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get webhook URL for ClickSign configuration
   */
  static getWebhookUrl(baseUrl: string): string {
    return `${baseUrl}/api/webhooks/clicksign`;
  }
}

export const webhookHandler = new WebhookHandler();
