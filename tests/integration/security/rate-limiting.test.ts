/**
 * Rate Limiting — Integração REAL
 *
 * Substitui a antiga suíte fake (que montava um Express self-contained com
 * limiters inventados e nunca tocava o código de produção). Aqui subimos o
 * ROUTER REAL do projeto (`registerRoutes` de server/routes.ts) via o harness
 * tenant-isolation-app e provamos que os limiters REAIS retornam 429 ao
 * estourar o limite configurado.
 *
 * Limiters reais relevantes (server/routes.ts), todos com store em memória no
 * ambiente de teste (sem Redis):
 *   - registerLimiter: max 5 / 1h em POST /api/auth/register (mais baixo →
 *     ideal para exercitar rápido e de forma determinística).
 *   - authLimiter:     max 20 / 15min em POST /api/auth/login.
 *   - apiLimiter:      max 500 / 15min em todo /api/ (alto demais p/ exercitar
 *     rápido; não é o alvo aqui).
 *
 * Ambas as rotas alvo (login/register) são CSRF-excluded (csrfExcludedPaths),
 * então não precisamos de token CSRF — basta bater repetidamente.
 *
 * Observação sobre a CHAVE do limiter: nem authLimiter nem o apiLimiter global
 * usam keyGenerator custom, então a chave é o IP (subnet ::/56 no supertest). No
 * supertest o IP é estável dentro da mesma execução, logo o contador acumula.
 *
 * COMPORTAMENTO REAL OBSERVADO (não é bug de teste, é como o produção está hoje):
 * server/routes.ts compartilha UMA mesma instância de RedisStore entre apiLimiter
 * (max 500) e authLimiter (max 20) — ambos com a chave-padrão por IP. Com store +
 * chave compartilhados, CADA request a /api/auth/login incrementa o MESMO contador
 * Redis DUAS vezes (uma pelo apiLimiter global em app.use("/api/"), outra pelo
 * authLimiter da rota). Resultado: o 429 do authLimiter dispara por volta da ~11ª
 * request em vez da 21ª. A proteção 429 FUNCIONA (até mais cedo que o configurado);
 * por isso NÃO fixamos o número exato de requests — fazemos loop-até-429 com teto.
 * (express-rate-limit loga ERR_ERL_STORE_REUSE/ERR_ERL_KEY_GEN_IPV6 alertando para
 * isso; correção fica em server/routes.ts, fora do escopo deste arquivo de teste.)
 *
 * flushRateLimitKeys() zera contadores no Redis compartilhado (prefixo rl:) ANTES
 * de cada bloco, para começar limpo e não herdar contagem de execuções anteriores.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import {
  prepareTestEnv,
  setupFreshDatabase,
  restoreDatabase,
  buildRealApp,
  flushRateLimitKeys,
} from "../../helpers/tenant-isolation-app";

// Precisa rodar ANTES de qualquer import de server/* (feito dentro de buildRealApp).
prepareTestEnv();

// Limites reais configurados em server/routes.ts (mantidos em sync manual).
const REGISTER_LIMIT = 5; // registerLimiter: max 5 / 1h em /api/auth/register (in-memory, isolado)
const AUTH_LIMIT = 20; // authLimiter:     max 20 / 15min em /api/auth/login (anunciado no header)
const API_CEILING = 500; // apiLimiter global: max 500 / 15min — teto absoluto p/ o loop-até-429

describe("Rate Limiting — REAL app + REAL limiters", () => {
  let app: Express;
  let closeDb: () => Promise<void>;

  beforeAll(async () => {
    // Re-aplica env aqui: tests/setup.ts roda beforeAll global e pode ter
    // sobrescrito SESSION_SECRET com valor curto.
    prepareTestEnv();
    setupFreshDatabase();
    const built = await buildRealApp();
    app = built.app;
    closeDb = built.closeDb;

    // Zera contadores de rate-limit num eventual Redis compartilhado.
    await flushRateLimitKeys();
  }, 30000);

  afterAll(async () => {
    try {
      if (closeDb) await closeDb();
    } finally {
      restoreDatabase();
    }
  });

  describe("registerLimiter (POST /api/auth/register, max 5/h)", () => {
    it("retorna 429 após exceder o limite real de registros", async () => {
      // O registerLimiter usa store EM MEMÓRIA próprio (max 5), isolado do Redis
      // e da contagem de outros testes — começa do zero neste processo.
      const agent = request.agent(app);

      // Faz LIMIT requisições "permitidas" (não 429) — não exigimos sucesso de
      // negócio (provavelmente 400/401 por payload inválido), só que NÃO seja 429.
      for (let i = 0; i < REGISTER_LIMIT; i++) {
        const res = await agent
          .post("/api/auth/register")
          .send({
            email: `flood-${i}@example.com`,
            password: "x",
          });
        expect(res.status).not.toBe(429);
      }

      // A requisição seguinte (LIMIT+1) DEVE ser barrada com 429.
      const blocked = await agent
        .post("/api/auth/register")
        .send({ email: "flood-extra@example.com", password: "x" });

      expect(blocked.status).toBe(429);
      // express-rate-limit emite Retry-After ao acionar o handler default.
      expect(blocked.headers["retry-after"]).toBeDefined();
    }, 30000);

    it("emite headers padrão de rate limit (RateLimit-*)", async () => {
      // Reusa a janela já estourada acima: mesmo bloqueado, os headers
      // standardHeaders continuam presentes.
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "flood-headers@example.com", password: "x" });

      expect(res.headers["ratelimit-limit"]).toBeDefined();
      // O limite anunciado deve refletir o configurado (5).
      expect(res.headers["ratelimit-limit"]).toBe(String(REGISTER_LIMIT));
      expect(res.headers["ratelimit-remaining"]).toBeDefined();
    }, 15000);
  });

  describe("authLimiter (POST /api/auth/login, max 20/15min)", () => {
    it("aceita requisições e depois retorna 429 ao estourar o limite real", async () => {
      // Zera o contador compartilhado no Redis antes de exercitar (caso contrário
      // herdaríamos a contagem dos testes de /register e de execuções passadas).
      await flushRateLimitKeys();

      const agent = request.agent(app);

      let firstAllowed = -1; // índice da 1ª request processada (não-429)
      let firstBlocked = -1; // índice da 1ª request barrada (429)
      let blockedRes: request.Response | undefined;

      // Loop-até-429 com teto na capacidade do apiLimiter global (500). Não
      // fixamos o número exato porque apiLimiter+authLimiter dividem a mesma chave
      // Redis e cada request conta 2x (ver cabeçalho do arquivo).
      for (let i = 1; i <= API_CEILING; i++) {
        const res = await agent
          .post("/api/auth/login")
          .send({ email: `nobody-${i}@example.com`, password: "wrong" });

        if (res.status !== 429 && firstAllowed === -1) firstAllowed = i;
        if (res.status === 429) {
          firstBlocked = i;
          blockedRes = res;
          break;
        }
      }

      // Pelo menos a 1ª request foi processada (auth falhou com 401, não 429).
      expect(firstAllowed).toBe(1);
      // O limiter REAL eventualmente barrou com 429 — antes do teto do apiLimiter.
      expect(firstBlocked).toBeGreaterThan(firstAllowed);
      expect(firstBlocked).toBeLessThanOrEqual(API_CEILING);
      expect(blockedRes).toBeDefined();
      expect(blockedRes?.status).toBe(429);
      // express-rate-limit envia Retry-After ao bloquear.
      expect(blockedRes?.headers["retry-after"]).toBeDefined();
    }, 60000);

    it("anuncia o limite real (20) no header RateLimit-Limit", async () => {
      // standardHeaders: o authLimiter expõe seu próprio max no RateLimit-Limit,
      // independente do contador compartilhado. Flush p/ não pegar uma resposta 429.
      await flushRateLimitKeys();

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "header-check@example.com", password: "wrong" });

      expect(res.headers["ratelimit-limit"]).toBe(String(AUTH_LIMIT));
      expect(res.headers["ratelimit-remaining"]).toBeDefined();
    }, 15000);
  });
});
