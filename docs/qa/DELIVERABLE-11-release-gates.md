# Deliverable 11: Release Gates

> ImobiBase -- Five operational release gates with pass/fail criteria
> Generated: 2026-03-15

---

## Gate 1: Security Clearance

**Purpose**: Ensure no critical security vulnerabilities exist before any user-facing deployment.
**Approver**: Tech Lead or Security Officer
**When**: Must pass before any release candidate is promoted.

### Checklist

- [ ] **1.1** `npm audit --production` shows 0 critical and 0 high vulnerabilities
- [ ] **1.2** `PORTAL_JWT_SECRET` environment variable is set in production (NOT the default `"portal-secret-key-change-in-production"`)
- [ ] **1.3** `SESSION_SECRET` environment variable is a cryptographically random string (min 64 chars)
- [ ] **1.4** Portal login endpoint (`/api/portal/login`) has rate limiting applied (currently MISSING -- must be implemented)
- [ ] **1.5** CSRF protection middleware is active on all state-changing routes (verified via integration test)
- [ ] **1.6** 2FA validate endpoint (`/api/auth/2fa/validate`) requires authentication or has rate limiting to prevent user ID enumeration
- [ ] **1.7** SQL injection tests (T26) pass -- all injection payloads return safe responses
- [ ] **1.8** XSS tests (T27) pass -- stored XSS in property fields is sanitized
- [ ] **1.9** JWT tampering tests (T28) pass -- tampered/expired tokens rejected with 401
- [ ] **1.10** Account lockout after 5 failures verified (T02)
- [ ] **1.11** No hardcoded secrets found in codebase (secret scan pass)
- [ ] **1.12** Security headers set (Helmet configured: `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`)
- [ ] **1.13** CORS configured to allow only known origins (not `*` in production)
- [ ] **1.14** File upload validation active (`file-validator.ts` rejects executable types)

### Evidence Required

| Evidence | Source | Format |
|----------|--------|--------|
| npm audit output | CI security scan | Text artifact |
| Security test results | `tests/security/` Vitest output | JUnit XML |
| Secret scan results | CI grep scan | Text log |
| Environment variable verification | Deployment config review | Screenshot or CLI output |

### Blockers (any one blocks release)

- Any critical or high npm vulnerability without a fix or documented exception
- Default JWT secret in production configuration
- Portal login without rate limiting
- Failing SQL injection or XSS tests

### Exception Process

Documented exception requires: written risk assessment, compensating control description, 30-day remediation deadline, signed by Tech Lead.

---

## Gate 2: Functional Core

**Purpose**: Verify that core business workflows operate correctly end-to-end.
**Approver**: QA Lead
**When**: After Gate 1 passes.

### Checklist

- [ ] **2.1** Login flow: valid credentials produce session, invalid return 401 (T09, T10)
- [ ] **2.2** Portal login: valid credentials return JWT, invalid return 401 (T11)
- [ ] **2.3** Property CRUD: create, read, update, delete property with all required fields (T12, T20)
- [ ] **2.4** Lead CRUD: create lead, assign to user, update status through pipeline (T13, T21)
- [ ] **2.5** Rental contract lifecycle: create contract, generate monthly payments, activate (T14, T22)
- [ ] **2.6** Rental transfer (repasse): calculate owner transfer from payments, status transitions (T15)
- [ ] **2.7** Portal owner dashboard: shows correct property count, occupancy, revenue (T16, T23)
- [ ] **2.8** Portal renter dashboard: shows contract, next payment, open tickets (T17, T24)
- [ ] **2.9** Maintenance ticket lifecycle: renter creates, admin manages, owner approves (T18)
- [ ] **2.10** Search and filtering: property search returns correct results, no data leaks (T12)
- [ ] **2.11** User management: create user, assign role, role-based access works (T01, AZ-01 through AZ-04)
- [ ] **2.12** 2FA setup and verification flow works end-to-end (MA-15, MA-16, MA-18)

### Evidence Required

| Evidence | Source | Format |
|----------|--------|--------|
| Unit test results | `tests/unit/` | Vitest verbose output |
| Integration test results | `tests/integration/` | Vitest verbose output |
| E2E smoke test results | `tests/e2e/smoke.spec.ts` | Playwright HTML report |
| Coverage report | Vitest coverage | HTML report, min 70% |

### Blockers

- Any BLOCKER-severity test from Deliverable 7 failing
- Unit test coverage below 70% on `server/auth/` and `server/routes.ts`
- Any E2E smoke test failure on login, property CRUD, or rental flow

### Exception Process

Individual test failures for non-core features (e.g., AI descriptions, maps) may be excepted with QA Lead sign-off and Jira ticket created.

---

## Gate 3: Integrations & Payments

**Purpose**: Verify all third-party integrations function correctly in sandbox/test mode.
**Approver**: Tech Lead + Product Owner
**When**: After Gate 2 passes. Can run in parallel with Gate 4.

### Checklist

- [ ] **3.1** Stripe subscription creation works in test mode (`STRIPE_TEST_SECRET_KEY`)
- [ ] **3.2** Stripe webhook signature validation accepts valid signatures, rejects tampered ones
- [ ] **3.3** Stripe payment method update flow works
- [ ] **3.4** MercadoPago PIX payment creation works in sandbox
- [ ] **3.5** MercadoPago boleto generation works in sandbox
- [ ] **3.6** MercadoPago webhook/IPN processing handles all status transitions
- [ ] **3.7** ClickSign document creation and signer assignment work
- [ ] **3.8** ClickSign webhook for signature status updates processes correctly
- [ ] **3.9** Email sending works (SendGrid/Resend) -- password reset, verification, alerts
- [ ] **3.10** WhatsApp Business API message sending works (or gracefully degrades if not configured)
- [ ] **3.11** SMS/Twilio integration sends and receives (or gracefully degrades)
- [ ] **3.12** Google Maps geocoding returns valid coordinates for Brazilian addresses

### Evidence Required

| Evidence | Source | Format |
|----------|--------|--------|
| Stripe test dashboard showing test transactions | Stripe Dashboard | Screenshot |
| MercadoPago sandbox transaction log | MP Dashboard | Screenshot |
| Webhook processing logs | Integration test output | Text log |
| Email delivery confirmation | SendGrid/Resend activity | Screenshot |

### Blockers

- Stripe subscription flow failure (revenue depends on this)
- MercadoPago PIX or boleto failure (primary payment method for Brazilian market)
- Webhook signature validation failure (security risk)

### Exception Process

Non-critical integrations (SMS, WhatsApp, Maps) may launch with graceful degradation if main functionality works. Exception requires Product Owner sign-off.

---

## Gate 4: Quality & Performance

**Purpose**: Ensure application meets quality standards for accessibility, performance, and reliability.
**Approver**: QA Lead
**When**: After Gate 2 passes. Can run in parallel with Gate 3.

### Checklist

- [ ] **4.1** Full E2E suite: >90% pass rate across all spec files (target 80+ tests)
- [ ] **4.2** Accessibility audit: 0 critical violations on login, dashboard, and property listing pages (axe-core)
- [ ] **4.3** Accessibility: all form inputs have associated labels
- [ ] **4.4** Accessibility: color contrast ratio meets WCAG 2.1 AA (4.5:1 for text)
- [ ] **4.5** Performance: API response time p95 < 500ms for property listing with 100 records
- [ ] **4.6** Performance: Login API response time p95 < 1000ms (bcrypt hashing included)
- [ ] **4.7** Performance: Dashboard page LCP < 2.5s (Lighthouse)
- [ ] **4.8** Performance: bundle size < 500KB gzipped for initial load
- [ ] **4.9** Mobile: all critical flows work on iPhone 13 and Pixel 5 viewports
- [ ] **4.10** No console errors on any critical page in production build
- [ ] **4.11** Error handling: all API errors return structured JSON with `error` and `code` fields
- [ ] **4.12** Flakiness: no test has failed more than once in last 5 nightly runs

### Evidence Required

| Evidence | Source | Format |
|----------|--------|--------|
| E2E pass rate report | Playwright HTML report | Artifact |
| axe-core violation report | a11y tests | HTML report |
| Lighthouse scores | Lighthouse CI | JSON + HTML |
| API performance report | k6 output | JSON |
| Bundle size analysis | Build output or `rollup-plugin-visualizer` | Text + HTML |

### Blockers

- E2E pass rate below 85%
- Any critical accessibility violation on login or dashboard
- API p95 response time above 2000ms on any core endpoint
- Bundle size above 1MB gzipped

### Exception Process

Performance thresholds may be relaxed with documented baseline and 30-day optimization plan. Accessibility exceptions require remediation ticket with P1 priority.

---

## Gate 5: Go-Live

**Purpose**: Final validation that the system is ready for production traffic.
**Approver**: Tech Lead + Product Owner + (if applicable) DPO
**When**: After Gates 1-4 pass.

### Checklist

- [ ] **5.1** All Gates 1-4 passed and evidence archived
- [ ] **5.2** Production environment variables verified (all secrets set, no defaults)
- [ ] **5.3** Database migrations applied successfully to production DB (or staging clone)
- [ ] **5.4** Multi-tenant isolation verified: tenant A data never visible to tenant B (T25)
- [ ] **5.5** LGPD compliance endpoints functional:
  - [ ] Data export (`/api/compliance/data-export`) returns user data within 24h
  - [ ] Data deletion (`/api/compliance/delete-account`) processes deletion request
  - [ ] Consent management (`/api/compliance/consent`) records and withdraws consent
  - [ ] Audit log export (`/api/audit-logs/export`) produces CSV/JSON
- [ ] **5.6** Backup and recovery: database backup tested, restore verified
- [ ] **5.7** Monitoring configured: Sentry error tracking active, health endpoint responds
- [ ] **5.8** Rollback plan documented: previous version can be restored within 15 minutes
- [ ] **5.9** SSL/TLS certificate valid and auto-renewal configured
- [ ] **5.10** DNS and CDN configured, custom domain resolves
- [ ] **5.11** Rate limiting active on production (verified via `express-rate-limit` configuration)
- [ ] **5.12** Session store configured for production (Redis or PostgreSQL, NOT in-memory `MemoryStore`)
- [ ] **5.13** Changelog and release notes prepared
- [ ] **5.14** Support/operations team briefed on new features and known issues

### Evidence Required

| Evidence | Source | Format |
|----------|--------|--------|
| Gate 1-4 pass certificates | GitHub Actions artifacts | Links to CI runs |
| Production env var audit | Deployment config (sanitized) | Checklist screenshot |
| LGPD endpoint smoke test | Manual or automated | Video or test output |
| Backup restore test | Ops procedure | Written confirmation |
| Sentry test event | Sentry dashboard | Screenshot |
| Rollback procedure | Ops documentation | Document link |

### Blockers

- Any Gate 1-4 not passed
- Production secrets using default values
- LGPD data export or deletion not functional
- No rollback plan
- Session store using in-memory MemoryStore in production

### Exception Process

Go-Live exceptions require written approval from Tech Lead AND Product Owner with:
1. Risk assessment document
2. Compensating controls in place
3. Remediation timeline (max 14 days)
4. Monitoring plan for the excepted risk

---

## Gate Summary Matrix

| Gate | Scope | Automated? | Blocks Release? | Approver |
|------|-------|-----------|-----------------|----------|
| 1. Security | Auth, secrets, vulnerabilities | 80% auto | YES | Tech Lead |
| 2. Functional | Core CRUD, auth flows | 90% auto | YES | QA Lead |
| 3. Integrations | Payments, e-sign, email | 50% auto | YES (partial) | Tech Lead + PO |
| 4. Quality | A11y, perf, reliability | 70% auto | YES | QA Lead |
| 5. Go-Live | Infra, compliance, ops | 30% auto | YES | Tech Lead + PO |
