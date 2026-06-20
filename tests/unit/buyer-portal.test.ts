/**
 * Behavioral tests for the buyer-portal feature (server/routes-buyer-portal.ts).
 *
 * Drives the real Express handlers through supertest, mocking only the storage
 * layer and db-rls context. Asserts real behavior (status codes, branching,
 * which storage methods are called and with which arguments) — not trivial
 * shape checks.
 *
 * Scenarios covered:
 *  - public token: valid (200), expired (410 EXPIRED), closed (410 CLOSED),
 *    unknown (404 NOT_FOUND)
 *  - public payload never leaks lead PII
 *  - respond: validates response enum, records a CRM interaction, persists item
 *  - respond: item from another selection rejected (404) even with a valid token
 *  - visit: creates a visit with status "requested" and records a CRM interaction
 *  - admin create: tenant isolation (cross-tenant lead / property rejected),
 *    generates a unique public token, persists items
 *  - admin read/close: tenant isolation (cross-tenant selection -> 404)
 */

import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks are hoisted above the vi.mock factories. vi.fn mocks asserted with
// argument matchers use a rest-param signature typed any so tsc does not choke
// on the heterogeneous call sites in the route handlers.
const mocks = vi.hoisted(() => ({
  getBuyerSelectionByToken: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getTenant: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getBrandSettings: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  updateSelectionItemResponse: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  createInteraction: vi.fn((..._a: any[]) => Promise.resolve({ id: "interaction-1" } as any)),
  createVisit: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getLead: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getProperty: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  createBuyerSelection: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  addSelectionItems: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  getBuyerSelectionsByTenant: vi.fn((..._a: any[]) => Promise.resolve([] as any)),
  getBuyerSelection: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  closeBuyerSelection: vi.fn((..._a: any[]) => Promise.resolve(undefined as any)),
  runWithTenantRlsContext: vi.fn((_tenantId: string, callback: () => unknown) => callback()),
}));

vi.mock("../../server/storage", () => ({
  storage: {
    getBuyerSelectionByToken: mocks.getBuyerSelectionByToken,
    getTenant: mocks.getTenant,
    getBrandSettings: mocks.getBrandSettings,
    updateSelectionItemResponse: mocks.updateSelectionItemResponse,
    createInteraction: mocks.createInteraction,
    createVisit: mocks.createVisit,
    getLead: mocks.getLead,
    getProperty: mocks.getProperty,
    createBuyerSelection: mocks.createBuyerSelection,
    addSelectionItems: mocks.addSelectionItems,
    getBuyerSelectionsByTenant: mocks.getBuyerSelectionsByTenant,
    getBuyerSelection: mocks.getBuyerSelection,
    closeBuyerSelection: mocks.closeBuyerSelection,
  },
}));

vi.mock("../../server/db-rls", () => ({
  runWithTenantRlsContext: mocks.runWithTenantRlsContext,
}));

const { registerBuyerPortalRoutes } = await import("../../server/routes-buyer-portal");

type TestRequest = {
  isAuthenticated: () => boolean;
  user?: Express.User;
};

/** App with the buyer-portal routes mounted and an authenticated admin user. */
function buildAuthedApp(
  user: Partial<Express.User> = {},
): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const testReq = req as unknown as TestRequest;
    testReq.isAuthenticated = () => true;
    testReq.user = {
      id: "user-1",
      tenantId: "tenant-1",
      name: "Agent",
      email: "agent@example.com",
      role: "admin",
      avatar: null,
      ...user,
    } as Express.User;
    next();
  });
  registerBuyerPortalRoutes(app);
  return app;
}

/** App with the buyer-portal routes mounted and NO session (public access). */
function buildPublicApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const testReq = req as unknown as TestRequest;
    testReq.isAuthenticated = () => false;
    next();
  });
  registerBuyerPortalRoutes(app);
  return app;
}

/** Builds an in-tenant active selection with one item + property. */
function activeSelection(overrides: Record<string, any> = {}) {
  return {
    id: "sel-1",
    tenantId: "tenant-1",
    leadId: "lead-1",
    createdBy: "user-1",
    title: "Imóveis selecionados",
    message: "Olá!",
    status: "active",
    publicToken: "tok-active",
    expiresAt: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    items: [
      {
        id: "item-1",
        sortOrder: 0,
        response: null,
        comment: null,
        respondedAt: null,
        property: {
          id: "prop-1",
          title: "Apto Centro",
          type: "apartment",
          category: "sale",
          price: 500000,
          address: "Rua A, 1",
          city: "SP",
          state: "SP",
          // PII-adjacent owner fields that must NOT leak to the public payload:
          ownerName: "Owner Secret",
        },
      },
    ],
    ...overrides,
  };
}

describe("buyer portal — public token access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runWithTenantRlsContext.mockImplementation(
      (_tenantId: string, callback: () => unknown) => callback(),
    );
  });

  it("returns 404 NOT_FOUND for an unknown token", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValueOnce(undefined);
    const app = buildPublicApp();

    const res = await request(app).get("/api/portal/selection/does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
    expect(mocks.getBuyerSelectionByToken).toHaveBeenCalledWith("does-not-exist");
    // Must not attempt to resolve tenant/brand when the selection is missing.
    expect(mocks.getTenant).not.toHaveBeenCalled();
  });

  it("returns 410 EXPIRED when expiresAt is in the past", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValueOnce(
      activeSelection({ expiresAt: new Date(Date.now() - 60_000).toISOString() }),
    );
    const app = buildPublicApp();

    const res = await request(app).get("/api/portal/selection/tok-active");

    expect(res.status).toBe(410);
    expect(res.body.code).toBe("EXPIRED");
    expect(mocks.getTenant).not.toHaveBeenCalled();
  });

  it("returns 410 CLOSED when the selection status is not active", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValueOnce(
      activeSelection({ status: "closed" }),
    );
    const app = buildPublicApp();

    const res = await request(app).get("/api/portal/selection/tok-active");

    expect(res.status).toBe(410);
    expect(res.body.code).toBe("CLOSED");
  });

  it("returns 200 with brand + items for a valid token and never leaks lead PII", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValueOnce(activeSelection());
    mocks.getTenant.mockResolvedValueOnce({
      id: "tenant-1",
      name: "Imobiliária X",
      slug: "imob-x",
      phone: "111",
      email: "contato@imob-x.com",
    });
    mocks.getBrandSettings.mockResolvedValueOnce(undefined);
    const app = buildPublicApp();

    const res = await request(app).get("/api/portal/selection/tok-active");

    expect(res.status).toBe(200);
    expect(res.body.brand.name).toBe("Imobiliária X");
    expect(res.body.selection.id).toBe("sel-1");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].property.id).toBe("prop-1");

    // Behavioral guard: no leadId / lead PII anywhere in the public payload,
    // and the property projection drops non-whitelisted owner fields.
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("lead-1");
    expect(serialized).not.toContain("Owner Secret");
    expect(res.body.items[0].property.ownerName).toBeUndefined();
  });
});

describe("buyer portal — public respond", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects an invalid response value with 400 and does not persist", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValue(activeSelection());
    const app = buildPublicApp();

    const res = await request(app)
      .post("/api/portal/selection/tok-active/items/item-1/respond")
      .send({ response: "definitely-yes" });

    expect(res.status).toBe(400);
    expect(mocks.updateSelectionItemResponse).not.toHaveBeenCalled();
    expect(mocks.createInteraction).not.toHaveBeenCalled();
  });

  it("persists the response and records a CRM interaction for the lead", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValue(activeSelection());
    mocks.updateSelectionItemResponse.mockResolvedValueOnce({
      id: "item-1",
      response: "accepted",
      comment: "Gostei muito",
      respondedAt: "2026-06-10T10:00:00.000Z",
    });
    const app = buildPublicApp();

    const res = await request(app)
      .post("/api/portal/selection/tok-active/items/item-1/respond")
      .send({ response: "accepted", comment: "  Gostei muito  " });

    expect(res.status).toBe(200);
    expect(res.body.response).toBe("accepted");

    // Item response persisted with trimmed comment.
    expect(mocks.updateSelectionItemResponse).toHaveBeenCalledWith(
      "item-1",
      "accepted",
      "Gostei muito",
    );

    // Interaction written to the lead's CRM timeline with the right shape.
    expect(mocks.createInteraction).toHaveBeenCalledTimes(1);
    const interaction = mocks.createInteraction.mock.calls[0][0];
    expect(interaction.leadId).toBe("lead-1");
    expect(interaction.type).toBe("portal_buyer");
    expect(interaction.content).toContain("aceitou");
    expect(interaction.content).toContain("Apto Centro");
  });

  it("returns 404 for an item that belongs to another selection (valid token, wrong item)", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValue(activeSelection());
    const app = buildPublicApp();

    const res = await request(app)
      .post("/api/portal/selection/tok-active/items/item-from-other-selection/respond")
      .send({ response: "accepted" });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
    expect(mocks.updateSelectionItemResponse).not.toHaveBeenCalled();
  });

  it("returns 410 when responding on a closed selection", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValue(
      activeSelection({ status: "closed" }),
    );
    const app = buildPublicApp();

    const res = await request(app)
      .post("/api/portal/selection/tok-active/items/item-1/respond")
      .send({ response: "accepted" });

    expect(res.status).toBe(410);
    expect(res.body.code).toBe("CLOSED");
    expect(mocks.updateSelectionItemResponse).not.toHaveBeenCalled();
  });
});

describe("buyer portal — public visit request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a missing/invalid preferredDate with 400", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValue(activeSelection());
    const app = buildPublicApp();

    const missing = await request(app)
      .post("/api/portal/selection/tok-active/items/item-1/visit")
      .send({});
    expect(missing.status).toBe(400);

    const invalid = await request(app)
      .post("/api/portal/selection/tok-active/items/item-1/visit")
      .send({ preferredDate: "not-a-date" });
    expect(invalid.status).toBe(400);

    expect(mocks.createVisit).not.toHaveBeenCalled();
  });

  it("creates a visit with status 'requested' and logs a CRM interaction", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValue(activeSelection());
    mocks.createVisit.mockResolvedValueOnce({
      id: "visit-1",
      status: "requested",
      scheduledFor: "2026-07-01T14:00:00.000Z",
    });
    const app = buildPublicApp();

    const res = await request(app)
      .post("/api/portal/selection/tok-active/items/item-1/visit")
      .send({ preferredDate: "2026-07-01T14:00:00.000Z", notes: "Prefiro à tarde" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("requested");

    // The created visit is scoped to the selection's tenant/property/lead with
    // a "requested" status (never auto-confirmed from the public portal).
    expect(mocks.createVisit).toHaveBeenCalledTimes(1);
    const visitArg = mocks.createVisit.mock.calls[0][0];
    expect(visitArg.status).toBe("requested");
    expect(visitArg.tenantId).toBe("tenant-1");
    expect(visitArg.propertyId).toBe("prop-1");
    expect(visitArg.leadId).toBe("lead-1");

    // CRM interaction logged for the visit request.
    expect(mocks.createInteraction).toHaveBeenCalledTimes(1);
    expect(mocks.createInteraction.mock.calls[0][0].type).toBe("portal_buyer");
    expect(mocks.createInteraction.mock.calls[0][0].content).toContain("visita");
  });

  it("returns 410 when requesting a visit on an expired selection", async () => {
    mocks.getBuyerSelectionByToken.mockResolvedValue(
      activeSelection({ expiresAt: new Date(Date.now() - 1000).toISOString() }),
    );
    const app = buildPublicApp();

    const res = await request(app)
      .post("/api/portal/selection/tok-active/items/item-1/visit")
      .send({ preferredDate: "2026-07-01T14:00:00.000Z" });

    expect(res.status).toBe(410);
    expect(res.body.code).toBe("EXPIRED");
    expect(mocks.createVisit).not.toHaveBeenCalled();
  });
});

describe("buyer portal — admin create selection (tenant isolation + unique token)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runWithTenantRlsContext.mockImplementation(
      (_tenantId: string, callback: () => unknown) => callback(),
    );
  });

  it("rejects a lead owned by another tenant with 404", async () => {
    mocks.getLead.mockResolvedValueOnce({ id: "lead-1", tenantId: "tenant-OTHER", name: "X" });
    const app = buildAuthedApp();

    const res = await request(app)
      .post("/api/portal/buyer-selections")
      .send({ leadId: "lead-1", propertyIds: ["prop-1"] });

    expect(res.status).toBe(404);
    expect(mocks.createBuyerSelection).not.toHaveBeenCalled();
  });

  it("rejects when no property belongs to the tenant (400)", async () => {
    mocks.getLead.mockResolvedValueOnce({ id: "lead-1", tenantId: "tenant-1", name: "Maria" });
    // Property belongs to another tenant -> filtered out.
    mocks.getProperty.mockResolvedValueOnce({ id: "prop-1", tenantId: "tenant-OTHER" });
    const app = buildAuthedApp();

    const res = await request(app)
      .post("/api/portal/buyer-selections")
      .send({ leadId: "lead-1", propertyIds: ["prop-1"] });

    expect(res.status).toBe(400);
    expect(mocks.createBuyerSelection).not.toHaveBeenCalled();
  });

  it("creates the selection with a unique base64url token and persists only in-tenant items", async () => {
    mocks.getLead.mockResolvedValueOnce({ id: "lead-1", tenantId: "tenant-1", name: "Maria" });
    // prop-1 in tenant, prop-foreign in another tenant, prop-missing absent.
    mocks.getProperty.mockImplementation((id: string) => {
      if (id === "prop-1") return Promise.resolve({ id, tenantId: "tenant-1" });
      if (id === "prop-foreign") return Promise.resolve({ id, tenantId: "tenant-OTHER" });
      return Promise.resolve(undefined);
    });
    mocks.createBuyerSelection.mockImplementation((input: any) =>
      Promise.resolve({ id: "sel-new", ...input }),
    );
    const app = buildAuthedApp();

    const res = await request(app)
      .post("/api/portal/buyer-selections")
      .send({
        leadId: "lead-1",
        propertyIds: ["prop-1", "prop-foreign", "prop-missing"],
        title: "  Minha seleção  ",
      });

    expect(res.status).toBe(201);

    // Only the in-tenant property survived the ownership filter.
    expect(res.body.itemCount).toBe(1);
    expect(mocks.addSelectionItems).toHaveBeenCalledTimes(1);
    const items = mocks.addSelectionItems.mock.calls[0][0];
    expect(items).toHaveLength(1);
    expect(items[0].propertyId).toBe("prop-1");
    expect(items[0].sortOrder).toBe(0);

    // Selection persisted under the authed tenant/user, active, title trimmed.
    const created = mocks.createBuyerSelection.mock.calls[0][0];
    expect(created.tenantId).toBe("tenant-1");
    expect(created.createdBy).toBe("user-1");
    expect(created.status).toBe("active");
    expect(created.title).toBe("Minha seleção");

    // Token is a non-trivial base64url string (randomBytes(32)).
    expect(created.publicToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
  });

  it("generates a different token on each create (uniqueness)", async () => {
    mocks.getLead.mockResolvedValue({ id: "lead-1", tenantId: "tenant-1", name: "Maria" });
    mocks.getProperty.mockResolvedValue({ id: "prop-1", tenantId: "tenant-1" });
    mocks.createBuyerSelection.mockImplementation((input: any) =>
      Promise.resolve({ id: "sel-new", ...input }),
    );
    const app = buildAuthedApp();

    const body = { leadId: "lead-1", propertyIds: ["prop-1"] };
    await request(app).post("/api/portal/buyer-selections").send(body);
    await request(app).post("/api/portal/buyer-selections").send(body);

    const tokenA = mocks.createBuyerSelection.mock.calls[0][0].publicToken;
    const tokenB = mocks.createBuyerSelection.mock.calls[1][0].publicToken;
    expect(tokenA).not.toBe(tokenB);
  });
});

describe("buyer portal — admin read/close (tenant isolation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runWithTenantRlsContext.mockImplementation(
      (_tenantId: string, callback: () => unknown) => callback(),
    );
  });

  it("returns 404 when fetching a selection owned by another tenant", async () => {
    mocks.getBuyerSelection.mockResolvedValueOnce({
      id: "sel-1",
      tenantId: "tenant-OTHER",
      publicToken: "tok",
    });
    const app = buildAuthedApp();

    const res = await request(app).get("/api/portal/buyer-selections/sel-1");

    expect(res.status).toBe(404);
    // Must not go on to load the full selection / lead PII for a foreign tenant.
    expect(mocks.getBuyerSelectionByToken).not.toHaveBeenCalled();
  });

  it("returns 404 when closing a selection owned by another tenant", async () => {
    mocks.getBuyerSelection.mockResolvedValueOnce({
      id: "sel-1",
      tenantId: "tenant-OTHER",
      publicToken: "tok",
    });
    const app = buildAuthedApp();

    const res = await request(app).post("/api/portal/buyer-selections/sel-1/close");

    expect(res.status).toBe(404);
    expect(mocks.closeBuyerSelection).not.toHaveBeenCalled();
  });

  it("closes an in-tenant selection", async () => {
    mocks.getBuyerSelection.mockResolvedValueOnce({
      id: "sel-1",
      tenantId: "tenant-1",
      publicToken: "tok",
    });
    mocks.closeBuyerSelection.mockResolvedValueOnce({
      id: "sel-1",
      tenantId: "tenant-1",
      status: "closed",
    });
    const app = buildAuthedApp();

    const res = await request(app).post("/api/portal/buyer-selections/sel-1/close");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("closed");
    expect(mocks.closeBuyerSelection).toHaveBeenCalledWith("sel-1");
  });
});
