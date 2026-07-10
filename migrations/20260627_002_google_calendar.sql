-- Onda 2: Google Calendar + Meet por corretor.

-- 1) Campos de sync nas visitas (nullable; visitas antigas ficam sem sync).
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "google_calendar_event_id" text;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "google_meet_url" text;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "google_sync_state" text;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "google_sync_error" text;
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp;

-- 2) Conexão Google Calendar por usuário/corretor (tokens criptografados).
CREATE TABLE IF NOT EXISTS "user_calendar_connections" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" varchar NOT NULL REFERENCES "tenants"("id"),
  "user_id" varchar NOT NULL REFERENCES "users"("id"),
  "provider" text NOT NULL DEFAULT 'google',
  "google_email" text,
  "access_token" text,
  "refresh_token" text,
  "token_expires_at" timestamp,
  "scope" text,
  "calendar_id" text NOT NULL DEFAULT 'primary',
  "sync_enabled" boolean NOT NULL DEFAULT true,
  "last_error" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Uma conexão por (usuário, provider).
CREATE UNIQUE INDEX IF NOT EXISTS "user_calendar_connections_user_provider_uq"
  ON "user_calendar_connections" ("user_id", "provider");
CREATE INDEX IF NOT EXISTS "user_calendar_connections_tenant_idx"
  ON "user_calendar_connections" ("tenant_id");

-- 3) RLS multi-tenant (mesmo padrão tenant_isolation + FORCE das demais tabelas).
ALTER TABLE "user_calendar_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_calendar_connections" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "user_calendar_connections";
CREATE POLICY tenant_isolation ON "user_calendar_connections"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );
