import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("tenant FK ownership guards", () => {
  it("validates cross-tenant references before creating or updating core business records", () => {
    const source = read("server/routes.ts");
    // arch-1: as definicoes dos guards foram extraidas para routes/_shared.ts;
    // os call-sites permanecem em routes.ts (verificados abaixo).
    const shared = read("server/routes/_shared.ts");

    expect(shared).toContain("async function validatePropertyReference");
    expect(shared).toContain("async function validateOwnerReference");
    expect(shared).toContain("async function validateRenterReference");
    expect(shared).toContain("async function validateRentalContractReference");
    expect(shared).toContain("async function validateFinanceCategoryReference");
    expect(shared).toContain("async function validateContractReferences");
    expect(shared).toContain("async function validateRentalContractReferences");
    expect(shared).toContain("async function validatePropertySaleReferences");

    expect(source).toContain("await validateContractReferences(req.user!.tenantId, data)");
    expect(source).toContain("await validateContractReferences(req.user!.tenantId, safe)");
    expect(source).toContain("await validateRentalContractReferences(req.user!.tenantId, data)");
    expect(source).toContain("await validateRentalContractReferences(req.user!.tenantId, allowedFields)");
    expect(source).toContain("await validateRentalContractReference(req.user!.tenantId, data.rentalContractId)");
    expect(source).toContain("await validateRentalContractReference(req.user!.tenantId, allowedFields.rentalContractId)");
    expect(source).toContain("await validateOwnerReference(req.user!.tenantId, data.ownerId)");
    expect(source).toContain("await validateOwnerReference(req.user!.tenantId, allowedFields.ownerId)");
    expect(source).toContain("await validatePropertySaleReferences(req.user!.tenantId, data)");
    expect(source).toContain("await validatePropertySaleReferences(req.user!.tenantId, allowedFields)");
    expect(source).toContain("await validateFinanceCategoryReference(req.user!.tenantId, data.categoryId)");
    expect(source).toContain("await validateFinanceCategoryReference(req.user!.tenantId, allowedFields.categoryId)");
  });

  it("validates optional AVM propertyId ownership before persisting a valuation", () => {
    const source = read("server/routes-avm.ts");

    expect(source).toContain("if (body.propertyId)");
    expect(source).toContain("const property = await storage.getProperty(body.propertyId)");
    expect(source).toContain("!property || property.tenantId !== tenantId");
    expect(source).toContain("propertyId: body.propertyId || null");
  });
});
