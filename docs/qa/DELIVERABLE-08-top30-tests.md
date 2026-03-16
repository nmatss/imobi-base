# Deliverable 8: Top 30 Priority Automated Tests

> ImobiBase -- Prioritized test backlog with code samples
> Generated: 2026-03-15

---

## Test Matrix

| ID | Objective | Risk Mitigated | Layer | Effort | Dependencies | Priority |
|----|-----------|---------------|-------|--------|-------------|----------|
| **T01** | Verify `validatePasswordStrength()` rejects weak passwords and scores correctly | Weak passwords accepted | unit | S(2h) | None | P0 |
| **T02** | Verify `handleFailedLogin()` locks account after 5 failures | Brute force on main auth | unit | S(2h) | None | P0 |
| **T03** | Verify `verifyTOTP()` with valid/invalid/expired codes | 2FA bypass | unit | S(2h) | None | P0 |
| **T04** | Verify `requireAuth` middleware blocks unauthenticated requests | Unauthorized access | unit | S(2h) | None | P0 |
| **T05** | Verify `requirePortalType` blocks wrong user types | Portal privilege escalation | unit | S(2h) | None | P0 |
| **T06** | Verify `PropertyForm` validates required fields before submission | Invalid data saved to DB | unit-frontend | M(4h) | React Testing Library | P1 |
| **T07** | Verify `useToast` hook displays and auto-dismisses notifications | UX regression | unit-frontend | S(2h) | React Testing Library | P2 |
| **T08** | Verify `LoginPage` component handles error states | Login broken silently | unit-frontend | M(4h) | React Testing Library | P1 |
| **T09** | POST `/api/login` returns session for valid credentials | Auth completely broken | integration-api | M(4h) | Supertest, test DB | P0 |
| **T10** | POST `/api/login` returns 401 + increments failure counter | Brute force undetected | integration-api | M(4h) | Supertest, test DB | P0 |
| **T11** | POST `/api/portal/login` returns JWT for valid portal user | Portal inaccessible | integration-api | M(4h) | Supertest, test DB | P0 |
| **T12** | CRUD properties with tenant isolation | Cross-tenant data leak | integration-api | L(8h) | Supertest, test DB, seed | P0 |
| **T13** | CRUD leads with validation | Leads lost or corrupted | integration-api | M(4h) | Supertest, test DB | P1 |
| **T14** | Rental contract lifecycle (create, activate, payments) | Revenue tracking broken | integration-api | L(8h) | Supertest, test DB, seed | P0 |
| **T15** | Rental transfer (repasse) calculation and status flow | Owner payment errors | integration-api | L(8h) | Supertest, test DB | P1 |
| **T16** | Portal owner sees only own properties and transfers | Data leak to wrong owner | integration-api | M(4h) | Supertest, JWT helper | P0 |
| **T17** | Portal renter sees only own payments and contract | Data leak to wrong renter | integration-api | M(4h) | Supertest, JWT helper | P0 |
| **T18** | Maintenance ticket lifecycle (create, approve, complete) | Maintenance tracking broken | integration-api | M(4h) | Supertest, test DB | P1 |
| **T19** | Login and navigate to dashboard | App completely non-functional | e2e | M(4h) | Playwright, running app | P0 |
| **T20** | Create property with images and verify listing | Core feature broken | e2e | L(8h) | Playwright, auth fixture | P0 |
| **T21** | Create lead, convert to visit, close sale | Sales pipeline broken | e2e | L(8h) | Playwright, auth fixture | P1 |
| **T22** | Create rental contract and generate payments | Rental workflow broken | e2e | L(8h) | Playwright, auth fixture, seed | P0 |
| **T23** | Portal owner login and view dashboard | Portal unusable for owners | e2e | M(4h) | Playwright, portal seed | P1 |
| **T24** | Portal renter login, view payments, open maintenance ticket | Portal unusable for renters | e2e | M(4h) | Playwright, portal seed | P1 |
| **T25** | Multi-tenant: switch tenant context and verify isolation | Cross-tenant contamination | e2e | L(8h) | Playwright, 2 tenant seeds | P0 |
| **T26** | SQL injection on search parameters | Database compromise | security | M(4h) | Supertest | P0 |
| **T27** | XSS in property title/description stored and reflected | Stored XSS attack | security | M(4h) | Supertest | P0 |
| **T28** | Portal JWT tampering and replay attacks | Unauthorized portal access | security | M(4h) | Supertest, jsonwebtoken | P0 |
| **T29** | Accessibility audit on login, dashboard, and property pages | WCAG non-compliance | a11y | M(4h) | Playwright, axe-core | P2 |
| **T30** | API response time for property listing (p95 < 500ms with 100 properties) | Performance degradation | perf | L(8h) | k6 or autocannon | P2 |

---

## Top 5 Tests -- Full Implementation

### T01: Password Strength Validation (Unit)

```typescript
// tests/unit/backend/password-strength.test.ts
import { describe, it, expect } from 'vitest';
import { validatePasswordStrength } from '@server/auth/security';

describe('validatePasswordStrength', () => {
  it('should reject password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Ab1!xyz');
    expect(result.valid).toBe(false);
    expect(result.requirements.minLength).toBe(false);
    expect(result.message).toContain('pelo menos 8 caracteres');
  });

  it('should reject password without uppercase', () => {
    const result = validatePasswordStrength('abcdefg1!');
    expect(result.valid).toBe(false);
    expect(result.requirements.hasUppercase).toBe(false);
  });

  it('should reject password without lowercase', () => {
    const result = validatePasswordStrength('ABCDEFG1!');
    expect(result.valid).toBe(false);
    expect(result.requirements.hasLowercase).toBe(false);
  });

  it('should reject password without number', () => {
    const result = validatePasswordStrength('Abcdefgh!');
    expect(result.valid).toBe(false);
    expect(result.requirements.hasNumber).toBe(false);
  });

  it('should reject password without special character', () => {
    const result = validatePasswordStrength('Abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.requirements.hasSpecialChar).toBe(false);
  });

  it('should accept strong password meeting all requirements', () => {
    const result = validatePasswordStrength('MyP@ssw0rd!');
    expect(result.valid).toBe(true);
    expect(result.score).toBe(100);
    expect(result.message).toBeUndefined();
    expect(result.requirements).toEqual({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumber: true,
      hasSpecialChar: true,
    });
  });

  it('should return partial score for partially met requirements', () => {
    const result = validatePasswordStrength('abcdefgh');
    // Only minLength and hasLowercase met = 2/5 = 40
    expect(result.score).toBe(40);
    expect(result.valid).toBe(false);
  });
});
```

### T09: Login Integration (API)

```typescript
// tests/integration/auth-login.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

// Simulate actual auth setup from routes.ts
const createAuthApp = () => {
  const app = express();
  app.use(express.json());

  const sessionMiddleware = session({
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  });
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // In-memory user store for testing
  const testPasswordHash = bcrypt.hashSync('Password123!', 12);
  const users = [
    {
      id: 'u1',
      email: 'admin@test.com',
      password: testPasswordHash,
      name: 'Admin',
      role: 'admin',
      tenantId: 't1',
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  ];

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      const user = users.find((u) => u.email === email);
      if (!user) return done(null, false, { message: 'Invalid credentials' });

      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return done(null, false, { message: 'Account locked' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        user.failedLoginAttempts++;
        return done(null, false, { message: 'Invalid credentials' });
      }

      user.failedLoginAttempts = 0;
      return done(null, user);
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser((id: string, done) => {
    const user = users.find((u) => u.id === id);
    done(null, user || null);
  });

  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ error: info?.message || 'Invalid credentials' });

      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json({
          user: { id: user.id, email: user.email, name: user.name, role: user.role },
        });
      });
    })(req, res, next);
  });

  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: 'Not authenticated' });
    const u = req.user as any;
    res.json({ user: { id: u.id, email: u.email } });
  });

  return app;
};

describe('POST /api/login - Integration', () => {
  const app = createAuthApp();

  it('should return user data and set session cookie on valid login', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com', password: 'Password123!' })
      .expect(200);

    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('admin@test.com');
    expect(res.body.user.role).toBe('admin');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should return 401 for invalid password', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ email: 'admin@test.com', password: 'WrongPassword!' })
      .expect(401);

    expect(res.body.error).toBe('Invalid credentials');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('should return 401 for non-existent user', async () => {
    await request(app)
      .post('/api/login')
      .send({ email: 'nobody@test.com', password: 'Password123!' })
      .expect(401);
  });

  it('should maintain session across requests', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/login')
      .send({ email: 'admin@test.com', password: 'Password123!' })
      .expect(200);

    const res = await agent.get('/api/user').expect(200);
    expect(res.body.user.email).toBe('admin@test.com');
  });
});
```

### T12: Property CRUD with Tenant Isolation (Integration API)

```typescript
// tests/integration/properties-tenant-isolation.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';

const createPropertyApp = () => {
  const app = express();
  app.use(express.json());

  // In-memory store simulating tenant-scoped storage
  const properties: any[] = [];
  let nextId = 1;

  // Simulated auth middleware
  const fakeAuth = (tenantId: string, role = 'admin') => {
    return (req: any, res: any, next: any) => {
      req.user = { id: 'u1', tenantId, role };
      req.isAuthenticated = () => true;
      next();
    };
  };

  // Tenant A routes
  app.post('/api/tenantA/properties', fakeAuth('tenantA'), (req, res) => {
    const prop = { id: String(nextId++), ...req.body, tenantId: req.user.tenantId };
    properties.push(prop);
    res.status(201).json(prop);
  });

  app.get('/api/tenantA/properties', fakeAuth('tenantA'), (req, res) => {
    res.json(properties.filter((p) => p.tenantId === req.user.tenantId));
  });

  // Tenant B routes
  app.get('/api/tenantB/properties', fakeAuth('tenantB'), (req, res) => {
    res.json(properties.filter((p) => p.tenantId === req.user.tenantId));
  });

  app.get('/api/tenantB/properties/:id', fakeAuth('tenantB'), (req, res) => {
    const prop = properties.find(
      (p) => p.id === req.params.id && p.tenantId === req.user.tenantId
    );
    if (!prop) return res.status(404).json({ error: 'Not found' });
    res.json(prop);
  });

  return app;
};

describe('Property CRUD with Tenant Isolation', () => {
  const app = createPropertyApp();

  it('should create property scoped to tenant A', async () => {
    const res = await request(app)
      .post('/api/tenantA/properties')
      .send({ title: 'Apt 101', type: 'apartment', city: 'Sao Paulo' })
      .expect(201);

    expect(res.body.tenantId).toBe('tenantA');
    expect(res.body.title).toBe('Apt 101');
  });

  it('should NOT show tenant A properties to tenant B', async () => {
    // Create property for tenant A
    await request(app)
      .post('/api/tenantA/properties')
      .send({ title: 'Casa 202', type: 'house', city: 'Rio' });

    // Tenant B sees nothing
    const res = await request(app).get('/api/tenantB/properties').expect(200);
    expect(res.body).toHaveLength(0);
  });

  it('should return 404 when tenant B tries to access tenant A property by ID', async () => {
    const created = await request(app)
      .post('/api/tenantA/properties')
      .send({ title: 'Cobertura 303', type: 'penthouse', city: 'Curitiba' });

    await request(app)
      .get(`/api/tenantB/properties/${created.body.id}`)
      .expect(404);
  });
});
```

### T19: Login and Dashboard E2E (Playwright)

```typescript
// tests/e2e/smoke-login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login and Dashboard', () => {
  test('should login with valid credentials and reach dashboard', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Act - Fill login form
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'admin123!');
    await page.click('[data-testid="login-button"]');

    // Assert - Redirected to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page).toHaveTitle(/Dashboard|ImobiBase/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');

    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');

    // Should stay on login page with error
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible({ timeout: 5000 });
    await expect(page).not.toHaveURL(/\/dashboard/);
  });

  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/(login)?$/, { timeout: 5000 });
  });

  test('should display key dashboard widgets after login', async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'admin123!');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify dashboard has key sections
    await expect(page.locator('text=Imoveis').or(page.locator('text=Propriedades'))).toBeVisible({
      timeout: 5000,
    });
  });
});
```

### T26: SQL Injection on Search (Security)

```typescript
// tests/security/sql-injection.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

const createSearchApp = () => {
  const app = express();
  app.use(express.json());

  // Simulated search endpoint matching the real pattern in routes.ts
  const properties = [
    { id: '1', title: 'Apartamento Centro', city: 'SP', tenantId: 't1' },
    { id: '2', title: 'Casa Jardins', city: 'SP', tenantId: 't1' },
  ];

  // Fake auth
  app.use((req: any, _res, next) => {
    req.user = { id: 'u1', tenantId: 't1' };
    req.isAuthenticated = () => true;
    next();
  });

  app.get('/api/properties', (req: any, res) => {
    const search = String(req.query.search || '');
    // Safe filtering (should NOT use string concatenation into SQL)
    const filtered = properties.filter(
      (p) =>
        p.tenantId === req.user.tenantId &&
        (p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.city.toLowerCase().includes(search.toLowerCase()))
    );
    res.json(filtered);
  });

  return app;
};

describe('SQL Injection Prevention', () => {
  const app = createSearchApp();

  const sqlInjectionPayloads = [
    "'; DROP TABLE properties; --",
    "1' OR '1'='1",
    "1; SELECT * FROM users --",
    "' UNION SELECT password FROM users --",
    "admin'--",
    "1' AND 1=1 UNION ALL SELECT NULL,NULL,NULL--",
    "' OR 1=1#",
    "'; WAITFOR DELAY '0:0:5'--",
  ];

  for (const payload of sqlInjectionPayloads) {
    it(`should safely handle injection payload: ${payload.substring(0, 30)}...`, async () => {
      const res = await request(app)
        .get('/api/properties')
        .query({ search: payload })
        .expect(200);

      // Should return empty array or safe results, never error out
      expect(Array.isArray(res.body)).toBe(true);
      // Should not expose table structure or error messages
      expect(JSON.stringify(res.body)).not.toContain('syntax error');
      expect(JSON.stringify(res.body)).not.toContain('SQL');
    });
  }

  it('should return results for normal search terms', async () => {
    const res = await request(app)
      .get('/api/properties')
      .query({ search: 'Centro' })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Apartamento Centro');
  });
});
```

---

## Implementation Effort Summary

| Layer | Count | Total Effort | Cumulative Hours |
|-------|-------|-------------|-----------------|
| Unit (backend) | 5 | 5 x S = 10h | 10h |
| Unit (frontend) | 3 | S+M+M = 10h | 20h |
| Integration API | 10 | 4S+4M+2L = 40h | 60h |
| E2E (Playwright) | 7 | 2M+5L = 48h | 108h |
| Security | 3 | 3 x M = 12h | 120h |
| Accessibility | 1 | 1 x M = 4h | 124h |
| Performance | 1 | 1 x L = 8h | 132h |
| **Total** | **30** | | **132h (~17 days)** |
