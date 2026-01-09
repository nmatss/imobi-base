/**
 * ClickSign Webhook Signature Validation Test
 * Simulates webhook requests to validate HMAC-SHA256 signature implementation
 */

import crypto from 'crypto';

// Simulate webhook secret
const WEBHOOK_SECRET = 'test-secret-key-12345';

interface MockWebhookPayload {
  event: string;
  occurred_at: string;
  data: {
    document: {
      key: string;
      status: string;
    };
  };
}

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateWebhookSignature(payload: MockWebhookPayload, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  const signature = hmac.update(payloadString).digest('hex');
  return signature;
}

/**
 * Validate webhook signature (simulates server-side validation)
 */
function validateWebhookSignature(
  payload: MockWebhookPayload,
  signature: string,
  secret: string
): boolean {
  try {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(payloadString).digest('hex');

    // Verify lengths match before timing-safe comparison
    if (signature.length !== expectedSignature.length) {
      console.warn('Signature length mismatch:', {
        receivedLength: signature.length,
        expectedLength: expectedSignature.length,
      });
      return false;
    }

    // Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    return isValid;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}

/**
 * Validate webhook timestamp
 */
function validateWebhookTimestamp(timestamp: number): boolean {
  const MAX_AGE_SECONDS = 300; // 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;

  if (age > MAX_AGE_SECONDS) {
    console.warn('Webhook too old:', { age, maxAge: MAX_AGE_SECONDS });
    return false;
  }

  if (age < -30) {
    console.warn('Webhook from future (clock skew):', { age });
    return false;
  }

  return true;
}

// Test Cases
console.log('=== ClickSign Webhook Signature Validation Tests ===\n');

// Test 1: Valid signature
console.log('Test 1: Valid Signature');
const validPayload: MockWebhookPayload = {
  event: 'document.signed',
  occurred_at: new Date().toISOString(),
  data: {
    document: {
      key: 'abc123-def456',
      status: 'signed',
    },
  },
};

const validSignature = generateWebhookSignature(validPayload, WEBHOOK_SECRET);
const isValid = validateWebhookSignature(validPayload, validSignature, WEBHOOK_SECRET);
console.log('✓ Valid signature test:', isValid ? 'PASSED' : 'FAILED');
console.log('  Signature:', validSignature.substring(0, 20) + '...\n');

// Test 2: Invalid signature
console.log('Test 2: Invalid Signature');
const invalidSignature = 'invalid-signature-123456789abcdef';
const isInvalid = validateWebhookSignature(validPayload, invalidSignature, WEBHOOK_SECRET);
console.log('✓ Invalid signature test:', !isInvalid ? 'PASSED' : 'FAILED\n');

// Test 3: Tampered payload
console.log('Test 3: Tampered Payload');
const tamperedPayload = { ...validPayload };
tamperedPayload.data.document.status = 'cancelled'; // Tamper with status
const isTampered = validateWebhookSignature(tamperedPayload, validSignature, WEBHOOK_SECRET);
console.log('✓ Tampered payload test:', !isTampered ? 'PASSED' : 'FAILED\n');

// Test 4: Wrong secret
console.log('Test 4: Wrong Secret');
const wrongSecret = 'wrong-secret-key';
const isWrongSecret = validateWebhookSignature(validPayload, validSignature, wrongSecret);
console.log('✓ Wrong secret test:', !isWrongSecret ? 'PASSED' : 'FAILED\n');

// Test 5: Valid timestamp
console.log('Test 5: Valid Timestamp');
const currentTimestamp = Math.floor(Date.now() / 1000);
const isValidTimestamp = validateWebhookTimestamp(currentTimestamp);
console.log('✓ Valid timestamp test:', isValidTimestamp ? 'PASSED' : 'FAILED');
console.log('  Timestamp:', currentTimestamp, '\n');

// Test 6: Old timestamp (replay attack)
console.log('Test 6: Old Timestamp (Replay Attack)');
const oldTimestamp = currentTimestamp - 400; // 6 minutes ago
const isOldTimestamp = validateWebhookTimestamp(oldTimestamp);
console.log('✓ Old timestamp test:', !isOldTimestamp ? 'PASSED' : 'FAILED');
console.log('  Timestamp:', oldTimestamp, '(400s ago)\n');

// Test 7: Future timestamp (clock skew)
console.log('Test 7: Future Timestamp (Clock Skew)');
const futureTimestamp = currentTimestamp + 60; // 1 minute in future
const isFutureTimestamp = validateWebhookTimestamp(futureTimestamp);
console.log('✓ Future timestamp test:', !isFutureTimestamp ? 'PASSED' : 'FAILED');
console.log('  Timestamp:', futureTimestamp, '(60s in future)\n');

// Test 8: Timing-safe comparison demonstration
console.log('Test 8: Timing-Safe Comparison');
const sig1 = generateWebhookSignature(validPayload, WEBHOOK_SECRET);
const sig2 = generateWebhookSignature(validPayload, WEBHOOK_SECRET);
console.log('✓ Same payload produces same signature:', sig1 === sig2 ? 'PASSED' : 'FAILED');
console.log('  Sig1:', sig1.substring(0, 20) + '...');
console.log('  Sig2:', sig2.substring(0, 20) + '...\n');

console.log('=== All Tests Completed ===');
console.log('\nExample Usage:');
console.log('1. Set CLICKSIGN_WEBHOOK_SECRET in .env');
console.log('2. ClickSign will send webhook with x-clicksign-signature header');
console.log('3. Server validates signature using HMAC-SHA256');
console.log('4. Server validates timestamp to prevent replay attacks');
console.log('5. Only valid requests are processed\n');

// Generate example curl command
console.log('Example webhook request with curl:');
const examplePayload = {
  event: 'document.signed',
  occurred_at: new Date().toISOString(),
  data: {
    document: {
      key: 'test-doc-123',
      status: 'signed',
    },
  },
};
const exampleSignature = generateWebhookSignature(examplePayload, WEBHOOK_SECRET);
const exampleTimestamp = Math.floor(Date.now() / 1000);

console.log(`
curl -X POST http://localhost:5000/api/webhooks/clicksign \\
  -H "Content-Type: application/json" \\
  -H "x-clicksign-signature: ${exampleSignature}" \\
  -H "x-clicksign-timestamp: ${exampleTimestamp}" \\
  -d '${JSON.stringify(examplePayload, null, 2)}'
`);
