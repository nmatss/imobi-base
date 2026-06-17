import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const redis = {
    set: vi.fn(),
    get: vi.fn(),
    eval: vi.fn(),
  };
  const jobs = {
    runPaymentReminders: vi.fn(async () => undefined),
    runDailyReports: vi.fn(async () => undefined),
    runWeeklyReports: vi.fn(async () => undefined),
    runMonthlyReports: vi.fn(async () => undefined),
    runCleanupSessions: vi.fn(async () => undefined),
    runCleanupLogs: vi.fn(async () => undefined),
    runIntegrationSync: vi.fn(async () => undefined),
    runDatabaseBackup: vi.fn(async () => undefined),
    runCleanupTempFiles: vi.fn(async () => undefined),
    runCleanupSoftDeletes: vi.fn(async () => undefined),
    runEnforcePlanLimits: vi.fn(async () => undefined),
  };
  return { redis, jobs };
});

vi.mock("../../server/cache/redis-client", () => ({
  getRedisClient: () => mocks.redis,
}));

vi.mock("../../server/jobs/scheduled-jobs", () => mocks.jobs);

vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
}));

const { registerCronRoutes } = await import("../../server/routes-cron");

function buildApp() {
  const app = express();
  registerCronRoutes(app);
  return app;
}

describe("cron runtime guards", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    process.env.NODE_ENV = "production";
    vi.clearAllMocks();
    mocks.redis.set.mockResolvedValue("OK");
    mocks.redis.get.mockResolvedValue(null);
    mocks.redis.eval.mockResolvedValue(1);
  });

  it("uses a Redis NX lock and releases it after a cron run", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/api/cron/payment-reminders")
      .set("Authorization", "Bearer cron-secret");

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    expect(response.body.lockMode).toBe("redis");
    expect(mocks.jobs.runPaymentReminders).toHaveBeenCalledTimes(1);
    expect(mocks.redis.set).toHaveBeenCalledWith(
      "imobibase:cron:lock:payment-reminders",
      expect.any(String),
      "EX",
      expect.any(Number),
      "NX",
    );
    expect(mocks.redis.eval).toHaveBeenCalledTimes(1);
  });

  it("skips duplicate cron runs without executing the job", async () => {
    mocks.redis.set.mockImplementation(async (key: string) => {
      if (key.includes(":lock:")) return null;
      return "OK";
    });
    const app = buildApp();

    const response = await request(app)
      .get("/api/cron/payment-reminders")
      .set("Authorization", "Bearer cron-secret");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      skipped: true,
      job: "payment-reminders",
      lockMode: "redis",
    });
    expect(mocks.jobs.runPaymentReminders).not.toHaveBeenCalled();
  });

  it("returns persisted last-run status on the cron status endpoint", async () => {
    mocks.redis.get.mockResolvedValueOnce(JSON.stringify({
      job: "payment-reminders",
      state: "succeeded",
      lockMode: "redis",
      completedAt: "2026-06-17T00:00:00.000Z",
      durationMs: 123,
    }));
    const app = buildApp();

    const response = await request(app)
      .get("/api/cron/status")
      .set("Authorization", "Bearer cron-secret");

    expect(response.status).toBe(200);
    expect(response.body.lockMode).toBe("redis-required");
    expect(response.body.jobs[0].lastRun).toMatchObject({
      job: "payment-reminders",
      state: "succeeded",
      durationMs: 123,
    });
  });
});
