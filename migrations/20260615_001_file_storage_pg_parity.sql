-- ================================================================
-- MIGRATION: File storage metadata parity for PostgreSQL
-- Created: 2026-06-15
-- Purpose:
--   Align the production PostgreSQL `files` table with the runtime upload
--   code and the SQLite development schema.
--
-- Rollback:
--   This migration is additive and keeps legacy columns in place. To roll
--   back the application, deploy the previous code; legacy columns are not
--   dropped here.
-- ================================================================

ALTER TABLE files
  ADD COLUMN IF NOT EXISTS bucket text,
  ADD COLUMN IF NOT EXISTS file_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size integer,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id varchar,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

UPDATE files
SET
  bucket = COALESCE(bucket, 'documents'),
  file_path = COALESCE(file_path, path, filename),
  file_name = COALESCE(file_name, original_name, filename),
  file_size = COALESCE(file_size, size, 0),
  entity_type = COALESCE(entity_type, related_to),
  entity_id = COALESCE(entity_id, related_id),
  is_public = COALESCE(is_public, false),
  category = COALESCE(category, 'general')
WHERE
  bucket IS NULL
  OR file_path IS NULL
  OR file_name IS NULL
  OR file_size IS NULL
  OR is_public IS NULL
  OR category IS NULL;

ALTER TABLE files
  ALTER COLUMN bucket SET NOT NULL,
  ALTER COLUMN file_path SET NOT NULL,
  ALTER COLUMN file_name SET NOT NULL,
  ALTER COLUMN file_size SET NOT NULL,
  ALTER COLUMN category SET NOT NULL,
  ALTER COLUMN is_public SET DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_files_tenant_bucket ON files(tenant_id, bucket);
CREATE INDEX IF NOT EXISTS idx_files_tenant_category ON files(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_files_tenant_entity ON files(tenant_id, entity_type, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_bucket_path_unique ON files(bucket, file_path);
