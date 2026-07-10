import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFileById: vi.fn(),
  getFileUrl: vi.fn(),
  runWithTenantRlsContext: vi.fn((_tenantId: string, callback: () => unknown) => callback()),
}));

vi.mock("../../server/storage/file-upload", () => ({
  FILE_TYPE_CONFIG: {},
  uploadFile: vi.fn(),
  uploadMultipleFiles: vi.fn(),
  validateFile: vi.fn(async () => ({ valid: true })),
}));

vi.mock("../../server/storage/supabase-client", () => ({
  STORAGE_BUCKETS: {
    PROPERTIES_IMAGES: "properties-images",
    DOCUMENTS: "documents",
    AVATARS: "avatars",
    LOGOS: "logos",
  },
}));

vi.mock("../../server/storage/file-manager", () => ({
  getFileById: mocks.getFileById,
  getFileUrl: mocks.getFileUrl,
  deleteFileById: vi.fn(),
  deleteBulkFiles: vi.fn(),
  getTenantStorageUsage: vi.fn(),
  checkStorageQuota: vi.fn(async () => ({ allowed: true })),
  listFilesByTenant: vi.fn(),
  cleanupOrphanedFiles: vi.fn(),
}));

vi.mock("../../server/storage/image-processor", () => ({
  processImage: vi.fn(),
  generateImageVariants: vi.fn(),
  optimizeForWeb: vi.fn(),
  createCircularAvatar: vi.fn(),
  generateBlurhash: vi.fn(),
}));

vi.mock("../../server/storage", () => ({
  storage: {
    getProperty: vi.fn(),
    updateProperty: vi.fn(),
    updateTenant: vi.fn(),
    createFile: vi.fn(),
  },
}));

vi.mock("../../server/db-rls", () => ({
  runWithTenantRlsContext: mocks.runWithTenantRlsContext,
}));

const { registerFileRoutes } = await import("../../server/routes-files");

function buildApp(tenantId = "tenant-a"): express.Express {
  const app = express();
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).isAuthenticated = () => true;
    req.user = {
      id: "user-1",
      tenantId,
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      avatar: null,
    };
    next();
  });
  registerFileRoutes(app);
  return app;
}

describe("private file URL route expiry bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getFileById.mockResolvedValue({
      id: "file-1",
      tenantId: "tenant-a",
      isPublic: false,
      bucket: "documents",
      filePath: "tenant-a/contracts/file.pdf",
      url: "",
    });
    mocks.getFileUrl.mockResolvedValue("https://signed.example/file.pdf");
  });

  it.each([
    ["low value", "?expiresIn=1", 60],
    ["high value", "?expiresIn=999999", 3600],
    ["invalid value", "?expiresIn=abc", 3600],
    ["missing value", "", 3600],
  ])("clamps %s before generating the signed URL", async (_case, query, expectedExpiresIn) => {
    const app = buildApp();

    const res = await request(app).get(`/api/files/file-1/url${query}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      url: "https://signed.example/file.pdf",
      expiresIn: expectedExpiresIn,
    });
    expect(mocks.getFileUrl).toHaveBeenCalledWith("file-1", expectedExpiresIn);
  });

  it("does not generate a signed URL for a file from another tenant", async () => {
    mocks.getFileById.mockResolvedValue({
      id: "file-1",
      tenantId: "tenant-b",
      isPublic: false,
    });
    const app = buildApp("tenant-a");

    const res = await request(app).get("/api/files/file-1/url?expiresIn=600");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Access denied");
    expect(mocks.getFileUrl).not.toHaveBeenCalled();
  });
});
