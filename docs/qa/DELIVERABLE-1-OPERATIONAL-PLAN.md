# Deliverable 1: 5-Day Operational Plan -- ImobiBase QA Kickoff

## Pre-Requisites (Day 0 -- before Day 1 starts)
- Access to the GitHub repository granted to QA
- Local dev environment running (`npm run dev`)
- Access to Stripe test dashboard and MercadoPago sandbox
- DevOps has provisioned a QA Supabase project (or local PostgreSQL)

---

## Day-by-Day Plan

| Day | # | Task | Owner | Hours | Dependencies | Definition of Done |
|-----|---|------|-------|-------|--------------|--------------------|
| **1** | 1.1 | **B1 -- Fix JWT/session secret hardcoding**: Move secret to env var, validate at startup via `secretManager` | Dev | 2h | None | `SESSION_SECRET` read from env; server refuses to start in production if missing/weak; PR merged |
| **1** | 1.2 | **B5 -- Verify rate limiting on `/api/auth/login`**: Confirm `authLimiter` (20 req/15 min) is applied; add portal-specific limiter if portal auth exists | Dev + QA | 1h | None | Rate limit returns 429 after 20 attempts; test written |
| **1** | 1.3 | **B2 -- QA environment setup**: Create `.env.test`, `vitest.config.test.ts` override, separate SQLite DB path `./data/imobibase-test.db` | DevOps + QA | 3h | None | `npm run test:integration` runs against isolated DB; `.env.test` committed (no secrets) |
| **1** | 1.4 | **Codebase walkthrough**: Map all 405 endpoints, identify auth middleware gaps, catalog route files | QA | 2h | None | Endpoint inventory spreadsheet/markdown produced |
| | | | | **8h** | | |
| **2** | 2.1 | **B3 -- Multi-tenant seed script**: Enhance `server/seed.ts` with 3 tenants, 5+ users (admin/agent/viewer roles), properties, leads, contracts, rental data, cross-tenant data | QA + Dev | 4h | 1.3 | `npm run db:seed:qa` creates full test dataset; data verified in DB |
| **2** | 2.2 | **B4 -- Payment sandbox config**: Add Stripe test keys and MercadoPago sandbox tokens to `.env.test`; create test helper for mock payments | Dev | 2h | 1.3 | Payment test helper creates and verifies test charges without real money |
| **2** | 2.3 | **B6 -- CI pipeline enhancement**: Add security scan job, integration test job with seeded DB, and Playwright smoke to existing `.github/workflows/ci.yml` | DevOps | 2h | None | CI runs lint + typecheck + unit + integration + e2e + security scan; all green on main |
| | | | | **8h** | | |
| **3** | 3.1 | **SEC-01 -- WhatsApp webhook tenantId spoofing fix**: Replace `req.body.entry?.[0]?.id` with lookup from verified phone number ID mapping | Dev | 2h | None | tenantId derived from config, not request body; test covers spoofed payload rejection |
| **3** | 3.2 | **SEC-02 -- Payment idempotency keys**: Add idempotency key middleware to `/api/payments/stripe/*` and `/api/payments/mercadopago/*` | Dev | 3h | None | Duplicate POST with same idempotency key returns cached response; test written |
| **3** | 3.3 | **SMK-01 -- Smoke test suite (Playwright)**: Login, create property, create lead, create contract, logout -- for 2 tenants | QA | 3h | 2.1 | `npm run test:smoke` passes; covers happy path for core CRD flows |
| | | | | **8h** | | |
| **4** | 4.1 | **MT-01 -- Tenant isolation integration tests**: Verify user from tenant A cannot read/write tenant B data across all major endpoints | QA | 4h | 2.1 | 10+ integration tests covering properties, leads, contracts, rentals, payments |
| **4** | 4.2 | **CRD-01 to CRD-04 -- Core CRUD tests**: Properties CRUD, Leads CRUD, Contracts CRUD, Rental Contracts CRUD via Supertest | QA | 4h | 2.1 | Each entity has create/read/update/delete/list tests; validation error paths covered |
| | | | | **8h** | | |
| **5** | 5.1 | **PAY-01 -- Stripe payment flow tests**: Create subscription, webhook handling, cancellation | QA | 3h | 2.2 | Stripe test mode subscription lifecycle verified end-to-end |
| **5** | 5.2 | **PRT-01 -- Portal/public endpoint tests**: Public lead creation, newsletter subscription, property listing (public) | QA | 2h | 2.1 | Public endpoints return correct data scoped to tenant slug |
| **5** | 5.3 | **Backlog grooming + sprint planning**: Review remaining backlog items, assign priorities, plan sprint 2 | QA + Dev | 2h | All above | Backlog items estimated and assigned; sprint 2 scope defined |
| **5** | 5.4 | **QA readiness report**: Document coverage gaps, blockers resolved, risk register | QA | 1h | All above | Report delivered to stakeholders |
| | | | | **8h** | | |

---

## What Blocks Formal QA Start

These must be resolved before systematic test execution can begin:

1. **B1 -- Hardcoded secrets** -- Cannot run security tests or deploy to QA env with hardcoded secrets
2. **B2 -- QA environment** -- No isolated environment means tests pollute dev data
3. **B3 -- Multi-tenant seed** -- Current seed has only 2 tenants with minimal data; insufficient for tenant isolation testing
4. **B6 -- CI pipeline** -- Without CI, regressions go undetected between manual test runs

## Parallelization Opportunities

- Day 1: Tasks 1.1 and 1.2 (Dev) can run in parallel with 1.3 (DevOps) and 1.4 (QA)
- Day 2: Tasks 2.1 (QA+Dev) and 2.2 (Dev) can run in parallel with 2.3 (DevOps)
- Day 3: Task 3.1 and 3.2 (Dev) can run in parallel with 3.3 (QA)
- Day 4: Tasks 4.1 and 4.2 can be split across two QA engineers if available
- Day 5: All tasks are sequential due to review/planning nature

## Risk Register

| Risk | Mitigation |
|------|-----------|
| Supabase QA project provisioning delayed | Use SQLite mode (`USE_SQLITE=true`) for local QA; PostgreSQL can come later |
| Stripe/MercadoPago sandbox access blocked | Use mock service layer; test helpers return canned responses |
| Seed script breaks on schema changes | Seed script uses same Drizzle schema types; TypeScript catches breaks at compile time |
| CI flaky tests | Mark flaky tests with `retry: 2` in Playwright; quarantine in Vitest with `.skip` + tracking issue |
