import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  checkStorageQuota: vi.fn(),
  createFile: vi.fn(),
  getProperty: vi.fn(),
  runWithTenantRlsContext: vi.fn((_tenantId: string, callback: () => unknown) => callback()),
}));

vi.mock("../../server/storage/file-upload", () => ({
  FILE_TYPE_CONFIG: {},
  uploadFile: mocks.uploadFile,
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
  getFileById: vi.fn(),
  getFileUrl: vi.fn(),
  deleteFileById: vi.fn(),
  deleteBulkFiles: vi.fn(),
  getTenantStorageUsage: vi.fn(),
  checkStorageQuota: mocks.checkStorageQuota,
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
    createFile: mocks.createFile,
    getProperty: mocks.getProperty,
    getLead: vi.fn(),
    getContract: vi.fn(),
    getOwner: vi.fn(),
    getRenter: vi.fn(),
    getRentalContract: vi.fn(),
    getRentalPayment: vi.fn(),
    getSaleProposal: vi.fn(),
    getPropertySale: vi.fn(),
    getFinanceCategory: vi.fn(),
    getFinanceEntry: vi.fn(),
    getLeadTag: vi.fn(),
    getFollowUp: vi.fn(),
    getPropertyValuation: vi.fn(),
    getPropertyInspection: vi.fn(),
    getUser: vi.fn(),
    updateProperty: vi.fn(),
    updateTenant: vi.fn(),
    updateUser: vi.fn(),
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

describe("generic file upload entity ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkStorageQuota.mockResolvedValue({ allowed: true, usage: 0 });
    mocks.uploadFile.mockResolvedValue({
      success: true,
      fileId: "file-1",
      bucket: "documents",
      filePath: "tenant-a/general/file-1.pdf",
      fileName: "file-1.pdf",
      size: 16,
      mimeType: "application/pdf",
      fileUrl: "https://files.example/file-1.pdf",
    });
    mocks.createFile.mockImplementation(async (file) => file);
  });

  it("rejects entity references from another tenant before uploading", async () => {
    mocks.getProperty.mockResolvedValue({ id: "property-b", tenantId: "tenant-b" });
    const app = buildApp("tenant-a");

    const res = await request(app)
      .post("/api/files/upload")
      .field("fileType", "document")
      .field("entityType", "property")
      .field("entityId", "property-b")
      .attach("file", Buffer.from("fake pdf"), "document.pdf");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Entity not found");
    expect(mocks.uploadFile).not.toHaveBeenCalled();
    expect(mocks.createFile).not.toHaveBeenCalled();
  });

  it("persists a normalized entity reference only after tenant ownership is proven", async () => {
    mocks.getProperty.mockResolvedValue({ id: "property-a", tenantId: "tenant-a" });
    const app = buildApp("tenant-a");

    const res = await request(app)
      .post("/api/files/upload")
      .field("fileType", "document")
      .field("entityType", "property")
      .field("entityId", "property-a")
      .attach("file", Buffer.from("fake pdf"), "document.pdf");

    expect(res.status).toBe(200);
    expect(mocks.uploadFile).toHaveBeenCalledTimes(1);
    expect(mocks.createFile).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-a",
        entityType: "property",
        entityId: "property-a",
      }),
    );
  });
});
