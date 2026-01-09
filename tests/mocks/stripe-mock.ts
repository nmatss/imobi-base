import { vi } from 'vitest';

// Mock Stripe customer
export const mockStripeCustomer = {
  id: 'cus_test123',
  email: 'test@example.com',
  name: 'Test Customer',
  metadata: {},
};

// Mock Stripe subscription
export const mockStripeSubscription = {
  id: 'sub_test123',
  customer: 'cus_test123',
  status: 'active',
  items: {
    data: [
      {
        id: 'si_test123',
        price: {
          id: 'price_test123',
          product: 'prod_test123',
          unit_amount: 9900,
          currency: 'usd',
        },
      },
    ],
  },
  current_period_start: Math.floor(Date.now() / 1000),
  current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
};

// Mock Stripe payment intent
export const mockStripePaymentIntent = {
  id: 'pi_test123',
  amount: 9900,
  currency: 'usd',
  status: 'succeeded',
  customer: 'cus_test123',
};

// Mock Stripe webhook event
export const mockStripeWebhookEvent = (type: string, data: any) => ({
  id: 'evt_test123',
  type,
  data: {
    object: data,
  },
  created: Math.floor(Date.now() / 1000),
});

// Mock Stripe API
export const createMockStripe = () => ({
  customers: {
    create: vi.fn().mockResolvedValue(mockStripeCustomer),
    retrieve: vi.fn().mockResolvedValue(mockStripeCustomer),
    update: vi.fn().mockResolvedValue(mockStripeCustomer),
    del: vi.fn().mockResolvedValue({ id: mockStripeCustomer.id, deleted: true }),
  },
  subscriptions: {
    create: vi.fn().mockResolvedValue(mockStripeSubscription),
    retrieve: vi.fn().mockResolvedValue(mockStripeSubscription),
    update: vi.fn().mockResolvedValue(mockStripeSubscription),
    cancel: vi.fn().mockResolvedValue({ ...mockStripeSubscription, status: 'canceled' }),
    list: vi.fn().mockResolvedValue({
      data: [mockStripeSubscription],
      has_more: false,
    }),
  },
  paymentIntents: {
    create: vi.fn().mockResolvedValue(mockStripePaymentIntent),
    retrieve: vi.fn().mockResolvedValue(mockStripePaymentIntent),
    confirm: vi.fn().mockResolvedValue({ ...mockStripePaymentIntent, status: 'succeeded' }),
  },
  webhooks: {
    constructEvent: vi.fn((payload, signature, secret) => {
      return mockStripeWebhookEvent('customer.subscription.created', mockStripeSubscription);
    }),
  },
  prices: {
    list: vi.fn().mockResolvedValue({
      data: [
        {
          id: 'price_basic',
          product: 'prod_basic',
          unit_amount: 2900,
          currency: 'usd',
        },
        {
          id: 'price_professional',
          product: 'prod_professional',
          unit_amount: 9900,
          currency: 'usd',
        },
      ],
      has_more: false,
    }),
  },
});
