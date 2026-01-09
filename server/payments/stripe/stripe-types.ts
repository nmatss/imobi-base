/**
 * Stripe Types and Interfaces
 * Type definitions for Stripe integration
 */

export interface StripeCustomerData {
  email: string;
  name: string;
  tenantId: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscriptionData {
  customerId: string;
  priceId: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface StripeInvoiceData {
  customerId: string;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, string>;
}

export interface StripePaymentMethodData {
  customerId: string;
  paymentMethodId: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}

export interface StripeSubscriptionUpdateData {
  subscriptionId: string;
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

export type StripeEventType =
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'customer.subscription.trial_will_end'
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'
  | 'payment_method.attached'
  | 'payment_method.detached';
