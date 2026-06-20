import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  unsubscribeNewsletter: vi.fn(),
}));

vi.mock("express-rate-limit", () => ({
  default: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock("../../server/email/email-service", () => ({
  getEmailService: vi.fn(),
  initializeEmailService: vi.fn(() => ({
    initialize: vi.fn(async () => undefined),
    send: vi.fn(),
    sendBulk: vi.fn(),
    verify: vi.fn(async () => ({ success: true })),
    getTemplates: vi.fn(async () => []),
    previewTemplate: vi.fn(async () => "<html></html>"),
    getQueueStats: vi.fn(async () => ({})),
    isConfigured: vi.fn(() => true),
    verifyConnection: vi.fn(async () => ({ success: true })),
  })),
}));

vi.mock("../../server/storage", () => ({
  storage: {
    unsubscribeNewsletter: mocks.unsubscribeNewsletter,
    getNewsletterSubscriptionsByEmails: vi.fn(async () => []),
  },
}));

vi.mock("../../server/middleware/validate", () => ({
  validateBody: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  validateParams: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}));

vi.mock("../../server/schemas/email", () => ({
  sendEmailSchema: {},
  sendBulkEmailSchema: {},
  testEmailSchema: {},
  previewTemplateSchema: {},
  templateNameParamSchema: {},
}));

vi.mock("../../server/middleware/rate-limit-key-generator", () => ({
  generateRateLimitKey: vi.fn(() => "unit-test-rate-limit-key"),
}));

const { generateUnsubscribeToken } = await import("../../server/email/utils");
const { registerEmailRoutes } = await import("../../server/routes-email");

const ENV_KEYS = ["UNSUBSCRIBE_TOKEN_SECRET", "SESSION_SECRET"] as const;

function buildApp(): express.Express {
  const app = express();
  registerEmailRoutes(app);
  return app;
}

describe("email unsubscribe public route", () => {
  const originalEnv: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of ENV_KEYS) {
      originalEnv[key] = process.env[key];
    }
    process.env.UNSUBSCRIBE_TOKEN_SECRET = "unit-test-unsubscribe-route-secret";
    delete process.env.SESSION_SECRET;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("persists opt-out when the unsubscribe token is signed and valid", async () => {
    const app = buildApp();
    const token = generateUnsubscribeToken("user-1", "Client@Test.com");

    const res = await request(app).get(`/api/email/unsubscribe/${encodeURIComponent(token)}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain("You have been unsubscribed");
    expect(res.text).toContain("Client@Test.com");
    expect(mocks.unsubscribeNewsletter).toHaveBeenCalledWith(
      "Client@Test.com",
      "email_unsubscribe_link",
    );
  });

  it("rejects legacy unsigned unsubscribe tokens without changing opt-out state", async () => {
    const app = buildApp();
    const legacyToken = Buffer.from(
      `user-1:client@example.com:${Date.now()}`,
    ).toString("base64url");

    const res = await request(app).get(`/api/email/unsubscribe/${legacyToken}`);

    expect(res.status).toBe(400);
    expect(res.text).toContain("Invalid or Expired Token");
    expect(mocks.unsubscribeNewsletter).not.toHaveBeenCalled();
  });
});
