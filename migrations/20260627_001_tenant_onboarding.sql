-- Onboarding flag para tenants criados via SSO (Google/Microsoft).
-- Tenants existentes e os criados pelo cadastro email+senha já estão completos
-- (DEFAULT true). Apenas tenants auto-provisionados por OAuth nascem com
-- onboarding_completed = false e são levados ao fluxo /onboarding/agency.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT true;
