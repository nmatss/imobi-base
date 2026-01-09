# Sentry Alerts Configuration Guide

Complete guide for setting up error tracking, performance monitoring, and alerting with Sentry for ImobiBase.

## Table of Contents
- [Initial Setup](#initial-setup)
- [Alert Rules Configuration](#alert-rules-configuration)
- [Performance Monitoring](#performance-monitoring)
- [Integration with Slack/Email](#integration-with-slackemail)
- [Custom Dashboards](#custom-dashboards)
- [Best Practices](#best-practices)

---

## Initial Setup

### 1. Create Sentry Project

If you haven't already:

1. Go to [sentry.io](https://sentry.io)
2. Create account or login
3. Create organization: "Your Company"
4. Create new project:
   - Platform: **Node.js**
   - Project name: **imobibase**
   - Team: Default or create "Platform Team"

### 2. Get DSN and Auth Token

**Get DSN (Data Source Name)**:
```
Sentry Dashboard → Settings → Projects → imobibase → Client Keys (DSN)
Copy the DSN URL
```

Format: `https://xxxxx@oxxxxx.ingest.sentry.io/xxxxxx`

**Get Auth Token** (for CI/CD):
```
Settings → Account → API → Auth Tokens → Create New Token
Name: GitHub Actions - ImobiBase
Scopes:
  ✓ org:read
  ✓ project:read
  ✓ project:releases
  ✓ project:write (for issue management)
```

### 3. Configure Environment Variables

Add to GitHub Secrets and `.env`:

```bash
# Error tracking
SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxxx

# For CI/CD (GitHub Secrets only)
SENTRY_ORG=your-organization-slug
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Update Sentry Configuration

**File**: `/home/nic20/ProjetosWeb/ImobiBase/.sentryclirc`

```ini
[defaults]
org=your-organization-slug
project=imobibase

[auth]
# Use environment variable SENTRY_AUTH_TOKEN instead
# token=
```

---

## Alert Rules Configuration

### Critical Alert Rules

Navigate to: **Project Settings → Alerts → Create Alert Rule**

#### 1. High Error Rate Spike

**Purpose**: Alert when error rate suddenly increases

```
Alert Rule: High Error Rate
Trigger: When an event is captured

Conditions:
  - The issue is seen more than 10 times in 1 minute
  - The issue's level is equal to error OR fatal

Actions:
  - Send a notification to #alerts (Slack)
  - Send a notification via email to devops@yourcompany.com
  - Create a Jira ticket (optional)

Environment: production
```

**Configuration in Sentry UI**:
```
Alert Name: [Production] High Error Rate Spike
When: an event is captured
If: ALL of these conditions are met
  - The event's level is equal to error
  - The event happens more than 10 times in 1 minute
Then: Send notifications to #alerts and Email
Action Interval: 15 minutes (don't spam)
```

---

#### 2. New Error First Seen

**Purpose**: Alert immediately when a new error type appears

```
Alert Rule: New Error Detected
Trigger: When a new issue is created

Conditions:
  - The issue is first seen
  - The issue's level is equal to error OR fatal
  - The issue's environment equals production

Actions:
  - Send notification to #errors (Slack)
  - Send email to dev-team@yourcompany.com

Environment: production
```

**Benefits**: Catch regression bugs immediately after deployment

---

#### 3. Performance Degradation (p95 Response Time)

**Purpose**: Alert when API response times degrade

```
Alert Rule: Performance Degradation
Trigger: When a metric aggregation

Conditions:
  - avg(transaction.duration) is greater than 2000ms (2 seconds)
  - over the last 10 minutes
  - for transactions matching: transaction.op:http.server

Actions:
  - Send notification to #performance (Slack)
  - Send email to devops@yourcompany.com

Environment: production
```

**p95 Configuration**:
```
Alert Name: [Production] p95 Response Time > 2s
When: A metric aggregation
  Metric: p95(transaction.duration)
  Threshold: > 2000 (milliseconds)
  Time window: 10 minutes
  Filter: environment:production AND transaction.op:http.server
Then: Send notifications
```

---

#### 4. Database Query Slow

**Purpose**: Alert on database performance issues

```
Alert Rule: Slow Database Queries
Trigger: When a metric aggregation

Conditions:
  - p95(spans.db.duration) is greater than 1000ms
  - over the last 5 minutes
  - for spans matching: span.op:db.query

Actions:
  - Send notification to #database (Slack)
  - Send email to backend-team@yourcompany.com
```

---

#### 5. Error Rate by User

**Purpose**: Detect if specific users are experiencing issues

```
Alert Rule: User-Specific Error Rate
Trigger: When an event is captured

Conditions:
  - The issue is seen more than 5 times in 1 minute
  - For the same user (user.id or user.email)
  - The issue's level equals error

Actions:
  - Send notification to #support (Slack)
  - Create support ticket (optional)
```

---

#### 6. Critical Error (Fatal Level)

**Purpose**: Immediate alert for fatal errors that crash the application

```
Alert Rule: Critical Fatal Error
Trigger: When an event is captured

Conditions:
  - The issue's level equals fatal
  - Environment equals production

Actions:
  - Send notification to #critical-alerts (Slack) [@channel]
  - Send SMS to on-call engineer
  - Send email to executives@yourcompany.com
  - Create PagerDuty incident (if integrated)

Action Interval: Immediately (no throttling)
```

---

### Performance Alert Rules

#### 7. High Apdex Score Degradation

**Purpose**: Monitor user satisfaction metric

```
Alert Rule: Apdex Score Drop
Trigger: When a metric aggregation

Conditions:
  - apdex(transaction.duration, 300) is less than 0.85
  - over the last 15 minutes

Actions:
  - Send notification to #performance
```

**Apdex Explanation**:
- Score from 0-1 (1 = perfect)
- Based on response time thresholds
- < 0.85 indicates poor user experience

---

#### 8. Memory Leak Detection

**Purpose**: Alert on increasing memory usage

```
Alert Rule: Memory Leak Suspected
Trigger: When a metric aggregation

Conditions:
  - avg(memory.used) is greater than 400MB
  - increasing for 30 minutes

Actions:
  - Send notification to #devops
  - Send email with memory graph
```

**Note**: Requires Sentry Profiling enabled

---

### Issue Alert Examples

#### 9. Unhandled Promise Rejection

**Purpose**: Catch async errors

```
Alert Rule: Unhandled Promise Rejection
Trigger: When an event is captured

Conditions:
  - The issue's category equals error
  - The issue's message contains "Unhandled Promise Rejection"
  - Environment equals production

Actions:
  - Send notification to #backend-alerts
  - Assign to Backend Team
```

---

#### 10. Authentication Failures Spike

**Purpose**: Detect potential security issues or bugs

```
Alert Rule: Auth Failure Spike
Trigger: When an event is captured

Conditions:
  - The issue's tags contain auth.status:failed
  - The issue is seen more than 20 times in 5 minutes
  - Environment equals production

Actions:
  - Send notification to #security
  - Create security incident ticket
```

---

## Performance Monitoring Setup

### Enable Performance Monitoring

**In your server code** (`server/index.ts`):

```typescript
import * as Sentry from "@sentry/node";
import { ProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // 10% of transactions in production, 100% in dev

  // Profiling
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  integrations: [
    new ProfilingIntegration(),
  ],

  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // Ignore specific errors
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
  ],

  // Add context
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }
    return event;
  },
});
```

### Transaction Tracking

**Automatic tracking** for:
- HTTP requests (via Express integration)
- Database queries (via Drizzle/Postgres integration)
- External API calls

**Manual tracking** for custom operations:

```typescript
import * as Sentry from "@sentry/node";

// Track custom operation
const transaction = Sentry.startTransaction({
  op: "function",
  name: "generateMonthlyReport",
});

try {
  // Your code here
  const report = await generateReport();

  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("internal_error");
  Sentry.captureException(error);
} finally {
  transaction.finish();
}
```

---

## Integration with Slack/Email

### Slack Integration

**Step 1: Add Sentry App to Slack**

1. Sentry Dashboard → Settings → Integrations
2. Search for "Slack"
3. Click "Add to Slack"
4. Authorize Sentry app
5. Select workspace

**Step 2: Configure Alert Channels**

Create dedicated channels:
```
#alerts          - High error rates, critical issues
#errors          - New errors first seen
#performance     - Performance degradation
#database        - Database issues
#security        - Auth failures, security events
#deployments     - Deployment notifications
```

**Step 3: Route Alerts**

For each alert rule:
```
Actions → Add Action → Send Slack notification
Channel: #alerts
Include: Issue title, description, affected users
Mention: @channel (for critical only)
```

**Slack Message Format**:
```
🚨 [Production] High Error Rate

Issue: TypeError: Cannot read property 'id' of undefined
URL: /api/properties/123
First Seen: 2 minutes ago
Event Count: 15 events in 1 minute
Affected Users: 8 users

[View in Sentry](https://sentry.io/issues/12345)
[View Stack Trace](https://sentry.io/issues/12345/events/latest)
```

### Email Integration

**Configure Email Alerts**:

```
Settings → Alerts → Email
Default recipients: devops@yourcompany.com
Digest: Daily summary at 9:00 AM
Individual alerts: Critical and high priority only
```

**Email Templates**:

- **Critical Alert**: Immediate email with full stack trace
- **Daily Digest**: Summary of all errors
- **Weekly Report**: Performance trends and error patterns

---

## Custom Dashboards

### Create Performance Dashboard

**Navigate**: Dashboards → Create Dashboard

**Dashboard: Production Health**

**Widgets to add**:

1. **Error Rate (Last 24h)**
   ```
   Widget Type: Line Chart
   Query: count() by time
   Filter: level:error AND environment:production
   Display: Last 24 hours
   ```

2. **p95 Response Time**
   ```
   Widget Type: Line Chart
   Query: p95(transaction.duration)
   Filter: transaction.op:http.server
   Group by: transaction
   ```

3. **Top 10 Slowest Endpoints**
   ```
   Widget Type: Table
   Query: p95(transaction.duration)
   Group by: transaction
   Order by: p95 DESC
   Limit: 10
   ```

4. **Error Rate by Browser**
   ```
   Widget Type: Bar Chart
   Query: count()
   Group by: browser.name
   Filter: level:error
   ```

5. **Most Affected Users**
   ```
   Widget Type: Table
   Query: count()
   Group by: user.email
   Order by: count DESC
   Limit: 20
   ```

6. **Database Query Performance**
   ```
   Widget Type: Line Chart
   Query: avg(spans.db.duration)
   Filter: span.op:db.query
   ```

---

## Alert Action Templates

### Auto-Assignment

**Assign issues automatically based on tags**:

```
Alert Rule: Database Errors
Conditions: tag.component equals "database"
Actions:
  - Assign to: Database Team
  - Add tag: needs-triage
  - Set priority: High
```

### Issue Workflow Integration

**Create Jira/Linear tickets automatically**:

```
Settings → Integrations → Jira
Map Sentry issues to Jira projects
Auto-create on: Error level, Production environment
Sync comments: Yes
```

### PagerDuty Integration

**For 24/7 on-call rotation**:

```
Settings → Integrations → PagerDuty
Service: ImobiBase Production
Alert on: Fatal errors, High error rate
Escalation: After 5 minutes if not acknowledged
```

---

## Best Practices

### 1. Alert Fatigue Prevention

**Don't alert on everything**:
- Set appropriate thresholds
- Use time windows to avoid noise
- Group related errors
- Implement alert throttling

**Good**:
```
Alert when error count > 10 in 1 minute
Action interval: 15 minutes
```

**Bad**:
```
Alert on every single error
No action interval (spam)
```

### 2. Environment Separation

**Always filter by environment**:

```typescript
Sentry.init({
  environment: process.env.NODE_ENV,
  // This allows separate rules per environment
});
```

**Alert rules**:
- Production: All critical alerts
- Staging: Only fatal errors
- Development: No alerts (use for testing)

### 3. Context Enrichment

**Add useful context to errors**:

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
  tenant_id: user.tenantId, // For multi-tenant
});

Sentry.setTag("component", "property-api");
Sentry.setTag("action", "create-property");
Sentry.setContext("property", {
  id: property.id,
  type: property.type,
  price: property.price,
});
```

### 4. Release Tracking

**Track which version introduced errors**:

```yaml
# In GitHub Actions
- name: Create Sentry Release
  run: |
    npm install -g @sentry/cli
    sentry-cli releases new ${{ github.sha }}
    sentry-cli releases set-commits ${{ github.sha }} --auto
    sentry-cli releases finalize ${{ github.sha }}
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
```

### 5. Source Maps Upload

**Enable readable stack traces**:

```javascript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: true,
  },
});
```

```bash
# After build, upload source maps
sentry-cli releases files $VERSION upload-sourcemaps ./dist --rewrite
```

### 6. Performance Budget

**Set performance budgets**:

```
Alert when:
- Homepage load time > 2s
- API response time > 500ms (p95)
- Database query > 100ms (p95)
- Time to First Byte > 300ms
```

### 7. Error Grouping

**Use fingerprinting for better grouping**:

```typescript
Sentry.init({
  beforeSend(event, hint) {
    // Custom grouping
    if (event.exception?.values?.[0]) {
      const error = event.exception.values[0];
      event.fingerprint = [
        error.type || "Error",
        error.value || "Unknown",
      ];
    }
    return event;
  },
});
```

---

## Alert Summary Table

Quick reference for recommended alert rules:

| Alert Rule | Threshold | Action | Priority |
|------------|-----------|--------|----------|
| High Error Rate | > 10 errors/min | Slack + Email | High |
| New Error | First occurrence | Slack | Medium |
| p95 Response > 2s | > 2000ms for 10min | Slack | High |
| Database Slow | p95 > 1000ms | Slack | Medium |
| Fatal Error | Any fatal | Slack + SMS | Critical |
| Auth Failures | > 20 failures/5min | Slack + Security | High |
| Memory Leak | > 400MB for 30min | Email | Medium |

---

## Testing Alerts

### Test Error Capture

```typescript
// Add test endpoint (remove in production)
app.get("/api/test-sentry", (req, res) => {
  throw new Error("Test error for Sentry");
});
```

```bash
curl https://imobibase.com/api/test-sentry
# Check Sentry dashboard for error
# Verify alert is sent to Slack/Email
```

### Test Performance Monitoring

```typescript
app.get("/api/test-slow", async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
  res.json({ message: "Slow response" });
});
```

---

## Troubleshooting

### Alerts Not Triggering

**Check**:
- [ ] Alert rule is enabled
- [ ] Environment filter matches (production)
- [ ] Threshold is correct
- [ ] Action interval not throttling
- [ ] Integration (Slack/Email) is connected

### Too Many Alerts

**Solutions**:
- Increase threshold
- Add time window
- Implement action interval
- Group similar errors
- Use issue states (ignore/resolve)

### Missing Context

**Add**:
- User information
- Tags for component/action
- Breadcrumbs for user journey
- Custom context objects

---

## Resources

- [Sentry Alerts Documentation](https://docs.sentry.io/product/alerts/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Best Practices](https://docs.sentry.io/platforms/node/best-practices/)
- [Sentry CLI Reference](https://docs.sentry.io/product/cli/)

---

**Last Updated**: 2025-12-25
**Version**: 1.0.0
**Owner**: DevOps Team

## Quick Start Checklist

- [ ] Create Sentry project
- [ ] Add SENTRY_DSN to environment variables
- [ ] Configure 10 essential alert rules
- [ ] Set up Slack integration
- [ ] Create performance dashboard
- [ ] Test error capture
- [ ] Enable release tracking
- [ ] Upload source maps
- [ ] Document incident response
- [ ] Review alerts weekly
