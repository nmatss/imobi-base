/**
 * Mercado Pago Webhook Handlers
 * Processes Mercado Pago webhook notifications
 */

import type { Request, Response } from 'express';
import { MercadoPagoService } from './mercadopago-service';
import { storage } from '../../storage';
import * as Sentry from '@sentry/node';

/**
 * Handle payment notification
 */
async function handlePaymentNotification(paymentId: string): Promise<void> {
  try {
    const paymentStatus = await MercadoPagoService.getPaymentStatus(paymentId);

    console.log(`📨 Payment notification received: ${paymentId}, status: ${paymentStatus.status}`);

    // Get tenant from payment metadata
    // Note: You'll need to store payment records in your database with tenant association
    // For now, we'll just log the payment status

    if (paymentStatus.status === 'approved') {
      console.log(`✅ Payment approved: ${paymentId}, amount: R$ ${paymentStatus.transactionAmount}`);

      // Here you would:
      // 1. Update tenant subscription status to active
      // 2. Generate and send invoice
      // 3. Send payment confirmation email
      // 4. Update billing records
    } else if (paymentStatus.status === 'rejected') {
      console.log(`❌ Payment rejected: ${paymentId}, reason: ${paymentStatus.statusDetail}`);

      // Here you would:
      // 1. Send payment failure notification
      // 2. Allow retry
    } else if (paymentStatus.status === 'in_process') {
      console.log(`⏳ Payment in process: ${paymentId}`);

      // For PIX and Boleto, this is the initial state
      // Payment is waiting for customer action
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

    console.log(`📨 Mercado Pago webhook: ${type}`);

    // Handle different notification types
    switch (type) {
      case 'payment':
        if (data?.id) {
          await handlePaymentNotification(data.id);
        }
        break;

      case 'subscription_preapproval':
        console.log('Subscription notification received:', data);
        // Handle subscription notifications if using Mercado Pago subscriptions
        break;

      case 'subscription_authorized_payment':
        console.log('Subscription payment authorized:', data);
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

    console.log(`📨 Mercado Pago IPN: topic=${topic}, id=${id}`);

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
