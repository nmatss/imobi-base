/**
 * Auth Integration Tests (HTTP) — app REAL via supertest
 *
 * Versão anterior fazia fetch para http://localhost:5000 (servidor externo que
 * não existe no CI), produzindo falso-vermelho. Aqui montamos o app REAL com o
 * router real (`registerRoutes`) e o storage real contra um banco SQLite isolado
 * por arquivo (helper tenant-isolation-app), sem abrir porta/rede.
 *
 * Cobre os mesmos casos do teste original:
 *  - login com credenciais válidas -> 200 (+ corpo com user/tenant/csrfToken)
 *  - login com senha errada -> 401
 *  - registro de novo tenant -> 201
 *  - rota protegida sem auth (/api/auth/me) -> 401
 *  - registro com email duplicado -> 409
 *
 * Importações de server/* são dinâmicas dentro de buildRealApp e DEVEM acontecer
 * após prepareTestEnv()+setupFreshDatabase(); por isso prepareTestEnv() roda no
 * topo do módulo (igual a tenant-isolation.test.ts).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import bcrypt from "bcryptjs";
import {
  prepareTestEnv,
  setupFreshDatabase,
  restoreDatabase,
  buildRealApp,
  flushRateLimitKeys,
} from "../helpers/tenant-isolation-app";

// Precisa rodar ANTES de qualquer import de server/* (feito dentro de buildRealApp).
prepareTestEnv();

describe("Auth Integration Tests (HTTP) — REAL app + REAL storage", () => {
  let app: Express;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let storage: any;
  let closeDb: () => Promise<void>;

  // Usuário admin semeado diretamente no storage real para o caso de login.
  const ADMIN_EMAIL = `admin-${Date.now()}@example.com`;
  const ADMIN_PASSWORD = "SenhaForteDeTeste123!";
  let adminTenantId: string;

  beforeAll(async () => {
    // tests/setup.ts (beforeAll global) pode sobrescrever SESSION_SECRET; re-aplica.
    prepareTestEnv();
    setupFreshDatabase();
    const built = await buildRealApp();
    app = built.app;
    storage = built.storage;
    closeDb = built.closeDb;

    const tenant = await storage.createTenant({
      name: "Imobiliária Sol",
      slug: `sol-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      primaryColor: "#0066cc",
      secondaryColor: "#333333",
      email: "contato@sol.example.com",
    });
    adminTenantId = tenant.id;

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await storage.createUser({
      tenantId: tenant.id,
      name: "Admin Sol",
      email: ADMIN_EMAIL,
      password: hashed,
      role: "admin",
    });

    // Evita 429 falso por contadores de rate-limit acumulados (Redis compartilhado).
    await flushRateLimitKeys();
  }, 30000);

  afterAll(async () => {
    try {
      if (closeDb) await closeDb();
    } finally {
      restoreDatabase();
    }
  });

  it("login com credenciais válidas retorna 200", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
    expect(res.body.user.tenantId).toBe(adminTenantId);
    expect(res.body.csrfToken).toBeTruthy();
  });

  it("login com senha errada retorna 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "senha-totalmente-errada" });

    expect(res.status).toBe(401);
  });

  // BUG REAL (P0) descoberto ao exercitar o fluxo REAL de /api/auth/register:
  // server/seed-defaults.ts:473 chama `storage.createTenantSettings(...)`, método
  // que NÃO existe no storage (a interface expõe `createOrUpdateTenantSettings`).
  // Resultado: TODO registro de novo tenant que passa nas validações cai no
  // catch e retorna 500 ("Erro ao criar conta"). setupNewTenant() roda DEPOIS da
  // checagem de unicidade de email/slug, então o caminho feliz quebra por
  // completo. Não corrijo aqui porque seed-defaults.ts está fora dos arquivos de
  // produção do meu track; ver relatório/ticket. Mantido como it.skip para não
  // esconder a falha nem deixar a suíte vermelha.
  // Corrigido: seed-defaults.ts usa createOrUpdateTenantSettings/AISettings/NotificationPreference.
  it("registro de novo tenant retorna 201", async () => {
    const uniqueEmail = `integration-test-${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Integration Test User",
        email: uniqueEmail,
        password: "TestPassword123!",
        companyName: "Integration Test Company",
        slug: `integ-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(uniqueEmail);
    expect(res.body.tenant).toBeDefined();
  });

  it("acessar rota protegida sem auth (/api/auth/me) retorna 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("registro com email duplicado retorna 409", async () => {
    // A proteção de unicidade de email roda em routes.ts ANTES de setupNewTenant
    // (o seed quebrado). Por isso conseguimos exercitar o 409 real sem esbarrar
    // no bug: semeamos um usuário direto no storage e tentamos registrar com o
    // mesmo email — a rota responde 409 antes de chegar ao seed.
    const email = `duplicate-${Date.now()}@example.com`;
    const tenant = await storage.createTenant({
      name: "Tenant Existente",
      slug: `existente-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      email: "tenant-existente@example.com",
    });
    const hashed = await bcrypt.hash("SenhaForteDeTeste123!", 10);
    await storage.createUser({
      tenantId: tenant.id,
      name: "Usuário Existente",
      email,
      password: hashed,
      role: "admin",
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Tentativa Duplicada",
        email,
        password: "TestPassword123!",
        companyName: "Empresa Duplicada",
        slug: `dup-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("email");
  });
});
