# P3 Security Improvements - Implementation Guide

This guide explains how to use the P3 security improvements implemented in the ImobiBase system.

## Table of Contents

1. [Security Headers](#security-headers)
2. [Request Size Limits](#request-size-limits)
3. [Response Compression](#response-compression)
4. [Error Handling](#error-handling)
5. [Content-Type Validation](#content-type-validation)
6. [CORS Preflight Caching](#cors-preflight-caching)
7. [Security Webhooks](#security-webhooks)
8. [Session Timeout Warning](#session-timeout-warning)

---

## Security Headers

### Overview

Enhanced security headers middleware that adds multiple layers of protection beyond Helmet.js defaults.

### Features

- **HSTS (HTTP Strict Transport Security)**: Forces HTTPS
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Controls browser features
- **Cache-Control**: Smart caching based on content type
- **X-Download-Options**: Prevents IE downloads
- **X-DNS-Prefetch-Control**: Privacy protection

### Usage

```typescript
import { securityHeaders } from './middleware/security-headers';

app.use(securityHeaders({
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: ['self'],
  },
}));
```

### Headers Applied

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Privacy |
| `Permissions-Policy` | `camera=(), microphone=()...` | Feature control |
| `X-Permitted-Cross-Domain-Policies` | `none` | Block Flash/PDF |
| `X-Download-Options` | `noopen` | IE protection |
| `X-DNS-Prefetch-Control` | `off` | Privacy |
| `Cache-Control` | Varies by content | Performance |

### Cache Control Strategy

- **API routes** (`/api/*`): `no-store, no-cache, must-revalidate`
- **Static assets** (`.js`, `.css`, etc.): `public, max-age=31536000, immutable`
- **HTML pages**: `public, max-age=3600, must-revalidate`

---

## Request Size Limits

### Overview

Protects against DoS attacks via large payloads and complex requests.

### Features

- URL length limits
- Query parameter limits
- Header size limits
- JSON depth limits
- Array size limits
- Request complexity scoring

### Usage

```typescript
import { requestLimits, bodySize } from './middleware/request-limits';

app.use(requestLimits({
  maxBodySize: '10mb',
  maxUrlLength: 2048,
  maxQueryParams: 50,
  maxJsonDepth: 10,
  maxArrayLength: 1000,
}));

app.use(bodySize('10mb'));
```

### Limits

| Limit | Default | Error Code |
|-------|---------|------------|
| URL Length | 2048 chars | 414 URI Too Long |
| Query Params | 50 params | 400 Bad Request |
| Headers | 50 headers | 431 Headers Too Large |
| Header Size | 8kb each | 431 Headers Too Large |
| JSON Depth | 10 levels | 400 Bad Request |
| Array Length | 1000 items | 400 Bad Request |
| Body Size | 10mb | 413 Payload Too Large |

### Examples

```typescript
// ❌ Rejected - URL too long
GET /api/test?param=xxx...xxx (3000 chars)
// Response: 414 URL too long

// ❌ Rejected - Too many params
GET /api/test?a=1&b=2&c=3... (60 params)
// Response: 400 Too many query parameters

// ❌ Rejected - JSON too deep
POST /api/test
{
  "level1": {
    "level2": {
      "level3": {
        // ... 15 levels deep
      }
    }
  }
}
// Response: 400 JSON nesting too deep

// ✅ Accepted - Valid request
POST /api/test
{
  "user": {
    "name": "John",
    "email": "john@example.com"
  }
}
```

---

## Response Compression

### Overview

Compresses API responses to reduce bandwidth and improve performance.

### Features

- Smart content-type detection
- Configurable compression levels
- Skip already-compressed formats
- Development/production presets

### Usage

```typescript
import { responseCompression, compressionPresets } from './middleware/compression';

// Default (auto-detects environment)
app.use(responseCompression());

// With custom config
app.use(responseCompression({
  level: 6, // 0-9, higher = better compression
  threshold: 1024, // minimum size (bytes)
  memLevel: 8, // memory usage (1-9)
}));

// Using presets
app.use(responseCompression(compressionPresets.production));
```

### Presets

```typescript
{
  production: {
    level: 6,        // Balanced
    threshold: 1024, // 1kb
    memLevel: 8,
  },

  development: {
    level: 1,        // Fast
    threshold: 1024,
    memLevel: 8,
  },

  high: {
    level: 9,        // Best compression
    threshold: 512,
    memLevel: 9,
  },

  fast: {
    level: 1,        // Fastest
    threshold: 2048,
    memLevel: 7,
  },

  api: {
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      // Only JSON responses
      const contentType = res.getHeader('Content-Type');
      return contentType?.includes('application/json') || false;
    },
  },
}
```

### Compressed Types

- `text/*` (HTML, CSS, plain text)
- `application/json`
- `application/javascript`
- `application/xml`

### Skipped Types

- `image/*` (already compressed)
- `video/*` (already compressed)
- `audio/*` (already compressed)
- `application/zip`
- `application/gzip`

---

## Error Handling

### Overview

Enhanced error handling with security-focused sanitization.

### Features

- **No stack traces in production**
- **Sensitive data redaction**
- **Error ID generation**
- **Sentry integration**
- **Security headers on errors**

### Usage

```typescript
import { errorHandler, AppError, ValidationError } from './middleware/error-handler';

// Custom errors
throw new ValidationError('Invalid email', zodErrors);
throw new AuthError('Invalid credentials');
throw new NotFoundError('User');
throw new ForbiddenError('Access denied');

// Error handler (must be last middleware)
app.use(errorHandler);
```

### Error Response Format

**Development:**
```json
{
  "error": "Detailed error message",
  "statusCode": 400,
  "stack": "Error: ...\n  at ...",
  "details": {
    "name": "ValidationError",
    "type": "ValidationError"
  }
}
```

**Production:**
```json
{
  "error": "An unexpected error occurred. Error ID: ERR-ABC123",
  "statusCode": 500,
  "code": "INTERNAL_ERROR"
}
```

### Sensitive Data Redaction

The following fields are automatically redacted in Sentry reports:

- `password`
- `token`
- `secret`
- `apiKey` / `api_key`
- `accessToken` / `refreshToken`
- `sessionId`
- `creditCard`
- `ssn` / `cpf` / `cnpj`

### Error Classes

```typescript
// 400 Bad Request
throw new BadRequestError('Invalid input');
throw new ValidationError('Validation failed', zodErrors);

// 401 Unauthorized
throw new AuthError('Not authenticated');

// 403 Forbidden
throw new ForbiddenError('Access denied');

// 404 Not Found
throw new NotFoundError('Resource');

// 409 Conflict
throw new ConflictError('Resource already exists');

// 429 Too Many Requests
throw new RateLimitError('Too many requests');

// 500 Internal Server Error
throw new InternalError('Something went wrong');

// 503 Service Unavailable
throw new ServiceUnavailableError('Service down');
```

---

## Content-Type Validation

### Overview

Ensures requests with body have proper Content-Type header.

### Usage

```typescript
import { validateContentType } from './middleware/security-headers';

// Default: application/json only
app.use(validateContentType());

// Custom types
app.use(validateContentType([
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
]));
```

### Behavior

- **GET/HEAD/OPTIONS**: Always allowed (no body expected)
- **POST/PUT/PATCH/DELETE with body**: Requires Content-Type
- **Missing Content-Type**: 400 Bad Request
- **Wrong Content-Type**: 415 Unsupported Media Type

### Examples

```typescript
// ✅ Valid
POST /api/users
Content-Type: application/json
{ "name": "John" }

// ❌ Missing Content-Type
POST /api/users
{ "name": "John" }
// Response: 400 Content-Type header is required

// ❌ Wrong Content-Type
POST /api/users
Content-Type: text/plain
John
// Response: 415 Unsupported Media Type
```

---

## CORS Preflight Caching

### Overview

Improves performance by caching CORS preflight responses.

### Usage

```typescript
import { corsPreflight } from './middleware/security-headers';

// Cache for 24 hours (86400 seconds)
app.use(corsPreflight(86400));

// Cache for 1 hour
app.use(corsPreflight(3600));
```

### How it Works

1. Browser sends OPTIONS request (preflight)
2. Server responds with `Access-Control-Max-Age: 86400`
3. Browser caches the response for 24 hours
4. Subsequent requests skip preflight check

### Benefits

- Reduces network requests
- Improves performance
- Better user experience

---

## Security Webhooks

### Overview

Send security events to external webhook endpoints for monitoring and alerting.

### Setup

#### Environment Variables

```bash
# Webhook configuration
WEBHOOK_SLACK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
WEBHOOK_SLACK_SECRET=your-secret-key
WEBHOOK_SLACK_EVENTS=login_failure,brute_force,sql_injection
WEBHOOK_SLACK_MIN_SEVERITY=high

# Multiple webhooks
WEBHOOK_PAGERDUTY_URL=https://events.pagerduty.com/v2/enqueue
WEBHOOK_PAGERDUTY_SECRET=your-secret-key
WEBHOOK_PAGERDUTY_MIN_SEVERITY=critical
```

#### Usage

```typescript
import { webhookManager } from './security/webhooks';

// Add webhook programmatically
webhookManager.addWebhook('custom', {
  url: 'https://example.com/webhook',
  secret: 'your-secret',
  events: ['login_failure', 'brute_force'],
  minSeverity: 'high',
  enabled: true,
});

// Send security event
await webhookManager.sendEvent({
  id: 'evt_123',
  type: 'login_failure',
  severity: 'high',
  timestamp: new Date(),
  message: 'Failed login attempt',
  metadata: {
    ip: '192.168.1.1',
    username: 'admin',
  },
});

// Test webhook
const success = await webhookManager.testWebhook('slack');
console.log('Test result:', success);
```

### Webhook Payload

```json
{
  "type": "security.event",
  "data": {
    "id": "evt_123",
    "type": "login_failure",
    "severity": "high",
    "timestamp": "2025-12-26T12:00:00Z",
    "message": "Failed login attempt",
    "metadata": {
      "ip": "192.168.1.1",
      "username": "admin"
    }
  },
  "timestamp": "2025-12-26T12:00:00Z",
  "webhookId": "slack",
  "environment": "production"
}
```

### Signature Verification

```typescript
import { verifyWebhookSignature } from './security/webhooks';

// In webhook receiver
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const secret = 'your-secret';

  const isValid = verifyWebhookSignature(payload, signature, secret);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook
  res.json({ received: true });
});
```

---

## Session Timeout Warning

### Overview

React component that warns users before their session expires.

### Usage

```typescript
import { TimeoutWarning, useSessionTimeout } from '@/components/TimeoutWarning';

// Basic usage
function App() {
  return (
    <TimeoutWarning
      timeout={30 * 60 * 1000} // 30 minutes
      warningTime={5 * 60 * 1000} // 5 minutes warning
      onTimeout={() => {
        // Logout user
        window.location.href = '/login';
      }}
      onExtend={async () => {
        // Refresh session
        await fetch('/api/auth/refresh', { method: 'POST' });
      }}
      isAuthenticated={true}
    />
  );
}

// Using hook
function App() {
  const { TimeoutWarning: Timeout, isTimedOut } = useSessionTimeout({
    timeout: 30 * 60 * 1000,
    warningTime: 5 * 60 * 1000,
    onTimeout: () => {
      window.location.href = '/login';
    },
  });

  if (isTimedOut) {
    return <div>Session expired</div>;
  }

  return (
    <>
      <Timeout />
      {/* Your app */}
    </>
  );
}
```

### Props

```typescript
interface TimeoutWarningProps {
  timeout?: number;          // Session timeout (ms)
  warningTime?: number;      // Warning time before timeout (ms)
  onTimeout?: () => void;    // Callback when session expires
  onExtend?: () => Promise<void>;  // Callback to extend session
  isAuthenticated?: boolean; // Show only when authenticated
}
```

### Features

- Tracks user activity (mouse, keyboard, touch)
- Shows warning dialog before timeout
- Visual progress bar
- Stay logged in / Logout options
- Automatic session extension
- Mobile-friendly

---

## Static Files

### security.txt

Located at `/.well-known/security.txt` (RFC 9116 compliant)

```text
Contact: mailto:security@imobibase.com
Expires: 2026-12-31T23:59:59.000Z
Preferred-Languages: pt-BR, en
Policy: https://imobibase.com/security
```

### robots.txt

Located at `/robots.txt`

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
```

---

## Testing

Run the P3 security tests:

```bash
npm test tests/security/p3-security.test.ts
```

---

## Security Checklist

Before deploying to production, ensure:

- [ ] All middleware applied in correct order
- [ ] SESSION_SECRET configured (32+ characters)
- [ ] HTTPS enabled (HSTS requires it)
- [ ] Error handling doesn't expose stack traces
- [ ] Webhooks configured for critical events
- [ ] Session timeout appropriate for your use case
- [ ] Request limits tuned for your traffic
- [ ] Compression enabled for API responses
- [ ] Content-Type validation on all POST/PUT routes
- [ ] Security headers verified with securityheaders.com
- [ ] robots.txt and security.txt accessible

---

## Monitoring

Monitor these metrics:

1. **Error rates**: Track 400/500 errors
2. **Request sizes**: Monitor large payloads
3. **Compression ratios**: Verify bandwidth savings
4. **Session timeouts**: Track timeout frequency
5. **Webhook deliveries**: Monitor webhook success rates
6. **Security events**: Track attack attempts

---

## Troubleshooting

### HSTS not working

- Ensure `NODE_ENV=production`
- Verify HTTPS is enabled
- Check `req.secure` is true

### Compression not working

- Check `Accept-Encoding: gzip` header
- Verify response size > threshold (1kb)
- Check content type is compressible

### Webhooks failing

- Verify webhook URL is accessible
- Check signature verification
- Monitor webhook logs
- Test with `webhookManager.testWebhook()`

### Session timeout too aggressive

- Increase `timeout` value
- Reduce `warningTime` for less frequent warnings
- Add more activity events

---

## Additional Resources

- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
- [RFC 9116 (security.txt)](https://www.rfc-editor.org/rfc/rfc9116.html)
- [Google PageSpeed Insights](https://pagespeed.web.dev/)
