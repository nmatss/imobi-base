/**
 * Stripe Webhook Handlers
 * Processes Stripe webhook events
 */

import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeService } from './stripe-service';
import { storage } from '../../storage';
import { getEmailService } from '../../email/email-service';
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
    const firstItem = subscription.items.data[0];
    const updateData: Record<string, unknown> = {
      status: subscription.status === 'trialing' ? 'trial' : 'active',
      currentPeriodStart: firstItem ? new Date(firstItem.current_period_start * 1000) : new Date(),
      currentPeriodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : new Date(),
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
    };

    // Resolve plan from Stripe price ID
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (priceId) {
      const allPlans = await storage.getActivePlans();
      const matchedPlan = allPlans.find(
        (p: Record<string, unknown>) => p.stripePriceId === priceId || p.stripeYearlyPriceId === priceId
      );
      if (matchedPlan) {
        updateData.planId = matchedPlan.id;
      }
    }

    await storage.updateTenantSubscription(tenantId, updateData);

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

    const firstItem = subscription.items.data[0];
    const updateData: Record<string, unknown> = {
      status,
      currentPeriodStart: firstItem ? new Date(firstItem.current_period_start * 1000) : new Date(),
      currentPeriodEnd: firstItem ? new Date(firstItem.current_period_end * 1000) : new Date(),
      cancelledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    };

    // Resolve plan from Stripe price ID for upgrade/downgrade
    const priceId = subscription.items?.data?.[0]?.price?.id;
    if (priceId) {
      const allPlans = await storage.getActivePlans();
      const matchedPlan = allPlans.find(
        (p: Record<string, unknown>) => p.stripePriceId === priceId || p.stripeYearlyPriceId === priceId
      );
      if (matchedPlan) {
        updateData.planId = matchedPlan.id;
      }
    }

    await storage.updateTenantSubscription(tenantId, updateData);

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

    // Send payment confirmation email
    try {
      const tenant = await storage.getTenant(tenantId);
      if (tenant?.email) {
        const emailService = getEmailService();
        await emailService.sendTemplate(
          'payment-confirmation',
          tenant.email,
          'Pagamento Confirmado',
          {
            clientName: tenant.name,
            amount: `R$ ${(invoice.amount_paid / 100).toFixed(2)}`,
            transactionId: invoice.id,
            paymentDate: new Date().toLocaleDateString('pt-BR'),
            invoiceNumber: invoice.number || undefined,
            paymentMethod: invoice.collection_method === 'charge_automatically' ? 'Cartão de Crédito' : 'Boleto',
            receiptUrl: invoice.hosted_invoice_url || undefined,
          },
          { companyName: tenant.name, email: tenant.email },
          { queue: true }
        );
        console.log(`📧 Payment confirmation email sent to ${tenant.email}`);
      }
    } catch (emailError) {
      console.error(`Failed to send payment confirmation email for tenant ${tenantId}:`, emailError);
      Sentry.captureException(emailError, {
        tags: { webhook: 'stripe', event: 'invoice.payment_succeeded', action: 'send_email' },
        extra: { tenantId, invoiceId: invoice.id },
      });
    }
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

    // Send payment failure notification email
    try {
      const tenant = await storage.getTenant(tenantId);
      if (tenant?.email) {
        const emailService = getEmailService();
        const lastError = invoice.last_finalization_error;
        await emailService.sendTemplate(
          'payment-failed',
          tenant.email,
          'Falha no Pagamento - Ação Necessária',
          {
            clientName: tenant.name,
            amount: `R$ ${(invoice.amount_due / 100).toFixed(2)}`,
            invoiceNumber: invoice.number || invoice.id,
            failureReason: lastError?.message || 'O pagamento não pôde ser processado. Verifique seus dados de pagamento.',
            retryUrl: invoice.hosted_invoice_url || undefined,
          },
          { companyName: tenant.name, email: tenant.email },
          { queue: true }
        );
        console.log(`📧 Payment failure notification sent to ${tenant.email}`);
      }
    } catch (emailError) {
      console.error(`Failed to send payment failure email for tenant ${tenantId}:`, emailError);
      Sentry.captureException(emailError, {
        tags: { webhook: 'stripe', event: 'invoice.payment_failed', action: 'send_email' },
        extra: { tenantId, invoiceId: invoice.id },
      });
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'invoice.payment_failed' },
      extra: { invoiceId: invoice.id },
    });
    throw error;
  }
}

/**
 * Handle customer.subscription.trial_will_end event
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
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

    console.log(`⏰ Trial ending soon for tenant ${tenantId}, subscription: ${subscription.id}`);

    // Send trial ending notification email
    try {
      const tenant = await storage.getTenant(tenantId);
      if (tenant?.email) {
        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000)
          : new Date();
        const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        const emailService = getEmailService();
        await emailService.sendTemplate(
          'subscription-ending',
          tenant.email,
          'Seu período de teste está acabando',
          {
            userName: tenant.name,
            daysRemaining,
            planName: subscription.items.data[0]?.price?.nickname || 'ImobiBase',
            expirationDate: trialEnd.toLocaleDateString('pt-BR'),
            renewUrl: `${process.env.APP_URL || 'https://app.imobibase.com'}/settings/billing`,
          },
          { companyName: tenant.name, email: tenant.email },
          { queue: true }
        );
        console.log(`📧 Trial ending notification sent to ${tenant.email}`);
      }
    } catch (emailError) {
      console.error(`Failed to send trial ending email for tenant ${tenantId}:`, emailError);
      Sentry.captureException(emailError, {
        tags: { webhook: 'stripe', event: 'trial_will_end', action: 'send_email' },
        extra: { tenantId, subscriptionId: subscription.id },
      });
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'trial_will_end' },
      extra: { subscriptionId: subscription.id },
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
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
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
