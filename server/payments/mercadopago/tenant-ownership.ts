import type { MercadoPagoPaymentStatus } from "./mercadopago-service";

export function getMercadoPagoPaymentTenantId(
  status: Pick<MercadoPagoPaymentStatus, "metadata">,
): string | null {
  const metadata = status.metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const tenantId = metadata.tenant_id ?? metadata.tenantId;
  return typeof tenantId === "string" && tenantId.length > 0 ? tenantId : null;
}

export function isMercadoPagoPaymentOwnedByTenant(
  status: Pick<MercadoPagoPaymentStatus, "metadata">,
  tenantId: string,
): boolean {
  return getMercadoPagoPaymentTenantId(status) === tenantId;
}
