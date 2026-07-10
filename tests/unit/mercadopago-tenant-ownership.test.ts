import { describe, expect, it } from "vitest";
import {
  getMercadoPagoPaymentTenantId,
  isMercadoPagoPaymentOwnedByTenant,
} from "../../server/payments/mercadopago/tenant-ownership";

describe("Mercado Pago payment tenant ownership", () => {
  it("reads canonical tenant_id metadata", () => {
    expect(
      getMercadoPagoPaymentTenantId({
        metadata: { tenant_id: "tenant-1" },
      }),
    ).toBe("tenant-1");
  });

  it("accepts legacy tenantId metadata", () => {
    expect(
      getMercadoPagoPaymentTenantId({
        metadata: { tenantId: "tenant-1" },
      }),
    ).toBe("tenant-1");
  });

  it("rejects missing or malformed tenant metadata", () => {
    expect(getMercadoPagoPaymentTenantId({ metadata: undefined })).toBeNull();
    expect(getMercadoPagoPaymentTenantId({ metadata: { tenant_id: 123 } })).toBeNull();
    expect(getMercadoPagoPaymentTenantId({ metadata: { tenant_id: "" } })).toBeNull();
  });

  it("matches payment status to the authenticated tenant only", () => {
    const status = { metadata: { tenant_id: "tenant-1" } };

    expect(isMercadoPagoPaymentOwnedByTenant(status, "tenant-1")).toBe(true);
    expect(isMercadoPagoPaymentOwnedByTenant(status, "tenant-2")).toBe(false);
  });
});
