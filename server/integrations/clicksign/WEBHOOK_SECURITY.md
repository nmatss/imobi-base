# ClickSign Webhook Security Implementation

## Overview

This implementation provides enterprise-grade security for ClickSign webhook validation using HMAC-SHA256 signature verification and timestamp validation to prevent replay attacks.

## Security Features

### 1. HMAC-SHA256 Signature Validation
- All webhook requests must include `x-clicksign-signature` header
- Signature is computed using HMAC-SHA256 with shared secret
- Uses timing-safe comparison to prevent timing attacks
- Rejects requests with invalid or missing signatures

### 2. Timestamp Validation (Replay Attack Prevention)
- Optional `x-clicksign-timestamp` header validation
- Rejects webhooks older than 5 minutes (configurable)
- Prevents replay attacks by checking request freshness
- Allows 30 seconds of clock skew for future timestamps

### 3. Fail-Fast Security
- Server **WILL FAIL** if `CLICKSIGN_WEBHOOK_SECRET` is not configured
- No fallback to insecure mode
- Forces proper security configuration before accepting webhooks

## Configuration

### 1. Generate Webhook Secret

```bash
# Option 1: OpenSSL
openssl rand -hex 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Configure Environment Variable

Add to your `.env` file:

```bash
CLICKSIGN_WEBHOOK_SECRET=your-generated-secret-here
```

### 3. Configure ClickSign Dashboard

1. Go to ClickSign Dashboard > Settings > Webhooks
2. Enter your webhook URL: `https://yourdomain.com/api/webhooks/clicksign`
3. Enter the same secret generated in step 1
4. Save configuration

## Implementation Details

### Signature Validation Flow

```typescript
// 1. Extract signature from headers
const signature = req.headers['x-clicksign-signature'];

// 2. Verify webhook secret is configured
if (!CLICKSIGN_WEBHOOK_SECRET) {
  throw new Error('CLICKSIGN_WEBHOOK_SECRET required');
}

// 3. Compute expected signature
const payload = JSON.stringify(req.body);
const hmac = crypto.createHmac('sha256', CLICKSIGN_WEBHOOK_SECRET);
const expectedSignature = hmac.update(payload).digest('hex');

// 4. Verify signature lengths match
if (signature.length !== expectedSignature.length) {
  return false; // Invalid signature
}

// 5. Timing-safe comparison
const isValid = crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
);
```

### Timestamp Validation Flow

```typescript
// 1. Extract timestamp from headers
const timestamp = req.headers['x-clicksign-timestamp'];

// 2. If no timestamp, log warning but continue
if (!timestamp) {
  console.warn('Webhook without timestamp');
  return true;
}

// 3. Validate age (max 5 minutes old)
const webhookTime = parseInt(timestamp, 10);
const now = Math.floor(Date.now() / 1000);
const age = now - webhookTime;

if (age > 300) {
  return false; // Too old
}

// 4. Allow 30 seconds clock skew
if (age < -30) {
  return false; // Too far in future
}
```

## Testing

Run the included test suite:

```bash
npx tsx server/integrations/clicksign/webhook-test.ts
```

This will validate:
- ✓ Valid signature verification
- ✓ Invalid signature rejection
- ✓ Tampered payload detection
- ✓ Wrong secret rejection
- ✓ Valid timestamp acceptance
- ✓ Old timestamp rejection (replay attack)
- ✓ Future timestamp rejection (clock skew)
- ✓ Timing-safe comparison

## Manual Testing with curl

### Generate Valid Signature

```bash
# 1. Set your webhook secret
WEBHOOK_SECRET="your-secret-here"

# 2. Create payload
PAYLOAD='{
  "event": "document.signed",
  "occurred_at": "2025-12-26T18:00:00.000Z",
  "data": {
    "document": {
      "key": "test-doc-123",
      "status": "signed"
    }
  }
}'

# 3. Generate signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)

# 4. Get current timestamp
TIMESTAMP=$(date +%s)

# 5. Send request
curl -X POST http://localhost:5000/api/webhooks/clicksign \
  -H "Content-Type: application/json" \
  -H "x-clicksign-signature: $SIGNATURE" \
  -H "x-clicksign-timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

### Expected Responses

#### Valid Request
```json
{
  "success": true
}
```
Status: `200 OK`

#### Invalid Signature
```json
{
  "error": "Invalid webhook signature"
}
```
Status: `401 Unauthorized`

#### Invalid Timestamp
```json
{
  "error": "Invalid webhook timestamp"
}
```
Status: `401 Unauthorized`

#### Missing Secret Configuration
```
Error: CLICKSIGN_WEBHOOK_SECRET is required for webhook validation
```
Status: `500 Internal Server Error`

## Security Considerations

### ✅ Implemented

1. **HMAC-SHA256 Signature**: Industry-standard cryptographic signature
2. **Timing-Safe Comparison**: Prevents timing attack vulnerabilities
3. **Timestamp Validation**: Prevents replay attacks
4. **Fail-Fast**: Enforces security configuration before accepting webhooks
5. **Length Validation**: Validates signature length before comparison
6. **Comprehensive Logging**: All validation failures are logged with details

### ⚠️ Important Notes

1. **Never commit webhook secret**: Keep `CLICKSIGN_WEBHOOK_SECRET` in `.env` (not in git)
2. **Rotate secrets periodically**: Change webhook secret every 90 days
3. **Use HTTPS**: Always use HTTPS endpoints in production
4. **Monitor logs**: Watch for repeated validation failures (potential attacks)
5. **Rate limiting**: Implement rate limiting on webhook endpoint

### 📋 Security Checklist

Before deploying to production:

- [ ] `CLICKSIGN_WEBHOOK_SECRET` configured with strong random secret
- [ ] Secret added to ClickSign dashboard webhook configuration
- [ ] Webhook URL uses HTTPS (not HTTP)
- [ ] Monitoring/alerting configured for validation failures
- [ ] Rate limiting enabled on `/api/webhooks/clicksign` endpoint
- [ ] Security team notified of webhook endpoint deployment
- [ ] Tested with ClickSign's test webhooks

## Troubleshooting

### Problem: "Invalid webhook signature" errors

**Possible Causes:**
1. Webhook secret mismatch between server and ClickSign
2. Request body modification by proxy/middleware
3. Different JSON serialization order

**Solutions:**
1. Verify secret matches in both `.env` and ClickSign dashboard
2. Ensure no middleware modifies `req.body` before validation
3. Check ClickSign documentation for exact payload format

### Problem: "Invalid webhook timestamp" errors

**Possible Causes:**
1. Server clock skew
2. Network latency > 5 minutes
3. Timestamp header format incorrect

**Solutions:**
1. Synchronize server clock with NTP
2. Increase `MAX_AGE_SECONDS` if needed (not recommended)
3. Verify timestamp is Unix epoch seconds (not milliseconds)

### Problem: "CLICKSIGN_WEBHOOK_SECRET not configured" error

**Possible Causes:**
1. `.env` file not loaded
2. Variable name typo
3. Environment variable not set in deployment

**Solutions:**
1. Check `.env` file exists and is loaded
2. Verify variable name: `CLICKSIGN_WEBHOOK_SECRET` (no typos)
3. Add variable to deployment environment (Vercel, Heroku, etc.)

## Monitoring

### Key Metrics to Monitor

1. **Signature validation failures**: Should be near zero
2. **Timestamp validation failures**: Check for clock skew issues
3. **Webhook processing time**: Should be < 1 second
4. **Error rate**: Track failed webhook processing

### Example Monitoring Query (Sentry/DataDog)

```
# Failed signature validations
[CLICKSIGN] Invalid webhook signature
[CLICKSIGN] Webhook received without signature

# Failed timestamp validations
[CLICKSIGN] Webhook too old
[CLICKSIGN] Webhook from future

# Configuration errors
[CLICKSIGN] CRITICAL: CLICKSIGN_WEBHOOK_SECRET not configured
```

## References

- [ClickSign API Documentation](https://developers.clicksign.com/)
- [HMAC-SHA256 Standard](https://tools.ietf.org/html/rfc2104)
- [OWASP Webhook Security](https://cheatsheetseries.owasp.org/cheatsheets/Webhook_Security_Cheat_Sheet.html)
- [Timing Attack Prevention](https://codahale.com/a-lesson-in-timing-attacks/)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review server logs for specific error messages
3. Contact ClickSign support for webhook configuration issues
4. Open issue in project repository for implementation bugs
