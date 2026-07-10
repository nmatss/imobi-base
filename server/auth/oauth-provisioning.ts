/**
 * Provisionamento de tenant para cadastro via SSO (Google/Microsoft).
 *
 * Quando um usuário NOVO entra por OAuth e o SaaS é multi-tenant (sem
 * OAUTH_AUTO_PROVISION_TENANT_ID), criamos uma nova imobiliária com a pessoa
 * como admin, marcada com `onboardingCompleted = false`. O fluxo
 * /onboarding/agency depois refina nome/slug. Espelha o provisionamento do
 * cadastro email+senha (setupNewTenant + plano free), porém via `storage`
 * (dialeto-agnóstico).
 */

import { storage } from "../storage";
import { runWithTenantRlsContext } from "../db-rls";

function buildBaseSlug(email: string, name: string): string {
  const source = (email.split("@")[0] || name || "imobiliaria")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const trimmed = source.slice(0, 40);
  return trimmed.length >= 3 ? trimmed : `imob-${trimmed}`.slice(0, 40);
}

export interface ProvisionOAuthInput {
  name: string;
  email: string;
  avatar?: string | null;
  oauthProvider: string;
  oauthId: string;
  /** Já deve vir CRIPTOGRAFADO (encryptSecret) pelo chamador. */
  oauthAccessToken?: string | null;
  /** Já deve vir CRIPTOGRAFADO (encryptSecret) pelo chamador. */
  oauthRefreshToken?: string | null;
  emailVerified?: boolean;
}

/**
 * Cria tenant + usuário admin para um cadastro OAuth novo.
 * Retorna os IDs; o chamador recarrega o registro no seu próprio dialeto.
 */
export async function provisionOAuthTenantAndOwner(
  input: ProvisionOAuthInput,
): Promise<{ tenantId: string; userId: string }> {
  const base = buildBaseSlug(input.email, input.name);

  // Garante unicidade do slug (slug, slug-1, slug-2, ...).
  let slug = base;
  let attempt = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await storage.getTenantBySlug(slug)) {
    slug = `${base}-${attempt++}`;
  }

  const tenant = await storage.createTenant({
    name: input.name ? `Imobiliária ${input.name}` : "Minha Imobiliária",
    slug,
    email: input.email,
    onboardingCompleted: false,
  });

  const user = await runWithTenantRlsContext(tenant.id, async () => {
    const { setupNewTenant } = await import("../seed-defaults");
    await setupNewTenant(storage, tenant);

    try {
      const freePlan = await storage.getPlanBySlug("free");
      if (freePlan) {
        await storage.createTenantSubscription({
          tenantId: tenant.id,
          planId: freePlan.id,
          status: "active",
        });
      }
    } catch (subError) {
      console.error("Failed to create free subscription for OAuth signup:", subError);
    }

    return storage.createUser({
      tenantId: tenant.id,
      name: input.name,
      email: input.email,
      password: "", // sem senha para contas OAuth
      role: "admin",
      avatar: input.avatar ?? null,
      emailVerified: input.emailVerified ?? false,
      oauthProvider: input.oauthProvider,
      oauthId: input.oauthId,
      oauthAccessToken: input.oauthAccessToken ?? null,
      oauthRefreshToken: input.oauthRefreshToken ?? null,
    });
  });

  return { tenantId: tenant.id, userId: user.id };
}
