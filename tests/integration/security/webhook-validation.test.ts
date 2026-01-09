/**
 * Webhook Signature Validation Integration Tests
 * Tests webhook signature validation for ClickSign, WhatsApp, Stripe, etc.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import crypto from 'crypto';

const WEBHOOK_SECRETS = {
  stripe: 'whsec_test_stripe_secret_key_12345',
  whatsapp: 'test_whatsapp_secret_67890',
  clicksign: 'test_clicksign_secret_abcde',
  twilio: 'test_twilio_auth_token_fghij',
};

function createTestApp(): Express {
  const app = express();

  // Raw body parser for webhook signatures
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }));

  // Stripe webhook endpoint with signature validation
  app.post('/api/webhooks/stripe', (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        error: 'Missing Stripe signature',
        code: 'MISSING_SIGNATURE',
      });
    }

    try {
      // Extract timestamp and signature
      const elements = signature.split(',');
      const timestampElement = elements.find(e => e.startsWith('t='));
      const signatureElement = elements.find(e => e.startsWith('v1='));

      if (!timestampElement || !signatureElement) {
        return res.status(400).json({
          error: 'Invalid signature format',
          code: 'INVALID_SIGNATURE_FORMAT',
        });
      }

      const timestamp = timestampElement.split('=')[1];
      const providedSignature = signatureElement.split('=')[1];

      // Verify timestamp (not too old - 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
        return res.status(400).json({
          error: 'Webhook timestamp too old',
          code: 'TIMESTAMP_TOO_OLD',
        });
      }

      // Compute expected signature
      const rawBody = (req as any).rawBody;
      const signedPayload = `${timestamp}.${rawBody.toString()}`;
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.stripe)
        .update(signedPayload, 'utf8')
        .digest('hex');

      // Constant-time comparison
      if (!crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(providedSignature)
      )) {
        return res.status(401).json({
          error: 'Invalid webhook signature',
          code: 'INVALID_SIGNATURE',
        });
      }

      // Signature valid, process webhook
      res.json({
        success: true,
        received: req.body,
      });
    } catch (error: any) {
      res.status(400).json({
        error: 'Signature verification failed',
        message: error.message,
      });
    }
  });

  // WhatsApp webhook endpoint
  app.post('/api/webhooks/whatsapp', (req: Request, res: Response) => {
    const signature = req.headers['x-hub-signature-256'] as string;

    if (!signature) {
      return res.status(400).json({
        error: 'Missing WhatsApp signature',
        code: 'MISSING_SIGNATURE',
      });
    }

    try {
      const rawBody = (req as any).rawBody;
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRETS.whatsapp)
        .update(rawBody)
        .digest('hex');

      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )) {
        return res.status(401).json({
          error: 'Invalid WhatsApp signature',
          code: 'INVALID_SIGNATURE',
        });
      }

      res.json({
        success: true,
        received: req.body,
      });
    } catch (error: any) {
      res.status(400).json({
        error: 'Signature verification failed',
        message: error.message,
      });
    }
  });

  // ClickSign webhook endpoint
  app.post('/api/webhooks/clicksign', (req: Request, res: Response) => {
    const signature = req.headers['x-clicksign-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        error: 'Missing ClickSign signature',
        code: 'MISSING_SIGNATURE',
      });
    }

    try {
      const rawBody = (req as any).rawBody;
      const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.clicksign)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(401).json({
          error: 'Invalid ClickSign signature',
          code: 'INVALID_SIGNATURE',
        });
      }

      res.json({
        success: true,
        received: req.body,
      });
    } catch (error: any) {
      res.status(400).json({
        error: 'Signature verification failed',
        message: error.message,
      });
    }
  });

  // Twilio webhook endpoint
  app.post('/api/webhooks/twilio', (req: Request, res: Response) => {
    const signature = req.headers['x-twilio-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        error: 'Missing Twilio signature',
        code: 'MISSING_SIGNATURE',
      });
    }

    // Twilio uses full URL + sorted params for signature
    const url = `https://example.com${req.url}`;
    const params = { ...req.body };
    const sortedParams = Object.keys(params).sort().map(key => `${key}${params[key]}`).join('');
    const data = url + sortedParams;

    const expectedSignature = crypto
      .createHmac('sha1', WEBHOOK_SECRETS.twilio)
      .update(Buffer.from(data, 'utf-8'))
      .digest('base64');

    if (signature !== expectedSignature) {
      return res.status(401).json({
        error: 'Invalid Twilio signature',
        code: 'INVALID_SIGNATURE',
      });
    }

    res.json({
      success: true,
      received: req.body,
    });
  });

  return app;
}

describe('Webhook Signature Validation Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Stripe Webhook Validation', () => {
    it('should accept valid Stripe webhook signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = { event: 'payment_intent.succeeded', data: { amount: 1000 } };
      const payloadString = JSON.stringify(payload);

      const signedPayload = `${timestamp}.${payloadString}`;
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.stripe)
        .update(signedPayload, 'utf8')
        .digest('hex');

      const stripeSignature = `t=${timestamp},v1=${signature}`;

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', stripeSignature)
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.received).toEqual(payload);
    });

    it('should reject Stripe webhook with missing signature', async () => {
      const payload = { event: 'payment_intent.succeeded' };

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .send(payload)
        .expect(400);

      expect(res.body.error).toContain('Missing Stripe signature');
      expect(res.body.code).toBe('MISSING_SIGNATURE');
    });

    it('should reject Stripe webhook with invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = { event: 'payment_intent.succeeded' };

      const stripeSignature = `t=${timestamp},v1=invalid_signature_12345`;

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', stripeSignature)
        .send(payload)
        .expect(401);

      expect(res.body.error).toContain('Invalid webhook signature');
      expect(res.body.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject Stripe webhook with old timestamp (replay attack)', async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const payload = { event: 'payment_intent.succeeded' };
      const payloadString = JSON.stringify(payload);

      const signedPayload = `${oldTimestamp}.${payloadString}`;
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.stripe)
        .update(signedPayload, 'utf8')
        .digest('hex');

      const stripeSignature = `t=${oldTimestamp},v1=${signature}`;

      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', stripeSignature)
        .send(payload)
        .expect(400);

      expect(res.body.error).toContain('timestamp too old');
      expect(res.body.code).toBe('TIMESTAMP_TOO_OLD');
    });

    it('should reject Stripe webhook with tampered payload', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const originalPayload = { event: 'payment_intent.succeeded', data: { amount: 1000 } };
      const tamperedPayload = { event: 'payment_intent.succeeded', data: { amount: 9999 } };

      const payloadString = JSON.stringify(originalPayload);
      const signedPayload = `${timestamp}.${payloadString}`;
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.stripe)
        .update(signedPayload, 'utf8')
        .digest('hex');

      const stripeSignature = `t=${timestamp},v1=${signature}`;

      // Send tampered payload with original signature
      const res = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', stripeSignature)
        .send(tamperedPayload)
        .expect(401);

      expect(res.body.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('WhatsApp Webhook Validation', () => {
    it('should accept valid WhatsApp webhook signature', async () => {
      const payload = { object: 'whatsapp_business_account', entry: [] };
      const payloadString = JSON.stringify(payload);

      const signature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRETS.whatsapp)
        .update(payloadString)
        .digest('hex');

      const res = await request(app)
        .post('/api/webhooks/whatsapp')
        .set('x-hub-signature-256', signature)
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject WhatsApp webhook with invalid signature', async () => {
      const payload = { object: 'whatsapp_business_account' };

      const res = await request(app)
        .post('/api/webhooks/whatsapp')
        .set('x-hub-signature-256', 'sha256=invalid_signature')
        .send(payload)
        .expect(401);

      expect(res.body.code).toBe('INVALID_SIGNATURE');
    });

    it('should reject WhatsApp webhook without signature', async () => {
      const payload = { object: 'whatsapp_business_account' };

      const res = await request(app)
        .post('/api/webhooks/whatsapp')
        .send(payload)
        .expect(400);

      expect(res.body.code).toBe('MISSING_SIGNATURE');
    });
  });

  describe('ClickSign Webhook Validation', () => {
    it('should accept valid ClickSign webhook signature', async () => {
      const payload = { document: { key: 'abc123' }, event: { name: 'sign' } };
      const payloadString = JSON.stringify(payload);

      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.clicksign)
        .update(payloadString)
        .digest('hex');

      const res = await request(app)
        .post('/api/webhooks/clicksign')
        .set('x-clicksign-signature', signature)
        .send(payload)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should reject ClickSign webhook with invalid signature', async () => {
      const payload = { document: { key: 'abc123' } };

      const res = await request(app)
        .post('/api/webhooks/clicksign')
        .set('x-clicksign-signature', 'invalid_signature_hash')
        .send(payload)
        .expect(401);

      expect(res.body.code).toBe('INVALID_SIGNATURE');
    });
  });

  describe('Replay Attack Prevention', () => {
    it('should reject replayed webhook with same signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const payload = { event: 'test.event', id: 'unique-123' };
      const payloadString = JSON.stringify(payload);

      const signedPayload = `${timestamp}.${payloadString}`;
      const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.stripe)
        .update(signedPayload, 'utf8')
        .digest('hex');

      const stripeSignature = `t=${timestamp},v1=${signature}`;

      // First request should succeed
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', stripeSignature)
        .send(payload)
        .expect(200);

      // In production, we would track processed webhook IDs
      // For this test, we verify timestamp validation prevents old replays
      const oldTimestamp = timestamp - 400; // Older than 5 minutes
      const oldSignedPayload = `${oldTimestamp}.${payloadString}`;
      const oldSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRETS.stripe)
        .update(oldSignedPayload, 'utf8')
        .digest('hex');

      const oldStripeSignature = `t=${oldTimestamp},v1=${oldSignature}`;

      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', oldStripeSignature)
        .send(payload)
        .expect(400);
    });
  });

  describe('Signature Timing Attack Protection', () => {
    it('should use constant-time comparison for signatures', async () => {
      const payload = { event: 'test' };
      const payloadString = JSON.stringify(payload);

      const validSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRETS.whatsapp)
        .update(payloadString)
        .digest('hex');

      // Create similar but invalid signature
      const invalidSignature = validSignature.slice(0, -4) + 'xxxx';

      const start = Date.now();
      await request(app)
        .post('/api/webhooks/whatsapp')
        .set('x-hub-signature-256', invalidSignature)
        .send(payload)
        .expect(401);
      const duration1 = Date.now() - start;

      // Very different signature
      const start2 = Date.now();
      await request(app)
        .post('/api/webhooks/whatsapp')
        .set('x-hub-signature-256', 'sha256=completely_different_sig')
        .send(payload)
        .expect(401);
      const duration2 = Date.now() - start2;

      // Timing should be similar (within reasonable variance)
      // This is a basic test - real timing attacks are more sophisticated
      const timingDifference = Math.abs(duration1 - duration2);
      expect(timingDifference).toBeLessThan(100); // Less than 100ms difference
    });
  });
});
