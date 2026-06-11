/**
 * Mercado Pago Service
 * Handles Mercado Pago payment operations (PIX, Boleto, Credit Card)
 */

import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import * as Sentry from '@sentry/node';
import crypto from 'crypto';

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
  metadata?: Record<string, unknown>;
}

export interface MercadoPagoBoletoData {
  amount: number;
  description: string;
  email: string;
  cpfCnpj: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface MercadoPagoCreditCardData {
  amount: number;
  description: string;
  email: string;
  token: string;
  installments: number;
  tenantId: string;
  /**
   * Optional card brand (payment_method_id), e.g. 'visa', 'master', 'amex'.
   * MercadoPago resolves the brand from the card token automatically, so this
   * should only be passed when the caller already knows it (from the
   * CardForm/SDK that generated the token). NEVER hardcode a brand: an
   * incorrect payment_method_id makes MercadoPago reject the payment.
   */
  paymentMethodId?: string;
  metadata?: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
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
      // payment_method_id (card brand) is derived by MercadoPago from the card
      // token. We only forward it when the caller explicitly provides it from
      // the validated input — never hardcode a brand, since a wrong brand makes
      // MercadoPago reject the payment.
      const paymentData: {
        transaction_amount: number;
        description: string;
        token: string;
        installments: number;
        payment_method_id?: string;
        payer: { email: string };
        metadata: Record<string, unknown>;
      } = {
        transaction_amount: data.amount,
        description: data.description,
        token: data.token,
        installments: data.installments,
        payer: {
          email: data.email,
        },
        metadata: {
          tenant_id: data.tenantId,
          ...data.metadata,
        },
      };

      if (data.paymentMethodId) {
        paymentData.payment_method_id = data.paymentMethodId;
      }

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
        metadata: result.metadata,
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
      id: string;
      title: string;
      quantity: number;
      unit_price: number;
    }>;
    payer?: {
      email?: string;
      name?: string;
    };
    metadata?: Record<string, unknown>;
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
   * Verify webhook signature (FAIL-CLOSED).
   *
   * MercadoPago signs webhooks with HMAC-SHA256 over the manifest
   * `id:<dataId>;request-id:<xRequestId>;ts:<timestamp>;`. The x-signature
   * header carries `ts=<timestamp>,v1=<hash>`.
   *
   * Security posture:
   * - If the secret is missing in production, we REJECT (return false). A
   *   misconfigured secret must never silently accept unauthenticated
   *   webhooks (which could forge "approved" payments). Outside production we
   *   reject as well but emit a louder warning so local/dev setups surface it.
   * - The hash comparison uses crypto.timingSafeEqual with a length guard to
   *   avoid timing side-channels.
   */
  static verifyWebhookSignature(xSignature: string, xRequestId: string, dataId: string): boolean {
    try {
      // The signature format is: ts={timestamp},v1={hash}
      const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';

      if (!secret) {
        // FAIL-CLOSED: never accept webhooks without a configured secret.
        const message = 'MercadoPago webhook secret not configured — rejecting webhook';
        console.error(message);
        Sentry.captureMessage(message, {
          level: 'error',
          tags: { service: 'mercadopago', operation: 'verifyWebhookSignature' },
        });
        return false;
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

      if (!timestamp || !hash) {
        return false;
      }

      // Create expected signature
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${timestamp};`;
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(manifest);
      const expectedHash = hmac.digest('hex');

      // Constant-time comparison with length guard. timingSafeEqual throws if
      // the buffers differ in length, so we guard first (and the guard itself
      // does not leak meaningful timing because both values are hex of fixed
      // size when valid).
      const hashBuffer = Buffer.from(hash, 'hex');
      const expectedBuffer = Buffer.from(expectedHash, 'hex');

      if (hashBuffer.length !== expectedBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(hashBuffer, expectedBuffer);
    } catch (error) {
      Sentry.captureException(error, {
        tags: { service: 'mercadopago', operation: 'verifyWebhookSignature' },
      });
      return false;
    }
  }
}

export default MercadoPagoService;
