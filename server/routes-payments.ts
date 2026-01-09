/**
 * Payment Routes
 * API endpoints for Stripe and Mercado Pago payment operations
 */

import type { Express, Request, Response } from 'express';
import { StripeService } from './payments/stripe/stripe-service';
import { handleStripeWebhook } from './payments/stripe/stripe-webhooks';
import { MercadoPagoService } from './payments/mercadopago/mercadopago-service';
import { handleMercadoPagoWebhook, handleMercadoPagoIPN } from './payments/mercadopago/mercadopago-webhooks';
import { storage } from './storage';
import * as Sentry from '@sentry/node';
import { validateBody } from './middleware/validate';
import { asyncHandler, AuthError } from './middleware/error-handler';
import {
  createStripeSubscriptionSchema,
  cancelStripeSubscriptionSchema,
  updatePaymentMethodSchema,
  createPixPaymentSchema,
  createBoletoPaymentSchema,
} from './schemas';

/**
 * Register payment routes
 */
export function registerPaymentRoutes(app: Express): void {
  // ============== STRIPE ROUTES ==============

  /**
   * Create Stripe subscription
   */
  app.post('/api/payments/stripe/create-subscription', validateBody(createStripeSubscriptionSchema), asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AuthError();
    }

    const { priceId, paymentMethodId, trialDays } = req.body;
    const tenantId = req.user.tenantId;

      // Get or create Stripe customer
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      let customerId: string;
      const subscription = await storage.getTenantSubscription(tenantId);

      if (subscription?.metadata?.stripeCustomerId) {
        customerId = subscription.metadata.stripeCustomerId as string;
      } else {
        const customer = await StripeService.createCustomer({
          email: tenant.email || req.user.email,
          name: tenant.name,
          tenantId,
        });
        customerId = customer.id;

        // Update subscription with customer ID
        await storage.updateTenantSubscription(tenantId, {
          metadata: { stripeCustomerId: customerId },
        });
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await StripeService.attachPaymentMethod({
          customerId,
          paymentMethodId,
        });
      }

      // Create subscription
      const stripeSubscription = await StripeService.createSubscription({
        customerId,
        priceId,
        trialPeriodDays: trialDays,
        metadata: { tenantId },
      });

    res.json({
      subscriptionId: stripeSubscription.id,
      status: stripeSubscription.status,
      clientSecret: (stripeSubscription.latest_invoice as any)?.payment_intent?.client_secret,
    });
  }));

  /**
   * Cancel Stripe subscription
   */
  app.post('/api/payments/stripe/cancel-subscription', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { subscriptionId, immediate } = req.body;

      const subscription = await StripeService.cancelSubscription(subscriptionId, immediate);

      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    } catch (error) {
      console.error('Error canceling Stripe subscription:', error);
      Sentry.captureException(error, {
        tags: { route: 'payments', operation: 'cancelStripeSubscription' },
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      });
    }
  });

  /**
   * Update payment method
   */
  app.post('/api/payments/stripe/update-payment-method', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { paymentMethodId } = req.body;
      const tenantId = req.user.tenantId;

      const subscription = await storage.getTenantSubscription(tenantId);
      const customerId = subscription?.metadata?.stripeCustomerId as string;

      if (!customerId) {
        res.status(404).json({ error: 'Stripe customer not found' });
        return;
      }

      await StripeService.attachPaymentMethod({
        customerId,
        paymentMethodId,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating payment method:', error);
      Sentry.captureException(error, {
        tags: { route: 'payments', operation: 'updatePaymentMethod' },
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update payment method',
      });
    }
  });

  /**
   * Get subscription status
   */
  app.get('/api/payments/subscription-status', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tenantId = req.user.tenantId;
      const subscription = await storage.getTenantSubscription(tenantId);

      if (!subscription) {
        res.json({
          status: 'trial',
          plan: 'free',
        });
        return;
      }

      const plan = await storage.getPlan(subscription.planId);

      res.json({
        status: subscription.status,
        plan: plan?.name || 'Unknown',
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        cancelledAt: subscription.cancelledAt,
      });
    } catch (error) {
      console.error('Error getting subscription status:', error);
      Sentry.captureException(error, {
        tags: { route: 'payments', operation: 'getSubscriptionStatus' },
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get subscription status',
      });
    }
  });

  /**
   * Get invoices
   */
  app.get('/api/payments/invoices', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tenantId = req.user.tenantId;
      const subscription = await storage.getTenantSubscription(tenantId);
      const customerId = subscription?.metadata?.stripeCustomerId as string;

      if (!customerId) {
        res.json({ invoices: [] });
        return;
      }

      const invoices = await StripeService.listInvoices(customerId, 20);

      res.json({
        invoices: invoices.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: invoice.status,
          date: invoice.created * 1000,
          pdfUrl: invoice.invoice_pdf,
          hostedUrl: invoice.hosted_invoice_url,
        })),
      });
    } catch (error) {
      console.error('Error getting invoices:', error);
      Sentry.captureException(error, {
        tags: { route: 'payments', operation: 'getInvoices' },
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get invoices',
      });
    }
  });

  // ============== MERCADO PAGO ROUTES ==============

  /**
   * Create PIX payment
   */
  app.post('/api/payments/mercadopago/create-pix', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { amount, description, cpfCnpj } = req.body;
      const tenantId = req.user.tenantId;

      const payment = await MercadoPagoService.createPixPayment({
        amount,
        description,
        email: req.user.email,
        cpfCnpj,
        tenantId,
      });

      res.json(payment);
    } catch (error) {
      console.error('Error creating PIX payment:', error);
      Sentry.captureException(error, {
        tags: { route: 'payments', operation: 'createPixPayment' },
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create PIX payment',
      });
    }
  });

  /**
   * Create Boleto payment
   */
  app.post('/api/payments/mercadopago/create-boleto', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { amount, description, cpfCnpj, firstName, lastName } = req.body;
      const tenantId = req.user.tenantId;

      const payment = await MercadoPagoService.createBoletoPayment({
        amount,
        description,
        email: req.user.email,
        cpfCnpj,
        firstName,
        lastName,
        tenantId,
      });

      res.json(payment);
    } catch (error) {
      console.error('Error creating Boleto payment:', error);
      Sentry.captureException(error, {
        tags: { route: 'payments', operation: 'createBoletoPayment' },
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create Boleto payment',
      });
    }
  });

  /**
   * Get payment status
   */
  app.get('/api/payments/mercadopago/status/:paymentId', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { paymentId } = req.params;
      const status = await MercadoPagoService.getPaymentStatus(paymentId);

      res.json(status);
    } catch (error) {
      console.error('Error getting payment status:', error);
      Sentry.captureException(error, {
        tags: { route: 'payments', operation: 'getPaymentStatus' },
      });
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get payment status',
      });
    }
  });

  // ============== WEBHOOK ROUTES ==============

  /**
   * Stripe webhook handler
   */
  app.post('/api/webhooks/stripe', handleStripeWebhook);

  /**
   * Mercado Pago webhook handler
   */
  app.post('/api/webhooks/mercadopago', handleMercadoPagoWebhook);

  /**
   * Mercado Pago IPN handler (legacy)
   */
  app.get('/api/webhooks/mercadopago/ipn', handleMercadoPagoIPN);
}
