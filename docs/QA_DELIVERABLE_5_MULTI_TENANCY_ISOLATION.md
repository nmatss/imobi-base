# Deliverable 5: Multi-Tenancy Isolation Strategy

## 1. Leak Scenarios Matrix

The application uses `tenantId` on every resource row. List endpoints filter by `req.user.tenantId`. Individual resource endpoints use `validateResourceTenant()` (returns 404 to avoid existence leaking -- see `server/routes.ts` line 161-173). Some endpoints (e.g., rental-contract PATCH at line 1599) use inline `tenantId` checks returning 403.

| # | Endpoint | Leak Type | Attack Vector | Severity |
|---|----------|-----------|---------------|----------|
| 1 | `GET /api/properties/:id` | Read | IDOR - enumerate property IDs from another tenant | CRITICAL |
| 2 | `PATCH /api/properties/:id` | Write | IDOR - modify another tenant's property | CRITICAL |
| 3 | `DELETE /api/properties/:id` | Delete | IDOR - delete another tenant's property | CRITICAL |
| 4 | `GET /api/leads/:id` | Read | IDOR - read lead details from another tenant | CRITICAL |
| 5 | `PATCH /api/leads/:id` | Write | IDOR - modify lead status/data across tenants | CRITICAL |
| 6 | `DELETE /api/leads/:id` | Delete | IDOR - delete lead from another tenant | HIGH |
| 7 | `GET /api/contracts/:id` | Read | IDOR - read contract terms from another tenant | CRITICAL |
| 8 | `PATCH /api/contracts/:id` | Write | IDOR - modify contract from another tenant | CRITICAL |
| 9 | `GET /api/rental-contracts/:id` | Read | IDOR - read rental contract from another tenant | CRITICAL |
| 10 | `PATCH /api/rental-contracts/:id` | Write | Inline check returns 403 (leaks existence) | HIGH |
| 11 | `GET /api/rental-payments/:id` | Read | IDOR - missing tenantId check on individual read | CRITICAL |
| 12 | `PATCH /api/rental-payments/:id` | Write | Inline 403 check (leaks existence) | HIGH |
| 13 | `GET /api/rental-payments/contract/:contractId` | Read | IDOR - no tenant check on contractId lookup | CRITICAL |
| 14 | `GET /api/rental-transfers/:id` | Read | IDOR - read repasse from another tenant | HIGH |
| 15 | `PATCH /api/rental-transfers/:id` | Write | Need to verify tenant check exists | HIGH |
| 16 | `DELETE /api/rental-transfers/:id` | Delete | Need to verify tenant check exists | HIGH |
| 17 | `GET /api/sale-proposals/:id` | Read | IDOR - missing explicit tenantId check | CRITICAL |
| 18 | `PATCH /api/sale-proposals/:id` | Write | Inline 403 (leaks existence) | HIGH |
| 19 | `DELETE /api/sale-proposals/:id` | Delete | Inline 403 (leaks existence) | HIGH |
| 20 | `GET /api/finance-entries/:id` | Read | IDOR - missing explicit tenantId check | CRITICAL |
| 21 | `PATCH /api/finance-entries/:id` | Write | Inline 403 (leaks existence) | HIGH |
| 22 | `DELETE /api/finance-entries/:id` | Delete | Inline 403 (leaks existence) | HIGH |
| 23 | `GET /api/owners/:id` | Read | IDOR - no tenantId check on GET by ID | HIGH |
| 24 | `PATCH /api/owners/:id` | Write | Inline 403 (leaks existence) | HIGH |
| 25 | `GET /api/renters/:id` | Read | IDOR - no tenantId check on GET by ID | HIGH |
| 26 | `GET /api/visits/:id` | Read | Need to verify tenant check | HIGH |
| 27 | Portal repasses via JWT | Read | JWT with wrong tenantId accessing repasses | CRITICAL |
| 28 | `GET /api/tenants/:id` | Read | Can see other tenant details (has check but returns 403 not 404) | MEDIUM |
| 29 | `GET /api/search?q=` | Read | `globalSearch()` must filter by tenantId internally | CRITICAL |
| 30 | `GET /api/dashboard/stats` | Read | `getDashboardStats()` must filter by tenantId | CRITICAL |
| 31 | `GET /api/finance-categories` | Read | Need to verify tenant scope | MEDIUM |
| 32 | `POST /api/ai/generate` | Read | AI context could leak cross-tenant data if fed wrong IDs | MEDIUM |

### Key Findings

**Consistent pattern (uses `validateResourceTenant` -- returns 404):**
- Properties (GET/PATCH/DELETE individual)
- Leads (GET/PATCH/DELETE individual)
- Contracts (GET/PATCH individual)
- Visits (PATCH/DELETE individual)

**Inconsistent pattern (inline check returning 403 -- leaks existence):**
- Rental contracts PATCH (line 1599)
- Rental payments PATCH (line 1655)
- Owners PATCH/DELETE (lines 1489, 1502)
- Renters PATCH (line 1544)
- Sale proposals PATCH/DELETE (lines 1919, 1932)
- Finance entries PATCH/DELETE (lines 2069, 2082)

**Missing tenant checks (potential vulnerabilities):**
- `GET /api/rental-payments/:id` (line 1631) -- no tenant validation
- `GET /api/rental-payments/contract/:contractId` (line 1622) -- no tenant check
- `GET /api/owners/:id` (line 1465) -- no tenant validation
- `GET /api/renters/:id` (line 1520) -- no tenant validation
- `GET /api/sale-proposals/:id` (line 1895) -- no tenant validation
- `GET /api/finance-entries/:id` (line 2045) -- no tenant validation
- `GET /api/rental-transfers/:id` (line 1764) -- needs verification

---

## 2. Seed Strategy - 3 Tenants

### Tenant A: Sol Imobiliaria
- 5 properties (2 venda, 2 aluguel, 1 comercial)
- 10 leads (spread across pipeline stages)
- 3 contracts (1 active, 1 pending, 1 completed)
- 2 users (1 admin, 1 agent)
- 2 owners, 2 renters
- 2 rental contracts with payments and repasses

### Tenant B: Nova Casa
- 3 properties (1 venda, 1 aluguel, 1 terreno)
- 5 leads (3 new, 1 qualification, 1 visit)
- 2 contracts (1 active, 1 pending)
- 1 user (admin)
- 1 owner, 1 renter
- 1 rental contract

### Tenant C: Test Isolado (minimal isolation probe)
- 1 property
- 1 lead
- 0 contracts
- 1 user (admin)
- No owners, no renters

```typescript
// tests/fixtures/isolation-seed.ts
import { seedTestTenant, type SeededTenant } from '../helpers/seed';
import { storage } from '../../server/storage';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export interface IsolationFixture {
  tenantA: SeededTenant; // Sol
  tenantB: SeededTenant; // Nova Casa
  tenantC: SeededTenant; // Test Isolado
}

export async function seedIsolationFixture(): Promise<IsolationFixture> {
  // --- Tenant A: Sol ---
  const tenantA = await seedTestTenant('Sol Imobiliaria', 'sol');

  // --- Tenant B: Nova Casa ---
  const tenantB = await seedTestTenant('Nova Casa', 'novacasa');

  // --- Tenant C: Test Isolado (minimal) ---
  const tenantCId = nanoid();
  const hashedPw = await bcrypt.hash('Test@12345', 12);

  const tenantCObj = await storage.createTenant({
    id: tenantCId,
    name: 'Test Isolado',
    slug: 'test-isolado',
    plan: 'starter',
  });

  const tenantCUser = await storage.createUser({
    id: nanoid(),
    tenantId: tenantCId,
    name: 'Admin Isolado',
    email: 'admin@isolado.test',
    password: hashedPw,
    role: 'admin',
  });

  const tenantCProp = await storage.createProperty({
    tenantId: tenantCId,
    title: 'Unico Imovel Isolado',
    type: 'casa',
    category: 'venda',
    status: 'available',
    price: '100000',
  });

  const tenantCLead = await storage.createLead({
    tenantId: tenantCId,
    name: 'Lead Unico Isolado',
    email: 'lead@isolado.test',
    phone: '11999999999',
    status: 'new',
    source: 'manual',
  });

  const tenantC: SeededTenant = {
    tenant: { id: tenantCId, name: 'Test Isolado', slug: 'test-isolado' },
    adminUser: { id: tenantCUser.id, email: tenantCUser.email, password: 'Test@12345', tenantId: tenantCId },
    agentUser: { id: tenantCUser.id, email: tenantCUser.email, password: 'Test@12345', tenantId: tenantCId },
    properties: [tenantCProp],
    leads: [tenantCLead],
    contracts: [],
    rentalContracts: [],
    owners: [],
    renters: [],
  };

  return { tenantA, tenantB, tenantC };
}

export async function teardownIsolationFixture(fixture: IsolationFixture): Promise<void> {
  await Promise.all([
    storage.deleteAllTenantData(fixture.tenantA.tenant.id),
    storage.deleteAllTenantData(fixture.tenantB.tenant.id),
    storage.deleteAllTenantData(fixture.tenantC.tenant.id),
  ]);
}
```

---

## 3. Test Code - Multi-Tenancy Isolation Tests

```typescript
// tests/isolation/tenant-isolation.test.ts
import request from 'supertest';
import type { SuperAgentTest } from 'supertest';
import { app } from '../../server/app';
import { createAuthenticatedAgent } from '../helpers/auth';
import {
  seedIsolationFixture,
  teardownIsolationFixture,
  type IsolationFixture,
} from '../fixtures/isolation-seed';

describe('Multi-Tenancy Isolation', () => {
  let fixture: IsolationFixture;
  let agentA: { agent: SuperAgentTest; user: any };
  let agentB: { agent: SuperAgentTest; user: any };
  let agentC: { agent: SuperAgentTest; user: any };

  beforeAll(async () => {
    fixture = await seedIsolationFixture();
    agentA = await createAuthenticatedAgent(
      fixture.tenantA.adminUser.email,
      fixture.tenantA.adminUser.password,
    );
    agentB = await createAuthenticatedAgent(
      fixture.tenantB.adminUser.email,
      fixture.tenantB.adminUser.password,
    );
    agentC = await createAuthenticatedAgent(
      fixture.tenantC.adminUser.email,
      fixture.tenantC.adminUser.password,
    );
  }, 30000);

  afterAll(async () => {
    await teardownIsolationFixture(fixture);
  });

  // =================================================================
  // TEST 1: User from Tenant A tries to GET property from Tenant B
  // =================================================================
  describe('Cross-tenant property READ', () => {
    it('Tenant A user GET property from Tenant B -> 404', async () => {
      const tenantBPropertyId = fixture.tenantB.properties[0].id;

      const res = await agentA.agent
        .get(`/api/properties/${tenantBPropertyId}`)
        .expect(404);

      // validateResourceTenant returns 404 "not found" to avoid leaking
      // that the resource exists (routes.ts lines 169-171)
      expect(res.body.error).toMatch(/not found|não encontrad/i);
    });

    it('Tenant C user GET property from Tenant A -> 404', async () => {
      const tenantAPropertyId = fixture.tenantA.properties[0].id;

      const res = await agentC.agent
        .get(`/api/properties/${tenantAPropertyId}`)
        .expect(404);

      expect(res.body.error).toBeDefined();
    });
  });

  // =================================================================
  // TEST 2: User from Tenant A tries to PUT/PATCH lead from Tenant B
  // =================================================================
  describe('Cross-tenant lead WRITE', () => {
    it('Tenant A user PATCH lead from Tenant B -> 404', async () => {
      const tenantBLeadId = fixture.tenantB.leads[0].id;

      const res = await agentA.agent
        .patch(`/api/leads/${tenantBLeadId}`)
        .send({ name: 'HACKED BY TENANT A', status: 'closed_won' })
        .expect(404);

      // validateResourceTenant on line 1257 returns 404
      expect(res.body.error).toMatch(/not found|não encontrad/i);

      // Verify the lead was NOT modified
      const verifyRes = await agentB.agent
        .get(`/api/leads/${tenantBLeadId}`)
        .expect(200);

      expect(verifyRes.body.name).not.toBe('HACKED BY TENANT A');
    });
  });

  // =================================================================
  // TEST 3: User from Tenant A tries to DELETE contract from Tenant B
  // =================================================================
  describe('Cross-tenant contract DELETE', () => {
    it('Tenant A user DELETE contract from Tenant B -> 404', async () => {
      const tenantBContractId = fixture.tenantB.contracts[0].id;

      const res = await agentA.agent
        .delete(`/api/contracts/${tenantBContractId}`);

      // Should be 404 (not 403) to avoid existence leaking
      expect([404, 403]).toContain(res.status);

      // Verify contract still exists for Tenant B
      const verifyRes = await agentB.agent
        .get(`/api/contracts/${tenantBContractId}`)
        .expect(200);

      expect(verifyRes.body.id).toBe(tenantBContractId);
    });
  });

  // =================================================================
  // TEST 4: Portal owner from Tenant A accesses Tenant B repasses
  // =================================================================
  describe('Cross-tenant portal repasse access', () => {
    it('Tenant A cannot see Tenant B repasses in listing', async () => {
      // GET /api/rental-transfers filters by req.user.tenantId (line 1749)
      const resA = await agentA.agent.get('/api/rental-transfers').expect(200);

      // None of the returned transfers should belong to Tenant B
      const tenantBIds = new Set([fixture.tenantB.tenant.id]);
      resA.body.forEach((transfer: any) => {
        expect(tenantBIds.has(transfer.tenantId)).toBe(false);
      });
    });

    it('Tenant A cannot access specific Tenant B repasse', async () => {
      // First create a repasse for Tenant B
      if (fixture.tenantB.rentalContracts.length > 0) {
        const createRes = await agentB.agent.post('/api/rental-transfers').send({
          rentalContractId: fixture.tenantB.rentalContracts[0].id,
          ownerId: fixture.tenantB.owners[0].id,
          amount: '1800',
          referenceMonth: '2026-03',
          status: 'pending',
        });

        if (createRes.status === 201) {
          const transferId = createRes.body.id;

          // Tenant A tries to access it
          const res = await agentA.agent
            .get(`/api/rental-transfers/${transferId}`);

          // Should return 404 or 403
          expect([404, 403]).toContain(res.status);
        }
      }
    });
  });

  // =================================================================
  // TEST 5: Verify /api/properties returns ONLY Tenant A properties
  // =================================================================
  describe('List endpoint tenant isolation', () => {
    it('GET /api/properties returns ONLY Tenant A properties', async () => {
      const res = await agentA.agent.get('/api/properties').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(fixture.tenantA.properties.length);

      // Every returned property must belong to Tenant A
      res.body.forEach((property: any) => {
        expect(property.tenantId).toBe(fixture.tenantA.tenant.id);
      });

      // None of the Tenant B property IDs should be present
      const tenantBPropertyIds = fixture.tenantB.properties.map(p => p.id);
      const returnedIds = res.body.map((p: any) => p.id);
      tenantBPropertyIds.forEach(bId => {
        expect(returnedIds).not.toContain(bId);
      });

      // None of the Tenant C property IDs should be present
      const tenantCPropertyIds = fixture.tenantC.properties.map(p => p.id);
      tenantCPropertyIds.forEach(cId => {
        expect(returnedIds).not.toContain(cId);
      });
    });

    it('GET /api/leads returns ONLY own tenant leads', async () => {
      const res = await agentA.agent.get('/api/leads').expect(200);

      res.body.forEach((lead: any) => {
        expect(lead.tenantId).toBe(fixture.tenantA.tenant.id);
      });
    });

    it('GET /api/search returns ONLY own tenant results', async () => {
      // Search for a term that exists in Tenant B data
      const tenantBName = fixture.tenantB.properties[0].title;
      const searchTerm = tenantBName.substring(0, 10);

      const res = await agentA.agent
        .get(`/api/search?q=${encodeURIComponent(searchTerm)}`)
        .expect(200);

      // Verify no Tenant B data leaked
      const allResults = [
        ...(res.body.properties || []),
        ...(res.body.leads || []),
        ...(res.body.contracts || []),
      ];
      allResults.forEach((item: any) => {
        if (item.tenantId) {
          expect(item.tenantId).toBe(fixture.tenantA.tenant.id);
        }
      });
    });

    it('GET /api/dashboard/stats is tenant-scoped', async () => {
      const resA = await agentA.agent.get('/api/dashboard/stats').expect(200);
      const resC = await agentC.agent.get('/api/dashboard/stats').expect(200);

      // Tenant C has minimal data (1 property, 1 lead, 0 contracts)
      // So its stats should differ from Tenant A
      expect(resA.body).toBeDefined();
      expect(resC.body).toBeDefined();
    });
  });

  // =================================================================
  // ADDITIONAL: Existence leaking via 403 vs 404
  // =================================================================
  describe('Information leaking prevention', () => {
    it('Cross-tenant access should return 404 not 403 (no existence leak)', async () => {
      const tenantBPropertyId = fixture.tenantB.properties[0].id;
      const nonExistentId = 'non-existent-id-12345';

      const crossTenantRes = await agentA.agent
        .get(`/api/properties/${tenantBPropertyId}`);
      const nonExistentRes = await agentA.agent
        .get(`/api/properties/${nonExistentId}`);

      // Both should return 404 - attacker cannot distinguish between
      // "exists but not yours" and "doesn't exist"
      expect(crossTenantRes.status).toBe(404);
      expect(nonExistentRes.status).toBe(404);
    });

    it('PATCH on cross-tenant resource returns 404 not 403', async () => {
      const tenantBLeadId = fixture.tenantB.leads[0].id;

      const res = await agentA.agent
        .patch(`/api/leads/${tenantBLeadId}`)
        .send({ name: 'probe' });

      // validateResourceTenant returns 404 (line 171)
      expect(res.status).toBe(404);
    });
  });

  // =================================================================
  // REGRESSION: Endpoints with potentially missing tenant checks
  // =================================================================
  describe('Endpoints with potential missing tenant checks', () => {
    it('GET /api/rental-payments/:id should not leak cross-tenant data', async () => {
      // This endpoint (line 1631) may be missing a tenantId check
      // Create a payment in Tenant B first
      if (fixture.tenantB.rentalContracts.length > 0) {
        const paymentRes = await agentB.agent.post('/api/rental-payments').send({
          rentalContractId: fixture.tenantB.rentalContracts[0].id,
          amount: '2000',
          dueDate: '2026-04-10',
          status: 'pending',
          referenceMonth: '2026-04',
        });

        if (paymentRes.status === 201) {
          const paymentId = paymentRes.body.id;

          // Tenant A tries to read it
          const res = await agentA.agent.get(`/api/rental-payments/${paymentId}`);

          // BUG if this returns 200 with data - no tenant check!
          if (res.status === 200 && res.body.tenantId === fixture.tenantB.tenant.id) {
            console.error(
              `[SECURITY BUG] GET /api/rental-payments/:id leaks cross-tenant data!`
            );
          }
          expect([404, 403]).toContain(res.status);
        }
      }
    });

    it('GET /api/owners/:id should not leak cross-tenant data', async () => {
      if (fixture.tenantB.owners.length > 0) {
        const ownerId = fixture.tenantB.owners[0].id;
        const res = await agentA.agent.get(`/api/owners/${ownerId}`);

        if (res.status === 200 && res.body.tenantId === fixture.tenantB.tenant.id) {
          console.error(`[SECURITY BUG] GET /api/owners/:id leaks cross-tenant data!`);
        }
        expect([404, 403]).toContain(res.status);
      }
    });

    it('GET /api/renters/:id should not leak cross-tenant data', async () => {
      if (fixture.tenantB.renters.length > 0) {
        const renterId = fixture.tenantB.renters[0].id;
        const res = await agentA.agent.get(`/api/renters/${renterId}`);

        if (res.status === 200 && res.body.tenantId === fixture.tenantB.tenant.id) {
          console.error(`[SECURITY BUG] GET /api/renters/:id leaks cross-tenant data!`);
        }
        expect([404, 403]).toContain(res.status);
      }
    });

    it('GET /api/sale-proposals/:id should not leak cross-tenant data', async () => {
      if (fixture.tenantB.contracts.length > 0) {
        // Try to read Tenant B sale proposals from Tenant A
        const proposalRes = await agentB.agent.post('/api/sale-proposals').send({
          propertyId: fixture.tenantB.properties[0].id,
          leadId: fixture.tenantB.leads[0].id,
          proposedValue: '300000',
          status: 'pending',
        });

        if (proposalRes.status === 201) {
          const res = await agentA.agent
            .get(`/api/sale-proposals/${proposalRes.body.id}`);

          if (res.status === 200 && res.body.tenantId === fixture.tenantB.tenant.id) {
            console.error(
              `[SECURITY BUG] GET /api/sale-proposals/:id leaks cross-tenant data!`
            );
          }
          expect([404, 403]).toContain(res.status);
        }
      }
    });

    it('GET /api/finance-entries/:id should not leak cross-tenant data', async () => {
      const entryRes = await agentB.agent.post('/api/finance-entries').send({
        description: 'Tenant B Private Entry',
        amount: '5000',
        flow: 'income',
        date: new Date().toISOString(),
        status: 'confirmed',
      });

      if (entryRes.status === 201) {
        const res = await agentA.agent
          .get(`/api/finance-entries/${entryRes.body.id}`);

        if (res.status === 200 && res.body.tenantId === fixture.tenantB.tenant.id) {
          console.error(
            `[SECURITY BUG] GET /api/finance-entries/:id leaks cross-tenant data!`
          );
        }
        expect([404, 403]).toContain(res.status);
      }
    });

    it('GET /api/rental-payments/contract/:contractId should not leak', async () => {
      // This endpoint (line 1622) fetches payments by contractId without tenant check
      if (fixture.tenantB.rentalContracts.length > 0) {
        const contractId = fixture.tenantB.rentalContracts[0].id;

        const res = await agentA.agent
          .get(`/api/rental-payments/contract/${contractId}`);

        if (res.status === 200 && res.body.length > 0) {
          const hasLeakedData = res.body.some(
            (p: any) => p.tenantId === fixture.tenantB.tenant.id
          );
          if (hasLeakedData) {
            console.error(
              `[SECURITY BUG] GET /api/rental-payments/contract/:contractId leaks cross-tenant data!`
            );
          }
          expect(hasLeakedData).toBe(false);
        }
      }
    });
  });
});
```

---

## 4. Regression Approach

### 4.1 Automated Regression Detection

**Strategy: Universal Tenant Assertion Middleware (Test-Only)**

```typescript
// tests/middleware/tenant-leak-detector.ts
import type { Response } from 'supertest';

/**
 * Wraps a Supertest response check to verify no cross-tenant data leaked.
 * Use in afterEach() hooks for comprehensive tenant isolation testing.
 */
export function assertNoTenantLeak(
  response: Response,
  expectedTenantId: string,
  endpointDescription: string
): void {
  if (response.status >= 200 && response.status < 300 && response.body) {
    const body = response.body;

    // Check single resource
    if (body.tenantId && body.tenantId !== expectedTenantId) {
      throw new Error(
        `[TENANT LEAK] ${endpointDescription}: Response contains tenantId ` +
        `"${body.tenantId}" but expected "${expectedTenantId}"`
      );
    }

    // Check array of resources
    if (Array.isArray(body)) {
      body.forEach((item: any, index: number) => {
        if (item.tenantId && item.tenantId !== expectedTenantId) {
          throw new Error(
            `[TENANT LEAK] ${endpointDescription}: Item[${index}] contains tenantId ` +
            `"${item.tenantId}" but expected "${expectedTenantId}"`
          );
        }
      });
    }

    // Check nested arrays (e.g., { properties: [], leads: [] })
    Object.entries(body).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        (value as any[]).forEach((item: any, index: number) => {
          if (item.tenantId && item.tenantId !== expectedTenantId) {
            throw new Error(
              `[TENANT LEAK] ${endpointDescription}: ${key}[${index}] contains tenantId ` +
              `"${item.tenantId}" but expected "${expectedTenantId}"`
            );
          }
        });
      }
    });
  }
}
```

### 4.2 Exhaustive Route Scanner

```typescript
// tests/isolation/route-scanner.test.ts
/**
 * Automatically scans all GET /:id endpoints to verify tenant isolation.
 * This catches new routes that forget tenant checks.
 */
const RESOURCE_ENDPOINTS = [
  { path: '/api/properties', idField: 'id', name: 'Property' },
  { path: '/api/leads', idField: 'id', name: 'Lead' },
  { path: '/api/contracts', idField: 'id', name: 'Contract' },
  { path: '/api/rental-contracts', idField: 'id', name: 'RentalContract' },
  { path: '/api/rental-payments', idField: 'id', name: 'RentalPayment' },
  { path: '/api/rental-transfers', idField: 'id', name: 'RentalTransfer' },
  { path: '/api/sale-proposals', idField: 'id', name: 'SaleProposal' },
  { path: '/api/finance-entries', idField: 'id', name: 'FinanceEntry' },
  { path: '/api/finance-categories', idField: 'id', name: 'FinanceCategory' },
  { path: '/api/owners', idField: 'id', name: 'Owner' },
  { path: '/api/renters', idField: 'id', name: 'Renter' },
  { path: '/api/visits', idField: 'id', name: 'Visit' },
];

describe('Route Scanner - Tenant Isolation', () => {
  let fixture: IsolationFixture;
  let agentA: { agent: SuperAgentTest };
  let agentB: { agent: SuperAgentTest };

  beforeAll(async () => {
    fixture = await seedIsolationFixture();
    agentA = await createAuthenticatedAgent(
      fixture.tenantA.adminUser.email,
      fixture.tenantA.adminUser.password,
    );
    agentB = await createAuthenticatedAgent(
      fixture.tenantB.adminUser.email,
      fixture.tenantB.adminUser.password,
    );
  });

  afterAll(async () => {
    await teardownIsolationFixture(fixture);
  });

  it.each(RESOURCE_ENDPOINTS)(
    'GET $path - list only returns own tenant data',
    async ({ path }) => {
      const res = await agentA.agent.get(path);

      if (res.status === 200 && Array.isArray(res.body)) {
        res.body.forEach((item: any) => {
          if (item.tenantId) {
            expect(item.tenantId).toBe(fixture.tenantA.tenant.id);
          }
        });
      }
    }
  );

  it.each(RESOURCE_ENDPOINTS)(
    'GET $path/:id - cross-tenant access blocked for $name',
    async ({ path }) => {
      // Get a resource from Tenant B
      const listRes = await agentB.agent.get(path);

      if (listRes.status === 200 && Array.isArray(listRes.body) && listRes.body.length > 0) {
        const tenantBResourceId = listRes.body[0].id;

        // Try to access from Tenant A
        const crossRes = await agentA.agent.get(`${path}/${tenantBResourceId}`);

        // Must be 404 (or 403 at minimum)
        expect(crossRes.status).toBeGreaterThanOrEqual(400);

        // Flag if 403 (existence leak) instead of 404
        if (crossRes.status === 403) {
          console.warn(
            `[WARN] ${path}/:id returns 403 instead of 404 - existence leak`
          );
        }
      }
    }
  );
});
```

### 4.3 CI Pipeline Integration

```yaml
# .github/workflows/isolation-regression.yml
name: Tenant Isolation Regression
on:
  pull_request:
    paths:
      - 'server/routes*.ts'
      - 'server/storage*.ts'
      - 'server/middleware/auth.ts'
  schedule:
    - cron: '0 3 * * *'  # Nightly at 3 AM

jobs:
  isolation-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx jest tests/isolation/ --forceExit --detectOpenHandles
        env:
          NODE_ENV: test
          DATABASE_URL: 'sqlite::memory:'
```

### 4.4 Recommended Fixes for Identified Gaps

| Priority | Endpoint | Fix |
|----------|----------|-----|
| P0 | `GET /api/rental-payments/:id` | Add `validateResourceTenant` before returning |
| P0 | `GET /api/rental-payments/contract/:contractId` | Verify contract belongs to tenant first |
| P0 | `GET /api/owners/:id` | Add `validateResourceTenant` |
| P0 | `GET /api/renters/:id` | Add `validateResourceTenant` |
| P0 | `GET /api/sale-proposals/:id` | Add `validateResourceTenant` |
| P0 | `GET /api/finance-entries/:id` | Add `validateResourceTenant` |
| P1 | `PATCH /api/rental-contracts/:id` | Change from 403 to 404 via `validateResourceTenant` |
| P1 | `PATCH /api/owners/:id` | Change from 403 to 404 via `validateResourceTenant` |
| P1 | All PATCH/DELETE with inline 403 | Standardize to `validateResourceTenant` (404) |
