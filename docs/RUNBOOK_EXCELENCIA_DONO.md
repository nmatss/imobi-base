# Runbook — Ações de Infra do Dono (Plano de Excelência)

**Data:** 2026-06-22 · **Pré-requisito do:** [`PLANO_EXCELENCIA_2026-06-22.md`](reports/PLANO_EXCELENCIA_2026-06-22.md)

Estas são as ações **P0 que NÃO podem ser feitas só com código** — exigem credenciais
de produção (Supabase admin, Vercel token, banco real). O código, migrations e
scripts já estão prontos no repo; aqui ficam os comandos que **você** executa.

> Ordem inegociável: **1 → 2 → 3 → 4 → 5**. RLS sob role não-owner antes de tudo;
> nada de UI/feature até a fundação de dados estar provada.

---

## 1. Criar role de aplicação NÃO-owner sem BYPASSRLS (DB-1)

Hoje o runtime pode conectar como owner/`service_role`, o que **ignora o RLS**
(RLS vira teatro). Crie um role dedicado e aponte a `DATABASE_URL` de runtime para ele.

No SQL editor do Supabase (como admin):

```sql
-- Role de aplicação: NOLOGIN herdável OU LOGIN direto. Aqui, LOGIN com senha.
CREATE ROLE imobibase_app LOGIN PASSWORD '<senha-forte-aleatoria>';

-- NUNCA superuser, NUNCA bypassrls.
ALTER ROLE imobibase_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

-- Permissões mínimas no schema public (DML, sem DDL).
GRANT USAGE ON SCHEMA public TO imobibase_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO imobibase_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO imobibase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO imobibase_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO imobibase_app;
```

Confirme que o role **não** tem bypass:

```sql
SELECT rolname, rolsuper, rolbypassrls
FROM pg_roles WHERE rolname = 'imobibase_app';
-- rolsuper=f, rolbypassrls=f  (obrigatorio)
```

Atualize a `DATABASE_URL` de runtime (Vercel) para usar `imobibase_app` (não o
owner). Mantenha o owner só para `db:migrate`/`db:rls:apply` (DDL).

---

## 2. Aplicar RLS em staging/prod e PROVAR (DB-2/DB-3/OP-A2)

O runner já foi corrigido (DB-2): `db:rls:apply` agora aplica **parent + child
tables** na ordem certa. Rode com a URL do **owner** (precisa de DDL):

```bash
# 1) Migrations estruturais (RLS fica de fora, aplicado no passo seguinte)
DATABASE_URL="postgres://<owner>@<host>/<db>" npm run db:migrate

# 2) RLS explícito (parent + child)
DATABASE_URL="postgres://<owner>@<host>/<db>" npm run db:rls:apply

# 3) Verificação: toda tabela com tenant_id deve ter ENABLE + FORCE RLS
DATABASE_URL="postgres://imobibase_app@<host>/<db>" npm run db:rls:verify
```

Prova **dinâmica** de isolamento (gap DB-4, ainda a escrever como teste de CI):
conecte como `imobibase_app` e confirme que sem o GUC `app.tenant_id` a query
retorna **0 linhas** (fail-closed), e que tenant A não vê dados de B.

---

## 3. Carregar secrets/env reais no Vercel (OP-A1)

`npm run ops:go-live:verify:strict` falha hoje por env ausente. Configure no Vercel
(Production): `DATABASE_URL` (role app), `REDIS_URL`, secrets de Stripe/MercadoPago,
`SENTRY_DSN`, `SESSION_SECRET`, chaves de OAuth, etc. Depois:

```bash
# Validação estática (sem rede) — pode rodar local:
npm run ops:go-live:verify:static
# Validação estrita (contra infra real) — deve sair com 0 blockers:
npm run ops:go-live:verify:strict
```

---

## 4. Ligar backup + executar restore drill (OP-A3/OP-A4)

```bash
# Confirma que a estratégia de backup está configurada (PITR no Supabase OU
# upload durável do pg_dump):
npm run ops:backup:verify

# Executa o drill de restauração e registra RPO/RTO medidos:
npm run ops:restore:drill
```

Anote RPO/RTO no `docs/DEPLOYMENT_RUNBOOK.md`. Sem um restore drill **executado**,
o backup é teórico.

---

## 5. Baseline de carga (ESC-5)

Rode um teste de carga (k6/autocannon) contra staging e publique p95/saturação no
`docs/DEPLOYMENT_RUNBOOK.md`, **antes e depois** da Onda 2 (cache/N+1), para
quantificar o ganho. (Script de load test ainda a adicionar — ESC-5.)

---

## Checklist de aceite (quando marcar a fundação como "provada")

- [ ] `pg_roles`: role de runtime com `rolsuper=f`, `rolbypassrls=f`.
- [ ] `npm run db:rls:verify` verde com a URL do role de app.
- [ ] Query sem `app.tenant_id` retorna 0 linhas (fail-closed) em Postgres real.
- [ ] `npm run ops:go-live:verify:strict` sai com 0 blockers.
- [ ] `npm run ops:restore:drill` executado; RPO/RTO registrados.
- [ ] Idempotência: `REDIS_URL` setada em prod (sem ela, pagamento cai para dedup
      só intra-instância — ver alerta Sentry "Idempotency em modo degradado").

---

## O que já está pronto no código (você não precisa fazer)

- Idempotência de pagamento durável em Redis (ACT-3/ESC-2) — só precisa `REDIS_URL`.
- Helper `withTenantTransaction` (ACT-1) para mutações atômicas (pronto p/ ACT-2/ACT-4).
- `db:rls:apply` cobrindo child tables (DB-2).
- Clamp de paginação no storage (ACT-6), CDN nos públicos (PERF-2/3), COUNT no
  dashboard (PERF-1), bloqueio de script-in-image (A4).
- Isolamento de tenant no cache do client (FE-1/FE-2), onboarding sem falha
  silenciosa (U1), fonte única de cores de chart (UI-1).
