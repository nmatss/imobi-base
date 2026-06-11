/**
 * Compliance Flow — Integração REAL (LGPD)
 *
 * Exercita o código REAL de compliance (server/compliance/*) contra um banco
 * SQLite de TESTE isolado, no mesmo padrão de tests/integration/tenant-isolation.test.ts
 * (usa os helpers de tenant-isolation-app para forçar SQLite + recriar/limpar o
 * banco). Importações de server/* são DINÂMICAS, feitas só após recriar o banco,
 * porque server/db.ts abre o arquivo SQLite fixo no momento do import.
 *
 * Cobre:
 *  1. Consentimento: gravar (giveConsent) e retirar (withdrawConsent).
 *  2. Exclusão: solicitação (requestAccountDeletion gera token) + confirmação
 *     (confirmAccountDeletion consome o token e dispara anonimização).
 *  3. Anonimização respeita tenantId: titular com MESMO e-mail em dois tenants;
 *     apenas o lead do tenant do titular é anonimizado (correção do bug de
 *     anonimização cruzada).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";
import {
  prepareTestEnv,
  setupFreshDatabase,
  restoreDatabase,
} from "../helpers/tenant-isolation-app";

// Precisa rodar ANTES de qualquer import de server/* (feito dinamicamente abaixo).
prepareTestEnv();

// Tipagem frouxa proposital: módulos importados dinamicamente.
/* eslint-disable @typescript-eslint/no-explicit-any */
let db: any;
let schema: any;
let closeDb: () => Promise<void>;
let consentManager: any;
let dataDeletion: any;
let anonymizer: any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const SHARED_EMAIL = "homonimo@example.com";

async function seedTenant(
  label: string,
  options: { userEmail: string },
): Promise<{ tenantId: string; userId: string; leadId: string }> {
  const rand = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const tenantId = `tenant-${label}-${rand()}`;
  await db.insert(schema.tenants).values({
    id: tenantId,
    name: `Imobiliária ${label}`,
    slug: `imob-${label.toLowerCase()}-${rand()}`,
    primaryColor: "#0066cc",
    secondaryColor: "#333333",
    email: `contato-${label.toLowerCase()}@example.com`,
  });

  // O e-mail de USER é UNIQUE no schema. O titular do tenant A usa SHARED_EMAIL
  // (para casar com os leads na anonimização por e-mail); o do tenant B usa um
  // e-mail distinto. O ponto do teste é o LEAD homônimo (SHARED_EMAIL) em AMBOS.
  const userId = `user-${label}-${rand()}`;
  await db.insert(schema.users).values({
    id: userId,
    tenantId,
    name: `Titular ${label}`,
    email: options.userEmail,
    password: "hashed-placeholder",
    role: "agent",
  });

  // Lead com o MESMO e-mail COMPARTILHADO (homônimo entre tenants), no tenant.
  const leadId = `lead-${label}-${rand()}`;
  await db.insert(schema.leads).values({
    id: leadId,
    tenantId,
    name: `Lead ${label}`,
    email: SHARED_EMAIL,
    phone: "+55 11 99999-0000",
    source: "site",
  });

  return { tenantId, userId, leadId };
}

async function waitFor(
  predicate: () => Promise<boolean>,
  { timeoutMs = 5000, intervalMs = 50 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const start = Date.now();
  for (;;) {
    if (await predicate()) return;
    if (Date.now() - start > timeoutMs) {
      throw new Error("waitFor: condição não satisfeita dentro do timeout");
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

describe("Compliance Flow — REAL compliance code + REAL db (SQLite)", () => {
  let tenantA: { tenantId: string; userId: string; leadId: string };
  let tenantB: { tenantId: string; userId: string; leadId: string };

  beforeAll(async () => {
    setupFreshDatabase();

    const dbModule = await import("../../server/db");
    db = dbModule.db;
    schema = dbModule.schema;
    closeDb = dbModule.closeDb;

    consentManager = await import("../../server/compliance/consent-manager");
    dataDeletion = await import("../../server/compliance/data-deletion");
    anonymizer = await import("../../server/compliance/anonymizer");

    // Titular A usa o SHARED_EMAIL (casa com os leads na anonimização por e-mail);
    // titular B usa e-mail distinto. Ambos os leads usam SHARED_EMAIL.
    tenantA = await seedTenant("A", { userEmail: SHARED_EMAIL });
    tenantB = await seedTenant("B", { userEmail: "titular-b@example.com" });
  });

  afterAll(async () => {
    if (closeDb) await closeDb();
    restoreDatabase();
  });

  it("grava e retira consentimento (consent-manager)", async () => {
    const give = await consentManager.giveConsent({
      userId: tenantA.userId,
      tenantId: tenantA.tenantId,
      consentType: "marketing",
      consentVersion: "1.0.0",
      purpose: "Envio de novidades",
    });
    expect(give.consentId).toBeTruthy();

    expect(await consentManager.hasActiveConsent(tenantA.userId, "marketing")).toBe(true);

    const withdraw = await consentManager.withdrawConsent(
      tenantA.userId,
      tenantA.tenantId,
      "marketing",
    );
    expect(withdraw.message).toMatch(/retirad/i);

    expect(await consentManager.hasActiveConsent(tenantA.userId, "marketing")).toBe(false);
  });

  it("solicita e confirma exclusão via token, anonimizando o titular", async () => {
    const request = await dataDeletion.requestAccountDeletion({
      userId: tenantA.userId,
      tenantId: tenantA.tenantId,
      reason: "Não quero mais a conta",
      deletionType: "anonymize",
    });
    expect(request.status).toBe("pending");
    expect(request.confirmationUrl).toContain("/api/compliance/confirm-deletion/");

    // O endpoint público consome o token gravado: recuperamos para confirmar.
    const [pending] = await db
      .select()
      .from(schema.accountDeletionRequests)
      .where(
        and(
          eq(schema.accountDeletionRequests.userId, tenantA.userId),
          eq(schema.accountDeletionRequests.status, "pending"),
        ),
      );
    expect(pending).toBeTruthy();
    expect(pending.confirmationToken).toBeTruthy();

    const confirm = await dataDeletion.confirmAccountDeletion(pending.confirmationToken);
    expect(confirm.requestId).toBeTruthy();

    // A confirmação dispara processAccountDeletion de forma assíncrona; aguardamos
    // a anonimização do usuário concluir.
    await waitFor(async () => {
      const [u] = await db.select().from(schema.users).where(eq(schema.users.id, tenantA.userId));
      return anonymizer.isAnonymized(u.email);
    });

    const [userA] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, tenantA.userId));
    expect(anonymizer.isAnonymized(userA.email)).toBe(true);
    expect(userA.email).not.toBe(SHARED_EMAIL);

    // O fluxo deve persistir trilha de auditoria (LGPD). Comprova que o insert do
    // audit-logger funciona em SQLite (id explícito) e não é silenciosamente descartado.
    const auditRows = await db
      .select()
      .from(schema.complianceAuditLog)
      .where(eq(schema.complianceAuditLog.userId, tenantA.userId));
    const actions = auditRows.map((r: { action: string }) => r.action);
    expect(actions).toContain("account_deletion_requested");
    expect(actions).toContain("account_deletion_confirmed");
  });

  it("anonimização respeita tenantId (não anonimiza homônimo de outro tenant)", async () => {
    // Após a exclusão do titular do tenant A, o lead do tenant A (mesmo e-mail)
    // deve estar anonimizado, mas o lead do tenant B (homônimo) deve permanecer
    // INTACTO — esta é a verificação da correção do bug de anonimização cruzada.
    await waitFor(async () => {
      const [leadA] = await db.select().from(schema.leads).where(eq(schema.leads.id, tenantA.leadId));
      return anonymizer.isAnonymized(leadA.email);
    });

    const [leadA] = await db.select().from(schema.leads).where(eq(schema.leads.id, tenantA.leadId));
    const [leadB] = await db.select().from(schema.leads).where(eq(schema.leads.id, tenantB.leadId));

    expect(anonymizer.isAnonymized(leadA.email)).toBe(true);

    expect(leadB.email).toBe(SHARED_EMAIL);
    expect(anonymizer.isAnonymized(leadB.email)).toBe(false);
  });
});
