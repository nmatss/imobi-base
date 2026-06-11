-- Tabela de sessões do connect-pg-simple (express-session).
--
-- Necessária porque server/routes.ts usa createTableIfMissing:false — a opção
-- "true" faz fs.readFile(__dirname/table.sql) do pacote, caminho que NÃO existe
-- no bundle esbuild (Vercel serverless) e lançaria no primeiro write de sessão.
--
-- DDL no formato canônico de node_modules/connect-pg-simple/table.sql
-- (mesmas colunas, PK "session_pkey" e índice "IDX_session_expire"), com
-- IF NOT EXISTS para ser idempotente e sem WITH (OIDS=FALSE), removido no
-- PostgreSQL 12+.

CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default" PRIMARY KEY,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
