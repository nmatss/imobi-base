-- Leads de-duplication: partial unique indexes on normalized phone / lower(email).
-- Postgres only. Additive and safe to run multiple times.
-- NOTE: will fail to CREATE if existing data violates uniqueness — clean dupes first.

-- Unique by tenant + digits-only phone, ignoring soft-deleted rows.
CREATE UNIQUE INDEX IF NOT EXISTS leads_tenant_phone_uniq
  ON leads(tenant_id, regexp_replace(phone, '\D', '', 'g'))
  WHERE phone IS NOT NULL AND deleted_at IS NULL;

-- Unique by tenant + lower(email), ignoring soft-deleted rows.
CREATE UNIQUE INDEX IF NOT EXISTS leads_tenant_email_uniq
  ON leads(tenant_id, lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;
