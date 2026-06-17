import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dpoMocks = vi.hoisted(() => ({
  generateConsentReport: vi.fn(),
  generateComplianceDashboard: vi.fn(),
  generateDataInventory: vi.fn(async () => ({ ok: true })),
  generateRiskAssessment: vi.fn(),
  getComplianceDashboard: vi.fn(),
  getDeletionRequestsLog: vi.fn(),
  reportDataBreach: vi.fn(),
  updateDataBreach: vi.fn(async () => ({ message: "updated" })),
}));

vi.mock("../../server/compliance/data-export", () => ({
  downloadExport: vi.fn(),
  getExportStatus: vi.fn(),
  requestDataExport: vi.fn(),
}));

vi.mock("../../server/compliance/data-deletion", () => ({
  cancelDeletionRequest: vi.fn(),
  confirmAccountDeletion: vi.fn(),
  getDeletionCertificate: vi.fn(),
  getDeletionStatus: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));

vi.mock("../../server/compliance/consent-manager", () => ({
  getConsentHistory: vi.fn(),
  getCookiePreferences: vi.fn(),
  getUserConsents: vi.fn(),
  giveConsent: vi.fn(),
  setCookieConsent: vi.fn(),
  withdrawConsent: vi.fn(),
}));

vi.mock("../../server/compliance/dpo-tools", () => dpoMocks);

const { registerComplianceRoutes } = await import("../../server/compliance/routes-compliance");

function buildApp(role: string): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.user = {
      id: "user-1",
      tenantId: "tenant-a",
      name: "Compliance User",
      email: "compliance@example.com",
      role,
      avatar: null,
    };
    next();
  });
  registerComplianceRoutes(app);
  return app;
}

describe("compliance admin RBAC and tenant scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes tenantId when updating a data breach incident", async () => {
    const app = buildApp("admin");

    const res = await request(app)
      .put("/api/admin/compliance/data-breach/incident-1")
      .send({ status: "resolved" });

    expect(res.status).toBe(200);
    expect(dpoMocks.updateDataBreach).toHaveBeenCalledWith(
      "incident-1",
      "tenant-a",
      { status: "resolved" },
    );
  });

  it("allows super_admin on admin compliance endpoints", async () => {
    const app = buildApp("super_admin");

    const res = await request(app).get("/api/admin/compliance/data-inventory");

    expect(res.status).toBe(200);
    expect(dpoMocks.generateDataInventory).toHaveBeenCalledWith("tenant-a");
  });

  it("rejects non-admin users before calling DPO mutation services", async () => {
    const app = buildApp("agent");

    const res = await request(app)
      .put("/api/admin/compliance/data-breach/incident-1")
      .send({ status: "resolved" });

    expect(res.status).toBe(403);
    expect(dpoMocks.updateDataBreach).not.toHaveBeenCalled();
  });
});
