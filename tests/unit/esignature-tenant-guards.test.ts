import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
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
    auditLogs: table("audit_logs", ["tenantId", "entityType", "entityId", "action"]),
    contracts: table("contracts", [
      "id",
      "tenantId",
      "clicksignDocumentKey",
      "updatedAt",
    ]),
  };

  const state = {
    contractDocumentTenantId: null as string | null,
    auditDocumentTenantId: null as string | null,
    contractExistsForTenant: false,
    whereConditions: [] as Array<{ tableName: string; condition: unknown }>,
    updateValues: [] as unknown[],
  };

  const flattenConditions = (condition: Condition): EqCondition[] => {
    if (condition.op === "and") {
      return condition.conditions.flatMap(flattenConditions);
    }
    return [condition];
  };

  const hasCondition = (
    conditions: EqCondition[],
    columnRef: ColumnRef,
    value: unknown,
  ) =>
    conditions.some(
      (condition) =>
        condition.column.table === columnRef.table &&
        condition.column.name === columnRef.name &&
        condition.value === value,
    );

  const makeSelectQuery = () => {
    let tableName = "";
    let whereCondition: Condition | undefined;

    const query = {
      from: vi.fn((tableArg: { __name?: string }) => {
        tableName = tableArg.__name || "";
        return query;
      }),
      where: vi.fn((condition: Condition) => {
        whereCondition = condition;
        state.whereConditions.push({ tableName, condition });
        return query;
      }),
      limit: vi.fn(async () => {
        const conditions = whereCondition ? flattenConditions(whereCondition) : [];

        if (tableName === "contracts") {
          if (
            conditions.some(
              (condition) =>
                condition.column.table === "contracts" &&
                condition.column.name === "clicksignDocumentKey",
            )
          ) {
            return state.contractDocumentTenantId
              ? [{ tenantId: state.contractDocumentTenantId }]
              : [];
          }

          if (
            state.contractExistsForTenant &&
            hasCondition(
              conditions,
              schema.contracts.id,
              "00000000-0000-4000-8000-000000000001",
            ) &&
            hasCondition(conditions, schema.contracts.tenantId, "tenant-a")
          ) {
            return [{ id: "00000000-0000-0000-0000-000000000001" }];
          }
        }

        if (tableName === "audit_logs") {
          return state.auditDocumentTenantId
            ? [{ tenantId: state.auditDocumentTenantId }]
            : [];
        }

        return [];
      }),
    };

    return query;
  };

  const updateWhere = vi.fn(async () => []);
  const updateSet = vi.fn((values: unknown) => {
    state.updateValues.push(values);
    return { where: updateWhere };
  });

  const db = {
    select: vi.fn(() => makeSelectQuery()),
    update: vi.fn(() => ({ set: updateSet })),
  };

  const documentService = {
    uploadDocument: vi.fn(async () => ({
      key: "doc-owned",
      filename: "document.pdf",
      status: "uploaded",
      uploaded_at: "2026-06-15T00:00:00.000Z",
    })),
    createSignatureList: vi.fn(async (documentKey: string, name: string) => ({
      key: "list-1",
      name,
      document_key: documentKey,
    })),
    addSigner: vi.fn(async () => ({ key: "signer-1" })),
  };

  const signerService = {
    addSigners: vi.fn(async () => [{ key: "signer-1" }]),
    validateSignerInfo: vi.fn(() => ({ valid: true, errors: [] })),
    sendInvitations: vi.fn(async () => undefined),
    resendInvitation: vi.fn(async () => undefined),
  };

  const auditTrailService = {
    logEvent: vi.fn(async () => undefined),
    logDocumentAccess: vi.fn(async () => undefined),
    generateDocumentAuditReport: vi.fn(async () => ({})),
  };

  const contractGenerator = {
    sendRentalContractForSignature: vi.fn(async () => ({
      documentKey: "doc-generated",
      listKey: "list-generated",
      signers: [],
    })),
    sendSaleContractForSignature: vi.fn(async () => ({
      documentKey: "doc-generated",
      listKey: "list-generated",
      signers: [],
    })),
  };

  return {
    auditTrailService,
    contractGenerator,
    db,
    documentService,
    schema,
    signerService,
    state,
    updateWhere,
  };
});

vi.mock("drizzle-orm", () => ({
  and: (...conditions: Condition[]) => ({ op: "and", conditions }),
  eq: (column: ColumnRef, value: unknown) => ({ op: "eq", column, value }),
}));

vi.mock("../../server/db", () => ({
  db: mocks.db,
  schema: mocks.schema,
}));

vi.mock("../../server/middleware/plan-limits", () => ({
  checkFeatureAccess:
    () => (_req: Request, _res: Response, next: NextFunction) =>
      next(),
}));

vi.mock("../../server/integrations/clicksign/document-service", () => ({
  DocumentService: class {
    constructor() {
      return mocks.documentService;
    }
  },
}));

vi.mock("../../server/integrations/clicksign/signer-service", () => ({
  SignerService: class {
    constructor() {
      return mocks.signerService;
    }
  },
}));

vi.mock("../../server/integrations/clicksign/audit", () => ({
  auditTrailService: mocks.auditTrailService,
}));

vi.mock("../../server/integrations/clicksign/contract-generator", () => ({
  contractGenerator: mocks.contractGenerator,
}));

vi.mock("../../server/integrations/clicksign/certificate-storage", () => ({
  certificateStorage: {
    parseCertificate: vi.fn(() => ({})),
    storeCertificate: vi.fn(),
  },
}));

vi.mock("../../server/integrations/clicksign/template-manager", () => ({
  templateManager: {
    getAllTemplates: vi.fn(() => []),
    getTemplatesByCategory: vi.fn(() => []),
  },
}));

vi.mock("../../server/integrations/clicksign/webhook-handler", () => ({
  webhookHandler: {
    handleWebhook: vi.fn(),
  },
}));

const { registerESignatureRoutes } = await import("../../server/routes-esignature");

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
  registerESignatureRoutes(app);

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({
      error: err.message,
      errors: err.errors,
    });
  };
  app.use(errorHandler);

  return app;
}

describe("e-signature tenant guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state.contractDocumentTenantId = null;
    mocks.state.auditDocumentTenantId = null;
    mocks.state.contractExistsForTenant = false;
    mocks.state.whereConditions = [];
    mocks.state.updateValues = [];
  });

  it("blocks signature request creation for documents owned by another tenant", async () => {
    mocks.state.contractDocumentTenantId = "tenant-b";
    const app = buildApp();

    const res = await request(app)
      .post("/api/esignature/create-request")
      .send({
        documentKey: "doc-foreign",
        signers: [{ name: "Signer", email: "signer@example.com" }],
      });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Document not found");
    expect(mocks.documentService.createSignatureList).not.toHaveBeenCalled();
    expect(mocks.signerService.addSigners).not.toHaveBeenCalled();
  });

  it("allows signature request creation for ad-hoc documents uploaded by the same tenant", async () => {
    mocks.state.auditDocumentTenantId = "tenant-a";
    const app = buildApp();

    const res = await request(app)
      .post("/api/esignature/create-request")
      .send({
        documentKey: "doc-owned",
        listName: "Assinaturas",
        signers: [{ name: "Signer", email: "signer@example.com", role: "Cliente" }],
      });

    expect(res.status).toBe(200);
    expect(res.body.list.key).toBe("list-1");
    expect(mocks.documentService.createSignatureList).toHaveBeenCalledWith(
      "doc-owned",
      "Assinaturas",
    );
    expect(mocks.signerService.addSigners).toHaveBeenCalled();
  });

  it("requires an owned documentKey before sending invitations by listKey", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/esignature/send")
      .send({ listKey: "list-1" });

    expect(res.status).toBe(400);
    expect(mocks.signerService.sendInvitations).not.toHaveBeenCalled();
  });

  it("stores generated ClickSign document keys only after validating contract ownership", async () => {
    mocks.state.contractExistsForTenant = true;
    const app = buildApp();

    const res = await request(app)
      .post("/api/esignature/generate-contract")
      .send({
        contractType: "rental",
        contractId: "00000000-0000-4000-8000-000000000001",
        contractData: { any: "payload" },
      });

    expect(res.status).toBe(200);
    expect(mocks.contractGenerator.sendRentalContractForSignature).toHaveBeenCalled();
    expect(mocks.db.update).toHaveBeenCalledWith(mocks.schema.contracts);
    expect(mocks.state.updateValues).toEqual([
      expect.objectContaining({ clicksignDocumentKey: "doc-generated" }),
    ]);
  });
});
