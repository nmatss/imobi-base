/**
 * Mercado Pago Webhook Handlers
 * Processes Mercado Pago webhook notifications
 */

import type { Request, Response } from 'express';
import { MercadoPagoService } from './mercadopago-service';
import { storage } from '../../storage';
import * as Sentry from '@sentry/node';

/**
 * Idempotencia via Redis SETNX (espelha o padrao do Stripe webhook).
 * Retorna true se for a primeira vez que vemos este data.id (deve processar).
 * Retorna false se ja foi processado dentro do TTL (nao processar de novo).
 * Se o Redis estiver indisponivel, retorna true (fail-open) e deixa o
 * MercadoPago fazer retry — melhor processar duas vezes que perder evento.
 */
async function markEventAsProcessing(eventKey: string): Promise<boolean> {
  if (!process.env.REDIS_URL) return true;
  try {
    const { getRedisClient } = await import('../../cache/redis-client');
    const client = getRedisClient();
    const key = `mercadopago:webhook:${eventKey}`;
    // NX = only set if not exists. EX = expiration in seconds (24h).
    const result = await client.set(key, '1', 'EX', 24 * 60 * 60, 'NX');
    return result === 'OK';
  } catch (err) {
    // Fail-open: se Redis falhar, prossegue e aceita risco de dupla execucao
    console.warn('[mercadopago-webhook] Idempotency check failed (fail-open):', err);
    Sentry.captureMessage('MercadoPago webhook idempotency fail-open', {
      level: 'warning',
      extra: { eventKey, error: err instanceof Error ? err.message : String(err) },
    });
    return true;
  }
}

/**
 * Marca o evento como falhou para permitir retry: deleta a chave de
 * idempotencia para que o proximo webhook possa reprocessar.
 */
async function markEventAsFailed(eventKey: string): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const { getRedisClient } = await import('../../cache/redis-client');
    const client = getRedisClient();
    await client.del(`mercadopago:webhook:${eventKey}`);
  } catch (err) {
    console.warn('[mercadopago-webhook] Failed to clear idempotency key:', err);
  }
}

/**
 * Extract tenant ID from payment metadata.
 * MercadoPagoService stores it as metadata.tenant_id when creating payments.
 */
function getTenantIdFromMetadata(metadata: Record<string, unknown> | undefined): string | null {
  if (!metadata) return null;
  // MercadoPago lowercases and snake_cases metadata keys
  return (metadata.tenant_id as string) || (metadata.tenantId as string) || null;
}

/**
 * Handle payment notification
 */
async function handlePaymentNotification(paymentId: string): Promise<void> {
  try {
    const paymentStatus = await MercadoPagoService.getPaymentStatus(paymentId);

    console.log(`Payment notification received: ${paymentId}, status: ${paymentStatus.status}`);

    const tenantId = getTenantIdFromMetadata(paymentStatus.metadata);
    if (!tenantId) {
      console.warn(`No tenant ID found in payment metadata for payment ${paymentId}`);
      Sentry.captureMessage('Payment webhook missing tenant ID in metadata', {
        level: 'warning',
        tags: { webhook: 'mercadopago', event: 'payment' },
        extra: { paymentId, metadata: paymentStatus.metadata },
      });
      return;
    }

    if (paymentStatus.status === 'approved') {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await storage.updateTenantSubscription(tenantId, {
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      });

      console.log(
        `Payment approved for tenant ${tenantId}: ${paymentId}, amount: R$ ${paymentStatus.transactionAmount}`
      );
    } else if (paymentStatus.status === 'rejected') {
      console.log(
        `Payment rejected for tenant ${tenantId}: ${paymentId}, reason: ${paymentStatus.statusDetail}`
      );

      Sentry.captureMessage('MercadoPago payment rejected', {
        level: 'warning',
        tags: { webhook: 'mercadopago', event: 'payment_rejected' },
        extra: {
          paymentId,
          tenantId,
          statusDetail: paymentStatus.statusDetail,
          transactionAmount: paymentStatus.transactionAmount,
        },
      });
    } else if (paymentStatus.status === 'refunded') {
      await storage.updateTenantSubscription(tenantId, {
        status: 'suspended',
      });

      console.log(`Payment refunded for tenant ${tenantId}: ${paymentId}`);

      Sentry.captureMessage('MercadoPago payment refunded', {
        level: 'info',
        tags: { webhook: 'mercadopago', event: 'payment_refunded' },
        extra: { paymentId, tenantId, transactionAmount: paymentStatus.transactionAmount },
      });
    } else if (paymentStatus.status === 'in_process') {
      console.log(`Payment in process for tenant ${tenantId}: ${paymentId}`);
      // For PIX and Boleto, this is the initial state
      // Payment is waiting for customer action -- no subscription update needed
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'mercadopago', event: 'payment' },
      extra: { paymentId },
    });
    throw error;
  }
}

/**
 * Handle subscription preapproval notification.
 * Fired when a MercadoPago subscription is created or updated.
 */
async function handleSubscriptionPreapproval(dataId: string): Promise<void> {
  try {
    // Subscription preapproval events indicate subscription lifecycle changes.
    // The data.id refers to the preapproval (subscription) ID.
    // Since we create payments with tenant_id in metadata, we log and track
    // but actual subscription state changes happen through payment notifications.
    console.log(`Subscription preapproval notification: ${dataId}`);

    Sentry.addBreadcrumb({
      category: 'mercadopago',
      message: `Subscription preapproval received: ${dataId}`,
      level: 'info',
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'mercadopago', event: 'subscription_preapproval' },
      extra: { dataId },
    });
    throw error;
  }
}

/**
 * Handle subscription authorized payment notification.
 * Fired when a recurring subscription payment is authorized by MercadoPago.
 */
async function handleSubscriptionAuthorizedPayment(dataId: string): Promise<void> {
  try {
    // The authorized_payment data.id is a payment ID -- process it like a regular payment
    console.log(`Subscription authorized payment notification: ${dataId}`);
    await handlePaymentNotification(dataId);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'mercadopago', event: 'subscription_authorized_payment' },
      extra: { dataId },
    });
    throw error;
  }
}

/**
 * Main webhook handler for Mercado Pago.
 *
 * Pipeline (espelha o padrao-ouro do Stripe webhook):
 * 1. FAIL-CLOSED na assinatura: se faltar x-signature / x-request-id / data.id
 *    => 401. Se a assinatura nao bater (ou o secret nao estiver configurado)
 *    => 401. Nunca pula a verificacao.
 * 2. Idempotencia via Redis SETNX (24h TTL) por data.id. Se ja processado,
 *    responde 200 (duplicate) sem reprocessar.
 * 3. Dispatch do handler especifico.
 * 4. Em erro transitorio do processamento, limpa a chave de idempotencia e
 *    responde 500 para o MercadoPago fazer retry. 200 so em sucesso/duplicado.
 */
export async function handleMercadoPagoWebhook(req: Request, res: Response): Promise<void> {
  const { type, data } = req.body ?? {};

  const xSignature = req.headers['x-signature'] as string | undefined;
  const xRequestId = req.headers['x-request-id'] as string | undefined;
  const dataId = data?.id ? String(data.id) : undefined;

  // 1. FAIL-CLOSED signature verification — required headers must be present.
  if (!xSignature || !xRequestId || !dataId) {
    console.warn('[mercadopago-webhook] Missing x-signature, x-request-id or data.id');
    res.status(401).json({ error: 'Missing signature headers' });
    return;
  }

  const isValid = MercadoPagoService.verifyWebhookSignature(xSignature, xRequestId, dataId);
  if (!isValid) {
    console.warn('[mercadopago-webhook] Invalid Mercado Pago webhook signature');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // 2. Idempotencia — processa cada (type:data.id) no maximo uma vez por 24h.
  const eventKey = `${type ?? 'unknown'}:${dataId}`;
  const isNew = await markEventAsProcessing(eventKey);
  if (!isNew) {
    console.log(`[mercadopago-webhook] Duplicate event ignored: ${eventKey}`);
    res.status(200).json({ success: true, duplicate: true });
    return;
  }

  console.log(`📨 [mercadopago-webhook] Processing: ${type} (${dataId})`);

  // 3 + 4. Dispatch + handling com retry em caso de erro transitorio.
  try {
    switch (type) {
      case 'payment':
        await handlePaymentNotification(dataId);
        break;

      case 'subscription_preapproval':
        await handleSubscriptionPreapproval(dataId);
        break;

      case 'subscription_authorized_payment':
        await handleSubscriptionAuthorizedPayment(dataId);
        break;

      default:
        console.log(`[mercadopago-webhook] Unhandled notification type: ${type}`);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[mercadopago-webhook] Error processing webhook:', error);
    Sentry.captureException(error, {
      tags: { webhook: 'mercadopago', handler: 'main' },
      extra: { eventKey },
    });

    // Permite retry: limpa a chave de idempotencia e responde 500 para que o
    // MercadoPago dispare o proximo retry automatico.
    await markEventAsFailed(eventKey);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed',
    });
  }
}

/**
 * Handle IPN (Instant Payment Notification) - legacy notification system
 */
export async function handleMercadoPagoIPN(req: Request, res: Response): Promise<void> {
  try {
    const { id, topic } = req.query;

    if (!id || !topic) {
      res.status(400).json({ error: 'Missing id or topic parameter' });
      return;
    }

    console.log(`Mercado Pago IPN: topic=${topic}, id=${id}`);

    // Idempotencia por (topic:id), espelhando o webhook principal.
    const eventKey = `ipn:${topic}:${id}`;
    const isNew = await markEventAsProcessing(eventKey);
    if (!isNew) {
      console.log(`[mercadopago-ipn] Duplicate event ignored: ${eventKey}`);
      res.status(200).json({ success: true, duplicate: true });
      return;
    }

    try {
      if (topic === 'payment') {
        await handlePaymentNotification(id as string);
      }
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('[mercadopago-ipn] Error processing IPN:', error);
      Sentry.captureException(error, {
        tags: { webhook: 'mercadopago', handler: 'ipn' },
        extra: { eventKey },
      });
      // Permite retry: limpa a chave e responde 500.
      await markEventAsFailed(eventKey);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'IPN processing failed',
      });
    }
  } catch (error) {
    console.error('[mercadopago-ipn] Unexpected error:', error);
    Sentry.captureException(error, {
      tags: { webhook: 'mercadopago', handler: 'ipn' },
    });
    res.status(500).json({ error: 'IPN processing failed' });
  }
}
