import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ColumnRef = { table: string; name: string };
type EqCondition = { op: "eq"; column: ColumnRef; value: unknown };
type AndCondition = { op: "and"; conditions: Condition[] };
type Condition = EqCondition | AndCondition;

const mocks = vi.hoisted(() => {
  const column = (table: string, name: string): ColumnRef => ({ table, name });
  const table = (name: string, columns: string[]) => {
    const record: Record<string, unknown> = { __name: name };
    for (const col of columns) record[col] = column(name, col);
    return record as Record<string, ColumnRef> & { __name: string };
  };

  const schema = {
    campaignEnrollments: table("campaign_enrollments", ["campaignId"]),
    campaignSteps: table("campaign_steps", ["campaignId", "stepOrder"]),
    contractDocuments: table("contract_documents", ["id"]),
    contracts: table("contracts", ["id", "tenantId"]),
    dashboardLayouts: table("dashboard_layouts", ["tenantId", "userId"]),
    digitalSignatures: table("digital_signatures", ["id", "contractId", "token"]),
    dripCampaigns: table("drip_campaigns", ["id", "tenantId"]),
    followUps: table("follow_ups", ["leadId"]),
    interactions: table("interactions", ["leadId"]),
    leads: table("leads", ["id", "tenantId", "updatedAt"]),
    leadScores: table("lead_scores", ["leadId", "totalScore"]),
    properties: table("properties", ["id", "tenantId"]),
    propertyComparisons: table("property_comparisons", ["id"]),
    propertyCoordinates: table("property_coordinates", ["propertyId"]),
    virtualTours: table("virtual_tours", ["id", "propertyId"]),
    widgetTypes: table("widget_types", ["id"]),
  };

  const state = {
    contractExistsForTenant: false,
    signatureExpired: false,
    insertValues: [] as unknown[],
    updateValues: [] as unknown[],
    selectedTables: [] as string[],
  };
  const digitalSignaturesTableName = "digital_signatures";

  const rowsForTable = (tableName: string) => {
    if (tableName === "contracts" && state.contractExistsForTenant) {
      return [{ id: "contract-1", tenantId: "tenant-a" }];
    }
    if (tableName === digitalSignaturesTableName) {
      return [
        {
          id: "signature-1",
          contractId: "contract-1",
          token: "signature-token-1",
          expiresAt: state.signatureExpired
            ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          viewedAt: null,
          status: "pending",
        },
      ];
    }
    return [];
  };

  const makeSelectQuery = () => {
    let tableName = "";
    const query: any = {
      from: vi.fn((tableArg: { __name?: string }) => {
        tableName = tableArg.__name || "";
        state.selectedTables.push(tableName);
        return query;
      }),
      innerJoin: vi.fn(() => query),
      leftJoin: vi.fn(() => query),
      orderBy: vi.fn(() => query),
      where: vi.fn((_condition: Condition) => query),
      limit: vi.fn(async (limit: number) => rowsForTable(tableName).slice(0, limit)),
      then: (resolve: (value: unknown[]) => unknown, reject: (reason?: unknown) => unknown) =>
        Promise.resolve(rowsForTable(tableName)).then(resolve, reject),
    };
    return query;
  };

  const returning = vi.fn(async () => [{ id: "signature-created" }]);
  const values = vi.fn((value: unknown) => {
    state.insertValues.push(value);
    return { returning };
  });

  const set = vi.fn((value: unknown) => {
    state.updateValues.push(value);
    return { where: vi.fn(async () => []) };
  });

  const db = {
    select: vi.fn(() => makeSelectQuery()),
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
    delete: vi.fn(() => ({ where: vi.fn(async () => []) })),
  };

  return { db, returning, schema, state, values };
});

vi.mock("drizzle-orm", () => ({
  and: (...conditions: Condition[]) => ({ op: "and", conditions }),
  desc: (column: ColumnRef) => ({ op: "desc", column }),
  eq: (column: ColumnRef, value: unknown) => ({ op: "eq", column, value }),
  inArray: (column: ColumnRef, values: unknown[]) => ({ op: "inArray", column, values }),
  sql: (...args: unknown[]) => ({ op: "sql", args }),
}));

vi.mock("../../server/db", () => ({
  db: mocks.db,
}));

vi.mock("@shared/schema-sqlite", () => mocks.schema);

vi.mock("../../server/routes-security", () => ({
  createAuditLog: vi.fn(async () => undefined),
}));

const { registerFeatureRoutes } = await import("../../server/routes-features");

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).isAuthenticated = () => true;
    req.user = {
      id: "user-1",
      tenantId: "tenant-a",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      avatar: null,
    };
    next();
  });
  registerFeatureRoutes(app);
  return app;
}

describe("feature digital signatures tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.contractExistsForTenant = false;
    mocks.state.signatureExpired = false;
    mocks.state.insertValues = [];
    mocks.state.updateValues = [];
    mocks.state.selectedTables = [];
  });

  it("does not create signatures when the contract is outside the tenant", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/contracts/contract-foreign/signatures")
      .send({
        signers: [{ type: "client", name: "Signer", email: "signer@example.com" }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Contrato não encontrado");
    expect(mocks.db.insert).not.toHaveBeenCalled();
  });

  it("creates signatures only after validating contract ownership", async () => {
    mocks.state.contractExistsForTenant = true;
    const app = buildApp();

    const res = await request(app)
      .post("/api/contracts/contract-1/signatures")
      .send({
        signers: [{ type: "client", name: "Signer", email: "signer@example.com" }],
      });

    expect(res.status).toBe(200);
    expect(mocks.db.insert).toHaveBeenCalledWith(mocks.schema.digitalSignatures);
    expect(mocks.state.insertValues).toEqual([
      expect.objectContaining({ contractId: "contract-1" }),
    ]);
  });

  it("does not list signatures when the contract is outside the tenant", async () => {
    const app = buildApp();

    const res = await request(app).get("/api/contracts/contract-foreign/signatures");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Contrato não encontrado");
    expect(mocks.state.selectedTables).not.toContain("digital_signatures");
  });

  it("does not expose expired signature token data in public token lookup", async () => {
    mocks.state.signatureExpired = true;
    const app = buildApp();

    const res = await request(app).get("/api/signatures/token/signature-token-1");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Link expirado");
    expect(mocks.state.selectedTables).toContain("digital_signatures");
    expect(mocks.state.selectedTables).not.toContain("contracts");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("does not allow signing with an expired signature token", async () => {
    mocks.state.signatureExpired = true;
    const app = buildApp();

    const res = await request(app).post("/api/signatures/token/signature-token-1/sign").send({
      signatureData: "signed-by-customer",
      ipAddress: "127.0.0.1",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Link expirado");
    expect(mocks.db.update).not.toHaveBeenCalled();
  });

  it("returns public signature data for a valid token after marking it viewed", async () => {
    mocks.state.contractExistsForTenant = true;
    const app = buildApp();

    const res = await request(app).get("/api/signatures/token/signature-token-1");

    expect(res.status).toBe(200);
    expect(res.body.signature).toEqual(
      expect.objectContaining({
        id: "signature-1",
        contractId: "contract-1",
        token: "signature-token-1",
      }),
    );
    expect(res.body.contract).toEqual(
      expect.objectContaining({
        id: "contract-1",
        tenantId: "tenant-a",
      }),
    );
    expect(mocks.state.updateValues).toEqual([
      expect.objectContaining({
        viewedAt: expect.any(String),
        status: "viewed",
      }),
    ]);
    expect(mocks.state.selectedTables.indexOf("digital_signatures")).toBeLessThan(
      mocks.state.selectedTables.indexOf("contracts"),
    );
  });
});
