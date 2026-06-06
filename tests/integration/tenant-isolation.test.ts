/**
 * Tenant Isolation (IDOR) — Integração REAL
 *
 * Substitui a antiga suíte fake (tests/integration/security/sql-injection.test.ts
 * usava um MockDatabase em memória e não tocava o código real). Aqui:
 *
 *  - Subimos o ROUTER REAL do projeto (`registerRoutes` de server/routes.ts) com
 *    o STORAGE REAL (server/storage.ts) contra um banco SQLite de TESTE isolado,
 *    criado a partir da migration oficial migrations-sqlite/0000_parallel_orphan.sql.
 *  - Fazemos seed de DOIS tenants (A e B), um usuário em cada e recursos em cada
 *    (property, lead, finance-entry, sale-proposal, rental-contract + filhos do
 *    lead: interactions/follow-ups/tags).
 *  - Autenticamos como o usuário do tenant A via /api/auth/login mantendo a
 *    sessão com supertest.agent e o token CSRF (Double Submit Cookie).
 *  - Asserção central: como tenant A, GET/PATCH/DELETE de qualquer recurso :id
 *    do tenant B NÃO pode vazar o recurso. As correções de IDOR em server/routes.ts
 *    retornam 404 (algumas rotas retornam 403). Aceitamos {403,404} e garantimos
 *    que NUNCA é 200 com o recurso do outro tenant.
 *
 * Importante: as importações de server/* são DINÂMICAS dentro do helper, feitas
 * só depois de recriar o banco, porque server/db.ts abre o arquivo SQLite fixo
 * no momento do import.
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "vitest";
import request from "supertest";
import type { Express } from "express";
import bcrypt from "bcryptjs";
import {
  prepareTestEnv,
  setupFreshDatabase,
  restoreDatabase,
  buildRealApp,
  flushRateLimitKeys,
} from "../helpers/tenant-isolation-app";

// Precisa rodar ANTES de qualquer import de server/* (feito dentro de buildRealApp).
prepareTestEnv();

interface SeededResources {
  tenantId: string;
  userEmail: string;
  userPassword: string;
  propertyId: string;
  leadId: string;
  financeEntryId: string;
  saleProposalId: string;
  rentalContractId: string;
  followUpId: string;
  leadTagId: string;
}

describe("Tenant Isolation (IDOR) — REAL app + REAL storage", () => {
  let app: Express;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage: any;
  let closeDb: () => Promise<void>;

  let tenantA: SeededResources;
  let tenantB: SeededResources;

  // Agente autenticado como usuário do tenant A (mantém cookies de sessão + CSRF).
  let agentA: ReturnType<typeof request.agent>;
  let csrfTokenA: string;

  const PASSWORD = "SenhaForteDeTeste123!";

  async function seedTenant(label: string): Promise<SeededResources> {
    const tenant = await storage.createTenant({
      name: `Imobiliária ${label}`,
      slug: `imob-${label.toLowerCase()}-${Date.now()}-${Math.floor(
        Math.random() * 1e6,
      )}`,
      primaryColor: "#0066cc",
      secondaryColor: "#333333",
      email: `contato-${label.toLowerCase()}@example.com`,
    });

    const userEmail = `user-${label.toLowerCase()}-${Date.now()}@example.com`;
    const hashed = await bcrypt.hash(PASSWORD, 10);
    await storage.createUser({
      tenantId: tenant.id,
      name: `Corretor ${label}`,
      email: userEmail,
      password: hashed,
      role: "admin",
    });

    const property = await storage.createProperty({
      tenantId: tenant.id,
      title: `Casa do tenant ${label}`,
      type: "house",
      category: "sale",
      price: "500000",
      address: "Rua das Flores, 100",
      city: "São Paulo",
      state: "SP",
      status: "available",
    });

    const lead = await storage.createLead({
      tenantId: tenant.id,
      name: `Lead ${label}`,
      email: `lead-${label.toLowerCase()}@example.com`,
      phone: "11999990000",
      source: "site",
      status: "new",
    });

    const financeEntry = await storage.createFinanceEntry({
      tenantId: tenant.id,
      description: `Comissão tenant ${label}`,
      amount: "1500",
      flow: "in",
      entryDate: new Date().toISOString(),
      status: "completed",
    });

    const saleProposal = await storage.createSaleProposal({
      tenantId: tenant.id,
      propertyId: property.id,
      leadId: lead.id,
      proposedValue: "480000",
      status: "pending",
    });

    // rental_contract exige owner + renter (FKs notNull).
    const owner = await storage.createOwner({
      tenantId: tenant.id,
      name: `Proprietário ${label}`,
      phone: "11988887777",
    });
    const renter = await storage.createRenter({
      tenantId: tenant.id,
      name: `Inquilino ${label}`,
      phone: "11977776666",
    });
    const rentalContract = await storage.createRentalContract({
      tenantId: tenant.id,
      propertyId: property.id,
      ownerId: owner.id,
      renterId: renter.id,
      rentValue: "3000",
      dueDay: 10,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
      status: "active",
    });

    const followUp = await storage.createFollowUp({
      tenantId: tenant.id,
      leadId: lead.id,
      dueAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      type: "call",
      status: "pending",
    });

    const leadTag = await storage.createLeadTag({
      tenantId: tenant.id,
      name: `Quente ${label}`,
      color: "#ff0000",
    });

    return {
      tenantId: tenant.id,
      userEmail,
      userPassword: PASSWORD,
      propertyId: property.id,
      leadId: lead.id,
      financeEntryId: financeEntry.id,
      saleProposalId: saleProposal.id,
      rentalContractId: rentalContract.id,
      followUpId: followUp.id,
      leadTagId: leadTag.id,
    };
  }

  beforeAll(async () => {
    // Re-aplica o env aqui também: tests/setup.ts roda seu próprio beforeAll
    // (global) e pode ter sobrescrito SESSION_SECRET com um valor curto.
    prepareTestEnv();
    setupFreshDatabase();
    const built = await buildRealApp();
    app = built.app;
    storage = built.storage;
    closeDb = built.closeDb;

    tenantA = await seedTenant("A");
    tenantB = await seedTenant("B");

    // Reseta contadores de rate-limit (Redis compartilhado) para evitar 429.
    await flushRateLimitKeys();

    // Login como usuário do tenant A. /api/auth/login é CSRF-excluded.
    agentA = request.agent(app);
    const loginRes = await agentA
      .post("/api/auth/login")
      .send({ email: tenantA.userEmail, password: tenantA.userPassword });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.tenantId).toBe(tenantA.tenantId);
    // O token CSRF volta no corpo para uso no header X-CSRF-Token (cookie httpOnly
    // de mesmo valor é guardado automaticamente pelo agent).
    csrfTokenA = loginRes.body.csrfToken;
    expect(csrfTokenA).toBeTruthy();
  }, 30000);

  afterAll(async () => {
    try {
      if (closeDb) await closeDb();
    } finally {
      restoreDatabase();
    }
  });

  // ---- Sanidade: o agente do tenant A enxerga os PRÓPRIOS recursos ----
  describe("Sanidade — tenant A acessa os próprios recursos", () => {
    it("login estabeleceu sessão válida (GET /api/auth/me)", async () => {
      const res = await agentA.get("/api/auth/me");
      expect(res.status).toBe(200);
      // /api/auth/me usa apiResponse: { success, data: { user, tenant } }.
      expect(res.body.data.user.tenantId).toBe(tenantA.tenantId);
    });

    it("GET próprio property retorna 200", async () => {
      const res = await agentA.get(`/api/properties/${tenantA.propertyId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tenantA.propertyId);
      expect(res.body.tenantId).toBe(tenantA.tenantId);
    });

    it("GET próprio lead retorna 200", async () => {
      const res = await agentA.get(`/api/leads/${tenantA.leadId}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(tenantA.leadId);
    });
  });

  // ---- IDOR em GET de recurso :id de outro tenant ----
  describe("GET de recurso :id do tenant B é negado (404)", () => {
    const cases: Array<{ name: string; pathOf: () => string }> = [
      { name: "properties", pathOf: () => `/api/properties/${tenantB.propertyId}` },
      { name: "leads", pathOf: () => `/api/leads/${tenantB.leadId}` },
      {
        name: "finance-entries",
        pathOf: () => `/api/finance-entries/${tenantB.financeEntryId}`,
      },
      {
        name: "sale-proposals",
        pathOf: () => `/api/sale-proposals/${tenantB.saleProposalId}`,
      },
      {
        name: "rental-contracts",
        pathOf: () => `/api/rental-contracts/${tenantB.rentalContractId}`,
      },
      {
        name: "follow-ups",
        pathOf: () => `/api/follow-ups/${tenantB.followUpId}`,
      },
    ];

    for (const c of cases) {
      it(`GET ${c.name}/:id (tenant B) -> 404`, async () => {
        const res = await agentA.get(c.pathOf());
        expect(res.status).toBe(404);
        // Nunca pode vazar o recurso do outro tenant no corpo da resposta.
        expect(res.body?.tenantId).not.toBe(tenantB.tenantId);
      });
    }
  });

  // ---- IDOR em rotas-filhas por leadId de outro tenant ----
  describe("Rotas-filhas por leadId do tenant B são negadas (404)", () => {
    it("GET /api/leads/:leadId/interactions (lead B) -> 404", async () => {
      const res = await agentA.get(
        `/api/leads/${tenantB.leadId}/interactions`,
      );
      expect(res.status).toBe(404);
    });

    it("GET /api/leads/:leadId/follow-ups (lead B) -> 404", async () => {
      const res = await agentA.get(`/api/leads/${tenantB.leadId}/follow-ups`);
      expect(res.status).toBe(404);
    });

    it("GET /api/leads/:leadId/tags (lead B) -> 404", async () => {
      const res = await agentA.get(`/api/leads/${tenantB.leadId}/tags`);
      expect(res.status).toBe(404);
    });

    it("POST /api/interactions apontando para lead B -> 404", async () => {
      const res = await agentA
        .post("/api/interactions")
        .set("x-csrf-token", csrfTokenA)
        .send({ leadId: tenantB.leadId, type: "note", content: "intrusão" });
      expect(res.status).toBe(404);
    });

    it("POST /api/leads/:leadId/tags ligando tag à lead B -> 404", async () => {
      const res = await agentA
        .post(`/api/leads/${tenantB.leadId}/tags`)
        .set("x-csrf-token", csrfTokenA)
        .send({ tagId: tenantA.leadTagId });
      expect(res.status).toBe(404);
    });
  });

  // ---- IDOR em PATCH de recurso :id de outro tenant ----
  describe("PATCH de recurso :id do tenant B é negado (não 200)", () => {
    const cases: Array<{
      name: string;
      pathOf: () => string;
      body: Record<string, unknown>;
    }> = [
      {
        name: "properties",
        pathOf: () => `/api/properties/${tenantB.propertyId}`,
        body: { title: "HACKED" },
      },
      {
        name: "leads",
        pathOf: () => `/api/leads/${tenantB.leadId}`,
        body: { name: "HACKED" },
      },
      {
        name: "finance-entries",
        pathOf: () => `/api/finance-entries/${tenantB.financeEntryId}`,
        body: { description: "HACKED" },
      },
      {
        name: "sale-proposals",
        pathOf: () => `/api/sale-proposals/${tenantB.saleProposalId}`,
        body: { notes: "HACKED" },
      },
      {
        name: "rental-contracts",
        pathOf: () => `/api/rental-contracts/${tenantB.rentalContractId}`,
        body: { notes: "HACKED" },
      },
      {
        name: "follow-ups",
        pathOf: () => `/api/follow-ups/${tenantB.followUpId}`,
        body: { notes: "HACKED" },
      },
    ];

    for (const c of cases) {
      it(`PATCH ${c.name}/:id (tenant B) -> 403/404 (nunca 200)`, async () => {
        const res = await agentA
          .patch(c.pathOf())
          .set("x-csrf-token", csrfTokenA)
          .send(c.body);
        expect([403, 404]).toContain(res.status);
        expect(res.status).not.toBe(200);
      });
    }

    it("o recurso do tenant B NÃO foi modificado pelo PATCH cross-tenant", async () => {
      // Verifica diretamente no storage real que o property B continua intacto.
      const propB = await storage.getProperty(tenantB.propertyId);
      expect(propB).toBeTruthy();
      expect(propB.title).not.toBe("HACKED");
      expect(propB.tenantId).toBe(tenantB.tenantId);
    });
  });

  // ---- IDOR em DELETE de recurso :id de outro tenant ----
  describe("DELETE de recurso :id do tenant B é negado (não 200)", () => {
    const cases: Array<{ name: string; pathOf: () => string }> = [
      {
        name: "properties",
        pathOf: () => `/api/properties/${tenantB.propertyId}`,
      },
      { name: "leads", pathOf: () => `/api/leads/${tenantB.leadId}` },
      {
        name: "finance-entries",
        pathOf: () => `/api/finance-entries/${tenantB.financeEntryId}`,
      },
      {
        name: "sale-proposals",
        pathOf: () => `/api/sale-proposals/${tenantB.saleProposalId}`,
      },
      {
        name: "follow-ups",
        pathOf: () => `/api/follow-ups/${tenantB.followUpId}`,
      },
    ];

    for (const c of cases) {
      it(`DELETE ${c.name}/:id (tenant B) -> 403/404 (nunca 200)`, async () => {
        const res = await agentA
          .delete(c.pathOf())
          .set("x-csrf-token", csrfTokenA);
        expect([403, 404]).toContain(res.status);
        expect(res.status).not.toBe(200);
      });
    }

    it("os recursos do tenant B continuam existindo após DELETE cross-tenant", async () => {
      expect(await storage.getProperty(tenantB.propertyId)).toBeTruthy();
      expect(await storage.getLead(tenantB.leadId)).toBeTruthy();
      expect(await storage.getFinanceEntry(tenantB.financeEntryId)).toBeTruthy();
      expect(
        await storage.getSaleProposal(tenantB.saleProposalId),
      ).toBeTruthy();
      expect(await storage.getFollowUp(tenantB.followUpId)).toBeTruthy();
    });
  });
});
