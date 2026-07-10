import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Fake Redis com NX real (Map de respaldo) para provar dedup entre requisicoes.
const mocks = vi.hoisted(() => {
  const store = new Map<string, string>();
  const redis = {
    set: vi.fn(async (key: string, val: string, _ex?: string, _sec?: number, mode?: string) => {
      if (mode === "NX") {
        if (store.has(key)) return null;
        store.set(key, val);
        return "OK";
      }
      store.set(key, val);
      return "OK";
    }),
    get: vi.fn(async (key: string) => (store.has(key) ? store.get(key)! : null)),
  };
  const getRedisClient = vi.fn(() => redis);
  return { redis, getRedisClient, store };
});

vi.mock("../../server/cache/redis-client", () => ({
  getRedisClient: () => mocks.getRedisClient(),
}));

vi.mock("@sentry/node", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const { idempotencyCheck } = await import("../../server/middleware/idempotency");

function buildApp() {
  const app = express();
  app.use(express.json());
  let counter = 0;
  app.post("/charge", idempotencyCheck, (_req, res) => {
    counter += 1;
    res.json({ id: `charge_${counter}` });
  });
  return app;
}

describe("idempotencyCheck (ACT-3/ESC-2)", () => {
  beforeEach(() => {
    mocks.store.clear();
    mocks.getRedisClient.mockReturnValue(mocks.redis);
    vi.clearAllMocks();
    mocks.getRedisClient.mockReturnValue(mocks.redis);
  });

  it("processa normalmente quando nao ha Idempotency-Key", async () => {
    const app = buildApp();
    const a = await request(app).post("/charge").send({});
    const b = await request(app).post("/charge").send({});
    expect(a.body.id).toBe("charge_1");
    expect(b.body.id).toBe("charge_2"); // sem chave => processa de novo
  });

  it("deduplica via Redis: 2a requisicao com mesma chave retorna a resposta cacheada", async () => {
    const app = buildApp();
    const key = "k-dedup-1";
    const first = await request(app).post("/charge").set("Idempotency-Key", key).send({});
    const second = await request(app).post("/charge").set("Idempotency-Key", key).send({});
    expect(first.body.id).toBe("charge_1");
    // handler NAO roda de novo — mesma resposta persistida no Redis
    expect(second.body.id).toBe("charge_1");
  });

  it("responde 409 quando a chave esta reservada e ainda em processamento", async () => {
    const app = buildApp();
    const key = "k-inflight";
    // Simula reserva em voo de outra instancia (estado pending no store).
    mocks.store.set(`idem:POST:/charge:${key}`, "__pending__");
    const res = await request(app).post("/charge").set("Idempotency-Key", key).send({});
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("IDEMPOTENCY_IN_PROGRESS");
  });

  it("cai para memoria quando Redis nao esta configurado e ainda deduplica intra-instancia", async () => {
    mocks.getRedisClient.mockImplementation(() => {
      throw new Error("Redis indisponivel: REDIS_URL nao configurada.");
    });
    const app = buildApp();
    const key = "k-fallback";
    const first = await request(app).post("/charge").set("Idempotency-Key", key).send({});
    const second = await request(app).post("/charge").set("Idempotency-Key", key).send({});
    expect(first.body.id).toBe("charge_1");
    expect(second.body.id).toBe("charge_1"); // dedup pelo fallback em memoria
  });
});
