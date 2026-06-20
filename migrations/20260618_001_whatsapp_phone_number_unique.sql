-- Prevent ambiguous WhatsApp webhook routing.
--
-- The official Meta webhook only provides value.metadata.phone_number_id for
-- tenant resolution. If two tenants share the same configured phoneNumberId,
-- webhook delivery cannot be routed safely. This partial unique index allows
-- disconnected/unconfigured tenants while enforcing uniqueness for configured
-- WhatsApp integrations.

CREATE UNIQUE INDEX IF NOT EXISTS uq_integration_configs_whatsapp_phone_number_id
  ON integration_configs ((NULLIF(BTRIM(config->>'phoneNumberId'), '')))
  WHERE integration_name = 'whatsapp'
    AND NULLIF(BTRIM(config->>'phoneNumberId'), '') IS NOT NULL;
