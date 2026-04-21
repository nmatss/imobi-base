#!/usr/bin/env tsx
/**
 * Populariza a tabela `plans` com os Stripe Price IDs corretos.
 *
 * Requer DATABASE_URL configurada. Lê o catálogo de
 * `script/stripe-catalog.json` (gerado manualmente a partir do output da
 * Stripe API, ou do arquivo `/tmp/stripe-catalog.json` produzido durante
 * a configuração inicial via curl).
 *
 * Uso:
 *   DATABASE_URL=postgres://... npx tsx script/seed-stripe-prices.ts
 *
 * Seguro para rodar várias vezes — faz UPDATE por slug, não INSERT.
 */
import { readFile } from "fs/promises";
import { resolve } from "path";
import { eq } from "drizzle-orm";
import { db, schema, isSqlite } from "../server/db";

interface StripePlanEntry {
  slug: string;
  productId: string;
  stripePriceId: string;
  stripeYearlyPriceId: string;
}

async function loadCatalog(): Promise<StripePlanEntry[]> {
  const candidates = [
    resolve(process.cwd(), "script/stripe-catalog.json"),
    "/tmp/stripe-catalog.json",
  ];
  for (const p of candidates) {
    try {
      const raw = await readFile(p, "utf-8");
      return JSON.parse(raw) as StripePlanEntry[];
    } catch {
      // try next
    }
  }
  throw new Error(
    "Catalog not found. Expected script/stripe-catalog.json or /tmp/stripe-catalog.json",
  );
}

async function main(): Promise<void> {
  const catalog = await loadCatalog();
  console.log(`Loaded ${catalog.length} plan entries from catalog`);

  const plansTable = (schema as any).plans;
  if (!plansTable) {
    throw new Error("schema.plans not found — checked schema name");
  }

  for (const entry of catalog) {
    const updated = await db
      .update(plansTable)
      .set({
        stripePriceId: entry.stripePriceId,
        stripeYearlyPriceId: entry.stripeYearlyPriceId,
        ...(isSqlite ? {} : { updatedAt: new Date() }),
      })
      .where(eq(plansTable.slug, entry.slug))
      .returning();

    if (updated.length === 0) {
      console.warn(
        `  skip  slug="${entry.slug}" — plan not found in DB. Run seed-plans.ts first.`,
      );
    } else {
      console.log(
        `  ok    slug="${entry.slug}" month=${entry.stripePriceId} year=${entry.stripeYearlyPriceId}`,
      );
    }
  }

  console.log("\nDone.");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed-stripe-prices failed:", err);
  process.exit(1);
});
