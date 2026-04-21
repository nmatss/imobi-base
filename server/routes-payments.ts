/**
 * Payment Routes
 * API endpoints for Stripe and Mercado Pago payment operations
 */

import type { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { StripeService } from './payments/stripe/stripe-service';
import { handleStripeWebhook } from './payments/stripe/stripe-webhooks';
import { MercadoPagoService } from './payments/mercadopago/mercadopago-service';
import { handleMercadoPagoWebhook, handleMercadoPagoIPN } from './payments/mercadopago/mercadopago-webhooks';
import { storage } from './storage';
import * as Sentry from '@sentry/node';
import { validateBody } from './middleware/validate';
import { asyncHandler, AuthError } from './middleware/error-handler';
import { idempotencyCheck } from './middleware/idempotency';
import { generateRateLimitKey } from './middleware/rate-limit-key-generator';
import {
  createStripeSubscriptionSchema,
  cancelStripeSubscriptionSchema,
  updatePaymentMethodSchema,
  createPixPaymentSchema,
  createBoletoPaymentSchema,
} from './schemas';

/**
 * Rate limiter para criacao/modificacao de subscriptions e pagamentos.
 * Protege contra spam que geraria cobrancas/objetos orfaos em Stripe/MercadoPago.
 * Limite: 5 requisicoes/minuto por tenant ou IP.
 */
const paymentMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Muitas tentativas de pagamento. Aguarde 1 minuto e tente novamente.',
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'rate_limit_exceeded',
      message: 'Muitas tentativas de pagamento. Aguarde 1 minuto.',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Register payment routes
 */
export function registerPaymentRoutes(app: Express): void {
  // ============== STRIPE ROUTES ==============

  /**
   * Create Stripe subscription
   */
  app.post('/api/payments/stripe/create-subscription', paymentMutationLimiter, idempotencyCheck, validateBody(createStripeSubscriptionSchema), asyncHandler(async (req: Request, res: Response) => {
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
   * Cancel Stripe subscription.
   *
   * IDOR protection: ignora qualquer subscriptionId do body e usa SOMENTE a
   * subscription associada ao tenant autenticado (via
   * metadata.stripeSubscriptionId no tenant_subscriptions).
   */
  app.post('/api/payments/stripe/cancel-subscription', paymentMutationLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tenantId = req.user.tenantId;
      const tenantSub = await storage.getTenantSubscription(tenantId);
      const ownedSubId = (tenantSub?.metadata as Record<string, unknown> | undefined)
        ?.stripeSubscriptionId as string | undefined;
      if (!ownedSubId) {
        res.status(404).json({ error: 'Nenhuma assinatura ativa encontrada.' });
        return;
      }

      const { immediate } = req.body as { immediate?: boolean };
      const subscription = await StripeService.cancelSubscription(ownedSubId, immediate);

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
   * Cria uma Stripe Checkout Session — fluxo recomendado para novos
   * assinantes. Backend cria a session e retorna a URL. Cliente faz
   * window.location.href = url para ir à página hospedada do Stripe,
   * onde o cartão é coletado com PCI compliance nativa. Após sucesso,
   * Stripe redireciona para success_url e o webhook checkout.session.completed
   * finaliza a persistência no DB.
   */
  app.post(
    '/api/payments/stripe/create-checkout-session',
    paymentMutationLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new AuthError();

      const { priceId, successUrl, cancelUrl } = req.body as {
        priceId?: string;
        successUrl?: string;
        cancelUrl?: string;
      };

      if (!priceId) {
        res.status(400).json({ error: 'priceId is required' });
        return;
      }

      const tenantId = req.user.tenantId;
      const tenant = await storage.getTenantById(tenantId);
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      // Validar que priceId existe em algum plano ativo (anti-abuse)
      const allPlans = await storage.getActivePlans();
      const plan = allPlans.find(
        (p: Record<string, unknown>) =>
          p.stripePriceId === priceId || p.stripeYearlyPriceId === priceId,
      );
      if (!plan) {
        res.status(400).json({ error: 'Invalid priceId' });
        return;
      }

      // Bloqueia criacao de checkout se tenant ja tem subscription ativa.
      // Usuario deve usar o Customer Portal para upgrade/downgrade.
      const existingSub = await storage.getTenantSubscription(tenantId);
      if (
        existingSub &&
        ['active', 'trial', 'trialing', 'past_due'].includes(
          String(existingSub.status || ''),
        ) &&
        (existingSub.metadata as Record<string, unknown> | undefined)
          ?.stripeSubscriptionId
      ) {
        res.status(409).json({
          error:
            'Você já possui uma assinatura ativa. Use "Gerenciar no portal" em /settings/billing para mudar de plano.',
          code: 'subscription_already_active',
          currentStatus: existingSub.status,
        });
        return;
      }

      let customerId = existingSub?.metadata?.stripeCustomerId as
        | string
        | undefined;
      if (!customerId) {
        const customer = await StripeService.createCustomer({
          email: tenant.email || req.user.email,
          name: tenant.name,
          tenantId,
        });
        customerId = customer.id;
        await storage.updateTenantSubscription(tenantId, {
          metadata: { stripeCustomerId: customerId },
        });
      }

      const appUrl =
        process.env.APP_URL ||
        process.env.VITE_APP_URL ||
        'https://imobibase.com.br';

      const session = await StripeService.createCheckoutSession({
        customerId,
        priceId,
        tenantId,
        successUrl:
          successUrl ||
          `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${appUrl}/checkout/cancel`,
        trialPeriodDays:
          (plan as Record<string, unknown>).trialDays as number | undefined,
      });

      res.json({ sessionId: session.id, url: session.url });
    }),
  );

  /**
   * Cria Billing Portal Session — unica URL onde o cliente faz TUDO:
   * upgrade, downgrade, atualizar cartao, cancelar, reativar, ver faturas.
   * Requer que o tenant ja tenha um stripeCustomerId (vira do Checkout).
   */
  app.post(
    '/api/payments/stripe/create-portal-session',
    paymentMutationLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new AuthError();

      const tenantId = req.user.tenantId;
      const subscription = await storage.getTenantSubscription(tenantId);
      const customerId = subscription?.metadata?.stripeCustomerId as
        | string
        | undefined;

      if (!customerId) {
        res.status(404).json({
          error:
            'Nenhuma assinatura encontrada. Complete o checkout antes de acessar o portal.',
        });
        return;
      }

      const appUrl =
        process.env.APP_URL ||
        process.env.VITE_APP_URL ||
        'https://imobibase.com.br';

      const session = await StripeService.createPortalSession({
        customerId,
        returnUrl: `${appUrl}/settings/billing`,
      });

      res.json({ url: session.url });
    }),
  );

  /**
   * Reativa uma assinatura que foi agendada para cancelar no fim do periodo
   * (cancel_at_period_end=true).
   *
   * IDOR protection: usa SOMENTE a subscription do tenant autenticado (via
   * metadata.stripeSubscriptionId). body.subscriptionId e ignorado.
   */
  app.post(
    '/api/payments/stripe/reactivate-subscription',
    paymentMutationLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      if (!req.user) throw new AuthError();

      const tenantId = req.user.tenantId;
      const tenantSub = await storage.getTenantSubscription(tenantId);
      const ownedSubId = (tenantSub?.metadata as Record<string, unknown> | undefined)
        ?.stripeSubscriptionId as string | undefined;
      if (!ownedSubId) {
        res.status(404).json({
          error: 'Nenhuma assinatura encontrada para reativar.',
        });
        return;
      }

      const subscription =
        await StripeService.reactivateSubscription(ownedSubId);
      res.json({
        subscriptionId: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      });
    }),
  );

  /**
   * Update payment method
   */
  app.post('/api/payments/stripe/update-payment-method', paymentMutationLimiter, async (req: Request, res: Response) => {
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
      const metadata = (subscription.metadata || {}) as Record<string, unknown>;

      res.json({
        status: subscription.status,
        plan: plan?.name || 'Unknown',
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
        cancelledAt: subscription.cancelledAt,
        subscriptionId:
          (metadata.stripeSubscriptionId as string | undefined) || null,
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
  app.post('/api/payments/mercadopago/create-pix', paymentMutationLimiter, idempotencyCheck, async (req: Request, res: Response) => {
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
  app.post('/api/payments/mercadopago/create-boleto', paymentMutationLimiter, idempotencyCheck, async (req: Request, res: Response) => {
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
