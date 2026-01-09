/**
 * Stripe Service Tests
 * Tests for Stripe payment integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/node';

// Mock Sentry
vi.mock('@sentry/node');

// Mock Stripe - must be defined inline in the factory to avoid hoisting issues
vi.mock('stripe', () => {
  const mockStripeInstance = {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    subscriptions: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
    },
    paymentMethods: {
      attach: vi.fn(),
      detach: vi.fn(),
      list: vi.fn(),
    },
    invoices: {
      create: vi.fn(),
      retrieve: vi.fn(),
      list: vi.fn(),
      finalizeInvoice: vi.fn(),
    },
    invoiceItems: {
      create: vi.fn(),
    },
    paymentIntents: {
      create: vi.fn(),
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  };

  return {
    default: class MockStripe {
      customers = mockStripeInstance.customers;
      subscriptions = mockStripeInstance.subscriptions;
      paymentMethods = mockStripeInstance.paymentMethods;
      invoices = mockStripeInstance.invoices;
      invoiceItems = mockStripeInstance.invoiceItems;
      paymentIntents = mockStripeInstance.paymentIntents;
      webhooks = mockStripeInstance.webhooks;
    },
  };
});

// Import service AFTER mocks are set up
import { StripeService } from '../stripe/stripe-service';
import Stripe from 'stripe';

// Get the mocked Stripe instance to access its methods in tests
const getMockStripe = () => {
  const stripe = new (Stripe as any)();
  return stripe;
};

describe('StripeService', () => {
  let mockStripe: any;

  beforeEach(() => {
    // Get the mock instance
    mockStripe = getMockStripe();
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createCustomer', () => {
    it('should create a new Stripe customer successfully', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
        name: 'Test User',
        metadata: { tenantId: 'tenant_1' },
      };

      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      const result = await StripeService.createCustomer({
        email: 'test@example.com',
        name: 'Test User',
        tenantId: 'tenant_1',
      });

      expect(result).toEqual(mockCustomer);
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'Test User',
        metadata: { tenantId: 'tenant_1' },
      });
    });

    it('should handle errors and log to Sentry', async () => {
      const error = new Error('Stripe API error');
      mockStripe.customers.create.mockRejectedValue(error);

      await expect(
        StripeService.createCustomer({
          email: 'test@example.com',
          name: 'Test User',
          tenantId: 'tenant_1',
        })
      ).rejects.toThrow('Failed to create Stripe customer');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { service: 'stripe', operation: 'createCustomer' },
        })
      );
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription successfully', async () => {
      const mockSubscription = {
        id: 'sub_123',
        customer: 'cus_123',
        items: { data: [{ price: { id: 'price_123' } }] },
        status: 'active',
      };

      mockStripe.subscriptions.create.mockResolvedValue(mockSubscription);

      const result = await StripeService.createSubscription({
        customerId: 'cus_123',
        priceId: 'price_123',
        trialPeriodDays: 14,
        metadata: { plan: 'premium' },
      });

      expect(result).toEqual(mockSubscription);
      expect(mockStripe.subscriptions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        items: [{ price: 'price_123' }],
        trial_period_days: 14,
        metadata: { plan: 'premium' },
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });
    });

    it('should handle subscription creation errors', async () => {
      const error = new Error('Invalid price ID');
      mockStripe.subscriptions.create.mockRejectedValue(error);

      await expect(
        StripeService.createSubscription({
          customerId: 'cus_123',
          priceId: 'invalid_price',
        })
      ).rejects.toThrow('Failed to create subscription');

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription metadata', async () => {
      const mockSubscription = {
        id: 'sub_123',
        metadata: { updated: 'true' },
      };

      mockStripe.subscriptions.update.mockResolvedValue(mockSubscription);

      const result = await StripeService.updateSubscription({
        subscriptionId: 'sub_123',
        metadata: { updated: 'true' },
      });

      expect(result).toEqual(mockSubscription);
    });

    it('should update subscription price', async () => {
      const existingSubscription = {
        id: 'sub_123',
        items: { data: [{ id: 'si_123' }] },
      };

      mockStripe.subscriptions.retrieve.mockResolvedValue(existingSubscription);
      mockStripe.subscriptions.update.mockResolvedValue({ ...existingSubscription, updated: true });

      await StripeService.updateSubscription({
        subscriptionId: 'sub_123',
        priceId: 'price_456',
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          items: [{ id: 'si_123', price: 'price_456' }],
        })
      );
    });

    it('should set cancel_at_period_end flag', async () => {
      mockStripe.subscriptions.update.mockResolvedValue({});

      await StripeService.updateSubscription({
        subscriptionId: 'sub_123',
        cancelAtPeriodEnd: true,
      });

      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        'sub_123',
        expect.objectContaining({
          cancel_at_period_end: true,
        })
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately when immediate=true', async () => {
      const mockCanceled = { id: 'sub_123', status: 'canceled' };
      mockStripe.subscriptions.cancel.mockResolvedValue(mockCanceled);

      const result = await StripeService.cancelSubscription('sub_123', true);

      expect(result).toEqual(mockCanceled);
      expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('should schedule cancellation at period end when immediate=false', async () => {
      const mockUpdated = { id: 'sub_123', cancel_at_period_end: true };
      mockStripe.subscriptions.update.mockResolvedValue(mockUpdated);

      const result = await StripeService.cancelSubscription('sub_123', false);

      expect(result).toEqual(mockUpdated);
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach payment method and set as default', async () => {
      const mockPaymentMethod = { id: 'pm_123', customer: 'cus_123' };
      mockStripe.paymentMethods.attach.mockResolvedValue(mockPaymentMethod);
      mockStripe.customers.update.mockResolvedValue({});

      const result = await StripeService.attachPaymentMethod({
        paymentMethodId: 'pm_123',
        customerId: 'cus_123',
      });

      expect(result).toEqual(mockPaymentMethod);
      expect(mockStripe.paymentMethods.attach).toHaveBeenCalledWith('pm_123', {
        customer: 'cus_123',
      });
      expect(mockStripe.customers.update).toHaveBeenCalledWith('cus_123', {
        invoice_settings: {
          default_payment_method: 'pm_123',
        },
      });
    });
  });

  describe('createInvoice', () => {
    it('should create and finalize invoice', async () => {
      const mockInvoice = { id: 'in_123' };
      const mockFinalizedInvoice = { id: 'in_123', status: 'open' };

      mockStripe.invoiceItems.create.mockResolvedValue({});
      mockStripe.invoices.create.mockResolvedValue(mockInvoice);
      mockStripe.invoices.finalizeInvoice.mockResolvedValue(mockFinalizedInvoice);

      const result = await StripeService.createInvoice({
        customerId: 'cus_123',
        amount: 100.50,
        currency: 'usd',
        description: 'Test invoice',
        metadata: { orderId: 'order_123' },
      });

      expect(result).toEqual(mockFinalizedInvoice);
      expect(mockStripe.invoiceItems.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        amount: 10050, // 100.50 * 100 (cents)
        currency: 'usd',
        description: 'Test invoice',
        metadata: { orderId: 'order_123' },
      });
    });
  });

  describe('createPaymentIntent', () => {
    it('should create payment intent with correct amount conversion', async () => {
      const mockPaymentIntent = { id: 'pi_123', amount: 5000, currency: 'usd' };
      mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent);

      const result = await StripeService.createPaymentIntent(
        50.00,
        'usd',
        'cus_123',
        { orderId: 'order_123' }
      );

      expect(result).toEqual(mockPaymentIntent);
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000, // 50.00 * 100
        currency: 'usd',
        customer: 'cus_123',
        metadata: { orderId: 'order_123' },
        automatic_payment_methods: { enabled: true },
      });
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature successfully', () => {
      const mockEvent = { type: 'payment_intent.succeeded', data: {} };
      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      const result = StripeService.verifyWebhookSignature(
        'raw_payload',
        'sig_header'
      );

      expect(result).toEqual(mockEvent);
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        'raw_payload',
        'sig_header',
        'whsec_test'
      );
    });

    it('should throw error when webhook secret is not configured', () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      expect(() => {
        StripeService.verifyWebhookSignature('payload', 'signature');
      }).toThrow('Stripe webhook secret not configured');
    });

    it('should throw error for invalid signature', () => {
      const error = new Error('Invalid signature');
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw error;
      });

      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

      expect(() => {
        StripeService.verifyWebhookSignature('payload', 'invalid_sig');
      }).toThrow('Webhook signature verification failed');

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('listPaymentMethods', () => {
    it('should list customer payment methods', async () => {
      const mockPaymentMethods = [
        { id: 'pm_1', type: 'card' },
        { id: 'pm_2', type: 'card' },
      ];

      mockStripe.paymentMethods.list.mockResolvedValue({
        data: mockPaymentMethods,
      });

      const result = await StripeService.listPaymentMethods('cus_123');

      expect(result).toEqual(mockPaymentMethods);
      expect(mockStripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        type: 'card',
      });
    });
  });

  describe('listInvoices', () => {
    it('should list customer invoices with default limit', async () => {
      const mockInvoices = [{ id: 'in_1' }, { id: 'in_2' }];
      mockStripe.invoices.list.mockResolvedValue({ data: mockInvoices });

      const result = await StripeService.listInvoices('cus_123');

      expect(result).toEqual(mockInvoices);
      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 10,
      });
    });

    it('should list invoices with custom limit', async () => {
      mockStripe.invoices.list.mockResolvedValue({ data: [] });

      await StripeService.listInvoices('cus_123', 25);

      expect(mockStripe.invoices.list).toHaveBeenCalledWith({
        customer: 'cus_123',
        limit: 25,
      });
    });
  });

  describe('getCustomer', () => {
    it('should retrieve customer by ID', async () => {
      const mockCustomer = { id: 'cus_123', email: 'test@example.com' };
      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer);

      const result = await StripeService.getCustomer('cus_123');

      expect(result).toEqual(mockCustomer);
      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_123');
    });
  });

  describe('getSubscription', () => {
    it('should retrieve subscription by ID', async () => {
      const mockSubscription = { id: 'sub_123', status: 'active' };
      mockStripe.subscriptions.retrieve.mockResolvedValue(mockSubscription);

      const result = await StripeService.getSubscription('sub_123');

      expect(result).toEqual(mockSubscription);
      expect(mockStripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
    });
  });

  describe('getInvoice', () => {
    it('should retrieve invoice by ID', async () => {
      const mockInvoice = { id: 'in_123', status: 'paid' };
      mockStripe.invoices.retrieve.mockResolvedValue(mockInvoice);

      const result = await StripeService.getInvoice('in_123');

      expect(result).toEqual(mockInvoice);
      expect(mockStripe.invoices.retrieve).toHaveBeenCalledWith('in_123');
    });
  });

  describe('detachPaymentMethod', () => {
    it('should detach payment method', async () => {
      const mockPaymentMethod = { id: 'pm_123', customer: null };
      mockStripe.paymentMethods.detach.mockResolvedValue(mockPaymentMethod);

      const result = await StripeService.detachPaymentMethod('pm_123');

      expect(result).toEqual(mockPaymentMethod);
      expect(mockStripe.paymentMethods.detach).toHaveBeenCalledWith('pm_123');
    });
  });
});
