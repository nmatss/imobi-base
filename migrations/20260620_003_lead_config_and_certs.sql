-- Lead scoring weights, lead assignment state, signature certificates.
-- Additive and safe to run multiple times.

CREATE TABLE IF NOT EXISTS lead_score_weights (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  budget_weight INTEGER DEFAULT 25,
  engagement_weight INTEGER DEFAULT 25,
  profile_weight INTEGER DEFAULT 20,
  urgency_weight INTEGER DEFAULT 15,
  behavior_weight INTEGER DEFAULT 15,
  hot_threshold INTEGER DEFAULT 70,
  warm_threshold INTEGER DEFAULT 40,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_score_weights_tenant
  ON lead_score_weights(tenant_id);

CREATE TABLE IF NOT EXISTS lead_assignment_state (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  strategy TEXT DEFAULT 'round_robin',
  last_assigned_user_id VARCHAR REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_assignment_state_tenant
  ON lead_assignment_state(tenant_id);

CREATE TABLE IF NOT EXISTS signature_certificates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  user_id VARCHAR REFERENCES users(id),
  serial_number TEXT,
  subject TEXT,
  issuer TEXT,
  valid_from TIMESTAMP,
  valid_to TIMESTAMP,
  certificate_pem TEXT NOT NULL,
  fingerprint TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signature_certificates_tenant
  ON signature_certificates(tenant_id);
