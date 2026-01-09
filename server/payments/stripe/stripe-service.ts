/**
 * Stripe Service
 * Handles all Stripe payment operations
 */

import Stripe from 'stripe';
import type {
  StripeCustomerData,
  StripeSubscriptionData,
  StripeInvoiceData,
  StripePaymentMethodData,
  StripeSubscriptionUpdateData,
} from './stripe-types';
import * as Sentry from '@sentry/node';

// Initialize Stripe with API key from environment (or dummy key for development)
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_development_only';
const stripe = new Stripe(stripeKey, {
  // apiVersion: '2024-12-18.acacia', // TODO: Update when Stripe updates types
  typescript: true,
});

export class StripeService {
  /**
   * Create a new Stripe customer
   */
  static async createCustomer(data: StripeCustomerData): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          tenantId: data.tenantId,
          ...data.metadata,
        },
      });

      return customer;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'createCustomer' },
        extra: { email: data.email, tenantId: data.tenantId },
      });
      throw new Error(`Failed to create Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'getCustomer' },
        extra: { customerId },
      });
      throw new Error(`Failed to retrieve Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update customer information
   */
  static async updateCustomer(
    customerId: string,
    data: Partial<StripeCustomerData>
  ): Promise<Stripe.Customer> {
    try {
      const customer = await stripe.customers.update(customerId, {
        email: data.email,
        name: data.name,
        metadata: data.metadata,
      });
      return customer;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'updateCustomer' },
        extra: { customerId },
      });
      throw new Error(`Failed to update Stripe customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a subscription for a customer
   */
  static async createSubscription(data: StripeSubscriptionData): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: data.customerId,
        items: [{ price: data.priceId }],
        trial_period_days: data.trialPeriodDays,
        metadata: data.metadata,
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      return subscription;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'createSubscription' },
        extra: { customerId: data.customerId, priceId: data.priceId },
      });
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a subscription
   */
  static async updateSubscription(data: StripeSubscriptionUpdateData): Promise<Stripe.Subscription> {
    try {
      const updateData: Stripe.SubscriptionUpdateParams = {
        metadata: data.metadata,
      };

      if (data.priceId) {
        const subscription = await stripe.subscriptions.retrieve(data.subscriptionId);
        updateData.items = [
          {
            id: subscription.items.data[0].id,
            price: data.priceId,
          },
        ];
      }

      if (data.cancelAtPeriodEnd !== undefined) {
        updateData.cancel_at_period_end = data.cancelAtPeriodEnd;
      }

      const subscription = await stripe.subscriptions.update(data.subscriptionId, updateData);
      return subscription;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'updateSubscription' },
        extra: { subscriptionId: data.subscriptionId },
      });
      throw new Error(`Failed to update subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(subscriptionId: string, immediate = false): Promise<Stripe.Subscription> {
    try {
      if (immediate) {
        const subscription = await stripe.subscriptions.cancel(subscriptionId);
        return subscription;
      } else {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
        return subscription;
      }
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'cancelSubscription' },
        extra: { subscriptionId, immediate },
      });
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get subscription by ID
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'getSubscription' },
        extra: { subscriptionId },
      });
      throw new Error(`Failed to retrieve subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Attach payment method to customer
   */
  static async attachPaymentMethod(data: StripePaymentMethodData): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(data.paymentMethodId, {
        customer: data.customerId,
      });

      // Set as default payment method
      await stripe.customers.update(data.customerId, {
        invoice_settings: {
          default_payment_method: data.paymentMethodId,
        },
      });

      return paymentMethod;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'attachPaymentMethod' },
        extra: { customerId: data.customerId },
      });
      throw new Error(`Failed to attach payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detach payment method from customer
   */
  static async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);
      return paymentMethod;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'detachPaymentMethod' },
        extra: { paymentMethodId },
      });
      throw new Error(`Failed to detach payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List customer payment methods
   */
  static async listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return paymentMethods.data;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'listPaymentMethods' },
        extra: { customerId },
      });
      throw new Error(`Failed to list payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create an invoice for a customer
   */
  static async createInvoice(data: StripeInvoiceData): Promise<Stripe.Invoice> {
    try {
      // Create invoice item
      await stripe.invoiceItems.create({
        customer: data.customerId,
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency,
        description: data.description,
        metadata: data.metadata,
      });

      // Create and finalize invoice
      const invoice = await stripe.invoices.create({
        customer: data.customerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata: data.metadata,
      });

      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);
      return finalizedInvoice;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'createInvoice' },
        extra: { customerId: data.customerId, amount: data.amount },
      });
      throw new Error(`Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invoice by ID
   */
  static async getInvoice(invoiceId: string): Promise<Stripe.Invoice> {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'getInvoice' },
        extra: { invoiceId },
      });
      throw new Error(`Failed to retrieve invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List customer invoices
   */
  static async listInvoices(customerId: string, limit = 10): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit,
      });
      return invoices.data;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'listInvoices' },
        extra: { customerId },
      });
      throw new Error(`Failed to list invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a payment intent
   */
  static async createPaymentIntent(
    amount: number,
    currency: string,
    customerId?: string,
    metadata?: Record<string, string>
  ): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        metadata,
        automatic_payment_methods: { enabled: true },
      });
      return paymentIntent;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'createPaymentIntent' },
        extra: { amount, currency, customerId },
      });
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(payload: Buffer | string, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return event;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'stripe', operation: 'verifyWebhookSignature' },
      });
      throw new Error(`Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default StripeService;
