import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Auth RLS contexts", () => {
  it("uses auth email and user id contexts in local auth/session flows", () => {
    const routes = readProjectFile("server/routes.ts");

    expect(routes).toContain("runWithAuthEmailRlsContext(email");
    expect(routes).toContain("runWithUserRlsContext(id");
    expect(routes).toContain("runWithTenantRlsContext(user.tenantId");
    expect(routes).toContain("runWithTenantRlsContext(tenant.id");
  });

  it("uses auth email and tenant contexts in OAuth providers", () => {
    const google = readProjectFile("server/auth/oauth-google.ts");
    const microsoft = readProjectFile("server/auth/oauth-microsoft.ts");
    const provisioning = readProjectFile("server/auth/oauth-provisioning.ts");

    for (const source of [google, microsoft]) {
      expect(source).toContain("runWithAuthEmailRlsContext(");
      expect(source).toContain("runWithTenantRlsContext(user.tenantId");
    }
    // Google: branch white-label cria membro em tenant fixo sob contexto RLS.
    expect(google).toContain("runWithTenantRlsContext(overrideTenantId");
    // Microsoft mantém o provisionamento legado por tenant id.
    expect(microsoft).toContain("runWithTenantRlsContext(tenantId");
    // Novo signup multi-tenant via SSO provisiona sob o contexto RLS do novo tenant.
    expect(provisioning).toContain("runWithTenantRlsContext(tenant.id");
  });

  it("uses token hash contexts for password reset and email verification", () => {
    const passwordReset = readProjectFile("server/auth/password-reset.ts");
    const emailVerification = readProjectFile("server/auth/email-verification.ts");

    expect(passwordReset).toContain("runWithAuthEmailRlsContext(normalizedEmail");
    expect(passwordReset).toContain("runWithPasswordResetTokenRlsContext(hashedToken");
    expect(passwordReset).toContain("runWithTenantRlsContext(user.tenantId");

    expect(emailVerification).toContain("runWithAuthEmailRlsContext(normalizedEmail");
    expect(emailVerification).toContain("runWithEmailVerificationTokenRlsContext(hashedToken");
    expect(emailVerification).toContain("runWithTenantRlsContext(user.tenantId");
  });

  it("uses tenant context in unauthenticated public tenant flows", () => {
    const routes = readProjectFile("server/routes.ts");
    const whatsappRoutes = readProjectFile("server/routes-whatsapp.ts");

    expect(routes).toContain('app.get("/api/properties/public/:tenantId"');
    expect(routes).toContain("runWithTenantRlsContext(tenantId");
    expect(routes).toContain('app.get("/api/properties/public/:tenantId/:propertyId"');
    expect(routes).toContain("storage.getProperty(propertyId)");
    expect(routes).toContain('app.post("/api/leads/public"');
    expect(routes).toContain("runWithTenantRlsContext(data.tenantId");

    expect(whatsappRoutes).toContain('app.post("/api/webhooks/whatsapp"');
    expect(whatsappRoutes).toContain("webhookHandler.resolveTenantId(normalizedPhoneNumberId)");
    expect(whatsappRoutes).toContain("runWithTenantRlsContext(tenantId");
    expect(whatsappRoutes).toContain("webhookHandler.processWebhook(");
  });

  it("uses tenant context in payment webhooks after provider tenant resolution", () => {
    const stripeWebhook = readProjectFile("server/payments/stripe/stripe-webhooks.ts");
    const mercadoPagoWebhook = readProjectFile(
      "server/payments/mercadopago/mercadopago-webhooks.ts",
    );

    expect(stripeWebhook).toContain("customer.metadata?.tenantId");
    expect(stripeWebhook).toContain("runWithTenantRlsContext(tenantId");
    expect(stripeWebhook).toContain("storage.updateTenantSubscription(tenantId");
    expect(stripeWebhook).toContain("storage.getTenant(tenantId)");

    expect(mercadoPagoWebhook).toContain("getTenantIdFromMetadata(paymentStatus.metadata)");
    expect(mercadoPagoWebhook).toContain("runWithTenantRlsContext(tenantId");
    expect(mercadoPagoWebhook).toContain("storage.updateTenantSubscription(tenantId");
  });

  it("uses narrow public contexts for ClickSign webhooks and signature-token contract access", () => {
    const clicksignWebhook = readProjectFile("server/integrations/clicksign/webhook-handler.ts");
    const featureRoutes = readProjectFile("server/routes-features.ts");

    expect(clicksignWebhook).toContain("runWithClickSignDocumentRlsContext(documentKey");
    expect(clicksignWebhook).toContain("runWithTenantRlsContext(contract.tenantId");
    expect(clicksignWebhook).toContain("runWithTenantRlsContext(tenantId");

    expect(featureRoutes).toContain("runWithDigitalSignatureTokenRlsContext(token");
    expect(featureRoutes).toContain("db.select().from(contracts)");
    expect(featureRoutes).toContain("db.update(contracts)");
  });

  it("uses narrow public contexts for anonymous property comparison flows", () => {
    const featureRoutes = readProjectFile("server/routes-features.ts");

    expect(featureRoutes).toContain("runWithPublicPropertyIdsRlsContext(propertyIds");
    expect(featureRoutes).toContain("runWithPropertyComparisonRlsContext(comparisonId");
    expect(featureRoutes).toContain("runWithTenantRlsContext(tenantId");
    expect(featureRoutes).toContain("Lead inválido para esta imobiliária");
  });

  it("sets tenant context in local authenticated middleware definitions", () => {
    const files = [
      "server/routes-features.ts",
      "server/routes-files.ts",
      "server/routes-isa.ts",
      "server/routes-security.ts",
      "server/auth/session-manager.ts",
    ];

    for (const file of files) {
      const source = readProjectFile(file);
      expect(source).toContain("runWithTenantRlsContext(req.user.tenantId");
      expect(source).toContain("Sessão inválida");
    }

    const whatsappRoutes = readProjectFile("server/routes-whatsapp.ts");
    expect(whatsappRoutes).toContain('app.use("/api/whatsapp", requireAuth');
  });
});
