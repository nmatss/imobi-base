# Arquitetura de Monitoramento e Analytics

Documentação visual da arquitetura implementada.

## 📐 Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ Components │  │   Hooks    │  │  Services  │  │   Pages   │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│         │              │               │               │         │
│         └──────────────┴───────────────┴───────────────┘         │
│                           │                                      │
│         ┌─────────────────┴─────────────────┐                   │
│         │                                   │                   │
│    ┌────▼─────┐                      ┌─────▼────┐              │
│    │  Sentry  │                      │ Analytics│              │
│    │  Client  │                      │  Client  │              │
│    └────┬─────┘                      └─────┬────┘              │
└─────────┼────────────────────────────────┼────────────────────┘
          │                                │
          │ HTTPS                          │ HTTPS
          │                                │
     ┌────▼────┐                      ┌────▼────┐
     │ Sentry  │                      │PostHog/ │
     │Platform │                      │  GA4    │
     └─────────┘                      └─────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express)                         │
│                                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │   Routes   │  │ Middleware │  │  Services  │  │   Jobs    │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
│         │              │               │               │         │
│         └──────────────┴───────────────┴───────────────┘         │
│                           │                                      │
│                      ┌────▼─────┐                                │
│                      │  Sentry  │                                │
│                      │  Server  │                                │
│                      └────┬─────┘                                │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                            │ HTTPS
                            │
                       ┌────▼────┐
                       │ Sentry  │
                       │Platform │
                       └─────────┘
```

## 🔄 Fluxo de Dados

### Error Tracking Flow

```
┌─────────────┐
│   Error     │
│  Occurs     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ ErrorBoundary/  │
│ try-catch       │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ captureException│
│ (with context)  │
└──────┬──────────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────┐
│Add Breadcrumb│      │ Set Context  │
└──────┬───────┘      └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Sentry.send()  │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ beforeSend     │
         │ (filter data)  │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Sentry Platform│
         │ • Store error  │
         │ • Trigger alert│
         │ • Group issues │
         └────────────────┘
```

### Analytics Flow

```
┌─────────────┐
│ User Action │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ useAnalytics()  │
│ hook            │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ trackEvent()    │
│ trackFeature()  │
│ trackPageView() │
└──────┬──────────┘
       │
       ├────────────────────────┬─────────────────┐
       │                        │                 │
       ▼                        ▼                 ▼
┌─────────────┐       ┌──────────────┐   ┌──────────────┐
│  PostHog    │       │ Google       │   │  Backend     │
│  • Session  │       │ Analytics    │   │  Analytics   │
│  • Events   │       │  • Events    │   │  API         │
│  • Features │       │  • PageViews │   │  • Web Vitals│
└─────────────┘       └──────────────┘   └──────┬───────┘
                                                 │
                                                 ▼
                                         ┌──────────────┐
                                         │   Sentry     │
                                         │ (if critical)│
                                         └──────────────┘
```

### Source Maps Flow

```
┌─────────────┐
│   Build     │
│ Production  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Vite Build      │
│ • Compile TS    │
│ • Minify        │
│ • Generate Maps │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Sentry Plugin   │
│ • Upload maps   │
│ • Create release│
│ • Tag with SHA  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Delete .map     │
│ from dist/      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Deploy to       │
│ Production      │
└──────┬──────────┘
       │
       │ Error occurs
       ▼
┌─────────────────┐
│ Sentry fetches  │
│ source map      │
│ (internal only) │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Show original   │
│ TS/JSX code     │
└─────────────────┘
```

## 📦 Estrutura de Arquivos

### Frontend

```
client/src/
├── lib/
│   ├── monitoring/
│   │   ├── sentry-client.ts    # ❶ Sentry initialization
│   │   ├── index.ts            # ❷ Exports
│   │   └── __tests__/          # ❸ Unit tests
│   │       └── sentry-client.test.ts
│   │
│   └── analytics/
│       └── index.ts            # ❹ Analytics interface
│
├── hooks/
│   └── useAnalytics.ts         # ❺ React hooks
│
├── components/
│   └── ErrorBoundary.tsx       # ❻ Error UI + Sentry
│
├── examples/
│   └── MonitoringExample.tsx   # ❼ Usage examples
│
└── main.tsx                    # ❽ Initialize all
```

### Backend

```
server/
├── monitoring/
│   └── sentry.ts               # ❶ Sentry backend
│
├── routes-analytics.ts         # ❷ Analytics API
│
└── routes.ts                   # ❸ Register routes
```

### Configuration

```
Root/
├── vite.config.ts              # Sentry plugin
├── .env.example                # Environment vars
├── .sentryclirc.example        # Sentry CLI
└── package.json                # Dependencies
```

## 🔧 Componentes Principais

### 1. Sentry Client (`sentry-client.ts`)

**Responsabilidades:**
- Initialize Sentry SDK
- Configure integrations (Router, HTTP, Replay)
- Filter sensitive data
- Helper functions

**APIs:**
```typescript
initializeSentryClient()      // Initialize
captureException(error)       // Capture errors
captureMessage(msg)           // Log messages
setUser(user)                 // Set user context
addBreadcrumb(msg)            // Add breadcrumb
measureAsync(fn)              // Performance
ErrorBoundary                 // React component
Profiler                      // Performance profiling
```

### 2. Analytics Client (`analytics/index.ts`)

**Responsabilidades:**
- Initialize PostHog & GA4
- Unified API for all providers
- Track events, pages, conversions
- Feature flags

**APIs:**
```typescript
initializeAnalytics()         // Initialize
identifyUser(user)            // Identify
trackPageView(path)           // Page views
trackEvent(name)              // Custom events
trackFeature(name)            // Feature usage
trackConversion(goal)         // Goals
isFeatureEnabled(flag)        // Feature flags
```

### 3. Analytics Hooks (`useAnalytics.ts`)

**Responsabilidades:**
- React integration
- Page tracking
- Time tracking
- Event tracking

**APIs:**
```typescript
usePageTracking()             // Auto page views
useAnalytics()                // Event tracking
useImpressionTracking()       // Visibility
useTimeTracking()             // Time on page
```

### 4. ErrorBoundary (`ErrorBoundary.tsx`)

**Responsabilidades:**
- Catch React errors
- Send to Sentry
- Show fallback UI
- User feedback dialog

**Props:**
```typescript
componentName: string         // Component name
showDialog: boolean          // Show feedback
fallback: ReactNode          // Custom UI
onError: (error) => void     // Callback
```

### 5. Analytics API (`routes-analytics.ts`)

**Responsabilidades:**
- Receive Web Vitals
- Receive custom events
- Store analytics data
- Send to Sentry if critical

**Endpoints:**
```
POST /api/analytics/vitals     # Web Vitals
POST /api/analytics/events     # Custom events
POST /api/analytics/pageviews  # Page views
POST /api/analytics/errors     # Frontend errors
GET  /api/analytics/health     # Health check
```

## 🔐 Data Flow & Security

### Sensitive Data Filtering

```
┌─────────────┐
│   Event     │
│  Created    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ beforeSend()    │
│ • Remove tokens │
│ • Remove PWD    │
│ • Mask emails   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Sent to        │
│  Sentry         │
└─────────────────┘
```

**Filtered Fields:**
- `password`
- `token`
- `apiKey`
- `secret`
- `Authorization` header
- `Cookie` header

### User Context

```typescript
// Set after login
setUser({
  id: 'user-123',          // ✅ Safe
  email: 'user@example',   // ✅ Safe
  tenantId: 'tenant-1',    // ✅ Safe
  role: 'admin',           // ✅ Safe
  // password NOT included  ❌
});
```

## 🎯 Integration Points

### 1. Application Bootstrap

```typescript
// main.tsx
initializeSentryClient();    // ← First
initializeAnalytics();       // ← Second
createRoot(...)              // ← Then app
```

### 2. Error Handling

```typescript
// Component level
<ErrorBoundary>
  <Component />
</ErrorBoundary>

// Function level
try {
  await operation();
} catch (error) {
  captureException(error);
}
```

### 3. Analytics Tracking

```typescript
// Page level
usePageTracking();

// Component level
const { trackFeature } = useAnalytics();
trackFeature('properties', 'view');
```

### 4. Performance Monitoring

```typescript
// Async operations
await measureAsync('fetch_data', () => {
  return fetch('/api/data');
});

// Component profiling
<Profiler id="Dashboard">
  <DashboardContent />
</Profiler>
```

## 📊 Monitoring Dashboard

### Sentry Dashboard View

```
┌─────────────────────────────────────────┐
│  ERRORS           │  PERFORMANCE         │
│  • New Issues     │  • LCP: 2.1s        │
│  • Rate: 0.05%    │  • FID: 45ms        │
│  • Resolved: 12   │  • p95: 1.8s        │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  RELEASES         │  ALERTS              │
│  • v1.2.3         │  • Email: ON        │
│  • Health: 99.9%  │  • Slack: ON        │
└─────────────────────────────────────────┘
```

### PostHog Dashboard View

```
┌─────────────────────────────────────────┐
│  EVENTS           │  USERS               │
│  • Today: 1,234   │  • Active: 234      │
│  • Week: 8,567    │  • New: 45          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  FEATURES         │  FUNNELS             │
│  • property_view  │  • Visit → Lead     │
│  • lead_create    │  • Conversion: 15%  │
└─────────────────────────────────────────┘
```

## 🚀 Deployment Flow

```
┌─────────────┐
│   Commit    │
│   & Push    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    CI/CD    │
│  • Tests    │
│  • Lint     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Build     │
│  npm run    │
│   build     │
└──────┬──────┘
       │
       ├─────────────────────┐
       │                     │
       ▼                     ▼
┌─────────────┐      ┌──────────────┐
│ Create      │      │ Upload       │
│ Source Maps │      │ to Sentry    │
└──────┬──────┘      └──────┬───────┘
       │                     │
       │                     │
       ▼                     ▼
┌─────────────┐      ┌──────────────┐
│ Remove Maps │      │ Tag Release  │
│ from dist/  │      │ with Git SHA │
└──────┬──────┘      └──────┬───────┘
       │                     │
       └──────────┬──────────┘
                  │
                  ▼
         ┌────────────────┐
         │   Deploy to    │
         │   Production   │
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Sentry Release │
         │ Health Monitor │
         └────────────────┘
```

## 💡 Best Practices

### ✅ DO

1. **Wrap critical components with ErrorBoundary**
   ```tsx
   <ErrorBoundary componentName="Payment">
     <PaymentForm />
   </ErrorBoundary>
   ```

2. **Add breadcrumbs before operations**
   ```typescript
   addBreadcrumb('Saving property', 'user_action');
   await saveProperty(data);
   ```

3. **Capture with context**
   ```typescript
   captureException(error, {
     userId: user.id,
     operation: 'create_contract',
   });
   ```

### ❌ DON'T

1. **Don't send sensitive data**
   ```typescript
   // ❌ Bad
   captureException(error, { password: pwd });

   // ✅ Good
   captureException(error, { userId: user.id });
   ```

2. **Don't ignore errors**
   ```typescript
   // ❌ Bad
   try { ... } catch (e) { console.log(e) }

   // ✅ Good
   try { ... } catch (e) { captureException(e) }
   ```

---

**Arquitetura completa e production-ready** ✅

Para implementação, siga o [Quick Start](./MONITORING_QUICK_START.md).
