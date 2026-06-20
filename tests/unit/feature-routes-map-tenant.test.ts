import { readFileSync } from "node:fs";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type ColumnRef = { table: string; name: string };
type ColumnRecord = Record<string, ColumnRef>;
type EqCondition = { op: "eq"; column: ColumnRef; value: unknown };
type InArrayCondition = { op: "inArray"; column: ColumnRef; values: unknown[] };
type AndCondition = { op: "and"; conditions: Condition[] };
type LeafCondition = EqCondition | InArrayCondition;
type Condition = LeafCondition | AndCondition;

const mocks = vi.hoisted(() => {
  const column = (table: string, name: string): ColumnRef => ({ table, name });
  const table = (name: string, columns: string[]): ColumnRecord =>
    Object.fromEntries(columns.map((col) => [col, column(name, col)]));

  const schema = {
    campaignEnrollments: table("campaign_enrollments", ["campaignId"]),
    campaignSteps: table("campaign_steps", ["campaignId", "stepOrder"]),
    contractDocuments: table("contract_documents", ["id"]),
    contracts: table("contracts", ["id", "tenantId"]),
    dashboardLayouts: table("dashboard_layouts", ["tenantId", "userId"]),
    digitalSignatures: table("digital_signatures", ["id"]),
    dripCampaigns: table("drip_campaigns", ["id", "tenantId"]),
    followUps: table("follow_ups", ["leadId"]),
    interactions: table("interactions", ["leadId"]),
    leads: table("leads", ["id", "tenantId", "updatedAt"]),
    leadScores: table("lead_scores", ["leadId", "totalScore"]),
    properties: table("properties", [
      "id",
      "tenantId",
      "title",
      "price",
      "type",
      "category",
      "status",
      "city",
      "address",
      "bedrooms",
      "bathrooms",
      "area",
      "images",
    ]),
    propertyComparisons: table("property_comparisons", ["id"]),
    propertyCoordinates: table("property_coordinates", [
      "propertyId",
      "latitude",
      "longitude",
    ]),
    virtualTours: table("virtual_tours", ["id", "propertyId", "isActive", "sortOrder"]),
    widgetTypes: table("widget_types", ["id"]),
  };

  const state = {
    whereConditions: [] as unknown[],
    whereResults: [] as unknown[][],
  };

  const query = {
    from: vi.fn(() => query),
    innerJoin: vi.fn(() => query),
    leftJoin: vi.fn(() => query),
    orderBy: vi.fn(() => query),
    limit: vi.fn(async () => []),
    where: vi.fn(async (condition: unknown) => {
      state.whereConditions.push(condition);
      return state.whereResults.shift() ?? [];
    }),
  };

  const db = {
    select: vi.fn(() => query),
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: vi.fn(async () => []) })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => []) })),
  };

  return { db, schema, state };
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

type TestRequest = {
  isAuthenticated: () => boolean;
  user?: Express.User;
};

const AUTHENTICATED_TENANT_ID = "tenant-authenticated";
const QUERY_TENANT_ID = "tenant-from-query";

function buildApp(authenticated = true): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const testReq = req as unknown as TestRequest;
    testReq.isAuthenticated = () => authenticated;
    if (authenticated) {
      testReq.user = {
        id: "user-1",
        tenantId: AUTHENTICATED_TENANT_ID,
        name: "Admin User",
        email: "admin@example.com",
        role: "admin",
        avatar: null,
      };
    }
    next();
  });
  registerFeatureRoutes(app);
  return app;
}

function flattenConditions(condition: unknown): LeafCondition[] {
  const typed = condition as Condition;
  if (typed.op === "and") {
    return typed.conditions.flatMap(flattenConditions);
  }
  return [typed];
}

describe("feature property map tenant isolation", () => {
  beforeEach(() => {
    mocks.state.whereConditions = [];
    mocks.state.whereResults = [];
    vi.clearAllMocks();
  });

  it("requires authentication for the legacy property map endpoint", async () => {
    const app = buildApp(false);

    const res = await request(app).get(
      `/api/properties/map?tenantId=${QUERY_TENANT_ID}`,
    );

    expect(res.status).toBe(401);
    expect(mocks.db.select).not.toHaveBeenCalled();
  });

  it("ignores tenantId query and scopes map properties to the authenticated tenant", async () => {
    const app = buildApp(true);

    const res = await request(app).get(
      `/api/properties/map?tenantId=${QUERY_TENANT_ID}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    const conditions = flattenConditions(mocks.state.whereConditions[0]);
    expect(conditions).toContainEqual({
      op: "eq",
      column: mocks.schema.properties.tenantId,
      value: AUTHENTICATED_TENANT_ID,
    });
    expect(conditions).not.toContainEqual({
      op: "eq",
      column: mocks.schema.properties.tenantId,
      value: QUERY_TENANT_ID,
    });
  });
});

describe("feature public property comparison guard", () => {
  beforeEach(() => {
    mocks.state.whereConditions = [];
    mocks.state.whereResults = [];
    vi.clearAllMocks();
  });

  it("only compares available properties", async () => {
    mocks.state.whereResults = [
      [
        {
          id: "property-available",
          tenantId: "tenant-a",
          title: "Available",
          price: "100000",
          area: 50,
        },
      ],
    ];
    const app = buildApp(false);

    const res = await request(app)
      .post("/api/properties/compare")
      .send({ propertyIds: ["property-available", "property-sold"] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("indisponíveis");

    const conditions = flattenConditions(mocks.state.whereConditions[0]);
    expect(conditions).toContainEqual({
      op: "eq",
      column: mocks.schema.properties.status,
      value: "available",
    });
  });

  it("rejects public comparisons across tenants", async () => {
    mocks.state.whereResults = [
      [
        {
          id: "property-a",
          tenantId: "tenant-a",
          title: "Property A",
          price: "100000",
          area: 50,
        },
        {
          id: "property-b",
          tenantId: "tenant-b",
          title: "Property B",
          price: "120000",
          area: 60,
        },
      ],
    ];
    const app = buildApp(false);

    const res = await request(app)
      .post("/api/properties/compare")
      .send({ propertyIds: ["property-a", "property-b"] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("mesma imobiliária");
  });

  it("requires public virtual tours to belong to an available property", () => {
    const source = readFileSync("server/routes-features.ts", "utf8");
    const start = source.indexOf('app.get("/api/properties/:propertyId/virtual-tours"');
    const end = source.indexOf("// Delete virtual tour", start);
    const routeBlock = source.slice(start, end);

    expect(routeBlock).toContain("eq(properties.id, propertyId)");
    expect(routeBlock).toContain("eq(properties.status, 'available')");
  });
});
