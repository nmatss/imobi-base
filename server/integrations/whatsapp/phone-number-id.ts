export function normalizeWhatsAppPhoneNumberId(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeWhatsAppIntegrationConfig(config: unknown): unknown {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return config;
  }

  const normalizedConfig = { ...(config as Record<string, unknown>) };
  if ("phoneNumberId" in normalizedConfig) {
    normalizedConfig.phoneNumberId =
      normalizeWhatsAppPhoneNumberId(normalizedConfig.phoneNumberId) ?? "";
  }

  return normalizedConfig;
}
