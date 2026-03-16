# Deliverable 2: Executable QA Backlog -- ImobiBase

> 35 GitHub-issue-ready backlog items. Copy each section as a GitHub issue body.

---

## BLOCKERS (P0)

### B-001: Fix session secret not enforced for all environments
- **Priority:** P0-BLOCKER
- **Type:** security
- **Owner:** Dev
- **Dependencies:** None
- **Description:** The `SESSION_SECRET` in `.env.example` has a default placeholder value. While `secretManager.initialize()` validates in production, development and staging environments can run with weak secrets. The secret validation should enforce minimum entropy in all non-test environments.
- **Acceptance Criteria:**
  - [ ] Server refuses to start in `production` and `staging` if `SESSION_SECRET` is missing or < 32 chars
  - [ ] `npm run validate:secrets` exits non-zero if any required secret fails validation
  - [ ] Unit test verifies `secretManager.initialize()` throws for weak secrets

### B-002: QA environment with isolated database and configuration
- **Priority:** P0-BLOCKER
- **Type:** infra
- **Owner:** DevOps
- **Dependencies:** None
- **Description:** No dedicated QA environment exists. Tests currently run against the dev database, causing data pollution and non-reproducible test results. Need `.env.test`, separate SQLite DB path, and npm scripts for QA lifecycle.
- **Acceptance Criteria:**
  - [ ] `.env.test` template committed with test-safe values (no real API keys)
  - [ ] `npm run test:integration` uses `./data/imobibase-test.db` (auto-created, auto-destroyed)
  - [ ] QA environment is documented in contributing guide

### B-003: Multi-tenant seed script for comprehensive QA data
- **Priority:** P0-BLOCKER
- **Type:** data
- **Owner:** QA + Dev
- **Dependencies:** B-002
- **Description:** Current `server/seed.ts` creates only 2 tenants with 2 users and minimal data. QA requires 3+ tenants, multiple user roles, properties across categories, leads at every pipeline stage, contracts, rental data, and cross-tenant test scenarios.
- **Acceptance Criteria:**
  - [ ] `npm run db:seed:qa` creates 3 tenants, 8+ users (admin/agent/viewer), 10+ properties, 10+ leads, 5+ contracts, rental contracts with payments
  - [ ] Seed is idempotent (can re-run without duplicates)
  - [ ] Cross-tenant reference data exists for isolation testing

### B-004: Payment gateway sandbox configuration
- **Priority:** P0-BLOCKER
- **Type:** infra
- **Owner:** Dev + DevOps
- **Dependencies:** B-002
- **Description:** No test/sandbox configuration exists for Stripe or MercadoPago. Payment flows cannot be tested without sandbox API keys and a test helper that creates verifiable test payments.
- **Acceptance Criteria:**
  - [ ] `.env.test` includes `STRIPE_SECRET_KEY=sk_test_...` and MercadoPago sandbox tokens
  - [ ] Test helper module creates Stripe test charges and MercadoPago PIX/boleto payments
  - [ ] Payment webhook simulation helper exists for integration tests

### B-005: Rate limiting on auth login endpoint verified and hardened
- **Priority:** P0-BLOCKER
- **Type:** security
- **Owner:** Dev
- **Dependencies:** None
- **Description:** The `/api/auth/login` endpoint has `authLimiter` (20 req/15 min) applied. However, the limiter uses IP-based keying which can be bypassed behind proxies. Need `trust proxy` configuration and per-account rate limiting for brute-force protection.
- **Acceptance Criteria:**
  - [ ] `app.set('trust proxy', 1)` configured for reverse proxy environments
  - [ ] Per-account lockout after 5 failed attempts (already exists via `failedLoginAttempts`/`lockedUntil` -- verify it works)
  - [ ] Integration test: 21st login attempt within 15 min returns 429

### B-006: CI pipeline with full test stages and security scanning
- **Priority:** P0-BLOCKER
- **Type:** infra
- **Owner:** DevOps
- **Dependencies:** B-002
- **Description:** Existing `.github/workflows/ci.yml` has lint, build, test, and e2e jobs but test jobs use `|| echo "No tests found"` fallbacks, coverage thresholds are `continue-on-error: true`, and there is no security scanning stage.
- **Acceptance Criteria:**
  - [ ] CI fails if unit/integration tests fail (remove `|| echo` fallback)
  - [ ] Security scan job added (npm audit, secret scanning)
  - [ ] Coverage threshold enforcement is mandatory (remove `continue-on-error`)

---

## SECURITY / AUTH (P1)

### SEC-001: WhatsApp webhook tenantId derived from request body without verification
- **Priority:** P1-CRITICAL
- **Type:** security
- **Owner:** Dev
- **Dependencies:** None
- **Description:** In `server/routes-whatsapp.ts` line 646, `tenantId` is extracted as `req.body.entry?.[0]?.id || "default"`. An attacker who bypasses signature validation (or if the secret leaks) can spoof the tenantId to inject messages into any tenant's conversation history.
- **Acceptance Criteria:**
  - [ ] tenantId resolved from a server-side mapping of WhatsApp Business Account ID to tenant
  - [ ] Unknown/unmapped business account IDs logged and rejected
  - [ ] Integration test: webhook with spoofed entry ID is rejected or mapped to correct tenant

### SEC-002: No idempotency keys on payment creation endpoints
- **Priority:** P1-CRITICAL
- **Type:** security
- **Owner:** Dev
- **Dependencies:** None
- **Description:** `POST /api/payments/stripe/create-subscription` and MercadoPago payment endpoints lack idempotency key handling. Network retries or double-clicks can create duplicate charges.
- **Acceptance Criteria:**
  - [ ] All payment creation endpoints require `Idempotency-Key` header
  - [ ] Duplicate requests with same key return cached response (not new charge)
  - [ ] Test verifies duplicate POST returns 200 with same response body

### SEC-003: Extensions routes not enforced as middleware
- **Priority:** P1-CRITICAL
- **Type:** security
- **Owner:** Dev
- **Dependencies:** None
- **Description:** `server/routes-extensions.ts` contains commented-out route handlers with `requireAuth` checks. The file header says "These routes should be added to server/routes.ts" but the code is wrapped in `/* */` comment blocks, meaning tenant settings and permission routes are not active.
- **Acceptance Criteria:**
  - [ ] Extension routes are either properly registered with auth middleware or explicitly removed
  - [ ] If registered, each route enforces tenant isolation via `req.user.tenantId`
  - [ ] Audit confirms no endpoint exists without authentication middleware (except explicitly public routes)

### SEC-004: CSRF token validation audit
- **Priority:** P2-HIGH
- **Type:** security
- **Owner:** QA
- **Dependencies:** None
- **Description:** CSRF protection excludes `/api/auth/login`, `/api/auth/register`, `/api/leads/public`, `/api/newsletter/subscribe`, and webhook paths. Verify that all state-changing authenticated endpoints validate CSRF tokens and that the exclusion list is minimal.
- **Acceptance Criteria:**
  - [ ] All POST/PUT/PATCH/DELETE authenticated endpoints return 403 without valid CSRF token
  - [ ] Exclusion list reviewed and documented with justification for each entry
  - [ ] Test: authenticated POST without X-CSRF-Token header returns 403

### SEC-005: Password policy enforcement audit
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Verify password hashing uses bcrypt with cost 12 (per code in `routes.ts` line 63), password history check works, and account lockout after failed attempts functions correctly.
- **Acceptance Criteria:**
  - [ ] Registration with weak password rejected with descriptive error
  - [ ] Password reuse (from history) rejected
  - [ ] Account locked after 5 consecutive failed logins; unlocks after timeout

---

## MULTI-TENANCY (P1)

### MT-001: Tenant data isolation -- Properties
- **Priority:** P1-CRITICAL
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Verify that property CRUD operations are strictly scoped to `req.user.tenantId`. User from Tenant A must not be able to read, update, or delete properties belonging to Tenant B.
- **Acceptance Criteria:**
  - [ ] GET /api/properties returns only current tenant's properties
  - [ ] GET /api/properties/:id returns 404 for cross-tenant property ID
  - [ ] PUT/DELETE on cross-tenant property ID returns 404 or 403

### MT-002: Tenant data isolation -- Leads
- **Priority:** P1-CRITICAL
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Same isolation verification for leads, including lead assignment, tagging, and follow-ups.
- **Acceptance Criteria:**
  - [ ] Lead list/detail/update/delete scoped to tenant
  - [ ] Lead assignment to user in different tenant rejected
  - [ ] Cross-tenant lead tag operations rejected

### MT-003: Tenant data isolation -- Contracts and Rentals
- **Priority:** P1-CRITICAL
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Verify contracts, rental contracts, and rental payments enforce tenant boundaries. A rental payment for a contract in Tenant B must not be accessible from Tenant A.
- **Acceptance Criteria:**
  - [ ] Contract CRUD scoped to tenant
  - [ ] Rental payment list scoped to tenant's rental contracts
  - [ ] Cross-tenant contract reference in rental creation rejected

### MT-004: Tenant data isolation -- Financial entries
- **Priority:** P1-CRITICAL
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Finance categories and entries must be tenant-scoped. Verify aggregation endpoints (dashboard totals, reports) only include current tenant's data.
- **Acceptance Criteria:**
  - [ ] Financial entries list/create/update scoped to tenant
  - [ ] Dashboard summary endpoint returns only current tenant's totals
  - [ ] Report generation excludes cross-tenant data

---

## PAYMENTS (P1)

### PAY-001: Stripe subscription lifecycle test
- **Priority:** P1-CRITICAL
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-004
- **Description:** End-to-end test of Stripe subscription: create customer, attach payment method, create subscription, verify webhook updates subscription status, cancel subscription.
- **Acceptance Criteria:**
  - [ ] Subscription created in Stripe test mode with correct tenant metadata
  - [ ] Webhook `invoice.paid` updates local subscription status
  - [ ] Cancellation sets subscription to canceled state

### PAY-002: MercadoPago PIX payment flow test
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-004
- **Description:** Test PIX payment creation via MercadoPago sandbox, QR code generation, and webhook notification handling.
- **Acceptance Criteria:**
  - [ ] PIX payment created with correct amount and tenant reference
  - [ ] QR code data returned to client
  - [ ] Webhook notification updates payment status

### PAY-003: Payment webhook signature validation
- **Priority:** P1-CRITICAL
- **Type:** test
- **Owner:** QA
- **Dependencies:** None
- **Description:** Verify that Stripe and MercadoPago webhook endpoints reject requests with invalid or missing signatures.
- **Acceptance Criteria:**
  - [ ] Stripe webhook without valid `stripe-signature` header returns 400
  - [ ] MercadoPago webhook with tampered body rejected
  - [ ] Valid webhook with correct signature processed successfully

---

## PORTAL / PUBLIC ENDPOINTS (P2)

### PRT-001: Public property listing scoped by tenant slug
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Public property listing endpoint (used by tenant portals) must return only properties for the requested tenant slug, with no authentication required.
- **Acceptance Criteria:**
  - [ ] GET /api/leads/public with tenant slug returns only that tenant's available properties
  - [ ] Invalid tenant slug returns 404
  - [ ] Response excludes internal fields (owner contact, commission data)

### PRT-002: Public lead creation with validation
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Public lead creation endpoint must validate input, associate with correct tenant, and apply rate limiting (`publicLimiter`: 30/hour).
- **Acceptance Criteria:**
  - [ ] Valid lead created and associated with correct tenant
  - [ ] Invalid email/phone rejected with 400
  - [ ] 31st request within 1 hour returns 429

### PRT-003: Newsletter subscription and unsubscribe flow
- **Priority:** P3-MEDIUM
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Test newsletter subscribe endpoint and unsubscribe token flow via `/api/email/unsubscribe/:token`.
- **Acceptance Criteria:**
  - [ ] Subscription created with valid email
  - [ ] Unsubscribe with valid token renders success page
  - [ ] Unsubscribe with invalid/expired token renders error page

---

## SMOKE SUITE (P1)

### SMK-001: Login-to-logout smoke test (Playwright)
- **Priority:** P1-CRITICAL
- **Type:** automation
- **Owner:** QA
- **Dependencies:** B-002, B-003
- **Description:** Playwright smoke test: login as admin for each tenant, verify dashboard loads, navigate to properties/leads/contracts, logout. Runs in CI on every PR.
- **Acceptance Criteria:**
  - [ ] Test passes for 2 different tenant admin users
  - [ ] Dashboard renders without console errors
  - [ ] Logout redirects to login page

### SMK-002: Property CRUD smoke test (Playwright)
- **Priority:** P2-HIGH
- **Type:** automation
- **Owner:** QA
- **Dependencies:** SMK-001
- **Description:** Create a property via UI, verify it appears in list, edit it, verify changes, delete it.
- **Acceptance Criteria:**
  - [ ] Property created with all required fields
  - [ ] Edit updates title and price; changes visible in list
  - [ ] Delete removes property from list

---

## CORE CRUD (P2)

### CRD-001: Properties CRUD API tests (Supertest)
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-002, B-003
- **Description:** Full CRUD test suite for properties via Supertest: create, read single, list with pagination, update, delete. Include validation error paths.
- **Acceptance Criteria:**
  - [ ] Create returns 201 with generated ID
  - [ ] List supports pagination (`?page=1&limit=10`) and returns correct count
  - [ ] Create with missing required fields returns 400 with field-level errors

### CRD-002: Leads CRUD API tests (Supertest)
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-002, B-003
- **Description:** CRUD + pipeline stage transitions for leads. Test lead assignment, tag operations, and follow-up scheduling.
- **Acceptance Criteria:**
  - [ ] Lead status transitions (new -> qualification -> visit -> proposal -> contract) validated
  - [ ] Lead assigned to valid user within same tenant succeeds
  - [ ] Follow-up creation with past date rejected

### CRD-003: Contracts CRUD API tests (Supertest)
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-002, B-003
- **Description:** Contract lifecycle: create draft, update terms, sign, complete. Verify property status changes on contract signing.
- **Acceptance Criteria:**
  - [ ] Contract created linking valid property and lead within same tenant
  - [ ] Contract with cross-tenant property/lead reference rejected
  - [ ] Contract signing updates property status

### CRD-004: Rental contracts and payments API tests
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-002, B-003
- **Description:** Rental contract creation with owner/renter, monthly payment generation, payment status updates, late payment detection.
- **Acceptance Criteria:**
  - [ ] Rental contract requires valid owner, renter, and property within same tenant
  - [ ] Payment records created with correct due dates and amounts
  - [ ] Payment status update (pending -> paid) records payment date and method

---

## CONTRACTS / E-SIGNATURE (P2)

### CTR-001: ClickSign e-signature webhook handling
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** None
- **Description:** Test ClickSign webhook signature validation (HMAC-SHA256 with `CLICKSIGN_WEBHOOK_SECRET`) and contract status update on signature events.
- **Acceptance Criteria:**
  - [ ] Webhook with valid HMAC signature processed; contract status updated
  - [ ] Webhook without `CLICKSIGN_WEBHOOK_SECRET` configured returns 500
  - [ ] Webhook with invalid signature returns 401

---

## INSPECTIONS (P3)

### INS-001: Property inspection scheduling and reporting
- **Priority:** P3-MEDIUM
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Test inspection scheduling linked to properties, inspection report creation, and photo attachment handling.
- **Acceptance Criteria:**
  - [ ] Inspection scheduled for valid property within tenant
  - [ ] Inspection report saved with findings and photos
  - [ ] Cross-tenant property inspection rejected

---

## LGPD (P2)

### LGP-001: Data export (portability) endpoint test
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** LGPD requires data portability. Test that a user/lead can request export of all their personal data in machine-readable format.
- **Acceptance Criteria:**
  - [ ] Export endpoint returns JSON/CSV with all personal data for requesting entity
  - [ ] Export scoped to requesting tenant only
  - [ ] Export excludes data from other tenants even if same email exists

### LGP-002: Data deletion (right to be forgotten) test
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-003
- **Description:** Test that personal data deletion removes or anonymizes all PII while preserving aggregate/financial records required by law.
- **Acceptance Criteria:**
  - [ ] Deletion anonymizes name, email, phone in leads/renters/owners
  - [ ] Financial records preserved with anonymized references
  - [ ] Audit log records deletion request and execution

---

## INTEGRATIONS / WEBHOOKS (P2)

### INT-001: WhatsApp message sending end-to-end
- **Priority:** P2-HIGH
- **Type:** test
- **Owner:** QA
- **Dependencies:** B-002
- **Description:** Test WhatsApp message sending via Business API mock, including text, template, and media messages. Verify rate limiting (200/hour per tenant).
- **Acceptance Criteria:**
  - [ ] Text message sent successfully with correct phone format
  - [ ] Template message sent with parameter substitution
  - [ ] 201st message within 1 hour returns 429

### INT-002: Google Maps geocoding integration
- **Priority:** P3-MEDIUM
- **Type:** test
- **Owner:** QA
- **Dependencies:** None
- **Description:** Test property address geocoding and map rendering data. Verify graceful degradation when API key is missing.
- **Acceptance Criteria:**
  - [ ] Valid address returns lat/lng coordinates
  - [ ] Missing `GOOGLE_MAPS_API_KEY` returns graceful fallback (not 500)
  - [ ] Invalid address returns appropriate error message

### INT-003: Email service failover (SendGrid/Resend)
- **Priority:** P3-MEDIUM
- **Type:** test
- **Owner:** QA
- **Dependencies:** None
- **Description:** Test email sending with primary (SendGrid) and fallback (Resend) providers. Verify behavior when neither is configured.
- **Acceptance Criteria:**
  - [ ] Email sent via SendGrid when `SENDGRID_API_KEY` configured
  - [ ] Fallback to Resend when SendGrid fails and `RESEND_API_KEY` configured
  - [ ] Graceful error when no email provider configured

---

## REGRESSION (P2)

### REG-001: Authentication regression suite
- **Priority:** P2-HIGH
- **Type:** automation
- **Owner:** QA
- **Dependencies:** B-002, B-003
- **Description:** Automated regression suite covering: login, logout, session expiry, password reset flow, OAuth login (Google/Microsoft), 2FA setup and validation, account lockout and unlock.
- **Acceptance Criteria:**
  - [ ] All auth flows pass in CI
  - [ ] Session regeneration after login prevents fixation
  - [ ] 2FA TOTP validation with correct/incorrect/expired tokens

### REG-002: Multi-tenant regression suite
- **Priority:** P2-HIGH
- **Type:** automation
- **Owner:** QA
- **Dependencies:** MT-001 through MT-004
- **Description:** Consolidated regression suite that runs all tenant isolation tests. Should execute on every PR that touches `server/routes*.ts` or `server/storage*.ts`.
- **Acceptance Criteria:**
  - [ ] CI runs this suite when relevant files change (path filter in workflow)
  - [ ] All 4 MT test suites pass
  - [ ] Execution time < 2 minutes

---

## Summary

| Category | Count | P0 | P1 | P2 | P3 |
|----------|-------|----|----|----|----|
| Blockers (B) | 6 | 6 | 0 | 0 | 0 |
| Security (SEC) | 5 | 0 | 3 | 2 | 0 |
| Multi-tenancy (MT) | 4 | 0 | 4 | 0 | 0 |
| Payments (PAY) | 3 | 0 | 2 | 1 | 0 |
| Portal (PRT) | 3 | 0 | 0 | 2 | 1 |
| Smoke (SMK) | 2 | 0 | 1 | 1 | 0 |
| Core CRUD (CRD) | 4 | 0 | 0 | 4 | 0 |
| Contracts (CTR) | 1 | 0 | 0 | 1 | 0 |
| Inspections (INS) | 1 | 0 | 0 | 0 | 1 |
| LGPD (LGP) | 2 | 0 | 0 | 2 | 0 |
| Integrations (INT) | 3 | 0 | 0 | 1 | 2 |
| Regression (REG) | 2 | 0 | 0 | 2 | 0 |
| **Total** | **36** | **6** | **10** | **14** | **4** |
