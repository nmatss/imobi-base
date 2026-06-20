import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const storageMock = vi.hoisted(() => ({
  getPortalAccessesByTenant: vi.fn(async () => []),
}));

vi.mock("../../server/storage", () => ({
  storage: storageMock,
}));

vi.mock("../../server/email/email-service", () => ({
  getEmailService: vi.fn(() => ({
    send: vi.fn(),
  })),
}));

const { registerPortalRoutes } = await import("../../server/routes-portal");

type TestRequest = {
  isAuthenticated: () => boolean;
  user?: Express.User;
};

function buildApp(role: string): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const testReq = req as unknown as TestRequest;
    testReq.isAuthenticated = () => true;
    testReq.user = {
      id: "user-1",
      tenantId: "tenant-1",
      name: "Portal User",
      email: "portal@example.com",
      role,
      avatar: null,
    };
    next();
  });
  registerPortalRoutes(app);
  return app;
}

describe("portal admin RBAC", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin users from portal access management", async () => {
    const app = buildApp("member");

    const res = await request(app).get("/api/portal/admin/access");

    expect(res.status).toBe(403);
    expect(storageMock.getPortalAccessesByTenant).not.toHaveBeenCalled();
  });

  it("allows tenant admins to manage portal access", async () => {
    const app = buildApp("admin");

    const res = await request(app).get("/api/portal/admin/access");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(storageMock.getPortalAccessesByTenant).toHaveBeenCalledWith("tenant-1");
  });
});
