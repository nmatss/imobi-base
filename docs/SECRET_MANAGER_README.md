# Secret Manager - ImobiBase

## Overview

The Secret Manager is a centralized security module for managing application secrets and credentials. It provides validation, fail-fast behavior, and a migration path to enterprise secret management solutions.

## Quick Start

### 1. Generate Secrets

```bash
# Generate a new SESSION_SECRET
npm run generate:secret

# Rotate all application secrets
npm run rotate:secrets
```

### 2. Validate Secrets

```bash
# Validate all configured secrets
npm run validate:secrets
```

### 3. Configure Secrets

Add secrets to your `.env` file:

```bash
# Required secrets (production)
SESSION_SECRET=<generated-secret>
DATABASE_URL=postgresql://...

# Optional secrets
STRIPE_SECRET_KEY=sk_live_...
WHATSAPP_API_TOKEN=EAA...
GOOGLE_MAPS_API_KEY=AIza...
SENDGRID_API_KEY=SG....
```

---

## Architecture

### Secret Manager (`server/security/secret-manager.ts`)

Centralized secret management with:

- **Validation**: Verifies format, length, and patterns
- **Fail-fast**: Exits on invalid secrets in production
- **Type safety**: Strong typing for secret keys
- **Future-proof**: Easy migration to AWS/GCP/Vault

### Secret Configuration

```typescript
const SECRET_CONFIGS: Record<string, SecretConfig> = {
  SESSION_SECRET: {
    required: true,
    minLength: 32,
    description: 'Express session secret for signing cookies',
  },
  DATABASE_URL: {
    required: true,
    pattern: /^postgresql:\/\//,
    description: 'PostgreSQL connection string',
  },
  STRIPE_SECRET_KEY: {
    required: false,
    pattern: /^sk_(test|live)_/,
    description: 'Stripe API secret key',
  },
  // ... more secrets
};
```

---

## Usage

### Initialization (Automatic)

The Secret Manager is automatically initialized when the server starts:

```typescript
// server/routes.ts
import { secretManager } from "./security/secret-manager";

export async function registerRoutes(httpServer, app) {
  // Initialize and validate all secrets
  console.log('🔐 Initializing Secret Manager...');
  secretManager.initialize(process.env);

  // Continue with server setup...
}
```

### Getting Secrets

```typescript
import { secretManager } from './security/secret-manager';

// Get a secret (with fallback to process.env)
const sessionSecret = secretManager.get('SESSION_SECRET');

// Check if secret is configured
if (secretManager.has('STRIPE_SECRET_KEY')) {
  // Initialize Stripe
  const stripe = new Stripe(secretManager.get('STRIPE_SECRET_KEY')!);
}

// List all configured secrets (names only, no values)
const configuredSecrets = secretManager.list();
console.log('Configured secrets:', configuredSecrets);
```

---

## Validation Rules

### SESSION_SECRET

```typescript
{
  required: true,
  minLength: 32,
  description: 'Express session secret for signing cookies'
}
```

**Production Requirements:**
- ✅ Must be present
- ✅ Minimum 32 characters
- ✅ Cannot be default/weak value
- ❌ Will fail-fast if invalid

**Development:**
- ⚠️ Warning if using default value
- ✅ Application continues to run

### DATABASE_URL

```typescript
{
  required: true,
  pattern: /^postgresql:\/\//,
  description: 'PostgreSQL connection string'
}
```

**Requirements:**
- ✅ Must match pattern `postgresql://...`
- ✅ Required in all environments

### External API Keys

```typescript
STRIPE_SECRET_KEY: {
  required: false,
  pattern: /^sk_(test|live)_/,
  description: 'Stripe API secret key'
}
```

**Requirements:**
- ℹ️ Optional (not all apps use Stripe)
- ✅ If present, must match pattern
- ⚠️ Warning in production if not configured

---

## Scripts

### `npm run generate:secret`

Generates a cryptographically secure SESSION_SECRET.

**Output:**
```
========================================
  SESSION_SECRET Generator
========================================

Generated SESSION_SECRET:

<base64-encoded-secret>

========================================
  Configuration Instructions
========================================

Add this to your .env file:

SESSION_SECRET=<base64-encoded-secret>
```

**Implementation:** `scripts/generate-session-secret.ts`

### `npm run rotate:secrets`

Rotates all application secrets (SESSION_SECRET, CSRF_SECRET, ENCRYPTION_KEY).

**Output:**
```
🔄 Starting secret rotation...

Generated new secrets:

# Add these to your .env file:

SESSION_SECRET=<new-secret>
CSRF_SECRET=<new-secret>
ENCRYPTION_KEY=<new-secret>

⚠️  IMPORTANT:
1. Update .env file with new secrets
2. Update secrets in production environment (Vercel, AWS, etc)
3. Restart all application instances
4. Test that application works with new secrets
5. Store old secrets securely for rollback if needed

Secrets saved to: .secrets-backup.txt
⚠️  Delete this file after updating production!
```

**Implementation:** `scripts/rotate-secrets.ts`

**Security Notes:**
- Creates temporary backup file (`.secrets-backup.txt`)
- File permissions set to `0600` (owner read/write only)
- **DELETE BACKUP AFTER UPDATING PRODUCTION**

### `npm run validate:secrets`

Validates all secrets without starting the application.

**Output (Success):**
```
🔍 Validating secrets...

Valid secrets:
   ✅ SESSION_SECRET: Valid
   ✅ DATABASE_URL: Valid

Warnings:
   ⚠️  STRIPE_SECRET_KEY: Optional secret not configured

✅ All secrets validated successfully!
```

**Output (Errors):**
```
🔍 Validating secrets...

Errors:
   ❌ SESSION_SECRET: Too short (minimum 32 characters, got 16)
   ❌ DATABASE_URL: Invalid format (expected pattern: /^postgresql:\/\//)

🚨 Fix these errors before deploying to production
```

**Implementation:** `scripts/validate-secrets.ts`

**Use Cases:**
- Pre-deployment validation
- CI/CD pipelines
- Local development troubleshooting

---

## Error Handling

### Production Behavior

**Invalid Secret:**
```
🚨 SECRET VALIDATION ERRORS:
   - Missing required secret: SESSION_SECRET - Express session secret for signing cookies
   - Secret STRIPE_SECRET_KEY has invalid format. Expected pattern: /^sk_(test|live)_/

Application cannot start in production with invalid secrets
```

**Application exits with code 1 (fail-fast)**

### Development Behavior

**Invalid Secret:**
```
🚨 SECRET VALIDATION ERRORS:
   - Missing required secret: SESSION_SECRET - Express session secret for signing cookies

⚠️  SECRET WARNINGS:
   - Optional secret not configured: STRIPE_SECRET_KEY
```

**Application continues to run with warnings**

---

## Migration to Enterprise Solutions

The Secret Manager is designed to be a wrapper that simplifies future migration to enterprise secret management solutions.

### AWS Secrets Manager

```typescript
class SecretManager {
  async get(key: string): Promise<string | undefined> {
    // Check cache
    if (this.secrets.has(key)) {
      return this.secrets.get(key);
    }

    // Fetch from AWS Secrets Manager
    const client = new SecretsManagerClient({ region: 'us-east-1' });
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: key })
    );

    const value = response.SecretString;
    this.secrets.set(key, value); // Cache
    return value;
  }
}
```

### Google Cloud Secret Manager

```typescript
class SecretManager {
  async get(key: string): Promise<string | undefined> {
    if (this.secrets.has(key)) {
      return this.secrets.get(key);
    }

    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/${key}/versions/latest`,
    });

    const value = version.payload?.data?.toString();
    this.secrets.set(key, value);
    return value;
  }
}
```

### HashiCorp Vault

```typescript
class SecretManager {
  async get(key: string): Promise<string | undefined> {
    if (this.secrets.has(key)) {
      return this.secrets.get(key);
    }

    const vault = require('node-vault')({
      apiVersion: 'v1',
      endpoint: process.env.VAULT_ADDR,
      token: process.env.VAULT_TOKEN,
    });

    const result = await vault.read(`secret/data/${key}`);
    const value = result.data.data.value;
    this.secrets.set(key, value);
    return value;
  }
}
```

---

## Security Best Practices

### Do's ✅

1. **Use the Secret Manager for all secrets**
   ```typescript
   // Good
   const apiKey = secretManager.get('STRIPE_SECRET_KEY');

   // Bad
   const apiKey = process.env.STRIPE_SECRET_KEY;
   ```

2. **Validate before deployment**
   ```bash
   npm run validate:secrets
   npm run build
   npm run deploy:production
   ```

3. **Rotate secrets regularly**
   ```bash
   # Every 90 days
   npm run rotate:secrets
   ```

4. **Use strong, random secrets**
   ```bash
   # 64+ characters, cryptographically random
   npm run generate:secret
   ```

5. **Track rotation dates**
   ```bash
   # .env
   LAST_SECRET_ROTATION=2025-12-26
   ```

### Don'ts ❌

1. **Never hardcode secrets**
   ```typescript
   // NEVER DO THIS
   const apiKey = 'sk_live_abc123...';
   ```

2. **Never commit secrets to git**
   ```bash
   # Already configured in .gitignore
   .env*
   .secrets-backup*
   ```

3. **Never share secrets via email/Slack**
   ```
   Use secure secret sharing tools:
   - 1Password
   - Bitwarden
   - HashiCorp Vault
   ```

4. **Never use weak secrets**
   ```typescript
   // TOO WEAK
   SESSION_SECRET=secret
   SESSION_SECRET=password123

   // STRONG
   SESSION_SECRET=<64+ char random base64>
   ```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Validate secrets before deployment
      - name: Validate Secrets
        run: npm run validate:secrets
        env:
          SESSION_SECRET: ${{ secrets.SESSION_SECRET }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

      - name: Deploy
        run: npm run deploy:production
```

### Vercel

```bash
# Set secrets in Vercel
vercel env add SESSION_SECRET production
vercel env add DATABASE_URL production

# Deploy
vercel deploy --prod
```

### Pre-deployment Checklist

```bash
# 1. Validate secrets
npm run validate:secrets

# 2. Run tests
npm test

# 3. Build application
npm run build

# 4. Deploy
npm run deploy:production
```

---

## Troubleshooting

### "Missing required secret: SESSION_SECRET"

```bash
# Generate a new secret
npm run generate:secret

# Add to .env
echo "SESSION_SECRET=<generated-secret>" >> .env

# Validate
npm run validate:secrets
```

### "Secret too short"

```bash
# Generate a longer secret
openssl rand -base64 64

# Update .env with new secret
```

### "Invalid format"

```bash
# Check the expected pattern in validation errors
# Example for Stripe: Must start with sk_test_ or sk_live_

# Get correct key from provider dashboard
# Update .env with correct format
```

### "Application won't start"

```bash
# 1. Validate secrets
npm run validate:secrets

# 2. Check logs
npm run dev

# 3. Verify environment variables
printenv | grep SECRET
```

---

## File Permissions

### Backup Files

```bash
# Secret backup files are created with restricted permissions
-rw------- 1 user user  256 Dec 26 10:00 .secrets-backup.txt
           ↑
           Only owner can read/write
```

**Cleanup:**
```bash
# After updating production, securely delete backup
shred -vfz -n 10 .secrets-backup.txt
```

---

## Monitoring & Alerts

### Secret Expiration

```bash
# Track rotation dates
LAST_SECRET_ROTATION=2025-12-26

# Set calendar reminder
# Rotate every 90 days (2026-03-26)
```

### Failed Validation

```typescript
// Secret Manager logs validation errors
console.error('🚨 SECRET VALIDATION ERRORS:');
console.error('   - Missing required secret: SESSION_SECRET');

// In production: exits with code 1
// In development: continues with warnings
```

---

## Support

### Documentation
- [Secret Rotation Guide](./SECRET_ROTATION_GUIDE.md)
- [.env.example](../.env.example)
- [Security Documentation](./SECURITY.md)

### Tools
- `npm run generate:secret` - Generate secrets
- `npm run rotate:secrets` - Rotate secrets
- `npm run validate:secrets` - Validate secrets

### Resources
- [OWASP Key Management](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

**Last Updated**: 2025-12-26
**Version**: 1.0.0
