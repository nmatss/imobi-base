# Database

Atualizado em: 17/06/2026

## Stack

- ORM: Drizzle.
- Producao: PostgreSQL via `DATABASE_URL`.
- Desenvolvimento/fallback: SQLite.

## Arquivos principais

- PostgreSQL schema: `shared/schema.ts`.
- SQLite schema: `shared/schema-sqlite.ts`.
- Runtime DB: `server/db.ts`.
- Storage/repository: `server/storage.ts`.
- Drizzle PG config: `drizzle.config.ts`.
- Drizzle SQLite config: `drizzle-sqlite.config.ts`.

## Multi-tenancy

- Tabelas operacionais devem ter `tenantId`.
- Toda query de dados sensiveis deve filtrar tenant.
- RLS PostgreSQL e requisito P0 para enterprise readiness.

## Infra conhecida

- Producao identificada por host Supabase pooler em `aws-1-us-east-1.pooler.supabase.com`.
- Deploy Vercel esta em `gru1`; avaliar latencia e co-localizacao.

## Prioridades

- Validar RLS em todas as tabelas multi-tenant.
- Revisar indices por `tenantId`, status, datas e filtros de relatorio.
- Testar backup e restore.
- Documentar RPO/RTO.

