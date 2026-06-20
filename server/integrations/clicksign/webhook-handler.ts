/**
 * ClickSign Webhook Handler
 * Processes webhook events from ClickSign and updates database
 */

import type { Request, Response } from 'express';
import { db, schema } from '../../db';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import {
  runWithClickSignDocumentRlsContext,
  runWithTenantRlsContext,
} from '../../db-rls';
import {
  createWebhookPayloadDigest,
  markWebhookEventFailed,
  markWebhookEventProcessed,
  reserveWebhookEvent,
} from '../webhook-ledger';

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
  private async findContractByDocumentKey(
    documentKey: string,
  ): Promise<{ id: string; tenantId: string } | null> {
    const contracts = await runWithClickSignDocumentRlsContext(documentKey, () =>
      db
        .select({ id: schema.contracts.id, tenantId: schema.contracts.tenantId })
        .from(schema.contracts)
        .where(eq(schema.contracts.clicksignDocumentKey, documentKey))
        .limit(1),
    );

    return contracts[0] ?? null;
  }

  /**
   * Main webhook handler
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    let eventId: string | undefined;
    try {
      const event = req.body as ClickSignWebhookEvent;
      const payloadDigest = createWebhookPayloadDigest(req.rawBody ?? event);

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

      eventId = this.getWebhookEventId(event, payloadDigest);
      const signature = req.headers['x-clicksign-signature'] as string | undefined;
      const reservation = await reserveWebhookEvent({
        provider: 'clicksign',
        eventId,
        eventType: event.event,
        payloadDigest,
        signatureDigest: signature ? createWebhookPayloadDigest(signature) : undefined,
      });
      if (!reservation.reserved) {
        console.warn('Duplicate ClickSign webhook ignored:', event.event, eventId);
        res.status(200).json({ success: true, duplicate: true });
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

      await markWebhookEventProcessed({ provider: 'clicksign', eventId });
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Webhook handling error:', error);
      if (eventId) {
        await markWebhookEventFailed({ provider: 'clicksign', eventId, error });
      }
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
      const contract = await this.findContractByDocumentKey(documentKey);

      if (!contract) {
        console.log('No contract found for document key:', documentKey);
        return;
      }

      await runWithTenantRlsContext(contract.tenantId, async () => {
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
      });

      // TODO: Send notification to relevant parties
      // NOTE: Document download requires ClickSign API client integration (out of scope for now)
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
      const contract = await this.findContractByDocumentKey(documentKey);

      if (!contract) return;

      await runWithTenantRlsContext(contract.tenantId, async () => {
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
      // Look up the contract by document key to fill in tenantId
      const documentKey = event.data.list?.key || event.data.document?.key;
      let tenantId: string | undefined;
      let contractId: string | undefined;

      if (documentKey) {
        const contract = await this.findContractByDocumentKey(documentKey);
        if (contract) {
          tenantId = contract.tenantId;
          contractId = contract.id;
        }
      }

      if (!tenantId || !contractId) {
        console.log('No contract found for signer signed event:', documentKey);
        return;
      }

      await runWithTenantRlsContext(tenantId, () =>
        this.logAuditEvent({
          tenantId,
          contractId,
          eventType: 'signer_signed',
          documentKey: documentKey || '',
          occurredAt: new Date(event.occurred_at),
          metadata: {
            email: signerEmail,
            signedAt,
            signerKey: event.data.signer?.key,
          },
        }),
      );

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
      const documentKey = event.data.list?.key || event.data.document?.key;
      const contract = documentKey
        ? await this.findContractByDocumentKey(documentKey)
        : null;

      if (!contract) {
        console.log('No contract found for signer viewed event:', documentKey);
        return;
      }

      await runWithTenantRlsContext(contract.tenantId, () => this.logAuditEvent({
        tenantId: contract.tenantId,
        contractId: contract.id,
        eventType: 'signer_viewed',
        documentKey: documentKey || '',
        occurredAt: new Date(event.occurred_at),
        metadata: {
          email: signerEmail,
          viewedAt,
        },
      }));

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
      const documentKey = event.data.list?.key || event.data.document?.key;
      let tenantId: string | undefined;
      let contractId: string | undefined;

      if (documentKey) {
        const contract = await this.findContractByDocumentKey(documentKey);
        if (contract) {
          tenantId = contract.tenantId;
          contractId = contract.id;
        }
      }

      if (!tenantId || !contractId) {
        console.log('No contract found for signer refused event:', documentKey);
        return;
      }

      await runWithTenantRlsContext(tenantId, async () => {
        // Update contract status to rejected
        await db
          .update(schema.contracts)
          .set({ status: 'rejected', updatedAt: new Date() })
          .where(eq(schema.contracts.id, contractId));

        await this.logAuditEvent({
          tenantId,
          contractId,
          eventType: 'signer_refused',
          documentKey: documentKey || '',
          occurredAt: new Date(event.occurred_at),
          metadata: {
            email: signerEmail,
            refusedAt,
          },
        });
      });

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
      const rawPayload = Buffer.isBuffer(req.rawBody)
        ? req.rawBody
        : Buffer.from(JSON.stringify(req.body));

      // ClickSign usa HMAC-SHA256
      const hmac = crypto.createHmac('sha256', webhookSecret);
      const expectedSignature = hmac.update(rawPayload).digest('hex');
      const receivedSignature = signature.startsWith('sha256=')
        ? signature.slice('sha256='.length)
        : signature;

      if (!/^[a-f0-9]{64}$/i.test(receivedSignature)) {
        console.warn('[CLICKSIGN] Invalid webhook signature format');
        return false;
      }

      // Verify lengths match before timing-safe comparison
      if (receivedSignature.length !== expectedSignature.length) {
        console.warn('[CLICKSIGN] Invalid webhook signature (length mismatch)', {
          receivedLength: receivedSignature.length,
          expectedLength: expectedSignature.length,
        });
        return false;
      }

      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(
        Buffer.from(receivedSignature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        console.warn('[CLICKSIGN] Invalid webhook signature', {
          received: `${receivedSignature.substring(0, 10)  }...`,
          expected: `${expectedSignature.substring(0, 10)  }...`,
        });
      }

      return isValid;
    } catch (error: unknown) {
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
      if (process.env.CLICKSIGN_WEBHOOK_REQUIRE_TIMESTAMP === 'true') {
        console.warn('[CLICKSIGN] Webhook without required timestamp');
        return false;
      }
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
        age,
        maxAge: MAX_AGE_SECONDS,
      });
      return false;
    }

    if (age < -30) {
      console.warn('[CLICKSIGN] Webhook from future (clock skew)', {
        timestamp: webhookTime,
        age,
      });
      return false;
    }

    return true;
  }

  private getWebhookEventId(event: ClickSignWebhookEvent, payloadDigest: string): string {
    const documentKey = event.data.document?.key || event.data.list?.key;
    const signerKey = event.data.signer?.key;
    const eventTime =
      event.data.document?.finished_at ||
      event.data.signer?.signed_at ||
      event.data.signer?.viewed_at ||
      event.data.signer?.refused_at ||
      event.occurred_at;

    return [
      event.event,
      documentKey,
      signerKey,
      eventTime,
      payloadDigest.slice(0, 16),
    ]
      .filter(Boolean)
      .join(':');
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
      await db.insert(schema.auditLogs).values({
        tenantId: event.tenantId,
        entityType: 'contract',
        entityId: event.contractId,
        action: event.eventType,
        metadata: event.metadata,
        occurredAt: event.occurredAt,
      });
    } catch (error) {
      // Fall back to console logging if DB insert fails
      console.error('Failed to log audit event:', error);
      console.log('Audit log (fallback):', event);
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
