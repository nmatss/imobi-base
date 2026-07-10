-- Buyer selections: curated property lists shared publicly with a buyer.
-- Additive and safe to run multiple times.

CREATE TABLE IF NOT EXISTS buyer_selections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  lead_id VARCHAR REFERENCES leads(id),
  created_by VARCHAR NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  public_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  message TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_buyer_selections_public_token
  ON buyer_selections(public_token);

CREATE INDEX IF NOT EXISTS idx_buyer_selections_tenant
  ON buyer_selections(tenant_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'buyer_selections_status_check'
  ) THEN
    ALTER TABLE buyer_selections
      ADD CONSTRAINT buyer_selections_status_check
      CHECK (status IN ('active', 'closed', 'expired'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS buyer_selection_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  selection_id VARCHAR NOT NULL REFERENCES buyer_selections(id) ON DELETE CASCADE,
  property_id VARCHAR NOT NULL REFERENCES properties(id),
  sort_order INTEGER DEFAULT 0,
  response TEXT,
  comment TEXT,
  responded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_selection_items_selection
  ON buyer_selection_items(selection_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'buyer_selection_items_response_check'
  ) THEN
    ALTER TABLE buyer_selection_items
      ADD CONSTRAINT buyer_selection_items_response_check
      CHECK (response IS NULL OR response IN ('accepted', 'rejected', 'maybe'));
  END IF;
END $$;
