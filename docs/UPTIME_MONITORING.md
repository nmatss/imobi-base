# Uptime Monitoring Setup Guide

This guide covers setting up comprehensive uptime monitoring for ImobiBase using UptimeRobot and other monitoring tools.

## Table of Contents
- [UptimeRobot Setup](#uptimerobot-setup)
- [Endpoints to Monitor](#endpoints-to-monitor)
- [Alert Configuration](#alert-configuration)
- [Incident Response](#incident-response)
- [Alternative Monitoring Tools](#alternative-monitoring-tools)
- [Status Page](#status-page)

---

## UptimeRobot Setup

[UptimeRobot](https://uptimerobot.com) is a free uptime monitoring service that checks your website every 5 minutes (or 1 minute on paid plans).

### Step 1: Create Account

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Sign up for free account (50 monitors included)
3. Verify email address
4. Login to dashboard

### Step 2: Add API Key to GitHub Secrets (Optional)

For automated monitor management via API:

```bash
# In UptimeRobot Dashboard
# My Settings → API Settings → Generate API Key

# Add to GitHub Secrets
Name: UPTIMEROBOT_API_KEY
Value: [your-api-key]
```

---

## Endpoints to Monitor

Configure the following monitors in UptimeRobot:

### 1. Main Application Health Check

**Purpose**: Verify the application is running and database is accessible

```
Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Health Check
URL: https://imobibase.com/api/health
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET
Expected Status Code: 200
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-25T10:00:00.000Z",
  "version": "1.0.0",
  "database": "connected",
  "uptime": 12345
}
```

**Alert Keywords** (optional):
- Must contain: `"status":"ok"`
- Must not contain: `"status":"error"`

---

### 2. Homepage / Public Access

**Purpose**: Ensure the main website is accessible to users

```
Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Homepage
URL: https://imobibase.com
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET
Expected Status Code: 200
```

**Keywords**:
- Must contain: `ImobiBase` (or your app name in HTML)

---

### 3. API - Properties Endpoint

**Purpose**: Critical API endpoint for property listings

```
Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Properties API
URL: https://imobibase.com/api/properties?limit=1
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET
Expected Status Code: 200 or 401
```

Note: 401 is acceptable if authentication is required (means API is responding)

---

### 4. API - Public Properties

**Purpose**: Public property search functionality

```
Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Public Properties
URL: https://imobibase.com/public/properties
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET
Expected Status Code: 200
```

---

### 5. Database Health (via Health Endpoint)

**Purpose**: Verify database connectivity

```
Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Database Health
URL: https://imobibase.com/api/health
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET
Expected Status Code: 200
```

**Alert Keywords**:
- Must contain: `"database":"connected"`
- Must not contain: `"database":"error"`

---

### 6. Static Assets / CDN

**Purpose**: Verify static assets are being served correctly

```
Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Static Assets
URL: https://imobibase.com/assets/logo.png (or any critical static file)
Monitoring Interval: 15 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET
Expected Status Code: 200
```

---

### 7. Login Page

**Purpose**: Ensure authentication system is accessible

```
Monitor Type: HTTP(s)
Friendly Name: ImobiBase - Login Page
URL: https://imobibase.com/login
Monitoring Interval: 10 minutes
Monitor Timeout: 30 seconds
HTTP Method: GET
Expected Status Code: 200
```

**Keywords**:
- Must contain: `login` or `email`

---

## Alert Configuration

### Alert Contacts

Set up multiple notification channels for redundancy:

#### 1. Email Alerts

```
Contact Type: Email
Email Address: devops@yourcompany.com
Alert When: Down & Up
Threshold: Alert me when down for 2 minutes (1 check failure)
```

#### 2. SMS Alerts (Critical)

```
Contact Type: SMS
Phone Number: +55 11 99999-9999
Alert When: Down only
Threshold: Alert me when down for 5 minutes (continuous)
```

**Note**: Free plan has limited SMS. Use for critical monitors only.

#### 3. Slack Integration

```
Contact Type: Slack
Webhook URL: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
Alert When: Down, Up, and Started
Channel: #alerts or #devops
```

**How to get Slack webhook**:
1. Go to your Slack workspace
2. Apps → Add apps → Incoming Webhooks
3. Create webhook for channel
4. Copy webhook URL

#### 4. Discord Integration

```
Contact Type: Webhook
Webhook URL: https://discord.com/api/webhooks/YOUR/WEBHOOK
Alert When: Down & Up
```

**Webhook format for Discord**:
```
POST https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN
Content-Type: application/json

{
  "content": "🚨 **Alert**: *monitorFriendlyName* is *alertType*\n\n**Monitor URL**: *monitorURL*\n**Reason**: *alertDetails*\n**Time**: *alertDateTime*"
}
```

---

### Alert Thresholds

Configure when to send alerts:

**Recommended Settings**:

| Monitor Priority | First Alert | Resend Alert Every | Alert On |
|-----------------|-------------|-------------------|----------|
| Critical (Health, Homepage) | 2 minutes (1 failure) | 15 minutes | Down, Up |
| Important (APIs) | 5 minutes (2 failures) | 30 minutes | Down, Up |
| Normal (Static files) | 10 minutes (3 failures) | 1 hour | Down only |

**Alert Timing**:
- Send alerts 24/7 for critical monitors
- Send alerts during business hours for non-critical
- Set different contacts for different severity levels

---

## Incident Response

### Incident Response Workflow

When you receive an alert:

#### 1. Immediate Actions (0-5 minutes)

```bash
# Step 1: Verify the issue
curl -I https://imobibase.com/api/health

# Step 2: Check deployment status
# GitHub → Actions → Latest workflow run

# Step 3: Check Vercel dashboard
# https://vercel.com/dashboard
# Look for deployment errors or resource issues

# Step 4: Check database
# Supabase Dashboard → Database → Logs
# Look for connection errors or high load
```

#### 2. Triage (5-10 minutes)

**Check these common causes**:

- [ ] Recent deployment? (check GitHub Actions)
- [ ] Database down? (check Supabase status)
- [ ] API rate limiting? (check Vercel logs)
- [ ] Certificate expired? (check SSL cert)
- [ ] DNS issues? (check domain settings)
- [ ] DDoS attack? (check traffic patterns)

#### 3. Quick Fixes

**Common Issues & Solutions**:

| Issue | Quick Fix |
|-------|-----------|
| Deployment failed | Rollback to previous version |
| Database timeout | Restart database connection pool |
| Out of memory | Scale up Vercel resources |
| SSL certificate | Renew certificate in Vercel |
| High error rate | Enable maintenance mode |

**Rollback Deployment**:
```bash
# Option 1: Via GitHub Actions
# Go to: Actions → Re-run previous successful deployment

# Option 2: Via Vercel CLI
vercel rollback https://imobibase.com --token=$VERCEL_TOKEN

# Option 3: Via Vercel Dashboard
# Deployments → Previous deployment → Promote to Production
```

#### 4. Communication

**Internal Communication**:
- Post in #incidents Slack channel
- Update team on status
- Assign incident owner

**External Communication** (if needed):
- Update status page
- Send email to affected users
- Post on social media if major outage

---

## Monitoring Best Practices

### 1. Regular Testing

Test monitoring system monthly:

```bash
# Simulate downtime by causing intentional failure
# Example: Disable health endpoint temporarily

# Verify:
- [ ] Alert received via email
- [ ] Alert received via Slack
- [ ] Alert received via SMS (if configured)
- [ ] Alert response time < 5 minutes
- [ ] Recovery notification received
```

### 2. Alert Fatigue Prevention

**Avoid alert fatigue**:
- Don't alert on every small issue
- Use appropriate thresholds
- Group related alerts
- Implement escalation policies
- Review and refine alerts monthly

### 3. Response Time Targets

**Service Level Objectives (SLOs)**:

| Metric | Target | Acceptable |
|--------|--------|------------|
| Uptime | 99.9% | 99.5% |
| Response time | < 500ms (p95) | < 1s |
| Alert detection | < 5 min | < 10 min |
| Incident response | < 15 min | < 30 min |
| Time to resolution | < 1 hour | < 4 hours |

### 4. Monitoring Checklist

**Weekly**:
- [ ] Review uptime statistics
- [ ] Check for patterns in downtime
- [ ] Verify all monitors are active

**Monthly**:
- [ ] Test alert system
- [ ] Review response times
- [ ] Update contact information
- [ ] Audit monitor configuration

**Quarterly**:
- [ ] Review and update monitors
- [ ] Test disaster recovery
- [ ] Update incident playbooks
- [ ] Conduct post-mortem reviews

---

## Alternative Monitoring Tools

### Free Alternatives to UptimeRobot

#### 1. BetterUptime (formerly Better Stack)

**Features**:
- 10 monitors free
- 1-minute intervals
- Incident management
- Status page included

**Setup**:
1. Go to [betteruptime.com](https://betteruptime.com)
2. Create account
3. Add monitors (same URLs as above)
4. Configure on-call schedule

#### 2. Freshping by Freshworks

**Features**:
- 50 monitors free
- Global monitoring locations
- Public status page
- Slack/email integration

**Setup**:
1. Visit [freshping.io](https://www.freshping.io)
2. Sign up
3. Add endpoints
4. Invite team members

#### 3. StatusCake

**Features**:
- 10 uptime monitors free
- Page speed monitoring
- SSL monitoring

**Setup**:
1. Go to [statuscake.com](https://www.statuscake.com)
2. Create account
3. Configure tests
4. Set up contact groups

#### 4. Pingdom (Paid, but comprehensive)

**Features**:
- Advanced monitoring
- Real user monitoring
- Transaction monitoring
- Detailed analytics

**Cost**: Starting at $10/month

---

## Status Page

### Creating a Public Status Page

Let users know the system status in real-time.

#### Option 1: UptimeRobot Status Page (Free)

```
1. UptimeRobot Dashboard → Status Pages → Add Status Page
2. Configure:
   - Custom URL: status.imobibase.com (or subdomain)
   - Select monitors to display
   - Customize design
   - Enable incident history
3. Setup custom domain (optional)
4. Share URL with users
```

#### Option 2: Statuspage.io (Atlassian)

**Features**:
- Hosted status page
- Incident templates
- Subscriber notifications
- Metrics display

**Cost**: Free tier available

#### Option 3: Self-hosted (Cachet)

**Benefits**:
- Full control
- Open source
- Customizable

**Setup**:
```bash
# Deploy with Docker
docker run -d --name cachet \
  -p 8000:8000 \
  -e DB_DRIVER=pgsql \
  -e DB_HOST=your-db \
  cachethq/docker:latest
```

---

## Monitoring Dashboard

### Create a Central Monitoring Dashboard

Combine all monitoring tools:

**Tools to include**:
- UptimeRobot (uptime)
- Sentry (errors)
- Vercel Analytics (performance)
- Supabase Dashboard (database)
- Google Analytics (usage)

**Dashboard Options**:

1. **Grafana** (self-hosted)
   - Import metrics from all sources
   - Create custom dashboards
   - Set up alerts

2. **Datadog** (paid)
   - Unified monitoring
   - Log aggregation
   - APM integration

3. **Simple HTML Dashboard** (free)
   - Embed status page
   - Show key metrics
   - Display recent incidents

---

## Integration with CI/CD

### GitHub Actions Integration

Monitor deployment health automatically:

```yaml
# .github/workflows/monitor-health.yml
name: Health Check

on:
  schedule:
    - cron: '*/15 * * * *'  # Every 15 minutes
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check API Health
        run: |
          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://imobibase.com/api/health)
          if [ $RESPONSE -ne 200 ]; then
            echo "::error::Health check failed with status $RESPONSE"
            exit 1
          fi
          echo "✅ Health check passed (HTTP $RESPONSE)"

      - name: Notify on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '🚨 Production health check failed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Monitoring Metrics to Track

### Key Performance Indicators (KPIs)

**Availability Metrics**:
- Overall uptime percentage
- Mean time between failures (MTBF)
- Mean time to recovery (MTTR)
- Number of incidents per month

**Performance Metrics**:
- Average response time
- p95 response time
- Error rate
- Throughput (requests per second)

**Business Metrics**:
- Active users during downtime
- Revenue impact of incidents
- Customer support tickets related to downtime

### Example Monthly Report

```markdown
# ImobiBase Uptime Report - December 2025

## Summary
- Overall Uptime: 99.95%
- Total Downtime: 22 minutes
- Number of Incidents: 2
- MTTR: 11 minutes

## Incidents
1. Dec 15, 10:30 AM - Database timeout (8 min)
   - Cause: Connection pool exhausted
   - Resolution: Increased pool size

2. Dec 22, 3:15 PM - Deployment rollback (14 min)
   - Cause: Failed migration
   - Resolution: Rolled back deployment

## Performance
- Avg Response Time: 245ms
- p95 Response Time: 680ms
- Error Rate: 0.02%

## Action Items
- [ ] Implement connection pool monitoring
- [ ] Add migration validation in CI
- [ ] Increase alert threshold for minor issues
```

---

## Resources

### Documentation
- [UptimeRobot API Docs](https://uptimerobot.com/api/)
- [Vercel Monitoring](https://vercel.com/docs/concepts/analytics)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)

### Tools
- [Uptime Calculator](https://uptime.is/)
- [SLA Calculator](https://sla-calculator.com/)
- [HTTP Status Codes](https://httpstatuses.com/)

### Communities
- [r/devops](https://reddit.com/r/devops)
- [SRE Weekly Newsletter](https://sreweekly.com/)
- [Monitoring Slack Communities](https://monitoringslack.com/)

---

**Last Updated**: 2025-12-25
**Version**: 1.0.0
**Owner**: DevOps Team

## Quick Start Checklist

- [ ] Create UptimeRobot account
- [ ] Add 7 essential monitors
- [ ] Configure email alerts
- [ ] Set up Slack integration
- [ ] Create public status page
- [ ] Test alert system
- [ ] Document incident response
- [ ] Schedule weekly reviews
