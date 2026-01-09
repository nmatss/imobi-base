# API DESIGN - IMPLEMENTATION CHECKLIST

**AGENTE 16/20: API Design & REST Standards**
**Progressive Implementation Plan**

---

## WEEK 1: CRITICAL FOUNDATIONS

### Day 1: API Versioning & Status Codes

- [ ] **Task 1.1:** Create `/server/routes/v1/` directory structure
- [ ] **Task 1.2:** Move all route files to v1 namespace
- [ ] **Task 1.3:** Update route imports in `server/index.ts`
- [ ] **Task 1.4:** Mount v1 routes at `/api/v1`
- [ ] **Task 1.5:** Add backward compatibility middleware for `/api`
- [ ] **Task 1.6:** Add deprecation warning header for unversioned routes
- [ ] **Task 1.7:** Update all POST endpoints to return 201 Created
- [ ] **Task 1.8:** Update all DELETE endpoints to return 204 No Content
- [ ] **Task 1.9:** Add request ID middleware
- [ ] **Task 1.10:** Test all endpoints with new status codes

**Estimated Time:** 6-8 hours
**Files to Modify:** ~15 route files, server/index.ts
**Testing:** Run full integration test suite

---

### Day 2: Security Headers & CSRF Protection

- [ ] **Task 2.1:** Install dependencies: `npm install csurf cookie-parser`
- [ ] **Task 2.2:** Add cookie-parser middleware
- [ ] **Task 2.3:** Configure CSRF protection
- [ ] **Task 2.4:** Create `/api/v1/csrf-token` endpoint
- [ ] **Task 2.5:** Add CSRF middleware to all POST/PATCH/DELETE routes
- [ ] **Task 2.6:** Add X-Frame-Options header
- [ ] **Task 2.7:** Add X-Content-Type-Options header
- [ ] **Task 2.8:** Add X-XSS-Protection header
- [ ] **Task 2.9:** Add request size limits (1MB JSON, 50MB uploads)
- [ ] **Task 2.10:** Update frontend to include CSRF tokens

**Estimated Time:** 4-6 hours
**Files to Modify:** server/index.ts, middleware/, all POST/PATCH/DELETE routes
**Testing:** Test CSRF protection on all state-changing operations

---

### Day 3: Pagination Standardization

- [ ] **Task 3.1:** Create `server/lib/pagination.ts`
- [ ] **Task 3.2:** Define PaginationParams interface
- [ ] **Task 3.3:** Define PaginatedResponse interface
- [ ] **Task 3.4:** Create `parsePaginationParams()` helper
- [ ] **Task 3.5:** Create `buildPaginationMetadata()` helper
- [ ] **Task 3.6:** Update storage layer to support pagination
- [ ] **Task 3.7:** Update all list endpoints to use standard pagination
- [ ] **Task 3.8:** Add default limits to prevent unlimited results
- [ ] **Task 3.9:** Document pagination in comments
- [ ] **Task 3.10:** Test pagination on all list endpoints

**Routes to Update:**
```
✓ /api/v1/properties
✓ /api/v1/leads
✓ /api/v1/owners
✓ /api/v1/renters
✓ /api/v1/contracts
✓ /api/v1/rental-contracts
✓ /api/v1/rental-payments
✓ /api/v1/files/list
✓ /api/v1/whatsapp/conversations
✓ /api/v1/email/templates
```

**Estimated Time:** 6-8 hours
**Files to Modify:** ~30 route handlers, storage layer
**Testing:** Verify pagination metadata on all list endpoints

---

### Day 4-5: OpenAPI Documentation

- [ ] **Task 4.1:** Install dependencies: `npm install swagger-ui-express yamljs`
- [ ] **Task 4.2:** Create `openapi.yaml` in project root
- [ ] **Task 4.3:** Define API info (title, version, description)
- [ ] **Task 4.4:** Document authentication scheme
- [ ] **Task 4.5:** Document common parameters (page, limit)
- [ ] **Task 4.6:** Document common schemas (User, Property, Error)
- [ ] **Task 4.7:** Document Properties endpoints (CRUD + list)
- [ ] **Task 4.8:** Document Leads endpoints
- [ ] **Task 4.9:** Document Authentication endpoints
- [ ] **Task 4.10:** Document Files endpoints
- [ ] **Task 4.11:** Set up Swagger UI at `/api-docs`
- [ ] **Task 4.12:** Add link to docs in README.md
- [ ] **Task 4.13:** Generate Postman collection from OpenAPI
- [ ] **Task 4.14:** Test all documented endpoints

**Estimated Time:** 12-16 hours
**Files to Create:** openapi.yaml, server/docs/
**Deliverable:** Interactive API docs at http://localhost:5000/api-docs

---

## WEEK 2: PERFORMANCE & CACHING

### Day 6: Database Optimization

- [ ] **Task 6.1:** Identify slow queries using query logging
- [ ] **Task 6.2:** Create migration file for indexes
- [ ] **Task 6.3:** Add index: properties(tenant_id, status)
- [ ] **Task 6.4:** Add index: properties(tenant_id, type)
- [ ] **Task 6.5:** Add index: leads(tenant_id, status)
- [ ] **Task 6.6:** Add index: leads(tenant_id, created_at)
- [ ] **Task 6.7:** Add index: rental_payments(contract_id, due_date)
- [ ] **Task 6.8:** Add index: interactions(lead_id, created_at)
- [ ] **Task 6.9:** Run EXPLAIN ANALYZE on critical queries
- [ ] **Task 6.10:** Benchmark query performance improvement

**SQL Commands:**
```sql
CREATE INDEX idx_properties_tenant_status ON properties(tenant_id, status);
CREATE INDEX idx_properties_tenant_type ON properties(tenant_id, type);
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_tenant_created ON leads(tenant_id, created_at DESC);
CREATE INDEX idx_rental_payments_contract_due ON rental_payments(contract_id, due_date);
CREATE INDEX idx_interactions_lead_created ON interactions(lead_id, created_at DESC);
```

**Estimated Time:** 4 hours
**Expected Improvement:** 30-50% query time reduction

---

### Day 7: Fix N+1 Queries

- [ ] **Task 7.1:** Audit all list endpoints for N+1 queries
- [ ] **Task 7.2:** Enable query logging to identify N+1 patterns
- [ ] **Task 7.3:** Update properties list to eager load images
- [ ] **Task 7.4:** Update properties list to eager load owner
- [ ] **Task 7.5:** Update leads list to eager load interactions
- [ ] **Task 7.6:** Update rental contracts to eager load payments
- [ ] **Task 7.7:** Add Drizzle `with` clauses for relations
- [ ] **Task 7.8:** Test query count reduction
- [ ] **Task 7.9:** Benchmark response time improvement
- [ ] **Task 7.10:** Document eager loading patterns

**Before:**
```typescript
// ❌ N+1 Query
const properties = await db.select().from(properties);
for (const property of properties) {
  property.images = await db.select().from(images).where(...);
}
// Result: 1 + N queries
```

**After:**
```typescript
// ✅ Eager Loading
const properties = await db.query.properties.findMany({
  with: { images: true, owner: true }
});
// Result: 1 query with JOINs
```

**Estimated Time:** 6 hours
**Expected Improvement:** 40-60% response time reduction

---

### Day 8: Caching Implementation

- [ ] **Task 8.1:** Install dependencies: `npm install etag`
- [ ] **Task 8.2:** Create `server/lib/cache-helpers.ts`
- [ ] **Task 8.3:** Implement ETag generation for GET endpoints
- [ ] **Task 8.4:** Add If-None-Match header checking
- [ ] **Task 8.5:** Return 304 Not Modified when appropriate
- [ ] **Task 8.6:** Add Cache-Control headers to GET endpoints
- [ ] **Task 8.7:** Implement Redis caching wrapper
- [ ] **Task 8.8:** Add cache to properties list endpoint
- [ ] **Task 8.9:** Add cache to dashboard stats endpoint
- [ ] **Task 8.10:** Implement cache invalidation on updates

**ETag Implementation:**
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

**Estimated Time:** 6-8 hours
**Expected Improvement:** 20-30% bandwidth reduction

---

### Day 9-10: Response Optimization

- [ ] **Task 9.1:** Install compression: `npm install compression`
- [ ] **Task 9.2:** Add compression middleware
- [ ] **Task 9.3:** Configure compression level (6)
- [ ] **Task 9.4:** Add compression threshold (1KB)
- [ ] **Task 9.5:** Implement field selection for all list endpoints
- [ ] **Task 9.6:** Create `parseFieldSelection()` helper
- [ ] **Task 9.7:** Update storage layer to support field selection
- [ ] **Task 9.8:** Test field selection: `?fields=id,title,price`
- [ ] **Task 9.9:** Measure response size reduction
- [ ] **Task 9.10:** Document field selection in OpenAPI

**Field Selection:**
```typescript
GET /api/v1/properties?fields=id,title,price,address
// Returns only specified fields, reducing payload size
```

**Estimated Time:** 6 hours
**Expected Improvement:** 30-50% payload size reduction

---

## WEEK 3: ADVANCED FEATURES

### Day 11-12: JWT Authentication

- [ ] **Task 11.1:** Install dependencies: `npm install jsonwebtoken`
- [ ] **Task 11.2:** Create `server/auth/jwt.ts`
- [ ] **Task 11.3:** Implement `generateAccessToken()`
- [ ] **Task 11.4:** Implement `generateRefreshToken()`
- [ ] **Task 11.5:** Create POST `/api/v1/auth/token` endpoint
- [ ] **Task 11.6:** Create POST `/api/v1/auth/refresh-token` endpoint
- [ ] **Task 11.7:** Implement `requireJWT` middleware
- [ ] **Task 11.8:** Support both session and JWT auth
- [ ] **Task 11.9:** Add token revocation list (Redis)
- [ ] **Task 11.10:** Document JWT flow in OpenAPI

**Token Endpoint:**
```typescript
POST /api/v1/auth/token
{
  "email": "user@example.com",
  "password": "password"
}

Response:
{
  "access_token": "eyJhbGc...",
  "refresh_token": "dGVzdC...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Estimated Time:** 8-10 hours

---

### Day 13-14: RBAC System

- [ ] **Task 13.1:** Define permissions matrix
- [ ] **Task 13.2:** Create `server/auth/permissions.ts`
- [ ] **Task 13.3:** Implement `requirePermission()` middleware
- [ ] **Task 13.4:** Add permissions to all protected routes
- [ ] **Task 13.5:** Create permission checking utilities
- [ ] **Task 13.6:** Add role management endpoints (admin only)
- [ ] **Task 13.7:** Migrate existing role checks to RBAC
- [ ] **Task 13.8:** Test permissions for each role
- [ ] **Task 13.9:** Document permissions in API docs
- [ ] **Task 13.10:** Create permission testing suite

**Permissions Matrix:**
```
property:read    → [admin, broker, viewer]
property:create  → [admin, broker]
property:update  → [admin, broker]
property:delete  → [admin]
user:manage      → [admin]
report:view      → [admin, broker]
```

**Estimated Time:** 10-12 hours

---

### Day 15: Filtering & Sorting

- [ ] **Task 15.1:** Create `server/lib/query-parser.ts`
- [ ] **Task 15.2:** Implement `parseFilters()` function
- [ ] **Task 15.3:** Implement `parseSort()` function
- [ ] **Task 15.4:** Support comparison operators (gte, lte, like)
- [ ] **Task 15.5:** Add filtering to properties endpoint
- [ ] **Task 15.6:** Add filtering to leads endpoint
- [ ] **Task 15.7:** Add sorting to all list endpoints
- [ ] **Task 15.8:** Document filtering syntax in OpenAPI
- [ ] **Task 15.9:** Test complex filter combinations
- [ ] **Task 15.10:** Add validation for filter parameters

**Supported Syntax:**
```
GET /api/v1/properties?filter[type]=apartment&filter[status]=available
GET /api/v1/properties?price[gte]=100000&price[lte]=500000
GET /api/v1/properties?sort=-price,createdAt
GET /api/v1/properties?search=beachfront
```

**Estimated Time:** 6-8 hours

---

## WEEK 4: MONITORING & TESTING

### Day 16-17: Testing Suite

- [ ] **Task 16.1:** Install testing dependencies
- [ ] **Task 16.2:** Set up Jest configuration
- [ ] **Task 16.3:** Create test database
- [ ] **Task 16.4:** Write authentication tests
- [ ] **Task 16.5:** Write properties CRUD tests
- [ ] **Task 16.6:** Write pagination tests
- [ ] **Task 16.7:** Write error handling tests
- [ ] **Task 16.8:** Write rate limiting tests
- [ ] **Task 16.9:** Write permission tests
- [ ] **Task 16.10:** Achieve >80% code coverage

**Test Structure:**
```typescript
describe('Properties API', () => {
  describe('GET /api/v1/properties', () => {
    it('should return paginated results', async () => { ... });
    it('should filter by type', async () => { ... });
    it('should sort by price', async () => { ... });
    it('should return 401 when not authenticated', async () => { ... });
  });
});
```

**Estimated Time:** 12-14 hours

---

### Day 18: Load Testing

- [ ] **Task 18.1:** Install Artillery: `npm install -g artillery`
- [ ] **Task 18.2:** Create `load-tests/properties.yml`
- [ ] **Task 18.3:** Create `load-tests/auth.yml`
- [ ] **Task 18.4:** Create `load-tests/dashboard.yml`
- [ ] **Task 18.5:** Run baseline load tests
- [ ] **Task 18.6:** Identify performance bottlenecks
- [ ] **Task 18.7:** Optimize identified issues
- [ ] **Task 18.8:** Re-run load tests
- [ ] **Task 18.9:** Document performance metrics
- [ ] **Task 18.10:** Set up continuous load testing

**Performance Targets:**
```
P50: < 100ms
P95: < 500ms
P99: < 1000ms
Error Rate: < 0.1%
Throughput: > 1000 req/sec
```

**Estimated Time:** 6 hours

---

### Day 19-20: Monitoring Setup

- [ ] **Task 19.1:** Install Prometheus client
- [ ] **Task 19.2:** Set up metrics collection
- [ ] **Task 19.3:** Track request duration
- [ ] **Task 19.4:** Track error rates
- [ ] **Task 19.5:** Track rate limit hits
- [ ] **Task 19.6:** Expose `/metrics` endpoint
- [ ] **Task 19.7:** Set up Grafana dashboards
- [ ] **Task 19.8:** Configure Sentry error tracking
- [ ] **Task 19.9:** Set up alerting rules
- [ ] **Task 19.10:** Document monitoring setup

**Metrics to Track:**
```
http_request_duration_seconds
http_requests_total
http_errors_total
rate_limit_exceeded_total
cache_hit_rate
database_query_duration_seconds
```

**Estimated Time:** 8-10 hours

---

## POST-IMPLEMENTATION TASKS

### Documentation

- [ ] Update README.md with API versioning info
- [ ] Create MIGRATION_GUIDE.md for v1 migration
- [ ] Create API_CHANGELOG.md
- [ ] Document all breaking changes
- [ ] Create developer onboarding guide
- [ ] Record video tutorials for common operations
- [ ] Create Postman collection with examples
- [ ] Publish API documentation site

### Security

- [ ] Run security audit (npm audit)
- [ ] Perform penetration testing
- [ ] Review all authentication flows
- [ ] Audit permission checks
- [ ] Review rate limiting effectiveness
- [ ] Check for SQL injection vulnerabilities
- [ ] Check for XSS vulnerabilities
- [ ] Review CORS configuration

### Performance

- [ ] Run performance profiling
- [ ] Optimize slow queries
- [ ] Review database connection pool
- [ ] Optimize Redis usage
- [ ] Review cache hit rates
- [ ] Optimize large file uploads
- [ ] Review CDN configuration
- [ ] Set up application-level caching

### Deployment

- [ ] Create deployment checklist
- [ ] Set up staging environment
- [ ] Configure production environment variables
- [ ] Set up database backups
- [ ] Configure log rotation
- [ ] Set up health checks
- [ ] Create rollback procedures
- [ ] Document incident response plan

---

## SUCCESS CRITERIA

### Week 1 Completion:
```
✓ All endpoints versioned (/api/v1)
✓ Status codes corrected (201, 204)
✓ CSRF protection enabled
✓ Pagination standardized
✓ OpenAPI documentation published
```

### Week 2 Completion:
```
✓ Database indexes added
✓ N+1 queries eliminated
✓ ETag caching implemented
✓ Response compression enabled
✓ 40%+ performance improvement
```

### Week 3 Completion:
```
✓ JWT authentication available
✓ RBAC system implemented
✓ Filtering & sorting standardized
✓ Field selection supported
```

### Week 4 Completion:
```
✓ >80% test coverage
✓ Load tests passing
✓ Monitoring configured
✓ Production-ready
```

---

## ROLLOUT PLAN

### Phase 1: Soft Launch (Week 1)
- Deploy to staging
- Internal testing
- Fix critical bugs
- Update documentation

### Phase 2: Beta (Week 2-3)
- Deploy to production with /api/v1
- Maintain backward compatibility on /api
- Monitor error rates
- Collect feedback

### Phase 3: Deprecation Notice (Week 4)
- Add deprecation warnings to /api
- Announce sunset date (6 months)
- Provide migration guide
- Support customers in migration

### Phase 4: Full Cutover (Month 6)
- Remove /api backward compatibility
- Only serve /api/v1
- Monitor for issues
- Celebrate! 🎉

---

## MAINTENANCE SCHEDULE

### Daily:
- Monitor error rates
- Check rate limit violations
- Review performance metrics
- Respond to critical issues

### Weekly:
- Review API usage analytics
- Update documentation as needed
- Respond to developer questions
- Plan next iteration

### Monthly:
- Performance optimization review
- Security audit
- Dependency updates
- Feature planning

---

## RESOURCES NEEDED

### Development Team:
- 2 Backend developers (full-time, 4 weeks)
- 1 DevOps engineer (part-time, 2 weeks)
- 1 Technical writer (part-time, 1 week)

### Tools & Services:
- Swagger/OpenAPI editor
- Postman team workspace
- Artillery for load testing
- Sentry for error tracking
- Prometheus + Grafana for monitoring

### Estimated Total Cost:
- Development time: 320 hours
- Tools/services: $500/month
- Infrastructure: $200/month

---

**Checklist Version 1.0**
**Created:** 2025-12-25
**For:** ImobiBase API Modernization Project
**Priority:** CRITICAL
**Timeline:** 4 weeks
**Success Rate:** 95% with dedicated team
