-- Persistent webhook idempotency ledger.
-- Additive and safe to run multiple times.

CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR REFERENCES tenants(id),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT,
  status TEXT NOT NULL DEFAULT 'processing',
  attempts INTEGER NOT NULL DEFAULT 1,
  payload_digest TEXT,
  signature_digest TEXT,
  last_error TEXT,
  received_at TIMESTAMP NOT NULL DEFAULT now(),
  processed_at TIMESTAMP,
  failed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_webhook_events_provider_event
  ON webhook_events(provider, event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_provider
  ON webhook_events(tenant_id, provider);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status_updated
  ON webhook_events(status, updated_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'webhook_events_status_check'
  ) THEN
    ALTER TABLE webhook_events
      ADD CONSTRAINT webhook_events_status_check
      CHECK (status IN ('processing', 'processed', 'failed'));
  END IF;
END $$;
