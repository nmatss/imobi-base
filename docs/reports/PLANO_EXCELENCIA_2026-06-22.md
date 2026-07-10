---
title: Plano-Mestre de Excelencia — ImobiBase (10 dimensoes para 9+)
data: 2026-06-22
gerado_por: Workflow multi-agente (21 agentes — auditoria+plano por dimensao + sintese CTO)
prompt_base: docs/prompts/PROMPT_MASTER_AUDITORIA.md
branch_auditada: fix/csrf-hardening
status: ativo — backlog de execucao
---

> **Como este documento foi gerado:** 10 agentes auditores (read-only) pontuaram cada
> dimensao com evidencia de arquivo; 10 agentes tech-lead montaram o plano de remediacao
> ate 9+; 1 agente CTO consolidou. Toda nota e gap cita arquivo real. Notas sao do estado
> em 2026-06-22 na branch fix/csrf-hardening.

# Plano-Mestre de Excelência — ImobiBase

> CTO consolidando 10 dimensões para nota >= 9 (meta 10). Data base: 2026-06-22. Branch: `fix/csrf-hardening`.

---

## 1. Resumo Executivo

O ImobiBase é um SaaS imobiliário multi-tenant **production-capable, mas não enterprise-ready**. A arquitetura de segurança, isolamento multi-tenant (RLS desenhado), CSRF, idempotência e infraestrutura serverless estão **implementadas e testadas localmente** — porém o produto está **bloqueado por falta de prova em ambiente real** e por dívida estrutural acumulada.

**Nota média atual estimada: ~6,9 / 10** (média simples das 10 dimensões abaixo). O teto está sendo imposto por três grupos de problemas, em ordem de criticidade:

1. **Dados/Segurança não provados em produção (P0 duro):** o RLS nativo PostgreSQL **está escrito mas NÃO aplicado/provado** em staging/prod; o role de runtime pode ser owner/BYPASSRLS (anulando RLS); `npm run ops:go-live:verify:strict` **falha com 11+ blockers** desde 18/06; restore drill **nunca executado**; backup **sem estratégia ligada**. Enquanto isso, o isolamento depende 100% de código de aplicação — qualquer handler que esqueça `validateResourceTenant`/`runWithTenantRlsContext` é IDOR silencioso (e o `POST /api/leads` autenticado **já está fora de contexto RLS**).
2. **Integridade transacional e vazamentos sutis (P0/P1):** idempotência de pagamento é `Map` em memória (dupla cobrança PIX/boleto sob reciclagem serverless); dedup de lead e cursor round-robin têm race; cache Redis **desenhado mas nunca invocado**; `switchTenant` no client **só troca localmente** (vazamento de dados entre tenants).
3. **Dívida estrutural que trava velocidade (P1):** `routes.ts` com 4495 LOC e ~160 checks inline; 6 mega-componentes React (2652→908 LOC); 305 `any`; charts com hex hardcoded; N+1 em relatórios; LCP 5.1s vs meta 2.5s; cobertura de testes ~13%.

**O que falta para enterprise:** transformar "arquitetura existe" em "isolamento provado, transações atômicas, recuperação testada, observabilidade ativa" — e só então atacar a dívida estrutural de arquitetura/frontend/UI/performance. **P0 de dados/segurança vem antes de qualquer UI/UX.**

---

## 2. Quadro de Notas

| Dimensão | Nota Atual | Meta | Gap | Esforço total | Confiança |
|---|---|---|---|---|---|
| Segurança | 7,8 | 9,3 | 1,5 | M-L (10 ações, A1-A4 são o núcleo) | Alta |
| BancoDeDados | 7,5 | 9,2 | 1,7 | L (12 ações, 4 P0) | Alta |
| Backend | 7,0 | 9,0 | 2,0 | L-XL (11 ações, ACT-1 fundação) | Alta |
| Escalabilidade | 7,0 | 9-10 | 2,0+ | L (10 ações, 2 P0) | Média-Alta |
| Performance | 6,5 | 9,0 | 2,5 | M-L (10 ações, 3 P0) | Alta |
| Arquitetura | 6,5 | 9,0 | 2,5 | XL (8 ações, arch-1 desbloqueador) | Alta |
| Frontend | 7,0 | 9,0 | 2,0 | XL (9 ações, FE-1/2 segurança) | Alta |
| UI | 8,0 | 9,0 | 1,0 | M (7 ações) | Alta |
| UX | 6,0 | 9,0 | 3,0 | M (12 ações, 2 P0) | Alta |
| Operação | 6,0 | 9,0 | 3,0 | L (15 ações, 4 P0 no gate) | Alta |

**Média atual: ~6,9. Média-meta: ~9,1.** Maiores gaps: Operação (3,0), UX (3,0), Performance (2,5), Arquitetura (2,5).

---

## 3. Definição de "9+" por Dimensão (Definition of Done)

**Segurança (9,3):** RLS nativo APLICADO em prod e provado em CI (`db:rls:verify` falha o pipeline se tabela com `tenant_id` não tiver ENABLE+FORCE); role de app não-owner sem BYPASSRLS confirmado no go-live; teste IDOR fail-closed por família de tabela; upload bloqueia script-in-image (não só avisa) + malware scan para PDF/zip/office; DAST agendado (SAST/CodeQL/Snyk já existem); CSP sem `unsafe-inline`/`unsafe-eval` em qualquer caminho que vá a prod; IDS persistente em Redis com alerta Sentry; política de retenção de audit logs (LGPD).

**BancoDeDados (9,2):** RLS aplicado em staging/prod sob role não-owner com `db:rls:verify` verde contra Postgres real; prova **dinâmica** de isolamento (tenant A → 404/0-linhas em recurso de B; sem GUC `app.tenant_id` → 0 linhas, fail-closed); `ops:go-live:verify:strict` com 0 falhas; constraints únicas tenant-scoped (dedup lead aplicado, sem duplicatas residuais); decisão documentada sobre `users.email` global vs tenant; FK enforcement em refs opcionais de alto valor; 1-2 views agregadas `SECURITY INVOKER`.

**Backend (9,0):** toda mutação com invariante de unicidade/cursor roda em UMA transação com locking explícito (`INSERT ON CONFLICT` + `FOR UPDATE`), provado por teste de concorrência; helper único `withTenantTransaction(tenantId, fn)`; idempotência durável (Postgres/Redis, janela >=7d); webhooks com reserva-de-evento + update na mesma transação; RLS enforced por middleware no entry; teto de paginação no storage (clamp <=100); isolation level/locking financeiro com retry; soft-delete testável; cron locks com heartbeat; CI com Postgres efêmero para fluxos multi-tenant.

**Escalabilidade (9):** cache Redis realmente invocado nos 5+ getters quentes com invalidação por tenant; idempotência de pagamento em Redis (SET NX + TTL) multi-réplica; zero N+1 em export/listagem (joins explícitos); baseline de load test (k6/autocannon) com req/s e p95 publicados; cron de reminders via fan-out BullMQ; downgrade de rate-limit para in-memory dispara alerta Sentry. **Para 10:** circuit breaker no pool, teste RLS cross-tenant concorrente, backup com restore off-site auditável.

**Performance (9):** 5+ métodos quentes servem cache Redis (p50 <150ms, hit-rate >70%); zero N+1 em `getBrokerPerformanceReport`/`generateTransfersForMonth`; `getDashboardStats` usa `COUNT(*)` (não `SELECT * + .length`); endpoints públicos com Cache-Control/CDN real (regra `no-store` global do `vercel.json` separada); Lighthouse mobile home >=85 e LCP <2,5s travando o CI; sem leak de memória no prefetch hover; `storage-cached.ts` integrado ou removido.

**Arquitetura (9):** nenhum arquivo de rota >~600 LOC (`routes.ts` decomposto por domínio em `server/routes/<dominio>.ts`); handlers compostos via `asyncHandler` + `withTenantResource` (hoje 0 usos); cache `query-cache.ts` wired; storage injetável (`getStorage()`/factory + `InMemoryStorage`); cold-start gate único fail-fast; sem drift dual-DB; teste de arquitetura no CI (LOC-cap, asyncHandler obrigatório, schema-parity).

**Frontend (9):** nenhum componente de produto >~400 LOC misturando fetch+estado+UI (6 mega-arquivos decompostos); `switchTenant` chama servidor E limpa cache React Query; todas as queryKeys escopadas por `tenantId`; todo fetch via `useQuery` (sem raw fetch+useEffect); `any` <50 (hoje 305); `React.StrictMode` + `exhaustive-deps` verdes; caminhos quentes memoizados; Suspense granular + retry de chunk.

**UI (9):** zero hex hardcoded em charts (helper `getChartColor()` ancorado em vars `--chart-*` em `:root` e `.dark`); dark mode navegável end-to-end validado por screenshots; uma única `StatusBadge` canônica; alt text em 100% das `<img>` de conteúdo + `vitest-axe` no CI; ao menos 1 guard-rail (ESLint) contra regressão de cor hex.

**UX (9):** zero falhas silenciosas em fluxos críticos (toda `apiRequest` que falha mostra `toast.error` e NÃO avança); validação client-side (Zod) com `aria-invalid` em todos os forms; toda lista com EmptyState + Skeleton (distingue carregando/vazio/filtro); async desabilita TODOS os controles concorrentes; modais resetam após sucesso; um único `formatCurrency`.

**Operação (9):** `ops:go-live:verify:strict` passa contra infra real (0 fail); RLS aplicado + provado; restore drill executado com RPO/RTO medidos; backup ligado (PITR ou upload durável); 12 crons comprovadamente disparando em prod com lock Redis; Sentry com alertas configurados; runbook de incidentes com SLA/RTO/RPO; health check pós-deploy com retry/backoff; migrations de ledger aplicadas e auditadas.

---

## 4. Plano por Dimensão

### 4.1 Segurança — 7,8 → 9,3
**Principais gaps:** RLS nativo não provado em prod; role pode ser owner/BYPASSRLS; CSP dev com `unsafe-*`; upload não bloqueia script-in-image; sem malware scan; IDS volátil em memória serverless.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| A1 | P0 | Gate RLS nativo no CI/pré-deploy (provar, não só escrever); enumerar tabelas com `tenant_id` e reprovar sem ENABLE+FORCE | `.github/workflows/ci.yml`, `deploy-production.yml`, `script/verify-rls.ts`, `script/migrate.ts`, `migrations/RLS_enable_child_tables.sql` | M | high (+0,6) |
| A2 | P0 | Confirmar role de app não-owner e sem BYPASSRLS em prod (checagem bloqueante) | `script/verify-go-live-readiness.ts`, `docs/RLS_RUNBOOK.md`, `deploy-production.yml` | S | high (+0,3) |
| A3 | P0 | Testes de regressão IDOR fail-closed por família de tabela (sem context → 0 linhas) | `tests/integration/security/auth-flow.test.ts`, `server/db-rls.ts`, `migrations/RLS_enable_child_tables.sql` | L | high (+0,3) |
| A4 | P1 | Bloquear (não avisar) script-in-image no upload raster | `server/security/file-validator.ts`, `server/storage/file-upload.ts` | S | medium (+0,2) |
| A5 | P1 | Malware scan para uploads não-imagem (VirusTotal/Cloudmersive via flag env) | `server/storage/file-upload.ts`, `server/security/file-validator.ts`, `server/security/secret-manager.ts` | L | medium (+0,2) |
| A6 | P2 | DAST agendado contra staging (`pen-test.ts` já existe) | `.github/workflows/security-scan.yml`, `scripts/security/pen-test.ts` | M | medium (+0,15) |
| A7 | P2 | IDS persistente em Redis + alerta Sentry/webhook | `server/security/intrusion-detection.ts`, `server/session-redis.ts`, `server/routes-security.ts` | M | medium (+0,15) |
| A8 | P2 | Eliminar `unsafe-inline`/`unsafe-eval` de qualquer caminho que possa ir a prod | `server/routes.ts`, `script/verify-go-live-readiness.ts` | S | low (+0,1) |
| A9 | P3 | Política de retenção/archival de audit logs (LGPD) | `server/jobs/processors/backup-processor.ts`, `server/compliance/data-deletion.ts` | M | low (+0,05) |
| A10 | P3 | HTTPS redirect explícito + SRI/self-host de fontes | `server/index.ts`, `server/routes.ts`, `client/index.html` | S | low (+0,05) |

### 4.2 BancoDeDados — 7,5 → 9,2
**Principais gaps:** RLS NÃO aplicado em prod; sem prova dinâmica de isolamento; dedup de lead falha com duplicatas residuais; `users.email` único global; FK opcionais faltando; sem views agregadas.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| DB-1 | P0 | Criar role de app não-owner sem BYPASSRLS no Supabase; `DATABASE_URL` runtime aponta para ele | `migrations/RLS_create_app_role.sql`, `server/db.ts`, `server/storage/supabase-client.ts`, `docs/RLS_RUNBOOK.md` | M | high |
| DB-2 | P0 | Corrigir `db:rls:apply` para também aplicar `RLS_enable_child_tables.sql` | `script/migrate.ts`, `script/verify-rls.ts`, `script/verify-go-live-readiness.ts` | S | high |
| DB-3 | P0 | Aplicar RLS em staging + `db:rls:verify` verde com role runtime real | `migrations/RLS_enable.sql`, `migrations/RLS_enable_child_tables.sql`, `server/db-rls.ts` | L | high |
| DB-4 | P0 | Suíte de prova DINÂMICA de isolamento contra Postgres real | `tests/integration/rls-postgres-isolation.test.ts`, `tests/helpers/tenant-isolation-app.ts` | L | high |
| DB-5 | P0 | Pré-flight de dedup de leads antes dos índices únicos | `script/dedup-leads-preflight.ts`, `migrations/20260620_005_leads_dedup_indexes.sql` | M | medium |
| DB-6 | P2 | Decisão `users.email` tenant-scoped (ou documentar global) | `shared/schema.ts`, `migrations/20241225_003_add_unique_constraints.sql`, `server/auth/oauth-google.ts` | L | medium |
| DB-7 | P1 | RLS nas tabelas de auth (`two_factor_auth`, `login_history`, `user_permissions`) sem quebrar login | `migrations/RLS_enable_child_tables.sql`, `server/db-rls.ts`, `server/integrations/sms/twofa.ts` | L | medium |
| DB-8 | P1 | FK enforcement em refs opcionais (`maintenance_tickets`, `property_inspections`) | `shared/schema.ts`, `migrations/20260622_001_optional_fk_enforcement.sql`, `shared/schema-sqlite.ts` | M | medium |
| DB-9 | P1 | Tratamento de `tenant_id` nullable (newsletter etc.) — backfill ou política auditada | `shared/schema.ts`, `migrations/RLS_enable.sql`, `server/routes-features.ts` | M | medium |
| DB-10 | P1 | Views agregadas de negócio `SECURITY INVOKER` (financeiro/CRM) | `migrations/20260622_002_business_views.sql`, `shared/schema.ts`, `server/storage.ts` | L | medium |
| DB-11 | P3 | Índices `created_at` em alto volume (whatsapp_messages, audit) | `migrations/20260622_003_highvolume_created_at_indexes.sql` | S | low |
| DB-12 | P3 | CHECK datas + doc parity SQLite + cascade explícito coordinates | `migrations/README.md`, `shared/schema.ts`, `migrations/20260621_001_missing_core_tables.sql` | S | low |

### 4.3 Backend — 7,0 → 9,0
**Principais gaps:** sem locking para mutações concorrentes; idempotência só em memória; webhooks dedup não-atômico; RLS por disciplina (POST /api/leads fora de contexto); sem teto de paginação no storage.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| ACT-1 | P0 | Helper transacional único `withTenantTransaction(tenantId, fn)` | `server/db-rls.ts`, `server/db.ts`, `server/storage.ts` | L | high (+0,5) |
| ACT-2 | P0 | Dedup de lead + cursor round-robin atômicos (`ON CONFLICT` + `FOR UPDATE`) | `server/services/lead-intake.ts`, `server/services/lead-distribution.ts`, `server/storage.ts`, `server/routes.ts` | L | high (+0,4) |
| ACT-3 | P0 | Idempotência de pagamento durável (Postgres/Redis, janela >=7d) | `server/middleware/idempotency.ts`, `server/routes-payments.ts`, `migrations/` | M | high (+0,3) |
| ACT-4 | P0 | Atomizar reserva-de-evento + update nos webhooks | `server/payments/stripe/stripe-webhooks.ts`, `mercadopago-webhooks.ts`, `clicksign/webhook-handler.ts`, `webhook-ledger.ts` | M | high (+0,3) |
| ACT-5 | P0 | Enforçar contexto RLS no entry via middleware + teste de cobertura (corrigir POST /api/leads) | `server/routes.ts`, `server/middleware/tenant-isolation.ts`, `server/db-rls.ts` | L | high (+0,3) |
| ACT-6 | P1 | Teto de paginação server-side dentro do storage (`clampLimit`) | `server/storage.ts`, `server/schemas/index.ts`, `server/routes.ts` | S | medium (+0,15) |
| ACT-7 | P1 | Isolation level/locking financeiro + retry em `serialization_failure` | `server/db-rls.ts`, `server/storage.ts` | M | medium (+0,2) |
| ACT-8 | P2 | Enforcement testável de soft-delete em list/search/export | `server/utils/soft-delete.ts`, `server/storage.ts` | M | medium (+0,1) |
| ACT-9 | P2 | Heartbeat/renovação de TTL nos cron locks + alerta lock-stuck | `server/routes-cron.ts`, `server/jobs/scheduled-jobs.ts` | M | medium (+0,1) |
| ACT-10 | P2 | Fluxos multi-tenant críticos contra Postgres efêmero no CI | `server/db.ts`, `vitest.config.ts`, `.github/workflows` | L | medium (+0,2) |
| ACT-11 | P3 | Fail-closed em late unhandledRejection no cold-start | `server/api-handler.ts` | S | low (+0,05) |

### 4.4 Escalabilidade — 7,0 → 9-10
**Principais gaps:** cache Redis não integrado; idempotência não-distribuída; N+1 em joins; sem baseline de load test; cron inline limitado a 60s.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| ESC-1 | P0 | Integrar cache Redis nos getters read-heavy (reusar singleton `redis-client.ts`) | `server/storage.ts`, `server/cache/query-cache.ts`, `server/cache/redis-client.ts`, `server/storage-cached.ts` | L | high |
| ESC-2 | P0 | Idempotência de pagamento em Redis (SET NX + TTL) com fallback | `server/middleware/idempotency.ts`, `server/routes-payments.ts`, `server/cache/redis-client.ts` | M | high |
| ESC-3 | P1 | Eliminar N+1 em listagem/export com joins Drizzle | `server/storage.ts`, `server/routes-features.ts`, `server/routes.ts` | L | medium |
| ESC-4 | P1 | Fan-out do cron de reminders para BullMQ | `server/jobs/scheduled-jobs.ts`, `server/routes-cron.ts`, `server/jobs/index.ts`, `docs/DEPLOYMENT_RUNBOOK.md` | L | medium |
| ESC-5 | P1 | Baseline de load test (k6/autocannon) com p95 publicado | `package.json`, `scripts/load-test.js`, `docs/DEPLOYMENT_RUNBOOK.md` | M | high |
| ESC-6 | P2 | Alerta Sentry quando rate-limit degrada para in-memory | `server/routes.ts`, `server/routes-security.ts` | S | medium |
| ESC-7 | P2 | Endurecer backup pg_dump (testar falha de upload, auditar PITR) | `server/jobs/processors/backup-processor.ts`, `tests/jobs/backup-processor.test.ts` | M | medium |
| ESC-8 | P3 | Circuit breaker no pool PostgreSQL | `server/db.ts`, `server/api-handler.ts` | M | low |
| ESC-9 | P3 | Teste automatizado de isolamento RLS cross-tenant concorrente | `server/db-rls.ts`, `tests/integration/rls-isolation.test.ts` | M | low |
| ESC-10 | P3 | Cleanup de chaves Redis órfãs (TTL sempre setado) | `server/jobs/processors/cleanup-processor.ts`, `server/cache/query-cache.ts`, `server/middleware/idempotency.ts` | S | low |

### 4.5 Performance — 6,5 → 9,0
**Principais gaps:** cache não integrado; N+1 em broker report e transfers; dashboard carrega tudo e conta em memória; públicos sem Cache-Control; LCP 5,1s.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| PERF-1 | P0 | `getDashboardStats` com `COUNT(*)` agregado (usar counters existentes) | `server/storage.ts` | S | high (+0,4) |
| PERF-2 | P0 | Separar regra `no-store` global do `vercel.json` para liberar CDN nos públicos | `vercel.json` | S | high |
| PERF-3 | P0 | Cache-Control nos handlers Express públicos de imóvel + ETag | `server/routes.ts` | S | high |
| PERF-4 | P1 | Integrar cache Redis nos 5 métodos quentes (key por tenantId + invalidação) | `server/storage.ts`, `server/cache/query-cache.ts`, `server/storage-cached.ts` | L | high (+0,7) |
| PERF-5 | P1 | Eliminar N+1 em `getBrokerPerformanceReport` com GROUP BY | `server/storage.ts` | L | high (+0,4) |
| PERF-6 | P1 | Eliminar N+1 em `generateTransfersForMonth` + mover para BullMQ | `server/storage.ts`, `server/jobs/processors` | M | high (+0,3) |
| PERF-7 | P2 | Paralelizar lookups em `getOwnerStatement` | `server/storage.ts` | M | medium (+0,2) |
| PERF-8 | P2 | Corrigir leak de memória do prefetch hover (`useRef` + cleanup) | `client/src/hooks/usePrefetch.ts` | S | medium (+0,1) |
| PERF-9 | P2 | Travar gate Lighthouse no CI + remover config duplicada | `.lighthouserc.js`, `lighthouserc.json`, `tests/performance/mobile-performance.spec.ts` | M | medium (+0,2) |
| PERF-10 | P3 | Decidir destino do `storage-cached.ts` (integrar ou remover) | `server/storage-cached.ts`, `server/cache/query-cache.ts`, `server/storage.ts` | S | low (+0,1) |

### 4.6 Arquitetura — 6,5 → 9,0
**Principais gaps:** `routes.ts` 4495 LOC monolítico; `asyncHandler`/`withTenantResource` com 0 usos; cache morto; storage singleton não-injetável; cold-start race.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| arch-1 | P0 | Decompor `routes.ts` por domínio (usar as 40 seções como seam) | `server/routes.ts`, `server/routes/properties.ts`, `leads.ts`, `rentals.ts`, `finance.ts`, `sales.ts`, `_shared.ts` | XL | high |
| arch-2 | P0 | Adotar `asyncHandler` + `withTenantResource`, eliminar boilerplate try/catch | `server/routes/properties.ts`, `leads.ts`, `middleware/tenant-resource.ts`, `error-handler.ts`, `index.ts` | L | high |
| arch-3 | P1 | Registry iterável substituindo 18 `register*Routes` sequenciais | `server/index.ts`, `server/routes/registry.ts` | S | medium |
| arch-4 | P1 | Wire da camada de cache nos hot-paths + remover `storage-cached.ts` morto | `server/storage.ts`, `server/cache/query-cache.ts`, `redis-client.ts`, `storage-cached.ts` | M | high |
| arch-5 | P1 | Storage como factory injetável + `InMemoryStorage` de teste | `server/storage.ts`, `server/storage/factory.ts`, `in-memory.ts`, `tests/unit/ai-actions.test.ts` | L | medium |
| arch-6 | P2 | Gate de cold-start único fail-fast em `api-handler.ts` | `server/api-handler.ts` | S | medium |
| arch-7 | P3 | Fechar drift dual-DB (5 tabelas WhatsApp) + podar aliases `any` | `shared/schema-sqlite.ts`, `server/storage.ts`, `routes-whatsapp.ts`, `tests/unit/schema-parity.test.ts` | M | low |
| arch-8 | P3 | Teste de arquitetura no CI (LOC-cap, asyncHandler, schema-parity) | `tests/unit/architecture.test.ts`, `CONTRIBUTING.md`, `package.json` | M | medium |

> **Nota:** arch-4 e ESC-1/PERF-4 atacam o MESMO código (wire do cache em `storage.ts`). Devem ser **uma única execução coordenada** para não conflitar.

### 4.7 Frontend — 7,0 → 9,0
**Principais gaps:** `switchTenant` só troca localmente (vazamento); queryKeys sem tenantId; raw fetch+useEffect; 305 `any`; 6 mega-arquivos; sem StrictMode.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| FE-1 | P0 | Corrigir `switchTenant`: servidor + limpar cache React Query | `client/src/lib/imobi-context.tsx`, `client/src/lib/queryClient.ts` | M | high (segurança) |
| FE-2 | P0 | Escopar todas as queryKeys por `tenantId` | `client/src/lib/queryClient.ts`, `hooks/usePrefetch.ts`, `pages/properties/list.tsx`, `pages/leads/kanban.tsx` | L | high |
| FE-3 | P1 | Migrar data-fetching de hooks para React Query | `client/src/hooks/useDashboardData.ts`, `useFollowUps.ts`, `lib/queryClient.ts` | L | high |
| FE-4 | P1 | Memoizar caminhos quentes (ImobiProvider value, GlobalSearch, AdvancedFilters) | `client/src/lib/imobi-context.tsx`, `components/GlobalSearch.tsx`, `FileUpload.tsx` | M | medium |
| FE-5 | P1 | Decompor os 6 mega-arquivos em sub-componentes + hooks | `pages/dashboard.tsx`, `vendas/index.tsx`, `leads/kanban.tsx`, `calendar/index.tsx`, `contracts/index.tsx`, `reports/index.tsx` | XL | high |
| FE-6 | P1 | Tipar fronteira de API + `any` <50 + ESLint `no-explicit-any` | `client/src/lib/queryClient.ts`, `pages/dashboard.tsx`, `tsconfig.json` | L | medium |
| FE-7 | P2 | Ligar `React.StrictMode` + `exhaustive-deps` e corrigir achados | `client/src/main.tsx`, `hooks/useDashboardData.ts` | M | medium |
| FE-8 | P2 | Suspense granular + retry de chunk (`lazyWithRetry`) | `client/src/App.tsx`, `components/ErrorBoundary.tsx` | M | medium |
| FE-9 | P3 | Extrair SearchProvider/NotificationsProvider do DashboardLayout | `client/src/components/layout/dashboard-layout.tsx` | M | low |

### 4.8 UI — 8,0 → 9,0
**Principais gaps:** hex hardcoded em 8 páginas de chart; dark mode não validado E2E; `StatusBadge` duplicado; discrepância a11y 78% vs 95%.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| UI-1 | P1 | Fonte de verdade de cores de chart (vars `.dark` + token Tailwind + `getChartColor`) | `client/src/index.css`, `tailwind.config.js`, `client/src/lib/design-helpers.ts` | S | high |
| UI-2 | P1 | Migrar 8 páginas de charts para `getChartColor()` (remover hex) | `pages/dashboard.tsx`, `rentals/.../RentalDashboard.tsx`, `vendas/.../SalesCharts.tsx`, `financial/.../FinancialCharts.tsx`, `reports/index.tsx`, `reports/CommissionReports.tsx`, `analytics/index.tsx`, `admin/index.tsx` | M | high |
| UI-3 | P1 | Smoke E2E de dark mode página-a-página + corrigir classes ad-hoc | `pages/financial/.../FinancialDashboard.tsx`, `vendas/.../SalesCharts.tsx`, `pages/compliance`, `index.css` | L | high |
| UI-4 | P2 | Consolidar `StatusBadge` (uma implementação canônica token-based) | `components/ui/StatusBadge.tsx`, `status-badge.tsx`, `__tests__/StatusBadge.test.tsx`, `design-tokens.ts`, `design-system.ts` | M | medium |
| UI-5 | P2 | `vitest-axe` no CI + corrigir alt/aria das imagens (~26 sem alt) | `pages/properties/list.tsx`, `package.json`, `tests/unit`, `docs/reports/AGENTE12_...md` | L | medium |
| UI-6 | P3 | Guard-rail ESLint contra hex em `fill/stroke/color` | `eslint.config.js` | M | medium |
| UI-7 | P3 | Confirmar visibilidade do toggle de tema + corrigir doc contraditória | `components/settings/sections/PreferencesSettings.tsx`, `DESIGN_SYSTEM_GUIDE.md`, `AGENTE10_...md` | S | low |

### 4.9 UX — 6,0 → 9,0
**Principais gaps:** falhas silenciosas no onboarding (`// silently continue`); sem validação de campo; sem EmptyState/skeleton; double-submit; forms não resetam.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| U1 | P0 | Eliminar falhas silenciosas no onboarding (toast.error + não avançar no catch) | `client/src/pages/onboarding/index.tsx` | S | high |
| U2 | P0 | Validação Zod + feedback inline (onboarding/signup) reusando `form-schemas.ts` | `pages/onboarding/index.tsx`, `auth/signup.tsx`, `lib/form-schemas.ts`, `components/ui/field-error.tsx` | M | high |
| U3 | P1 | Validação de obrigatórios no modal de imóvel (react-hook-form + zod) | `pages/properties/list.tsx`, `lib/form-schemas.ts` | M | high |
| U4 | P1 | Gating de progressão + desabilitar navegação concorrente | `pages/onboarding/index.tsx` | S | medium |
| U5 | P1 | EmptyState + skeleton consistentes (contracts, properties); distinguir 403 de vazio | `pages/contracts/index.tsx`, `leads/kanban.tsx`, `properties/list.tsx`, `components/ui/EmptyState.tsx` | M | medium |
| U6 | P2 | Resetar form após submit bem-sucedido | `pages/leads/kanban.tsx`, `properties/list.tsx`, `contracts/index.tsx` | S | medium |
| U7 | P2 | Feedback in-flight em bulk ops (aria-busy/disable) | `pages/leads/kanban.tsx` | S | low |
| U8 | P2 | Help text/tooltips no onboarding | `pages/onboarding/index.tsx` | S | low |
| U9 | P2 | Progressive disclosure no form de imóvel (16+ campos) | `pages/properties/list.tsx` | L | medium |
| U10 | P2 | Badge de contagem + "limpar filtros" | `pages/leads/kanban.tsx`, `properties/list.tsx` | S | low |
| U11 | P3 | Focus rings visíveis (WCAG AA) | `pages/onboarding/index.tsx`, `properties/list.tsx` | S | low |
| U12 | P3 | Unificar `formatCurrency` canônico | `lib/form-helpers.ts`, `pages/properties/details.tsx`, `dashboard.tsx`, `leads/kanban.tsx`, `properties/list.tsx` | S | low |

### 4.10 Operação — 6,0 → 9,0
**Principais gaps:** gate strict falha com 11+ blockers; RLS não aplicado; restore drill nunca executado; backup sem estratégia; Sentry sem alertas; cobertura ~13%.

| ID | Prio | Ação | Arquivos | Esforço | Impacto |
|---|---|---|---|---|---|
| OP-A1 | P0 | Carregar secrets/env reais no Vercel prod e provar gate deploy | `script/verify-go-live-readiness.ts`, `docs/GO_LIVE_CHECKLIST.md`, `DEPLOYMENT_RUNBOOK.md` | M | high |
| OP-A2 | P0 | Aplicar RLS em prod + provar isolamento com role não-owner | `migrations/RLS_enable.sql`, `RLS_enable_child_tables.sql`, `script/verify-rls.ts`, `tests/unit/db-rls-context.test.ts` | L | high |
| OP-A3 | P0 | Decidir e ligar estratégia de backup (PITR ou upload durável) | `script/verify-backup-readiness.ts`, `server/jobs/processors/backup-processor.ts`, `DEPLOYMENT_RUNBOOK.md` | M | high |
| OP-A4 | P0 | Executar restore drill real + registrar RPO/RTO | `script/restore-drill.ts`, `script/verify-go-live-readiness.ts`, `DEPLOYMENT_RUNBOOK.md` | M | high |
| OP-A5 | P1 | Provar os 12 crons em prod com lock Redis e status | `server/routes-cron.ts`, `jobs/cron-manifest.ts`, `vercel.json`, `GO_LIVE_CHECKLIST.md` | M | high |
| OP-A6 | P1 | Ativar Sentry em prod + regras de alerta + escalonamento | `server/monitoring/sentry.ts`, `SENTRY_ALERTS_SETUP.md`, `OBSERVABILITY.md`, `deploy-production.yml` | M | medium |
| OP-A7 | P1 | Aplicar e auditar migrations de ledger/idempotência em prod | `migrations/20260617_001_webhook_events.sql`, `20260617_002`, `20260618_001`, `stripe-webhooks.ts` | M | high |
| OP-A8 | P1 | Runbook de incidentes com SLA/RTO/RPO, escalonamento, rollback | `DEPLOYMENT_RUNBOOK.md`, `RUNBOOK.md`, `OBSERVABILITY.md` | M | medium |
| OP-A9 | P2 | Health check pós-deploy com retry/backoff | `.github/workflows/deploy-production.yml` | S | medium |
| OP-A10 | P2 | Detecção de cron silencioso/atrasado (heartbeat + alerta) | `server/routes-cron.ts`, `jobs/cron-manifest.ts`, `server/routes.ts` | M | medium |
| OP-A11 | P2 | Evidência de pentest (automatizado + externo) | `scripts/security/pen-test.ts`, `verify-go-live-readiness.ts`, `KNOWN_ISSUES.md` | M | medium |
| OP-A12 | P2 | Mitigar latência cross-region (us-east-1 vs gru1) | `vercel.json`, `DEPLOYMENT_RUNBOOK.md`, `KNOWN_ISSUES.md` | L | medium |
| OP-A13 | P3 | Cobrir caminhos operacionais críticos com teste + aceite formal de risco | `tests/unit/cron-runtime-guards.test.ts`, `backup-processor.ts`, `restore-drill.ts` | L | low |
| OP-A14 | P3 | Gate de lint incremental (congelar baseline de 5180 warnings) | `.github/workflows/ci.yml`, `eslint.config.js` | M | low |
| OP-A15 | P3 | Documentar/validar config do pool Postgres | `DEPLOYMENT_RUNBOOK.md`, `server/storage/supabase-client.ts` | S | low |

---

## 5. Plano de Execução em Ondas

> Princípio de priorização: **dados/segurança/integridade transacional ANTES de UI/UX/dívida estrutural.** As ondas 0-1 são pré-requisito de qualquer claim enterprise.

### Onda 0 — Fundação de Dados e Isolamento (P0 crítico)
**Objetivo:** transformar "RLS desenhado" em "RLS aplicado e provado"; criar o role correto; o helper transacional. **Nada de UI aqui.**

Há um **núcleo RLS compartilhado** por 4 dimensões (Segurança A1-A3, Banco DB-1/2/3/4, Operação OP-A2, Backend ACT-5) — executar UMA vez, não quatro:
- **DB-1** (role não-owner) → **DB-2** (apply inclui child tables) → **DB-3** (aplicar em staging + verify) → **DB-4 / A3 / OP-A2** (prova dinâmica de isolamento, mesma suíte).
- **ACT-1** (`withTenantTransaction`) — fundação de toda atomicidade; independente do RLS, paralelo.
- **OP-A1** (secrets reais no Vercel) — pré-requisito de DB-3 (precisa `DATABASE_URL` autenticada).

**Eleva:** BancoDeDados (7,5→~8,7), Segurança (7,8→~8,7), Operação (parcial), Backend (fundação).

### Onda 1 — Integridade Transacional e Vazamentos (P0)
**Objetivo:** eliminar dupla cobrança, races de lead, IDOR por contexto faltante, e o vazamento multi-tenant no client.
- **ACT-2** (dedup/cursor atômicos), **ACT-3 / ESC-2** (idempotência durável — mesma ação, coordenar), **ACT-4** (webhooks atômicos), **ACT-5** (middleware RLS no entry, corrige POST /api/leads).
- **FE-1 + FE-2** (switchTenant servidor + queryKeys por tenantId) — vazamento de dados no client, fazer juntos.
- **DB-5** (pré-flight dedup) + **OP-A7** (migrations de ledger em prod).
- **OP-A3 + OP-A4** (backup ligado + restore drill executado).

**Eleva:** Backend (→~8,5), Escalabilidade (parcial), Frontend (→~7,8), Operação (→~8,5), Banco (→~9,0).

### Onda 2 — Performance, Cache e Escala (P0/P1)
**Objetivo:** ativar o cache morto e matar os N+1. **Coordenar arch-4 + ESC-1 + PERF-4 como uma única execução no `storage.ts`.**
- **PERF-1** (COUNT no dashboard) → **PERF-2 + PERF-3** (par atômico: vercel.json + headers Express) → **PERF-4 / ESC-1 / arch-4** (wire do cache, execução única) → **PERF-5, PERF-6, ESC-3** (N+1) → **ESC-4** (cron→BullMQ) → **ESC-5** (load test baseline, rodar antes e depois).
- **OP-A5** (provar crons em prod) + **OP-A6** (Sentry alertas) + **ESC-6** (alerta rate-limit) + **OP-A8** (runbook incidentes).

**Eleva:** Performance (6,5→~8,6), Escalabilidade (7→~8,5), Operação (→~9,0).

### Onda 3 — Dívida Estrutural de Arquitetura e Frontend (P1)
**Objetivo:** decompor monolitos para destravar velocidade de time.
- **arch-1** (decompor routes.ts) → **arch-2** (asyncHandler/withTenantResource) → **arch-3** (registry).
- **arch-5** (storage factory + InMemoryStorage), **arch-6** (cold-start gate), **ACT-6/ACT-7** (paginação clamp, locking financeiro).
- **FE-3** (hooks→React Query) → **FE-4** (memoização) → **FE-6** (tipos/any) → **FE-5** (decompor 6 mega-arquivos, XL, um PR por arquivo) → **FE-7** (StrictMode) → **FE-8** (Suspense/retry).

**Eleva:** Arquitetura (6,5→~8,8), Frontend (7→~8,9), Backend (→~9,0).

### Onda 4 — UX e UI (P0-UX antes, depois polish)
**Objetivo:** UX e UI vêm DEPOIS porque dependem da estabilidade de dados/transações, mas os P0 de UX (falhas silenciosas) são rápidos e de alto valor de confiança.
- **U1 + U2** (falhas silenciosas + validação Zod, mesmo PR) → **U3, U4, U5** (validação property, gating, EmptyState).
- **UI-1** → **UI-2** (charts) → **UI-3 // UI-4** (dark mode E2E // StatusBadge) → **UI-5** (a11y/axe).
- **U6-U10** (resets, bulk, help, disclosure, filtros).

**Eleva:** UX (6→~8,5), UI (8→~9,0).

### Onda 5 — Guard-rails, Polish e caminho para 10 (P2/P3)
- **arch-7, arch-8** (drift dual-DB + teste de arquitetura no CI), **UI-6** (ESLint anti-hex), **FE-9** (providers de layout).
- **ESC-8, ESC-9, ESC-10** (circuit breaker, RLS concorrente, cleanup Redis).
- **DB-6, DB-7, DB-8, DB-9, DB-10** (email scope, RLS auth, FK, nullable, views), **DB-11, DB-12**.
- **A5-A10** (malware scan, DAST, IDS, CSP, retenção, SRI), **OP-A9 a OP-A15**, **U11, U12, UI-7, PERF-7 a PERF-10, ACT-8 a ACT-11**.

**Eleva:** todas as dimensões de ~8,8 para >=9,0 e cimenta sustentabilidade (impede regressão).

---

## 6. Quick Wins (30 dias) — Alto Impacto / Baixo Esforço

| ID | Dimensão | Ação | Esforço | Por que agora |
|---|---|---|---|---|
| DB-2 | Banco | Apply RLS inclui child tables | S | Sem isso, child policies são letra morta; destrava DB-3 |
| A2 / DB-1 | Seg/Banco | Confirmar/criar role não-owner sem BYPASSRLS | S/M | Sem isso, todo o RLS é "teatro" |
| U1 | UX | Eliminar `// silently continue` no onboarding | S | Bug de confiança mais grave; tira UX de 6 para ~7 sozinho |
| PERF-1 | Perf | `COUNT(*)` no dashboard (counters já existem) | S | 2-3s → 100-200ms, zero infra nova |
| PERF-2+3 | Perf | Cache-Control nos públicos + separar regra `vercel.json` | S | LCP da página pública 5,1s → ~300ms |
| ACT-6 | Backend | Clamp de paginação no storage | S | `?limit=999999` → <=100; defesa anti-OOM |
| A4 | Seg | Bloquear script-in-image (vira error) | S | Fecha web-shell em imagem sem ClamAV |
| ESC-6 | Escala | Alerta Sentry em downgrade de rate-limit | S | Torna regressão DDoS observável |
| PERF-8 | Perf | `useRef` + cleanup no prefetch hover | S | Mata leak de 5-10mb em listas |
| OP-A9 | Op | Health check com retry/backoff | S | Evita deploy verde com app não-pronto |
| FE-1+FE-2 | Front | switchTenant servidor + queryKeys por tenant | M | Vazamento multi-tenant demonstrável (segurança) |
| U2 | UX | Validação Zod inline reusando `form-schemas.ts` | M | Estabelece padrão para U3/U4 |

---

## 7. Matriz de Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| RLS aplicado mas runtime usa role owner/service_role (RLS vira no-op) | Média | Crítico | DB-1 + A2: auditar QUAL role cada conexão usa (jobs BullMQ, supabase-client, migrations); checagem bloqueante de `rolsuper`/`rolbypassrls` no go-live |
| Cache wired vaza dados entre tenants (key sem tenantId) | Média | Crítico | Key SEMPRE prefixada por `tenantId`; teste explícito de isolamento de cache; FE-2 escopa queryKeys |
| Dupla cobrança PIX/boleto sob reciclagem serverless | Alta (estado atual) | Crítico (receita/fraude) | ACT-3/ESC-2: idempotência durável Redis/Postgres com janela >=7d antes de qualquer scale-out |
| Decompor 6 mega-arquivos React quebra fluxos sutis (drag-drop kanban, calendário) | Alta | Alto | Suite de 745 testes após cada PR; um arquivo por PR; risco residual sem E2E (Playwright) |
| `SET LOCAL app.tenant_id` não cobre query fora de `runWithTenantRlsContext` (pooler transaction-mode) | Média | Alto | ACT-5 middleware no entry; validar modo do pooler Supabase (6543); guard/lint de RLS-context |
| Restore drill prova ponto-no-tempo, mas falha real em incidente regional | Baixa | Crítico | OP-A4 game-day; PITR como DR oficial; documentar RPO/RTO medidos |
| Latência cross-region us-east-1 ↔ gru1 mantém piso de p95 | Alta (atual) | Médio | OP-A12: mover Supabase para sa-east-1 ou read replica; medir p95 antes/depois |
| BullMQ workers sem runtime persistente (deploy 100% Vercel) | Média | Alto | ESC-4 exige worker (Railway/Docker); documentar no runbook; alerta de fila sem consumidor |
| Cobertura ~13% deixa regressão passar no CI | Alta | Médio | OP-A13: cobrir caminhos operacionais críticos; aceite formal de risco para o resto |
| ESLint `no-explicit-any` burlado com `// eslint-disable` | Média | Baixo | Disciplina de review; FE-6 em lotes por pasta |
| Recharts não herda CSS var em runtime/SSR (gradientes, Cell) | Média | Baixo | UI-2: conferência visual por chart em light e dark, não só substituição mecânica |

---

## 8. Estimativa de Esforço e Sequenciamento

Esforço relativo (S=1, M=2, L=3, XL=5):

| Onda | Foco | Ações principais | Esforço somado (aprox.) | Dimensões elevadas |
|---|---|---|---|---|
| **0** | Fundação dados/RLS | DB-1, DB-2, DB-3, DB-4/A3/OP-A2, ACT-1, OP-A1 | ~16 pts (L pesado) | Banco, Segurança, Backend(base) |
| **1** | Integridade transacional | ACT-2, ACT-3/ESC-2, ACT-4, ACT-5, FE-1, FE-2, DB-5, OP-A3, OP-A4, OP-A7 | ~26 pts | Backend, Frontend(seg), Operação, Banco |
| **2** | Perf/cache/escala | PERF-1/2/3, PERF-4/ESC-1/arch-4, PERF-5, PERF-6, ESC-3, ESC-4, ESC-5, OP-A5, OP-A6, OP-A8 | ~28 pts | Performance, Escalabilidade, Operação |
| **3** | Dívida estrutural | arch-1, arch-2, arch-3, arch-5, FE-3, FE-4, FE-5, FE-6, FE-7, FE-8 | ~34 pts (XL pesado) | Arquitetura, Frontend, Backend |
| **4** | UX/UI | U1-U5, UI-1, UI-2, UI-3, UI-4, UI-5 | ~22 pts | UX, UI |
| **5** | Guard-rails + polish + 10 | arch-7/8, UI-6/7, FE-9, ESC-8/9/10, DB-6..12, A5-A10, OP-A9..A15, U6..U12, PERF-7..10, ACT-8..11 | ~40 pts (muitos S/M) | Todas → >=9,0 sustentável |

**Ordem recomendada (regra inviolável):** 0 → 1 antes de qualquer outra coisa. Onda 2 pode iniciar em paralelo à Onda 1 nos itens que não tocam `storage.ts`/transações. Onda 3 (XL) é o trilho longo paralelo a partir do fim da Onda 1. Onda 4 (UX/UI) só após dados/transações estáveis — exceto **U1/U2** (quick win de confiança, podem entrar cedo). Onda 5 fecha o 9 e cimenta contra regressão.

**Pontos de coordenação obrigatórios (mesma execução, não duplicar):**
- Núcleo RLS: A1/A2/A3 + DB-1/2/3/4 + OP-A2 + ACT-5.
- Cache wire em `storage.ts`: arch-4 + ESC-1 + PERF-4.
- Idempotência durável: ACT-3 + ESC-2.
- PERF-2 + PERF-3 nunca separados (CDN não cacheia sem ambos).
- FE-1 + FE-2 juntos (isolamento de tenant no client).

---

## 9. Veredito Final

**Caminho crítico para 9+ em tudo:**

O ImobiBase **não tem um problema de funcionalidade — tem um problema de prova e de dívida estrutural.** A arquitetura de isolamento, idempotência e segurança está majoritariamente escrita; o que falta é (a) **ativá-la em produção sob o role correto**, (b) **prová-la com testes dinâmicos**, e (c) **tornar atômico o que hoje tem race**.

O caminho crítico, em ordem rígida:

1. **Onda 0+1 (dados/segurança/transações)** são **inegociáveis e precedem tudo.** Sem o role não-owner (DB-1/A2), o RLS aplicado é cosmético. Sem `withTenantTransaction` (ACT-1) + idempotência durável (ACT-3), há janela real de dupla cobrança e vazamento. Sem FE-1/FE-2, o client vaza dados de tenant. Esses itens sozinhos tiram Banco, Segurança, Backend e Operação do teto e levam a média de ~6,9 para ~8,2.
2. **Onda 2 (cache/perf)** ativa o trabalho já desenhado (cache morto, COUNT, CDN) — ganho desproporcional ao esforço (vários quick wins), elevando Performance e Escalabilidade.
3. **Onda 3 (arquitetura/frontend)** é o trilho XL que destrava velocidade de time; é o que separa "arrumamos uma vez" de "enterprise sustentável" — mas só faz sentido sobre uma base de dados estável.
4. **Onda 4 (UX/UI)** vem por último entre os P0/P1 porque depende de estabilidade — com a exceção de U1 (falhas silenciosas), que é quick win de confiança.
5. **Onda 5** cimenta tudo com guard-rails de CI (arch-8, UI-6, ESLint no-any, gate Lighthouse, gate RLS) — **sem esses guard-rails, todo o ganho regride no próximo trimestre de features.**

**O delta extra para 10:** as auditorias só projetam 10 explicitamente em Escalabilidade. Para levar TODAS a 10, além do 9: (a) **testes E2E Playwright** cobrindo os fluxos sutis que a suíte unitária não pega (drag-drop kanban, calendário, onboarding completo) — hoje o maior risco residual de regressão; (b) **circuit breaker no pool + teste RLS cross-tenant concorrente** (ESC-8/9); (c) **mover o Supabase para sa-east-1** eliminando o piso de p95 (OP-A12); (d) **paridade de validação server-side** com os mesmos schemas Zod do client (gap residual de UX); (e) **lint de RLS-context** que falhe se um handler tocar o pool fora de `runWithTenantRlsContext` — a única defesa real contra o "developer esquece o contexto", que nenhum item atual detecta automaticamente.

**Regra de ouro do programa:** P0 de dados e segurança vêm antes de qualquer UI/UX. Um pixel desalinhado custa credibilidade; um vazamento cross-tenant ou dupla cobrança custa o negócio.