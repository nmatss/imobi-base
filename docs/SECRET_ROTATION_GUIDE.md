# Secret Rotation Guide - ImobiBase

## Overview

This guide describes how to rotate secrets and credentials in ImobiBase for security best practices.

## Table of Contents

1. [When to Rotate Secrets](#when-to-rotate-secrets)
2. [Types of Secrets](#types-of-secrets)
3. [Secret Rotation Process](#secret-rotation-process)
4. [Automated Tools](#automated-tools)
5. [Emergency Rotation](#emergency-rotation)
6. [Validation](#validation)

---

## When to Rotate Secrets

Rotate secrets in these scenarios:

### Scheduled Rotation
- **SESSION_SECRET**: Every 90 days (quarterly)
- **CSRF_SECRET**: Every 90 days (quarterly)
- **ENCRYPTION_KEY**: Every 90 days (quarterly)
- **API Keys**: Every 12 months (annually)

### Immediate Rotation
- Suspected compromise or breach
- Developer offboarding (had access to secrets)
- After security incident
- Secret accidentally committed to git
- Secret exposed in logs or error messages

---

## Types of Secrets

### Critical Application Secrets

```bash
# Rotate every 90 days
SESSION_SECRET=      # Express session signing
CSRF_SECRET=         # CSRF token generation
ENCRYPTION_KEY=      # Sensitive data encryption
```

### External API Secrets

```bash
# Rotate every 12 months or when compromised
STRIPE_SECRET_KEY=
MERCADOPAGO_ACCESS_TOKEN=
WHATSAPP_API_TOKEN=
GOOGLE_MAPS_API_KEY=
SENDGRID_API_KEY=
CLICKSIGN_API_KEY=
TWILIO_AUTH_TOKEN=
```

### Database Credentials

```bash
# Rotate when developers are offboarded
DATABASE_URL=
REDIS_URL=
```

---

## Secret Rotation Process

### Step 1: Generate New Secrets

```bash
# Generate all application secrets
npm run rotate:secrets

# Or generate individual secrets
npm run generate:secret

# Using OpenSSL directly
openssl rand -base64 64  # For SESSION_SECRET
openssl rand -base64 32  # For CSRF_SECRET, ENCRYPTION_KEY
```

### Step 2: Update Development Environment

```bash
# 1. Update .env file with new secrets
SESSION_SECRET=<new-secret-from-step-1>
CSRF_SECRET=<new-csrf-secret>
ENCRYPTION_KEY=<new-encryption-key>

# 2. Validate secrets
npm run validate:secrets

# 3. Test application locally
npm run dev

# 4. Run tests
npm test
```

### Step 3: Update Staging Environment

```bash
# For Vercel
vercel env add SESSION_SECRET staging
vercel env add CSRF_SECRET staging
vercel env add ENCRYPTION_KEY staging

# Redeploy staging
npm run deploy:staging

# Test staging environment
curl https://staging.imobibase.com/api/health
```

### Step 4: Update Production Environment

```bash
# IMPORTANT: Do this during low-traffic hours

# 1. Backup old secrets (in case rollback is needed)
echo "SESSION_SECRET=$SESSION_SECRET" > .secrets-backup-$(date +%Y%m%d).txt
chmod 600 .secrets-backup-*.txt

# 2. Update production secrets
vercel env add SESSION_SECRET production
vercel env add CSRF_SECRET production
vercel env add ENCRYPTION_KEY production

# 3. Deploy to production
npm run deploy:production

# 4. Monitor application health
watch -n 5 'curl -s https://imobibase.com/api/health | jq'

# 5. Check for errors in logs
vercel logs --follow
```

### Step 5: Update Secret Rotation Date

```bash
# Add to .env
LAST_SECRET_ROTATION=2025-12-26

# Document rotation in changelog
echo "$(date +%Y-%m-%d): Rotated SESSION_SECRET, CSRF_SECRET, ENCRYPTION_KEY" >> CHANGELOG.md
```

### Step 6: Cleanup

```bash
# After 24 hours of successful operation:

# 1. Delete backup files securely
shred -vfz -n 10 .secrets-backup-*.txt

# 2. Revoke old API keys (if rotating external APIs)
# - Go to provider dashboard
# - Revoke old keys
# - Document revocation
```

---

## Automated Tools

### Generate Secrets

```bash
# Generate new session secret
npm run generate:secret

# Output:
# ========================================
#   SESSION_SECRET Generator
# ========================================
#
# Generated SESSION_SECRET:
#
# <base64-encoded-secret>
#
# Add this to your .env file:
# SESSION_SECRET=<base64-encoded-secret>
```

### Rotate All Secrets

```bash
# Rotate SESSION_SECRET, CSRF_SECRET, ENCRYPTION_KEY
npm run rotate:secrets

# Output:
# 🔄 Starting secret rotation...
#
# Generated new secrets:
#
# # Add these to your .env file:
#
# SESSION_SECRET=<new-secret>
# CSRF_SECRET=<new-secret>
# ENCRYPTION_KEY=<new-secret>
#
# ⚠️  IMPORTANT:
# 1. Update .env file with new secrets
# 2. Update secrets in production environment (Vercel, AWS, etc)
# 3. Restart all application instances
# 4. Test that application works with new secrets
# 5. Store old secrets securely for rollback if needed
```

### Validate Secrets

```bash
# Validate all secrets before deployment
npm run validate:secrets

# Output:
# 🔍 Validating secrets...
#
# Valid secrets:
#    ✅ SESSION_SECRET: Valid
#    ✅ DATABASE_URL: Valid
#
# Warnings:
#    ⚠️  STRIPE_SECRET_KEY: Optional secret not configured
#
# Errors:
#    ❌ SESSION_SECRET: Too short (minimum 32 characters, got 16)
```

---

## Emergency Rotation

If a secret is compromised:

### Immediate Actions (Within 1 Hour)

```bash
# 1. Generate new secret immediately
openssl rand -base64 64

# 2. Update production IMMEDIATELY
vercel env add SESSION_SECRET production --force

# 3. Force redeploy
vercel deploy --prod --force

# 4. Invalidate all existing sessions
# (Sessions will automatically expire with new SESSION_SECRET)
```

### Short-term Actions (Within 24 Hours)

```bash
# 1. Rotate all related secrets
npm run rotate:secrets

# 2. Review access logs
vercel logs --since 24h > security-audit-$(date +%Y%m%d).log

# 3. Check for unauthorized access
grep "401\|403\|500" security-audit-*.log

# 4. Document incident
echo "$(date): Emergency rotation - Reason: <describe>" >> SECURITY_INCIDENTS.md
```

### Long-term Actions (Within 1 Week)

```bash
# 1. Root cause analysis
# - How was secret exposed?
# - Who had access?
# - What systems were affected?

# 2. Implement preventive measures
# - Update secret scanning rules
# - Review access controls
# - Update training materials

# 3. Security review
# - Audit all other secrets
# - Review git history
# - Check backup files
```

---

## Validation

### Pre-deployment Validation

```bash
# 1. Validate secret format
npm run validate:secrets

# 2. Test application locally
npm run dev

# 3. Run integration tests
npm run test:integration

# 4. Test authentication flows
npm run test:smoke
```

### Post-deployment Validation

```bash
# 1. Health check
curl https://imobibase.com/api/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-12-26T...",
#   "version": "1.0.0"
# }

# 2. Test login
curl -X POST https://imobibase.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password"}'

# 3. Monitor error rates
vercel logs --follow | grep "ERROR"

# 4. Check session creation
# - Login to application
# - Verify session cookie is set
# - Verify session persists across requests
```

---

## Best Practices

### Do's ✅

- **DO** use the automated tools (`npm run rotate:secrets`)
- **DO** rotate secrets on a regular schedule
- **DO** test in development before deploying to production
- **DO** keep backups of old secrets for 24 hours (for rollback)
- **DO** document rotation dates in `.env` (`LAST_SECRET_ROTATION`)
- **DO** use strong, cryptographically random secrets (64+ characters)
- **DO** rotate immediately after security incidents
- **DO** use different secrets for each environment

### Don'ts ❌

- **DON'T** commit secrets to git
- **DON'T** share secrets via email/Slack
- **DON'T** use the same secret across environments
- **DON'T** use weak or predictable secrets
- **DON'T** forget to test after rotation
- **DON'T** rotate during high-traffic periods
- **DON'T** keep backup files longer than necessary
- **DON'T** skip validation steps

---

## Troubleshooting

### "Application won't start after rotation"

```bash
# 1. Check secret format
npm run validate:secrets

# 2. Verify environment variables
vercel env ls

# 3. Check logs
vercel logs --follow

# 4. Rollback if needed
vercel rollback
```

### "Users are getting logged out"

This is **expected behavior** when rotating `SESSION_SECRET`:

```bash
# SESSION_SECRET rotation invalidates all existing sessions
# Users will need to log in again
# This is a security feature, not a bug

# Communication template:
# "We have performed a scheduled security update.
#  Please log in again to continue using the application."
```

### "API integrations are broken"

```bash
# 1. Verify you updated the correct API key
echo $STRIPE_SECRET_KEY

# 2. Check API provider dashboard
# - Verify new key is active
# - Check if old key was revoked too soon

# 3. Test API connectivity
curl -X POST https://api.stripe.com/v1/customers \
  -u "$STRIPE_SECRET_KEY:"

# 4. Rollback if needed
vercel env add STRIPE_SECRET_KEY production --force
```

---

## Compliance & Audit Trail

### Documentation Requirements

```bash
# 1. Record rotation in changelog
echo "$(date +%Y-%m-%d): Rotated SESSION_SECRET (scheduled quarterly rotation)" >> CHANGELOG.md

# 2. Update .env.example
LAST_SECRET_ROTATION=2025-12-26

# 3. Update security documentation
# Document who performed rotation, when, and why
```

### Audit Trail Template

```markdown
## Secret Rotation Log

### 2025-12-26 - Quarterly Rotation
- **Secrets Rotated**: SESSION_SECRET, CSRF_SECRET, ENCRYPTION_KEY
- **Performed By**: devops@imobibase.com
- **Reason**: Scheduled quarterly rotation
- **Impact**: All users logged out (expected)
- **Validation**: ✅ All tests passed
- **Rollback Plan**: Backup stored in vault until 2025-12-27

### 2025-09-15 - Emergency Rotation
- **Secrets Rotated**: STRIPE_SECRET_KEY
- **Performed By**: security@imobibase.com
- **Reason**: Suspected compromise (secret in logs)
- **Impact**: Payment processing interrupted for 5 minutes
- **Validation**: ✅ All payment tests passed
- **Post-mortem**: Updated log scrubbing rules
```

---

## Quick Reference

### Common Commands

```bash
# Generate new secret
npm run generate:secret

# Rotate all secrets
npm run rotate:secrets

# Validate secrets
npm run validate:secrets

# Update Vercel secret
vercel env add SESSION_SECRET production

# Test locally
npm run dev

# Deploy to production
npm run deploy:production
```

### Emergency Contact

```bash
# Security incidents
security@imobibase.com

# DevOps support
devops@imobibase.com

# On-call escalation
[Add PagerDuty/OpsGenie link]
```

---

## Resources

- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)

---

**Last Updated**: 2025-12-26
**Next Review**: 2026-03-26 (Quarterly)
