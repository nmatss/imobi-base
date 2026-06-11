-- ================================================================
-- MIGRATION: Auth/Audit/Session Parity (schema-sqlite -> schema.ts/PG)
-- Created: 2026-06-10
-- Purpose: Fechar paridade das colunas/tabelas críticas de auth e
--          auditoria que faltam no Postgres de produção e fazem os
--          fluxos 500arem (password reset, OAuth, lockout, 2FA,
--          login history, trilha de auditoria, sessões).
-- Impact: Zero downtime, aditivo e idempotente (IF NOT EXISTS em tudo).
-- Priority: 🔴 P0
-- ================================================================

-- ============== USERS: COLUNAS DE AUTH/SEGURANÇA ==============
-- Consumidores: server/auth/password-reset.ts, oauth-google.ts,
-- oauth-microsoft.ts, email-verification.ts, security.ts

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_history TEXT;

-- ============== AUDIT_LOGS: COLUNAS DA TRILHA COMPLETA ==============
-- Consumidor: createAuditLog em server/routes-security.ts (inseria
-- user_id/old_values/new_values/user_agent e o erro era engolido pelo
-- catch -> trilha de auditoria vazia em produção).

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ============== USER_SESSIONS: METADADOS DE DISPOSITIVO ==============
-- Consumidor: server/auth/session-manager.ts

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP NOT NULL DEFAULT now();

-- session-manager.ts cria sessões sem tenant_id; NOT NULL quebrava o
-- insert em produção. DROP NOT NULL é idempotente por natureza.
ALTER TABLE user_sessions ALTER COLUMN tenant_id DROP NOT NULL;

-- ============== INTEGRATION_CONFIGS: PARIDADE COM SQLITE ==============

ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS integration_type TEXT;
ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP;
ALTER TABLE integration_configs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();

-- ============== TWO_FACTOR_AUTH (tabela nova no PG) ==============
-- Consumidor: server/routes-security.ts (rotas 2FA registradas em prod)

CREATE TABLE IF NOT EXISTS two_factor_auth (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id),
  secret TEXT NOT NULL,
  backup_codes TEXT,
  is_enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ============== LOGIN_HISTORY (tabela nova no PG) ==============
-- Consumidores: oauth-google.ts, oauth-microsoft.ts, password-reset.ts

CREATE TABLE IF NOT EXISTS login_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR REFERENCES users(id),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  location TEXT,
  suspicious BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ============== VERIFICATION (rodar manualmente após aplicar) ==============
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
-- SELECT to_regclass('two_factor_auth'), to_regclass('login_history');
