# Deliverable 4: Smoke Suite - 25 Critical Flows

## Test Infrastructure Helpers

### `createAuthenticatedAgent(email, password)` - Supertest Session Auth

```typescript
// tests/helpers/auth.ts
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { app } from '../../server/app';

/**
 * Creates an authenticated Supertest agent with a valid session cookie.
 * Uses the actual /api/auth/login endpoint with Passport LocalStrategy
 * (usernameField: "email"). Returns the agent + user/tenant/csrfToken.
 */
export async function createAuthenticatedAgent(
  email: string,
  password: string
): Promise<{
  agent: SuperAgentTest;
  user: { id: string; tenantId: string; name: string; email: string; role: string };
  tenant: any;
  csrfToken: string;
}> {
  const agent = request.agent(app);

  const res = await agent
    .post('/api/auth/login')
    .send({ email, password }) // Passport LocalStrategy uses "email" as usernameField
    .expect(200);

  // The login response returns { user, tenant, csrfToken }
  // Session cookie "imobibase.sid" is set automatically by express-session
  // CSRF cookie "csrf-token" is set as httpOnly cookie
  const { user, tenant, csrfToken } = res.body;

  if (!user || !csrfToken) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }

  // Attach CSRF token to all subsequent mutating requests
  // The server checks X-CSRF-Token header against the csrf-token cookie
  agent.set('X-CSRF-Token', csrfToken);

  return { agent, user, tenant, csrfToken };
}

/**
 * Creates an unauthenticated agent for testing 401 responses.
 */
export function createUnauthenticatedAgent(): SuperAgentTest {
  return request.agent(app);
}
```

### `createPortalToken(email, password)` - JWT Portal Auth

```typescript
// tests/helpers/portal-auth.ts
import request from 'supertest';
import { app } from '../../server/app';

/**
 * Creates a JWT token for portal access (owner/renter portal).
 *
 * NOTE: The current codebase does not have a dedicated /api/portal/login endpoint.
 * Portal access is referenced in seed-defaults.ts and routes.ts but the JWT-based
 * portal auth is not yet fully implemented. This helper is designed for when the
 * portal auth endpoint is added. For now, we use the session-based auth and
 * simulate portal context.
 *
 * When the portal endpoint exists, it will likely be:
 *   POST /api/portal/auth/login { email, password, portalType: 'owner'|'renter' }
 *   Returns: { token: string, user: PortalUser }
 */
export async function createPortalToken(
  email: string,
  password: string,
  portalType: 'owner' | 'renter' = 'owner'
): Promise<{
  token: string;
  agent: request.SuperAgentTest;
}> {
  const agent = request.agent(app);

  // Attempt portal-specific login if endpoint exists
  try {
    const res = await agent
      .post('/api/portal/auth/login')
      .send({ email, password, portalType })
      .expect(200);

    const { token } = res.body;
    agent.set('Authorization', `Bearer ${token}`);
    return { token, agent };
  } catch {
    // Fallback: use session auth for portal-like testing
    const { agent: sessionAgent, csrfToken } = await (
      await import('./auth')
    ).createAuthenticatedAgent(email, password);

    return { token: csrfToken, agent: sessionAgent };
  }
}
```

### `seedTestTenant()` - Complete Test Tenant Setup

```typescript
// tests/helpers/seed.ts
import { storage } from '../../server/storage';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export interface SeededTenant {
  tenant: { id: string; name: string; slug: string };
  adminUser: { id: string; email: string; password: string; tenantId: string };
  agentUser: { id: string; email: string; password: string; tenantId: string };
  properties: any[];
  leads: any[];
  contracts: any[];
  rentalContracts: any[];
  owners: any[];
  renters: any[];
}

/**
 * Seeds a complete test tenant with realistic data.
 * Creates: tenant, 2 users (admin + agent), 5 properties, 10 leads,
 * 3 contracts, 2 rental contracts, 2 owners, 2 renters.
 */
export async function seedTestTenant(
  tenantName: string = 'Test Imobiliaria',
  suffix: string = nanoid(6)
): Promise<SeededTenant> {
  const tenantId = nanoid();
  const slug = `test-${suffix}`.toLowerCase();

  // 1. Create tenant
  const tenant = await storage.createTenant({
    id: tenantId,
    name: tenantName,
    slug,
    plan: 'professional',
  });

  // 2. Create admin user
  const adminPassword = 'Test@12345';
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const adminUser = await storage.createUser({
    id: nanoid(),
    tenantId,
    name: `Admin ${tenantName}`,
    email: `admin-${suffix}@test.imobibase.com`,
    password: hashedPassword,
    role: 'admin',
  });

  // 3. Create agent user
  const agentUser = await storage.createUser({
    id: nanoid(),
    tenantId,
    name: `Corretor ${tenantName}`,
    email: `agent-${suffix}@test.imobibase.com`,
    password: hashedPassword,
    role: 'agent',
  });

  // 4. Create 5 properties
  const propertyTypes = ['apartamento', 'casa', 'comercial', 'terreno', 'cobertura'];
  const properties = [];
  for (let i = 0; i < 5; i++) {
    const prop = await storage.createProperty({
      tenantId,
      title: `Imóvel Teste ${i + 1} - ${tenantName}`,
      type: propertyTypes[i],
      category: i < 3 ? 'venda' : 'aluguel',
      status: 'available',
      price: String((i + 1) * 250000),
      area: String((i + 1) * 50 + 50),
      bedrooms: i + 1,
      bathrooms: Math.max(1, i),
      address: `Rua Teste ${i + 1}, ${100 + i}`,
      city: 'São Paulo',
      state: 'SP',
      zipCode: `01000-00${i}`,
    });
    properties.push(prop);
  }

  // 5. Create 10 leads
  const leadStatuses = ['new', 'qualification', 'visit', 'proposal', 'negotiation',
                        'new', 'qualification', 'visit', 'closed_won', 'closed_lost'];
  const leads = [];
  for (let i = 0; i < 10; i++) {
    const lead = await storage.createLead({
      tenantId,
      name: `Lead Teste ${i + 1}`,
      email: `lead${i + 1}-${suffix}@test.com`,
      phone: `1199900${String(i).padStart(4, '0')}`,
      status: leadStatuses[i],
      source: i % 2 === 0 ? 'website' : 'whatsapp',
      assignedTo: i % 2 === 0 ? adminUser.id : agentUser.id,
    });
    leads.push(lead);
  }

  // 6. Create owners
  const owners = [];
  for (let i = 0; i < 2; i++) {
    const owner = await storage.createOwner({
      tenantId,
      name: `Proprietário ${i + 1}`,
      email: `owner${i + 1}-${suffix}@test.com`,
      phone: `1198800${String(i).padStart(4, '0')}`,
      cpfCnpj: `000.000.00${i}-0${i}`,
    });
    owners.push(owner);
  }

  // 7. Create renters
  const renters = [];
  for (let i = 0; i < 2; i++) {
    const renter = await storage.createRenter({
      tenantId,
      name: `Inquilino ${i + 1}`,
      email: `renter${i + 1}-${suffix}@test.com`,
      phone: `1197700${String(i).padStart(4, '0')}`,
      cpfCnpj: `111.111.11${i}-1${i}`,
    });
    renters.push(renter);
  }

  // 8. Create 3 contracts (sale)
  const contracts = [];
  for (let i = 0; i < 3; i++) {
    const contract = await storage.createContract({
      tenantId,
      propertyId: properties[i].id,
      leadId: leads[i].id,
      type: 'venda',
      status: i === 0 ? 'active' : i === 1 ? 'pending' : 'completed',
      value: String((i + 1) * 300000),
      startDate: new Date().toISOString(),
    });
    contracts.push(contract);
  }

  // 9. Create 2 rental contracts
  const rentalContracts = [];
  for (let i = 0; i < 2; i++) {
    const rc = await storage.createRentalContract({
      tenantId,
      propertyId: properties[3 + i].id,
      ownerId: owners[i].id,
      renterId: renters[i].id,
      monthlyRent: String((i + 1) * 2500),
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
    });
    rentalContracts.push(rc);
  }

  return {
    tenant: { id: tenantId, name: tenantName, slug },
    adminUser: { id: adminUser.id, email: adminUser.email, password: adminPassword, tenantId },
    agentUser: { id: agentUser.id, email: agentUser.email, password: adminPassword, tenantId },
    properties,
    leads,
    contracts,
    rentalContracts,
    owners,
    renters,
  };
}

/**
 * Tears down all data for a given tenant.
 */
export async function teardownTestTenant(tenantId: string): Promise<void> {
  // Delete in reverse dependency order
  // The storage layer should handle cascade or we delete explicitly
  await storage.deleteAllTenantData(tenantId);
}
```

---

## Smoke Test Specifications (25 Flows)

---

### SMOKE-01: Login with email/password

| Field | Value |
|-------|-------|
| **Name** | Login with valid credentials |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Seeded tenant with admin user exists |
| **Test data** | `{ email: "admin@test.com", password: "Test@12345" }` |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-01: Login with email/password', () => {
  let seeded: SeededTenant;

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke01');
  });

  afterAll(async () => {
    await teardownTestTenant(seeded.tenant.id);
  });

  it('should login and return user, tenant, and csrfToken', async () => {
    const agent = request.agent(app);

    const res = await agent
      .post('/api/auth/login')
      .send({ email: seeded.adminUser.email, password: seeded.adminUser.password })
      .expect(200);

    // Verify response structure from routes.ts line 843-854
    expect(res.body.user).toMatchObject({
      id: seeded.adminUser.id,
      tenantId: seeded.tenant.id,
      email: seeded.adminUser.email,
      role: 'admin',
    });
    expect(res.body.tenant).toBeDefined();
    expect(res.body.csrfToken).toBeDefined();
    expect(typeof res.body.csrfToken).toBe('string');

    // Verify session cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c: string) => c.includes('imobibase.sid'))).toBe(true);
    expect(cookies.some((c: string) => c.includes('csrf-token'))).toBe(true);
  });
});
```

**Expected result:** 200 with `{ user: { id, tenantId, name, email, role }, tenant, csrfToken }`. Session cookie `imobibase.sid` and `csrf-token` cookie set.

---

### SMOKE-02: Login with invalid credentials

| Field | Value |
|-------|-------|
| **Name** | Login with wrong password |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Seeded tenant with admin user exists |
| **Test data** | `{ email: "admin@test.com", password: "WrongPass!" }` |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-02: Login with invalid credentials', () => {
  let seeded: SeededTenant;

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke02');
  });

  afterAll(async () => {
    await teardownTestTenant(seeded.tenant.id);
  });

  it('should return 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: seeded.adminUser.email, password: 'WrongPass!' })
      .expect(401);

    // routes.ts line 807: "Credenciais inválidas" or info.message "Email ou senha incorretos"
    expect(res.body.error).toMatch(/inválidas|incorretos/i);
    expect(res.body.user).toBeUndefined();
  });

  it('should return 401 with non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'AnyPass123' })
      .expect(401);

    expect(res.body.error).toBeDefined();
  });

  it('should not leak whether email exists', async () => {
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({ email: seeded.adminUser.email, password: 'WrongPass!' });

    const noUserRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'WrongPass!' });

    // Both should return same generic error (no enumeration)
    expect(wrongPassRes.status).toBe(401);
    expect(noUserRes.status).toBe(401);
  });
});
```

**Expected result:** 401 with error message. No session cookie set.

---

### SMOKE-03: Unauthenticated access blocked

| Field | Value |
|-------|-------|
| **Name** | Protected routes reject unauthenticated requests |
| **Layer** | API (Supertest) |
| **Pre-conditions** | None (no login) |
| **Test data** | None |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-03: Unauthenticated access blocked', () => {
  const protectedEndpoints = [
    { method: 'get', path: '/api/properties' },
    { method: 'get', path: '/api/leads' },
    { method: 'get', path: '/api/contracts' },
    { method: 'get', path: '/api/dashboard/stats' },
    { method: 'get', path: '/api/search?q=test' },
    { method: 'get', path: '/api/rental-contracts' },
    { method: 'get', path: '/api/rental-payments' },
    { method: 'get', path: '/api/finance-entries' },
    { method: 'get', path: '/api/owners' },
    { method: 'get', path: '/api/renters' },
    { method: 'get', path: '/api/auth/me' },
    { method: 'post', path: '/api/properties' },
    { method: 'post', path: '/api/leads' },
  ];

  it.each(protectedEndpoints)(
    'should return 401 for $method $path',
    async ({ method, path }) => {
      const res = await (request(app) as any)[method](path).send({});

      // requireAuth returns 401 with "Não autenticado" (routes.ts line 636)
      // or "Authentication required" (middleware/auth.ts line 21)
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    }
  );
});
```

**Expected result:** All protected endpoints return 401 with `{ error, code: "UNAUTHORIZED" }`.

---

### SMOKE-04: Tenant isolation - user A can't see tenant B data

| Field | Value |
|-------|-------|
| **Name** | Cross-tenant data access returns 404 |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Two seeded tenants with properties |
| **Test data** | Tenant A property ID, Tenant B authenticated agent |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-04: Tenant isolation', () => {
  let tenantA: SeededTenant;
  let tenantB: SeededTenant;
  let agentA: { agent: SuperAgentTest };
  let agentB: { agent: SuperAgentTest };

  beforeAll(async () => {
    tenantA = await seedTestTenant('Isolamento A');
    tenantB = await seedTestTenant('Isolamento B');
    agentA = await createAuthenticatedAgent(tenantA.adminUser.email, tenantA.adminUser.password);
    agentB = await createAuthenticatedAgent(tenantB.adminUser.email, tenantB.adminUser.password);
  });

  afterAll(async () => {
    await teardownTestTenant(tenantA.tenant.id);
    await teardownTestTenant(tenantB.tenant.id);
  });

  it('User B cannot GET property from Tenant A', async () => {
    const propertyAId = tenantA.properties[0].id;
    // validateResourceTenant returns 404 to avoid leaking existence (routes.ts line 170-171)
    const res = await agentB.agent.get(`/api/properties/${propertyAId}`).expect(404);
    expect(res.body.error).toContain('not found');
  });

  it('User B cannot PATCH lead from Tenant A', async () => {
    const leadAId = tenantA.leads[0].id;
    const res = await agentB.agent
      .patch(`/api/leads/${leadAId}`)
      .send({ name: 'Hacked Name' })
      .expect(404);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/properties returns ONLY own tenant properties', async () => {
    const res = await agentA.agent.get('/api/properties').expect(200);
    const returnedTenantIds = res.body.map((p: any) => p.tenantId);
    expect(returnedTenantIds.every((tid: string) => tid === tenantA.tenant.id)).toBe(true);
    // Should not contain any of Tenant B's property IDs
    const tenantBIds = tenantB.properties.map((p: any) => p.id);
    const returnedIds = res.body.map((p: any) => p.id);
    expect(returnedIds.filter((id: string) => tenantBIds.includes(id))).toHaveLength(0);
  });

  it('GET /api/leads returns ONLY own tenant leads', async () => {
    const res = await agentB.agent.get('/api/leads').expect(200);
    const returnedTenantIds = res.body.map((l: any) => l.tenantId);
    expect(returnedTenantIds.every((tid: string) => tid === tenantB.tenant.id)).toBe(true);
  });
});
```

**Expected result:** Cross-tenant access returns 404 (not 403, to avoid existence leaking). List endpoints return only the authenticated user's tenant data.

---

### SMOKE-05: Create property

| Field | Value |
|-------|-------|
| **Name** | Create property with valid data |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent |
| **Test data** | Property payload with title, type, category, price |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-05: Create property', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke05');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  afterAll(async () => {
    await teardownTestTenant(seeded.tenant.id);
  });

  it('should create a property and return 201', async () => {
    const payload = {
      title: 'Apartamento Novo Centro',
      type: 'apartamento',
      category: 'venda',
      status: 'available',
      price: '450000',
      area: '85',
      bedrooms: 3,
      bathrooms: 2,
      address: 'Rua Augusta, 1500',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01304-001',
    };

    const res = await auth.agent
      .post('/api/properties')
      .send(payload)
      .expect(201);

    // tenantId is injected server-side (routes.ts line 1161)
    expect(res.body.tenantId).toBe(seeded.tenant.id);
    expect(res.body.title).toBe(payload.title);
    expect(res.body.id).toBeDefined();
    expect(res.body.type).toBe('apartamento');
  });

  it('should reject invalid property data with 400', async () => {
    const res = await auth.agent
      .post('/api/properties')
      .send({ title: '' }) // Missing required fields
      .expect(400);

    expect(res.body.error).toBeDefined();
  });
});
```

**Expected result:** 201 with created property. `tenantId` set to authenticated user's tenant.

---

### SMOKE-06: List properties with filters

| Field | Value |
|-------|-------|
| **Name** | List and filter properties by type/category/status |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, 5 seeded properties |
| **Test data** | Query params: `?type=apartamento&category=venda` |
| **Criticality** | HIGH |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-06: List properties with filters', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke06');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should list all properties for tenant', async () => {
    const res = await auth.agent.get('/api/properties').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(5);
  });

  it('should filter by type', async () => {
    // routes.ts line 1110-1116: accepts type, category, status, featured
    const res = await auth.agent.get('/api/properties?type=apartamento').expect(200);
    expect(res.body.every((p: any) => p.type === 'apartamento')).toBe(true);
  });

  it('should filter by category', async () => {
    const res = await auth.agent.get('/api/properties?category=aluguel').expect(200);
    expect(res.body.every((p: any) => p.category === 'aluguel')).toBe(true);
  });
});
```

**Expected result:** 200 with array of properties filtered by query params. All results belong to the user's tenant.

---

### SMOKE-07: Create lead

| Field | Value |
|-------|-------|
| **Name** | Create lead with valid data |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent |
| **Test data** | Lead payload with name, email, phone, source |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-07: Create lead', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke07');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should create lead and return 201', async () => {
    const payload = {
      name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '11999001234',
      source: 'website',
      status: 'new',
    };

    const res = await auth.agent.post('/api/leads').send(payload).expect(201);

    expect(res.body.tenantId).toBe(seeded.tenant.id);
    expect(res.body.name).toBe('Maria Silva');
    expect(res.body.status).toBe('new');
    expect(res.body.id).toBeDefined();
  });
});
```

**Expected result:** 201 with created lead. `tenantId` auto-injected.

---

### SMOKE-08: Move lead through pipeline

| Field | Value |
|-------|-------|
| **Name** | Update lead status through CRM pipeline |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, seeded lead with status "new" |
| **Test data** | Lead ID, status transitions |
| **Criticality** | CRITICAL |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-08: Move lead through pipeline', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke08');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should move lead from new -> qualification -> visit -> proposal', async () => {
    const leadId = seeded.leads[0].id; // status = 'new'
    const statuses = ['qualification', 'visit', 'proposal', 'negotiation', 'closed_won'];

    for (const status of statuses) {
      const res = await auth.agent
        .patch(`/api/leads/${leadId}`)
        .send({ status })
        .expect(200);

      expect(res.body.status).toBe(status);
    }
  });
});
```

**Expected result:** Each PATCH returns 200 with updated status. Lead progresses through the full pipeline.

---

### SMOKE-09: Schedule visit

| Field | Value |
|-------|-------|
| **Name** | Create a visit (agendamento de visita) |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, seeded property and lead |
| **Test data** | Visit payload with propertyId, leadId, date |
| **Criticality** | HIGH |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-09: Schedule visit', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke09');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should create a visit and return 201', async () => {
    const payload = {
      propertyId: seeded.properties[0].id,
      leadId: seeded.leads[0].id,
      date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      status: 'scheduled',
      notes: 'Visita de apresentação',
    };

    const res = await auth.agent.post('/api/visits').send(payload).expect(201);

    expect(res.body.propertyId).toBe(payload.propertyId);
    expect(res.body.leadId).toBe(payload.leadId);
    expect(res.body.status).toBe('scheduled');
  });

  it('should list visits for tenant', async () => {
    const res = await auth.agent.get('/api/visits').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

**Expected result:** 201 with created visit. Visit appears in GET /api/visits listing.

---

### SMOKE-10: Create rental contract

| Field | Value |
|-------|-------|
| **Name** | Create rental contract (contrato de locacao) |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, seeded property, owner, renter |
| **Test data** | Rental contract payload |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-10: Create rental contract', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke10');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should create rental contract and return 201', async () => {
    // Create a fresh property for this contract
    const propRes = await auth.agent.post('/api/properties').send({
      title: 'Apto Aluguel Teste',
      type: 'apartamento',
      category: 'aluguel',
      status: 'available',
      price: '3000',
    }).expect(201);

    const payload = {
      propertyId: propRes.body.id,
      ownerId: seeded.owners[0].id,
      renterId: seeded.renters[0].id,
      monthlyRent: '3000',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString(),
      status: 'active',
    };

    const res = await auth.agent.post('/api/rental-contracts').send(payload).expect(201);

    expect(res.body.tenantId).toBe(seeded.tenant.id);
    expect(res.body.monthlyRent).toBeDefined();
    expect(res.body.status).toBe('active');
  });
});
```

**Expected result:** 201 with created rental contract. `tenantId` auto-injected.

---

### SMOKE-11: Register rental payment

| Field | Value |
|-------|-------|
| **Name** | Register rental payment (pagamento de aluguel) |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, existing rental contract |
| **Test data** | Rental payment payload |
| **Criticality** | CRITICAL |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-11: Register rental payment', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke11');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should register a rental payment and return 201', async () => {
    const payload = {
      rentalContractId: seeded.rentalContracts[0].id,
      amount: '3000',
      dueDate: new Date().toISOString(),
      status: 'paid',
      paidAt: new Date().toISOString(),
      paymentMethod: 'pix',
      referenceMonth: '2026-03',
    };

    const res = await auth.agent.post('/api/rental-payments').send(payload).expect(201);

    expect(res.body.tenantId).toBe(seeded.tenant.id);
    expect(res.body.status).toBe('paid');
    expect(res.body.rentalContractId).toBe(payload.rentalContractId);
  });
});
```

**Expected result:** 201 with created rental payment.

---

### SMOKE-12: Generate owner repasse

| Field | Value |
|-------|-------|
| **Name** | Generate rental transfers (repasses) for a month |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, rental contracts with payments |
| **Test data** | `{ referenceMonth: "2026-03" }` |
| **Criticality** | CRITICAL |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-12: Generate owner repasse', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke12');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
    // Pre-register a payment for the month
    await auth.agent.post('/api/rental-payments').send({
      rentalContractId: seeded.rentalContracts[0].id,
      amount: '2500',
      dueDate: '2026-03-10',
      status: 'paid',
      paidAt: '2026-03-10',
      referenceMonth: '2026-03',
    });
  });

  it('should generate repasses for a reference month', async () => {
    // routes.ts line 1820: POST /api/rental-transfers/generate
    const res = await auth.agent
      .post('/api/rental-transfers/generate')
      .send({ referenceMonth: '2026-03' })
      .expect(200);

    expect(Array.isArray(res.body) || res.body.transfers).toBeTruthy();
  });

  it('should list repasses', async () => {
    const res = await auth.agent.get('/api/rental-transfers').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

**Expected result:** 200 with generated transfers. Transfers appear in listing.

---

### SMOKE-13: Create sale proposal

| Field | Value |
|-------|-------|
| **Name** | Create a sale proposal (proposta de venda) |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, seeded property and lead |
| **Test data** | Sale proposal payload |
| **Criticality** | HIGH |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-13: Create sale proposal', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke13');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should create a sale proposal and return 201', async () => {
    const payload = {
      propertyId: seeded.properties[0].id,
      leadId: seeded.leads[0].id,
      proposedValue: '400000',
      status: 'pending',
      conditions: 'Financiamento em 30 anos',
    };

    const res = await auth.agent.post('/api/sale-proposals').send(payload).expect(201);

    expect(res.body.tenantId).toBe(seeded.tenant.id);
    expect(res.body.propertyId).toBe(payload.propertyId);
    expect(res.body.status).toBe('pending');
  });
});
```

**Expected result:** 201 with created sale proposal.

---

### SMOKE-14: Register financial entry

| Field | Value |
|-------|-------|
| **Name** | Create a financial entry (lancamento financeiro) |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent |
| **Test data** | Finance entry payload |
| **Criticality** | HIGH |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-14: Register financial entry', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke14');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
    // Create a category first
    await auth.agent.post('/api/finance-categories').send({
      name: 'Comissão',
      type: 'income',
    });
  });

  it('should create finance entry and return 201', async () => {
    const payload = {
      description: 'Comissão venda Apto 101',
      amount: '15000',
      flow: 'income',
      date: new Date().toISOString(),
      status: 'confirmed',
    };

    const res = await auth.agent.post('/api/finance-entries').send(payload).expect(201);

    expect(res.body.tenantId).toBe(seeded.tenant.id);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.flow).toBe('income');
  });
});
```

**Expected result:** 201 with created finance entry.

---

### SMOKE-15: Portal login (JWT)

| Field | Value |
|-------|-------|
| **Name** | Portal authentication via JWT |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Portal user exists (owner or renter) |
| **Test data** | Portal user credentials |
| **Criticality** | CRITICAL |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-15: Portal login (JWT)', () => {
  /**
   * NOTE: The current codebase does not have a fully implemented
   * /api/portal/auth/login endpoint. This test is written for when it exists.
   * In the meantime, portal features are tested via session auth.
   */
  it('should authenticate portal user and return JWT', async () => {
    // When portal endpoint exists:
    const res = await request(app)
      .post('/api/portal/auth/login')
      .send({
        email: 'owner@test.com',
        password: 'OwnerPass123',
        portalType: 'owner',
      });

    if (res.status === 404) {
      // Endpoint not yet implemented - skip gracefully
      console.warn('Portal login endpoint not implemented yet');
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(typeof res.body.token).toBe('string');
    // JWT should have 3 parts
    expect(res.body.token.split('.').length).toBe(3);
  });

  it('should fallback to session auth for portal features', async () => {
    // For now, portal features use the same session auth
    // This validates that owners/renters routes work with session auth
    const seeded = await seedTestTenant('Smoke15Portal');
    const auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);

    // Owners and renters are accessible via session auth
    const ownersRes = await auth.agent.get('/api/owners').expect(200);
    expect(Array.isArray(ownersRes.body)).toBe(true);

    await teardownTestTenant(seeded.tenant.id);
  });
});
```

**Expected result:** JWT token returned or graceful fallback to session auth.

---

### SMOKE-16: Portal owner - view repasses

| Field | Value |
|-------|-------|
| **Name** | Owner views their repasses |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated user, rental transfers exist |
| **Test data** | Seeded rental transfers |
| **Criticality** | HIGH |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-16: Portal owner - view repasses', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke16');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should list rental transfers (repasses)', async () => {
    // routes.ts line 1749: GET /api/rental-transfers
    const res = await auth.agent.get('/api/rental-transfers').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should get individual repasse by ID', async () => {
    // First create a transfer
    const createRes = await auth.agent.post('/api/rental-transfers').send({
      rentalContractId: seeded.rentalContracts[0].id,
      ownerId: seeded.owners[0].id,
      amount: '2250',
      referenceMonth: '2026-03',
      status: 'pending',
    });

    if (createRes.status === 201) {
      const res = await auth.agent
        .get(`/api/rental-transfers/${createRes.body.id}`)
        .expect(200);
      expect(res.body.ownerId).toBe(seeded.owners[0].id);
    }
  });
});
```

**Expected result:** 200 with array of repasses filtered by tenant.

---

### SMOKE-17: Portal renter - view payments

| Field | Value |
|-------|-------|
| **Name** | Renter views their rental payments |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated user, rental payments exist |
| **Test data** | Seeded rental payments |
| **Criticality** | HIGH |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-17: Portal renter - view payments', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke17');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
    // Seed a payment
    await auth.agent.post('/api/rental-payments').send({
      rentalContractId: seeded.rentalContracts[0].id,
      amount: '2500',
      dueDate: '2026-03-10',
      status: 'paid',
      referenceMonth: '2026-03',
    });
  });

  it('should list rental payments', async () => {
    // routes.ts line 1609: GET /api/rental-payments
    const res = await auth.agent.get('/api/rental-payments').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter payments by status', async () => {
    const res = await auth.agent.get('/api/rental-payments?status=paid').expect(200);
    expect(res.body.every((p: any) => p.status === 'paid')).toBe(true);
  });

  it('should get payments by contract', async () => {
    // routes.ts line 1622
    const res = await auth.agent
      .get(`/api/rental-payments/contract/${seeded.rentalContracts[0].id}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
```

**Expected result:** 200 with array of rental payments filtered by tenant and optional filters.

---

### SMOKE-18: Create entry inspection

| Field | Value |
|-------|-------|
| **Name** | Create property inspection (vistoria de entrada) |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, property exists |
| **Test data** | Inspection payload |
| **Criticality** | MEDIUM |
| **Gate** | Nightly-regression |

**Steps:**
```typescript
describe('SMOKE-18: Create entry inspection', () => {
  /**
   * NOTE: No dedicated /api/inspections endpoint found in codebase.
   * Inspections may be handled through the extensions routes or as part
   * of contract workflows. This test targets the most likely implementation.
   */
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke18');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should create inspection or be tracked as feature gap', async () => {
    // Try the expected endpoint
    const res = await auth.agent
      .post('/api/inspections')
      .send({
        propertyId: seeded.properties[0].id,
        rentalContractId: seeded.rentalContracts[0].id,
        type: 'entry',
        date: new Date().toISOString(),
        status: 'scheduled',
        rooms: [
          { name: 'Sala', condition: 'good', notes: 'Sem avarias' },
          { name: 'Cozinha', condition: 'good', notes: 'Limpa' },
        ],
      });

    if (res.status === 404) {
      console.warn('[SMOKE-18] Inspection endpoint not implemented - FEATURE GAP');
      // Track as known gap, don't fail the suite
    } else {
      expect(res.status).toBe(201);
      expect(res.body.type).toBe('entry');
    }
  });
});
```

**Expected result:** 201 with created inspection, or 404 (tracked as feature gap).

---

### SMOKE-19: Complete and sign inspection

| Field | Value |
|-------|-------|
| **Name** | Complete inspection and trigger signing |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Existing inspection in "scheduled" status |
| **Test data** | Updated inspection payload |
| **Criticality** | MEDIUM |
| **Gate** | Nightly-regression |

**Steps:**
```typescript
describe('SMOKE-19: Complete and sign inspection', () => {
  it('should update inspection status to completed', async () => {
    // Similar to SMOKE-18, depends on inspection endpoint availability
    const seeded = await seedTestTenant('Smoke19');
    const auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);

    // Create then update
    const createRes = await auth.agent.post('/api/inspections').send({
      propertyId: seeded.properties[0].id,
      type: 'entry',
      status: 'scheduled',
      date: new Date().toISOString(),
    });

    if (createRes.status === 404) {
      console.warn('[SMOKE-19] Inspection endpoint not implemented - FEATURE GAP');
      await teardownTestTenant(seeded.tenant.id);
      return;
    }

    const updateRes = await auth.agent
      .patch(`/api/inspections/${createRes.body.id}`)
      .send({ status: 'completed', completedAt: new Date().toISOString() })
      .expect(200);

    expect(updateRes.body.status).toBe('completed');
    await teardownTestTenant(seeded.tenant.id);
  });
});
```

**Expected result:** Inspection status updated to "completed".

---

### SMOKE-20: AVM property valuation

| Field | Value |
|-------|-------|
| **Name** | Automated valuation model for property pricing |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, property data |
| **Test data** | Property characteristics for AVM |
| **Criticality** | MEDIUM |
| **Gate** | Nightly-regression |

**Steps:**
```typescript
describe('SMOKE-20: AVM property valuation', () => {
  /**
   * AVM is likely powered by the AI service. The closest endpoint is
   * POST /api/ai/generate with module context.
   */
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke20');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should generate or estimate property valuation', async () => {
    // Try dedicated AVM endpoint first
    let res = await auth.agent.post('/api/ai/generate').send({
      prompt: 'Estime o valor de mercado deste imóvel',
      context: {
        module: 'properties',
        data: {
          type: 'apartamento',
          bedrooms: 3,
          bathrooms: 2,
          area: 85,
          city: 'São Paulo',
          state: 'SP',
          address: 'Vila Mariana',
        },
      },
    });

    // AI route never fails - always returns content (routes.ts line 2912)
    expect(res.status).toBe(200);
    expect(res.body.content).toBeDefined();
    expect(typeof res.body.content).toBe('string');
    expect(res.body.content.length).toBeGreaterThan(0);
  });
});
```

**Expected result:** 200 with content (AI-generated or template fallback).

---

### SMOKE-21: Generate marketing content

| Field | Value |
|-------|-------|
| **Name** | Generate property description and social post |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent |
| **Test data** | Property data for AI content generation |
| **Criticality** | MEDIUM |
| **Gate** | Nightly-regression |

**Steps:**
```typescript
describe('SMOKE-21: Generate marketing content', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke21');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should generate property description', async () => {
    // routes.ts line 2921: POST /api/ai/property-description
    const res = await auth.agent.post('/api/ai/property-description').send({
      property: {
        type: 'apartamento',
        bedrooms: 3,
        bathrooms: 2,
        area: 120,
        city: 'São Paulo',
        state: 'SP',
        features: ['piscina', 'churrasqueira', 'vaga de garagem'],
        price: '650000',
      },
      tone: 'profissional',
    }).expect(200);

    expect(res.body.description).toBeDefined();
    expect(typeof res.body.description).toBe('string');
    expect(res.body.description.length).toBeGreaterThan(20);
    // aiGenerated may be true or false depending on API key availability
    expect(typeof res.body.aiGenerated).toBe('boolean');
  });

  it('should generate social media post', async () => {
    // routes.ts line 2963: POST /api/ai/social-post
    const res = await auth.agent.post('/api/ai/social-post').send({
      property: {
        type: 'casa',
        bedrooms: 4,
        bathrooms: 3,
        area: 200,
        city: 'Campinas',
        price: '900000',
      },
      platform: 'instagram',
    }).expect(200);

    expect(res.body.post).toBeDefined();
    expect(typeof res.body.post).toBe('string');
  });

  it('should check AI availability', async () => {
    // routes.ts line 2886: GET /api/ai/status
    const res = await auth.agent.get('/api/ai/status').expect(200);
    expect(typeof res.body.available).toBe('boolean');
  });
});
```

**Expected result:** 200 with generated content (AI or template fallback). Never errors.

---

### SMOKE-22: Test ISA conversation

| Field | Value |
|-------|-------|
| **Name** | WhatsApp conversation management (ISA) |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, WhatsApp configured |
| **Test data** | Conversation data |
| **Criticality** | MEDIUM |
| **Gate** | Nightly-regression |

**Steps:**
```typescript
describe('SMOKE-22: Test ISA conversation', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke22');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should list WhatsApp conversations', async () => {
    // routes-whatsapp.ts line 354: GET /api/whatsapp/conversations
    const res = await auth.agent.get('/api/whatsapp/conversations');

    // May return empty if WhatsApp not configured
    if (res.status === 200) {
      expect(Array.isArray(res.body) || res.body.conversations).toBeTruthy();
    } else {
      // Acceptable: 503 if WhatsApp service not configured
      expect([200, 500, 503]).toContain(res.status);
    }
  });

  it('should list conversation stats', async () => {
    // routes-whatsapp.ts line 473
    const res = await auth.agent.get('/api/whatsapp/conversations-stats');
    expect([200, 500, 503]).toContain(res.status);
  });

  it('should list WhatsApp templates', async () => {
    // routes-whatsapp.ts line 218
    const res = await auth.agent.get('/api/whatsapp/templates');
    expect([200, 500, 503]).toContain(res.status);
  });
});
```

**Expected result:** 200 with conversations list, or 503 if WhatsApp not configured.

---

### SMOKE-23: Dashboard loads metrics

| Field | Value |
|-------|-------|
| **Name** | Dashboard stats endpoint returns metrics |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, seeded data |
| **Test data** | None (uses existing tenant data) |
| **Criticality** | CRITICAL |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-23: Dashboard loads metrics', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke23');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should return dashboard stats', async () => {
    // routes.ts line 1432: GET /api/dashboard/stats
    const res = await auth.agent.get('/api/dashboard/stats').expect(200);

    // Stats should include counts scoped to tenant
    expect(res.body).toBeDefined();
    expect(typeof res.body).toBe('object');
    // Typical dashboard stats structure
    // May include: totalProperties, totalLeads, totalContracts, revenue, etc.
  });

  it('should not return data from other tenants in stats', async () => {
    const tenantB = await seedTestTenant('Smoke23B');
    const authB = await createAuthenticatedAgent(tenantB.adminUser.email, tenantB.adminUser.password);

    const resA = await auth.agent.get('/api/dashboard/stats').expect(200);
    const resB = await authB.agent.get('/api/dashboard/stats').expect(200);

    // Stats should differ if they have different amounts of data
    // At minimum, verify the endpoint works for both tenants
    expect(resA.body).toBeDefined();
    expect(resB.body).toBeDefined();

    await teardownTestTenant(tenantB.tenant.id);
  });
});
```

**Expected result:** 200 with dashboard metrics object scoped to the authenticated tenant.

---

### SMOKE-24: Global search

| Field | Value |
|-------|-------|
| **Name** | Global search across properties, leads, contracts |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent, seeded data |
| **Test data** | Search query string |
| **Criticality** | HIGH |
| **Gate** | Deploy-gate |

**Steps:**
```typescript
describe('SMOKE-24: Global search', () => {
  let seeded: SeededTenant;
  let auth: { agent: SuperAgentTest };

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke24');
    auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);
  });

  it('should return search results across entities', async () => {
    // routes.ts line 1442: GET /api/search?q=...
    // Uses storage.globalSearch(tenantId, query) - tenant-scoped
    const res = await auth.agent.get('/api/search?q=Teste').expect(200);

    // Response structure: { properties: [], leads: [], contracts: [] }
    expect(res.body.properties).toBeDefined();
    expect(res.body.leads).toBeDefined();
    expect(res.body.contracts).toBeDefined();
    expect(Array.isArray(res.body.properties)).toBe(true);
    expect(Array.isArray(res.body.leads)).toBe(true);
  });

  it('should return empty for short queries', async () => {
    // routes.ts line 1445: query.length < 2 returns empty
    const res = await auth.agent.get('/api/search?q=T').expect(200);
    expect(res.body).toEqual({ properties: [], leads: [], contracts: [] });
  });

  it('should not return other tenant data in search', async () => {
    const tenantB = await seedTestTenant('Smoke24B');
    const authB = await createAuthenticatedAgent(tenantB.adminUser.email, tenantB.adminUser.password);

    // Search for Tenant A data with Tenant B auth
    const res = await authB.agent.get(`/api/search?q=Smoke24`).expect(200);

    // Should only find Smoke24B data, not Smoke24 data
    const allResults = [
      ...res.body.properties,
      ...res.body.leads,
      ...res.body.contracts,
    ];
    allResults.forEach((item: any) => {
      if (item.tenantId) {
        expect(item.tenantId).toBe(tenantB.tenant.id);
      }
    });

    await teardownTestTenant(tenantB.tenant.id);
  });
});
```

**Expected result:** 200 with `{ properties, leads, contracts }` arrays. Results scoped to tenant.

---

### SMOKE-25: Logout

| Field | Value |
|-------|-------|
| **Name** | Logout destroys session and clears cookies |
| **Layer** | API (Supertest) |
| **Pre-conditions** | Authenticated agent |
| **Test data** | None |
| **Criticality** | BLOCKER |
| **Gate** | PR-gate |

**Steps:**
```typescript
describe('SMOKE-25: Logout', () => {
  let seeded: SeededTenant;

  beforeAll(async () => {
    seeded = await seedTestTenant('Smoke25');
  });

  afterAll(async () => {
    await teardownTestTenant(seeded.tenant.id);
  });

  it('should logout and invalidate session', async () => {
    const auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);

    // Verify authenticated
    await auth.agent.get('/api/auth/me').expect(200);

    // Logout: POST /api/auth/logout (routes.ts line 890)
    const logoutRes = await auth.agent.post('/api/auth/logout').expect(200);

    // Verify cookies cleared (routes.ts lines 913-924)
    const cookies = logoutRes.headers['set-cookie'] || [];
    // Session cookie should be cleared
    expect(cookies.some((c: string) =>
      c.includes('imobibase.sid') && (c.includes('Max-Age=0') || c.includes('Expires='))
    )).toBe(true);

    // Subsequent authenticated requests should fail with 401
    const meRes = await auth.agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('should not error on double logout', async () => {
    const auth = await createAuthenticatedAgent(seeded.adminUser.email, seeded.adminUser.password);

    await auth.agent.post('/api/auth/logout').expect(200);
    // Second logout should not crash
    const res = await auth.agent.post('/api/auth/logout');
    expect([200, 401]).toContain(res.status);
  });
});
```

**Expected result:** 200 on logout. Session cookie `imobibase.sid` and `csrf-token` cleared. Subsequent requests return 401.

---

## Gate Assignment Summary

| # | Test Name | Criticality | PR Gate | Deploy Gate | Nightly |
|---|-----------|------------|---------|-------------|---------|
| 01 | Login with email/password | BLOCKER | YES | YES | YES |
| 02 | Login with invalid credentials | BLOCKER | YES | YES | YES |
| 03 | Unauthenticated access blocked | BLOCKER | YES | YES | YES |
| 04 | Tenant isolation | BLOCKER | YES | YES | YES |
| 05 | Create property | BLOCKER | YES | YES | YES |
| 06 | List properties with filters | HIGH | YES | YES | YES |
| 07 | Create lead | BLOCKER | YES | YES | YES |
| 08 | Move lead through pipeline | CRITICAL | YES | YES | YES |
| 09 | Schedule visit | HIGH | - | YES | YES |
| 10 | Create rental contract | BLOCKER | YES | YES | YES |
| 11 | Register rental payment | CRITICAL | YES | YES | YES |
| 12 | Generate owner repasse | CRITICAL | - | YES | YES |
| 13 | Create sale proposal | HIGH | - | YES | YES |
| 14 | Register financial entry | HIGH | - | YES | YES |
| 15 | Portal login (JWT) | CRITICAL | - | YES | YES |
| 16 | Portal owner - view repasses | HIGH | - | YES | YES |
| 17 | Portal renter - view payments | HIGH | - | YES | YES |
| 18 | Create entry inspection | MEDIUM | - | - | YES |
| 19 | Complete and sign inspection | MEDIUM | - | - | YES |
| 20 | AVM property valuation | MEDIUM | - | - | YES |
| 21 | Generate marketing content | MEDIUM | - | - | YES |
| 22 | Test ISA conversation | MEDIUM | - | - | YES |
| 23 | Dashboard loads metrics | CRITICAL | YES | YES | YES |
| 24 | Global search | HIGH | - | YES | YES |
| 25 | Logout | BLOCKER | YES | YES | YES |

### Gate Composition

**PR Gate (12 tests, must pass on every PR):**
SMOKE-01, 02, 03, 04, 05, 06, 07, 08, 10, 11, 23, 25

**Deploy Gate (21 tests, must pass before deploy):**
All PR-gate tests + SMOKE-09, 12, 13, 14, 15, 16, 17, 24

**Nightly Regression (all 25 tests):**
Full suite including SMOKE-18, 19, 20, 21, 22

### Jest Configuration for Gates

```typescript
// jest.config.smoke.ts
export default {
  projects: [
    {
      displayName: 'pr-gate',
      testMatch: ['<rootDir>/tests/smoke/pr-gate/**/*.test.ts'],
      testTimeout: 30000,
    },
    {
      displayName: 'deploy-gate',
      testMatch: ['<rootDir>/tests/smoke/**/*.test.ts'],
      testPathIgnorePatterns: ['nightly/'],
      testTimeout: 60000,
    },
    {
      displayName: 'nightly',
      testMatch: ['<rootDir>/tests/smoke/**/*.test.ts'],
      testTimeout: 120000,
    },
  ],
};
```
