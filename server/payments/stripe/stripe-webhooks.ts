// @ts-nocheck
/**
 * Stripe Webhook Handlers
 * Processes Stripe webhook events
 */

import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeService } from './stripe-service';
import { storage } from '../../storage';
import * as Sentry from '@sentry/node';

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    const customer = await StripeService.getCustomer(customerId);
    if ('deleted' in customer) {
      throw new Error('Customer has been deleted');
    }

    const tenantId = customer.metadata?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found in customer metadata');
    }

    // Update tenant subscription status
    await storage.updateTenantSubscription(tenantId, {
      status: subscription.status === 'trialing' ? 'trial' : 'active',
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    });

    console.log(`✅ Subscription created for tenant ${tenantId}`);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'subscription.created' },
      extra: { subscriptionId: subscription.id },
    });
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    const customer = await StripeService.getCustomer(customerId);
    if ('deleted' in customer) {
      throw new Error('Customer has been deleted');
    }

    const tenantId = customer.metadata?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found in customer metadata');
    }

    let status = 'active';
    if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
      status = 'cancelled';
    } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
      status = 'suspended';
    } else if (subscription.status === 'trialing') {
      status = 'trial';
    }

    await storage.updateTenantSubscription(tenantId, {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    });

    console.log(`✅ Subscription updated for tenant ${tenantId}, status: ${status}`);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'subscription.updated' },
      extra: { subscriptionId: subscription.id },
    });
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  try {
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer.id;

    const customer = await StripeService.getCustomer(customerId);
    if ('deleted' in customer) {
      throw new Error('Customer has been deleted');
    }

    const tenantId = customer.metadata?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found in customer metadata');
    }

    await storage.updateTenantSubscription(tenantId, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });

    console.log(`✅ Subscription deleted for tenant ${tenantId}`);
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'subscription.deleted' },
      extra: { subscriptionId: subscription.id },
    });
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      throw new Error('Customer ID not found in invoice');
    }

    const customer = await StripeService.getCustomer(customerId);
    if ('deleted' in customer) {
      throw new Error('Customer has been deleted');
    }

    const tenantId = customer.metadata?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found in customer metadata');
    }

    // Log successful payment
    console.log(`✅ Payment succeeded for tenant ${tenantId}, amount: ${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency}`);

    // Here you could:
    // - Send payment confirmation email
    // - Generate and send invoice PDF
    // - Update internal billing records
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'invoice.payment_succeeded' },
      extra: { invoiceId: invoice.id },
    });
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  try {
    const customerId = typeof invoice.customer === 'string'
      ? invoice.customer
      : invoice.customer?.id;

    if (!customerId) {
      throw new Error('Customer ID not found in invoice');
    }

    const customer = await StripeService.getCustomer(customerId);
    if ('deleted' in customer) {
      throw new Error('Customer has been deleted');
    }

    const tenantId = customer.metadata?.tenantId;
    if (!tenantId) {
      throw new Error('Tenant ID not found in customer metadata');
    }

    // Update subscription status to suspended
    await storage.updateTenantSubscription(tenantId, {
      status: 'suspended',
    });

    console.log(`⚠️  Payment failed for tenant ${tenantId}, invoice: ${invoice.id}`);

    // Here you could:
    // - Send payment failure notification
    // - Update billing status
    // - Restrict access to features
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'invoice.payment_failed' },
      extra: { invoiceId: invoice.id },
    });
    throw error;
  }
}

/**
 * Main webhook handler
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  try {
    // Verify webhook signature
    const event = StripeService.verifyWebhookSignature(
      req.rawBody as Buffer,
      signature as string
    );

    console.log(`📨 Received Stripe webhook: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.trial_will_end':
        // Handle trial ending soon (send notification)
        console.log(`⏰ Trial ending soon for subscription: ${event.data.object.id}`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', handler: 'main' },
    });
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed',
    });
  }
}
