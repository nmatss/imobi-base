# Deliverable 9: Test Project Structure

> ImobiBase -- Test infrastructure, conventions, and configuration
> Generated: 2026-03-15

---

## Recommended Folder Structure

```
tests/
├── unit/
│   ├── backend/                    # Server-side unit tests
│   │   ├── auth/                   # Auth module tests
│   │   │   ├── password-strength.test.ts
│   │   │   ├── account-lockout.test.ts
│   │   │   └── totp-verification.test.ts
│   │   ├── middleware/             # Middleware tests
│   │   │   ├── auth-middleware.test.ts
│   │   │   ├── csrf-protection.test.ts
│   │   │   └── rate-limiting.test.ts
│   │   ├── services/               # Business logic tests
│   │   │   ├── avm-engine.test.ts
│   │   │   └── invoice-generator.test.ts
│   │   ├── validation.test.ts
│   │   ├── formatting.test.ts
│   │   └── security.test.ts
│   └── frontend/
│       ├── components/             # React component tests
│       │   ├── PropertyCard.test.tsx
│       │   ├── LeadForm.test.tsx
│       │   └── LoginPage.test.tsx
│       ├── hooks/                  # Custom hook tests
│       │   ├── useToast.test.ts
│       │   ├── useAuth.test.ts
│       │   └── useProperties.test.ts
│       └── utils/
│           └── helpers.test.ts
│
├── integration/
│   ├── auth-login.test.ts          # Main auth flow
│   ├── auth-portal.test.ts         # Portal JWT auth
│   ├── properties.test.ts          # Property CRUD
│   ├── leads.test.ts               # Lead CRUD
│   ├── rental-contracts.test.ts    # Rental lifecycle
│   ├── rental-payments.test.ts     # Payment generation
│   ├── rental-transfers.test.ts    # Repasse flow
│   ├── portal-owner.test.ts        # Portal owner endpoints
│   ├── portal-renter.test.ts       # Portal renter endpoints
│   ├── critical-flows.test.ts      # Cross-module flows
│   └── security/
│       ├── auth-flow.test.ts
│       ├── csrf-protection.test.ts
│       ├── sql-injection.test.ts
│       ├── rate-limiting.test.ts
│       ├── ssrf-protection.test.ts
│       ├── webhook-validation.test.ts
│       └── file-upload.test.ts
│
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts         # Auth state helpers
│   │   └── test-data.ts            # Test data constants
│   ├── pages/                      # Page Object Models
│   │   ├── LoginPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── PropertiesPage.ts
│   │   ├── PropertyDetailsPage.ts
│   │   ├── LeadsPage.ts
│   │   ├── CalendarPage.ts
│   │   ├── SettingsPage.ts
│   │   └── PortalPage.ts
│   ├── smoke.spec.ts               # Critical path smoke tests
│   ├── auth.spec.ts                # Login/logout/2FA
│   ├── properties.spec.ts          # Property management
│   ├── leads.spec.ts               # Lead pipeline
│   ├── rentals.spec.ts             # Rental workflows
│   ├── sales.spec.ts               # Sales workflows
│   ├── financial.spec.ts           # Financial reports
│   ├── calendar.spec.ts            # Calendar/visits
│   ├── settings.spec.ts            # Settings/config
│   ├── portal-owner.spec.ts        # Portal owner flows
│   ├── portal-renter.spec.ts       # Portal renter flows
│   └── mobile.spec.ts              # Mobile-specific flows
│
├── security/
│   ├── sql-injection.test.ts       # SQLi payload suite
│   ├── xss-stored.test.ts          # Stored XSS checks
│   ├── jwt-tampering.test.ts       # Portal JWT attacks
│   ├── auth-bypass.test.ts         # Auth bypass attempts
│   ├── privilege-escalation.test.ts # Role manipulation
│   └── p3-security.test.ts         # Existing P3 security tests
│
├── perf/
│   ├── scripts/
│   │   ├── property-listing.k6.js  # k6 load test
│   │   ├── auth-flow.k6.js         # Auth under load
│   │   └── api-baseline.k6.js      # Full API baseline
│   └── mobile-performance.spec.ts
│
├── a11y/
│   ├── audit.spec.ts               # axe-core full audit
│   ├── keyboard-nav.spec.ts        # Tab order, focus mgmt
│   └── screen-reader.spec.ts       # ARIA labels
│
├── fixtures/
│   ├── users.json                  # Test user data
│   ├── properties.json             # Test property data
│   ├── contracts.json              # Test contract data
│   ├── portal-access.json          # Test portal access data
│   └── factory.ts                  # Programmatic fixture factory
│
├── seeds/
│   ├── seed-test-db.ts             # DB seeder for integration tests
│   ├── seed-e2e.ts                 # E2E environment seeder
│   └── cleanup.ts                  # Post-test cleanup
│
├── contracts/
│   ├── api-schemas/
│   │   ├── login-response.json     # JSON Schema for login response
│   │   ├── property-response.json  # JSON Schema for property
│   │   └── portal-token.json       # JSON Schema for portal JWT
│   └── contract-validator.ts       # Schema validation helper
│
├── helpers/
│   ├── auth-helper.ts              # Login, get session, get JWT
│   ├── api-client.ts               # Typed Supertest wrapper
│   ├── fixture-loader.ts           # Load JSON fixtures
│   ├── db-helper.ts                # Test DB setup/teardown
│   ├── jwt-helper.ts               # Generate/decode test JWTs
│   └── assertion-helpers.ts        # Custom matchers
│
├── mocks/
│   ├── storage-mock.ts             # Storage layer mock
│   ├── stripe-mock.ts              # Stripe API mock
│   ├── email-mock.ts               # Email service mock
│   ├── mercadopago-mock.ts         # MercadoPago mock
│   └── clicksign-mock.ts          # ClickSign mock
│
├── setup.ts                        # Vitest global setup
└── global-teardown.ts              # Vitest global teardown
```

---

## Directory Specifications

| Directory | Purpose | Naming Convention | Example File | Tags |
|-----------|---------|-------------------|--------------|------|
| `unit/backend/` | Pure function tests, no I/O | `<module>.test.ts` | `password-strength.test.ts` | `@unit`, `@backend` |
| `unit/frontend/` | React component/hook tests with JSDOM | `<Component>.test.tsx` | `PropertyCard.test.tsx` | `@unit`, `@frontend` |
| `integration/` | API tests with Supertest against real or mock server | `<feature>.test.ts` | `rental-contracts.test.ts` | `@integration`, `@api` |
| `integration/security/` | Security-focused API tests | `<attack-type>.test.ts` | `sql-injection.test.ts` | `@integration`, `@security` |
| `e2e/` | Browser tests with Playwright | `<feature>.spec.ts` | `properties.spec.ts` | `@e2e`, `@smoke` (for critical) |
| `e2e/pages/` | Page Object Models | `<PageName>Page.ts` | `DashboardPage.ts` | N/A (helpers) |
| `e2e/fixtures/` | Playwright fixture extensions | `<name>.fixture.ts` | `auth.fixture.ts` | N/A (helpers) |
| `security/` | Dedicated security attack tests | `<attack>.test.ts` | `jwt-tampering.test.ts` | `@security`, `@pentest` |
| `perf/` | Performance/load test scripts | `<scenario>.k6.js` | `property-listing.k6.js` | `@perf`, `@load` |
| `a11y/` | Accessibility audit tests | `<area>.spec.ts` | `audit.spec.ts` | `@a11y`, `@wcag` |
| `fixtures/` | Static test data (JSON) | `<entity>.json` | `properties.json` | N/A (data) |
| `seeds/` | DB seeding scripts | `seed-<env>.ts` | `seed-test-db.ts` | N/A (infra) |
| `contracts/` | API contract schemas | `<endpoint>-response.json` | `login-response.json` | `@contract` |
| `helpers/` | Shared test utilities | `<purpose>-helper.ts` | `auth-helper.ts` | N/A (infra) |
| `mocks/` | Service mocks/stubs | `<service>-mock.ts` | `stripe-mock.ts` | N/A (infra) |

---

## Configuration Files

### vitest.config.ts (Unit + Integration)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SENTRY_DSN': JSON.stringify('https://test@sentry.io/123456'),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      'build',
      '.next',
      '**/*.spec.ts',
      'tests/e2e/**',
      'tests/accessibility/**',
      'tests/mobile/**',
      'tests/responsive/**',
      'tests/performance/**',
      'tests/visual/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/vite.ts',
        '**/static.ts',
        'script/**',
      ],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
      all: true,
      include: ['client/src/**/*.{ts,tsx}', 'server/**/*.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
    // Tagging via file path filtering
    // npm run test:unit   -> vitest run --dir tests/unit
    // npm run test:integration -> vitest run --dir tests/integration
    // npm run test:security -> vitest run --dir tests/security
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@server': path.resolve(__dirname, './server'),
      '@db': path.resolve(__dirname, './db'),
      '@fixtures': path.resolve(__dirname, './tests/fixtures'),
      '@helpers': path.resolve(__dirname, './tests/helpers'),
    },
  },
});
```

### playwright.config.ts (E2E)

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testMatch: /.*\.spec\.ts$/,
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [['html'], ['junit', { outputFile: 'test-results/junit.xml' }], ['list']]
    : [['html'], ['list']],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 10_000,
    actionTimeout: 5_000,
  },

  projects: [
    // Smoke tests -- fast, Chromium only
    {
      name: 'smoke',
      testMatch: /smoke\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Full suite -- Chromium
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Mobile -- key flows only
    {
      name: 'mobile-chrome',
      testMatch: /mobile\.spec\.ts$/,
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'mobile-safari',
      testMatch: /mobile\.spec\.ts$/,
      use: { ...devices['iPhone 13'] },
    },
  ],

  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
```

---

## Test Helper Utilities

### Auth Helper

```typescript
// tests/helpers/auth-helper.ts
import request from 'supertest';
import jwt from 'jsonwebtoken';
import type { Express } from 'express';

const PORTAL_JWT_SECRET = process.env.PORTAL_JWT_SECRET || 'portal-secret-key-change-in-production';

/**
 * Login to main system and return agent with active session
 */
export async function loginAsAdmin(app: Express): Promise<request.SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post('/api/login')
    .send({ email: 'admin@test.com', password: 'Password123!' })
    .expect(200);
  return agent;
}

export async function loginAsUser(app: Express): Promise<request.SuperAgentTest> {
  const agent = request.agent(app);
  await agent
    .post('/api/login')
    .send({ email: 'user@test.com', password: 'Password123!' })
    .expect(200);
  return agent;
}

/**
 * Generate a portal JWT for testing
 */
export function generatePortalJWT(overrides: Partial<{
  id: string;
  tenantId: string;
  clientType: string;
  clientId: string;
  email: string;
}> = {}, expiresIn = '24h'): string {
  const payload = {
    id: 'pa-1',
    tenantId: 't1',
    clientType: 'owner',
    clientId: 'owner-1',
    email: 'owner@test.com',
    ...overrides,
  };

  return jwt.sign(payload, PORTAL_JWT_SECRET, { expiresIn });
}

/**
 * Generate an expired portal JWT
 */
export function generateExpiredPortalJWT(): string {
  return generatePortalJWT({}, '-1h');
}

/**
 * Generate a portal JWT signed with wrong secret
 */
export function generateTamperedPortalJWT(): string {
  const payload = {
    id: 'pa-1',
    tenantId: 't1',
    clientType: 'owner',
    clientId: 'owner-1',
    email: 'owner@test.com',
  };
  return jwt.sign(payload, 'wrong-secret', { expiresIn: '24h' });
}
```

### API Client

```typescript
// tests/helpers/api-client.ts
import request from 'supertest';
import type { Express } from 'express';

/**
 * Typed API client for integration tests
 */
export class ApiClient {
  private agent: request.SuperAgentTest;
  private csrfToken: string | null = null;

  constructor(app: Express) {
    this.agent = request.agent(app);
  }

  async login(email: string, password: string) {
    const res = await this.agent
      .post('/api/login')
      .send({ email, password })
      .expect(200);
    return res.body;
  }

  async getCsrfToken(): Promise<string> {
    const res = await this.agent.get('/api/csrf-token').expect(200);
    this.csrfToken = res.body.csrfToken;
    return this.csrfToken!;
  }

  async get(path: string, expectedStatus = 200) {
    return this.agent.get(path).expect(expectedStatus);
  }

  async post(path: string, body: any, expectedStatus = 200) {
    const req = this.agent.post(path).send(body);
    if (this.csrfToken) {
      req.set('x-csrf-token', this.csrfToken);
    }
    return req.expect(expectedStatus);
  }

  async put(path: string, body: any, expectedStatus = 200) {
    const req = this.agent.put(path).send(body);
    if (this.csrfToken) {
      req.set('x-csrf-token', this.csrfToken);
    }
    return req.expect(expectedStatus);
  }

  async delete(path: string, expectedStatus = 200) {
    const req = this.agent.delete(path);
    if (this.csrfToken) {
      req.set('x-csrf-token', this.csrfToken);
    }
    return req.expect(expectedStatus);
  }
}

/**
 * Portal API client using JWT
 */
export class PortalApiClient {
  private token: string;

  constructor(
    private app: Express,
    token: string
  ) {
    this.token = token;
  }

  async get(path: string, expectedStatus = 200) {
    return request(this.app)
      .get(path)
      .set('Authorization', `Bearer ${this.token}`)
      .expect(expectedStatus);
  }

  async post(path: string, body: any, expectedStatus = 200) {
    return request(this.app)
      .post(path)
      .set('Authorization', `Bearer ${this.token}`)
      .send(body)
      .expect(expectedStatus);
  }
}
```

### Fixture Loader

```typescript
// tests/helpers/fixture-loader.ts
import { readFileSync } from 'fs';
import { join } from 'path';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

/**
 * Load a JSON fixture file
 */
export function loadFixture<T>(name: string): T {
  const filePath = join(FIXTURES_DIR, `${name}.json`);
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

/**
 * Factory for creating test entities with defaults and overrides
 */
export function createProperty(overrides: Record<string, any> = {}) {
  return {
    title: 'Apartamento Teste',
    type: 'apartment',
    status: 'available',
    price: '500000',
    address: 'Rua Teste, 123',
    city: 'Sao Paulo',
    state: 'SP',
    zipCode: '01001000',
    bedrooms: 3,
    bathrooms: 2,
    area: 100,
    ...overrides,
  };
}

export function createLead(overrides: Record<string, any> = {}) {
  return {
    name: 'Lead Teste',
    email: 'lead@test.com',
    phone: '11999999999',
    status: 'new',
    source: 'website',
    ...overrides,
  };
}

export function createRentalContract(overrides: Record<string, any> = {}) {
  return {
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    rentValue: '2000.00',
    dueDay: 10,
    status: 'active',
    ...overrides,
  };
}

export function createPortalAccess(overrides: Record<string, any> = {}) {
  return {
    clientType: 'owner',
    email: 'portal@test.com',
    isActive: true,
    ...overrides,
  };
}
```

---

## Test Convention Document

### Pattern: AAA (Arrange-Act-Assert)

All tests MUST follow the AAA pattern:

```typescript
it('should [expected behavior] when [condition]', async () => {
  // Arrange - set up preconditions
  const user = createTestUser({ role: 'admin' });

  // Act - execute the action under test
  const result = await request(app)
    .post('/api/properties')
    .send(createProperty());

  // Assert - verify outcomes
  expect(result.status).toBe(201);
  expect(result.body.tenantId).toBe(user.tenantId);
});
```

### Naming Convention

- Test descriptions: `should [verb] [noun] when [condition]`
- Test files: `<feature>.test.ts` (Vitest) or `<feature>.spec.ts` (Playwright)
- Describe blocks: Name the module/function/component under test

### Tagging Strategy

Since Vitest does not have native tags, use directory structure and `--dir` filtering:

| Tag | Vitest Command | Playwright Flag |
|-----|---------------|-----------------|
| `@unit` | `vitest run --dir tests/unit` | N/A |
| `@integration` | `vitest run --dir tests/integration` | N/A |
| `@security` | `vitest run --dir tests/security` | N/A |
| `@e2e` | N/A | `playwright test` |
| `@smoke` | N/A | `playwright test --project=smoke` |
| `@a11y` | N/A | `playwright test tests/a11y` |
| `@perf` | N/A | `k6 run tests/perf/scripts/` |

### Rules

1. No test should depend on another test's side effects
2. Each test must clean up its own data (use `beforeEach`/`afterEach`)
3. No hardcoded ports -- always use `process.env` or 0 (random port)
4. Mock external services (Stripe, MercadoPago, ClickSign, email) -- never call production APIs
5. Use factories (`createProperty()`) instead of raw objects
6. Integration tests must assert HTTP status AND response body shape
7. E2E tests must use Page Object Models for any page accessed more than once
8. Security tests must cover both positive (attack rejected) and negative (normal request works) cases
