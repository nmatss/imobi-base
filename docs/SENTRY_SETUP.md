# Sentry Error Tracking - Setup Guide

## 🎯 Overview

Sentry tracks all production errors, performance issues, and exceptions automatically.

**Features Implemented:**
- ✅ Automatic error capture
- ✅ Performance monitoring (10% sample rate)
- ✅ User context tracking
- ✅ Tenant isolation tagging
- ✅ Database query tracking
- ✅ Breadcrumb trail for debugging
- ✅ Sensitive data filtering

---

## 🚀 Quick Setup (5 minutes)

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free (100k events/month included)
3. Create new project → Select "Node.js" / "Express"
4. Copy your DSN (looks like: `https://xxx@o000.ingest.sentry.io/000`)

### 2. Configure Environment

```bash
# Add to your .env file
SENTRY_DSN=https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o0000000.ingest.sentry.io/0000000
```

### 3. Install Dependencies

```bash
npm install @sentry/node @sentry/profiling-node
```

### 4. Restart Server

```bash
npm run dev
```

You should see: `✅ Sentry initialized for error tracking`

---

## 📊 Sentry Dashboard

Access your Sentry dashboard at: `https://sentry.io/organizations/[your-org]/issues/`

### What You'll See

**Issues Tab:**
- All errors grouped by type
- Stack traces with source code context
- User and tenant information
- Breadcrumb trail showing user actions before error

**Performance Tab:**
- API endpoint response times
- Database query performance
- Slow transaction detection

---

## 🔧 Usage Examples

### Automatic Error Capture

No code changes needed! All Express route errors are automatically captured:

```typescript
// This error will be automatically sent to Sentry in production
app.get("/api/test", async (req, res) => {
  const user = await storage.getNonExistentUser(); // Throws error
  res.json(user);
});
```

### Manual Error Capture

For background jobs or async operations:

```typescript
import { captureException, captureMessage } from "@/monitoring/sentry";

try {
  await generateMonthlyReport();
} catch (error) {
  captureException(error, {
    reportMonth: "2024-12",
    tenantId: "tenant-123",
  });
  throw error;
}
```

### Add Breadcrumbs

Track user actions for debugging:

```typescript
import { addBreadcrumb } from "@/monitoring/sentry";

app.post("/api/properties", async (req, res) => {
  addBreadcrumb("Creating new property", "action", {
    propertyType: req.body.type,
    tenantId: req.user.tenantId,
  });

  const property = await storage.createProperty(req.body);
  res.json(property);
});
```

### Track Performance

Monitor slow operations:

```typescript
import { startTransaction } from "@/monitoring/sentry";

app.get("/api/reports/monthly", async (req, res) => {
  const transaction = startTransaction("Monthly Report Generation", "report");

  try {
    const report = await generateMonthlyReport();
    transaction.setStatus("ok");
    res.json(report);
  } catch (error) {
    transaction.setStatus("internal_error");
    throw error;
  } finally {
    transaction.finish();
  }
});
```

### Set User Context

Called automatically after authentication, but you can also do it manually:

```typescript
import { setUser, clearUser } from "@/monitoring/sentry";

// After login
setUser({
  id: user.id,
  email: user.email,
  tenantId: user.tenantId,
  role: user.role,
});

// On logout
clearUser();
```

---

## 🔍 Debugging with Sentry

### 1. View Error Details

Click on any issue in Sentry to see:
- **Stack trace** with exact line numbers
- **User context** (who experienced the error)
- **Breadcrumbs** (what they did before the error)
- **Request data** (headers, body, query params)
- **Environment** (production, staging, development)
- **Tenant ID** (for multi-tenant debugging)

### 2. Find Trends

- **Frequency**: How often does this error occur?
- **Users affected**: How many unique users?
- **First seen**: When did this error start appearing?
- **Last seen**: Is it still happening?

### 3. Set Up Alerts

Go to **Settings → Alerts** in Sentry:

```yaml
Alert: High Error Rate
Condition: More than 10 errors in 1 hour
Action: Email team@imobibase.com + Slack notification
```

---

## 🏥 Health Monitoring

### Check Sentry Integration

```bash
# Trigger a test error
curl http://localhost:5000/api/sentry-test

# Check your Sentry dashboard - you should see the error within seconds
```

### Verify Performance Monitoring

```bash
# Make some API calls
curl http://localhost:5000/api/properties

# Go to Sentry → Performance tab
# You should see transaction data
```

---

## 🎛️ Configuration

### Adjust Sample Rates

Edit `server/monitoring/sentry.ts`:

```typescript
Sentry.init({
  dsn: SENTRY_DSN,

  // Capture 100% of errors (always recommended)
  // Errors are free in Sentry

  // Performance: 10% in production (adjustable)
  tracesSampleRate: 0.1, // Change to 0.5 for 50%, 1.0 for 100%

  // Profiling: 10% in production (adjustable)
  profilesSampleRate: 0.1,
});
```

### Add Custom Tags

```typescript
import * as Sentry from "@sentry/node";

// Tag all events with custom data
Sentry.setTag("region", "sa-east-1");
Sentry.setTag("feature_flag", "new-ui-enabled");
```

### Filter Sensitive Data

Edit `beforeSend` in `sentry.ts` to remove sensitive fields:

```typescript
beforeSend(event, hint) {
  // Remove passwords from all events
  if (event.request?.data) {
    delete event.request.data.password;
    delete event.request.data.creditCard;
  }
  return event;
}
```

---

## 🚨 Common Issues

### Issue: "Sentry not initialized"

**Solution**: Add `SENTRY_DSN` to your `.env` file

### Issue: No errors appearing in Sentry

**Checklist:**
- ✅ Is `NODE_ENV=production`? (Sentry disabled in development by default)
- ✅ Did you restart the server after adding `SENTRY_DSN`?
- ✅ Is the DSN correct? (check for typos)
- ✅ Wait 1-2 minutes (Sentry can have slight delay)

### Issue: Too many events, hitting quota

**Solutions:**
1. Increase sample rates only if needed
2. Add ignore patterns for non-critical errors
3. Upgrade Sentry plan (starts at $26/month)

---

## 📈 Best Practices

### 1. Use Error Boundaries

Frontend errors are captured separately. Add error boundaries in React:

```typescript
// Client-side: Use ErrorBoundary component (already implemented)
import { ErrorBoundary } from "@/components/ErrorBoundary";

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 2. Add Context to Errors

Always add relevant context when capturing exceptions:

```typescript
captureException(error, {
  tenantId: user.tenantId,
  propertyId: property.id,
  action: "create_property",
  userRole: user.role,
});
```

### 3. Set Up Alerts

Create alerts for:
- High error rate (> 10/hour)
- New error types (first occurrence)
- Performance degradation (p95 > 1s)

### 4. Monitor Performance

Check Sentry Performance tab weekly for:
- Slow database queries
- Slow API endpoints
- High memory usage

### 5. Triage Regularly

**Daily**: Review critical errors (status 500)
**Weekly**: Review new error types
**Monthly**: Analyze trends and patterns

---

## 🔗 Resources

- [Sentry Node.js Docs](https://docs.sentry.io/platforms/node/)
- [Sentry Express Integration](https://docs.sentry.io/platforms/node/guides/express/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Alerts & Notifications](https://docs.sentry.io/product/alerts/)

---

## 💰 Pricing

**Free Tier:**
- 5,000 errors/month
- 10,000 performance transactions/month
- 30-day retention
- Perfect for development and small deployments

**Team Plan ($26/month):**
- 50,000 errors/month
- 100,000 performance transactions/month
- 90-day retention
- Recommended for production

**Business Plan ($80/month):**
- 200,000 errors/month
- 500,000 performance transactions/month
- 1-year retention
- Priority support

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Sentry dashboard shows your project
- [ ] Test error appears in Sentry dashboard
- [ ] User context is captured (email, tenant ID)
- [ ] Breadcrumbs are recorded
- [ ] Performance transactions appear in Performance tab
- [ ] Source maps uploaded (for production minified code)
- [ ] Alerts configured for critical errors
- [ ] Team members have access to Sentry project

---

**Last Updated:** 2024-12-24
**Version:** 1.0.0
**Integration Status:** ✅ Complete
