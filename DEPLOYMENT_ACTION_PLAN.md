# DEPLOYMENT ACTION PLAN
## Step-by-Step Guide to Production

**Target:** Production deployment in 5 hours
**Risk Level:** LOW
**Confidence:** HIGH (95%+)

---

## ⏱️ TIMELINE

| Phase | Duration | Status |
|-------|----------|--------|
| **Phase 1:** P0 Fixes | 30 min | 🔴 Required |
| **Phase 2:** Environment Setup | 30 min | 🔴 Required |
| **Phase 3:** Staging Deployment | 2 hours | 🟡 Recommended |
| **Phase 4:** Production Deployment | 1 hour | 🔴 Required |
| **Phase 5:** Post-Deploy Monitoring | 1 hour | 🔴 Required |
| **Total** | **5 hours** | |

---

## 🔴 PHASE 1: P0 CRITICAL FIXES (30 minutes)

### Fix 1: Set SESSION_SECRET (10 min)

```bash
# Step 1: Generate secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Step 2: Copy output and add to .env file
# Open .env
nano .env

# Add this line (replace with your generated secret)
SESSION_SECRET=your_64_character_hex_string_here

# Step 3: Verify it's set
grep SESSION_SECRET .env
```

**Success Criteria:** SESSION_SECRET exists in .env with 64-character hex value

---

### Fix 2: Remove Duplicate Method (5 min)

```bash
# Step 1: Open the file
nano server/storage.ts

# Step 2: Go to line 3287 (or search for "getTenantSettings")
# Delete the SECOND occurrence of the getTenantSettings method

# Step 3: Save and verify
npm run check
```

**Location:** `server/storage.ts:3287`
**Action:** Delete duplicate `getTenantSettings` method (keep the first one at line 1829)

**Success Criteria:** TypeScript check passes for this file

---

### Fix 3: Install Missing Type Definitions (2 min)

```bash
# Install missing types
npm install --save-dev @types/compression @types/bytes @types/jsdom

# Verify installation
npm list @types/compression @types/bytes @types/jsdom
```

**Success Criteria:** All three packages installed successfully

---

### Verification (13 min)

```bash
# Run build
npm run build

# Should succeed with only 2 warnings (acceptable)
# Look for: "✓ built in..."

# Run tests
npm test

# Should show: 859+ tests passing

# Check TypeScript
npx tsc --noEmit | wc -l

# Should show reduced error count
```

**Success Criteria:**
- ✅ Build succeeds
- ✅ Tests pass (95%+ pass rate)
- ✅ TypeScript errors reduced

---

## 🔴 PHASE 2: ENVIRONMENT SETUP (30 minutes)

### Step 1: Create Production .env (10 min)

```bash
# Copy example
cp .env.example .env.production

# Edit production environment
nano .env.production
```

**Required Variables:**

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host:5432/imobibase_prod

# Session Security (REQUIRED)
SESSION_SECRET=<your-64-char-hex-from-phase-1>

# Node Environment (REQUIRED)
NODE_ENV=production
PORT=5000

# Application
VITE_API_URL=https://api.imobibase.com

# Monitoring (RECOMMENDED)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=<your-sentry-token>

# Optional Services
GOOGLE_MAPS_API_KEY=<your-key>
STRIPE_SECRET_KEY=sk_live_...
MERCADOPAGO_ACCESS_TOKEN=...
SENDGRID_API_KEY=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

**Success Criteria:** All REQUIRED variables set

---

### Step 2: Database Setup (15 min)

```bash
# Create production database
createdb imobibase_prod

# Or using psql
psql -U postgres -c "CREATE DATABASE imobibase_prod;"

# Run migrations
DATABASE_URL="postgresql://..." npm run db:migrate

# Apply performance indexes
npm run db:indexes:apply

# Verify schema
psql $DATABASE_URL -c "\dt"

# Should show all tables
```

**Success Criteria:**
- ✅ Database created
- ✅ Migrations applied
- ✅ Indexes created
- ✅ Schema verified

---

### Step 3: SSL/TLS Setup (5 min)

```bash
# If using Let's Encrypt
sudo certbot certonly --standalone -d imobibase.com -d www.imobibase.com

# If using custom certificates
# Copy cert files to /etc/ssl/certs/

# Verify certificates
openssl x509 -in /etc/letsencrypt/live/imobibase.com/fullchain.pem -noout -text
```

**Success Criteria:** Valid SSL certificate installed

---

## 🟡 PHASE 3: STAGING DEPLOYMENT (2 hours)

### Step 1: Deploy to Staging (30 min)

```bash
# Set staging environment
export NODE_ENV=staging

# Build application
npm run build

# Deploy to staging server (method varies)
# Option A: Direct deployment
scp -r dist/ user@staging.imobibase.com:/var/www/imobibase/

# Option B: Using deployment script
npm run deploy:staging

# Start application on staging
ssh user@staging.imobibase.com
cd /var/www/imobibase
npm start
```

**Success Criteria:** Staging server running and accessible

---

### Step 2: Smoke Testing (30 min)

```bash
# Test health endpoint
curl -f https://staging.imobibase.com/api/health

# Expected response:
# {"status":"ok","timestamp":"..."}

# Run automated smoke tests
npm run test:smoke -- --base-url=https://staging.imobibase.com

# Manual checks:
# 1. Visit https://staging.imobibase.com
# 2. Try to login
# 3. Create a test lead
# 4. Create a test property
# 5. Check dashboard loads
# 6. Verify no console errors
```

**Success Criteria:**
- ✅ Health check passes
- ✅ Smoke tests pass
- ✅ Manual testing successful
- ✅ No critical errors

---

### Step 3: Performance Testing (30 min)

```bash
# Run Lighthouse CI
npm run lighthouse:ci

# Expected scores:
# Performance: 85+
# Accessibility: 90+
# Best Practices: 90+
# SEO: 90+

# Load testing (if available)
# artillery quick --count 100 --num 10 https://staging.imobibase.com

# Monitor server metrics
# CPU < 70%
# Memory < 80%
# Response time < 200ms p95
```

**Success Criteria:**
- ✅ Lighthouse scores meet targets
- ✅ Server handles load
- ✅ No performance regressions

---

### Step 4: Security Testing (30 min)

```bash
# Test security headers
curl -I https://staging.imobibase.com

# Should include:
# Strict-Transport-Security
# Content-Security-Policy
# X-Content-Type-Options
# X-Frame-Options
# etc.

# Test rate limiting
for i in {1..100}; do
  curl -s https://staging.imobibase.com/api/leads > /dev/null
done

# Should start returning 429 after ~30 requests

# Test authentication
curl -X POST https://staging.imobibase.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'

# Should return 401 Unauthorized

# Test CSRF protection
curl -X POST https://staging.imobibase.com/api/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"Test"}'

# Should return 403 Forbidden (no CSRF token)
```

**Success Criteria:**
- ✅ All security headers present
- ✅ Rate limiting works
- ✅ Authentication required
- ✅ CSRF protection active

---

## 🔴 PHASE 4: PRODUCTION DEPLOYMENT (1 hour)

### Step 1: Pre-Deployment Checklist (15 min)

```bash
# Verify staging is stable (check last 2 hours)
# - No critical errors in logs
# - No performance issues
# - No security incidents

# Create backup of current production (if exists)
pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Notify team
# Send message: "Production deployment starting in 5 minutes"

# Put up maintenance page (optional)
# curl https://imobibase.com -> "Maintenance in progress"
```

**Checklist:**
- [ ] Staging verified stable
- [ ] Database backup created
- [ ] Team notified
- [ ] Maintenance page ready (optional)

---

### Step 2: Deploy to Production (20 min)

```bash
# Set production environment
export NODE_ENV=production

# Build production assets
npm run build

# Deploy to production server
npm run deploy:production

# Or manual deployment:
scp -r dist/ user@imobibase.com:/var/www/imobibase/
ssh user@imobibase.com
cd /var/www/imobibase
npm install --production
npm start
```

**Success Criteria:** Production deployment successful

---

### Step 3: Verify Deployment (15 min)

```bash
# Test health endpoint
curl -f https://imobibase.com/api/health

# Check application logs
ssh user@imobibase.com
tail -f /var/log/imobibase/app.log

# Verify in browser
# 1. Open https://imobibase.com
# 2. Login works
# 3. Dashboard loads
# 4. No console errors

# Check database connectivity
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Verify all services
systemctl status imobibase
systemctl status nginx
systemctl status postgresql
```

**Success Criteria:**
- ✅ Health check passes
- ✅ Application running
- ✅ Database accessible
- ✅ All services up

---

### Step 4: Enable Production Traffic (10 min)

```bash
# Remove maintenance page (if used)
# Configure load balancer/reverse proxy

# Nginx example:
sudo nano /etc/nginx/sites-available/imobibase.com

# Ensure proxy_pass points to production
# proxy_pass http://localhost:5000;

# Reload Nginx
sudo nginx -t
sudo systemctl reload nginx

# Verify traffic routing
curl -I https://imobibase.com

# Monitor initial traffic
tail -f /var/log/nginx/access.log
tail -f /var/log/imobibase/app.log
```

**Success Criteria:** Production receiving and serving traffic

---

## 🔴 PHASE 5: POST-DEPLOYMENT MONITORING (1 hour)

### First 15 Minutes - Critical Monitoring

```bash
# Watch error logs
tail -f /var/log/imobibase/error.log

# Watch application logs
tail -f /var/log/imobibase/app.log

# Monitor Sentry for errors
# Visit: https://sentry.io/organizations/<org>/issues/

# Check server metrics
htop
# CPU should be < 70%
# Memory should be < 80%

# Monitor response times
while true; do
  curl -w "@curl-format.txt" -o /dev/null -s https://imobibase.com/api/health
  sleep 5
done
```

**Red Flags (Rollback if seen):**
- ❌ Error rate > 5%
- ❌ Response time > 2s
- ❌ CPU > 90%
- ❌ Memory > 95%
- ❌ Database connection errors

---

### First Hour - Active Monitoring

**Monitor These Metrics:**

```bash
# Error rate
grep "ERROR" /var/log/imobibase/app.log | wc -l
# Target: < 10 errors/hour

# Response time
# Check Sentry performance monitoring
# Target: < 200ms p95

# Traffic
tail -100 /var/log/nginx/access.log | grep "200\|201\|204" | wc -l
# Should see successful requests

# Failed logins
grep "login_failed" /var/log/imobibase/security.log | wc -l
# Target: < 5 failures/hour (normal usage)

# Rate limiting
grep "rate_limit_exceeded" /var/log/imobibase/security.log | wc -l
# Target: Occasional (not constant)
```

---

### First 24 Hours - Continuous Monitoring

**Daily Checklist:**

- [ ] Check Sentry for new errors
- [ ] Review application logs
- [ ] Monitor server resources
- [ ] Verify backup completed
- [ ] Check security events
- [ ] Review user feedback
- [ ] Monitor performance metrics

**Alerts to Configure:**

```bash
# High error rate
if error_rate > 1% for 5min then alert

# Slow response time
if response_time > 500ms p95 for 5min then alert

# High CPU usage
if cpu > 80% for 10min then alert

# High memory usage
if memory > 85% for 10min then alert

# Failed logins spike
if failed_logins > 20 in 5min then alert

# Service down
if health_check fails for 2min then alert
```

---

## 🚨 ROLLBACK PROCEDURE

### When to Rollback

Rollback immediately if:
- ❌ Error rate > 10% for 5+ minutes
- ❌ Critical functionality broken
- ❌ Database corruption detected
- ❌ Security breach suspected
- ❌ Unrecoverable errors

### Rollback Steps (15 minutes)

```bash
# 1. Execute rollback script
npm run rollback:production

# Or manually:
ssh user@imobibase.com
cd /var/www/imobibase
git checkout <previous-version-tag>
npm install --production
npm start

# 2. Restore database (if needed)
psql $PROD_DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql

# 3. Verify rollback
curl -f https://imobibase.com/api/health

# 4. Notify team
# "Rollback completed. Investigating issue."

# 5. Investigate root cause
tail -1000 /var/log/imobibase/error.log
# Check Sentry for error details
```

---

## 📋 POST-DEPLOYMENT TASKS

### Immediate (Day 1)

- [ ] Monitor for 24 hours continuously
- [ ] Document any issues encountered
- [ ] Update runbook with learnings
- [ ] Celebrate successful deployment! 🎉

### Week 1

- [ ] Review all logs daily
- [ ] Monitor user feedback
- [ ] Check performance metrics
- [ ] Verify backup process
- [ ] Schedule security review

### Month 1

- [ ] Performance optimization review
- [ ] Security audit
- [ ] User satisfaction survey
- [ ] Capacity planning review
- [ ] Documentation updates

---

## 📊 SUCCESS METRICS

### Week 1 Targets

| Metric | Target | Current |
|--------|--------|---------|
| Uptime | 99.9% | - |
| Error Rate | < 0.1% | - |
| Response Time | < 200ms p95 | - |
| User Satisfaction | > 4.5/5 | - |
| Security Incidents | 0 | - |

### Track Daily

```bash
# Create daily report
cat > daily_report_$(date +%Y%m%d).txt << EOF
Date: $(date)

Uptime: $(uptime)

Error Count: $(grep "ERROR" /var/log/imobibase/app.log | wc -l)

Unique Users: $(grep "login_success" /var/log/imobibase/app.log | cut -d' ' -f4 | sort -u | wc -l)

Failed Logins: $(grep "login_failed" /var/log/imobibase/security.log | wc -l)

Rate Limit Events: $(grep "rate_limit" /var/log/imobibase/security.log | wc -l)

Database Size: $(psql $PROD_DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size('imobibase_prod'));")

Notes:
EOF

# Review daily
cat daily_report_$(date +%Y%m%d).txt
```

---

## 🎯 FINAL CHECKLIST

### Before Starting

- [ ] Read FINAL_100_PERCENT_REPORT.md
- [ ] Read SECURITY_FIXES_P0.md
- [ ] Team notified
- [ ] Backup plan ready
- [ ] Rollback tested
- [ ] Monitoring configured

### During Deployment

- [ ] Phase 1 completed (P0 fixes)
- [ ] Phase 2 completed (environment)
- [ ] Phase 3 completed (staging)
- [ ] Phase 4 completed (production)
- [ ] Phase 5 started (monitoring)

### After Deployment

- [ ] Production verified
- [ ] Monitoring active
- [ ] Team notified of success
- [ ] Documentation updated
- [ ] Post-mortem scheduled

---

## 📞 EMERGENCY CONTACTS

**Production Issues:**
- On-call developer: [Phone]
- DevOps lead: [Phone]
- CTO: [Phone]

**Security Issues:**
- Security team: security@imobibase.com
- Incident response: [Phone]

**Infrastructure:**
- Hosting provider: [Support]
- Database provider: [Support]

---

## 🎉 READY TO DEPLOY?

Follow this plan step-by-step and you'll have a successful deployment!

**Estimated Total Time:** 5 hours
**Risk Level:** LOW
**Confidence:** HIGH (95%+)

**Good luck! You've got this!** 🚀

---

**Created by:** Agent 19-20 - Final Validation Expert
**Date:** December 26, 2025
**Version:** 1.0

*"The best preparation for tomorrow is doing your best today."* - H. Jackson Brown Jr.
