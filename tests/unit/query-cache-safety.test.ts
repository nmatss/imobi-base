import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getCached,
  setCached,
  InvalidateCache,
  clearTenantCache,
} from "../../server/cache/query-cache";

// PERF-4/ESC-1: o cache deve ser um NO-OP seguro quando REDIS_URL nao esta
// configurada (serverless/test/dev-sem-redis), nunca caindo para localhost:6379
// (o que geraria reconexao/latencia a cada query). Estes testes travam isso.
describe("query-cache — no-op seguro sem REDIS_URL", () => {
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
  });

  afterEach(() => {
    if (previous !== undefined) process.env.REDIS_URL = previous;
  });

  it("getCached retorna null", async () => {
    expect(await getCached("imobibase:test:key")).toBeNull();
  });

  it("setCached nao lanca", async () => {
    await expect(setCached("imobibase:test:key", { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it("invalidacoes sao no-op", async () => {
    await expect(InvalidateCache.onLeadChange("t1", "l1")).resolves.toBeUndefined();
    await expect(InvalidateCache.onPropertyChange("t1", "p1")).resolves.toBeUndefined();
    await expect(clearTenantCache("t1")).resolves.toBeUndefined();
  });
});
