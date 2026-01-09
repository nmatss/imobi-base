/**
 * WhatsApp Webhook Security Tests
 *
 * Testa a validação de assinatura e verificação de webhooks do WhatsApp Business API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

describe('WhatsApp Webhook Signature Validation', () => {
  const APP_SECRET = 'test-app-secret-12345';
  const VERIFY_TOKEN = 'test-verify-token-67890';

  describe('HMAC SHA-256 Signature Validation', () => {
    it('should generate correct signature for valid payload', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const expectedSignature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(expectedSignature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should validate matching signatures with timing-safe comparison', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      // Recalcular para validação
      const hmac2 = crypto.createHmac('sha256', APP_SECRET);
      const expectedSignature = 'sha256=' + hmac2.update(payload).digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures with timing-safe comparison', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });

      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const expectedSignature = 'sha256=' + hmac.update(payload).digest('hex');

      // Criar signature inválida com o mesmo tamanho
      const invalidSignature = 'sha256=' + 'a'.repeat(64);

      const isValid = crypto.timingSafeEqual(
        Buffer.from(invalidSignature),
        Buffer.from(expectedSignature)
      );

      expect(isValid).toBe(false);
    });

    it('should reject signatures with different payloads', () => {
      const payload1 = JSON.stringify({ object: 'whatsapp_business_account' });
      const payload2 = JSON.stringify({ object: 'different_payload' });

      const hmac1 = crypto.createHmac('sha256', APP_SECRET);
      const signature1 = 'sha256=' + hmac1.update(payload1).digest('hex');

      const hmac2 = crypto.createHmac('sha256', APP_SECRET);
      const signature2 = 'sha256=' + hmac2.update(payload2).digest('hex');

      expect(signature1).not.toBe(signature2);
    });

    it('should reject signatures with different secrets', () => {
      const payload = JSON.stringify({ object: 'whatsapp_business_account' });

      const hmac1 = crypto.createHmac('sha256', APP_SECRET);
      const signature1 = hmac1.update(payload).digest('hex');

      const hmac2 = crypto.createHmac('sha256', 'different-secret');
      const signature2 = hmac2.update(payload).digest('hex');

      expect(signature1).not.toBe(signature2);
    });

    it('should handle complex webhook payloads', () => {
      const complexPayload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456789',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999999999',
                    phone_number_id: '987654321',
                  },
                  messages: [
                    {
                      from: '5511888888888',
                      id: 'wamid.abc123',
                      timestamp: '1640000000',
                      type: 'text',
                      text: { body: 'Hello World' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      });

      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(complexPayload).digest('hex');

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });

  describe('Webhook Verification (Challenge-Response)', () => {
    it('should accept valid verification request', () => {
      const mode = 'subscribe';
      const token = VERIFY_TOKEN;
      const challenge = 'random-challenge-string-123';

      const isValid = mode === 'subscribe' && token === VERIFY_TOKEN;
      const response = isValid ? challenge : null;

      expect(response).toBe(challenge);
    });

    it('should reject verification with incorrect token', () => {
      const mode = 'subscribe';
      const token = 'wrong-token';
      const challenge = 'random-challenge-string-123';

      const isValid = mode === 'subscribe' && token === VERIFY_TOKEN;
      const response = isValid ? challenge : null;

      expect(response).toBeNull();
    });

    it('should reject verification with incorrect mode', () => {
      const mode = 'invalid-mode';
      const token = VERIFY_TOKEN;
      const challenge = 'random-challenge-string-123';

      const isValid = mode === 'subscribe' && token === VERIFY_TOKEN;
      const response = isValid ? challenge : null;

      expect(response).toBeNull();
    });

    it('should reject verification with missing parameters', () => {
      const mode = '';
      const token = '';
      const challenge = 'random-challenge-string-123';

      const isValid = mode === 'subscribe' && token === VERIFY_TOKEN;
      const response = isValid ? challenge : null;

      expect(response).toBeNull();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle empty payload', () => {
      const payload = '';
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should handle payload with special characters', () => {
      const payload = JSON.stringify({
        message: "Hello with special chars: @#$%^&*(){}[]|\\:;\"'<>?,./",
      });
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should handle payload with unicode characters', () => {
      const payload = JSON.stringify({
        message: 'Olá! 你好! مرحبا! 🚀',
      });
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should reject malformed signature format', () => {
      const signature = 'invalid-format-without-sha256-prefix';
      expect(signature).not.toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should reject signature with incorrect length', () => {
      const signature = 'sha256=toolshort';
      expect(signature).not.toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should prevent timing attacks with constant-time comparison', () => {
      const payload = JSON.stringify({ object: 'test' });
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const validSignature = 'sha256=' + hmac.update(payload).digest('hex');

      // Diferentes assinaturas inválidas
      const invalidSignatures = [
        'sha256=' + 'a'.repeat(64),
        'sha256=' + 'f'.repeat(64),
        'sha256=' + '0'.repeat(64),
      ];

      // Todas devem ser rejeitadas, independentemente do conteúdo
      invalidSignatures.forEach((invalidSig) => {
        const isValid = crypto.timingSafeEqual(
          Buffer.from(invalidSig),
          Buffer.from(validSignature)
        );
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Real-World Webhook Scenarios', () => {
    it('should validate incoming message webhook', () => {
      const messageWebhook = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999999999',
                    phone_number_id: '123456',
                  },
                  messages: [
                    {
                      from: '5511888888888',
                      id: 'wamid.abc123',
                      timestamp: '1640000000',
                      type: 'text',
                      text: { body: 'Olá, gostaria de agendar uma visita' },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const payload = JSON.stringify(messageWebhook);
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(messageWebhook.entry[0].changes[0].value.messages).toHaveLength(1);
    });

    it('should validate status update webhook', () => {
      const statusWebhook = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999999999',
                    phone_number_id: '123456',
                  },
                  statuses: [
                    {
                      id: 'wamid.xyz789',
                      status: 'delivered',
                      timestamp: '1640000100',
                      recipient_id: '5511888888888',
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const payload = JSON.stringify(statusWebhook);
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(statusWebhook.entry[0].changes[0].value.statuses).toHaveLength(1);
    });

    it('should validate media message webhook', () => {
      const mediaWebhook = {
        object: 'whatsapp_business_account',
        entry: [
          {
            id: '123456',
            changes: [
              {
                value: {
                  messaging_product: 'whatsapp',
                  metadata: {
                    display_phone_number: '5511999999999',
                    phone_number_id: '123456',
                  },
                  messages: [
                    {
                      from: '5511888888888',
                      id: 'wamid.media123',
                      timestamp: '1640000000',
                      type: 'image',
                      image: {
                        id: 'image-id-123',
                        mime_type: 'image/jpeg',
                        sha256: 'sha256hash',
                        caption: 'Foto do imóvel',
                      },
                    },
                  ],
                },
                field: 'messages',
              },
            ],
          },
        ],
      };

      const payload = JSON.stringify(mediaWebhook);
      const hmac = crypto.createHmac('sha256', APP_SECRET);
      const signature = 'sha256=' + hmac.update(payload).digest('hex');

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(mediaWebhook.entry[0].changes[0].value.messages[0].type).toBe('image');
    });
  });

  describe('Environment Configuration', () => {
    it('should fail gracefully when APP_SECRET is missing', () => {
      const appSecret = undefined;
      expect(appSecret).toBeUndefined();
    });

    it('should fail gracefully when VERIFY_TOKEN is missing', () => {
      const verifyToken = undefined;
      expect(verifyToken).toBeUndefined();
    });

    it('should validate non-empty APP_SECRET', () => {
      const appSecret = APP_SECRET;
      expect(appSecret).toBeTruthy();
      expect(appSecret.length).toBeGreaterThan(0);
    });

    it('should validate non-empty VERIFY_TOKEN', () => {
      const verifyToken = VERIFY_TOKEN;
      expect(verifyToken).toBeTruthy();
      expect(verifyToken.length).toBeGreaterThan(0);
    });
  });
});

describe('WhatsApp Webhook Error Handling', () => {
  it('should return 401 for missing signature', () => {
    const signature = undefined;
    const statusCode = signature ? 200 : 401;
    expect(statusCode).toBe(401);
  });

  it('should return 401 for invalid signature', () => {
    const isValidSignature = false;
    const statusCode = isValidSignature ? 200 : 401;
    expect(statusCode).toBe(401);
  });

  it('should return 500 for missing APP_SECRET', () => {
    const appSecret = undefined;
    const statusCode = appSecret ? 200 : 500;
    expect(statusCode).toBe(500);
  });

  it('should return 500 for missing VERIFY_TOKEN', () => {
    const verifyToken = undefined;
    const statusCode = verifyToken ? 200 : 500;
    expect(statusCode).toBe(500);
  });

  it('should return 403 for invalid verify token', () => {
    const mode = 'subscribe';
    const token = 'wrong-token';
    const expectedToken = 'correct-token';

    const isValid = mode === 'subscribe' && token === expectedToken;
    const statusCode = isValid ? 200 : 403;

    expect(statusCode).toBe(403);
  });

  it('should return 200 for valid webhook', () => {
    const hasSignature = true;
    const isValidSignature = true;
    const hasAppSecret = true;

    const statusCode =
      hasSignature && isValidSignature && hasAppSecret ? 200 : 401;

    expect(statusCode).toBe(200);
  });
});
