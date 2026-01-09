# API DESIGN - QUICK REFERENCE GUIDE

**AGENTE 16/20: API Design & REST Standards**
**Quick Start Implementation Guide**

---

## CRITICAL ISSUES TO FIX NOW

### 1. Add API Versioning (Day 1)

```typescript
// server/index.ts
import v1Router from './routes/v1';

// Add v1 routes
app.use('/api/v1', v1Router);

// Maintain backward compatibility temporarily
app.use('/api', (req, res, next) => {
  res.setHeader('X-API-Warn', 'Use /api/v1 instead. Unversioned endpoints will be deprecated.');
  next();
}, v1Router);
```

### 2. Fix Status Codes (Day 1)

```typescript
// POST endpoints - return 201 Created
app.post('/api/v1/properties', async (req, res) => {
  const property = await storage.createProperty(data);
  res.status(201).json(property);  // ← Add this
});

// DELETE endpoints - return 204 No Content
app.delete('/api/v1/properties/:id', async (req, res) => {
  await storage.deleteProperty(id);
  res.status(204).send();  // ← Change from res.json()
});
```

### 3. Standardize Pagination (Day 2)

```typescript
// server/lib/pagination.ts
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Use in all list endpoints:
app.get('/api/v1/properties', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);

  const { data, total } = await storage.getProperties(tenantId, page, limit);

  res.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    }
  });
});
```

### 4. Add Request IDs (Day 1)

```typescript
// server/middleware/request-id.ts
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

// server/index.ts
import { requestIdMiddleware } from './middleware/request-id';
app.use(requestIdMiddleware);
```

### 5. Add CSRF Protection (Day 2)

```typescript
// npm install csurf cookie-parser
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
const csrfProtection = csrf({ cookie: true });

// Get CSRF token
app.get('/api/v1/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protect state-changing operations
app.post('/api/v1/properties', csrfProtection, createProperty);
app.patch('/api/v1/properties/:id', csrfProtection, updateProperty);
app.delete('/api/v1/properties/:id', csrfProtection, deleteProperty);
```

---

## QUICK FIXES (< 30 minutes each)

### Enable Response Compression

```typescript
import compression from 'compression';
app.use(compression());
```

### Add Security Headers

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});
```

### Add Request Size Limits

```typescript
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: false }));
```

### Add Database Indexes

```sql
-- Properties
CREATE INDEX idx_properties_tenant_status ON properties(tenant_id, status);

-- Leads
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);

-- Payments
CREATE INDEX idx_rental_payments_contract_due ON rental_payments(contract_id, due_date);
```

---

## OPENAPI SETUP (2 hours)

### Install Dependencies

```bash
npm install swagger-ui-express yamljs
npm install --save-dev @types/swagger-ui-express
```

### Create openapi.yaml

```yaml
openapi: 3.0.3
info:
  title: ImobiBase API
  version: 1.0.0
paths:
  /properties:
    get:
      summary: List properties
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: Success
```

### Serve Documentation

```typescript
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./openapi.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

Visit: http://localhost:5000/api-docs

---

## STANDARD ERROR RESPONSE

```typescript
// All errors should return:
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE",
  "statusCode": 400,
  "requestId": "req_abc123",
  "timestamp": "2025-12-25T10:30:00Z",
  "errors": [  // Optional, for validation errors
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

---

## CACHING IMPLEMENTATION

### Add ETag Support

```typescript
import etag from 'etag';

app.get('/api/v1/properties/:id', async (req, res) => {
  const property = await storage.getProperty(req.params.id);

  const etagValue = etag(JSON.stringify(property));

  if (req.headers['if-none-match'] === etagValue) {
    return res.status(304).send();
  }

  res.set('ETag', etagValue);
  res.set('Cache-Control', 'private, max-age=300');
  res.json(property);
});
```

### Add Redis Caching

```typescript
import { getRedisClient } from './cache/redis-client';

const cache = async (key: string, ttl: number, fn: () => Promise<any>) => {
  const redis = await getRedisClient();

  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const result = await fn();
  await redis.setex(key, ttl, JSON.stringify(result));

  return result;
};

// Usage:
app.get('/api/v1/properties', async (req, res) => {
  const cacheKey = `properties:${tenantId}:${page}:${limit}`;

  const result = await cache(cacheKey, 300, async () => {
    return await storage.getProperties(tenantId, page, limit);
  });

  res.json(result);
});
```

---

## RATE LIMITING TIERS

```typescript
import rateLimit from 'express-rate-limit';

// Auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `${req.ip}:${req.body?.email || ''}`
});

// Write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id || req.ip
});

// Read operations
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip
});

// File uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.user?.id
});

// Apply:
app.post('/api/v1/auth/login', authLimiter, login);
app.post('/api/v1/properties', writeLimiter, createProperty);
app.get('/api/v1/properties', readLimiter, listProperties);
app.post('/api/v1/files/upload', uploadLimiter, uploadFile);
```

---

## FILTERING & SORTING

```typescript
// Standard query format:
GET /api/v1/properties?filter[type]=apartment&filter[status]=available
GET /api/v1/properties?price[gte]=100000&price[lte]=500000
GET /api/v1/properties?sort=-price,createdAt
GET /api/v1/properties?fields=id,title,price

// Implementation:
function parseFilters(query: any) {
  const filters: any = {};

  Object.keys(query).forEach(key => {
    if (key.startsWith('filter[')) {
      const field = key.match(/filter\[(\w+)\]/)?.[1];
      if (field) filters[field] = query[key];
    }
  });

  return filters;
}

function parseSort(sortParam: string) {
  if (!sortParam) return [];

  return sortParam.split(',').map(field => {
    if (field.startsWith('-')) {
      return { field: field.slice(1), order: 'desc' };
    }
    return { field, order: 'asc' };
  });
}

// Usage:
app.get('/api/v1/properties', async (req, res) => {
  const filters = parseFilters(req.query);
  const sort = parseSort(req.query.sort);
  const fields = req.query.fields?.split(',');

  const properties = await storage.getProperties(tenantId, {
    filters,
    sort,
    fields,
    page,
    limit
  });

  res.json(properties);
});
```

---

## JWT AUTHENTICATION

```typescript
import jwt from 'jsonwebtoken';

// Generate token
app.post('/api/v1/auth/token', async (req, res) => {
  const { email, password } = req.body;

  const user = await authenticateUser(email, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = jwt.sign(
    { userId: user.id, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: 3600
  });
});

// Verify token middleware
export function requireJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Use:
app.get('/api/v1/properties', requireJWT, listProperties);
```

---

## RBAC IMPLEMENTATION

```typescript
// Define roles and permissions
const PERMISSIONS = {
  'property:read': ['admin', 'broker', 'viewer'],
  'property:create': ['admin', 'broker'],
  'property:update': ['admin', 'broker'],
  'property:delete': ['admin'],
  'user:manage': ['admin'],
};

// Permission middleware
export function requirePermission(permission: string) {
  return (req, res, next) => {
    const userRole = req.user?.role;

    if (!PERMISSIONS[permission]?.includes(userRole)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: permission
      });
    }

    next();
  };
}

// Use:
app.delete('/api/v1/properties/:id',
  requireAuth,
  requirePermission('property:delete'),
  deleteProperty
);
```

---

## TESTING CHECKLIST

### Unit Tests
```typescript
describe('GET /api/v1/properties', () => {
  it('should return paginated properties', async () => {
    const res = await request(app)
      .get('/api/v1/properties?page=1&limit=10')
      .set('Cookie', sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('should return 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/properties');
    expect(res.status).toBe(401);
  });
});
```

### Load Tests
```bash
# Install Artillery
npm install -g artillery

# Create test.yml
artillery quick --count 100 --num 10 http://localhost:5000/api/v1/properties

# Should achieve:
# - P95 < 500ms
# - P99 < 1000ms
# - 0% error rate
```

---

## MONITORING SETUP

```typescript
import promClient from 'prom-client';

// Create metrics
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

// Middleware to track
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });

  next();
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

---

## DEPLOYMENT CHECKLIST

### Before Production:

- [ ] API versioning implemented (/api/v1)
- [ ] OpenAPI documentation published
- [ ] All endpoints have rate limiting
- [ ] CSRF protection enabled
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Database indexes added
- [ ] Caching strategy implemented
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring (Prometheus) set up
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] Backup strategy in place
- [ ] Rollback plan documented

---

## USEFUL COMMANDS

```bash
# Count endpoints
grep -r "app\.\(get\|post\|put\|patch\|delete\)" server/routes*.ts | wc -l

# Find routes without authentication
grep -r "app\..*(" server/routes*.ts | grep -v "requireAuth"

# Check for hardcoded secrets
grep -r "api.*key\|secret\|password" server/ --exclude-dir=node_modules

# Performance test endpoint
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:5000/api/v1/properties"

# curl-format.txt:
time_total: %{time_total}s
```

---

## COMMON PATTERNS

### Batch Operations
```typescript
POST /api/v1/properties/batch
{
  "operations": [
    { "op": "create", "data": {...} },
    { "op": "update", "id": "123", "data": {...} },
    { "op": "delete", "id": "456" }
  ]
}
```

### Partial Updates
```typescript
PATCH /api/v1/properties/123
{
  "price": 250000  // Only update price
}
```

### Bulk Delete
```typescript
DELETE /api/v1/properties/bulk
{
  "ids": ["id1", "id2", "id3"]
}
```

### Search
```typescript
GET /api/v1/properties/search?q=apartment+beachfront&location=Miami
```

---

## KEY METRICS TO TRACK

```
Response Time:
- P50 < 100ms
- P95 < 500ms
- P99 < 1000ms

Availability:
- Uptime > 99.9%
- Error rate < 0.1%

Rate Limits:
- Auth: 20/15min
- Write: 30/min
- Read: 100/min

Cache Hit Rate:
- Properties: > 60%
- Dashboard: > 80%

Database:
- Query time < 50ms
- Connection pool < 80%
```

---

**Quick Reference Version 1.0**
**Last Updated:** 2025-12-25
**For:** ImobiBase API Development Team
