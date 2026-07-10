/**
 * Seed canonical plan definitions into the database.
 * Called on server startup to ensure plans table is always populated.
 * Uses upsert (ON CONFLICT slug DO UPDATE) so it's safe to run repeatedly.
 */

import { db, isSqlite } from "./db";
import { plans } from "../shared/schema";

const PLAN_DEFINITIONS = [
  {
    slug: "free",
    name: "Gratuito",
    price: "0.00",
    yearlyPrice: "0.00",
    maxUsers: 1,
    maxProperties: 15,
    maxLeads: 30,
    maxIntegrations: 0,
    trialDays: 0,
    features: ["basic_site", "basic_crm"],
  },
  {
    slug: "starter",
    name: "Starter",
    price: "89.00",
    yearlyPrice: "69.00",
    maxUsers: 3,
    maxProperties: 100,
    maxLeads: -1,
    maxIntegrations: 2,
    trialDays: 14,
    features: [
      "basic_site",
      "pro_site",
      "whatsapp",
      "basic_reports",
      "basic_crm",
    ],
  },
  {
    slug: "pro",
    name: "Profissional",
    price: "199.00",
    yearlyPrice: "159.00",
    maxUsers: 10,
    maxProperties: 500,
    maxLeads: -1,
    maxIntegrations: 5,
    trialDays: 14,
    features: [
      "basic_site",
      "pro_site",
      "whatsapp",
      "basic_reports",
      "basic_crm",
      "ai_marketing",
      "ai_avm",
      "ai_isa",
      "client_portal",
      "digital_contracts",
      "advanced_reports",
    ],
  },
  {
    slug: "business",
    name: "Business",
    price: "399.00",
    yearlyPrice: "319.00",
    maxUsers: -1,
    maxProperties: -1,
    maxLeads: -1,
    maxIntegrations: -1,
    trialDays: 14,
    features: [
      "basic_site",
      "pro_site",
      "whatsapp",
      "basic_reports",
      "basic_crm",
      "ai_marketing",
      "ai_avm",
      "ai_isa",
      "client_portal",
      "digital_contracts",
      "advanced_reports",
      "multi_branch",
      "api_access",
      "webhooks",
      "digital_inspections",
      "commission_management",
      "custom_reports",
      "whatsapp_support",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "799.00",
    yearlyPrice: "639.00",
    maxUsers: -1,
    maxProperties: -1,
    maxLeads: -1,
    maxIntegrations: -1,
    trialDays: 0,
    features: [
      "basic_site",
      "pro_site",
      "whatsapp",
      "basic_reports",
      "basic_crm",
      "ai_marketing",
      "ai_avm",
      "ai_isa",
      "client_portal",
      "digital_contracts",
      "advanced_reports",
      "multi_branch",
      "api_access",
      "webhooks",
      "digital_inspections",
      "commission_management",
      "custom_reports",
      "whatsapp_support",
      "sla_guarantee",
      "dedicated_manager",
      "custom_integrations",
      "team_training",
      "priority_support",
    ],
  },
];

// Permite rodar diretamente: npx tsx server/seed-plans.ts
// (sem import.meta para o bundle CJS não emitir empty-import-meta)
const isDirectRun = process.argv[1]?.endsWith("seed-plans.ts") ?? false;
if (isDirectRun) {
  seedPlans()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

/**
 * Resolve os Stripe Price IDs de um plano a partir de variaveis de ambiente
 * (ex.: STRIPE_PRICE_STARTER_MONTHLY, STRIPE_PRICE_STARTER_YEARLY). Permite
 * provisionar os IDs por Infra-as-Code (Vercel env) sem edicao manual no banco.
 * Quando ausentes, o valor configurado pelo admin e preservado (ver set abaixo).
 */
function resolveStripePriceIds(slug: string): {
  monthly: string | null;
  yearly: string | null;
} {
  const key = slug.toUpperCase();
  const monthly = process.env[`STRIPE_PRICE_${key}_MONTHLY`]?.trim();
  const yearly = process.env[`STRIPE_PRICE_${key}_YEARLY`]?.trim();
  return { monthly: monthly || null, yearly: yearly || null };
}

export async function seedPlans(): Promise<void> {
  if (isSqlite) {
    console.log("Plans seed skipped: plans table is PostgreSQL-only in SQLite development mode");
    return;
  }

  try {
    for (const plan of PLAN_DEFINITIONS) {
      const stripeIds = resolveStripePriceIds(plan.slug);
      await db
        .insert(plans)
        .values({
          slug: plan.slug,
          name: plan.name,
          price: plan.price,
          yearlyPrice: plan.yearlyPrice,
          maxUsers: plan.maxUsers,
          maxProperties: plan.maxProperties,
          maxLeads: plan.maxLeads,
          maxIntegrations: plan.maxIntegrations,
          trialDays: plan.trialDays,
          features: plan.features,
          isActive: true,
          // So define no insert quando fornecido via env; caso contrario fica
          // null ate ser configurado (env em um proximo boot ou admin UI).
          ...(stripeIds.monthly ? { stripePriceId: stripeIds.monthly } : {}),
          ...(stripeIds.yearly ? { stripeYearlyPriceId: stripeIds.yearly } : {}),
        })
        .onConflictDoUpdate({
          target: plans.slug,
          set: {
            name: plan.name,
            price: plan.price,
            yearlyPrice: plan.yearlyPrice,
            maxUsers: plan.maxUsers,
            maxProperties: plan.maxProperties,
            maxLeads: plan.maxLeads,
            maxIntegrations: plan.maxIntegrations,
            trialDays: plan.trialDays,
            features: plan.features,
            updatedAt: new Date(),
            // IMPORTANTE: so sobrescreve os Stripe Price IDs quando explicitamente
            // fornecidos via env. Se ausentes, preserva o que foi setado pela
            // admin UI — um restart do servidor nunca apaga um ID configurado.
            ...(stripeIds.monthly ? { stripePriceId: stripeIds.monthly } : {}),
            ...(stripeIds.yearly ? { stripeYearlyPriceId: stripeIds.yearly } : {}),
          },
        });
    }
    console.log(`Plans seeded: ${PLAN_DEFINITIONS.length} plans`);
  } catch (error) {
    console.error("Failed to seed plans:", error);
  }
}
