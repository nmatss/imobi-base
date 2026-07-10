# Revisão Completa Go-Live — ImobiBase

**Data:** 2026-06-21
**Branch auditada:** `fix/csrf-hardening`
**Método:** 6 times de auditoria em paralelo (Segurança/Multi-tenancy, Backend/API/Integrações, Banco/Migrations, Frontend/SEO/Perf, Qualidade/Testes/CI, Infra/Deploy/Observabilidade/LGPD) + verificação manual dos P0 mais graves.

---

## Veredito

**NÃO liberar como Go-Live enterprise ainda.** O gate estático (`ops:go-live:verify:static`) passa (13/13), o typecheck está limpo, 745 testes unit verdes e o build sai sem warnings. Porém há **bugs reais de código** (não só pendências de ambiente) que causam falha em produção, além das pendências de ambiente/ops já conhecidas.

Para um **MVP controlado / soft launch** (poucos tenants, sob acompanhamento), é viável após corrigir os P0 de código abaixo + configurar os secrets obrigatórios.

---

## P0 — Bloqueantes reais (corrigir antes de qualquer tráfego)

### Código (corrigíveis agora, sem ambiente real)

| # | Área | Problema | Evidência |
|---|------|----------|-----------|
| P0-1 | Banco | **4 tabelas usadas em runtime não têm migration Postgres**: `interactions`, `lead_tag_links`, `user_permissions`, `property_coordinates`. Só existem no schema Drizzle e na init SQLite. Se staging/prod for recriado via `db:migrate`, essas tabelas não existem → erro em lead scoring, CRM, permissões. **Confirmado: nenhuma `migrations/*.sql` as cria.** | `shared/schema.ts:110,429`; grep migrations/ |
| P0-2 | Serverless | **`registerOnboardingRoutes` falta no `api-handler.ts`** (Vercel). Está só no `server/index.ts` (dev). `POST/DELETE /api/onboarding/demo-data` retornam 404 em produção. | `server/index.ts:139` vs `server/api-handler.ts` |
| P0-3 | Backend | **2FA-SMS quebrado em runtime**: `const verificationCodes: any = null`. Qualquer `db.insert/select(verificationCodes)` lança. Feature de 2FA por SMS não-funcional (estoura 500). | `server/integrations/sms/twofa.ts:10-11` |
| P0-4 | Backend | **Backup cron falha sempre na Vercel**: `pg_dump` não existe no container serverless e `BACKUP_OPTIONAL`/`SUPABASE_PITR_ENABLED` default `false`. Cron diário gera erro/500 todo dia e deixa zero backup durável se não optar por PITR. | `server/jobs/backup-processor.ts:121`; `vercel.json`; `.env.example:210-211` |
| P0-5 | Dependências | **`nodemailer <=9.0.0` HIGH** (arbitrary file read + SSRF via opção `raw`) + `dompurify` MODERATE. Fix disponível via `npm audit fix`. Vai falhar o gate `security-scan.yml` (`--audit-level=high`) na `main`. | `npm audit` GHSA-p6gq-j5cr-w38f |
| P0-6 | LGPD | **Export/exclusão de dados (Art.18) escrevem em `/tmp` efêmero** do serverless. Link de download de 7 dias retorna 404 no próximo cold start. Não há fallback durável (Supabase Storage + signed URL). Gap de conformidade LGPD com dados reais. | `server/compliance/data-export.ts:21-27,357-398`; `data-deletion.ts:56-69` |
| P0-7 | Secrets | **`PORTAL_JWT_SECRET` ausente derruba o boot** (portal comprador/locatário — feature P1). `routes-portal.ts:18` lança se faltar. Não está listado como obrigatório no `setup-production.sh`. | `server/routes-portal.ts:18`; `.env.example:273` |

### Ambiente/Ops (ação do dono — gate `strict` já bloqueia)

| # | Item |
|---|------|
| P0-8 | **RLS não aplicado/validado em prod real.** Artefatos existem (`RLS_enable.sql`), mas isolamento multi-tenant continua não-provado. Rodar apply controlado + `db:rls:verify` com role não-owner e sem `BYPASSRLS`. |
| P0-9 | **Cobertura de RLS incompleta no próprio SQL**: ~18 tabelas do schema fora do `RLS_enable.sql`, incluindo sensíveis — `two_factor_auth`, `login_history`, `digital_signatures`, `contract_documents`, `buyer_selection_items` (filhas sem `tenant_id` ficam sem policy). Ao ligar RLS, esses dados ficam acessíveis cross-tenant. |
| P0-10 | **Gate `ops:go-live:verify:strict` reprovou** (18/06: 11 falhas — URL canônica, chaves Stripe/WhatsApp live, estratégia de backup, auth de banco, RLS runtime, evidência de restore drill/pentest). |

---

## P1 — Antes de contrato enterprise / escala

| # | Área | Problema | Evidência |
|---|------|----------|-----------|
| P1-1 | Migrations | **Séries duplicadas** `001_*` + `20241225_001_*` criam constraints sobrepostas em `properties`/`leads`. Em DB novo, ambas rodam. `db:migrate` cego roda TUDO (inclusive `RLS_enable.sql`). Canonicalizar uma série. | `migrations/001_*`, `20241225_001_*` |
| P1-2 | Migrations | **`add-performance-indexes.sql` = 84 índices sem `CONCURRENTLY` em transação** → `AccessExclusiveLock` em cada tabela = downtime se rodado em DB com dados. Aplicar via `psql -f` off-peak, nunca via `db:migrate`. | `script/migrate.ts:113`; `migrations/add-performance-indexes.sql` |
| P1-3 | Migrations | **`20260620_005` (dedup) falha se houver leads duplicados** (phone/email no mesmo tenant). Sem script de pré-limpeza → migration aborta e índice não aplica. | `migrations/20260620_005_leads_dedup_indexes.sql:7,12` |
| P1-4 | Billing | **Sem handler de `charge.refunded` do Stripe.** Reembolso não rebaixa/revoga acesso — cliente reembolsa e mantém acesso total. | `server/payments/stripe-webhooks.ts` (sem case) |
| P1-5 | Backend | **Erros vazam `error.message` cru** (Stripe/DB) sem gate `NODE_ENV` em `routes-payments.ts` (autenticado) e `/api/leads/public` (não autenticado). | `server/routes-payments.ts:91,303,...`; `routes.ts:1984` |
| P1-6 | Backend | **DoS por listagem sem `limit`**: `GET /api/ai/actions` e `getAllTenants()` (usado em crons) sem paginação. Cron `enforce-plan-limits` pode estourar 60s na Vercel ao escalar. | `routes-ai-actions.ts:82`; `storage.ts:610`; `scheduled-jobs.ts:338` |
| P1-7 | Segurança | **OAuth state em `Map()` in-memory** (Google/Microsoft) → quebra em multi-instância serverless (state escrito num lambda some no callback de outro). Migrar para Redis/cookie assinado. | `server/auth/oauth-google.ts:50`; `oauth-microsoft.ts:52` |
| P1-8 | Segurança | **`POST /api/signatures/token/:token/sign` público, sem rate limit.** Enumeração/flood de tokens. | `server/routes-features.ts:905` |
| P1-9 | Segurança | **WhatsApp `baseUrl` vem de config do tenant no DB** → SSRF se apontar p/ infra interna (169.254.169.254). Validar via `fetchExternalUrl` ou hard-code `graph.facebook.com`. | `server/integrations/whatsapp/business-api.ts:154` |
| P1-10 | Segurança | **Secret-manager não dá hard-stop na Vercel** para `SESSION_SECRET` fraco/ausente — só loga e segue. App sobe com secret fraco. | `server/security/secret-manager.ts:151-158` |
| P1-11 | Infra | **CORS_ORIGINS default no `.env.example` inclui `localhost`** e o gate strict NÃO valida CORS. Operador que copia o exemplo libera localhost em prod. | `.env.example:264`; `verify-go-live-readiness.ts` |
| P1-12 | Infra | **Sem HSTS e CSP nos headers de edge do `vercel.json`** — assets estáticos servidos pela CDN não passam pelo Helmet. | `vercel.json:30-74`; `routes.ts:563` |
| P1-13 | Infra | **Rate limit fail-open + in-memory sem Redis** (`passOnStoreError: true`). Sem `REDIS_URL` brute-force é por-instância. `REDIS_URL` sem gate obrigatório. | `server/routes.ts:636-698` |
| P1-14 | Observ. | **Sentry sem gate** — sem `SENTRY_DSN` erros viram só `console.error`. Sem rastreio em prod. | `server/monitoring/sentry.ts:38-42` |
| P1-15 | SEO | **Vitrines de tenant `/e/:slug` 100% client-side** — Googlebot vê `<div id=root>` vazio. Prerender estático cobre só marketing. Core SEO do produto invisível. | `script/generate-static-public-html.ts`; `App.tsx:344` |
| P1-16 | Qualidade | **Cobertura ~12%** (gate enterprise 80%) e **thresholds do vitest em 2-5%** (ratchet inútil — regressão para 6% passa). **5.545 warnings de lint.** | `coverage/coverage-summary.json`; `vitest.config.ts` |
| P1-17 | Qualidade | **10 de 11 suites E2E em quarentena** (auth, leads, financeiro, properties, rentals, sales, calendar, mobile, search, settings). Só smoke roda no CI. Billing/multi-tenant sem E2E. | `playwright.config.ts`; `tests/e2e/QUARANTINE.md` |

---

## P2 — Primeira sprint pós-launch

- Performance: posthog-js + react-ga4 importados eager no `main.tsx` (inflam bundle inicial p/ todo visitante); chunks grandes (`vendor-charts`, `jspdf`, `html2canvas`). Lighthouse 74 / LCP ~5.1s.
- Código morto: 9 arquivos `examples/` + `hooks/useLeads-improved.ts` + `pages/vendas/ExampleIntegration.tsx` no grafo de build; `console.log` não-gated (`useLeads-improved.ts:210`, `cache-manager.ts:380`).
- i18n: `chart.tsx:246` e `calendar.tsx:40` usam locale `default` (não `pt-BR`).
- IDOR menor: `PATCH /api/rental-payments/:id` retorna 403 (vaza existência) em vez de 404. `interactions` isola só por `lead_id` (sem `tenant_id`).
- Twilio webhooks (status/incoming) comentados nos dois entrypoints — callbacks de SMS descartados.
- Uploads via `memoryStorage` (risco DoS) — migrar p/ streaming/signed upload.
- Certificate storage X.509 sem validação ICP-Brasil (cadeia/CRL/OCSP) — não prometer "assinatura qualificada".
- Sem WAF/edge DDoS; uptime monitoring só documentado, não provisionado.
- DB em `us-east-1` vs Vercel `gru1` (~180ms latência por chamada).
- Região/dark-mode: confirmar intenção — dark mode parece **wired opt-in** (conflito com memória que diz "não ligado").

---

## Plano de ação ordenado

### Onda A — Fixes de código P0/P1 (PR nesta branch, sem ambiente)
1. Criar migrations PG para `interactions`, `lead_tag_links`, `user_permissions`, `property_coordinates` (P0-1).
2. Registrar `registerOnboardingRoutes` no `api-handler.ts` (P0-2).
3. Corrigir/desabilitar 2FA-SMS (tabela `verification_codes` ou guard) (P0-3).
4. Backup cron: flag PITR ou desabilitar cron até upload durável (P0-4).
5. `npm audit fix` (nodemailer/dompurify) + reteste (P0-5).
6. LGPD export/delete → Supabase Storage + signed URL (P0-6).
7. `PORTAL_JWT_SECRET` no setup/gate + doc (P0-7).
8. Handler `charge.refunded` (P1-4); gate de `error.message` por NODE_ENV (P1-5); `limit` em ai/actions e chunk em crons (P1-6).
9. OAuth state em Redis (P1-7); rate limit no sign público (P1-8); SSRF WhatsApp baseUrl (P1-9); hard-stop secret-manager (P1-10).
10. HSTS+CSP no `vercel.json`; check de CORS_ORIGINS no gate strict (P1-11/12).
11. Completar `RLS_enable.sql` com as ~18 tabelas faltantes + estratégia p/ filhas sem tenant_id (P0-9).

### Onda B — Ambiente real (ação do dono + execução guiada)
- Configurar secrets obrigatórios (lista no relatório dos times / checklist abaixo).
- Aplicar migrations P1 na ordem: 001→004, pré-limpeza de leads, 005, índices via `psql`, novas tabelas, depois `RLS_enable`.
- `db:rls:verify` com role não-owner; `ops:restore:drill`; `security:pentest` contra staging.
- `ops:go-live:verify:strict` verde.

### Onda C — Qualidade/escala (pós-soft-launch)
- Subir cobertura e apertar thresholds do vitest; tirar E2E da quarentena (ao menos auth+billing+multi-tenant).
- Reduzir lint warnings por área; bundle/LCP; SEO SSR das vitrines de tenant.

---

## Secrets obrigatórios para prod (resumo)
`DATABASE_URL`, `SUPABASE_URL/ANON_KEY/SERVICE_KEY`, `SESSION_SECRET` (32+), `CRON_SECRET`, `PORTAL_JWT_SECRET`, `REDIS_URL`, email (`SENDGRID`/`RESEND`), pagamento (`STRIPE_*` live ou `MERCADOPAGO_*`), `CORS_ORIGINS` (só domínios de prod), `SENTRY_DSN`+`VITE_SENTRY_DSN`, e estratégia de backup (`SUPABASE_PITR_ENABLED=true`+`BACKUP_OPTIONAL=true` **ou** `BACKUP_UPLOAD_URL_TEMPLATE`).

---

## O que JÁ está bom (não regredir)
- Gate estático Go-Live 13/13; cron manifest alinhado (12 jobs); typecheck limpo; 745 testes unit verdes; build sem warnings.
- Interceptor CSRF global wired no boot; CORS centralizado; lock distribuído de cron via Redis; ledger persistente de webhooks (Stripe/MP/ClickSign/WhatsApp) — falta só provar em prod.
- Nenhum secret real commitado (apenas `.env.example`). `.gitignore` cobre `.env*`.
