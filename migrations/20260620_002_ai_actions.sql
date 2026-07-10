-- AI actions: human-in-the-loop ledger + append-only audit trail.
-- Additive and safe to run multiple times.

CREATE TABLE IF NOT EXISTS ai_actions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  target_type TEXT NOT NULL,
  target_id VARCHAR,
  payload JSON NOT NULL,
  rationale TEXT,
  confidence REAL,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  risk_level TEXT DEFAULT 'low',
  proposed_by TEXT NOT NULL DEFAULT 'ai',
  ai_model TEXT,
  conversation_id VARCHAR,
  approved_by VARCHAR REFERENCES users(id),
  approved_at TIMESTAMP,
  executed_at TIMESTAMP,
  result JSON,
  error TEXT,
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_actions_tenant_status
  ON ai_actions(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_ai_actions_tenant_target
  ON ai_actions(tenant_id, target_type, target_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_actions_status_check'
  ) THEN
    ALTER TABLE ai_actions
      ADD CONSTRAINT ai_actions_status_check
      CHECK (status IN ('proposed', 'approved', 'rejected', 'executed', 'failed', 'expired'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ai_action_audit (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  action_id VARCHAR NOT NULL REFERENCES ai_actions(id),
  event TEXT NOT NULL,
  actor_id VARCHAR REFERENCES users(id),
  actor_type TEXT NOT NULL,
  before_state JSON,
  after_state JSON,
  details JSON,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_audit_tenant_action_created
  ON ai_action_audit(tenant_id, action_id, created_at);
