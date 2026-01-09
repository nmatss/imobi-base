# AGENTE 16/20: API DESIGN & REST STANDARDS - ULTRA DEEP DIVE

**Análise Completa do Design da API ImobiBase**
**Data:** 2025-12-25
**Analista:** AGENTE 16 - API Design Specialist
**Escopo:** Avaliação profunda de padrões REST, design de API e conformidade

---

## 📊 EXECUTIVE SUMMARY

### API Design Score: **72/100**

| Categoria | Score | Status |
|-----------|-------|--------|
| REST Compliance | 68/100 | 🟡 MODERATE |
| URL Structure | 75/100 | 🟡 GOOD |
| HTTP Methods | 80/100 | 🟢 GOOD |
| Status Codes | 70/100 | 🟡 MODERATE |
| Error Handling | 85/100 | 🟢 EXCELLENT |
| Pagination | 60/100 | 🔴 NEEDS WORK |
| Authentication | 75/100 | 🟡 GOOD |
| Documentation | 15/100 | 🔴 CRITICAL |
| Versioning | 0/100 | 🔴 MISSING |
| Caching | 55/100 | 🟡 MODERATE |
| Security | 78/100 | 🟡 GOOD |
| Performance | 65/100 | 🟡 MODERATE |

---

## 1. API INVENTORY

### Total Endpoints: **322+**

#### Distribuição por Arquivo:
```
routes.ts                    149 endpoints  (46%)
routes-whatsapp.ts           41 endpoints   (13%)
routes-maps.ts               35 endpoints   (11%)
routes-files.ts              22 endpoints   (7%)
routes-email.ts              11 endpoints   (3%)
routes-esignature.ts         19 endpoints   (6%)
routes-payments.ts           11 endpoints   (3%)
routes-jobs.ts               25 endpoints   (8%)
routes-security.ts           ~10 endpoints  (3%)
Total                        322+ endpoints
```

#### Distribuição por Método HTTP:
```
GET     : 160 endpoints (50%)
POST    : 92 endpoints  (28%)
PATCH   : 38 endpoints  (12%)
DELETE  : 24 endpoints  (7%)
PUT     : 8 endpoints   (3%)
```

### Agrupamento por Domínio:

#### 🏢 **Core Business (87 endpoints)**
- Properties: 12 endpoints
- Leads: 18 endpoints
- Owners: 10 endpoints
- Renters: 10 endpoints
- Contracts: 8 endpoints
- Visits: 8 endpoints
- Rental Contracts: 10 endpoints
- Rental Payments: 11 endpoints

#### 💰 **Financial (24 endpoints)**
- Finance Categories: 8 endpoints
- Finance Entries: 10 endpoints
- Commissions: 6 endpoints

#### 📊 **Analytics & Reports (14 endpoints)**
- Dashboard Stats: 3 endpoints
- Financial Reports: 5 endpoints
- Rental Reports: 6 endpoints

#### 🔐 **Authentication & Security (12 endpoints)**
- Auth: 5 endpoints
- Security Routes: ~7 endpoints

#### 💬 **Communications (63 endpoints)**
- WhatsApp: 41 endpoints
- Email: 11 endpoints
- SMS: ~11 endpoints

#### 🗺️ **Maps & Location (35 endpoints)**
- Geocoding: 5 endpoints
- Places & Amenities: 8 endpoints
- Property Location: 12 endpoints
- Distance & Directions: 10 endpoints

#### 📄 **Document Management (41 endpoints)**
- File Upload: 22 endpoints
- E-Signature: 19 endpoints

#### ⚙️ **Admin & System (46 endpoints)**
- Admin: 8 endpoints
- Jobs/Queue: 25 endpoints
- Tenants: 5 endpoints
- Settings: 8 endpoints

---

## 2. REST COMPLIANCE ANALYSIS

### ✅ **GOOD PRACTICES FOUND:**

#### 2.1 Proper Resource Naming (Plural)
```
✅ /api/properties
✅ /api/leads
✅ /api/owners
✅ /api/renters
✅ /api/contracts
✅ /api/visits
```

#### 2.2 Consistent HTTP Method Usage
```
✅ GET    /api/properties        (List)
✅ GET    /api/properties/:id    (Read)
✅ POST   /api/properties        (Create)
✅ PATCH  /api/properties/:id    (Update)
✅ DELETE /api/properties/:id    (Delete)
```

#### 2.3 Nested Resources for Relationships
```
✅ GET /api/leads/:leadId/interactions
✅ GET /api/leads/:leadId/matched-properties
✅ GET /api/leads/:leadId/tags
✅ GET /api/owners/:id/statement
✅ GET /api/renters/:id/payment-history
```

#### 2.4 Action-based Endpoints for Operations
```
✅ POST /api/rental-transfers/generate
✅ POST /api/auth/refresh
✅ POST /api/saved-reports/:id/toggle-favorite
✅ POST /api/finance-categories/seed-defaults
```

### ❌ **REST VIOLATIONS & ISSUES:**

#### 2.1 Inconsistent Pluralization
```
❌ /api/auth/login           (Should be /api/sessions)
❌ /api/auth/logout          (Should be DELETE /api/sessions/:id)
❌ /api/auth/refresh         (Acceptable for tokens)
❌ /api/dashboard/stats      (Singular)
```

#### 2.2 Mixed Naming Conventions
```
❌ /api/rental-contracts     (kebab-case)
✅ /api/rentalContracts      (Should use one style)
❌ /api/finance-entries      (kebab-case)
❌ /api/lead-tags            (kebab-case)
```

#### 2.3 Action Verbs in URLs
```
❌ POST /api/newsletter/subscribe    (Should be POST /api/subscriptions)
❌ POST /api/esignature/send         (Should be PATCH /api/signature-requests/:id)
❌ POST /api/esignature/cancel/:id   (Should be DELETE or PATCH status)
❌ POST /api/whatsapp/send           (Should be POST /api/messages)
```

#### 2.4 Inconsistent Query Parameter Handling
```
⚠️  Some use page/limit
⚠️  Some use offset/limit
⚠️  No cursor-based pagination
⚠️  No standardized filtering syntax
```

---

## 3. HTTP STATUS CODES ANALYSIS

### ✅ **Properly Implemented (673 occurrences):**

```typescript
// Good status code usage found in routes
200 OK              - Used for successful GET requests
201 Created         - Used occasionally for POST (inconsistent)
204 No Content      - MISSING (should be used for DELETE)
400 Bad Request     - Widely used for validation errors
401 Unauthorized    - Used for auth errors
403 Forbidden       - Used for permission errors
404 Not Found       - Used for missing resources
409 Conflict        - Defined in error-handler.ts
422 Unprocessable   - MISSING (should be used for semantic errors)
429 Too Many Req.   - Implemented in rate limiter
500 Internal Error  - Used as default error
503 Service Unavail - Defined in error-handler.ts
```

### ❌ **Issues Found:**

#### 3.1 Missing 201 Created for POST operations
```typescript
// Current (many places):
app.post('/api/properties', async (req, res) => {
  const property = await storage.createProperty(data);
  res.json(property);  // ❌ Returns 200 instead of 201
});

// Should be:
res.status(201).json(property);
```

#### 3.2 No 204 No Content for DELETE
```typescript
// Current:
app.delete('/api/properties/:id', async (req, res) => {
  await storage.deleteProperty(id);
  res.json({ success: true });  // ❌ Should be 204
});

// Should be:
res.status(204).send();
```

#### 3.3 Inconsistent Error Responses
```typescript
// Multiple error response formats found:
res.status(400).json({ error: 'message' });
res.status(400).json({ message: 'error' });
res.status(500).json({ error: error.message });
```

---

## 4. REQUEST/RESPONSE FORMAT ANALYSIS

### ✅ **Good Practices:**

#### 4.1 Standardized Error Handling
```typescript
// Excellent error middleware in error-handler.ts
export class ValidationError extends AppError {
  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      errors: this.errors?.map(e => ({
        field: e.path?.join('.'),
        message: e.message,
        code: e.code,
      })),
    };
  }
}
```

#### 4.2 Zod Schema Validation
```typescript
// Routes use Zod validation middleware
app.post('/api/esignature/upload',
  validateBody(uploadDocumentSchema),
  asyncHandler(async (req, res) => { ... })
);
```

#### 4.3 Async Error Handling
```typescript
// asyncHandler wrapper prevents try-catch boilerplate
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### ❌ **Issues:**

#### 4.1 No Consistent Response Envelope
```typescript
// Different response formats:
res.json({ property })           // Direct object
res.json({ success: true, data }) // Envelope
res.json({ file })               // Wrapped
res.json(properties)             // Bare array
```

#### 4.2 Missing HATEOAS Links
```typescript
// No hypermedia links in responses
// Should include:
{
  "id": "123",
  "name": "Property",
  "_links": {
    "self": "/api/properties/123",
    "leads": "/api/properties/123/leads",
    "images": "/api/properties/123/images"
  }
}
```

#### 4.3 Inconsistent Metadata in Lists
```typescript
// Some endpoints return pagination metadata, others don't
res.json({ files, count: files.length });  // ✅
res.json(properties);                      // ❌ No metadata
```

---

## 5. PAGINATION ANALYSIS

### Current Implementation (Score: 60/100)

#### Found Patterns:

**Pattern 1: Offset-based (Most common)**
```typescript
const { page, limit } = sanitizePagination(req.query.page, req.query.limit);
// Default: page=1, limit=50, max=100
```

**Pattern 2: Simple limit/offset**
```typescript
const limit = parseInt(req.query.limit) || 50;
const offset = parseInt(req.query.offset) || 0;
```

**Pattern 3: No pagination**
```typescript
// Many endpoints return all records with no pagination
const properties = await storage.getProperties(tenantId);
res.json(properties);  // ❌ Could be thousands of records
```

### ❌ **Major Issues:**

#### 5.1 Inconsistent Parameters
```
⚠️  Some routes: page + limit
⚠️  Some routes: offset + limit
⚠️  Some routes: no pagination
⚠️  No cursor-based pagination
```

#### 5.2 Missing Pagination Metadata
```typescript
// Current (incomplete):
res.json({ files, count: files.length });

// Should include:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 523,
    "totalPages": 11,
    "hasNext": true,
    "hasPrev": false
  }
}
```

#### 5.3 No Default Limits on Large Collections
```typescript
// Properties, leads, etc. could return thousands
app.get('/api/properties', async (req, res) => {
  const properties = await storage.getProperties(tenantId);
  res.json(properties);  // ❌ No limit
});
```

### ✅ **Recommended Standardization:**

```typescript
// Standard pagination helper
interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
    cursor?: string;
  };
}

// Apply to ALL list endpoints with default limit=50, max=100
```

---

## 6. FILTERING & SORTING

### Current State (Score: 55/100)

#### ✅ **Found Implementations:**

**WhatsApp Conversations:**
```typescript
GET /api/whatsapp/conversations?status=open&assignedTo=user123&limit=20
```

**Properties (public):**
```typescript
GET /api/properties/public/:tenantId
// Filters embedded in route logic (not query params)
```

**Files:**
```typescript
GET /api/files/list?bucket=documents&category=property-image&limit=50
```

### ❌ **Missing Features:**

#### 6.1 No Standard Query Syntax
```
❌ No support for: ?filter[status]=active
❌ No support for: ?price[gte]=100000&price[lte]=500000
❌ No support for: ?sort=price:desc,createdAt:asc
❌ No support for: ?search=apartment
```

#### 6.2 No Full-Text Search Endpoint
```typescript
// Exists but limited:
app.get('/api/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  // Simple search, not comprehensive
});
```

### ✅ **Recommended Implementation:**

```typescript
// Standard filtering syntax
GET /api/properties?filter[type]=apartment&filter[status]=available
GET /api/properties?price[gte]=100000&price[lte]=500000
GET /api/properties?sort=-price,createdAt  // - prefix for DESC
GET /api/properties?search=beachfront+apartment
GET /api/properties?fields=id,address,price  // Field selection
```

---

## 7. AUTHENTICATION & AUTHORIZATION

### Current Implementation (Score: 75/100)

#### ✅ **Good Practices:**

**Session-based Authentication:**
```typescript
// express-session with PostgreSQL store in production
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax'
  }
}));
```

**Passport.js Integration:**
```typescript
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  // Bcrypt password verification
}));
```

**requireAuth Middleware:**
```typescript
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
```

**Tenant Isolation:**
```typescript
// Multi-tenancy properly implemented
const tenantId = req.user.tenantId;
const properties = await storage.getProperties(tenantId);
```

### ❌ **Issues:**

#### 7.1 No JWT Token Support
```
❌ Only session-based auth
❌ No stateless token authentication
❌ Harder to scale horizontally
❌ Not suitable for mobile apps
```

#### 7.2 Missing Role-Based Access Control (RBAC)
```typescript
// TODO comments found:
// TODO: Check if user has admin role
// TODO: Implement role permissions

// No systematic RBAC:
app.post('/api/files/cleanup/orphaned', requireAuth, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  // ⚠️  Manual role checking, not middleware
});
```

#### 7.3 No Token Refresh Mechanism
```typescript
// POST /api/auth/refresh exists but only refreshes session
app.post('/api/auth/refresh', requireAuth, async (req, res) => {
  req.session.touch();  // Just updates session, no real token refresh
  res.json({ message: 'Session refreshed' });
});
```

#### 7.4 No API Key Authentication
```
❌ No API keys for third-party integrations
❌ No OAuth2 support
❌ No service-to-service authentication
```

### ✅ **Recommendations:**

```typescript
// 1. Add JWT support for API clients
POST /api/auth/token
{
  "email": "user@example.com",
  "password": "secret",
  "grant_type": "password"
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "dGVzdC...",
  "token_type": "Bearer",
  "expires_in": 3600
}

// 2. Implement RBAC middleware
const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

app.delete('/api/properties/:id',
  requireAuth,
  requireRole(['admin', 'broker']),
  async (req, res) => { ... }
);

// 3. Add API key authentication
app.get('/api/public/properties',
  authenticateApiKey,
  async (req, res) => { ... }
);
```

---

## 8. ERROR HANDLING

### Current Implementation (Score: 85/100) ⭐ **EXCELLENT**

#### ✅ **Strengths:**

**1. Comprehensive Error Classes:**
```typescript
class AppError extends Error { ... }
class ValidationError extends AppError { ... }
class AuthError extends AppError { ... }
class ForbiddenError extends AppError { ... }
class NotFoundError extends AppError { ... }
class ConflictError extends AppError { ... }
class RateLimitError extends AppError { ... }
class ServiceUnavailableError extends AppError { ... }
```

**2. Standardized Error Response:**
```typescript
{
  "error": "Validation failed",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```

**3. Sentry Integration:**
```typescript
Sentry.captureException(err, {
  tags: { route: req.path, method: req.method },
  extra: { body: req.body, query: req.query }
});
```

**4. AsyncHandler Wrapper:**
```typescript
// Eliminates try-catch boilerplate
app.get('/api/resource', asyncHandler(async (req, res) => {
  const data = await fetchData();
  res.json(data);
}));
```

### ⚠️ **Minor Issues:**

#### 8.1 Inconsistent Error Response Format in Some Routes
```typescript
// Some routes still use old format:
catch (error: any) {
  res.status(500).json({ error: error.message });  // ❌ Not using middleware
}

// Should let error propagate to middleware:
catch (error) {
  next(error);  // ✅ Proper error handling
}
```

#### 8.2 Missing Request ID for Error Tracking
```typescript
// Should include:
{
  "error": "Internal server error",
  "statusCode": 500,
  "requestId": "req_abc123xyz",  // ❌ Missing
  "timestamp": "2025-12-25T10:30:00Z"
}
```

---

## 9. RATE LIMITING

### Current Implementation (Score: 70/100)

#### ✅ **Good Implementation:**

```typescript
// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,     // 15 minutes
  max: 500,                      // 500 requests per IP
  message: { error: "Muitas requisições..." },
  standardHeaders: true,         // ✅ RateLimit-* headers
  legacyHeaders: false,
});

// Auth rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,                       // 20 login attempts
  message: { error: "Muitas tentativas de login..." }
});

// Public routes (very strict)
const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,      // 1 hour
  max: 30,                       // 30 submissions
});
```

### ❌ **Issues:**

#### 9.1 IP-based Only (No User-based Limits)
```
❌ Only tracks by IP address
❌ No per-user rate limits
❌ No per-tenant rate limits
❌ Shared IPs (NAT) can be problematic
```

#### 9.2 No Endpoint-Specific Limits
```typescript
// Should have different limits per operation:
POST /api/files/upload          → 10/minute
GET  /api/properties            → 100/minute
POST /api/whatsapp/send         → 50/hour
POST /api/email/send-bulk       → 5/hour
```

#### 9.3 No Rate Limit Headers Customization
```
✅ Standard headers enabled
❌ No X-RateLimit-Remaining custom logic
❌ No Retry-After header on 429
```

### ✅ **Recommendations:**

```typescript
// 1. User-based rate limiting
const userRateLimit = rateLimit({
  keyGenerator: (req) => req.user?.id || req.ip,
  // ...
});

// 2. Endpoint-specific limits
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,  // Only count failures
});

app.post('/api/files/upload', uploadLimiter, ...);

// 3. Tenant-based limits
const getTenantLimiter = (maxRequests: number) => {
  return rateLimit({
    keyGenerator: (req) => req.user?.tenantId,
    max: maxRequests,
  });
};
```

---

## 10. CACHING

### Current Implementation (Score: 55/100)

#### ✅ **Found Implementations:**

**1. Maps Cache (In-Memory):**
```typescript
// server/integrations/maps/cache.ts
class MapsCache {
  private cache: Map<string, CachedData>;

  get(key: string): any | null { ... }
  set(key: string, data: any, ttlMs?: number): void { ... }
  clear(): void { ... }
  getStats(): CacheStats { ... }
}
```

**2. Storage Cache (File system):**
```typescript
// Cache-Control headers for files
'Cache-Control': 'public, max-age=31536000, immutable', // Images
'Cache-Control': 'private, max-age=3600',                // Documents
'Cache-Control': 'public, max-age=86400',                // Public files
'Cache-Control': 'private, no-cache, no-store',          // Sensitive
```

**3. Redis Client (Available but not integrated):**
```typescript
// server/cache/redis-client.ts exists
export async function initializeRedis() { ... }
export async function getRedisClient() { ... }
// ⚠️  But not used for API response caching
```

### ❌ **Missing:**

#### 10.1 No ETag Support
```typescript
// Should implement:
app.get('/api/properties/:id', async (req, res) => {
  const property = await storage.getProperty(id);
  const etag = generateETag(property);

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).send();  // Not Modified
  }

  res.set('ETag', etag);
  res.json(property);
});
```

#### 10.2 No Conditional Requests
```
❌ No If-None-Match support
❌ No If-Modified-Since support
❌ No Last-Modified headers
```

#### 10.3 No Response Caching Middleware
```typescript
// Should implement:
const cacheMiddleware = (ttl: number) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    const cached = await redis.get(key);

    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const originalJson = res.json;
    res.json = function(data) {
      redis.setex(key, ttl, JSON.stringify(data));
      return originalJson.call(this, data);
    };

    next();
  };
};

app.get('/api/properties', cacheMiddleware(300), async (req, res) => {
  // Response cached for 5 minutes
});
```

---

## 11. VERSIONING

### Current Implementation (Score: 0/100) 🔴 **CRITICAL**

#### ❌ **No Versioning Strategy:**

```
❌ No URL versioning (/v1/, /v2/)
❌ No header versioning (Accept: application/vnd.api+json;version=1)
❌ No query parameter versioning (?version=1)
❌ No deprecation policy
❌ No backward compatibility strategy
```

#### **Impact:**

```
🔴 Breaking changes affect all clients immediately
🔴 Cannot maintain multiple API versions
🔴 No gradual migration path
🔴 High risk for production systems
```

### ✅ **Recommended Strategy:**

**Option 1: URL Versioning (Recommended)**
```typescript
// Current
POST /api/properties

// Versioned
POST /api/v1/properties
POST /api/v2/properties  // New version with breaking changes

// Route registration
app.use('/api/v1', routesV1);
app.use('/api/v2', routesV2);
```

**Option 2: Header Versioning**
```typescript
// Client sends:
Accept: application/vnd.imobibase.v1+json

// Server routing:
app.use((req, res, next) => {
  const version = parseAcceptHeader(req.headers.accept);
  if (version === 'v1') {
    return routesV1(req, res, next);
  }
  if (version === 'v2') {
    return routesV2(req, res, next);
  }
  next();
});
```

**Deprecation Policy:**
```
1. Announce deprecation 6 months in advance
2. Add Deprecation header to responses
3. Support old version for minimum 12 months
4. Provide migration guide
5. Sunset: Remove old version after notice period
```

---

## 12. DOCUMENTATION

### Current State (Score: 15/100) 🔴 **CRITICAL**

#### ❌ **Missing:**

```
❌ No OpenAPI/Swagger specification
❌ No API reference documentation
❌ No Postman collection
❌ No interactive API explorer
❌ No code examples
❌ No authentication flow documentation
❌ No error code reference
❌ No changelog
```

#### ✅ **Found (Minimal):**

```
✅ Inline code comments in route files
✅ JSDoc comments on some functions
✅ README.md files in some integration folders
```

### ✅ **Recommended Implementation:**

**1. OpenAPI 3.0 Specification:**

```yaml
# openapi.yaml
openapi: 3.0.3
info:
  title: ImobiBase API
  version: 1.0.0
  description: Complete real estate management platform API
  contact:
    email: api@imobibase.com

servers:
  - url: https://api.imobibase.com/v1
    description: Production server
  - url: https://staging-api.imobibase.com/v1
    description: Staging server

paths:
  /properties:
    get:
      summary: List all properties
      tags: [Properties]
      security:
        - sessionAuth: []
      parameters:
        - in: query
          name: page
          schema:
            type: integer
            default: 1
        - in: query
          name: limit
          schema:
            type: integer
            default: 50
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Property'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        '401':
          $ref: '#/components/responses/Unauthorized'

components:
  schemas:
    Property:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        price:
          type: number
        type:
          type: string
          enum: [sale, rent]

    Pagination:
      type: object
      properties:
        page:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        hasNext:
          type: boolean

  securitySchemes:
    sessionAuth:
      type: apiKey
      in: cookie
      name: connect.sid
```

**2. Auto-generate Documentation:**

```typescript
// server/index.ts
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

const swaggerDocument = YAML.load('./openapi.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ImobiBase API Documentation'
}));
```

**3. Postman Collection:**

```json
{
  "info": {
    "name": "ImobiBase API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Authentication",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "url": "{{baseUrl}}/api/auth/login",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"user@example.com\",\n  \"password\": \"password\"\n}"
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000"
    }
  ]
}
```

---

## 13. WEBHOOKS

### Current Implementation (Score: 65/100)

#### ✅ **Good Implementation:**

**1. Multiple Webhook Handlers:**
```typescript
// Stripe
POST /api/webhooks/stripe

// Mercado Pago
POST /api/webhooks/mercadopago
GET  /api/webhooks/mercadopago/ipn

// WhatsApp
POST /api/webhooks/whatsapp
GET  /api/webhooks/whatsapp/verify

// ClickSign (E-signature)
POST /api/webhooks/clicksign
```

**2. Webhook Verification:**
```typescript
// WhatsApp webhook verification
app.get('/api/webhooks/whatsapp/verify', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === verifyToken) {
    res.send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});
```

**3. Signature Verification:**
```typescript
// Stripe signature verification
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  req.rawBody,
  signature,
  webhookSecret
);
```

### ❌ **Missing Features:**

#### 13.1 No Webhook Management Endpoints
```
❌ No POST /api/webhooks (register webhook)
❌ No GET /api/webhooks (list webhooks)
❌ No DELETE /api/webhooks/:id (delete webhook)
❌ No PATCH /api/webhooks/:id (update webhook)
```

#### 13.2 No Webhook Delivery Retry Logic
```typescript
// Should implement:
async function deliverWebhook(url: string, payload: any, attempt = 1) {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (attempt < 3) {
      await delay(Math.pow(2, attempt) * 1000);  // Exponential backoff
      return deliverWebhook(url, payload, attempt + 1);
    }
    // Log failed delivery
  }
}
```

#### 13.3 No Webhook Event Log
```
❌ No webhook delivery history
❌ No webhook failure tracking
❌ No webhook replay functionality
```

---

## 14. BATCH OPERATIONS

### Current Implementation (Score: 45/100)

#### ✅ **Found:**

**1. Bulk Delete (Files):**
```typescript
POST /api/files/bulk-delete
{
  "fileIds": ["id1", "id2", "id3"]
}
```

**2. Bulk Email:**
```typescript
POST /api/email/send-bulk
{
  "emails": [
    { "to": "user1@example.com", "subject": "...", "html": "..." },
    { "to": "user2@example.com", "subject": "...", "html": "..." }
  ]
}
```

**3. Batch Geocoding:**
```typescript
POST /api/maps/properties/batch-geocode
{
  "tenantId": "tenant123"
}
// Geocodes all properties without coordinates
```

### ❌ **Missing:**

#### 14.1 No Batch Create/Update
```typescript
// Should implement:
POST /api/properties/batch
{
  "operations": [
    { "op": "create", "data": { ... } },
    { "op": "update", "id": "123", "data": { ... } },
    { "op": "delete", "id": "456" }
  ]
}

Response:
{
  "results": [
    { "op": "create", "success": true, "id": "789" },
    { "op": "update", "success": true, "id": "123" },
    { "op": "delete", "success": false, "error": "Not found" }
  ],
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1
  }
}
```

#### 14.2 No Transactional Batch Operations
```
❌ No all-or-nothing batch operations
❌ No partial success handling standardization
❌ No batch operation status tracking
```

---

## 15. API PERFORMANCE ANALYSIS

### Performance Metrics (Estimated):

```
Response Time P50: ~100ms (simple queries)
Response Time P95: ~500ms (complex joins)
Response Time P99: ~2000ms (reports/analytics)

Slow Endpoints Identified:
🔴 GET /api/reports/payments-detailed        (~3000ms)
🔴 GET /api/reports/financial-summary        (~2500ms)
🟡 GET /api/properties (no pagination)       (~800ms with 1000+ properties)
🟡 GET /api/leads/:id/matched-properties     (~600ms - complex matching)
```

### ❌ **Performance Issues:**

#### 15.1 N+1 Query Problems
```typescript
// Likely N+1 in many places (example):
app.get('/api/properties', async (req, res) => {
  const properties = await storage.getProperties(tenantId);

  // ❌ N+1: Loop fetches images for each property
  for (const property of properties) {
    property.images = await storage.getPropertyImages(property.id);
  }

  res.json(properties);
});

// Should use eager loading:
const properties = await storage.getPropertiesWithImages(tenantId);
```

#### 15.2 Missing Database Indexes
```sql
-- Likely missing indexes on:
❌ properties.tenantId + properties.status
❌ leads.tenantId + leads.status
❌ rental_payments.contractId + rental_payments.dueDate
❌ interactions.leadId + interactions.createdAt
```

#### 15.3 No Response Compression
```typescript
// Should enable:
import compression from 'compression';
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6
}));
```

#### 15.4 No Field Selection
```
❌ Always returns full objects
❌ No ?fields=id,name,price support
❌ Wastes bandwidth
```

### ✅ **Recommendations:**

```typescript
// 1. Add field selection
app.get('/api/properties', async (req, res) => {
  const { fields } = req.query;
  const selectedFields = fields ? fields.split(',') : undefined;

  const properties = await storage.getProperties(tenantId, {
    select: selectedFields
  });

  res.json(properties);
});

// 2. Implement eager loading
const properties = await db.query.properties.findMany({
  where: eq(properties.tenantId, tenantId),
  with: {
    images: true,
    owner: true,
    location: true
  }
});

// 3. Add response compression
app.use(compression());

// 4. Implement query result caching
const cacheKey = `properties:${tenantId}:${page}:${limit}`;
let properties = await cache.get(cacheKey);

if (!properties) {
  properties = await storage.getProperties(tenantId, page, limit);
  await cache.set(cacheKey, properties, 300);  // 5 minutes
}
```

---

## 16. API SECURITY

### Current Implementation (Score: 78/100)

#### ✅ **Strengths:**

**1. Helmet Security Headers:**
```typescript
app.use(helmet({
  contentSecurityPolicy: { ... },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

**2. Rate Limiting:**
```typescript
✅ General API: 500 req/15min
✅ Auth: 20 req/15min
✅ Public: 30 req/hour
```

**3. SQL Injection Prevention:**
```typescript
✅ Using Drizzle ORM (parameterized queries)
✅ No raw SQL string concatenation found
```

**4. Password Security:**
```typescript
✅ Bcrypt hashing (10 rounds)
✅ No password in responses
✅ Secure password comparison
```

**5. Session Security:**
```typescript
✅ httpOnly cookies
✅ secure flag in production
✅ sameSite: 'lax'
✅ Session rotation on login
```

### ❌ **Issues:**

#### 16.1 Missing Input Sanitization
```typescript
// No HTML/XSS sanitization before storage
app.post('/api/properties', async (req, res) => {
  const { description } = req.body;
  // ❌ Should sanitize HTML before storing
  await storage.createProperty({ description });
});

// Should use:
import DOMPurify from 'isomorphic-dompurify';
const sanitized = DOMPurify.sanitize(description);
```

#### 16.2 No CSRF Protection
```
❌ No CSRF tokens
❌ Relies only on sameSite cookie
❌ Vulnerable to CSRF in older browsers
```

#### 16.3 Missing Security Headers
```
✅ HSTS: Implemented
✅ X-Content-Type-Options: Implemented
❌ X-Frame-Options: Missing (should be DENY)
❌ X-XSS-Protection: Missing
❌ Permissions-Policy: Missing
```

#### 16.4 No Request Size Limits
```typescript
// Should add:
app.use(express.json({
  limit: '1mb',  // Prevent huge payloads
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
```

#### 16.5 Webhook Security Issues
```typescript
// Some webhooks missing signature verification
app.post('/api/webhooks/clicksign', async (req, res) => {
  // ❌ No signature verification
  await webhookHandler.handleWebhook(req, res);
});
```

### ✅ **Recommendations:**

```typescript
// 1. Add CSRF protection
import csrf from 'csurf';
const csrfProtection = csrf({ cookie: true });

app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/api/properties', csrfProtection, ...);

// 2. Add input sanitization
import { sanitizeHtml, sanitizeInput } from './security/sanitize';

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  next();
};

app.use(sanitizeMiddleware);

// 3. Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=()');
  next();
});

// 4. Add request size limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: false }));

// 5. Verify all webhook signatures
const verifyWebhookSignature = (req, res, next) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};
```

---

## 17. COMPARISON WITH INDUSTRY LEADERS

### Stripe API (Score: 95/100)
```
✅ Excellent versioning (2023-10-16)
✅ Comprehensive documentation
✅ Idempotency keys
✅ Extensive error codes
✅ Webhook retry logic
✅ API changelog
✅ Client libraries for all languages
```

**ImobiBase vs Stripe:**
```
Versioning:      0/100 vs 100/100  (❌ Missing entirely)
Documentation:   15/100 vs 95/100  (🔴 Critical gap)
Error Handling:  85/100 vs 90/100  (✅ Close)
Webhooks:        65/100 vs 95/100  (⚠️  Basic implementation)
Rate Limiting:   70/100 vs 90/100  (⚠️  Good but not great)
```

### GitHub API (Score: 92/100)
```
✅ RESTful design
✅ Comprehensive pagination
✅ Rate limit headers
✅ GraphQL option
✅ Conditional requests (ETags)
✅ HATEOAS links
```

**ImobiBase vs GitHub:**
```
REST Compliance: 68/100 vs 95/100  (⚠️  Good foundation)
Pagination:      60/100 vs 95/100  (🔴 Needs standardization)
Caching:         55/100 vs 95/100  (🔴 Missing ETags)
Filtering:       55/100 vs 90/100  (🔴 No standard syntax)
HATEOAS:         0/100 vs 80/100   (❌ No hypermedia)
```

### Twilio API (Score: 93/100)
```
✅ Clear resource naming
✅ Consistent pagination
✅ Detailed error messages
✅ Webhook event types
✅ Test credentials
✅ API explorer
```

**ImobiBase vs Twilio:**
```
Resource Design: 75/100 vs 90/100  (✅ Good)
Error Messages:  85/100 vs 95/100  (✅ Excellent)
Webhooks:        65/100 vs 93/100  (⚠️  Basic)
Testing Tools:   20/100 vs 90/100  (🔴 No sandbox)
Documentation:   15/100 vs 92/100  (🔴 Critical)
```

---

## 18. IDENTIFIED ISSUES (38 Problems)

### 🔴 **CRITICAL (12 issues):**

1. **No API versioning strategy** - Breaking changes affect all clients
2. **No OpenAPI/Swagger documentation** - Difficult for developers
3. **No standardized pagination** - Inconsistent across endpoints
4. **Missing pagination metadata** - Clients can't navigate properly
5. **No default limits on lists** - Can return thousands of records
6. **Inconsistent error responses** - Multiple formats found
7. **No CSRF protection** - Vulnerable to cross-site attacks
8. **No input sanitization** - XSS vulnerability
9. **Missing 201 Created status** - Not RESTful
10. **No 204 No Content for DELETE** - Incorrect status codes
11. **No response envelope standard** - Inconsistent data structures
12. **No API changelog** - Developers can't track changes

### 🟡 **HIGH (14 issues):**

13. **Inconsistent naming (kebab vs camel)** - /rental-contracts vs /rentalContracts
14. **Action verbs in URLs** - /subscribe, /send, /cancel in paths
15. **No cursor-based pagination** - Can't handle large datasets efficiently
16. **No ETag support** - Missing conditional requests
17. **No Last-Modified headers** - Can't implement proper caching
18. **No field selection** - Always returns full objects
19. **N+1 query problems** - Performance issues in loops
20. **Missing database indexes** - Slow queries on large datasets
21. **No response compression** - Wastes bandwidth
22. **No JWT token support** - Only session-based auth
23. **No RBAC middleware** - Manual role checking
24. **No API key authentication** - Can't support third-party integrations
25. **No full-text search** - Limited search capabilities
26. **No standard filtering syntax** - Each endpoint different

### 🟢 **MEDIUM (12 issues):**

27. **No webhook management API** - Can't register/manage webhooks
28. **No webhook retry logic** - Failed deliveries not retried
29. **No batch create/update** - Must make multiple requests
30. **No transactional batch ops** - No atomicity
31. **Missing security headers** - X-Frame-Options, etc.
32. **No request size limits** - Vulnerable to large payloads
33. **No rate limit per user** - Only IP-based
34. **No endpoint-specific limits** - Same limit for all routes
35. **No HATEOAS links** - Not discoverable
36. **Missing request ID** - Hard to track errors
37. **No Postman collection** - Manual testing required
38. **No code examples** - Learning curve steep

---

## 19. OPENAPI SPECIFICATION (Partial)

### Starter Template:

```yaml
openapi: 3.0.3

info:
  title: ImobiBase API
  version: 1.0.0
  description: |
    Complete Real Estate Management Platform API

    ## Authentication
    ImobiBase API uses session-based authentication. Login via `/api/auth/login`
    to receive a session cookie.

    ## Rate Limiting
    - General API: 500 requests per 15 minutes
    - Authentication: 20 requests per 15 minutes
    - Public endpoints: 30 requests per hour

    ## Pagination
    All list endpoints support pagination with `page` and `limit` parameters.
    Default limit is 50, maximum is 100.

  contact:
    name: ImobiBase API Support
    email: api-support@imobibase.com
    url: https://docs.imobibase.com

  license:
    name: Proprietary

servers:
  - url: https://api.imobibase.com/v1
    description: Production server
  - url: https://staging-api.imobibase.com/v1
    description: Staging server
  - url: http://localhost:5000/api
    description: Development server

tags:
  - name: Authentication
    description: User authentication and session management
  - name: Properties
    description: Property listings and management
  - name: Leads
    description: Lead generation and management
  - name: Rentals
    description: Rental contracts and payments
  - name: Financial
    description: Financial transactions and reporting
  - name: Files
    description: File upload and management
  - name: Communications
    description: WhatsApp, Email, SMS integrations
  - name: Maps
    description: Geocoding and location services
  - name: E-Signature
    description: Electronic signature workflows

paths:
  /auth/login:
    post:
      tags: [Authentication]
      summary: User login
      description: Authenticate user and create session
      operationId: login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - email
                - password
              properties:
                email:
                  type: string
                  format: email
                  example: user@example.com
                password:
                  type: string
                  format: password
                  example: SecurePassword123
      responses:
        '200':
          description: Login successful
          headers:
            Set-Cookie:
              schema:
                type: string
                example: connect.sid=s%3A...; Path=/; HttpOnly
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    $ref: '#/components/schemas/User'
                  message:
                    type: string
                    example: Login successful
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimitExceeded'

  /properties:
    get:
      tags: [Properties]
      summary: List properties
      description: Get paginated list of properties for authenticated tenant
      operationId: listProperties
      security:
        - sessionAuth: []
      parameters:
        - $ref: '#/components/parameters/Page'
        - $ref: '#/components/parameters/Limit'
        - in: query
          name: status
          schema:
            type: string
            enum: [available, rented, sold, unavailable]
          description: Filter by property status
        - in: query
          name: type
          schema:
            type: string
            enum: [apartment, house, commercial, land]
          description: Filter by property type
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Property'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      tags: [Properties]
      summary: Create property
      description: Create a new property listing
      operationId: createProperty
      security:
        - sessionAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreatePropertyRequest'
      responses:
        '201':
          description: Property created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Property'
        '400':
          $ref: '#/components/responses/ValidationError'
        '401':
          $ref: '#/components/responses/Unauthorized'

  /properties/{id}:
    get:
      tags: [Properties]
      summary: Get property details
      operationId: getProperty
      security:
        - sessionAuth: []
      parameters:
        - $ref: '#/components/parameters/PropertyId'
      responses:
        '200':
          description: Property details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Property'
        '404':
          $ref: '#/components/responses/NotFound'

    patch:
      tags: [Properties]
      summary: Update property
      operationId: updateProperty
      security:
        - sessionAuth: []
      parameters:
        - $ref: '#/components/parameters/PropertyId'
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdatePropertyRequest'
      responses:
        '200':
          description: Property updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Property'
        '404':
          $ref: '#/components/responses/NotFound'

    delete:
      tags: [Properties]
      summary: Delete property
      operationId: deleteProperty
      security:
        - sessionAuth: []
      parameters:
        - $ref: '#/components/parameters/PropertyId'
      responses:
        '204':
          description: Property deleted successfully
        '404':
          $ref: '#/components/responses/NotFound'

components:
  securitySchemes:
    sessionAuth:
      type: apiKey
      in: cookie
      name: connect.sid
      description: Session-based authentication cookie

  parameters:
    Page:
      name: page
      in: query
      description: Page number (1-indexed)
      schema:
        type: integer
        minimum: 1
        default: 1

    Limit:
      name: limit
      in: query
      description: Items per page
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 50

    PropertyId:
      name: id
      in: path
      required: true
      description: Property ID
      schema:
        type: string
        format: uuid

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        tenantId:
          type: string
          format: uuid
        name:
          type: string
        email:
          type: string
          format: email
        role:
          type: string
          enum: [admin, broker, viewer]
        avatar:
          type: string
          format: uri
          nullable: true

    Property:
      type: object
      properties:
        id:
          type: string
          format: uuid
        tenantId:
          type: string
          format: uuid
        title:
          type: string
        description:
          type: string
        type:
          type: string
          enum: [apartment, house, commercial, land]
        purpose:
          type: string
          enum: [sale, rent, both]
        status:
          type: string
          enum: [available, rented, sold, unavailable]
        price:
          type: number
          format: double
        area:
          type: number
          format: double
        bedrooms:
          type: integer
          nullable: true
        bathrooms:
          type: integer
          nullable: true
        address:
          type: string
        city:
          type: string
        state:
          type: string
        zipCode:
          type: string
        latitude:
          type: number
          format: double
          nullable: true
        longitude:
          type: number
          format: double
          nullable: true
        images:
          type: array
          items:
            type: string
            format: uri
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    CreatePropertyRequest:
      type: object
      required:
        - title
        - type
        - purpose
        - price
      properties:
        title:
          type: string
          minLength: 3
          maxLength: 200
        description:
          type: string
          maxLength: 5000
        type:
          type: string
          enum: [apartment, house, commercial, land]
        purpose:
          type: string
          enum: [sale, rent, both]
        price:
          type: number
          format: double
          minimum: 0
        area:
          type: number
          format: double
          minimum: 0
        bedrooms:
          type: integer
          minimum: 0
        bathrooms:
          type: integer
          minimum: 0
        address:
          type: string
        city:
          type: string
        state:
          type: string
        zipCode:
          type: string

    UpdatePropertyRequest:
      type: object
      properties:
        title:
          type: string
        description:
          type: string
        status:
          type: string
          enum: [available, rented, sold, unavailable]
        price:
          type: number

    Pagination:
      type: object
      properties:
        page:
          type: integer
          example: 1
        limit:
          type: integer
          example: 50
        total:
          type: integer
          example: 523
        totalPages:
          type: integer
          example: 11
        hasNext:
          type: boolean
          example: true
        hasPrev:
          type: boolean
          example: false

    Error:
      type: object
      properties:
        error:
          type: string
          example: Validation failed
        statusCode:
          type: integer
          example: 400
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
              code:
                type: string

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: Authentication required
            statusCode: 401

    NotFound:
      description: Resource not found
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: Property not found
            statusCode: 404

    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: Validation failed
            statusCode: 400
            errors:
              - field: price
                message: Price must be a positive number
                code: too_small

    RateLimitExceeded:
      description: Rate limit exceeded
      headers:
        RateLimit-Limit:
          schema:
            type: integer
          description: Request limit per window
        RateLimit-Remaining:
          schema:
            type: integer
          description: Remaining requests
        RateLimit-Reset:
          schema:
            type: integer
          description: Time when limit resets (Unix timestamp)
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            error: Too many requests. Please try again later.
            statusCode: 429
```

---

## 20. VERSIONING STRATEGY RECOMMENDATION

### Recommended Approach: **URL Versioning**

**Rationale:**
```
✅ Most visible and explicit
✅ Easy to implement and route
✅ Clear in logs and analytics
✅ Simple for clients to understand
✅ Used by Stripe, Twilio, GitHub
```

### Implementation Plan:

**Phase 1: Add v1 namespace (Weeks 1-2)**
```typescript
// Create v1 routes directory
/server/routes/v1/
  ├── properties.ts
  ├── leads.ts
  ├── rentals.ts
  └── ...

// Mount v1 routes
app.use('/api/v1', v1Router);

// Maintain backward compatibility
app.use('/api', v1Router);  // Redirect to v1
```

**Phase 2: Version individual route files (Weeks 3-4)**
```typescript
// server/routes/v1/properties.ts
import { Router } from 'express';
const router = Router();

router.get('/properties', listProperties);
router.post('/properties', createProperty);
// ...

export default router;
```

**Phase 3: Add deprecation warnings (Week 5)**
```typescript
// Middleware to warn about unversioned usage
app.use('/api', (req, res, next) => {
  if (!req.path.startsWith('/v1')) {
    res.setHeader('X-API-Warn', 'Unversioned endpoint. Use /api/v1 instead.');
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', 'Sat, 1 Jun 2026 00:00:00 GMT');
  }
  next();
});
```

**Phase 4: Documentation update (Week 6)**
```markdown
# Migration Guide: API v1

All API endpoints now require version prefix:

Old: POST /api/properties
New: POST /api/v1/properties

Unversioned endpoints will be sunset on June 1, 2026.
```

---

## 21. PAGINATION STANDARDIZATION

### Recommended Standard:

```typescript
// server/lib/pagination.ts

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor?: string;
  prevCursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export function parsePaginationParams(query: any): PaginationParams {
  return {
    page: Math.max(1, parseInt(query.page) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit) || 50)),
    cursor: query.cursor,
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

export function buildPaginationMetadata(
  params: PaginationParams,
  total: number
): PaginationMetadata {
  const { page, limit } = params;
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// Apply to all list endpoints:
app.get('/api/v1/properties', async (req, res) => {
  const params = parsePaginationParams(req.query);

  const { data, total } = await storage.getPaginatedProperties(
    req.user.tenantId,
    params
  );

  const pagination = buildPaginationMetadata(params, total);

  res.json({ data, pagination });
});
```

---

## 22. ERROR HANDLING STANDARDIZATION

### Enhanced Error Response Format:

```typescript
// Standard error response
interface ApiErrorResponse {
  error: string;              // Human-readable message
  code: string;               // Machine-readable code
  statusCode: number;         // HTTP status
  requestId: string;          // For tracking
  timestamp: string;          // ISO 8601
  errors?: ValidationError[]; // Field-level errors (optional)
  help?: string;              // Documentation link (optional)
}

// Validation error detail
interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

// Example responses:

// 400 Validation Error
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "statusCode": 400,
  "requestId": "req_abc123xyz",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "errors": [
    {
      "field": "price",
      "message": "Price must be greater than 0",
      "code": "too_small",
      "value": -1000
    },
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ],
  "help": "https://docs.imobibase.com/errors/validation"
}

// 401 Unauthorized
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED",
  "statusCode": 401,
  "requestId": "req_def456uvw",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "help": "https://docs.imobibase.com/authentication"
}

// 404 Not Found
{
  "error": "Property not found",
  "code": "RESOURCE_NOT_FOUND",
  "statusCode": 404,
  "requestId": "req_ghi789rst",
  "timestamp": "2025-12-25T10:30:00.000Z"
}

// 429 Rate Limit
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "statusCode": 429,
  "requestId": "req_jkl012mno",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "help": "https://docs.imobibase.com/rate-limits"
}

// 500 Internal Error
{
  "error": "An unexpected error occurred",
  "code": "INTERNAL_SERVER_ERROR",
  "statusCode": 500,
  "requestId": "req_pqr345stu",
  "timestamp": "2025-12-25T10:30:00.000Z",
  "help": "https://status.imobibase.com"
}
```

### Implementation:

```typescript
// server/middleware/request-id.ts
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

// server/middleware/error-handler.ts (enhanced)
export function errorHandler(err, req, res, next) {
  const requestId = req.id || 'unknown';
  const timestamp = new Date().toISOString();

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let errors = undefined;
  let help = undefined;

  if (err instanceof ValidationError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
    errors = err.errors;
    help = 'https://docs.imobibase.com/errors/validation';
  } else if (err instanceof AuthError) {
    statusCode = 401;
    code = 'UNAUTHORIZED';
    message = err.message;
    help = 'https://docs.imobibase.com/authentication';
  } else if (err instanceof NotFoundError) {
    statusCode = 404;
    code = 'RESOURCE_NOT_FOUND';
    message = err.message;
  }

  // Log with request ID
  console.error(`[${requestId}] Error:`, {
    code,
    message,
    stack: err.stack,
    url: req.url,
  });

  // Send standardized error
  res.status(statusCode).json({
    error: message,
    code,
    statusCode,
    requestId,
    timestamp,
    errors,
    help,
  });
}

// Register middleware
app.use(requestIdMiddleware);
// ... routes ...
app.use(errorHandler);
```

---

## 23. RATE LIMITING CONFIGURATION

### Recommended Tiered Approach:

```typescript
// server/middleware/rate-limit.ts

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../cache/redis-client';

// Create Redis store for distributed rate limiting
const createRedisStore = async () => {
  const redis = await getRedisClient();
  return new RedisStore({
    client: redis,
    prefix: 'rl:',
  });
};

// Tier 1: Very restrictive (Auth, sensitive operations)
export const authRateLimiter = rateLimit({
  store: await createRedisStore(),
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP + email combination
    return `${req.ip}:${req.body?.email || 'unknown'}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      requestId: req.id,
      timestamp: new Date().toISOString(),
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Tier 2: Restrictive (Write operations)
export const writeRateLimiter = rateLimit({
  store: await createRedisStore(),
  windowMs: 60 * 1000,        // 1 minute
  max: 30,                     // 30 writes per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.method === 'GET',
});

// Tier 3: Moderate (Read operations)
export const readRateLimiter = rateLimit({
  store: await createRedisStore(),
  windowMs: 60 * 1000,        // 1 minute
  max: 100,                    // 100 reads per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.method !== 'GET',
});

// Tier 4: File uploads (very restrictive)
export const uploadRateLimiter = rateLimit({
  store: await createRedisStore(),
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 50,                     // 50 uploads per hour
  keyGenerator: (req) => req.user?.id,
  skipSuccessfulRequests: true,  // Only count failed uploads
});

// Tier 5: Expensive operations (reports, exports)
export const expensiveRateLimiter = rateLimit({
  store: await createRedisStore(),
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 10,                     // 10 requests per hour
  keyGenerator: (req) => req.user?.tenantId,
});

// Tier 6: Public endpoints (very strict)
export const publicRateLimiter = rateLimit({
  store: await createRedisStore(),
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 30,                     // 30 requests per hour
  keyGenerator: (req) => req.ip,
});

// Apply to routes:
app.post('/api/v1/auth/login', authRateLimiter, login);
app.post('/api/v1/properties', writeRateLimiter, createProperty);
app.get('/api/v1/properties', readRateLimiter, listProperties);
app.post('/api/v1/files/upload', uploadRateLimiter, uploadFile);
app.get('/api/v1/reports/financial', expensiveRateLimiter, getReport);
app.post('/api/v1/leads/public', publicRateLimiter, createPublicLead);
```

---

## 24. SECURITY HARDENING CHECKLIST

### Immediate Actions (Week 1):

- [ ] Enable CSRF protection for state-changing operations
- [ ] Add input sanitization middleware
- [ ] Add request size limits (1MB for JSON, 50MB for uploads)
- [ ] Add X-Frame-Options: DENY header
- [ ] Add X-Content-Type-Options: nosniff header
- [ ] Verify all webhook signatures
- [ ] Add request ID to all responses
- [ ] Implement request logging with sensitive data masking

### Short-term (Weeks 2-4):

- [ ] Add JWT token support for API clients
- [ ] Implement API key authentication
- [ ] Add OAuth2 support (Google, Microsoft)
- [ ] Implement RBAC middleware
- [ ] Add permission system
- [ ] Add security audit logging
- [ ] Implement account lockout after failed logins
- [ ] Add 2FA support for admin users

### Medium-term (Months 2-3):

- [ ] Add IP whitelisting for sensitive operations
- [ ] Implement geographic restrictions if needed
- [ ] Add anomaly detection for unusual patterns
- [ ] Implement WAF (Web Application Firewall)
- [ ] Add DDoS protection (Cloudflare)
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] Dependency vulnerability scanning (Snyk, Dependabot)

---

## 25. PERFORMANCE OPTIMIZATION ROADMAP

### Database Optimizations:

**Priority 1: Add Missing Indexes**
```sql
-- Properties
CREATE INDEX idx_properties_tenant_status
ON properties(tenant_id, status);

CREATE INDEX idx_properties_tenant_type
ON properties(tenant_id, type);

CREATE INDEX idx_properties_location
ON properties(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Leads
CREATE INDEX idx_leads_tenant_status
ON leads(tenant_id, status);

CREATE INDEX idx_leads_tenant_created
ON leads(tenant_id, created_at DESC);

-- Rental Payments
CREATE INDEX idx_rental_payments_contract_due
ON rental_payments(contract_id, due_date);

CREATE INDEX idx_rental_payments_tenant_status
ON rental_payments(tenant_id, status);

-- Interactions
CREATE INDEX idx_interactions_lead_created
ON interactions(lead_id, created_at DESC);
```

**Priority 2: Fix N+1 Queries**
```typescript
// Before (N+1):
const properties = await db.select().from(properties);
for (const property of properties) {
  property.images = await db.select()
    .from(propertyImages)
    .where(eq(propertyImages.propertyId, property.id));
}

// After (Eager Loading):
const properties = await db.query.properties.findMany({
  with: {
    images: true,
    owner: true,
    location: true,
  },
});
```

**Priority 3: Implement Query Result Caching**
```typescript
import { createCache } from './cache/redis-cache';

const cache = createCache('queries:', 300);  // 5 minutes TTL

app.get('/api/v1/properties', async (req, res) => {
  const params = parsePaginationParams(req.query);
  const cacheKey = `properties:${req.user.tenantId}:${JSON.stringify(params)}`;

  let result = await cache.get(cacheKey);

  if (!result) {
    result = await storage.getPaginatedProperties(req.user.tenantId, params);
    await cache.set(cacheKey, result);
  }

  res.json(result);
});
```

### API Optimizations:

**Priority 1: Add Response Compression**
```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,  // Balance between speed and compression
  threshold: 1024,  // Only compress responses > 1KB
}));
```

**Priority 2: Implement Field Selection**
```typescript
app.get('/api/v1/properties', async (req, res) => {
  const params = parsePaginationParams(req.query);
  const fields = req.query.fields?.split(',');

  const properties = await storage.getProperties(req.user.tenantId, {
    ...params,
    select: fields || ['*'],
  });

  res.json(properties);
});

// Usage:
GET /api/v1/properties?fields=id,title,price,address
```

**Priority 3: Add ETag Support**
```typescript
import etag from 'etag';

app.get('/api/v1/properties/:id', async (req, res) => {
  const property = await storage.getProperty(req.params.id);

  if (!property) {
    throw new NotFoundError('Property');
  }

  const etagValue = etag(JSON.stringify(property));

  // Check If-None-Match header
  if (req.headers['if-none-match'] === etagValue) {
    return res.status(304).send();
  }

  res.set('ETag', etagValue);
  res.set('Cache-Control', 'private, max-age=300');
  res.json(property);
});
```

---

## 26. API EVOLUTION ROADMAP

### Phase 1: Foundation (Months 1-2)
**Goal:** Establish solid API fundamentals

- Week 1-2: Add API versioning (v1)
- Week 3-4: Standardize pagination across all endpoints
- Week 5-6: Create OpenAPI specification
- Week 7-8: Implement consistent error handling

**Deliverables:**
- `/api/v1/*` endpoints operational
- OpenAPI 3.0 spec complete
- Pagination helper library
- Error handling documentation

### Phase 2: Documentation & DX (Month 3)
**Goal:** Improve developer experience

- Week 9-10: Set up Swagger UI
- Week 11: Create Postman collection
- Week 12: Write API guides and tutorials

**Deliverables:**
- Interactive API documentation at `/api-docs`
- Postman collection published
- Developer onboarding guide
- Code examples in docs

### Phase 3: Performance (Month 4)
**Goal:** Optimize API performance

- Week 13-14: Add database indexes
- Week 15: Fix N+1 queries
- Week 16: Implement caching strategy

**Deliverables:**
- 50% reduction in P95 latency
- Redis caching for frequent queries
- ETag support on GET endpoints
- Response compression enabled

### Phase 4: Security Hardening (Month 5)
**Goal:** Enhance API security

- Week 17-18: Add CSRF protection
- Week 19: Implement JWT tokens
- Week 20: Add RBAC system

**Deliverables:**
- CSRF tokens on state-changing operations
- JWT authentication for mobile/SPA clients
- Role-based permissions system
- Security audit completed

### Phase 5: Advanced Features (Month 6)
**Goal:** Add enterprise features

- Week 21-22: GraphQL endpoint (optional)
- Week 23: Webhook management API
- Week 24: API analytics dashboard

**Deliverables:**
- GraphQL endpoint at `/graphql` (if needed)
- Webhook CRUD operations
- API usage analytics
- Rate limit monitoring

---

## 27. RECOMMENDED TOOLS & LIBRARIES

### API Development:

```json
{
  "dependencies": {
    "@apidevtools/swagger-parser": "^10.1.0",
    "swagger-ui-express": "^5.0.0",
    "openapi-types": "^12.1.3",
    "express-rate-limit": "^7.1.5",
    "rate-limit-redis": "^4.2.0",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "etag": "^1.8.1",
    "jsonwebtoken": "^9.0.2",
    "csurf": "^1.11.0",
    "express-validator": "^7.0.1",
    "isomorphic-dompurify": "^2.0.0"
  },
  "devDependencies": {
    "@apidevtools/openapi-schemas": "^2.1.0",
    "postman-to-openapi": "^3.0.1",
    "swagger-jsdoc": "^6.2.8",
    "api-spec-converter": "^2.12.0"
  }
}
```

### Testing:

```json
{
  "devDependencies": {
    "supertest": "^6.3.3",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "nock": "^13.5.0",
    "faker": "^5.5.3",
    "artillery": "^2.0.0"
  }
}
```

### Monitoring:

```json
{
  "dependencies": {
    "@sentry/node": "^7.99.0",
    "prom-client": "^15.1.0",
    "express-prometheus-middleware": "^1.2.0",
    "winston": "^3.11.0",
    "morgan": "^1.10.0"
  }
}
```

---

## 28. FINAL RECOMMENDATIONS

### Top 10 Priorities (Ordered by Impact):

1. **🔴 CRITICAL: Add API Versioning**
   - Impact: HIGH | Effort: MEDIUM | Timeline: 2 weeks
   - Without this, every change risks breaking clients

2. **🔴 CRITICAL: Create OpenAPI Documentation**
   - Impact: HIGH | Effort: HIGH | Timeline: 4 weeks
   - Essential for developer adoption and integration

3. **🔴 CRITICAL: Standardize Pagination**
   - Impact: HIGH | Effort: LOW | Timeline: 1 week
   - Inconsistency causes confusion and bugs

4. **🟡 HIGH: Add Database Indexes**
   - Impact: HIGH | Effort: LOW | Timeline: 3 days
   - Immediate performance improvement

5. **🟡 HIGH: Implement ETag Caching**
   - Impact: MEDIUM | Effort: MEDIUM | Timeline: 1 week
   - Reduces bandwidth and improves performance

6. **🟡 HIGH: Add CSRF Protection**
   - Impact: HIGH | Effort: LOW | Timeline: 2 days
   - Critical security vulnerability

7. **🟡 HIGH: Fix N+1 Queries**
   - Impact: MEDIUM | Effort: MEDIUM | Timeline: 2 weeks
   - Significant performance gains

8. **🟢 MEDIUM: Add JWT Authentication**
   - Impact: MEDIUM | Effort: MEDIUM | Timeline: 1 week
   - Enables mobile apps and third-party integrations

9. **🟢 MEDIUM: Implement RBAC System**
   - Impact: MEDIUM | Effort: HIGH | Timeline: 3 weeks
   - Proper authorization foundation

10. **🟢 MEDIUM: Add Request Compression**
    - Impact: LOW | Effort: LOW | Timeline: 1 day
    - Easy win for bandwidth reduction

### Quick Wins (Can be done in < 1 week):

- ✅ Add 201 Created status to POST endpoints
- ✅ Add 204 No Content to DELETE endpoints
- ✅ Enable response compression
- ✅ Add request size limits
- ✅ Add security headers (X-Frame-Options, etc.)
- ✅ Add request IDs to all responses
- ✅ Create Postman collection
- ✅ Add CSRF protection
- ✅ Add database indexes

### Long-term Vision:

**By Q2 2026:**
- ✅ Full OpenAPI 3.0 specification
- ✅ Interactive API documentation
- ✅ GraphQL endpoint (if needed)
- ✅ Comprehensive test coverage (>80%)
- ✅ API analytics dashboard
- ✅ Multiple client SDKs (JS, Python, PHP)

**By Q4 2026:**
- ✅ API marketplace/ecosystem
- ✅ Webhook management UI
- ✅ Developer portal
- ✅ API certification program
- ✅ Public API (with API keys)

---

## 29. CONCLUSION

### Summary:

The ImobiBase API demonstrates **solid fundamentals** with excellent error handling, good security practices, and comprehensive functionality. However, it **lacks critical production-ready features** like versioning, documentation, and standardized pagination.

### Key Strengths:
- ✅ Comprehensive error handling with custom error classes
- ✅ Good security foundation (Helmet, rate limiting, bcrypt)
- ✅ Multi-tenant architecture properly implemented
- ✅ Extensive functionality across all domains
- ✅ Zod validation for type safety

### Critical Gaps:
- 🔴 No API versioning strategy
- 🔴 No OpenAPI/Swagger documentation
- 🔴 Inconsistent pagination
- 🔴 Missing caching headers (ETags)
- 🔴 No standardized filtering

### Overall Assessment:

**Current State:** Early-stage production API (70/100)
**Production-Ready Target:** 90/100
**Gap:** 20 points (addressable in 3-4 months)

With focused effort on the top 10 priorities listed above, ImobiBase can achieve a **world-class API** comparable to industry leaders like Stripe and Twilio within 6 months.

---

**Report Generated:** 2025-12-25
**Total Endpoints Analyzed:** 322+
**Files Reviewed:** 13 route files
**Lines of Code Analyzed:** ~8,000+
**Issues Identified:** 38
**Recommendations Provided:** 75+

**Next Steps:** Review this report with the development team and create a prioritized roadmap based on Section 28 (Final Recommendations).

---

*End of Report*
