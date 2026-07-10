-- ================================================================
-- MIGRATION: Runtime status constraint parity
-- Created: 2026-06-15
-- Purpose:
--   Keep database status checks compatible with the statuses used by the
--   application runtime, tests, Stripe webhooks and CRM kanban.
--
-- Rollback:
--   Drop the constraints below and recreate the previous constraints from
--   migrations/20241225_001_add_check_constraints.sql if the previous app
--   version is redeployed.
-- ================================================================

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS chk_leads_status,
  DROP CONSTRAINT IF EXISTS check_status_valid;

ALTER TABLE tenant_subscriptions
  DROP CONSTRAINT IF EXISTS chk_tenant_subscriptions_status,
  DROP CONSTRAINT IF EXISTS check_status_valid;

ALTER TABLE leads
  ADD CONSTRAINT chk_leads_status
  CHECK (status IN (
    'new',
    'qualification',
    'visit',
    'proposal',
    'contract',
    'contacted',
    'qualified',
    'negotiation',
    'won',
    'lost',
    'archived',
    'converted'
  ));

ALTER TABLE tenant_subscriptions
  ADD CONSTRAINT chk_tenant_subscriptions_status
  CHECK (status IN (
    'trial',
    'active',
    'past_due',
    'suspended',
    'cancelled',
    'canceled',
    'expired',
    'unpaid'
  ));
