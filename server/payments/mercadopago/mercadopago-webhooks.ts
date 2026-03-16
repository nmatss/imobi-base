/**
 * Mercado Pago Webhook Handlers
 * Processes Mercado Pago webhook notifications
 */

import type { Request, Response } from 'express';
import { MercadoPagoService } from './mercadopago-service';
import { storage } from '../../storage';
import * as Sentry from '@sentry/node';

/**
 * Extract tenant ID from payment metadata.
 * MercadoPagoService stores it as metadata.tenant_id when creating payments.
 */
function getTenantIdFromMetadata(metadata: Record<string, any> | undefined): string | null {
  if (!metadata) return null;
  // MercadoPago lowercases and snake_cases metadata keys
  return metadata.tenant_id || metadata.tenantId || null;
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
 * Main webhook handler for Mercado Pago
 */
export async function handleMercadoPagoWebhook(req: Request, res: Response): Promise<void> {
  try {
    const { type, data } = req.body;

    // Verify webhook signature
    const xSignature = req.headers['x-signature'] as string;
    const xRequestId = req.headers['x-request-id'] as string;

    if (xSignature && xRequestId && data?.id) {
      const isValid = MercadoPagoService.verifyWebhookSignature(
        xSignature,
        xRequestId,
        data.id
      );

      if (!isValid) {
        console.warn('Invalid Mercado Pago webhook signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    console.log(`Mercado Pago webhook: ${type}`);

    // Handle different notification types
    switch (type) {
      case 'payment':
        if (data?.id) {
          await handlePaymentNotification(data.id);
        }
        break;

      case 'subscription_preapproval':
        if (data?.id) {
          await handleSubscriptionPreapproval(data.id);
        }
        break;

      case 'subscription_authorized_payment':
        if (data?.id) {
          await handleSubscriptionAuthorizedPayment(data.id);
        }
        break;

      default:
        console.log(`Unhandled Mercado Pago notification type: ${type}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Mercado Pago webhook:', error);
    Sentry.captureException(error, {
      tags: { webhook: 'mercadopago', handler: 'main' },
    });

    // Still return 200 to prevent retries for errors we can't fix
    res.status(200).json({ success: true });
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

    if (topic === 'payment') {
      await handlePaymentNotification(id as string);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Mercado Pago IPN:', error);
    Sentry.captureException(error, {
      tags: { webhook: 'mercadopago', handler: 'ipn' },
    });

    res.status(200).json({ success: true });
  }
}
