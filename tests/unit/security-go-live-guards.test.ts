import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("security go-live guards", () => {
  it("keeps TOTP QR generation local and does not leak secrets to a third-party QR API", () => {
    const source = read("server/routes-security.ts");

    expect(source).toContain('import QRCode from "qrcode"');
    expect(source).toContain("QRCode.toDataURL(otpauthUrl");
    expect(source).not.toContain("api.qrserver.com");
  });

  it("scopes inspection foreign keys to the authenticated tenant before creation/reporting", () => {
    const source = read("server/routes-inspections.ts");

    expect(source).toContain("async function getPropertyScopedToTenant");
    expect(source).toContain("async function getRenterScopedToTenant");
    expect(source).toContain("async function getRentalContractScopedToTenant");
    expect(source).toContain("await getPropertyScopedToTenant(propertyId, tenantId)");
    expect(source).toContain("await getRenterScopedToTenant(renterId, tenantId)");
    expect(source).toContain("await getRentalContractScopedToTenant(rentalContractId, tenantId)");
    expect(source).toContain("contract.propertyId !== propertyId");
    expect(source).toContain("contract.renterId !== renterId");
    expect(source).toContain("getPropertyScopedToTenant(inspection.propertyId, tenantId)");
  });
});
