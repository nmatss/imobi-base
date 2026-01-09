# GitHub Secrets Setup Guide

This document provides a comprehensive list of all GitHub Secrets required for the ImobiBase CI/CD pipeline, including how to obtain each secret and validation steps.

## Table of Contents
- [Deployment Secrets](#deployment-secrets)
- [Database Secrets](#database-secrets)
- [Monitoring & Error Tracking](#monitoring--error-tracking)
- [Email Service](#email-service)
- [Payment Gateways](#payment-gateways)
- [Integrations](#integrations)
- [Security & Authentication](#security--authentication)
- [Validation Checklist](#validation-checklist)

---

## Deployment Secrets

### VERCEL_TOKEN
**Required**: Yes
**Purpose**: Deploy to Vercel production environment

**How to obtain**:
1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Name it: "GitHub Actions - ImobiBase"
4. Set scope: Full Account
5. Copy the generated token immediately (won't be shown again)

**How to add to GitHub**:
```bash
# GitHub Repository -> Settings -> Secrets and variables -> Actions
# Click "New repository secret"
# Name: VERCEL_TOKEN
# Value: [paste your token]
```

**Validation**:
```bash
# Test locally
vercel whoami --token YOUR_TOKEN
# Should show your Vercel username
```

---

## Database Secrets

### DATABASE_URL
**Required**: Yes
**Purpose**: PostgreSQL connection for production database and migrations

**Format**:
```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

**How to obtain (Supabase)**:
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Click "Settings" → "Database"
4. Find "Connection string" section
5. Select "URI" format
6. Copy the "Connection Pooling" string (port 6543)
7. Replace `[YOUR-PASSWORD]` with your database password

**How to obtain (Other providers)**:
- **Neon**: Dashboard → Connection Details → Connection string (pooled)
- **Railway**: Project → Database → Connect → Postgres Connection URL
- **AWS RDS**: Use endpoint + credentials in format above

**Security Note**: Use connection pooling (port 6543) for serverless environments like Vercel.

**Validation**:
```bash
# Test connection locally
psql "YOUR_DATABASE_URL" -c "SELECT version();"
# Should return PostgreSQL version
```

---

## Monitoring & Error Tracking

### SENTRY_DSN
**Required**: Yes
**Purpose**: Error tracking and monitoring

**How to obtain**:
1. Go to [Sentry.io](https://sentry.io)
2. Create account or login
3. Create new project
4. Select platform: "Node.js"
5. Name: "ImobiBase Production"
6. Copy the DSN from the configuration page
7. Format: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxxx`

**How to add to GitHub**:
```bash
# Add as repository secret
Name: SENTRY_DSN
Value: https://xxxxx@oxxxxx.ingest.sentry.io/xxxxxx
```

**Validation**:
```bash
# Test Sentry integration
curl -X POST "YOUR_SENTRY_DSN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Test from GitHub Actions"}'
```

### SENTRY_ORG
**Required**: Yes (for deployment notifications)
**Purpose**: Organization slug for Sentry API calls

**How to obtain**:
1. In Sentry, go to Settings → General Settings
2. Find "Organization Slug"
3. Copy the slug (e.g., "my-company")

### SENTRY_AUTH_TOKEN
**Required**: Yes (for deployment notifications)
**Purpose**: API token for creating releases in Sentry

**How to obtain**:
1. In Sentry, go to Settings → Account → API → Auth Tokens
2. Click "Create New Token"
3. Name: "GitHub Actions - ImobiBase"
4. Scopes required:
   - `project:read`
   - `project:releases`
   - `org:read`
5. Copy the token immediately

**Validation**:
```bash
# Test token
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://sentry.io/api/0/organizations/YOUR_ORG/
# Should return organization details
```

---

## Email Service

### SENDGRID_API_KEY
**Required**: Recommended
**Purpose**: Send transactional emails

**How to obtain**:
1. Go to [SendGrid](https://sendgrid.com)
2. Sign up or login
3. Go to Settings → API Keys
4. Click "Create API Key"
5. Name: "ImobiBase Production"
6. Permission: "Full Access" or "Restricted Access" with Mail Send permissions
7. Copy the API key (starts with `SG.`)

**Alternative: RESEND_API_KEY**:
1. Go to [Resend](https://resend.com)
2. Create account
3. Go to API Keys
4. Create new key
5. Copy key (starts with `re_`)

**Validation**:
```bash
# Test SendGrid
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"test@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

### EMAIL_FROM
**Required**: Yes
**Purpose**: Sender email address

**Format**: `noreply@yourdomain.com`

**Note**: Domain must be verified in SendGrid/Resend

---

## Payment Gateways

### STRIPE_SECRET_KEY
**Required**: If using Stripe
**Purpose**: Process payments (global markets)

**How to obtain**:
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create account or login
3. Go to Developers → API keys
4. Copy "Secret key" (starts with `sk_live_` for production)
5. For testing, use `sk_test_` keys

**Security**: Never expose this key in client-side code.

### STRIPE_PUBLISHABLE_KEY
**Required**: If using Stripe
**Purpose**: Client-side Stripe integration

**How to obtain**:
1. Same location as secret key
2. Copy "Publishable key" (starts with `pk_live_`)

### STRIPE_WEBHOOK_SECRET
**Required**: If using Stripe webhooks
**Purpose**: Verify webhook signatures

**How to obtain**:
1. Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/webhooks/stripe`
4. Select events to listen for
5. Copy the "Signing secret" (starts with `whsec_`)

**Validation**:
```bash
# Test API key
curl https://api.stripe.com/v1/customers \
  -u YOUR_SECRET_KEY:
# Should return customer list or error (not authentication error)
```

### MERCADOPAGO_ACCESS_TOKEN
**Required**: If operating in Brazil
**Purpose**: Process payments via Mercado Pago

**How to obtain**:
1. Go to [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Create account/login
3. Go to "Suas integrações" → Create application
4. Copy "Access Token" (starts with `APP_USR-`)

### MERCADOPAGO_PUBLIC_KEY
**Required**: If using Mercado Pago
**Purpose**: Client-side integration

**How to obtain**:
- Same location as access token
- Copy "Public Key"

---

## Integrations

### GOOGLE_MAPS_API_KEY
**Required**: For maps functionality
**Purpose**: Display property locations, autocomplete addresses

**How to obtain**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project: "ImobiBase"
3. Enable APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. Go to Credentials → Create Credentials → API Key
5. Restrict key:
   - Application restrictions: HTTP referrers
   - Add your domains
   - API restrictions: Select the 3 APIs above
6. Copy the API key

**Cost**: Free tier includes $200/month credit

**Validation**:
```bash
# Test geocoding
curl "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_API_KEY"
```

### WHATSAPP_API_TOKEN
**Required**: If using WhatsApp integration
**Purpose**: Send WhatsApp messages

**How to obtain**:
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create app → Business → WhatsApp
3. Add WhatsApp product
4. Get test/production access token

### WHATSAPP_PHONE_NUMBER_ID
**Required**: If using WhatsApp
**Purpose**: Phone number identifier

**How to obtain**:
- From WhatsApp Business Platform setup
- Found in App Dashboard → WhatsApp → Getting Started

### TWILIO_ACCOUNT_SID
**Required**: If using SMS
**Purpose**: SMS notifications

**How to obtain**:
1. Go to [Twilio Console](https://console.twilio.com)
2. Create account
3. Find "Account SID" on dashboard

### TWILIO_AUTH_TOKEN
**Required**: If using SMS
**Purpose**: Authenticate Twilio API calls

**How to obtain**:
- Same dashboard as Account SID
- Click to reveal "Auth Token"

### TWILIO_PHONE_NUMBER
**Required**: If using SMS
**Purpose**: Sender phone number

**How to obtain**:
1. Twilio Console → Phone Numbers
2. Buy a number or use existing
3. Format: `+5511999999999`

**Validation**:
```bash
# Test SMS
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json" \
  --data-urlencode "Body=Test" \
  --data-urlencode "From=YOUR_TWILIO_NUMBER" \
  --data-urlencode "To=+1234567890" \
  -u YOUR_SID:YOUR_AUTH_TOKEN
```

### CLICKSIGN_API_KEY
**Required**: If using e-signatures (Brazil)
**Purpose**: Digital document signing

**How to obtain**:
1. Go to [ClickSign](https://www.clicksign.com)
2. Create account
3. Go to Integrações → API
4. Copy API key

---

## Security & Authentication

### SESSION_SECRET
**Required**: Yes
**Purpose**: Encrypt session cookies

**How to generate**:
```bash
# Generate secure random string
openssl rand -base64 32
# Or
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Security**:
- Must be at least 32 characters
- Different for each environment
- Never commit to git

### SUPABASE_URL
**Required**: If using Supabase Auth/Storage
**Purpose**: Supabase project endpoint

**How to obtain**:
1. Supabase Dashboard → Settings → API
2. Copy "Project URL"
3. Format: `https://xxxxx.supabase.co`

### SUPABASE_ANON_KEY
**Required**: If using Supabase
**Purpose**: Client-side Supabase access

**How to obtain**:
- Same location as URL
- Copy "anon/public" key

### SUPABASE_SERVICE_KEY
**Required**: For server-side Supabase operations
**Purpose**: Bypass Row Level Security (use carefully)

**How to obtain**:
- Same API settings page
- Copy "service_role" key

**Security**: NEVER expose in client-side code

---

## Caching & Background Jobs

### REDIS_URL
**Required**: Recommended for production
**Purpose**: Session storage, caching, background jobs

**How to obtain (Upstash - Free tier)**:
1. Go to [Upstash Console](https://console.upstash.com)
2. Create Redis database
3. Region: Choose closest to your Vercel region
4. Copy the "REDIS_URL" from database details
5. Format: `redis://default:xxxxx@xxxxx.upstash.io:6379`

**Alternative (Railway)**:
1. Create Redis service in Railway
2. Copy connection string from service variables

**Validation**:
```bash
# Test connection
redis-cli -u "YOUR_REDIS_URL" PING
# Should return: PONG
```

---

## Analytics (Optional)

### POSTHOG_API_KEY
**Optional**
**Purpose**: Product analytics

**How to obtain**:
1. Go to [PostHog](https://app.posthog.com)
2. Create project
3. Copy API key from Settings

### GOOGLE_ANALYTICS_ID
**Optional**
**Purpose**: Web analytics

**How to obtain**:
1. Google Analytics → Admin
2. Create property
3. Copy Measurement ID (format: `G-XXXXXXXXXX`)

---

## Validation Checklist

Use this checklist to ensure all secrets are properly configured:

### Core Requirements
- [ ] `VERCEL_TOKEN` - Deployment works
- [ ] `DATABASE_URL` - Database connection successful
- [ ] `SESSION_SECRET` - At least 32 characters, random
- [ ] `SENTRY_DSN` - Error tracking active
- [ ] `SENTRY_ORG` - Organization slug correct
- [ ] `SENTRY_AUTH_TOKEN` - Release creation works

### Email (Choose one)
- [ ] `SENDGRID_API_KEY` - Can send test email
- [ ] `RESEND_API_KEY` - Can send test email
- [ ] `EMAIL_FROM` - Domain verified

### Payment (If applicable)
- [ ] `STRIPE_SECRET_KEY` - API calls work
- [ ] `STRIPE_PUBLISHABLE_KEY` - Set correctly
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook verification works
- [ ] `MERCADOPAGO_ACCESS_TOKEN` - For Brazil operations
- [ ] `MERCADOPAGO_PUBLIC_KEY` - For Brazil operations

### Integrations (As needed)
- [ ] `GOOGLE_MAPS_API_KEY` - Maps load correctly
- [ ] `REDIS_URL` - Connection successful
- [ ] `TWILIO_ACCOUNT_SID` - SMS test successful
- [ ] `TWILIO_AUTH_TOKEN` - Authentication works
- [ ] `TWILIO_PHONE_NUMBER` - Number configured

### Testing All Secrets

**Automated validation script**:
```bash
# Run this in GitHub Actions or locally
npm run validate:secrets
```

**Manual validation**:
```bash
# Test deployment
vercel --token $VERCEL_TOKEN whoami

# Test database
psql "$DATABASE_URL" -c "SELECT NOW();"

# Test Sentry
curl -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
  https://sentry.io/api/0/

# Test Redis
redis-cli -u "$REDIS_URL" PING
```

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.example` with placeholder values
   - Add `.env*` to `.gitignore`

2. **Rotate secrets regularly**
   - Every 90 days for production
   - Immediately if compromised

3. **Use different secrets per environment**
   - Development: Test/sandbox keys
   - Staging: Separate production-like keys
   - Production: Live keys

4. **Limit secret access**
   - Only necessary team members
   - Use GitHub Environment protection rules

5. **Monitor secret usage**
   - Enable audit logs in provider dashboards
   - Set up alerts for unusual activity

6. **Use secret scanning**
   - Enable GitHub secret scanning
   - Use tools like `git-secrets` or `trufflehog`

---

## Troubleshooting

### Deployment fails with "Missing secrets"
- Check GitHub Actions logs for specific secret name
- Verify secret name matches exactly (case-sensitive)
- Ensure secret is set in correct environment (production)

### Database connection fails
- Verify DATABASE_URL format is correct
- Check if IP is whitelisted (some providers)
- Use connection pooling URL (port 6543 for Supabase)
- Test connection locally first

### Sentry not receiving errors
- Verify SENTRY_DSN is correct
- Check Sentry project is active
- Ensure network can reach Sentry (not blocked by firewall)

### Email not sending
- Verify API key is valid and not expired
- Check sender domain is verified
- Look for rate limiting
- Review provider logs

---

## Support Resources

- **Vercel**: https://vercel.com/docs
- **Supabase**: https://supabase.com/docs
- **Sentry**: https://docs.sentry.io
- **Stripe**: https://stripe.com/docs
- **SendGrid**: https://docs.sendgrid.com
- **Twilio**: https://www.twilio.com/docs

---

**Last Updated**: 2025-12-25
**Version**: 1.0.0
**Maintained by**: DevOps Team
