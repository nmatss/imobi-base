import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("immutable payload sanitization source guards", () => {
  it("keeps WhatsApp routes from accepting tenant or key fields from request bodies", () => {
    const source = readSource("server/routes-whatsapp.ts");

    expect(source).toContain("function stripImmutablePayloadFields");
    expect(source).toContain('"tenantId"');
    expect(source).toContain('"tenant_id"');
    expect(source).toContain("const safeTemplatePayload = stripImmutablePayloadFields(req.body);");
    expect(source).toContain("const safeAutoResponsePayload = stripImmutablePayloadFields(req.body);");
    expect(source).toContain("stripImmutablePayloadFields(req.body)");
    expect(source).not.toContain("tenantId: req.user.tenantId,\n        ...req.body");
  });

  it("defensively strips immutable WhatsApp fields in template and auto-response services", () => {
    const templateManager = readSource("server/integrations/whatsapp/template-manager.ts");
    const autoResponder = readSource("server/integrations/whatsapp/auto-responder.ts");

    expect(templateManager).toContain("function stripWhatsappImmutableFields");
    expect(templateManager).toContain(
      ".set({ ...stripWhatsappImmutableFields(updates), updatedAt: new Date() })",
    );
    expect(autoResponder).toContain("function stripWhatsappImmutableFields");
    expect(autoResponder).toContain("const safeData = stripWhatsappImmutableFields(data);");
    expect(autoResponder).toContain(".values({ ...safeData, tenantId: data.tenantId })");
    expect(autoResponder).toContain(
      ".set({ ...stripWhatsappImmutableFields(updates), updatedAt: new Date() })",
    );
  });

  it("strips immutable integration fields before storage writes", () => {
    const source = readSource("server/storage.ts");

    expect(source).toContain("function stripImmutablePersistenceFields");
    expect(source).toContain("function sanitizeIntegrationPersistenceData");
    expect(source).toContain('"integrationName"');
    expect(source).toContain('"integration_name"');
    expect(source).toContain("const safeData = stripImmutablePersistenceFields(data) as Record<string, unknown>;");
    expect(source).toContain("const safeData = sanitizeIntegrationPersistenceData(data, integrationType);");
    expect(source).toContain("const safeData = sanitizeIntegrationPersistenceData(data, name);");
    expect(source).toContain(".set({ ...safeData, updatedAt: now() })");
    expect(source).toContain(
      ".values({ ...safeData, id, tenantId, integrationName: integrationType, updatedAt: now() } as any)",
    );
    expect(source).toContain(
      ".values({ ...safeData, id, tenantId, integrationName: name, updatedAt: now() } as any)",
    );
  });
});
