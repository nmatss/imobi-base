# Plano de Revisão Completa — ImobiBase

**Data:** 2026-06-06
**Método:** Revisão multi-agente (12 analistas especializados auditando o código real + síntese cruzada de arquitetura)
**Cobertura:** Arquitetura, Banco de Dados (DBA), Multi-tenancy, Segurança (AppSec), LGPD, Portal Externo, UX/UI/A11y, Módulos CRM Core, Financeiro/Locação/Vendas, Integrações, Disponibilidade/DevOps, Qualidade/Testes/CI
**Resultado:** 130 achados — **28 P0 (crítico)**, 43 P1, ~59 P2/P3

> ⚠️ Este plano substitui os relatórios antigos `AGENTE_*` em `docs/reports/`. Vários deles declaram "feito" funcionalidades que **não conferem com o código atual** — toda priorização aqui foi validada contra o código em 2026-06.

---

## 1. Veredito executivo

**O ImobiBase NÃO está pronto para produção/escala.** Maturidade geral **~4/10**. A causa não são bugs isolados, e sim **dois defeitos-raiz sistêmicos** que contaminam quase todas as áreas, somados a uma rede de qualidade (CI) que não pega regressões:

1. **Schema DUAL dessincronizado.** O código de runtime importa de `@shared/schema-sqlite` (banco de DEV), mas produção usa `@shared/schema` (Postgres) via `server/db.ts:46-47`. Resultado: validação Zod, tipos, **compliance LGPD, Portal Externo e módulos inteiros rodam contra colunas/tabelas que não existem em produção** (`clientPortalAccess`, `propertyCoordinates` só no SQLite; `maintenanceTickets` em nenhum schema).
2. **Isolamento multi-tenant fail-open.** A checagem de tenant vive no handler (e foi esquecida em vários `GET :id`); `storage.ts` filtra só por `id`, sem `tenantId`, e **não há RLS no Postgres**. Confirmados **IDORs P0 de leitura financeira/contratual e de PII** (propostas, lançamentos, contratos, pagamentos, e-signature) entre imobiliárias diferentes.

Reforçando o risco: jobs/crons **nunca executam em serverless** (só fazem `queue.add`, sem worker), **backup é simulado**, webhooks de pagamento são **fail-open/forjáveis**, gate de `super_admin` está quebrado por incoerência de string, `/api/health` **nunca retorna 503** com o banco fora, e o **CI tem typecheck/testes vermelhos que não bloqueiam merge nem deploy**.

**Recomendação:** congelar qualquer divulgação de "pronto"; executar primeiro a **Onda 0 (gate de CI)** e a **Onda 1 (bloqueadores de produção + vazamento cross-tenant)** antes de qualquer feature nova.

---

## 2. Scorecard por área

| # | Área | Maturidade | P0 | Risco dominante |
|---|------|:---------:|:--:|-----------------|
| 1 | Segurança (AppSec) | 6/10 | — | Base sólida (CSP/CSRF/rate-limit), mas mass-assignment e webhooks fail-open |
| 2 | Multi-tenancy & Isolamento | 5/10 | 3 | IDOR cross-tenant em GET :id e e-signature |
| 3 | UX/UI/Layout/A11y | 5/10 | — | Design system robusto mas com 0 adoção; sem RHF; dark mode morto |
| 4 | Módulos CRM Core | 5/10 | 3 | Envelope paginado quebra telas; IDOR em sub-recursos de lead |
| 5 | Arquitetura & Backend | 4/10 | 2 | God objects (storage 3.7k linhas), schema dual vaza, `db: any` |
| 6 | DBA & Banco de Dados | 4/10 | 3 | `drizzle-kit push` ignora índices/constraints; sem RLS; migrations duplicadas |
| 7 | Financeiro/Locação/Vendas | 4/10 | 1 | Fontes de verdade desconectadas; adminFee sobre condo/IPTU; sem juros/multa |
| 8 | Integrações | 4/10 | 5 | Webhooks forjáveis; tenant errado no WhatsApp; credenciais globais |
| 9 | Disponibilidade & DevOps | 4/10 | 3 | Crons não rodam; backup simulado; health 200 com DB fora |
| 10 | LGPD & Compliance | 3/10 | 2 | Subsistema inteiro quebra em prod; ANPD/exclusão só TODO; PII em texto puro |
| 11 | Portal Externo | 3/10 | 1 | Tabelas só no SQLite → portal 500 em prod; SEO sem SSR |
| 12 | Qualidade & Testes & CI | 3/10 | 4 | tsc 142 erros, 98 testes falhando, gate ilusório, testes fake |

---

## 3. Riscos sistêmicos (transversais)

1. **Schema DUAL como falha-mãe.** Contamina Arquitetura, DBA, LGPD, Portal, Integrações e Módulos. Abandonar SQLite (Postgres local via Docker/pglite) **ou** gerar o SQLite a partir do PG colapsa a maioria dos P0.
2. **Isolamento multi-tenant fail-open por design.** A checagem precisa migrar do handler para a **camada de dados** (`tenantId` no WHERE) + **RLS no Supabase** para virar fail-closed.
3. **Serverless não respeitado.** Jobs com `setInterval`/BullMQ sem worker, backup em `/tmp`, race de cold start, pool dimensionado para servidor persistente.
4. **Webhooks e credenciais sem rigor.** Fail-open, assinatura sobre body re-serializado, comparação não constant-time, credenciais globais por env (não por tenant).
5. **Quality gate ilusório.** Typecheck/testes vermelhos não bloqueiam; testes de tenant usam mocks fake; cobertura real ≪ 70% declarado. Consertar o CI é **pré-condição** das demais ondas.
6. **"Modelado mas não operante".** Soft-delete, design system, react-hook-form, relatórios salvos, comissões, `finance_entries`, ROPA/DPA — infra existe mas não está no fluxo real. Os relatórios `AGENTE_*` superestimam a prontidão.

---

## 4. Top 10 prioridades

| # | Item | Sev |
|---|------|:---:|
| 1 | Reconciliar schema DUAL: `@shared/schema` (PG) como fonte única; portar `propertyCoordinates`, `clientPortalAccess`, `maintenanceTickets` e 8 tabelas de compliance | P0 |
| 2 | Fechar IDORs de leitura cross-tenant nos `GET :id` (sale-proposals, finance-entries, rental-contracts/payments, owners, renters, interactions, follow-ups, tags) | P0 |
| 3 | Fechar e-signature: persistir `tenantId` por `documentKey` e validar ownership em download/status/signers/audit | P0 |
| 4 | Defesa em profundidade no storage: `tenantId` obrigatório no WHERE de get-by-id/update/delete + RLS no Postgres | P0 |
| 5 | Corrigir webhooks de billing (MercadoPago fail-open; WhatsApp tenant errado/assinatura quebrada) | P0 |
| 6 | Jobs/crons executarem em serverless (inline ou worker persistente); remover backup simulado e stubs hardcoded | P0 |
| 7 | Tornar o CI um gate real: zerar 142 erros tsc, corrigir 98 testes, incluir test/e2e na condição de falha, gate pré-deploy | P0 |
| 8 | Reconciliar tabelas de compliance LGPD e implementar notificação ANPD (3 dias úteis) | P0 |
| 9 | Corrigir gate de `super_admin` (`super_admin` vs `superadmin`) centralizando roles num enum | P1 |
| 10 | `/api/health` → 503 com DB fora; ajustar pool serverless; remover entrypoints mortos | P1 |

---

## 5. Roadmap de execução (ondas)

### Onda 0 — Travar regressão (gate de CI) · pré-requisito · ~3-5 dias
> Tornar o CI um gate real **antes** de tocar em produção, para que as ondas seguintes não regridam silenciosamente.
- Zerar os 142 erros de `tsc` (priorizar os 112 de produção; mover `examples/*` para fora do build).
- Corrigir mock de Stripe (`vi.hoisted`) e estabilizar `svg-sanitizer`/`csrf` → suíte verde.
- Incluir `needs.test.result` e `needs.e2e.result` na condição de falha do summary (`ci.yml:327-329`); remover `|| echo "No tests found"`.
- Job pré-deploy (check+lint+test+build) bloqueando `deploy-production.yml`; branch protection com checks required.

### Onda 1 — Bloqueadores de produção + vazamento cross-tenant · crítico · ~2-3 semanas
> App funcionar em Postgres e parar de vazar dados entre tenants.
- Reconciliar schema DUAL: portar tabelas dev-only para `schema.ts`; trocar imports de `storage.ts:36` e `schemas/index.ts:26` para `@shared/schema`; migration + teste de paridade de colunas.
- Fechar IDORs `GET :id` replicando a validação que já existe nos PATCH/DELETE.
- Fechar e-signature (tenantId por documentKey).
- `tenantId` obrigatório no WHERE do storage (fail-closed) + Zod parcial nos PATCH bloqueando mass-assignment de `tenantId`/`id`/`createdAt`.
- Corrigir desempacotamento do envelope paginado no `ImobiProvider` (`imobi-context.tsx`) — hoje quebra Imóveis/Leads/Calendário/Dashboard.
- Smoke tests reais (tenant A vs B) contra Postgres efêmero no CI — substituir o `MockDatabase` fake.

### Onda 2 — Integridade de billing, webhooks e operações · crítico · ~2-3 semanas
> Pagamentos, jobs e DR confiáveis; webhooks à prova de forja.
- MercadoPago fail-closed (secret/headers obrigatórios, `timingSafeEqual`, idempotência por `data.id`, 500 em erro transitório).
- WhatsApp: HMAC sobre `rawBody` com app secret, guard de length, tenant via `phone_number_id` mapeado (não `entry[0].id`); Twilio `validateRequest` + tenantId no `smsLog`; ISA tenant por credencial.
- Crons executarem inline (ou worker persistente) em vez de só `queue.add`; substituir stubs hardcoded por dados reais.
- Backup real (`pg_dump` → bucket via runner persistente, ou validar/documentar PITR Supabase como DR oficial); remover caminho "simulado"; documentar RTO/RPO.
- Reconciliar billing: criar `commission` ao registrar venda; gravar `finance_entries` para aluguel/repasse/comissão (livro-caixa único); `adminFee` só sobre `rentValue`; multa/juros em atraso.

### Onda 3 — Compliance LGPD + hardening de segurança · alto · ~2 semanas
- Validar fluxo de consentimento/auditoria/exclusão contra Postgres em CI (depende da Onda 1).
- Notificação ANPD (3 dias úteis), e-mail de confirmação de exclusão + endpoint que consome o token.
- Criptografia de coluna (CPF/CNPJ, RG, `bankAccount`, `pixKey`) + mascaramento por padrão em UI/logs.
- Centralizar roles em enum (corrige `super_admin`/`superadmin`); montar `CookieConsent` no `App`; popular ROPA e arquivar DPAs.
- Health 503 em DB-down; pool serverless (max 1-3, min 0, `allowExitOnIdle`); unificar pool de sessão; `appReadyPromise` no `api-handler`; mover `index-with-jobs.ts`/Docker/nginx para `docs/legacy`.

### Onda 4 — Escala, UX, dívida e SEO · médio · contínuo
- Habilitar **RLS** nas tabelas com `tenant_id` (rede de segurança definitiva); particionar `storage.ts` (238 métodos) em repositórios por domínio.
- Adotar `PageHeader`/`EmptyState` + `react-hook-form` nas páginas de maior volume; unificar tokens do design system (uma fonte de verdade); decidir destino do dark mode.
- Portal: reset de senha self-service, download de contrato assinado (ClickSign), boleto/PIX dinâmico com conciliação (parar de expor dados bancários do owner); white-label completo (`brandSettings`).
- SEO público: SSR/prerender + JSON-LD `RealEstateListing` + sitemap dinâmico por tenant.
- Decidir destino do soft-delete; rate limit de IA por tenant + timeout + migrar modelo deprecado (`claude-sonnet-4-20250514` → `claude-sonnet-4-6`); fila WhatsApp via Template API/BullMQ com claim atômico; thresholds de cobertura honestos e crescentes.

---

## 6. Achados detalhados por área

### 6.1 Arquitetura & Backend — 4/10
**Pontos fortes:** modularização por `register*Routes`; helper anti-IDOR `withTenantResource`; hierarquia de erros `AppError`/`asyncHandler`; validação via `drizzle-zod`.
- **[P0]** Validação Zod e tipos derivam do schema SQLite (dev), não do Postgres (`storage.ts:36`, `schemas/index.ts:26`). Validação de payloads em produção usa regras de dev.
- **[P0]** Isolamento depende de disciplina manual; `storage` não oferece rede de segurança por tenant (update/delete por `id` apenas).
- **[P1]** Soft-delete modelado (18 tabelas com `deletedAt`) mas com 0 uso real; deletes físicos; `deleteProperty` retorna `true` mesmo sem apagar.
- **[P1]** Triplicação de bootstrap (`index.ts`, `index-with-jobs.ts` morto, `api-handler.ts`) com drift de CORS/logging.
- **[P1]** Handler serverless exportado antes do registro assíncrono das rotas (race de cold start) + vaza stack trace ao cliente.
- **[P1]** Camada de dados sem tipagem: `db: any`, 131 `as any` em `storage.ts`, 16 entidades como `any` — anula o `strict: true`.

### 6.2 DBA & Banco de Dados — 4/10
**Pontos fortes:** `tenantId` consistente; `decimal` para dinheiro; UNIQUE em tabelas 1-1; `add-performance-indexes.sql` bem desenhado (precisa ser aplicado).
- **[P0]** Deploy usa `drizzle-kit push` e **ignora todas as migrations SQL** (índices, constraints, cascades não chegam à produção → Seq Scan, sem CHECKs).
- **[P0]** Conjuntos de migrations duplicados/conflitantes (`001-004` vs `20241225_*`) ambos executados pelo runner.
- **[P0]** Sem RLS no banco — isolamento 100% na aplicação.
- **[P1]** Pool (max 20, `allowExitOnIdle:false`) sobre pooler Supabase transaction-mode + serverless → "too many connections".
- **[P1]** Soft-delete pela metade; drift schema.ts (47) vs schema-sqlite.ts (55 tabelas).
- **[P1]** `add-performance-indexes.sql` sem `CONCURRENTLY` e dentro de transação; índice parcial com `CURRENT_DATE` (não-imutável) falha.
- **[P1]** FKs sem `onDelete` no schema (cascades só no SQL não aplicado).

### 6.3 Multi-tenancy & Isolamento — 5/10
**Pontos fortes:** helpers `validateResourceTenant`/`withTenantResource` (404 não 403); portal escopa por `clientId`; módulo de arquivos valida `tenantId`; webhooks Stripe resolvem tenant por `customer.metadata`.
- **[P0]** Módulo de e-signature inteiro sem validação de tenant — download/status/audit de contratos cross-tenant (`routes-esignature.ts:265`).
- **[P0]** `GET /api/sale-proposals/:id` e `GET /api/finance-entries/:id` sem checagem de tenant.
- **[P0]** `GET /api/rental-contracts/:id` e `GET /api/rental-payments/:id` sem checagem de tenant.
- **[P1]** Rotas filhas por `parentId` (interactions, tags, follow-ups, payments-by-contract) sem validar tenant do pai; `interactions` nem tem coluna `tenantId`.
- **[P1]** `storage.ts` sem rede de segurança por tenant (fail-open por design).
- **[P2]** `routes-sms.ts` com `requireAuth`/`requireAdmin` stub (no-op) — armadilha em código desabilitado.
- **[P2]** Testes de isolamento documentados (`QA_DELIVERABLE_5`) nunca foram implementados (`tests/fixtures/` não existe).

### 6.4 Segurança (AppSec) — 6/10
**Pontos fortes:** CSP por nonce, HSTS, CSRF double-submit com `timingSafeEqual`, Stripe webhook sobre `rawBody` + idempotência Redis, upload por magic bytes, admin-bootstrap bem trancado, fail-fast de `SESSION_SECRET`.
- **[P1]** Mass-assignment nos PATCH: `req.body` cru chega ao UPDATE sem whitelist nem `tenantId` no WHERE → permite realocar recurso para outro tenant.
- **[P1]** Assinatura MercadoPago bypassável e fail-open (`return true` sem secret).
- **[P1]** WhatsApp assina `JSON.stringify(req.body)` (não bytes crus) → webhooks legítimos falham; tenant derivado do payload.
- **[P1]** Incoerência `super_admin` (bootstrap) vs `superadmin` (gate) → super admin criado não acessa rotas admin.
- **[P2]** Account-lockout implementado mas **não conectado** ao login (código morto); `requirePermission` falha aberto sem `roleId`.
- **[P2]** Validação de segredos não bloqueia o boot na Vercel; `.env.production*.local` com segredos reais em disco (gitignored, mas presentes — rotacionar service key).
- **[P3]** CORS aponta `imobibase.com` (domínio real é `.com.br`).

### 6.5 LGPD & Compliance — 3/10
**Pontos fortes:** subsistema conceitualmente completo (consent/export/deletion/anonymizer/dpo-tools); `anonymizer` trata CPF/CNPJ/RG/PIX; banner de cookies.
- **[P0]** Subsistema inteiro **quebra em produção**: código escrito contra schema SQLite, colunas diferentes no Postgres → consentimento/exportação/exclusão/auditoria lançam erro de coluna inexistente. **Direitos do titular (Art. 18) inoperantes.**
- **[P0]** `cookiePreferences`/`dataProcessingActivities`: nomes de coluna divergentes; endpoint público de cookie-consent falha em prod.
- **[P1]** CPF/CNPJ, RG, conta bancária, PIX em **texto puro** (sem criptografia em repouso).
- **[P1]** Notificação ANPD é só TODO; texto cita "72h" (GDPR) em vez de 3 dias úteis (LGPD).
- **[P1]** Trilha de auditoria não imutável e falha silenciosamente (swallow de erro) — pode estar 100% vazia em prod.
- **[P2]** Endpoints públicos de compliance sem rate limit; exclusão depende de e-mail que nunca é enviado; bases legais hardcoded; anonimização cruza por e-mail sem `tenantId`.
- **[P2]** Sem DPAs com operadores; transferência internacional não documentada.

### 6.6 Portal Externo — 3/10
**Pontos fortes:** auth própria (JWT httpOnly separado da app interna), rate limit, anti-enumeração; `requirePortalType`; validações de ownership por recurso; admin valida tenant.
- **[P0]** Tabelas `clientPortalAccess` e `maintenanceTickets` só existem no SQLite → **portal retorna 500 em produção** (`storage as any` resolve `undefined`).
- **[P1]** Login busca acesso por e-mail **globalmente** sem tenant nem unicidade → risco de logar cliente na imobiliária errada.
- **[P1]** Handlers do portal não revalidam `tenantId` do JWT contra o tenant do dado.
- **[P1]** Reset de senha não implementado ponta-a-ponta (token gerado, sem endpoint nem e-mail).
- **[P1]** Site público é SPA sem SSR; SEO de imóveis depende de JS; sem JSON-LD.
- **[P2]** Sitemap estático sem imóveis/imobiliárias; white-label mínimo (só `primaryColor`); boleto/2ª-via são placeholders.
- **[P3]** Código morto `ClientPortal.tsx` (30KB) não importado.

### 6.7 UX/UI/Layout/A11y — 5/10
**Pontos fortes:** design system robusto (tokens WCAG AA, 8pt, focus rings, reduced-motion); `dashboard-layout.tsx` maduro (skip link, breadcrumb, Ctrl+K, 44px touch); `button.tsx` bem arquitetado.
- **[P1]** `PageHeader`/`EmptyState` com **0 adoção** em páginas — cada página reinventa header/empty state.
- **[P1]** **Nenhuma página usa react-hook-form**; validação manual via `useState`, sem erro inline/aria-invalid/focus-on-error (falha WCAG 3.3.1).
- **[P2]** `confirm()`/`alert()` nativos em produção (avm, inspections, compliance); cores hardcoded em massa contornam tokens AA; duas fontes de verdade de cor (tailwind.config vs index.css); dark mode implementado mas sem toggle (código morto).
- **[P2]** Maioria dos botões-ícone sem `aria-label` (falha WCAG 4.1.2).
- **[P3]** `reduced-motion` aplica `transform:none !important` global (quebra posicionamento Radix); Settings com 15 abas e duplicatas; arquivos `-new`/`-improved`/`.backup` órfãos.

### 6.8 Módulos CRM Core — 5/10
**Pontos fortes:** IDOR bem tratado em properties/leads/contracts/visits; relatórios escopados por tenant; Kanban consistente com o funil.
- **[P0]** `ImobiProvider` não desempacota envelope paginado `{success,data,meta}` → `properties.filter is not a function`, quebra Imóveis/Leads/Calendário/Dashboard.
- **[P0]** Vazamento cross-tenant em interações de lead (sem filtro de tenant; `interactions` sem coluna `tenantId`).
- **[P0]** Vazamento em follow-ups e tag-links por `leadId`/`id`.
- **[P1]** `GET :id` de rental-contracts/owners/renters sem validação de tenant.
- **[P1]** Relatórios Salvos 100% mock no front (endpoints reais ficam órfãos).
- **[P2]** Export PDF é stub; "Excel" gera CSV; sem detecção de conflito de horário em visitas; POST visits/contracts não valida tenant de `propertyId`/`leadId`.
- **[P3]** Ações "Editar/Email" órfãs no card do Kanban; status de contrato/lead sem enum.

### 6.9 Financeiro/Locação/Vendas/Comissões — 4/10
**Pontos fortes:** PATCH/DELETE validam tenant; `decimal(12,2)`; `generateTransfersForMonth` idempotente; billing SaaS com proteção IDOR/idempotency.
- **[P0]** IDOR nos `GET :id` de contratos, pagamentos, propostas, vendas e lançamentos.
- **[P1]** Venda não cria comissão — venda e comissão são fontes de verdade desconectadas.
- **[P1]** Receita operacional (aluguéis/vendas/repasses/comissões) nunca é lançada em `finance_entries` → tela `/financeiro` e overview mostram saldos divergentes.
- **[P1]** Sem cálculo de juros/multa para aluguel em atraso (nem coluna nem lógica).
- **[P1]** Taxa de administração incide sobre condomínio e IPTU (deveria ser só `rentValue`).
- **[P2]** `periodVariation` compara fórmulas diferentes; valores financeiros aceitos do cliente sem revalidação no servidor; proposta não vinculada à venda; PIX/Boleto aceitam `amount` arbitrário.
- **[P3]** Wizard de venda descarta desconto/parcelas/entrada.

### 6.10 Integrações — 4/10
**Pontos fortes:** Stripe webhook é referência; ClickSign com fail-fast + anti-replay; Email com BullMQ real; WhatsApp com retry/SSRF guard; IA opcional com fallback.
- **[P0]** WhatsApp webhook atribui mensagens/leads ao **tenant errado** (`entry[0].id` = WABA id, não tenantId; fallback `"default"`).
- **[P0]** Assinatura WhatsApp quebrada (`JSON.stringify` do body parseado).
- **[P0]** MercadoPago fail-open/bypassável.
- **[P0]** Webhooks Twilio sem nenhuma validação de assinatura; `smsLogs` inbound sem `tenantId`.
- **[P0]** Credenciais de integração **globais por env** (singletons) — `integration_configs` é storage morto; todos os tenants compartilham a mesma conta WhatsApp/Twilio/Maps.
- **[P1]** Fila WhatsApp via `setInterval` em processo (não roda em serverless; race condition); templates enviados como texto simples (não Template API); ISA aceita `tenantId` do body; rate limit de IA global (não por tenant) + sem timeout; MercadoPago sem idempotência + `payment_method_id: 'visa'` hardcoded.
- **[P2]** ClickSign HMAC sobre `JSON.stringify`; webhooks sem idempotência (mensagens/leads duplicados); `handleCheckoutSessionCompleted` sobrescreve metadata.

### 6.11 Disponibilidade & DevOps — 4/10
**Pontos fortes:** entrypoint serverless desacoplado; crons com `CRON_SECRET`; health check rico; sessão em Postgres; Sentry com `beforeSend`; segredos não versionados; runbook presente.
- **[P0]** Crons da Vercel enfileiram jobs BullMQ que **nunca são processados** (`initializeJobs` nunca chamado em `api-handler.ts`) → cleanup/lembretes/relatórios/sync acumulam no Redis.
- **[P0]** Jobs agendados usam **dados hardcoded** de stub (`contractId 1,2,3`; `admin@imobibase.com`).
- **[P0]** Backup de banco é **simulado** (upload S3 comentado; `pg_dump` em `/tmp` efêmero).
- **[P1]** Pool grande por instância pode esgotar o pooler do Supabase; `/api/health` retorna 200 com DB fora (503 nunca atribuído); race de cold start no registro de rotas; artefatos Docker/nginx/index-with-jobs conflitantes.
- **[P2]** Divergência `vercel.json` × `routes-cron.ts` (`cleanup-soft-deletes` nunca disparado; plano Hobby limita 2 crons/dia); Redis eager em todo cold start; observabilidade incompleta (sem alerta de fila/cron).
- **[P3]** `SESSION_SECRET` parcialmente logado; segundo pool de sessão sem limites.

### 6.12 Qualidade & Testes & CI — 3/10
**Pontos fortes:** pirâmide nominalmente completa; jobs de CI bem conceituados; `security-scan.yml` (CodeQL/audit); Lighthouse com budgets; Playwright multi-browser.
- **[P0]** Typecheck do CI quebrado: `tsc` falha com **142 erros** (112 em produção).
- **[P0]** Suíte vermelha: **16 arquivos / 98 testes falhando** (quase toda a suíte Stripe).
- **[P0]** Jobs `test`/`e2e` **não bloqueiam o merge** (não entram na condição de exit do summary).
- **[P0]** Testes de SQL-injection/multi-tenant validam `MockDatabase` fake, não o código real → risco #1 com cobertura **zero**.
- **[P1]** Deploy de produção não roda testes/typecheck antes de publicar; integration/smoke dependem de servidor externo não iniciado; threshold de 70% nunca aplicado.
- **[P2]** E2E financeiros passam "verde" com `if(isVisible)`; `pre-commit` desabilitou o type-check.
- **[P3]** Três configs de Lighthouse divergentes; build não roda typecheck.

---

## 7. Como esta revisão foi feita

12 subagentes especializados auditaram o código real em paralelo (leitura de arquivos + grep, com evidência `arquivo:linha` exigida em cada achado), seguidos de um agente Tech Lead que cruzou os resultados para identificar riscos sistêmicos e sequenciar as ondas. Severidade: **P0** (crítico/risco de produção ou vazamento entre tenants) → **P3** (melhoria).

**Estatísticas:** 12 áreas · 130 achados · 28 P0 · 43 P1 · maturidade geral 4/10.

> Próximo passo sugerido: aprovar a **Onda 0 + Onda 1** como escopo imediato. A partir daí cada item P0/P1 deste documento pode virar issue/PR rastreável.
