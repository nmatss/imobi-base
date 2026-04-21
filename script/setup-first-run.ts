#!/usr/bin/env tsx
/**
 * Setup first-run: empurra schema, popula planos com Stripe Price IDs e
 * cria (ou rotaciona) o super_admin master — tudo em um comando.
 *
 * Pré-requisito: DATABASE_URL válido no env. Para o super_admin exigimos
 * ADMIN_EMAIL e ADMIN_PASSWORD também.
 *
 * Uso:
 *   DATABASE_URL=postgres://... \
 *   ADMIN_EMAIL=admin@imobibase.com.br \
 *   ADMIN_PASSWORD='senha-forte-min-12-chars' \
 *   ADMIN_NAME='Admin' \
 *   npm run setup:first-run
 *
 * Idempotente — pode rodar várias vezes. O db:push usa drizzle-kit e
 * aplica apenas diffs; stripe:seed faz UPDATE por slug; admin:seed cria
 * se não existir, senão rotaciona senha.
 */
import { spawn } from "child_process";

function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      stdio: "inherit",
      env: process.env,
      shell: false,
    });
    proc.on("close", (code) => resolve(code ?? 1));
    proc.on("error", () => resolve(1));
  });
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("ERRO: DATABASE_URL obrigatório.");
    process.exit(1);
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    console.error("ERRO: ADMIN_EMAIL e ADMIN_PASSWORD obrigatórios.");
    process.exit(1);
  }

  console.log("\n[1/3] Aplicando schema (drizzle db:push)...");
  const push = await run("npx", ["drizzle-kit", "push"]);
  if (push !== 0) {
    console.error("FAIL em db:push. Abortando.");
    process.exit(1);
  }

  console.log("\n[2/3] Seedando plans base (plans-config → DB)...");
  // seed.ts cria os planos base (Free/Starter/Pro/Business/Enterprise)
  const seedPlans = await run("npx", ["tsx", "server/seed-plans.ts"]);
  if (seedPlans !== 0) {
    console.warn("Aviso: seed-plans.ts falhou — pulando. Rode manualmente.");
  }

  console.log("\n[2b/3] Populando Stripe price IDs...");
  const seedStripe = await run("npx", ["tsx", "script/seed-stripe-prices.ts"]);
  if (seedStripe !== 0) {
    console.warn(
      "Aviso: seed-stripe-prices falhou. Rode `npm run stripe:seed` manualmente depois.",
    );
  }

  console.log("\n[3/3] Criando super_admin master...");
  const seedAdmin = await run("npx", ["tsx", "script/seed-super-admin.ts"]);
  if (seedAdmin !== 0) {
    console.error("FAIL criando super_admin. Abortando.");
    process.exit(1);
  }

  console.log("\nOK — tudo configurado. Acesse https://imobibase.com.br/login");
}

main().catch((err) => {
  console.error("setup-first-run falhou:", err);
  process.exit(1);
});
