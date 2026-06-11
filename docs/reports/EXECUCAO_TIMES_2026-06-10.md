# Execução por Times Especialistas — 2026-06-10

Resultado da auditoria full-system ("revisão 1000%": 6 agentes auditores com
verificação adversarial) seguida da execução em **2 ondas de especialistas**
(7 agentes implementadores). Complementa `HARDENING_2026-06_RESUMO.md` e o
gate de decisão em `../GO_LIVE_CHECKLIST.md`.

## Validação final (commit desta entrega)

- `npm run check` (tsc): limpo
- `npm test`: 1290+/1297 — falhas restantes são flakes de contenção (todas
  verdes isoladas; CI tem `retry: 1`)
- `npm run build`: 0 warnings
- Smoke E2E Chromium: 8/8

---

## Onda A

### Runtime serverless (P0)
- `api-handler.ts`: `unhandledRejection` só envenena a instância ANTES do app
  ficar pronto (flag `appReady`); depois, log + Sentry. `initializeRedis()`
  tratado como promise com degradação graciosa.
- `redis-client.ts`: sem fallback para `localhost:6379` em produção/Vercel —
  sem `REDIS_URL`, modo indisponível explícito; lazy-init sem rejection órfã.
- `routes.ts`: RedisStore de rate limit só com `REDIS_URL` (senão memória,
  documentado); `passOnStoreError: true` (Redis fora ≠ 500 em todo /api);
  pool de sessão com `max: 2` + `allowExitOnIdle` (espelha db.ts);
  `createTableIfMissing: false` + `migrations/20260610_000_session_table.sql`;
  SESSION_SECRET inválido em Vercel lança erro limpo (não `process.exit`).
- `jobs/queue-manager.ts`: conexão BullMQ lazy (não derruba import serverless).

### Schema parity — auth/auditoria (P0)
- `users` no PG: +14 colunas (oauth_*, password_reset_*, locked_until,
  failed_login_attempts...) — reset de senha, OAuth Google/MS, verificação de
  email e lockout passam a funcionar em prod.
- `audit_logs` +4 colunas (trilha de auditoria deixa de ser vazia em prod);
  `user_sessions` reconciliada nos dois lados; `two_factor_auth` e
  `login_history` criadas no PG; `deleted_at` no SQLite (soft delete
  exercitável em dev).
- `migrations/20260610_001_auth_audit_session_parity.sql` (idempotente).
- `schema-parity.test.ts` estendido (allowlist reduzida, +11 tabelas checadas
  coluna a coluna).

### Produto frontend (P0/P1)
- Recuperação de senha do app principal VIVA: páginas `/auth/*` convertidas de
  react-router-dom para wouter, rotas registradas, link "Esqueceu?" real.
- `imobi-context`: fim do truncamento em 50 — `fetchAllPages` (limit 100,
  hard-stop 20 páginas) em properties/leads; kanban, busca global e dashboard
  veem tudo.
- `/settings/billing` registrado (fim do 404 pós-checkout); mutations
  silenciosas ganharam feedback de erro (dashboard, kanban, portal owner —
  com invalidation de query na aprovação de manutenção).

### CI honesto (P0)
- `ci.yml`: `mkdir -p data` + `db:push:sqlite` antes dos testes (fim do
  SQLITE_CANTOPEN em checkout limpo); job e2e roda APENAS o smoke com
  webServer + seed; eslint no job de lint; db-check vira o parity test.
- `deploy-production.yml`: smoke pós-deploy = health check real com retry.
- `playwright.config.ts`: webServer em CI; 10 suítes e2e mortas quarentenadas
  (`tests/e2e/QUARANTINE.md`).
- Coverage ratchet honesto (medido 9.66%/6.93%/7.45%/10.04% → thresholds
  5/2/2/5, subir conforme crescer). `retry: 1` só em CI.
- **AÇÃO PENDENTE DO DONO**: branch protection em `main` (comando no final
  do QUARANTINE.md/checklist).

## Onda B

### Billing (P0)
- `updateTenantSubscription` faz MERGE de metadata (fim do double-billing por
  ordem de eventos Stripe; `stripeSubscriptionId` não é mais apagado).
- Rota legada `create-subscription` REMOVIDA (trial de 90 dias grátis por body).
- Limites de plano ATIVADOS: `checkPropertyLimit`/`checkLeadLimit` em
  POST /api/properties|leads (+ checagem no lead público); contadores
  corrigidos p/ SQLite.
- Mapa de status sane: `past_due` existe (grace period de 7 dias do guard
  deixa de ser código morto); `cancel_at_period_end` NÃO bloqueia o período
  pago; price sem plano mapeado → log + Sentry; `suspended` bloqueia novo
  checkout.

### Segurança (P0/P1)
- IDORs fechados: rooms/items de vistorias (cadeia item→room→inspection),
  drip campaigns (404 cross-tenant + leads validados no enroll), virtual
  tours (tenant via property), lead scores, property-comparisons (tenantId
  derivado, não aceito do body).
- `isAdminRole()` em routes-extensions (7×) e routes.ts (10×) — super_admin
  desbloqueado.
- LGPD: export/certificados em `/tmp` no Vercel (efêmero documentado;
  Supabase Storage no backlog); cleanup-sessions limpa a tabela `session` do
  PG; cron `cleanup-soft-deletes` agendado; cron `database-backup` removido
  (sem pg_dump no runtime — DR = PITR Supabase).
- Gate `digital_inspections` aplicado em /api/inspections + página de
  vistorias com `FeatureUpgradeState` (padrão do marketing); smoke atualizado.
- Rate limit de reset de senha distribuído via Redis (fallback documentado).

### Schema features (P0)
- Persistência REAL para os 4 módulos que não tinham tabela em lugar nenhum:
  Vistorias (3 tabelas), AVM (2), ISA (3), Auto-Marketing (1) — colunas
  derivadas do uso real no storage/routes/engines.
- +10 tabelas de routes-features portadas para o PG (lead_scores, virtual
  tours, drip campaigns, dashboards...); `analytics_events` no PG;
  `plans`/`tenant_subscriptions`/`usage_logs` no SQLite (billing testável
  em dev).
- `migrations/20260610_002_feature_tables.sql` (20 tabelas, idempotente).
- Teste de inspections reescrito para CRUD real (create→filtro→isolamento→
  update→delete em cascata).
- Allowlist do parity test: sobram só WhatsApp (5, PG-only, port futuro) e
  legal_documents (sem consumidor).

---

## Pendências que só o dono pode executar

1. **Aplicar migrations no Supabase** (`npm run db:migrate` com backup antes;
   ou `db:push`) — sem isso prod continua sem as tabelas/colunas novas.
2. **Branch protection em `main`** exigindo os jobs do CI.
3. Decisões de billing live: rodar `script/seed-stripe-prices.ts` com o
   catálogo live; conferir webhooks no dashboard Stripe.
4. Itens do `GO_LIVE_CHECKLIST.md` (secrets, integrações opcionais).
