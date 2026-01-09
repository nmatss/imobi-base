# ImobiBase - Deployment Guide

Complete guide for deploying ImobiBase to production and staging environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Deployment Methods](#deployment-methods)
5. [Monitoring & Observability](#monitoring--observability)
6. [Rollback Strategy](#rollback-strategy)
7. [Security Checklist](#security-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js**: v20.x or higher
- **npm**: v9.x or higher
- **Git**: v2.x or higher
- **Docker**: v24.x or higher (for containerized deployments)
- **Vercel CLI**: Latest version (for Vercel deployments)

```bash
# Install required tools
npm install -g vercel@latest
```

### Required Accounts & Services

- [ ] GitHub account with repository access
- [ ] Vercel account (for serverless deployment)
- [ ] Supabase project (PostgreSQL database)
- [ ] Upstash Redis instance
- [ ] Sentry account (error tracking)
- [ ] SendGrid or Resend account (email service)
- [ ] Domain configured (production)

---

## Environment Configuration

### Environment Files

We use three environment files for different stages:

- `.env.development` - Local development
- `.env.staging` - Staging/preview deployments
- `.env.production` - Production deployments

### Required Environment Variables

Copy the appropriate `.env.example` file and fill in the values:

```bash
cp .env.example .env.production
```

#### Critical Variables (Must Configure)

```env
# Database
DATABASE_URL=postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres

# Session Security
SESSION_SECRET=<generate-with-openssl-rand-base64-32>

# Monitoring
SENTRY_DSN=https://xxxxx@o0000000.ingest.sentry.io/0000000

# Email Service
SENDGRID_API_KEY=SG.xxxxx
# OR
RESEND_API_KEY=re_xxxxx

# Redis Cache
REDIS_URL=redis://default:xxxxx@xxxxx.upstash.io:6379
```

#### Optional But Recommended

```env
# Payment Gateways
STRIPE_SECRET_KEY=sk_live_xxxxx
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxx

# Integrations
GOOGLE_MAPS_API_KEY=AIzaxxxxx
WHATSAPP_API_TOKEN=EAAxxxxx
TWILIO_ACCOUNT_SID=ACxxxxx

# Analytics
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
POSTHOG_API_KEY=phc_xxxxx
```

### Generating Secrets

```bash
# Generate a strong session secret
openssl rand -base64 32

# Generate multiple secrets at once
for i in {1..3}; do openssl rand -base64 32; done
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

We have three main workflows:

#### 1. CI Pipeline (`.github/workflows/ci.yml`)

Runs on every push and pull request:

- **Lint & TypeScript Check**: Validates code quality
- **Tests**: Runs unit and integration tests
- **Build**: Creates production build
- **E2E Tests**: Playwright end-to-end tests
- **Lighthouse CI**: Performance audits (PRs only)
- **Database Check**: Validates schema files

#### 2. Deploy to Production (`.github/workflows/deploy-production.yml`)

Triggers on push to `main` branch:

- Deploys to Vercel production
- Runs database migrations
- Notifies Sentry of release
- Performs health check
- Creates GitHub deployment

#### 3. Deploy to Staging (`.github/workflows/deploy-preview.yml`)

Triggers on push to `develop` branch:

- Deploys to Vercel preview
- Runs in staging environment
- No production migrations

### Required GitHub Secrets

Configure these in your GitHub repository settings:

```
Settings → Secrets and variables → Actions → New repository secret
```

**Vercel Secrets:**
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Organization ID
- `VERCEL_PROJECT_ID` - Project ID

**Database:**
- `DATABASE_URL` - Production database URL
- `TEST_DATABASE_URL` - Test database URL (optional)

**Monitoring:**
- `SENTRY_DSN` - Sentry error tracking
- `SENTRY_AUTH_TOKEN` - For release notifications
- `SENTRY_ORG` - Sentry organization slug

**Services:**
- `SENDGRID_API_KEY` or `RESEND_API_KEY`
- `REDIS_URL`
- `STRIPE_SECRET_KEY`
- `GOOGLE_MAPS_API_KEY`

**Optional:**
- `CODECOV_TOKEN` - Code coverage reporting

---

## Deployment Methods

### Method 1: Vercel (Recommended)

#### Initial Setup

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Configure environment variables
vercel env add DATABASE_URL production
vercel env add SESSION_SECRET production
# ... add all required variables
```

#### Deploy to Staging

```bash
# Manual deployment to staging
npm run build
vercel
```

#### Deploy to Production

```bash
# Option 1: Use deployment script
./scripts/deploy.sh production

# Option 2: Manual deployment
npm run build
vercel --prod

# Option 3: Push to main branch (auto-deploy via GitHub Actions)
git push origin main
```

### Method 2: Docker

#### Build Docker Image

```bash
# Build the image
docker build -t imobibase:latest .

# Test locally
docker run -p 5000:5000 --env-file .env.production imobibase:latest
```

#### Deploy with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

#### Production Docker Setup

```bash
# 1. Set environment variables
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export REDIS_PASSWORD=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)

# 2. Create .env.production file
cat > .env.production << EOF
DATABASE_URL=postgresql://imobibase:${POSTGRES_PASSWORD}@postgres:5432/imobibase
REDIS_URL=redis://redis:6379
SESSION_SECRET=${SESSION_SECRET}
# ... add other variables
EOF

# 3. Deploy
docker-compose up -d --build

# 4. Run migrations
docker-compose exec app npm run db:push

# 5. Health check
curl http://localhost:5000/api/health
```

### Method 3: Traditional Server

#### Prerequisites

- Ubuntu 22.04 LTS or similar
- Node.js 20.x
- PostgreSQL 15+
- Redis 7+
- Nginx

#### Setup Steps

```bash
# 1. Clone repository
git clone https://github.com/your-org/imobibase.git
cd imobibase

# 2. Install dependencies
npm ci --production

# 3. Build application
npm run build

# 4. Setup environment
cp .env.production .env

# 5. Setup systemd service
sudo cp deployment/imobibase.service /etc/systemd/system/
sudo systemctl enable imobibase
sudo systemctl start imobibase

# 6. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/imobibase
sudo ln -s /etc/nginx/sites-available/imobibase /etc/nginx/sites-enabled/
sudo systemctl reload nginx
```

---

## Monitoring & Observability

### Health Checks

The application exposes a health check endpoint:

```bash
# Check application health
curl https://imobibase.com/api/health

# Response
{
  "status": "ok",
  "timestamp": "2024-12-24T19:00:00.000Z",
  "database": "connected",
  "uptime": 3600
}
```

### Sentry Error Tracking

Sentry is configured for both client and server:

- **Client**: Automatic error capture, session replay, performance monitoring
- **Server**: Error tracking, request tracing, performance monitoring

Access your Sentry dashboard at: https://sentry.io

### Performance Monitoring

#### Web Vitals

Core Web Vitals are automatically tracked:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1
- **INP** (Interaction to Next Paint): < 200ms

#### Lighthouse CI

Performance audits run on every PR:
- Performance score: 80+
- Accessibility score: 90+
- Best practices score: 90+
- SEO score: 90+

View reports in GitHub Actions artifacts.

### Uptime Monitoring

Configure external uptime monitoring (recommended services):
- UptimeRobot (https://uptimerobot.com)
- Pingdom (https://www.pingdom.com)
- Better Uptime (https://betteruptime.com)

**Endpoints to Monitor:**
- `https://imobibase.com/api/health` (every 5 minutes)
- `https://imobibase.com` (every 5 minutes)

---

## Rollback Strategy

### Automatic Rollback (Vercel)

Vercel keeps previous deployments available:

```bash
# View deployments
vercel ls --prod

# Rollback to previous version
vercel rollback

# Or use the script
./scripts/rollback.sh production
```

### Manual Rollback (Docker)

```bash
# 1. List Docker images
docker images imobibase

# 2. Stop current deployment
docker-compose down

# 3. Use previous image
docker tag <previous-image-id> imobibase:latest
docker-compose up -d

# Or use the script
./scripts/rollback.sh production
```

### Database Rollback

**IMPORTANT**: Database rollbacks are risky. Always test migrations first.

```bash
# Restore from backup
cat backups/db_backup_YYYYMMDD_HHMMSS.sql | \
  docker-compose exec -T postgres psql -U imobibase imobibase
```

### Post-Rollback Checklist

- [ ] Verify application health check
- [ ] Test critical user flows
- [ ] Check error rates in Sentry
- [ ] Verify database connectivity
- [ ] Notify team of rollback
- [ ] Create incident report
- [ ] Plan fix for next deployment

---

## Security Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Strong session secret generated (32+ characters)
- [ ] Database passwords are strong and unique
- [ ] API keys are production keys (not test/sandbox)
- [ ] CORS origins properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured (helmet)
- [ ] HTTPS enforced in production
- [ ] Dependencies updated (no critical vulnerabilities)

### Post-Deployment

- [ ] SSL/TLS certificate valid
- [ ] Security headers present (check securityheaders.com)
- [ ] No sensitive data in client bundle
- [ ] Error messages don't leak sensitive info
- [ ] Admin routes require authentication
- [ ] File uploads have size limits
- [ ] SQL injection protection verified
- [ ] XSS protection verified
- [ ] CSRF protection enabled

### Security Scanning

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Check production dependencies only
npm audit --production

# Generate security report
npm audit --json > security-audit.json
```

---

## Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

#### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check connection pooling
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

#### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# Check Redis info
redis-cli -u $REDIS_URL info
```

#### High Memory Usage

```bash
# Check Node.js memory usage
docker stats

# Increase memory limit if needed (Vercel)
# Update vercel.json:
{
  "functions": {
    "dist/index.cjs": {
      "memory": 2048
    }
  }
}
```

#### Slow Performance

1. Check Lighthouse CI reports
2. Review Sentry performance monitoring
3. Check database query performance
4. Verify CDN configuration
5. Enable compression (gzip/brotli)

### Debug Mode

```bash
# Enable debug logging
export NODE_ENV=development
export DEBUG=*

# Or for specific modules
export DEBUG=express:*,db:*
```

### Getting Help

1. **Check logs**: GitHub Actions, Vercel, Docker logs
2. **Review Sentry**: Error patterns and stack traces
3. **Database logs**: Check PostgreSQL logs
4. **Health check**: Verify `/api/health` response
5. **Community**: Check GitHub issues or Stack Overflow

---

## Deployment Checklist

### Before Every Deployment

- [ ] All tests passing locally
- [ ] TypeScript check passes
- [ ] Code reviewed and approved
- [ ] Environment variables updated
- [ ] Database migrations tested
- [ ] Backup created (production)
- [ ] Stakeholders notified

### During Deployment

- [ ] Monitor deployment progress
- [ ] Watch for errors in logs
- [ ] Verify health check
- [ ] Test critical paths
- [ ] Check error rates in Sentry

### After Deployment

- [ ] Verify application is accessible
- [ ] Test main user flows
- [ ] Check performance metrics
- [ ] Review error logs
- [ ] Update documentation if needed
- [ ] Notify team of completion

---

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Docker Documentation](https://docs.docker.com)
- [Supabase Documentation](https://supabase.com/docs)
- [Sentry Documentation](https://docs.sentry.io)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)

---

## Support

For deployment issues or questions:

- **GitHub Issues**: https://github.com/your-org/imobibase/issues
- **Documentation**: Check this guide and related docs
- **Team Chat**: Contact DevOps team

---

**Last Updated**: December 2024
**Version**: 1.0.0
