# AGENTE 14: PERFORMANCE MONITORING & APM - ULTRA DEEP DIVE REPORT

**Project:** ImobiBase - Real Estate Management Platform
**Analysis Date:** 2025-12-25
**Agent:** AGENTE 14 - APM & Observability Specialist
**Scope:** Complete monitoring infrastructure, APM, observability, and performance tracking

---

## EXECUTIVE SUMMARY

### Monitoring Maturity Score: **3.2/5** (Intermediate)

**Overall Assessment:**
ImobiBase has established a **solid foundation** for monitoring with Sentry integration and basic health checks, but is **missing critical APM components** required for production-grade observability. The system needs significant enhancements in distributed tracing, metrics collection, alerting infrastructure, and real-time performance monitoring.

### Key Findings

**✅ STRENGTHS (What's Working Well)**
- ✅ Sentry integration properly configured with error tracking
- ✅ Web Vitals tracking on frontend (LCP, CLS, INP, FCP, TTFB)
- ✅ Basic health check endpoint implemented
- ✅ Redis monitoring with health checks
- ✅ Job queue monitoring with detailed metrics
- ✅ Error boundaries and structured error handling
- ✅ Lighthouse CI for performance budgets

**❌ CRITICAL GAPS (Major Issues)**
- ❌ **NO distributed tracing** (OpenTelemetry not implemented)
- ❌ **NO metrics backend** (Prometheus/Grafana not configured)
- ❌ **NO centralized logging** (Winston not properly configured)
- ❌ **NO application dashboards** (no visualization layer)
- ❌ **NO alerting system** (beyond basic Sentry alerts)
- ❌ **NO synthetic monitoring** (no uptime checks configured)
- ❌ **NO performance profiling** in production
- ❌ **NO database query monitoring** (beyond Sentry integration)
- ❌ **NO API endpoint performance tracking**
- ❌ **NO real-time analytics endpoint** for Web Vitals

---

## 1. CURRENT MONITORING STATE - DETAILED ANALYSIS

### 1.1 Frontend Monitoring (Score: 3.5/5)

#### ✅ IMPLEMENTED
**File:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/main.tsx`

```typescript
// Web Vitals tracking (EXCELLENT)
if (import.meta.env.PROD) {
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    const sendToAnalytics = ({ name, value, id, rating }) => {
      console.log(`[Web Vital] ${name}:`, { value, id, rating });

      // Sends to /api/analytics/vitals (NOT IMPLEMENTED)
      fetch('/api/analytics/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, value, id, rating }),
      });
    };

    onCLS(sendToAnalytics);  // Cumulative Layout Shift
    onINP(sendToAnalytics);  // Interaction to Next Paint
    onLCP(sendToAnalytics);  // Largest Contentful Paint
    onFCP(sendToAnalytics);  // First Contentful Paint
    onTTFB(sendToAnalytics); // Time to First Byte
  });
}
```

**Metrics Tracked:**
- ✅ LCP (Largest Contentful Paint)
- ✅ INP (Interaction to Next Paint) - replaces FID
- ✅ CLS (Cumulative Layout Shift)
- ✅ FCP (First Contentful Paint)
- ✅ TTFB (Time to First Byte)

#### ❌ MISSING
- ❌ Backend endpoint `/api/analytics/vitals` **NOT IMPLEMENTED**
- ❌ No storage/aggregation of metrics
- ❌ No dashboard for Web Vitals visualization
- ❌ No alerting on Core Web Vitals degradation
- ❌ No session replay integration
- ❌ No user journey tracking
- ❌ No error boundary integration with Sentry on frontend
- ❌ No performance API usage tracking
- ❌ No resource timing analysis
- ❌ No long task monitoring

### 1.2 Backend Monitoring (Score: 3.0/5)

#### ✅ IMPLEMENTED

**Sentry Integration** - `/home/nic20/ProjetosWeb/ImobiBase/server/monitoring/sentry.ts`
- ✅ Error tracking configured
- ✅ Performance monitoring (10% sample rate)
- ✅ Profiling enabled (10% sample rate)
- ✅ Express integration
- ✅ PostgreSQL integration
- ✅ User context tracking
- ✅ Breadcrumbs support
- ✅ Sensitive data filtering
- ✅ Environment tagging
- ✅ Tenant context middleware

**Health Check** - `/home/nic20/ProjetosWeb/ImobiBase/server/routes.ts`
```typescript
app.get("/api/health", async (req, res) => {
  const healthCheck = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7),
  };

  // Database connectivity check
  const dbCheck = await storage.checkDatabaseConnection?.();

  if (dbCheck === false) {
    return res.status(503).json({
      ...healthCheck,
      status: "degraded",
      database: "disconnected",
    });
  }

  return res.status(200).json({
    ...healthCheck,
    database: "connected",
  });
});
```

**Job Queue Monitoring** - `/home/nic20/ProjetosWeb/ImobiBase/server/jobs/monitoring.ts`
- ✅ Queue statistics (waiting, active, completed, failed, delayed)
- ✅ Performance metrics (avg processing time, success rate, throughput)
- ✅ Health checks with thresholds
- ✅ Failed job tracking and retry mechanisms
- ✅ Job logs with timestamps

**Redis Monitoring** - `/home/nic20/ProjetosWeb/ImobiBase/server/cache/redis-client.ts`
- ✅ Connection health checks
- ✅ Latency measurement
- ✅ Memory usage tracking
- ✅ Connected clients count
- ✅ Uptime tracking

#### ❌ MISSING
- ❌ No structured logging (Winston installed but not configured)
- ❌ No request/response logging middleware
- ❌ No API endpoint performance tracking
- ❌ No database query performance monitoring
- ❌ No custom metrics collection
- ❌ No trace context propagation
- ❌ No distributed tracing
- ❌ No correlation IDs for request tracking
- ❌ No rate limit monitoring
- ❌ No authentication failure tracking
- ❌ No business metrics (leads created, properties added, etc.)

### 1.3 Error Tracking (Score: 4.0/5)

#### ✅ IMPLEMENTED
**Structured Error Classes** - `/home/nic20/ProjetosWeb/ImobiBase/server/middleware/error-handler.ts`
```typescript
// Well-defined error hierarchy
export class AppError extends Error
export class ValidationError extends AppError
export class AuthError extends AppError
export class ForbiddenError extends AppError
export class NotFoundError extends AppError
export class ConflictError extends AppError
export class RateLimitError extends AppError
export class InternalError extends AppError
export class ServiceUnavailableError extends AppError
export class BadRequestError extends AppError
```

**Global Error Handler:**
- ✅ Captures all errors
- ✅ Integrates with Sentry
- ✅ Filters operational vs programming errors
- ✅ Removes sensitive data in production
- ✅ Includes request context (URL, method, IP)
- ✅ Stack traces in development only

#### ❌ MISSING
- ❌ No error rate alerting
- ❌ No error trending analysis
- ❌ No error categorization dashboard
- ❌ No automatic issue assignment
- ❌ No integration with incident management (PagerDuty)

---

## 2. CRITICAL GAPS ANALYSIS

### GAP #1: No Distributed Tracing ⚠️ CRITICAL
**Impact:** Cannot track requests across services, no visibility into bottlenecks

**Missing Components:**
- OpenTelemetry SDK not integrated
- No trace context propagation
- No span creation for operations
- No trace visualization
- No service dependency mapping

**Recommendation:** Implement OpenTelemetry with Jaeger or Tempo backend

### GAP #2: No Metrics Collection Backend ⚠️ CRITICAL
**Impact:** No real-time performance data, no historical trending

**Missing Components:**
- No Prometheus integration
- No StatsD/DogStatsD client
- No custom metrics endpoint
- No Grafana dashboards
- No metric aggregation

**Recommendation:** Deploy Prometheus + Grafana stack

### GAP #3: No Centralized Logging ⚠️ HIGH
**Impact:** Difficult to correlate logs, no log aggregation, poor debugging

**Missing Components:**
- Winston installed but not configured
- No log shipping to centralized system
- No log rotation strategy
- No structured JSON logging
- No correlation IDs
- No log retention policy

**Recommendation:** Configure Winston with structured logging + log shipping

### GAP #4: No API Performance Monitoring ⚠️ HIGH
**Impact:** No visibility into slow endpoints, no SLA tracking

**Missing Components:**
- No request duration tracking
- No p50/p95/p99 percentiles
- No slow endpoint alerts
- No endpoint-specific metrics
- No Apdex score calculation

**Recommendation:** Implement APM middleware with histogram metrics

### GAP #5: No Web Vitals Backend ⚠️ MEDIUM
**Impact:** Frontend metrics collected but not stored/analyzed

**Missing Components:**
- `/api/analytics/vitals` endpoint not implemented
- No metrics storage
- No aggregation
- No visualization
- No alerts on degradation

**Recommendation:** Create analytics endpoint + store metrics in TimescaleDB or InfluxDB

### GAP #6: No Synthetic Monitoring ⚠️ MEDIUM
**Impact:** No proactive uptime monitoring, no multi-region checks

**Missing Components:**
- No uptime monitoring service configured
- No API endpoint checks
- No transaction monitoring
- No SSL certificate monitoring
- No multi-location testing

**Recommendation:** Configure Uptime Robot or Pingdom

### GAP #7: No Alerting Infrastructure ⚠️ HIGH
**Impact:** Incidents discovered reactively, no on-call system

**Missing Components:**
- No alert rules defined (beyond Sentry)
- No notification routing
- No PagerDuty/OpsGenie integration
- No alert suppression
- No escalation policies

**Recommendation:** Implement comprehensive alerting with escalation

### GAP #8: No Business Metrics Tracking ⚠️ MEDIUM
**Impact:** No product analytics, no KPI tracking

**Missing Components:**
- No event tracking (user actions)
- No funnel analysis
- No conversion tracking
- No feature adoption metrics
- No retention metrics

**Recommendation:** Integrate PostHog or Mixpanel

### GAP #9: No Performance Budgets Enforcement ⚠️ MEDIUM
**Impact:** Lighthouse CI configured but not enforced in CI/CD

**Missing Components:**
- No CI/CD gate on performance metrics
- No bundle size limits
- No performance regression detection
- No automated performance testing

**Recommendation:** Add Lighthouse CI to GitHub Actions with failing thresholds

### GAP #10: No Database Performance Monitoring ⚠️ MEDIUM
**Impact:** Limited visibility into slow queries, no query optimization

**Missing Components:**
- No slow query log analysis
- No query plan visualization
- No index usage tracking
- No connection pool monitoring
- No deadlock detection

**Recommendation:** Enable pg_stat_statements + configure monitoring

### GAP #11: No Session Replay ⚠️ LOW
**Impact:** Difficult to reproduce user-reported bugs

**Missing Components:**
- No session recording
- No click tracking
- No rage click detection
- No heatmaps

**Recommendation:** Consider Sentry Session Replay or LogRocket

### GAP #12: No Capacity Planning Data ⚠️ MEDIUM
**Impact:** Cannot predict scaling needs

**Missing Components:**
- No traffic forecasting
- No resource utilization trends
- No cost analysis
- No auto-scaling metrics

**Recommendation:** Track resource metrics over time

### GAP #13: No Incident Management Process ⚠️ HIGH
**Impact:** Uncoordinated incident response

**Missing Components:**
- No incident detection automation
- No runbooks
- No post-mortem templates
- No incident timeline tracking

**Recommendation:** Create incident response playbook

### GAP #14: No Performance Profiling in Production ⚠️ LOW
**Impact:** Cannot identify CPU/memory bottlenecks in production

**Missing Components:**
- No flame graph generation
- No heap snapshots
- No CPU profiling
- No memory leak detection

**Recommendation:** Enable Sentry profiling + analyze with tools

### GAP #15: No Multi-Environment Monitoring Separation ⚠️ MEDIUM
**Impact:** Production and staging alerts mixed together

**Missing Components:**
- No separate monitoring stacks
- No environment-specific dashboards
- No alert filtering by environment

**Recommendation:** Create separate Sentry projects/Grafana folders

### GAP #16: No SLO/SLA Tracking ⚠️ MEDIUM
**Impact:** No service level objectives defined

**Missing Components:**
- No availability targets
- No latency targets
- No error rate targets
- No SLO dashboards

**Recommendation:** Define and track SLOs

### GAP #17: No Cost Monitoring ⚠️ LOW
**Impact:** Cannot optimize infrastructure costs

**Missing Components:**
- No cloud cost tracking
- No resource waste detection
- No cost per request metrics

**Recommendation:** Integrate cloud provider cost APIs

### GAP #18: No Security Event Monitoring ⚠️ HIGH
**Impact:** Security incidents may go undetected

**Missing Components:**
- No failed login tracking
- No rate limit breach alerts
- No suspicious activity detection
- No SIEM integration

**Recommendation:** Implement security monitoring dashboard

### GAP #19: No User Experience Monitoring ⚠️ MEDIUM
**Impact:** Cannot correlate performance with user satisfaction

**Missing Components:**
- No user satisfaction surveys
- No NPS tracking
- No feature usage analytics

**Recommendation:** Add user feedback collection

### GAP #20: No Dependency Monitoring ⚠️ MEDIUM
**Impact:** External service failures not tracked

**Missing Components:**
- No third-party API monitoring
- No webhook delivery tracking
- No integration health checks

**Recommendation:** Monitor external dependencies

### GAP #21: No Mobile App Performance Tracking ⚠️ LOW
**Impact:** (If mobile apps exist) No mobile-specific metrics

**Missing Components:**
- No mobile crash reporting
- No mobile performance metrics
- No device-specific analytics

**Recommendation:** Consider Sentry Mobile SDK

### GAP #22: No WebSocket/Real-time Monitoring ⚠️ LOW
**Impact:** (If WebSockets used) No real-time connection tracking

**Missing Components:**
- No connection state monitoring
- No message latency tracking

**Recommendation:** Add WebSocket metrics

### GAP #23: No Geographic Performance Tracking ⚠️ LOW
**Impact:** Cannot identify region-specific performance issues

**Missing Components:**
- No CDN performance tracking
- No multi-region latency analysis

**Recommendation:** Add geographic tags to metrics

### GAP #24: No Compliance Audit Logging ⚠️ MEDIUM
**Impact:** LGPD/GDPR audit logs not centralized

**Missing Components:**
- Compliance logs exist but not in centralized monitoring
- No compliance dashboard

**Recommendation:** Integrate compliance logs with monitoring

### GAP #25: No Performance Correlation Analysis ⚠️ LOW
**Impact:** Cannot correlate infrastructure metrics with business KPIs

**Missing Components:**
- No unified analytics platform
- No correlation between errors and revenue
- No A/B testing performance impact

**Recommendation:** Create unified analytics dashboard

---

## 3. RECOMMENDED APM SOLUTION

### Option 1: Sentry + OpenTelemetry + Prometheus + Grafana (RECOMMENDED)
**Best for:** Cost-effective, comprehensive monitoring

**Stack:**
- **Sentry** - Error tracking (already integrated)
- **OpenTelemetry** - Distributed tracing
- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **Loki** - Log aggregation (optional)

**Cost:** ~$100-200/month
**Complexity:** Medium
**Setup Time:** 2-3 weeks

### Option 2: Datadog APM (All-in-One)
**Best for:** Teams wanting single vendor

**Features:**
- Error tracking
- APM with distributed tracing
- Logs
- Infrastructure monitoring
- Synthetics
- RUM (Real User Monitoring)

**Cost:** ~$500-800/month
**Complexity:** Low
**Setup Time:** 1 week

### Option 3: New Relic One
**Best for:** Enterprise teams

**Features:**
- APM
- Infrastructure monitoring
- Logs
- Synthetics
- Browser monitoring

**Cost:** ~$400-700/month
**Complexity:** Low
**Setup Time:** 1 week

### Option 4: Open Source Stack (Self-Hosted)
**Best for:** Cost-sensitive teams with DevOps expertise

**Stack:**
- **Jaeger** - Distributed tracing
- **Prometheus** - Metrics
- **Grafana** - Dashboards
- **Loki** - Logs
- **AlertManager** - Alerting

**Cost:** Infrastructure only (~$100/month)
**Complexity:** High
**Setup Time:** 4-6 weeks

---

## 4. OPENTELEMETRY IMPLEMENTATION GUIDE

### 4.1 Installation

```bash
npm install --save \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http
```

### 4.2 Configuration File

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/server/monitoring/telemetry.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'imobibase-api',
  [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
});

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
});

export const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 60000, // Export every minute
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        requestHook: (span, request) => {
          span.setAttribute('http.user_agent', request.headers['user-agent'] || 'unknown');
        },
      },
      '@opentelemetry/instrumentation-express': { enabled: true },
      '@opentelemetry/instrumentation-pg': { enabled: true },
      '@opentelemetry/instrumentation-redis-4': { enabled: true },
    }),
  ],
});

export async function initializeTelemetry() {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_TELEMETRY === 'true') {
    await sdk.start();
    console.log('✅ OpenTelemetry initialized');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await sdk.shutdown();
      console.log('OpenTelemetry terminated');
    });
  }
}
```

### 4.3 Custom Spans Example

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('imobibase-api');

export async function generateMonthlyReport(tenantId: string) {
  const span = tracer.startSpan('generate_monthly_report', {
    attributes: {
      'tenant.id': tenantId,
      'report.type': 'monthly',
    },
  });

  try {
    const data = await fetchReportData(tenantId);
    const pdf = await generatePDF(data);

    span.setAttribute('report.size_bytes', pdf.length);
    span.setStatus({ code: SpanStatusCode.OK });

    return pdf;
  } catch (error) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    throw error;
  } finally {
    span.end();
  }
}
```

### 4.4 Custom Metrics Example

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('imobibase-api');

// Counter: Total leads created
const leadsCounter = meter.createCounter('leads.created', {
  description: 'Number of leads created',
  unit: '1',
});

// Histogram: API response time
const responseTimeHistogram = meter.createHistogram('http.server.duration', {
  description: 'API endpoint response time',
  unit: 'ms',
});

// Usage
export function trackLeadCreated(source: string) {
  leadsCounter.add(1, { source });
}

export function trackResponseTime(endpoint: string, duration: number) {
  responseTimeHistogram.record(duration, { endpoint });
}
```

---

## 5. PROMETHEUS + GRAFANA SETUP

### 5.1 Prometheus Configuration

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # ImobiBase API metrics
  - job_name: 'imobibase-api'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/metrics'

  # Node.js process metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['localhost:9100']

  # PostgreSQL metrics
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['localhost:9187']

  # Redis metrics
  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['localhost:9121']

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alerts.yml'
```

### 5.2 Metrics Endpoint Implementation

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/server/monitoring/metrics.ts`

```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response } from 'express';

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTP request duration histogram
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

// Active connections gauge
export const activeConnections = new Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
});

// Database query duration
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['query', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
});

// Business metrics
export const leadsCreated = new Counter({
  name: 'leads_created_total',
  help: 'Total number of leads created',
  labelNames: ['source', 'tenant_id'],
});

export const propertiesAdded = new Counter({
  name: 'properties_added_total',
  help: 'Total number of properties added',
  labelNames: ['type', 'tenant_id'],
});

// Metrics endpoint
export function metricsEndpoint(req: Request, res: Response) {
  res.set('Content-Type', register.contentType);
  res.send(register.metrics());
}

// Middleware to track HTTP metrics
export function metricsMiddleware(req: Request, res: Response, next: Function) {
  const start = Date.now();

  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestCounter.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestDuration.observe({
      method: req.method,
      route,
      status_code: res.statusCode,
    }, duration);

    activeConnections.dec();
  });

  next();
}
```

### 5.3 Alert Rules

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/alerts.yml`

```yaml
groups:
  - name: imobibase_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      # Slow API endpoints
      - alert: SlowAPIEndpoint
        expr: |
          histogram_quantile(0.95,
            rate(http_request_duration_seconds_bucket[5m])
          ) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "API endpoint is slow"
          description: "p95 latency is {{ $value }}s"

      # Database connection issues
      - alert: DatabaseConnectionFailure
        expr: up{job="postgres-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Cannot connect to database"

      # Redis connection issues
      - alert: RedisConnectionFailure
        expr: up{job="redis-exporter"} == 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Cannot connect to Redis"

      # High memory usage
      - alert: HighMemoryUsage
        expr: |
          process_resident_memory_bytes / 1024 / 1024 > 500
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is {{ $value }}MB"

      # Queue backlog
      - alert: JobQueueBacklog
        expr: |
          sum(bullmq_queue_waiting) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Job queue has high backlog"
```

### 5.4 Grafana Dashboard JSON

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/grafana-dashboard.json`

```json
{
  "dashboard": {
    "title": "ImobiBase - Application Performance",
    "panels": [
      {
        "title": "Request Rate (req/s)",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "p95 Latency by Endpoint",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (route, le))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate (%)",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Active Connections",
        "targets": [
          {
            "expr": "http_active_connections"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Database Query Duration (p95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (query, le))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Leads Created (per hour)",
        "targets": [
          {
            "expr": "sum(increase(leads_created_total[1h]))"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Memory Usage (MB)",
        "targets": [
          {
            "expr": "process_resident_memory_bytes / 1024 / 1024"
          }
        ],
        "type": "graph"
      },
      {
        "title": "CPU Usage (%)",
        "targets": [
          {
            "expr": "rate(process_cpu_seconds_total[5m]) * 100"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

---

## 6. WINSTON LOGGING IMPLEMENTATION

### 6.1 Winston Configuration

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/server/monitoring/logger.ts`

```typescript
import winston from 'winston';
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Development format (human-readable)
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  format: isDevelopment ? devFormat : logFormat,
  defaultMeta: {
    service: 'imobibase-api',
    environment: process.env.NODE_ENV,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7),
  },
  transports: [
    // Console output
    new winston.transports.Console(),

    // Error log file
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),

    // Combined log file
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],

  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'exceptions.log'),
    }),
  ],

  // Promise rejection handling
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'rejections.log'),
    }),
  ],
});

// Add request context to logs
export function logWithContext(req: any) {
  return logger.child({
    correlationId: req.id || req.headers['x-request-id'],
    userId: req.user?.id,
    tenantId: req.user?.tenantId,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}
```

### 6.2 Request Logger Middleware

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/server/middleware/request-logger.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../monitoring/logger';
import { v4 as uuidv4 } from 'uuid';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || uuidv4();

  // Attach request ID
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  // Log incoming request
  logger.info('Incoming request', {
    correlationId: requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;

    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('Request completed', {
      correlationId: requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
    });
  });

  next();
}
```

---

## 7. WEB VITALS BACKEND IMPLEMENTATION

### 7.1 Analytics Endpoint

**Add to:** `/home/nic20/ProjetosWeb/ImobiBase/server/routes.ts`

```typescript
import { WebVital } from '../types/analytics';

// Web Vitals collection endpoint
app.post("/api/analytics/vitals", async (req, res) => {
  try {
    const { name, value, id, rating } = req.body as WebVital;

    // Validate input
    if (!name || !value || !id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store in database (create vitals table)
    await storage.saveWebVital({
      name,
      value,
      id,
      rating,
      url: req.headers.referer || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
    });

    // Track in metrics
    webVitalsHistogram.observe({ metric: name, rating }, value);

    logger.info('Web Vital recorded', { name, value, rating });

    res.status(201).json({ success: true });
  } catch (error) {
    logger.error('Failed to save Web Vital', { error });
    res.status(500).json({ error: 'Failed to save metric' });
  }
});

// Web Vitals analytics dashboard
app.get("/api/analytics/vitals/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const summary = await storage.getWebVitalsSummary({
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    });

    res.json(summary);
  } catch (error) {
    logger.error('Failed to get Web Vitals summary', { error });
    res.status(500).json({ error: 'Failed to get summary' });
  }
});
```

### 7.2 Database Schema

**Add to:** `/home/nic20/ProjetosWeb/ImobiBase/shared/schema.ts`

```typescript
export const webVitals = pgTable('web_vitals', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(), // LCP, CLS, INP, etc.
  value: numeric('value', { precision: 10, scale: 2 }).notNull(),
  vitalId: varchar('vital_id', { length: 100 }).notNull(), // Unique ID from web-vitals
  rating: varchar('rating', { length: 20 }), // good, needs-improvement, poor
  url: text('url'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

---

## 8. ALERT RULES CONFIGURATION

### 8.1 Sentry Alert Rules

Configure in Sentry UI:

**1. High Error Rate Alert**
```yaml
Name: [Production] High Error Rate
Trigger: When an event is captured
Conditions:
  - The issue is seen more than 10 times in 1 minute
  - The issue's level equals error
  - Environment equals production
Actions:
  - Send notification to #alerts (Slack)
  - Send email to devops@imobibase.com
Action Interval: 15 minutes
```

**2. New Error Alert**
```yaml
Name: [Production] New Error Detected
Trigger: When a new issue is created
Conditions:
  - The issue is first seen
  - The issue's level equals error
  - Environment equals production
Actions:
  - Send notification to #errors (Slack)
```

**3. Performance Degradation Alert**
```yaml
Name: [Production] p95 Response Time > 2s
Trigger: When a metric aggregation
Conditions:
  - p95(transaction.duration) > 2000ms
  - Over the last 10 minutes
  - For transactions matching transaction.op:http.server
Actions:
  - Send notification to #performance (Slack)
```

### 8.2 Prometheus AlertManager Configuration

**Create:** `/home/nic20/ProjetosWeb/ImobiBase/alertmanager.yml`

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-alerts'

  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true

    - match:
        severity: critical
      receiver: 'pagerduty'

receivers:
  - name: 'slack-alerts'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#critical-alerts'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '@channel {{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'
```

---

## 9. DASHBOARDS

### 9.1 Technical Dashboard

**Grafana Dashboard: Application Performance**

**Panels:**
1. Request Rate (requests/sec)
2. p50/p95/p99 Latency
3. Error Rate (%)
4. Active Connections
5. Database Query Performance
6. Redis Latency
7. Memory Usage
8. CPU Usage
9. Job Queue Backlog
10. Cache Hit Rate

### 9.2 Business Dashboard

**Grafana Dashboard: Business Metrics**

**Panels:**
1. Leads Created (hourly/daily)
2. Properties Added
3. User Registrations
4. Active Users
5. Conversion Funnel
6. Revenue (if applicable)
7. Feature Adoption
8. User Retention

### 9.3 Web Vitals Dashboard

**Custom React Dashboard: `/pages/admin/performance`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

export function WebVitalsDashboard() {
  const { data: vitals } = useQuery({
    queryKey: ['web-vitals-summary'],
    queryFn: () => fetch('/api/analytics/vitals/summary').then(r => r.json()),
  });

  return (
    <div>
      <h1>Core Web Vitals Performance</h1>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard
          title="LCP (Largest Contentful Paint)"
          value={vitals?.lcp?.p75}
          threshold={2500}
          unit="ms"
        />
        <MetricCard
          title="CLS (Cumulative Layout Shift)"
          value={vitals?.cls?.p75}
          threshold={0.1}
          unit=""
        />
        <MetricCard
          title="INP (Interaction to Next Paint)"
          value={vitals?.inp?.p75}
          threshold={200}
          unit="ms"
        />
      </div>

      <LineChart width={800} height={300} data={vitals?.timeseries}>
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="lcp" stroke="#8884d8" />
        <Line type="monotone" dataKey="cls" stroke="#82ca9d" />
        <Line type="monotone" dataKey="inp" stroke="#ffc658" />
      </LineChart>
    </div>
  );
}
```

---

## 10. SYNTHETIC MONITORING

### 10.1 Uptime Monitoring

**Recommended Service:** UptimeRobot (Free tier: 50 monitors)

**Monitors to Create:**
1. **Homepage** - https://imobibase.com - Every 5 min
2. **API Health** - https://imobibase.com/api/health - Every 5 min
3. **Login Page** - https://imobibase.com/login - Every 10 min
4. **Dashboard** - https://imobibase.com/dashboard - Every 10 min

### 10.2 Transaction Monitoring

**Playwright Synthetic Tests:**

```typescript
// tests/synthetic/critical-path.spec.ts
import { test, expect } from '@playwright/test';

test('Critical user journey', async ({ page }) => {
  // Login
  await page.goto('https://imobibase.com/login');
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
  await page.click('[type="submit"]');

  // Wait for dashboard
  await expect(page).toHaveURL(/.*dashboard/);

  // Create lead
  await page.click('text=New Lead');
  await page.fill('[name="name"]', 'Test Lead');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('[type="submit"]');

  // Verify success
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

**Run in CI/CD:**
```yaml
# .github/workflows/synthetic-tests.yml
name: Synthetic Tests
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes

jobs:
  synthetic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright test tests/synthetic
      - name: Alert on failure
        if: failure()
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -d '{"text": "🚨 Synthetic test failed!"}'
```

---

## 11. PERFORMANCE BUDGETS

### 11.1 Updated Lighthouse CI Configuration

**Update:** `/home/nic20/ProjetosWeb/ImobiBase/lighthouserc.json`

```json
{
  "ci": {
    "assert": {
      "assertions": {
        // Stricter thresholds with failing gates
        "categories:performance": ["error", {"minScore": 0.85}],
        "categories:accessibility": ["error", {"minScore": 0.95}],

        "first-contentful-paint": ["error", {"maxNumericValue": 1800}],
        "largest-contentful-paint": ["error", {"maxNumericValue": 2500}],
        "cumulative-layout-shift": ["error", {"maxNumericValue": 0.1}],
        "total-blocking-time": ["error", {"maxNumericValue": 200}],

        "resource-summary:script:size": ["error", {"maxNumericValue": 300000}],
        "resource-summary:stylesheet:size": ["error", {"maxNumericValue": 75000}]
      }
    }
  }
}
```

### 11.2 Bundle Size Monitoring

**Add to:** `package.json`

```json
{
  "scripts": {
    "analyze": "vite build --mode analyze",
    "check:bundle": "npm run build && bundlesize"
  },
  "bundlesize": [
    {
      "path": "./dist/assets/*.js",
      "maxSize": "300 kB"
    },
    {
      "path": "./dist/assets/*.css",
      "maxSize": "75 kB"
    }
  ]
}
```

---

## 12. SLO/SLA RECOMMENDATIONS

### 12.1 Service Level Objectives

**Availability SLO:**
- Target: **99.9%** uptime (43.2 minutes downtime/month)
- Measurement: Health check endpoint
- Error Budget: 0.1% (43.2 min/month)

**Latency SLO:**
- Target: **p95 < 500ms** for API endpoints
- Target: **p99 < 1000ms** for API endpoints
- Measurement: Histogram metrics

**Error Rate SLO:**
- Target: **< 0.1%** error rate (5xx errors)
- Measurement: Error rate from logs/metrics

**Data Freshness SLO:**
- Target: **< 5 minutes** for data synchronization
- Measurement: Last sync timestamp

### 12.2 SLO Dashboard

**Grafana Panel:**
```promql
# Availability (last 30 days)
avg_over_time(up{job="imobibase-api"}[30d]) * 100

# p95 Latency compliance
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[30d])
) < 0.5

# Error budget remaining
1 - (
  sum(rate(http_requests_total{status_code=~"5.."}[30d]))
  /
  sum(rate(http_requests_total[30d]))
) / 0.001 * 100
```

---

## 13. MONITORING ROADMAP

### Phase 1: Foundation (Weeks 1-2) ⚡ IMMEDIATE

**Priority: CRITICAL**

**Tasks:**
1. ✅ Implement Winston structured logging
2. ✅ Create `/api/analytics/vitals` endpoint
3. ✅ Add Prometheus metrics endpoint
4. ✅ Deploy Prometheus + Grafana stack
5. ✅ Create basic application dashboard
6. ✅ Configure request logging middleware
7. ✅ Set up log rotation

**Deliverables:**
- Centralized logging operational
- Web Vitals data stored in database
- Basic metrics collection working
- Initial Grafana dashboard live

**Estimated Effort:** 40 hours

---

### Phase 2: Observability (Weeks 3-4) 🔍

**Priority: HIGH**

**Tasks:**
1. ✅ Implement OpenTelemetry SDK
2. ✅ Add distributed tracing
3. ✅ Deploy Jaeger or Tempo
4. ✅ Instrument critical paths (API endpoints, database queries)
5. ✅ Create trace visualization dashboards
6. ✅ Add custom spans for business logic

**Deliverables:**
- Distributed tracing operational
- End-to-end request visibility
- Service dependency map
- Performance bottleneck identification

**Estimated Effort:** 60 hours

---

### Phase 3: Alerting (Weeks 5-6) 🚨

**Priority: HIGH**

**Tasks:**
1. ✅ Configure Prometheus AlertManager
2. ✅ Create alert rules (error rate, latency, availability)
3. ✅ Set up Slack integration
4. ✅ Configure PagerDuty for critical alerts
5. ✅ Define escalation policies
6. ✅ Create runbooks for common incidents
7. ✅ Test alert firing and escalation

**Deliverables:**
- Comprehensive alerting operational
- Incident response playbook
- On-call rotation setup
- Alert noise reduced

**Estimated Effort:** 30 hours

---

### Phase 4: Synthetic Monitoring (Weeks 7-8) 🤖

**Priority: MEDIUM**

**Tasks:**
1. ✅ Configure UptimeRobot monitors
2. ✅ Create Playwright synthetic tests
3. ✅ Set up scheduled synthetic test runs
4. ✅ Integrate with CI/CD
5. ✅ Create uptime dashboard
6. ✅ Configure multi-region checks

**Deliverables:**
- Uptime monitoring active
- Critical path synthetic tests
- Multi-region monitoring
- Uptime SLA tracking

**Estimated Effort:** 20 hours

---

### Phase 5: Advanced Features (Weeks 9-12) 🚀

**Priority: LOW-MEDIUM**

**Tasks:**
1. ✅ Enable session replay (Sentry)
2. ✅ Implement heatmaps/click tracking
3. ✅ Add database performance profiling
4. ✅ Create business metrics dashboards
5. ✅ Implement cost monitoring
6. ✅ Add capacity planning metrics
7. ✅ Configure anomaly detection
8. ✅ Set up A/B testing performance tracking

**Deliverables:**
- Session replay for debugging
- Advanced performance profiling
- Business intelligence dashboards
- Predictive capacity planning

**Estimated Effort:** 50 hours

---

## 14. COST-BENEFIT ANALYSIS

### Current Costs

**Sentry:**
- Plan: Developer (assumed)
- Cost: **$0-26/month**
- Events: 5,000-50,000/month

**Total Current:** ~$26/month

---

### Recommended Stack Costs

#### Option 1: Open Source + Sentry (RECOMMENDED)

**Infrastructure:**
- Sentry: $26-80/month (Team plan)
- Self-hosted Prometheus: $20/month (VPS)
- Self-hosted Grafana: Included
- Self-hosted Jaeger: $20/month (VPS)
- Log storage (S3/similar): $10-30/month
- UptimeRobot: $0-7/month (Free tier)

**Total:** ~$76-157/month

**Benefits:**
- Full observability stack
- Unlimited metrics retention
- Custom dashboards
- Distributed tracing
- Centralized logging

---

#### Option 2: Datadog (Premium)

**Cost:** $500-800/month

**Benefits:**
- All-in-one solution
- Managed service
- Advanced analytics
- Out-of-box integrations
- Machine learning anomaly detection

**Trade-offs:**
- Higher cost
- Vendor lock-in
- May exceed budget for small teams

---

#### Option 3: New Relic

**Cost:** $400-700/month

**Benefits:**
- Comprehensive APM
- Good UX
- Powerful query language (NRQL)
- Integrations

---

### ROI Calculation

**Cost of Downtime:**
- 1 hour downtime = Lost revenue + reputation damage
- Estimate: $1,000-10,000/hour (depends on business)

**Mean Time to Detection (MTTD):**
- Without monitoring: 30-60 minutes (user reports)
- With monitoring: 1-5 minutes (automatic alerts)
- **Improvement:** 25-55 minutes faster detection

**Mean Time to Resolution (MTTR):**
- Without observability: 2-8 hours (debugging blind)
- With observability: 30 minutes-2 hours (traces, logs, metrics)
- **Improvement:** 1.5-6 hours faster resolution

**Annual Savings (Conservative):**
- Prevent 5 incidents/year
- Each incident: 2 hours downtime avoided
- 10 hours saved × $5,000/hour = **$50,000/year**

**Investment:** $1,884/year (Option 1)
**ROI:** **2,553%** (50,000 / 1,884 × 100)

**Conclusion:** Monitoring investment pays for itself after **preventing just ONE major incident**.

---

## 15. QUICK START CHECKLIST

### Week 1: Immediate Actions

- [ ] Install Winston and configure structured logging
- [ ] Create `/api/analytics/vitals` endpoint
- [ ] Deploy PostgreSQL `web_vitals` table
- [ ] Update frontend to send vitals to backend
- [ ] Add Prometheus client library
- [ ] Create `/api/metrics` endpoint
- [ ] Add metrics middleware to Express
- [ ] Create logs directory with rotation

### Week 2: Metrics & Dashboards

- [ ] Deploy Prometheus (Docker or managed)
- [ ] Deploy Grafana (Docker or managed)
- [ ] Configure Prometheus scraping
- [ ] Import Grafana dashboard templates
- [ ] Create custom business metrics
- [ ] Set up Sentry alert rules
- [ ] Test metrics collection

### Week 3: Distributed Tracing

- [ ] Install OpenTelemetry dependencies
- [ ] Configure OTLP exporter
- [ ] Deploy Jaeger backend
- [ ] Enable auto-instrumentation
- [ ] Add custom spans to critical paths
- [ ] Verify traces in Jaeger UI
- [ ] Create trace-based alerts

### Week 4: Alerting

- [ ] Deploy AlertManager
- [ ] Configure alert rules
- [ ] Set up Slack webhook
- [ ] Configure PagerDuty (optional)
- [ ] Test alert firing
- [ ] Document runbooks
- [ ] Define escalation policy

### Week 5: Synthetic Monitoring

- [ ] Create UptimeRobot account
- [ ] Add uptime monitors
- [ ] Write Playwright synthetic tests
- [ ] Add synthetic tests to GitHub Actions
- [ ] Configure failure notifications
- [ ] Create uptime dashboard

---

## 16. IMPLEMENTATION EXAMPLES

### 16.1 Express App with Full Monitoring

**Updated:** `/home/nic20/ProjetosWeb/ImobiBase/server/index.ts`

```typescript
import express from 'express';
import { registerRoutes } from './routes';
import { initializeSentry, addSentryErrorHandler } from './monitoring/sentry';
import { initializeTelemetry } from './monitoring/telemetry';
import { logger } from './monitoring/logger';
import { requestLoggerMiddleware } from './middleware/request-logger';
import { metricsMiddleware, metricsEndpoint } from './monitoring/metrics';

const app = express();

// 1. Initialize Sentry FIRST
initializeSentry(app);

// 2. Initialize OpenTelemetry
await initializeTelemetry();

// 3. Add request logging
app.use(requestLoggerMiddleware);

// 4. Add metrics collection
app.use(metricsMiddleware);

// 5. Body parsing
app.use(express.json());

// 6. Metrics endpoint
app.get('/api/metrics', metricsEndpoint);

// 7. Application routes
await registerRoutes(app);

// 8. Sentry error handler
addSentryErrorHandler(app);

// 9. Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    correlationId: req.id,
  });
  res.status(500).json({ error: 'Internal Server Error' });
});

// 10. Start server
const port = parseInt(process.env.PORT || '5000', 10);
app.listen(port, () => {
  logger.info(`Server started on port ${port}`);
});
```

### 16.2 Instrumented Database Query

```typescript
import { trace } from '@opentelemetry/api';
import { logger } from './monitoring/logger';
import { dbQueryDuration } from './monitoring/metrics';

const tracer = trace.getTracer('imobibase-db');

export async function getPropertiesByTenant(tenantId: string) {
  const span = tracer.startSpan('db.query.properties', {
    attributes: {
      'db.operation': 'SELECT',
      'db.table': 'properties',
      'tenant.id': tenantId,
    },
  });

  const start = Date.now();

  try {
    logger.debug('Fetching properties', { tenantId });

    const properties = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.tenantId, tenantId));

    const duration = (Date.now() - start) / 1000;

    // Record metrics
    dbQueryDuration.observe(
      { query: 'get_properties', status: 'success' },
      duration
    );

    span.setAttribute('db.rows_returned', properties.length);
    span.setStatus({ code: SpanStatusCode.OK });

    logger.info('Properties fetched', {
      tenantId,
      count: properties.length,
      duration,
    });

    return properties;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;

    dbQueryDuration.observe(
      { query: 'get_properties', status: 'error' },
      duration
    );

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR });

    logger.error('Failed to fetch properties', {
      tenantId,
      error: error.message,
      duration,
    });

    throw error;
  } finally {
    span.end();
  }
}
```

### 16.3 Business Metrics Tracking

```typescript
import { leadsCreated, propertiesAdded } from './monitoring/metrics';
import { logger } from './monitoring/logger';

export async function createLead(data: LeadInput, tenantId: string) {
  try {
    const lead = await storage.createLead(data);

    // Track business metric
    leadsCreated.inc({
      source: data.source,
      tenant_id: tenantId,
    });

    logger.info('Lead created', {
      leadId: lead.id,
      tenantId,
      source: data.source,
    });

    return lead;
  } catch (error) {
    logger.error('Failed to create lead', {
      tenantId,
      error: error.message,
    });
    throw error;
  }
}
```

---

## 17. FINAL RECOMMENDATIONS

### IMMEDIATE ACTIONS (This Week)

1. **Deploy Winston Logging** (4 hours)
   - Structured JSON logging
   - Correlation IDs
   - Log rotation

2. **Implement Web Vitals Backend** (6 hours)
   - Create `/api/analytics/vitals` endpoint
   - Add database table
   - Create simple dashboard

3. **Add Prometheus Metrics** (8 hours)
   - Install prom-client
   - Create `/api/metrics` endpoint
   - Add metrics middleware

### SHORT TERM (Next 2 Weeks)

4. **Deploy Prometheus + Grafana** (12 hours)
   - Use Docker Compose
   - Configure scraping
   - Import dashboard templates

5. **Implement OpenTelemetry** (16 hours)
   - Add SDK
   - Configure OTLP exporter
   - Deploy Jaeger
   - Add custom spans

### MEDIUM TERM (Next Month)

6. **Configure Alerting** (8 hours)
   - AlertManager setup
   - Define alert rules
   - Slack integration

7. **Synthetic Monitoring** (6 hours)
   - UptimeRobot configuration
   - Playwright tests

### LONG TERM (Next Quarter)

8. **Advanced Features** (40 hours)
   - Session replay
   - Advanced profiling
   - Business metrics dashboards
   - Capacity planning

---

## 18. MONITORING MATURITY MODEL

### Current State: **Level 3 - Intermediate**

**Level 1: Basic (0-2)**
- ❌ No monitoring
- ❌ Manual health checks
- ❌ Logs only in application

**Level 2: Reactive (2-3)**
- ✅ Basic error tracking (Sentry)
- ✅ Simple health checks
- ❌ No centralized logging

**Level 3: Intermediate (3-4)** ← **YOU ARE HERE**
- ✅ Error tracking configured
- ✅ Web Vitals collection (frontend)
- ✅ Health check endpoint
- ✅ Job queue monitoring
- ❌ No distributed tracing
- ❌ Limited metrics collection
- ❌ Basic alerting

**Level 4: Advanced (4-5)**
- ✅ Distributed tracing
- ✅ Comprehensive metrics
- ✅ Centralized logging
- ✅ Advanced dashboards
- ✅ Proactive alerting
- ✅ Synthetic monitoring

**Level 5: Expert (5)**
- ✅ Full observability
- ✅ AI-powered anomaly detection
- ✅ Auto-remediation
- ✅ Capacity planning
- ✅ Business metrics correlation

**Goal:** Reach **Level 4** within 3 months

---

## 19. KEY METRICS TO TRACK

### Golden Signals (SRE)

1. **Latency**
   - p50, p95, p99 response times
   - Target: p95 < 500ms

2. **Traffic**
   - Requests per second
   - Active users

3. **Errors**
   - Error rate (5xx responses)
   - Target: < 0.1%

4. **Saturation**
   - CPU usage
   - Memory usage
   - Database connections

### RED Method (Requests, Errors, Duration)

1. **Request Rate**
   - Total requests/sec by endpoint

2. **Error Rate**
   - 4xx and 5xx error percentage

3. **Duration**
   - Response time distribution

### USE Method (Utilization, Saturation, Errors)

1. **Utilization**
   - CPU, memory, disk, network usage

2. **Saturation**
   - Queue depths, wait times

3. **Errors**
   - Hardware errors, failures

### Business Metrics

1. **User Actions**
   - Leads created
   - Properties added
   - Contracts signed

2. **Conversion Funnel**
   - Signup → Activation → Retention

3. **Feature Adoption**
   - Feature usage rates
   - Time to value

---

## 20. CONCLUSION

### Summary

ImobiBase has a **solid foundation** with Sentry integration and basic health monitoring, but requires **significant enhancements** to achieve production-grade observability. The implementation of **distributed tracing, centralized logging, and comprehensive metrics collection** should be the immediate priority.

### Critical Path Forward

**Week 1-2:** Implement Winston logging + Web Vitals backend + Prometheus metrics
**Week 3-4:** Deploy Prometheus + Grafana + OpenTelemetry
**Week 5-6:** Configure alerting + synthetic monitoring
**Month 3+:** Advanced features and optimization

### Success Criteria

**After Implementation:**
- ✅ MTTD < 5 minutes (from 30-60 minutes)
- ✅ MTTR < 2 hours (from 2-8 hours)
- ✅ 99.9% uptime SLO achieved
- ✅ p95 latency < 500ms
- ✅ Error rate < 0.1%
- ✅ Full request tracing available
- ✅ Proactive alerting operational

### Monitoring Maturity Progression

**Current:** 3.2/5 (Intermediate)
**3 Months:** 4.0/5 (Advanced)
**6 Months:** 4.5/5 (Expert)

---

**Report Generated:** 2025-12-25
**Agent:** AGENTE 14 - APM & Observability Specialist
**Next Review:** 2026-01-25 (Monthly)

---

## APPENDIX

### A. Environment Variables Required

```bash
# Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_AUTH_TOKEN=sntrys_xxx

# OpenTelemetry
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://localhost:4318/v1/metrics
ENABLE_TELEMETRY=true

# Logging
LOG_LEVEL=info # debug, info, warn, error

# Alerting
SLACK_WEBHOOK_URL=https://hooks.slack.com/xxx
PAGERDUTY_SERVICE_KEY=xxx

# Analytics
POSTHOG_API_KEY=phc_xxx
POSTHOG_HOST=https://app.posthog.com
```

### B. Useful Prometheus Queries

```promql
# Request rate by endpoint
sum(rate(http_requests_total[5m])) by (route)

# Error rate percentage
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100

# p95 latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (route, le)
)

# Apdex score (target: 300ms)
(
  sum(rate(http_request_duration_seconds_bucket{le="0.3"}[5m]))
  + sum(rate(http_request_duration_seconds_bucket{le="1.2"}[5m])) / 2
) / sum(rate(http_request_duration_seconds_count[5m]))

# CPU usage
rate(process_cpu_seconds_total[5m]) * 100

# Memory usage (MB)
process_resident_memory_bytes / 1024 / 1024
```

### C. Grafana Dashboard Templates

- **Node.js Application Monitoring:** Dashboard ID 11159
- **Express.js Monitoring:** Dashboard ID 10913
- **PostgreSQL Database:** Dashboard ID 9628
- **Redis:** Dashboard ID 763

### D. Reference Links

- [OpenTelemetry Node.js](https://opentelemetry.io/docs/instrumentation/js/getting-started/nodejs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Web Vitals](https://web.dev/vitals/)
- [SRE Book - Monitoring](https://sre.google/sre-book/monitoring-distributed-systems/)

---

**END OF REPORT**
