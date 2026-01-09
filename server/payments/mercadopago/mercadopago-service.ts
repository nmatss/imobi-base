// @ts-nocheck
/**
 * Mercado Pago Service
 * Handles Mercado Pago payment operations (PIX, Boleto, Credit Card)
 */

import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import * as Sentry from '@sentry/node';

// Initialize Mercado Pago client
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
  options: { timeout: 5000 },
});

const payment = new Payment(client);
const preference = new Preference(client);

export interface MercadoPagoPixData {
  amount: number;
  description: string;
  email: string;
  cpfCnpj: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

export interface MercadoPagoBoletoData {
  amount: number;
  description: string;
  email: string;
  cpfCnpj: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

export interface MercadoPagoCreditCardData {
  amount: number;
  description: string;
  email: string;
  token: string;
  installments: number;
  tenantId: string;
  metadata?: Record<string, any>;
}

export interface MercadoPagoPaymentStatus {
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  dateCreated: string;
  dateApproved?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  boletoUrl?: string;
}

export class MercadoPagoService {
  /**
   * Create PIX payment
   */
  static async createPixPayment(data: MercadoPagoPixData): Promise<MercadoPagoPaymentStatus> {
    try {
      // Clean CPF/CNPJ first, then check length
      const cleanedCpfCnpj = data.cpfCnpj.replace(/\D/g, '');

      const paymentData = {
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: 'pix',
        payer: {
          email: data.email,
          identification: {
            type: cleanedCpfCnpj.length <= 11 ? 'CPF' : 'CNPJ',
            number: cleanedCpfCnpj,
          },
        },
        metadata: {
          tenant_id: data.tenantId,
          ...data.metadata,
        },
      };

      const result = await payment.create({ body: paymentData });

      return {
        id: result.id!.toString(),
        status: result.status || 'pending',
        statusDetail: result.status_detail || '',
        transactionAmount: result.transaction_amount || 0,
        dateCreated: result.date_created || new Date().toISOString(),
        dateApproved: result.date_approved || undefined,
        qrCode: result.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'createPixPayment' },
        extra: { amount: data.amount, tenantId: data.tenantId },
      });
      throw new Error(`Failed to create PIX payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Boleto payment
   */
  static async createBoletoPayment(data: MercadoPagoBoletoData): Promise<MercadoPagoPaymentStatus> {
    try {
      // Clean CPF/CNPJ first, then check length
      const cleanedCpfCnpj = data.cpfCnpj.replace(/\D/g, '');

      const paymentData = {
        transaction_amount: data.amount,
        description: data.description,
        payment_method_id: 'bolbradesco',
        payer: {
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          identification: {
            type: cleanedCpfCnpj.length <= 11 ? 'CPF' : 'CNPJ',
            number: cleanedCpfCnpj,
          },
        },
        metadata: {
          tenant_id: data.tenantId,
          ...data.metadata,
        },
      };

      const result = await payment.create({ body: paymentData });

      return {
        id: result.id!.toString(),
        status: result.status || 'pending',
        statusDetail: result.status_detail || '',
        transactionAmount: result.transaction_amount || 0,
        dateCreated: result.date_created || new Date().toISOString(),
        dateApproved: result.date_approved || undefined,
        boletoUrl: result.transaction_details?.external_resource_url,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'createBoletoPayment' },
        extra: { amount: data.amount, tenantId: data.tenantId },
      });
      throw new Error(`Failed to create Boleto payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create credit card payment
   */
  static async createCreditCardPayment(data: MercadoPagoCreditCardData): Promise<MercadoPagoPaymentStatus> {
    try {
      const paymentData = {
        transaction_amount: data.amount,
        description: data.description,
        token: data.token,
        installments: data.installments,
        payment_method_id: 'visa', // This should be determined from the token
        payer: {
          email: data.email,
        },
        metadata: {
          tenant_id: data.tenantId,
          ...data.metadata,
        },
      };

      const result = await payment.create({ body: paymentData });

      return {
        id: result.id!.toString(),
        status: result.status || 'pending',
        statusDetail: result.status_detail || '',
        transactionAmount: result.transaction_amount || 0,
        dateCreated: result.date_created || new Date().toISOString(),
        dateApproved: result.date_approved || undefined,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'createCreditCardPayment' },
        extra: { amount: data.amount, tenantId: data.tenantId },
      });
      throw new Error(`Failed to create credit card payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment status
   */
  static async getPaymentStatus(paymentId: string): Promise<MercadoPagoPaymentStatus> {
    try {
      const result = await payment.get({ id: paymentId });

      return {
        id: result.id!.toString(),
        status: result.status || 'pending',
        statusDetail: result.status_detail || '',
        transactionAmount: result.transaction_amount || 0,
        dateCreated: result.date_created || new Date().toISOString(),
        dateApproved: result.date_approved || undefined,
        qrCode: result.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: result.point_of_interaction?.transaction_data?.qr_code_base64,
        boletoUrl: result.transaction_details?.external_resource_url,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'getPaymentStatus' },
        extra: { paymentId },
      });
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel payment
   */
  static async cancelPayment(paymentId: string): Promise<void> {
    try {
      await payment.cancel({ id: paymentId });
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'cancelPayment' },
        extra: { paymentId },
      });
      throw new Error(`Failed to cancel payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create payment preference (for checkout)
   */
  static async createPreference(data: {
    items: Array<{
      title: string;
      quantity: number;
      unit_price: number;
    }>;
    payer?: {
      email?: string;
      name?: string;
    };
    metadata?: Record<string, any>;
    backUrls?: {
      success: string;
      failure: string;
      pending: string;
    };
  }): Promise<{ id: string; initPoint: string }> {
    try {
      const result = await preference.create({
        body: {
          items: data.items,
          payer: data.payer,
          metadata: data.metadata,
          back_urls: data.backUrls,
          auto_return: 'approved',
          notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,
        },
      });

      return {
        id: result.id!,
        initPoint: result.init_point!,
      };
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'createPreference' },
      });
      throw new Error(`Failed to create preference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(xSignature: string, xRequestId: string, dataId: string): boolean {
    try {
      // Mercado Pago webhook verification
      // The signature format is: ts={timestamp},v1={hash}
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

      if (!secret) {
        console.warn('Mercado Pago webhook secret not configured');
        return true; // Allow webhooks if secret not configured
      }

      // Parse signature
      const parts = xSignature.split(',');
      const tsMatch = parts.find(p => p.startsWith('ts='));
      const v1Match = parts.find(p => p.startsWith('v1='));

      if (!tsMatch || !v1Match) {
        return false;
      }

      const timestamp = tsMatch.split('=')[1];
      const hash = v1Match.split('=')[1];

      // Create signature
      const crypto = require('crypto');
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const expectedHash = hmac.digest('hex');

      return hash === expectedHash;
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'verifyWebhookSignature' },
      });
      return false;
    }
  }
}

export default MercadoPagoService;
