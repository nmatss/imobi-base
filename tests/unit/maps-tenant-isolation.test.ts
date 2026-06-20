import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const propertyLocationServiceMock = vi.hoisted(() => ({
  findNearbyProperties: vi.fn(async () => []),
  getPropertiesWithCoordinates: vi.fn(async () => []),
}));

vi.mock("../../server/integrations/maps/property-location", () => ({
  default: propertyLocationServiceMock,
}));

vi.mock("../../server/integrations/maps/geocoding-service", () => ({
  default: {
    geocodeAddress: vi.fn(),
    reverseGeocode: vi.fn(),
    validateAddress: vi.fn(),
  },
}));

vi.mock("../../server/integrations/maps/places-service", () => ({
  default: {
    autocomplete: vi.fn(),
    calculateWalkabilityScore: vi.fn(),
    findAmenities: vi.fn(),
    getPlaceDetails: vi.fn(),
    searchNearby: vi.fn(),
  },
}));

vi.mock("../../server/integrations/maps/distance-service", () => ({
  default: {
    calculateDistance: vi.fn(),
    calculateDistanceMatrix: vi.fn(),
    getDirections: vi.fn(),
  },
}));

vi.mock("../../server/integrations/maps/google-maps-client", () => ({
  default: {
    isApiEnabled: vi.fn(() => false),
    validateApiKey: vi.fn(async () => false),
  },
}));

vi.mock("../../server/integrations/maps/cache", () => ({
  default: {
    clear: vi.fn(),
    getStats: vi.fn(() => ({ size: 0 })),
  },
}));

const { default: mapsRouter } = await import("../../server/routes-maps");

type TestRequest = {
  isAuthenticated: () => boolean;
  user: Express.User;
};

const AUTHENTICATED_TENANT_ID = "tenant-authenticated";
const QUERY_TENANT_ID = "tenant-from-query";

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const testReq = req as unknown as TestRequest;
    testReq.isAuthenticated = () => true;
    testReq.user = {
      id: "user-1",
      tenantId: AUTHENTICATED_TENANT_ID,
      name: "Admin User",
      email: "admin@example.com",
      role: "admin",
      avatar: null,
    };
    next();
  });
  app.use("/api/maps", mapsRouter);
  app.use(
    (
      err: Error & { status?: number; statusCode?: number },
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      res.status(err.status || err.statusCode || 500).json({ error: err.message });
    },
  );
  return app;
}

describe("Maps tenant isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores tenantId query when listing map properties", async () => {
    const app = buildApp();

    const res = await request(app).get(
      `/api/maps/properties/map?tenantId=${QUERY_TENANT_ID}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    expect(propertyLocationServiceMock.getPropertiesWithCoordinates).toHaveBeenCalledWith(
      AUTHENTICATED_TENANT_ID,
    );
    expect(propertyLocationServiceMock.getPropertiesWithCoordinates).not.toHaveBeenCalledWith(
      QUERY_TENANT_ID,
    );
  });

  it("ignores tenantId query when finding nearby properties", async () => {
    const app = buildApp();

    const res = await request(app).get(
      `/api/maps/properties/nearby?latitude=-23.55&longitude=-46.63&radius=1000&tenantId=${QUERY_TENANT_ID}`,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);

    expect(propertyLocationServiceMock.findNearbyProperties).toHaveBeenCalledWith(
      -23.55,
      -46.63,
      1000,
      AUTHENTICATED_TENANT_ID,
    );
    expect(propertyLocationServiceMock.findNearbyProperties).not.toHaveBeenCalledWith(
      -23.55,
      -46.63,
      1000,
      QUERY_TENANT_ID,
    );
  });
});
