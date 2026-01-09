// @ts-nocheck
/**
 * MercadoPago Service Tests
 * Tests for MercadoPago payment integration (PIX, Boleto, Credit Card)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as Sentry from '@sentry/node';

// Create shared mock functions that will be reused
const mockPaymentCreate = vi.fn();
const mockPaymentGet = vi.fn();
const mockPaymentCancel = vi.fn();
const mockPreferenceCreate = vi.fn();

// Mock MercadoPago SDK
vi.mock('mercadopago', () => {
  return {
    MercadoPagoConfig: vi.fn().mockImplementation(function() {}),
    Payment: vi.fn().mockImplementation(function() {
      return {
        create: (...args: any[]) => mockPaymentCreate(...args),
        get: (...args: any[]) => mockPaymentGet(...args),
        cancel: (...args: any[]) => mockPaymentCancel(...args),
      };
    }),
    Preference: vi.fn().mockImplementation(function() {
      return {
        create: (...args: any[]) => mockPreferenceCreate(...args),
      };
    }),
  };
});

vi.mock('@sentry/node');

// Import after mocking
import { MercadoPagoService } from '../mercadopago/mercadopago-service';

describe('MercadoPagoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createPixPayment', () => {
    it('should create PIX payment successfully with CPF', async () => {
      const mockResult = {
        id: 123456789,
        status: 'pending',
        status_detail: 'pending_waiting_payment',
        transaction_amount: 100.00,
        date_created: '2025-12-25T10:00:00Z',
        point_of_interaction: {
          transaction_data: {
            qr_code: 'pix_qr_code_string',
            qr_code_base64: 'base64_encoded_qr',
          },
        },
      };

      mockPaymentCreate.mockResolvedValue(mockResult);

      const result = await MercadoPagoService.createPixPayment({
        amount: 100.00,
        description: 'Test PIX payment',
        email: 'test@example.com',
        cpfCnpj: '123.456.789-00',
        tenantId: 'tenant_1',
        metadata: { orderId: 'order_123' },
      });

      expect(result).toEqual({
        id: '123456789',
        status: 'pending',
        statusDetail: 'pending_waiting_payment',
        transactionAmount: 100.00,
        dateCreated: '2025-12-25T10:00:00Z',
        qrCode: 'pix_qr_code_string',
        qrCodeBase64: 'base64_encoded_qr',
      });

      expect(mockPaymentCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          transaction_amount: 100.00,
          description: 'Test PIX payment',
          payment_method_id: 'pix',
          payer: {
            email: 'test@example.com',
            identification: {
              type: 'CPF',
              number: '12345678900',
            },
          },
          metadata: {
            tenant_id: 'tenant_1',
            orderId: 'order_123',
          },
        }),
      });
    });

    it('should create PIX payment with CNPJ', async () => {
      mockPaymentCreate.mockResolvedValue({
        id: 987654321,
        status: 'pending',
        transaction_amount: 500.00,
        date_created: '2025-12-25T10:00:00Z',
      });

      await MercadoPagoService.createPixPayment({
        amount: 500.00,
        description: 'Corporate payment',
        email: 'company@example.com',
        cpfCnpj: '12.345.678/0001-90',
        tenantId: 'tenant_2',
      });

      expect(mockPaymentCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          payer: expect.objectContaining({
            identification: {
              type: 'CNPJ',
              number: '12345678000190',
            },
          }),
        }),
      });
    });

    it('should handle PIX payment creation errors', async () => {
      const error = new Error('MercadoPago API error');
      mockPaymentCreate.mockRejectedValue(error);

      await expect(
        MercadoPagoService.createPixPayment({
          amount: 100.00,
          description: 'Test',
          email: 'test@example.com',
          cpfCnpj: '12345678900',
          tenantId: 'tenant_1',
        })
      ).rejects.toThrow('Failed to create PIX payment');

      expect(Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          tags: { service: 'mercadopago', operation: 'createPixPayment' },
        })
      );
    });
  });

  describe('createBoletoPayment', () => {
    it('should create Boleto payment successfully', async () => {
      const mockResult = {
        id: 111222333,
        status: 'pending',
        status_detail: 'pending_waiting_payment',
        transaction_amount: 250.00,
        date_created: '2025-12-25T10:00:00Z',
        transaction_details: {
          external_resource_url: 'https://boleto.url/pay',
        },
      };

      mockPaymentCreate.mockResolvedValue(mockResult);

      const result = await MercadoPagoService.createBoletoPayment({
        amount: 250.00,
        description: 'Boleto payment',
        email: 'customer@example.com',
        cpfCnpj: '123.456.789-00',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: 'tenant_1',
      });

      expect(result).toEqual({
        id: '111222333',
        status: 'pending',
        statusDetail: 'pending_waiting_payment',
        transactionAmount: 250.00,
        dateCreated: '2025-12-25T10:00:00Z',
        boletoUrl: 'https://boleto.url/pay',
      });

      expect(mockPaymentCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          transaction_amount: 250.00,
          payment_method_id: 'bolbradesco',
          payer: expect.objectContaining({
            email: 'customer@example.com',
            first_name: 'John',
            last_name: 'Doe',
          }),
        }),
      });
    });

    it('should handle Boleto creation errors', async () => {
      const error = new Error('Invalid payment data');
      mockPaymentCreate.mockRejectedValue(error);

      await expect(
        MercadoPagoService.createBoletoPayment({
          amount: 100,
          description: 'Test',
          email: 'test@example.com',
          cpfCnpj: '12345678900',
          firstName: 'Test',
          lastName: 'User',
          tenantId: 'tenant_1',
        })
      ).rejects.toThrow('Failed to create Boleto payment');
    });
  });

  describe('createCreditCardPayment', () => {
    it('should create credit card payment successfully', async () => {
      const mockResult = {
        id: 444555666,
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 150.00,
        date_created: '2025-12-25T10:00:00Z',
        date_approved: '2025-12-25T10:00:05Z',
      };

      mockPaymentCreate.mockResolvedValue(mockResult);

      const result = await MercadoPagoService.createCreditCardPayment({
        amount: 150.00,
        description: 'Credit card payment',
        email: 'customer@example.com',
        token: 'card_token_123',
        installments: 3,
        tenantId: 'tenant_1',
      });

      expect(result).toEqual({
        id: '444555666',
        status: 'approved',
        statusDetail: 'accredited',
        transactionAmount: 150.00,
        dateCreated: '2025-12-25T10:00:00Z',
        dateApproved: '2025-12-25T10:00:05Z',
      });

      expect(mockPaymentCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          transaction_amount: 150.00,
          token: 'card_token_123',
          installments: 3,
        }),
      });
    });

    it('should handle credit card payment errors', async () => {
      const error = new Error('Card declined');
      mockPaymentCreate.mockRejectedValue(error);

      await expect(
        MercadoPagoService.createCreditCardPayment({
          amount: 100,
          description: 'Test',
          email: 'test@example.com',
          token: 'invalid_token',
          installments: 1,
          tenantId: 'tenant_1',
        })
      ).rejects.toThrow('Failed to create credit card payment');
    });
  });

  describe('getPaymentStatus', () => {
    it('should retrieve payment status successfully', async () => {
      const mockPaymentData = {
        id: 123456789,
        status: 'approved',
        status_detail: 'accredited',
        transaction_amount: 100.00,
        date_created: '2025-12-25T10:00:00Z',
        date_approved: '2025-12-25T10:05:00Z',
      };

      mockPaymentGet.mockResolvedValue(mockPaymentData);

      const result = await MercadoPagoService.getPaymentStatus('123456789');

      expect(result).toEqual({
        id: '123456789',
        status: 'approved',
        statusDetail: 'accredited',
        transactionAmount: 100.00,
        dateCreated: '2025-12-25T10:00:00Z',
        dateApproved: '2025-12-25T10:05:00Z',
      });

      expect(mockPaymentGet).toHaveBeenCalledWith({ id: '123456789' });
    });

    it('should handle get payment errors', async () => {
      const error = new Error('Payment not found');
      mockPaymentGet.mockRejectedValue(error);

      await expect(
        MercadoPagoService.getPaymentStatus('invalid_id')
      ).rejects.toThrow('Failed to get payment status');

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('cancelPayment', () => {
    it('should cancel payment successfully', async () => {
      mockPaymentCancel.mockResolvedValue({});

      await MercadoPagoService.cancelPayment('123456789');

      expect(mockPaymentCancel).toHaveBeenCalledWith({ id: '123456789' });
    });

    it('should handle cancellation errors', async () => {
      const error = new Error('Cannot cancel approved payment');
      mockPaymentCancel.mockRejectedValue(error);

      await expect(
        MercadoPagoService.cancelPayment('123456789')
      ).rejects.toThrow('Failed to cancel payment');

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('createPreference', () => {
    it('should create payment preference successfully', async () => {
      const mockResult = {
        id: 'pref_123456',
        init_point: 'https://mercadopago.com/checkout/pref_123456',
      };

      mockPreferenceCreate.mockResolvedValue(mockResult);

      const result = await MercadoPagoService.createPreference({
        items: [
          {
            title: 'Product 1',
            quantity: 2,
            unit_price: 50.00,
          },
        ],
        payer: {
          email: 'buyer@example.com',
          name: 'Buyer Name',
        },
        metadata: { orderId: 'order_123' },
        backUrls: {
          success: 'https://example.com/success',
          failure: 'https://example.com/failure',
          pending: 'https://example.com/pending',
        },
      });

      expect(result).toEqual({
        id: 'pref_123456',
        initPoint: 'https://mercadopago.com/checkout/pref_123456',
      });

      expect(mockPreferenceCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              title: 'Product 1',
              quantity: 2,
              unit_price: 50.00,
            }),
          ]),
          auto_return: 'approved',
        }),
      });
    });

    it('should handle preference creation errors', async () => {
      const error = new Error('Invalid preference data');
      mockPreferenceCreate.mockRejectedValue(error);

      await expect(
        MercadoPagoService.createPreference({
          items: [],
        })
      ).rejects.toThrow('Failed to create preference');

      expect(Sentry.captureException).toHaveBeenCalled();
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature successfully', () => {
      const crypto = require('crypto');
      const secret = 'webhook_secret';
      const dataId = 'payment_123';
      const requestId = 'req_456';
      const timestamp = '1640000000';

      // Generate valid signature
      const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const hash = hmac.digest('hex');

      process.env.MERCADOPAGO_WEBHOOK_SECRET = secret;

      const xSignature = `ts=${timestamp},v1=${hash}`;
      const result = MercadoPagoService.verifyWebhookSignature(
        xSignature,
        requestId,
        dataId
      );

      expect(result).toBe(true);
    });

    it('should reject invalid signature', () => {
      process.env.MERCADOPAGO_WEBHOOK_SECRET = 'webhook_secret';

      const result = MercadoPagoService.verifyWebhookSignature(
        'ts=1640000000,v1=invalid_hash',
        'req_123',
        'payment_123'
      );

      expect(result).toBe(false);
    });

    it('should allow webhooks when secret not configured', () => {
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET;

      const result = MercadoPagoService.verifyWebhookSignature(
        'any_signature',
        'req_123',
        'payment_123'
      );

      expect(result).toBe(true);
    });

    it('should reject malformed signature', () => {
      process.env.MERCADOPAGO_WEBHOOK_SECRET = 'secret';

      const result = MercadoPagoService.verifyWebhookSignature(
        'invalid_format',
        'req_123',
        'payment_123'
      );

      expect(result).toBe(false);
    });
  });
});
