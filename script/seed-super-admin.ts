#!/usr/bin/env tsx
/**
 * Cria (ou atualiza) o usuário super_admin master do ImobiBase.
 *
 * Uso:
 *   DATABASE_URL=postgres://... \
 *   ADMIN_EMAIL=admin@imobibase.com.br \
 *   ADMIN_PASSWORD='senha-forte-aqui' \
 *   ADMIN_NAME='Admin ImobiBase' \
 *   npm run admin:seed
 *
 * Comportamento:
 * - Cria (ou reutiliza) um tenant com slug "imobibase-ops" dedicado à
 *   operação interna (não exposto como imobiliária pública).
 * - Cria o usuário com role="super_admin" e senha hashada com bcrypt (12 rounds).
 * - Idempotente: se o email já existe, atualiza a senha e promove para
 *   super_admin — útil para rotacionar a senha mestre.
 *
 * NUNCA commite ADMIN_PASSWORD no repo. Use Vercel env vars ou passe
 * apenas na execução manual.
 */
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "../server/db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin ImobiBase";
const ADMIN_TENANT_SLUG = process.env.ADMIN_TENANT_SLUG || "imobibase-ops";

function requireEnv(name: string, value: string): void {
  if (!value) {
    console.error(`ERRO: ${name} obrigatoria. Exemplo:`);
    console.error(
      `  DATABASE_URL=postgres://... ADMIN_EMAIL=a@b.com ADMIN_PASSWORD=... npm run admin:seed`,
    );
    process.exit(1);
  }
}

async function main(): Promise<void> {
  requireEnv("ADMIN_EMAIL", ADMIN_EMAIL);
  requireEnv("ADMIN_PASSWORD", ADMIN_PASSWORD);
  if (ADMIN_PASSWORD.length < 12) {
    console.warn(
      "AVISO: senha tem menos de 12 caracteres. Recomendo >= 16 para conta master.",
    );
  }

  const tenantsTable = (schema as any).tenants;
  const usersTable = (schema as any).users;

  // 1. Tenant de operação
  let [tenant] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, ADMIN_TENANT_SLUG))
    .limit(1);

  if (!tenant) {
    [tenant] = await db
      .insert(tenantsTable)
      .values({
        name: "ImobiBase Ops",
        slug: ADMIN_TENANT_SLUG,
        email: ADMIN_EMAIL,
        primaryColor: "#0066cc",
        secondaryColor: "#333333",
      })
      .returning();
    console.log(`  tenant criado: ${tenant.id} (slug=${ADMIN_TENANT_SLUG})`);
  } else {
    console.log(`  tenant existente: ${tenant.id} (slug=${ADMIN_TENANT_SLUG})`);
  }

  // 2. Usuário super_admin
  const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, ADMIN_EMAIL))
    .limit(1);

  if (existing) {
    await db
      .update(usersTable)
      .set({
        password: hashed,
        role: "super_admin",
        name: ADMIN_NAME,
        tenantId: tenant.id,
      })
      .where(eq(usersTable.id, existing.id));
    console.log(
      `  usuário atualizado: ${existing.id} (email=${ADMIN_EMAIL}, role=super_admin, senha rotacionada)`,
    );
  } else {
    const [created] = await db
      .insert(usersTable)
      .values({
        tenantId: tenant.id,
        email: ADMIN_EMAIL,
        password: hashed,
        role: "super_admin",
        name: ADMIN_NAME,
      })
      .returning();
    console.log(
      `  usuário criado: ${created.id} (email=${ADMIN_EMAIL}, role=super_admin)`,
    );
  }

  console.log("\nOK — acesse /login com o email e senha acima e depois /admin.");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed-super-admin falhou:", err);
  process.exit(1);
});
