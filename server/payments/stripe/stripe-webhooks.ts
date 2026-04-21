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
 * Idempotencia via Redis SETNX.
 * Retorna true se for a primeira vez que vemos este event.id (deve processar).
 * Retorna false se ja foi processado dentro do TTL (nao processar de novo).
 * Se Redis estiver indisponivel, returns true (fail-open) e deixa o Stripe
 * fazer retry — melhor processar duas vezes que perder evento.
 */
async function markEventAsProcessing(eventId: string): Promise<boolean> {
  if (!process.env.REDIS_URL) return true;
  try {
    const { getRedisClient } = await import('../../cache/redis-client');
    const client = getRedisClient();
    const key = `stripe:webhook:${eventId}`;
    // NX = only set if not exists. EX = expiration in seconds (24h).
    const result = await client.set(key, '1', 'EX', 24 * 60 * 60, 'NX');
    return result === 'OK';
  } catch (err) {
    // Fail-open: se Redis falhar, prossegue e aceita risco de dupla execucao
    console.warn('[stripe-webhook] Idempotency check failed (fail-open):', err);
    Sentry.captureMessage('Stripe webhook idempotency fail-open', {
      level: 'warning',
      extra: { eventId, error: err instanceof Error ? err.message : String(err) },
    });
    return true;
  }
}

/**
 * Marca o evento como falhou para permitir retry.
 * Deleta a chave de idempotencia para que o proximo webhook possa reprocessar.
 */
async function markEventAsFailed(eventId: string): Promise<void> {
  if (!process.env.REDIS_URL) return;
  try {
    const { getRedisClient } = await import('../../cache/redis-client');
    const client = getRedisClient();
    await client.del(`stripe:webhook:${eventId}`);
  } catch (err) {
    console.warn('[stripe-webhook] Failed to clear idempotency key:', err);
  }
}

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

    // Preserva metadata existente (stripeCustomerId vem do checkout) e adiciona
    // stripeSubscriptionId para reactivate/manage operations futuras.
    const existing = await storage.getTenantSubscription(tenantId);
    updateData.metadata = {
      ...((existing?.metadata as Record<string, unknown>) || {}),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    };

    await storage.updateTenantSubscription(tenantId, updateData);

    console.log(`✅ Subscription created for tenant ${tenantId} (sub ${subscription.id})`);
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

    // Preserva metadata existente + garante que subscriptionId esta salvo
    const existing = await storage.getTenantSubscription(tenantId);
    updateData.metadata = {
      ...((existing?.metadata as Record<string, unknown>) || {}),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
    };

    await storage.updateTenantSubscription(tenantId, updateData);

    console.log(`✅ Subscription updated for tenant ${tenantId}, status: ${status}`);

    // Downgrade enforcement: apos atualizar o plano, revoga integracoes excedentes.
    // Roda fora do critical path para nao bloquear a resposta ao Stripe em caso de erro.
    try {
      const { enforceAllPlanLimits } = await import('../../middleware/plan-limits');
      const result = await enforceAllPlanLimits(tenantId);
      if (result.integrationsDisconnected > 0) {
        console.log(
          `[stripe-webhook] Tenant ${tenantId}: ${result.integrationsDisconnected} integration(s) disconnected due to plan change`,
        );
      }
    } catch (enforceError) {
      // Nao propaga — enforcement e safety net, webhook principal ja sucedeu
      console.error('[stripe-webhook] enforceAllPlanLimits failed:', enforceError);
      Sentry.captureException(enforceError, {
        tags: { webhook: 'stripe', event: 'subscription.updated', step: 'enforce' },
        extra: { tenantId },
      });
    }
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
 * Handle checkout.session.completed — disparado imediatamente apos o usuario
 * completar o pagamento na Stripe Checkout Session. E a primeira notificacao
 * que chega (antes mesmo de customer.subscription.created em alguns casos).
 *
 * Garante que o stripeCustomerId seja persistido no tenant_subscriptions
 * mesmo antes do evento de subscription.created chegar. Idempotente: pode
 * rodar junto com subscription.created sem problema.
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  try {
    const tenantId = session.metadata?.tenantId;
    if (!tenantId) {
      console.warn(
        `[stripe-webhook] checkout.session.completed sem tenantId em metadata: ${session.id}`,
      );
      return;
    }

    if (session.mode !== 'subscription') {
      console.log(
        `[stripe-webhook] checkout.session.completed mode=${session.mode} ignorado`,
      );
      return;
    }

    const customerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id;

    if (!customerId) {
      console.warn(
        `[stripe-webhook] checkout.session.completed sem customer: ${session.id}`,
      );
      return;
    }

    // Persiste stripeCustomerId o quanto antes. customer.subscription.created
    // ja atualiza o planId/status; aqui so garantimos que o customerId esta la.
    await storage.updateTenantSubscription(tenantId, {
      metadata: { stripeCustomerId: customerId },
    });

    console.log(
      `✅ Checkout completed for tenant ${tenantId}, customer ${customerId}, session ${session.id}`,
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', event: 'checkout.session.completed' },
      extra: { sessionId: session.id },
    });
    throw error;
  }
}

async function dispatchEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutSessionCompleted(
        event.data.object as Stripe.Checkout.Session,
      );
      break;

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
}

/**
 * Main webhook handler.
 *
 * Pipeline:
 * 1. Valida assinatura (signature) — rejeita 400 se falhar. Stripe nao retenta.
 * 2. Idempotencia via Redis SETNX (24h TTL). Se ja processado, responde 200
 *    imediatamente sem reprocessar (evita racing em replays).
 * 3. Dispatch do handler especifico.
 * 4. Em caso de falha no handler, limpa a chave de idempotencia e responde 500
 *    para que o Stripe faca retry automatico (com backoff exponencial ate 72h).
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  // 1. Signature verification (sincrono, barato — antes de qualquer outra coisa)
  let event: Stripe.Event;
  try {
    event = StripeService.verifyWebhookSignature(
      req.rawBody as Buffer,
      signature as string,
    );
  } catch (error) {
    console.error('[stripe-webhook] Signature verification failed:', error);
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', handler: 'signature' },
    });
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid signature',
    });
    return;
  }

  // 2. Idempotencia — processa cada event.id no maximo uma vez por 24h
  const isNew = await markEventAsProcessing(event.id);
  if (!isNew) {
    console.log(`[stripe-webhook] Duplicate event ignored: ${event.id} (${event.type})`);
    res.json({ received: true, duplicate: true });
    return;
  }

  console.log(`📨 [stripe-webhook] Processing: ${event.type} (${event.id})`);

  // 3. Dispatch + handling
  try {
    await dispatchEvent(event);
    res.json({ received: true });
  } catch (error) {
    console.error(`[stripe-webhook] Handler failed for ${event.type} (${event.id}):`, error);
    Sentry.captureException(error, {
      tags: { webhook: 'stripe', handler: 'dispatch', eventType: event.type },
      extra: { eventId: event.id },
    });
    // Permite retry: limpa a chave de idempotencia e responde com 500
    // para o Stripe disparar o proximo retry (backoff automatico)
    await markEventAsFailed(event.id);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Webhook processing failed',
      eventId: event.id,
    });
  }
}
