# Security Documentation - ImobiBase

## Overview

This document provides comprehensive security guidelines for developers, administrators, and security personnel working with ImobiBase.

## Table of Contents

1. [Architecture Security](#architecture-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Security Monitoring](#security-monitoring)
6. [Incident Response](#incident-response)
7. [Security Configuration](#security-configuration)
8. [Security Testing](#security-testing)

---

## Architecture Security

### Multi-Tenant Isolation

ImobiBase uses a **multi-tenant architecture** with strict data isolation:

```typescript
// Every database query MUST include tenant validation
const properties = await db.select()
  .from(properties)
  .where(
    and(
      eq(properties.tenantId, req.user.tenantId), // REQUIRED
      eq(properties.id, propertyId)
    )
  );
```

**Best Practices:**
- Always filter by `tenantId` in database queries
- Validate tenant ownership before any operation
- Use middleware for tenant validation
- Never trust client-provided tenant IDs

### Database Security

**Protection Mechanisms:**
- Parameterized queries via Drizzle ORM (prevents SQL injection)
- Connection pooling with limits
- Read replicas for scaling
- Encrypted connections (SSL/TLS)

**Recommendations:**
- Enable PostgreSQL Row-Level Security (RLS)
- Implement database encryption at rest
- Regular backups with encryption
- Monitor slow queries for potential attacks

---

## Authentication & Authorization

### Password Security

**Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Implementation:**
```typescript
import { hashPassword, comparePassword } from './server/routes';

// Hash password using scrypt
const hashed = await hashPassword(password); // 64-byte hash with random salt

// Verify password with timing-safe comparison
const isValid = await comparePassword(supplied, stored);
```

**Password History:**
- Last 5 passwords tracked
- Prevents password reuse
- Automatically managed

### Two-Factor Authentication (2FA)

**Setup Process:**
1. User enables 2FA in settings
2. System generates TOTP secret
3. User scans QR code with authenticator app
4. User verifies with first token
5. Backup codes generated (10 codes)

**Implementation:**
```typescript
import { verifyTOTP, generateBackupCodes } from './server/routes-security';

// Verify TOTP token
const isValid = verifyTOTP(secret, token);

// Generate backup codes
const codes = generateBackupCodes(10);
```

### OAuth Integration

**Supported Providers:**
- Google OAuth 2.0
- Microsoft OAuth 2.0

**Security Considerations:**
- Verify OAuth state parameter (CSRF protection)
- Validate redirect URIs
- Store minimal user data
- Support account linking

### Session Management

**Configuration:**
```typescript
session({
  secret: process.env.SESSION_SECRET, // Strong random secret
  cookie: {
    httpOnly: true,      // Prevents XSS
    secure: true,        // HTTPS only (production)
    sameSite: 'strict',  // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  resave: false,
  saveUninitialized: false,
})
```

**Best Practices:**
- Regenerate session ID after login
- Invalidate session on logout
- Use PostgreSQL session store (production)
- Monitor session activity

### Account Lockout

**Configuration:**
- Max failed attempts: 5
- Lockout duration: 30 minutes
- Automatic unlock after duration
- Notification email sent

**Implementation:**
```typescript
import { handleFailedLogin, checkAccountLock } from './server/auth/security';

// Record failed login
const { locked, remainingAttempts } = await handleFailedLogin(
  userId,
  email,
  'invalid_password',
  req
);

// Check if account is locked
const lockStatus = await checkAccountLock(userId);
```

---

## Data Protection

### Encryption

**In Transit:**
- HTTPS/TLS 1.2+ enforced
- Strong cipher suites
- HSTS enabled

**At Rest:**
- Database encryption (recommended)
- File encryption for sensitive documents
- Environment variable encryption
- API key encryption

### Input Validation & Sanitization

**Always validate and sanitize user input:**

```typescript
import {
  sanitizeString,
  sanitizeEmail,
  sanitizeHtml,
  sanitizeFilename,
} from './server/security/input-validation';

// Sanitize user input
const clean = sanitizeString(userInput, 255);
const email = sanitizeEmail(req.body.email);
const safe = sanitizeHtml(userContent);
const filename = sanitizeFilename(uploadedFile.name);
```

**Use Zod schemas for validation:**

```typescript
import { z } from 'zod';
import { commonSchemas } from './server/security/input-validation';

const schema = z.object({
  email: commonSchemas.email,
  phone: commonSchemas.phone,
  url: commonSchemas.url,
  id: commonSchemas.id,
});
```

### File Upload Security

**Validation:**
- MIME type checking
- File extension validation
- File size limits
- Filename sanitization
- Path traversal prevention

**Implementation:**
```typescript
import { validateFile, sanitizeFilename } from './server/storage/file-upload';

// Validate before upload
const validation = validateFile(file, {
  fileType: 'image',
  maxSize: 10 * 1024 * 1024, // 10MB
});

if (!validation.valid) {
  throw new Error(validation.error);
}
```

**Malware Scanning:**
```typescript
// TODO: Implement virus scanning
import { scanFile } from './server/security/malware-scanner';

const isSafe = await scanFile(file.buffer);
if (!isSafe) {
  throw new Error('Malicious file detected');
}
```

---

## API Security

### CSRF Protection

**Implementation:**

```typescript
import { csrfProtection, generateCsrfTokenForSession } from './server/security/csrf-protection';

// Apply CSRF protection middleware
app.use(csrfProtection);

// Generate token for user
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfTokenForSession(req, res);
  res.json({ csrfToken: token });
});

// Client must include token in requests
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

### Rate Limiting

**Configuration:**

```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per window
});

// Auth endpoint rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 requests per window
});

app.use('/api/', apiLimiter);
app.use('/api/login', authLimiter);
```

**Composite Rate Limiting:**

```typescript
import { compositeRateLimit } from './server/security/intrusion-detection';

// Rate limit by IP + fingerprint
app.use(compositeRateLimit(60000, 100)); // 100 requests per minute
```

### API Key Authentication

```typescript
// TODO: Implement API key authentication
import { validateApiKey } from './server/security/api-security';

app.use('/api/', async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const isValid = await validateApiKey(apiKey);
    if (isValid) {
      // Set user context from API key
      return next();
    }
  }
  // Fall back to session authentication
  next();
});
```

---

## Security Monitoring

### Security Event Logging

```typescript
import {
  logSecurityEvent,
  SecurityEventType,
} from './server/security/security-monitor';

// Log security events
logSecurityEvent(
  SecurityEventType.LOGIN_SUCCESS,
  'User logged in successfully',
  req,
  { userId: user.id }
);

logSecurityEvent(
  SecurityEventType.PERMISSION_DENIED,
  'User attempted to access unauthorized resource',
  req,
  { resource: 'admin_panel' }
);
```

### Intrusion Detection

```typescript
import {
  detectMaliciousPatterns,
  blockBlacklistedIps,
  recordSuspiciousActivity,
} from './server/security/intrusion-detection';

// Apply intrusion detection middleware
app.use(blockBlacklistedIps);
app.use(detectMaliciousPatterns);

// Manually record suspicious activity
recordSuspiciousActivity(req, 'unusual_pattern');
```

### Audit Logging

All sensitive operations are automatically logged:

- User authentication events
- Data modifications (create, update, delete)
- Permission changes
- Configuration changes
- Export/import operations
- Failed access attempts

Access audit logs:
```typescript
import { createAuditLog } from './server/routes-security';

await createAuditLog(
  tenantId,
  userId,
  'update',
  'property',
  propertyId,
  oldValues,
  newValues,
  req
);
```

---

## Incident Response

### Detection

**Monitor for:**
- Unusual login patterns
- High number of failed logins
- Access to sensitive data
- Privilege escalation attempts
- Suspicious file uploads
- API abuse
- Rate limit violations

### Response Procedure

1. **Identify** the security incident
   - Check security monitoring dashboard
   - Review audit logs
   - Analyze security events

2. **Contain** the incident
   - Block malicious IPs
   - Revoke compromised credentials
   - Disable affected accounts
   - Isolate affected systems

3. **Eradicate** the threat
   - Remove malicious code/files
   - Patch vulnerabilities
   - Update security rules

4. **Recover** normal operations
   - Restore from backups if needed
   - Verify system integrity
   - Monitor for recurrence

5. **Post-Incident**
   - Document incident details
   - Conduct post-mortem
   - Update security measures
   - Notify affected users (if required by LGPD/GDPR)

### Notification Requirements

Under LGPD/GDPR, notify affected users within 72 hours if:
- Personal data was accessed or stolen
- There's a risk to user rights and freedoms
- Data was not encrypted

Contact: dpo@imobibase.com

---

## Security Configuration

### Environment Variables

**Required:**
```bash
# Strong random secret (min 32 characters)
SESSION_SECRET=your-strong-random-secret-here

# Database connection (use SSL in production)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Sentry for error tracking
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
```

**Optional but Recommended:**
```bash
# HTTPS enforcement
FORCE_HTTPS=true

# Redis for sessions (production)
REDIS_URL=redis://user:pass@host:6379

# File upload limits
MAX_FILE_SIZE=10485760  # 10MB
MAX_UPLOAD_FILES=10

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=500
```

### Security Headers

Configured via Helmet.js:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'nonce-{random}'"],  // Use nonce, not unsafe-inline
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));
```

### CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
```

---

## Security Testing

### Manual Testing

Run penetration tests:
```bash
# Start the server
npm run dev

# In another terminal, run pen tests
TEST_URL=http://localhost:5000 tsx scripts/security/pen-test.ts
```

### Automated Testing

```bash
# Dependency vulnerability scanning
npm audit

# Fix automatically fixable vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### CI/CD Security

Add to your CI pipeline:

```yaml
# .github/workflows/security.yml
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm audit
      - run: npm run test:security  # Add this script
```

### Security Checklist

Before deployment, verify:

- [ ] All dependencies updated
- [ ] No high/critical npm audit vulnerabilities
- [ ] SESSION_SECRET is strong and unique
- [ ] HTTPS enforced in production
- [ ] Database connections use SSL
- [ ] Rate limiting configured
- [ ] CSRF protection enabled
- [ ] Security headers configured
- [ ] File upload validation working
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] Backups configured and tested
- [ ] Monitoring and alerting set up

---

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Last Updated**: December 24, 2025
**Security Contact**: security@imobibase.com
