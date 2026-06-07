/**
 * CSRF Protection — Integração REAL
 *
 * Antes esta suíte montava um app Express MOCK self-contained (createTestApp)
 * que reimplementava o middleware de CSRF — ou seja, testava uma cópia, não o
 * código de produção. Aqui exercitamos o CSRF REAL do app:
 *
 *  - Sobe o ROUTER REAL (`registerRoutes` de server/routes.ts) com o STORAGE
 *    REAL contra um SQLite de teste isolado por arquivo (parallel-safe).
 *  - O CSRF real usa o padrão Double Submit Cookie: o middleware
 *    `csrfProtection` (server/routes.ts) compara o cookie httpOnly `csrf-token`
 *    com o header `x-csrf-token` em métodos mutantes (POST/PATCH/DELETE...),
 *    usando `crypto.timingSafeEqual`. O login (`POST /api/auth/login`) seta o
 *    cookie e devolve o mesmo valor no corpo (`csrfToken`) para ser ecoado no
 *    header. O agent do supertest guarda o cookie automaticamente.
 *  - Provamos: (a) mutação em rota real protegida SEM o header X-CSRF-Token é
 *    rejeitada com 403; (b) COM o token correto é aceita; (c) rotas
 *    CSRF-excluded (login, webhook do Stripe) passam pelo middleware sem token.
 *
 * Observação sobre o comportamento REAL (não enfraquecemos asserções p/ verde):
 *  - O middleware compara cookie vs header (Double Submit Cookie). Ele NÃO
 *    compara contra um valor guardado na sessão. Logo, um par cookie+header
 *    arbitrário porém IGUAL passaria a validação — isso é inerente ao padrão
 *    Double Submit (sem segredo de servidor) e é o comportamento real esperado.
 *    Por isso o ataque relevante e testável aqui é: header ausente, ou
 *    header != cookie da sessão (que é o caso do atacante cross-site, que não
 *    consegue ler o cookie httpOnly para refleti-lo no header).
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from "vitest";
import request from "supertest";
import type { Express } from "express";
import bcrypt from "bcryptjs";
import {
  prepareTestEnv,
  setupFreshDatabase,
  restoreDatabase,
  buildRealApp,
  flushRateLimitKeys,
} from "../../helpers/tenant-isolation-app";

// Precisa rodar ANTES de qualquer import de server/* (feito dentro de buildRealApp).
prepareTestEnv();

interface StorageLike {
  createTenant: (data: Record<string, unknown>) => Promise<{ id: string }>;
  createUser: (data: Record<string, unknown>) => Promise<{ id: string }>;
  getProperty: (id: string) => Promise<{ title?: string } | undefined>;
}

describe("CSRF Protection — REAL app + REAL middleware (Double Submit Cookie)", () => {
  let app: Express;
  let storage: StorageLike;
  let closeDb: () => Promise<void>;

  // Agente autenticado (mantém cookie de sessão + cookie httpOnly csrf-token).
  let agent: ReturnType<typeof request.agent>;
  let csrfToken: string;
  let tenantId: string;
  let userEmail: string;

  const PASSWORD = "SenhaForteDeTeste123!";

  beforeAll(async () => {
    // tests/setup.ts roda seu beforeAll global e pode sobrescrever env; reaplica.
    prepareTestEnv();
    setupFreshDatabase();
    const built = await buildRealApp();
    app = built.app;
    storage = built.storage as unknown as StorageLike;
    closeDb = built.closeDb;

    const tenant = await storage.createTenant({
      name: "Imobiliária CSRF",
      slug: `imob-csrf-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      primaryColor: "#0066cc",
      secondaryColor: "#333333",
      email: "contato-csrf@example.com",
    });
    tenantId = tenant.id;

    userEmail = `user-csrf-${Date.now()}@example.com`;
    const hashed = await bcrypt.hash(PASSWORD, 10);
    await storage.createUser({
      tenantId,
      name: "Corretor CSRF",
      email: userEmail,
      password: hashed,
      role: "admin",
    });

    // Evita 429 falso por contadores acumulados de rate-limit.
    await flushRateLimitKeys();

    // Login: /api/auth/login é CSRF-excluded (não precisa de token) e devolve o
    // par cookie httpOnly `csrf-token` + corpo `csrfToken` (Double Submit Cookie).
    agent = request.agent(app);
    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email: userEmail, password: PASSWORD });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.tenantId).toBe(tenantId);
    csrfToken = loginRes.body.csrfToken;
    expect(csrfToken).toBeTruthy();
  }, 30000);

  afterAll(async () => {
    try {
      if (closeDb) await closeDb();
    } finally {
      restoreDatabase();
    }
  });

  // ---------------------------------------------------------------------------
  // (a) Mutação SEM header X-CSRF-Token é REJEITADA com 403
  // ---------------------------------------------------------------------------
  describe("Mutação SEM header X-CSRF-Token -> 403", () => {
    it("POST /api/properties sem X-CSRF-Token é rejeitado (403)", async () => {
      const res = await agent.post("/api/properties").send({
        title: "Casa sem token",
        type: "house",
        category: "sale",
        price: "500000",
        address: "Rua A, 1",
        city: "São Paulo",
        state: "SP",
        status: "available",
      });

      expect(res.status).toBe(403);
      // Erro vem do middleware real: { error: "CSRF token missing", required: {...} }
      expect(res.body.error).toContain("CSRF token missing");
      expect(res.body.required).toMatchObject({
        cookie: "csrf-token",
        header: "x-csrf-token",
      });
    });

    it("PATCH /api/properties/:id sem X-CSRF-Token é rejeitado (403 antes de tocar o recurso)", async () => {
      // Cria um imóvel real (com token) para ter um :id válido.
      const created = await agent
        .post("/api/properties")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Casa para PATCH",
          type: "house",
          category: "sale",
          price: "600000",
          address: "Rua B, 2",
          city: "São Paulo",
          state: "SP",
          status: "available",
        });
      expect(created.status).toBe(201);
      const propertyId: string = created.body.data.id;

      const res = await agent
        .patch(`/api/properties/${propertyId}`)
        .send({ title: "HACKED-SEM-CSRF" });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("CSRF token missing");

      // O CSRF bloqueia ANTES do handler: o recurso não foi modificado.
      const after = await storage.getProperty(propertyId);
      expect(after?.title).toBe("Casa para PATCH");
    });

    it("DELETE /api/properties/:id sem X-CSRF-Token é rejeitado (403, recurso preservado)", async () => {
      const created = await agent
        .post("/api/properties")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Casa para DELETE",
          type: "house",
          category: "sale",
          price: "700000",
          address: "Rua C, 3",
          city: "São Paulo",
          state: "SP",
          status: "available",
        });
      expect(created.status).toBe(201);
      const propertyId: string = created.body.data.id;

      const res = await agent.delete(`/api/properties/${propertyId}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toContain("CSRF token missing");

      // CSRF bloqueou antes do handler: o recurso continua existindo.
      expect(await storage.getProperty(propertyId)).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // (b) Mutação COM o csrfToken correto é ACEITA
  // ---------------------------------------------------------------------------
  describe("Mutação COM X-CSRF-Token correto é aceita", () => {
    it("POST /api/properties com X-CSRF-Token cria o imóvel (201)", async () => {
      const res = await agent
        .post("/api/properties")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Casa com token válido",
          type: "house",
          category: "sale",
          price: "800000",
          address: "Rua D, 4",
          city: "São Paulo",
          state: "SP",
          status: "available",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBeTruthy();
      expect(res.body.data.tenantId).toBe(tenantId);
    });

    it("PATCH /api/properties/:id com X-CSRF-Token edita o imóvel (200)", async () => {
      const created = await agent
        .post("/api/properties")
        .set("x-csrf-token", csrfToken)
        .send({
          title: "Antes da edição",
          type: "house",
          category: "sale",
          price: "900000",
          address: "Rua E, 5",
          city: "São Paulo",
          state: "SP",
          status: "available",
        });
      expect(created.status).toBe(201);
      const propertyId: string = created.body.data.id;

      const res = await agent
        .patch(`/api/properties/${propertyId}`)
        .set("x-csrf-token", csrfToken)
        .send({ title: "Depois da edição" });

      expect(res.status).toBe(200);
      const after = await storage.getProperty(propertyId);
      expect(after?.title).toBe("Depois da edição");
    });
  });

  // ---------------------------------------------------------------------------
  // Token presente porém INVÁLIDO (não bate com o cookie da sessão) -> 403
  // Este é o cenário real do atacante cross-site: não consegue ler o cookie
  // httpOnly, então o header que ele força nunca casa com o cookie.
  // ---------------------------------------------------------------------------
  describe("Header X-CSRF-Token presente mas != cookie da sessão -> 403", () => {
    it("token de comprimento diferente -> 403 (timingSafeEqual lança, vira 'Invalid CSRF token format')", async () => {
      const res = await agent
        .post("/api/properties")
        .set("x-csrf-token", "token-curto-invalido")
        .send({
          title: "Casa token inválido",
          type: "house",
          category: "sale",
          price: "100000",
          address: "Rua F, 6",
          city: "São Paulo",
          state: "SP",
          status: "available",
        });

      expect(res.status).toBe(403);
      // Cookie e header têm comprimentos diferentes => timingSafeEqual lança =>
      // o middleware real captura e responde "Invalid CSRF token format".
      expect(res.body.error).toBe("Invalid CSRF token format");
    });

    it("token de MESMO comprimento mas valor diferente -> 403 (CSRF token mismatch)", async () => {
      // base64url de 32 bytes => 43 chars, mesmo comprimento do token real.
      const sameLengthWrong = "A".repeat(csrfToken.length);
      expect(sameLengthWrong.length).toBe(csrfToken.length);

      const res = await agent
        .post("/api/properties")
        .set("x-csrf-token", sameLengthWrong)
        .send({
          title: "Casa token mismatch",
          type: "house",
          category: "sale",
          price: "100000",
          address: "Rua G, 7",
          city: "São Paulo",
          state: "SP",
          status: "available",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("CSRF token mismatch");
    });

    it("header X-CSRF-Token vazio -> 403 (tratado como ausente)", async () => {
      const res = await agent
        .post("/api/properties")
        .set("x-csrf-token", "")
        .send({
          title: "Casa token vazio",
          type: "house",
          category: "sale",
          price: "100000",
          address: "Rua H, 8",
          city: "São Paulo",
          state: "SP",
          status: "available",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("CSRF token missing");
    });
  });

  // ---------------------------------------------------------------------------
  // Métodos seguros (GET) não exigem CSRF
  // ---------------------------------------------------------------------------
  describe("Métodos seguros não exigem CSRF", () => {
    it("GET /api/properties não exige X-CSRF-Token (200)", async () => {
      const res = await agent.get("/api/properties");
      expect(res.status).toBe(200);
    });

    it("GET /api/csrf-token renova o token sem exigir header (200)", async () => {
      const res = await agent.get("/api/csrf-token");
      expect(res.status).toBe(200);
      expect(res.body.csrfToken).toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // (c) Rotas CSRF-excluded passam pelo middleware SEM token
  // Asserção: NÃO retornam o 403 de CSRF. Podem falhar adiante por outras
  // razões (credenciais, assinatura do webhook), mas não por CSRF.
  // ---------------------------------------------------------------------------
  describe("Rotas CSRF-excluded passam pelo middleware sem token", () => {
    it("POST /api/auth/login não é bloqueado por CSRF (credenciais válidas -> 200)", async () => {
      // Novo agent (sem cookie csrf-token) prova que login não precisa de CSRF.
      const fresh = request.agent(app);
      await flushRateLimitKeys();
      const res = await fresh
        .post("/api/auth/login")
        .send({ email: userEmail, password: PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.csrfToken).toBeTruthy();
    });

    it("POST /api/auth/login com credenciais erradas -> 401 (não 403 de CSRF)", async () => {
      const fresh = request.agent(app);
      await flushRateLimitKeys();
      const res = await fresh
        .post("/api/auth/login")
        .send({ email: userEmail, password: "senha-errada" });

      // Excluída do CSRF: o erro NUNCA é o 403 de "CSRF token missing".
      expect(res.status).not.toBe(403);
      expect(res.body.error).not.toContain("CSRF token missing");
      expect(res.status).toBe(401);
    });

    it("POST /api/webhooks/stripe não é bloqueado por CSRF (sem token -> falha de assinatura 400, não 403)", async () => {
      const fresh = request.agent(app);
      const res = await fresh
        .post("/api/webhooks/stripe")
        .send({ type: "checkout.session.completed", data: {} });

      // Excluída do CSRF: passa pelo middleware. O handler do Stripe rejeita por
      // falta de assinatura (400) — o que prova que não foi barrado por CSRF.
      expect(res.status).not.toBe(403);
      expect(res.body?.error ?? "").not.toContain("CSRF token missing");
      expect(res.status).toBe(400);
    });
  });
});
