# AGENTE 14: MONITORING QUICK START GUIDE

**ImobiBase Performance Monitoring - Implementation Guide**
**Generated:** 2025-12-25

---

## 🎯 QUICK WINS (This Week)

### 1. Winston Logging Setup (4 hours)

```bash
# Already installed, just configure
```

**Create:** `server/monitoring/logger.ts`

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'imobibase-api',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
```

**Update:** `server/index.ts`

```typescript
import { logger } from './monitoring/logger';

// Replace console.log with logger
logger.info('Server started', { port: 5000 });
```

---

### 2. Web Vitals Backend (6 hours)

**Step 1:** Create database table

```sql
-- migrations/add-web-vitals.sql
CREATE TABLE web_vitals (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  vital_id VARCHAR(100) NOT NULL,
  rating VARCHAR(20),
  url TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_web_vitals_name_timestamp ON web_vitals(name, timestamp);
```

**Step 2:** Add endpoint to `server/routes.ts`

```typescript
// Web Vitals collection
app.post("/api/analytics/vitals", async (req, res) => {
  try {
    const { name, value, id, rating } = req.body;

    await storage.saveWebVital({
      name,
      value,
      vitalId: id,
      rating,
      url: req.headers.referer || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
    });

    res.status(201).json({ success: true });
  } catch (error) {
    logger.error('Failed to save Web Vital', { error });
    res.status(500).json({ error: 'Failed to save metric' });
  }
});
```

**Step 3:** Frontend already sends data! ✅

File: `client/src/main.tsx` - Already implemented

---

### 3. Prometheus Metrics (8 hours)

**Install:**

```bash
npm install prom-client
```

**Create:** `server/monitoring/metrics.ts`

```typescript
import { register, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

// Collect default metrics
collectDefaultMetrics({ prefix: 'imobibase_' });

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// HTTP duration
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

// Metrics endpoint
export function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  res.send(register.metrics());
}

// Middleware
export function metricsMiddleware(req, res, next) {
  const start = Date.now();

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
  });

  next();
}
```

**Update:** `server/index.ts`

```typescript
import { metricsMiddleware, metricsEndpoint } from './monitoring/metrics';

app.use(metricsMiddleware);
app.get('/api/metrics', metricsEndpoint);
```

**Test:**

```bash
curl http://localhost:5000/api/metrics
```

---

## 🚀 PHASE 2: Prometheus + Grafana (Week 2)

### Deploy with Docker Compose

**Update:** `docker-compose.yml`

```yaml
services:
  # ... existing services ...

  # Prometheus
  prometheus:
    image: prom/prometheus:latest
    container_name: imobibase-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped
    networks:
      - imobibase-network

  # Grafana
  grafana:
    image: grafana/grafana:latest
    container_name: imobibase-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped
    networks:
      - imobibase-network

volumes:
  prometheus_data:
  grafana_data:
```

**Create:** `prometheus.yml`

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'imobibase-api'
    static_configs:
      - targets: ['app:5000']
    metrics_path: '/api/metrics'
```

**Start:**

```bash
docker-compose up -d prometheus grafana
```

**Access:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

---

## 📊 PHASE 3: Grafana Dashboard Setup

### Import Dashboards

1. Open Grafana → http://localhost:3000
2. Login (admin/admin)
3. Add Prometheus data source
   - URL: http://prometheus:9090
   - Save & Test
4. Import dashboards:
   - Go to **Dashboards → Import**
   - Use Dashboard IDs:
     - **11159** - Node.js Application Monitoring
     - **10913** - Express.js Monitoring

### Create Custom Dashboard

**Dashboards → New → Add Visualization**

**Panel 1: Request Rate**
```promql
sum(rate(http_requests_total[5m]))
```

**Panel 2: Error Rate**
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100
```

**Panel 3: p95 Latency**
```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (route, le)
)
```

**Panel 4: Memory Usage**
```promql
process_resident_memory_bytes / 1024 / 1024
```

---

## 🔍 PHASE 4: OpenTelemetry (Week 3)

### Install Dependencies

```bash
npm install --save \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http
```

### Configure OpenTelemetry

**Create:** `server/monitoring/telemetry.ts`

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

export async function initializeTelemetry() {
  if (process.env.NODE_ENV === 'production') {
    await sdk.start();
    console.log('✅ OpenTelemetry initialized');
  }
}
```

### Deploy Jaeger

**Add to docker-compose.yml:**

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: imobibase-jaeger
    ports:
      - "16686:16686" # UI
      - "4318:4318"   # OTLP HTTP
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    restart: unless-stopped
    networks:
      - imobibase-network
```

**Start:**

```bash
docker-compose up -d jaeger
```

**Access Jaeger UI:** http://localhost:16686

---

## 🚨 PHASE 5: Alerting (Week 4)

### Configure Sentry Alerts

**In Sentry Dashboard:**

1. **Settings → Alerts → New Alert Rule**

**Alert 1: High Error Rate**
- Trigger: When an event is captured
- Conditions: The issue is seen more than 10 times in 1 minute
- Actions: Send notification to Slack #alerts

**Alert 2: New Error**
- Trigger: When a new issue is created
- Conditions: First occurrence in production
- Actions: Send notification to Slack #errors

### Prometheus AlertManager

**Create:** `alertmanager.yml`

```yaml
global:
  slack_api_url: '${SLACK_WEBHOOK_URL}'

route:
  receiver: 'slack-alerts'

receivers:
  - name: 'slack-alerts'
    slack_configs:
      - channel: '#alerts'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

**Create:** `alerts.yml`

```yaml
groups:
  - name: imobibase
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        annotations:
          description: "Error rate is above 5%"
```

---

## 🤖 PHASE 6: Synthetic Monitoring

### UptimeRobot Setup

1. Go to https://uptimerobot.com
2. Create monitors:
   - **Homepage**: https://imobibase.com (every 5 min)
   - **API Health**: https://imobibase.com/api/health (every 5 min)
   - **Login**: https://imobibase.com/login (every 10 min)

### Playwright Synthetic Tests

**Create:** `tests/synthetic/critical-path.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('Health check', async ({ page }) => {
  const response = await page.goto('https://imobibase.com/api/health');
  expect(response?.status()).toBe(200);

  const json = await response?.json();
  expect(json.status).toBe('ok');
});

test('Login flow', async ({ page }) => {
  await page.goto('https://imobibase.com/login');
  await page.fill('[name="email"]', process.env.TEST_USER_EMAIL!);
  await page.fill('[name="password"]', process.env.TEST_USER_PASSWORD!);
  await page.click('[type="submit"]');

  await expect(page).toHaveURL(/.*dashboard/);
});
```

**Add to GitHub Actions:**

```yaml
# .github/workflows/synthetic-tests.yml
name: Synthetic Tests
on:
  schedule:
    - cron: '*/30 * * * *' # Every 30 minutes

jobs:
  synthetic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright test tests/synthetic
```

---

## 📈 MONITORING CHECKLIST

### Week 1
- [ ] Configure Winston logging
- [ ] Implement Web Vitals backend endpoint
- [ ] Add Prometheus metrics
- [ ] Deploy database migration for web_vitals table
- [ ] Test metrics endpoint

### Week 2
- [ ] Deploy Prometheus with Docker
- [ ] Deploy Grafana with Docker
- [ ] Configure Prometheus scraping
- [ ] Import Grafana dashboard templates
- [ ] Create custom business metrics

### Week 3
- [ ] Install OpenTelemetry SDK
- [ ] Configure OTLP exporter
- [ ] Deploy Jaeger backend
- [ ] Add custom spans to critical paths
- [ ] Verify traces in Jaeger UI

### Week 4
- [ ] Configure Sentry alert rules
- [ ] Set up Prometheus AlertManager
- [ ] Configure Slack integration
- [ ] Test alert firing
- [ ] Document runbooks

### Week 5
- [ ] Create UptimeRobot monitors
- [ ] Write Playwright synthetic tests
- [ ] Add synthetic tests to CI/CD
- [ ] Configure failure notifications

---

## 🔑 KEY METRICS TO WATCH

### Golden Signals

1. **Latency** - p95 < 500ms ✅
2. **Traffic** - Requests/sec
3. **Errors** - Error rate < 0.1% ✅
4. **Saturation** - CPU/Memory usage

### Core Web Vitals

1. **LCP** < 2.5s ✅
2. **INP** < 200ms ✅
3. **CLS** < 0.1 ✅

### Business Metrics

1. **Leads Created** - Daily/Weekly
2. **Properties Added** - Daily/Weekly
3. **Active Users** - Daily Active Users (DAU)

---

## 🆘 TROUBLESHOOTING

### Metrics Not Appearing in Prometheus

**Check:**
```bash
# Test metrics endpoint
curl http://localhost:5000/api/metrics

# Check Prometheus targets
# Open http://localhost:9090/targets
# Status should be "UP"
```

**Fix:**
- Ensure app is accessible from Prometheus container
- Check prometheus.yml configuration
- Verify metrics endpoint returns data

### Jaeger Not Receiving Traces

**Check:**
```bash
# Verify OTLP endpoint is accessible
curl http://localhost:4318/v1/traces

# Check environment variable
echo $OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
```

**Fix:**
- Set `ENABLE_TELEMETRY=true` in production
- Ensure Jaeger container is running
- Check network connectivity

### Logs Not Writing

**Check:**
```bash
# Verify logs directory exists
ls -la logs/

# Check permissions
chmod 755 logs/
```

**Fix:**
- Create logs directory: `mkdir logs`
- Check Winston configuration
- Verify log level

---

## 📚 USEFUL COMMANDS

### Prometheus Queries

```promql
# Request rate
sum(rate(http_requests_total[5m]))

# Error rate percentage
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total[5m])) * 100

# p95 latency
histogram_quantile(0.95,
  rate(http_request_duration_seconds_bucket[5m])
)

# Memory usage (MB)
process_resident_memory_bytes / 1024 / 1024
```

### Docker Commands

```bash
# Start monitoring stack
docker-compose up -d prometheus grafana jaeger

# View logs
docker-compose logs -f prometheus
docker-compose logs -f grafana
docker-compose logs -f jaeger

# Restart services
docker-compose restart prometheus grafana

# Stop monitoring stack
docker-compose down prometheus grafana jaeger
```

### Database Queries

```sql
-- Web Vitals summary (last 7 days)
SELECT
  name,
  COUNT(*) as count,
  AVG(value) as avg_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95
FROM web_vitals
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY name;

-- Top slow pages by LCP
SELECT
  url,
  AVG(value) as avg_lcp
FROM web_vitals
WHERE name = 'LCP'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY url
ORDER BY avg_lcp DESC
LIMIT 10;
```

---

## 🎯 SUCCESS CRITERIA

After implementation, you should achieve:

- ✅ **MTTD < 5 minutes** (Mean Time to Detection)
- ✅ **MTTR < 2 hours** (Mean Time to Resolution)
- ✅ **99.9% uptime** (43 minutes downtime/month max)
- ✅ **p95 latency < 500ms**
- ✅ **Error rate < 0.1%**
- ✅ **Core Web Vitals all "good"**
- ✅ **Full request tracing available**
- ✅ **Proactive alerting operational**

---

## 🔗 QUICK LINKS

- **Main Report:** AGENTE_14_APM_MONITORING_ULTRA_DEEP_DIVE.md
- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3000
- **Jaeger:** http://localhost:16686
- **Sentry:** https://sentry.io
- **Metrics Endpoint:** http://localhost:5000/api/metrics
- **Health Check:** http://localhost:5000/api/health

---

## 📞 SUPPORT

**Issues?**
1. Check logs: `docker-compose logs -f [service]`
2. Verify configuration files
3. Test endpoints with curl
4. Review main report for detailed troubleshooting

**Need Help?**
- Refer to detailed report: AGENTE_14_APM_MONITORING_ULTRA_DEEP_DIVE.md
- Check official documentation links in main report
- Test individual components in isolation

---

**Generated:** 2025-12-25
**Last Updated:** 2025-12-25
**Version:** 1.0.0
