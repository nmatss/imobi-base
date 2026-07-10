---
title: Revisao Go-Live Completa - ImobiBase
data: 2026-06-30
status: NO-GO enterprise
escopo: auditoria completa 360 conforme docs/prompts/PROMPT_MASTER_AUDITORIA.md
validacoes_locais: check, lint quiet, ops:cron:verify, ops:go-live:verify:static, test:unit
---

# Resumo Executivo

O ImobiBase esta em um estado **forte para produto SaaS em maturacao**, com stack moderna, muitos modulos implementados, documentacao extensa, hardening de seguranca relevante e gates operacionais ja desenhados. O sistema, porem, ainda esta **NO-GO para go-live enterprise** em 2026-06-30.

A diferenca entre "quase pronto" e "enterprise ready" hoje nao e volume de feature. O bloqueio principal e **prova operacional em ambiente real**: RLS aplicado e validado com role runtime nao-owner, Redis TLS ativo, backup/PITR e restore drill evidenciados, pentest executado, migrations recentes aplicadas, Google OAuth/Calendar configurado no projeto correto e `npm run ops:go-live:verify:strict` verde contra staging/producao.

Desde a revisao de 2026-06-29, o codigo local ja enderecou parte dos P0 tecnicos: `script/verify-rls.ts` cobre `RLS_enable_child_tables.sql`, assinatura publica por token ganhou policy/contexto RLS, Microsoft OAuth passou a criptografar novos tokens, foi criado script de migracao de tokens Microsoft legados e o gate passou a exigir Redis TLS. Essas correcoes ainda precisam ser provadas fora do ambiente local.

Veredito: **NO-GO enterprise; GO apenas para ambiente controlado/staging apos fechar pendencias owner-gated e anexar evidencias.**

# Fase 1 - Entendimento do Produto

Produto: SaaS imobiliario multi-tenant para imobiliarias/corretores, centralizando CRM, leads, imoveis, agenda, contratos, locacoes, vendas, financeiro, sites publicos, portais, IA, analytics e integracoes.

Evidencias:

- `README.md` define "CRM imobiliario multi-tenant SaaS" e lista modulos operacionais.
- `docs/PROJECT_MEMORY.md` posiciona o diferencial como o sistema que nao perde visitas, conectando captacao, qualificacao, sugestao de imovel, agendamento, visita, feedback e proxima acao.
- `docs/PLANS.md` documenta tiers e feature flags por tenant.

Usuarios/personas:

- Dono/gestor da imobiliaria.
- Corretor/agente.
- Admin/superadmin.
- Proprietario.
- Inquilino.
- Lead/comprador.
- Visitante publico de paginas SEO/tenant.

Lacuna: falta um documento de produto com ICP, personas, jobs-to-be-done, criterios de ativacao, metricas de sucesso e escopo MVP vs Enterprise.

# Fase 2 - Inventario Completo

Stack e dependencias:

- Frontend: React 19, TypeScript, Vite, Wouter, TanStack Query, Tailwind/shadcn, Radix, Recharts, Leaflet, PWA.
- Backend: Node.js, Express 5, Passport, Drizzle, BullMQ, jobs HTTP via Vercel Cron.
- Banco: PostgreSQL/Supabase em producao; SQLite em dev/test.
- Cache/jobs: Redis/ioredis/BullMQ.
- Deploy: Vercel em `gru1`, serverless `api/index.mjs`, output `dist/public`.
- Observabilidade: Sentry, PostHog, Google Analytics, Web Vitals.

Inventario observado:

- `package.json`: 133 dependencias runtime, 63 devDependencies e scripts para build, lint, unit, e2e, smoke, RLS, backup, restore, pentest e go-live.
- `client/src/pages`: 63 arquivos de pagina.
- `server`: 210 arquivos TS/TSX ate profundidade 3.
- `migrations`: 30 arquivos.
- `tests`: 124 arquivos.
- `server/routes/`: apenas `_shared.ts`, `interactions.ts` e `newsletter.ts`; decomposicao de rotas ainda esta no inicio.

# Fase 3 - Arquitetura

Nota: **7.2/10**.

Pontos fortes:

- Arquitetura modular por camadas claras (`client/`, `server/`, `shared/`, `migrations/`, `script/`, `docs/`).
- Gates operacionais e scripts de go-live existem.
- Separacao inicial de rotas por dominio ja tem padrao documentado em `docs/ARCHITECTURE.md`.
- RLS runtime, transacoes por tenant e ledger persistente de webhooks ja existem.

Riscos:

- `server/routes.ts`: 4409 linhas.
- `server/storage.ts`: 4549 linhas.
- `shared/schema.ts`: 1999 linhas; `shared/schema-sqlite.ts`: 1861 linhas.
- Mega-paginas frontend: `vendas/index.tsx` 2652 linhas, `leads/kanban.tsx` 2415, `calendar/index.tsx` 2255, `contracts/index.tsx` 2009, `reports/index.tsx` 1881, `rentals/index.tsx` 1598.
- Schema dual PG/SQLite aumenta risco de drift e falsos positivos nos testes locais.

Acao: concluir decomposicao de `routes.ts`, extrair repositorios/use cases por dominio, decompor mega-paginas e reduzir dependencia de SQLite como proxy de producao.

# Fase 4 - UX

Nota: **7.1/10**.

Pontos fortes:

- Fluxos principais existem e cobrem grande parte da operacao imobiliaria.
- Ha onboarding, portais, paginas publicas, dashboard, CRM, financeiro, locacoes e vendas.
- Estados de loading/feedback foram trabalhados em auditorias anteriores.

Achados:

- Busca global duplicada: `client/src/App.tsx` injeta `GlobalSearch`; `client/src/components/layout/dashboard-layout.tsx` tambem trata busca e atalho `Ctrl/Cmd+K`; `client/src/components/GlobalSearch.tsx` existe como componente separado.
- Fluxos administrativos ainda usam `prompt()` em `client/src/pages/properties/list.tsx:553` e `:564`.
- Testes Playwright existem, mas relatorios anteriores apontam drift de rotas e falta de fixtures autenticadas completas.

Acao: unificar busca global, trocar prompts por dialogs do design system, revisar jornadas autenticadas com fixtures reais e medir friccao de fluxo por persona.

# Fase 5 - UI

Nota: **7.3/10**.

Pontos fortes:

- Design system com Tailwind/shadcn/Radix e documentacao em `client/src/lib/README_DESIGN_SYSTEM.md`.
- Componentes reutilizaveis e padroes de acessibilidade foram introduzidos.

Achados:

- Elementos nao semanticos ainda existem: `dashboard-layout.tsx` usa `role="link"` e `properties/list.tsx` usa `role="button"` em area clicavel.
- `client/src/components/ui/breadcrumb.tsx` ainda usa `role="link"` em breadcrumb.
- Uso extenso de fetch/manual state gera variacao de loading/erro entre telas.

Acao: remover `div role=button/link` dos fluxos principais, padronizar breadcrumbs, formularios, dialogs e estados de erro/loading.

# Fase 6 - Frontend

Nota: **7.0/10**.

Pontos fortes:

- React Query esta presente e ha hooks por dominio.
- Rotas e modulos cobrem produto amplo.
- Testes E2E, mobile, visual, responsivo e acessibilidade existem no reposititorio.

Riscos:

- Mega-componentes concentram estado, UI, fetch e regra de negocio.
- `rg` encontrou muitos `fetch()` diretos em paginas/componentes, inclusive em `rentals`, `leads`, `vendas`, `settings`, `financial`, `reports` e componentes de integracao.
- Bundle/performance ja foram apontados como pendentes em `docs/KNOWN_ISSUES.md`.

Acao: migrar fetch para camada padronizada/React Query por dominio, decompor paginas em containers/hooks/componentes, e reativar suites Playwright contra rotas reais.

# Fase 7 - Backend

Nota: **7.4/10**.

Pontos fortes:

- CSRF, sessoes, Passport, rate limit, ledger de webhooks, upload hardening, anti-SSRF e guards tenant-aware ja existem.
- Microsoft OAuth localmente passou a importar `encryptSecret` em `server/auth/oauth-microsoft.ts`.
- `script/encrypt-microsoft-oauth-tokens.ts` e script `ops:oauth:encrypt-microsoft-tokens` existem para migracao.

Riscos:

- `routes.ts` e `storage.ts` ainda sao monolitos.
- Rotas legadas ainda precisam padronizar `404` para recurso inexistente/cross-tenant.
- Integracoes externas dependem de prova real de secrets, webhooks e migrations.
- ClickSign, reset token de portal, replay protection e LGPD/analytics ainda aparecem como pendencias documentadas.

Acao: extrair dominios, impor helpers tenant-aware, concluir hardening de rotas legadas e rodar testes dinamicos cross-tenant em staging.

# Fase 8 - Banco de Dados

Nota: **6.9/10**.

Pontos fortes:

- Schema amplo e multi-tenant.
- Migrations para RLS, child tables, webhooks, opt-out, WhatsApp unique, Google Calendar e outros fluxos.
- `script/verify-rls.ts` agora referencia `RLS_enable.sql` e `RLS_enable_child_tables.sql`.

Bloqueadores:

- RLS ainda nao esta provado em staging/producao com role runtime nao-owner sem `BYPASSRLS`.
- Migrations recentes ainda precisam aplicacao/validacao real.
- Policies com `tenant_id IS NULL` em `migrations/RLS_enable.sql` precisam revisao fina para evitar exposicao global acidental.
- `migrations/add-performance-indexes.sql` segue documentada como inadequada para migration transacional comum.

Acao: aplicar migrations em staging, rodar `npm run db:rls:verify`, revisar policies globais, registrar evidencia e RPO/RTO.

# Fase 9 - Seguranca

Nota: **7.0/10**.

Classificacao atual:

- `CRITICO`: RLS nao provado em ambiente real.
- `CRITICO`: secrets reais em `.env.production` local foram reportados em 2026-06-29; acao owner-gated continua remover/rotacionar e manter em secrets manager.
- `CRITICO`: backup/PITR, restore drill e pentest real seguem sem evidencia suficiente para go-live enterprise.
- `ALTO`: tokens Microsoft novos agora criptografam localmente, mas tokens legados exigem rodar `ops:oauth:encrypt-microsoft-tokens -- --apply` com `ENCRYPTION_KEY` em ambiente real.
- `ALTO`: Redis TLS precisa estar configurado/provado em staging/producao.
- `ALTO`: rotas legadas com vazamento de existencia por `403` precisam padronizacao.
- `MEDIO`: LGPD/consentimento para analytics/session replay precisa revisao operacional.
- `MEDIO`: Playwright/security dynamic coverage ainda incompleta.

Controles positivos:

- CSRF.
- Helmet/security headers.
- Webhook HMAC/ledger persistente.
- Anti-SSRF central em `server/security/url-validator.ts`.
- Upload hardening e ownership checks documentados/testados localmente.

# Fase 10 - Performance

Nota: **6.8/10**.

Pontos positivos:

- Lazy routes e build publico estatico por rotas conhecidas.
- Cache Redis por tenant existe para dashboard.
- Scripts Lighthouse e performance existem.

Riscos:

- Mega-paginas e bundles grandes seguem documentados.
- Relatorios/agregacoes ainda podem depender de fetches multiplos e calculo em memoria.
- Banco/cache em `us-east-1` contra Vercel `gru1` segue risco de latencia conforme `docs/PROJECT_MEMORY.md` e `docs/DATABASE.md`.

Acao: baseline Lighthouse/Web Vitals em staging, co-localizar banco/cache ou medir latencia real, otimizar chunks de charts/pdf/html2canvas e mover relatorios pesados para SQL/views.

# Fase 11 - DevOps e Operacao

Nota: **6.7/10**.

Pontos fortes:

- Scripts `ops:*` existem para backup, cron, go-live, restore drill e OAuth token migration.
- `ops:go-live:verify:static` passou com 13 checks.
- `ops:cron:verify` passou com 12 jobs alinhados.
- Deploy manual tem scripts para staging/producao e rollback.

Bloqueadores:

- `ops:go-live:verify:strict` ainda precisa passar contra ambiente real.
- Falta evidencia de Redis TLS, backup/PITR, restore drill e pentest.
- `GO_LIVE_CHECKLIST.md` ainda possui itens de 17/06 pendentes e alguns status historicos que precisam consolidacao final.

Acao: criar staging real, rodar gates estritos, anexar logs/evidencias e tratar o checklist como contrato de release.

# Fase 12 - Documentacao

Nota: **8.2/10**.

Pontos fortes:

- Documentacao extensa em `docs/`, `docs/reports/`, `docs/qa/`, `docs/ADR/`.
- Memoria viva e roadmap existem.
- Prompt mestre de auditoria existe e tem historico.

Riscos:

- Documentos principais tem datas e status divergentes: `docs/SECURITY_AUDIT.md` ainda abre com 2025 e achados antigos, enquanto `docs/KNOWN_ISSUES.md` e relatorios recentes tem estado mais atual.
- Volume alto de relatorios dificulta achar a fonte canonica de decisao.

Acao: consolidar indice executivo: "estado atual", "ultimo veredito", "gates bloqueantes", "evidencias aceitas" e "pendencias owner-gated".

# Fase 13 - Refatoracao

P0:

- Provar RLS/Redis/backup/restore/pentest em staging.
- Remover/rotacionar secrets locais.
- Rodar migracao de tokens Microsoft legados.
- Corrigir o teste `data-export` ou fixture ausente.

P1:

- Decompor `routes.ts` e `storage.ts`.
- Padronizar rotas legadas para `404` em cross-tenant.
- Unificar busca global.
- Corrigir semantica de link/button e prompts nativos.
- Reativar Playwright com rotas reais e fixtures autenticadas.

P2:

- Reduzir mega-componentes frontend.
- Migrar fetch cru para React Query/camada API.
- Reduzir chunks criticos.
- Resolver drift PG/SQLite.

P3:

- Maturar arquitetura de jobs fora da Vercel quando houver workloads longos.
- Evoluir observabilidade por SLO, tracing e dashboards executivos.

# Fase 14 - Roadmap de Features

Quick wins - 30 dias:

- Staging real com gates estritos.
- Google SSO/Calendar/Meet configurado no Google Console correto.
- Busca global unica.
- Ajustes semanticos UI/a11y nos fluxos principais.
- Teste `data-export` corrigido.

Curto prazo - 90 dias:

- Portal comprador/lead validado em staging/producao.
- IA acionavel com auditoria e aprovacao humana.
- Agenda de visitas completa com confirmacao/remarcacao/lembrete/ficha/feedback.
- CRM com SLA, deduplicacao, distribuicao e score configuravel por tenant.

Medio prazo - 6 meses:

- Relatorios com views/materialized views.
- SEO dinamico por cidade/bairro/tipo/finalidade.
- App/PWA aprimorado.
- Observabilidade enterprise com SLOs.

Longo prazo - 12 meses:

- Internacionalizacao LATAM.
- Vertical incorporadoras.
- Marketplace/integracoes adicionais.
- Certificacoes/compliance mais formal conforme clientes enterprise.

# Fase 15 - Plano de Implementacao

Sprint 1 - Fechar P0 owner-gated:

- Remover/rotacionar `.env.production` local.
- Configurar `ENCRYPTION_KEY`, `REDIS_URL=rediss://...`, secrets Vercel/GitHub.
- Aplicar migrations em staging.
- Rodar `db:rls:verify`, `ops:backup:verify`, `ops:restore:drill`, `security:pentest`, `ops:go-live:verify:strict`.

Sprint 2 - Qualidade e UX pre-release:

- Corrigir `data-export` fixture.
- Reativar Playwright/a11y/mobile com rotas reais.
- Unificar busca global.
- Remover prompts nativos e `div role=button/link`.
- Medir Lighthouse/Web Vitals em staging.

Sprint 3 - Arquitetura e performance:

- Extrair dominios restantes de `routes.ts`.
- Iniciar decomposicao de `storage.ts`.
- Decompor `vendas`, `kanban`, `calendar`, `contracts`, `reports`, `rentals`.
- Reduzir chunks charts/pdf/html2canvas.

Sprint 4 - Produto enterprise:

- Validar Google SSO/Calendar/Meet.
- Validar portal comprador, IA acionavel, agenda avancada e CRM SLA em staging.
- Consolidar runbook, evidencias e checklist final.
- Preparar release candidate com score enterprise.

# Fase 16 - Revisao Cruzada

CTO/Arquitetura: produto tem base suficiente para evoluir, mas a modularizacao ainda nao acompanha a amplitude do produto.

Security: nao ha liberacao enterprise sem RLS real, secrets rotacionados, Redis TLS, pentest e restore drill.

DBA/Dados: RLS e migrations sao o eixo critico; PG/SQLite dual precisa disciplina para nao mascarar problemas.

UX/UI: experiencia funcional existe, mas fluxos precisam acabamento semantico, consistencia de busca e validacao visual autenticada.

DevOps/Operacao: scripts existem; falta executar e guardar evidencias em staging/producao.

QA: suite unit quase verde, mas 1 falha impede declarar baseline limpo; E2E precisa sair de drift.

# Notas Finais

| Dimensao | Nota | Evidencia | Acao principal |
| --- | ---: | --- | --- |
| Arquitetura | 7.2 | `routes.ts` 4409 LOC, `storage.ts` 4549 LOC | decompor dominios |
| UX | 7.1 | busca duplicada e `prompt()` em propriedades | unificar fluxos |
| UI | 7.3 | `role=button/link` em fluxos centrais | usar elementos nativos |
| Backend | 7.4 | hardening amplo, mas monolitos restantes | extrair use cases |
| Frontend | 7.0 | mega-paginas e fetch cru | React Query/camada API |
| Banco de Dados | 6.9 | RLS local preparado, sem prova real | aplicar/verificar staging |
| Seguranca | 7.0 | controles fortes, sem evidencia prod | fechar P0 owner-gated |
| Escalabilidade | 6.8 | Redis/jobs/cache existem, sem prova real | validar Redis/locks |
| Performance | 6.8 | chunks e mega-paginas pendentes | baseline e split |
| Operacao | 6.7 | scripts existem, strict gate pendente | staging com evidencias |

Nota geral: **7.1/10**.

Estimativa para nivel enterprise: falta fechar aproximadamente **25% do caminho**, concentrado em provas operacionais, RLS real, QA/E2E, modularizacao e acabamento UX/UI. Para MVP controlado, o produto esta muito mais perto; para enterprise, o que falta e evidencia, disciplina de release e reducao de risco residual.

# Validacoes Executadas em 2026-06-30

- `npm run check`: passou.
- `npm run lint -- --quiet`: passou.
- `npm run ops:go-live:verify:static`: passou, 13 pass, 0 warn, 0 fail.
- `npm run ops:cron:verify`: passou, 12 jobs alinhados.
- `npm run test:unit`: falhou em 1 teste conhecido: `tests/unit/data-export.test.ts`, erro `ENOENT: no such file or directory, open 'uploads/exports/data-export-abc.zip'`; resumo 71 arquivos passaram, 1 falhou, 769 testes passaram, 1 falhou.

# Atualizacao Pos-Auditoria - Execucao Fase 0

O bloqueio unitario `data-export` foi corrigido localmente em 2026-06-30. O teste passou a validar o contrato atual de `downloadExport` como `Buffer`, usando o caminho duravel de storage mockado.

Validacoes pos-correcao:

- `npm run test:unit -- tests/unit/data-export.test.ts`: passou, 17/17.
- `npm run test:unit`: passou, 72 arquivos, 770/770 testes.
- `npm run check`: passou.
- `npm run lint -- --quiet`: passou.
- `npm run ops:go-live:verify:static`: passou, 13 pass, 0 warn, 0 fail.
- `npm run ops:cron:verify`: passou, 12 jobs alinhados.

# Atualizacao Pos-Auditoria - Execucao Fase 1

Melhorias UX/UI/QA aplicadas localmente em 2026-06-30:

- `client/src/components/layout/dashboard-layout.tsx`: sidebar passou a usar `Link` nativo estilizado, sem `div role="link"`; listener duplicado de `Ctrl/Cmd+K` removido.
- `client/src/pages/properties/list.tsx`: thumbnail da lista virou `button` com nome acessivel; titulo virou `Link`; prompts nativos de imagem/caracteristica foram substituidos por dialogs do design system.
- `tests/accessibility/audit.spec.ts`, `tests/mobile/orientation.spec.ts`, `tests/mobile/touch-events.spec.ts`, `tests/responsive/breakpoints.spec.ts`: rotas antigas corrigidas para rotas reais.

Validacoes pos-correcao:

- `npm run check`: passou.
- `npm run lint -- --quiet`: passou.
- `npm run test:unit`: passou, 72 arquivos, 770/770 testes.
- `npm run build`: passou.

Alinhamento local adicional:

- O SQLite local ignorado em `data/imobibase.db` estava atrasado: `npm run db:seed` falhou com `table tenants has no column named onboarding_completed` e `npm run db:push:sqlite` falhou com `index brand_settings_tenant_id_unique already exists`.
- Sem reset destrutivo, foram adicionadas de forma aditiva a coluna `tenants.onboarding_completed` e as colunas faltantes de `visits`.
- Depois do ajuste, `/api/tenants/slug/sol` respondeu 200, `/api/visits` respondeu 200 e `npm run test:smoke:e2e` passou com 8/8.

# Atualizacao Pos-Auditoria - Execucao Fase 2

Melhoria arquitetural incremental aplicada localmente em 2026-06-30:

- `server/routes/lead-tags.ts` criado com as rotas de tags de lead e links de tags.
- `server/routes.ts` deixou de conter o bloco inline de lead tags e passou a registrar `registerLeadTagRoutes(app, { requireAuth })` no mesmo ponto relativo.
- A ordem critica de matching do Express foi preservada: `/api/leads/tags/batch` continua antes de `/api/leads/:leadId/tags`.
- `docs/ADR/0002-modularizacao-incremental-routes.md` registra a decisao de seguir com modularizacao incremental por dominio.

Validacoes pos-correcao:

- `npx vitest run tests/integration/tenant-isolation.test.ts`: passou, 27/27.
- `npm run check`: passou.
- `npm run lint -- --quiet`: passou.
- `git diff --check`: passou.

Risco residual identificado:

- `DELETE /api/leads/:leadId/tags/:tagId` valida ownership do lead antes de remover o vinculo, mas ainda nao valida explicitamente ownership do `tagId`. A extracao preservou o comportamento existente; o hardening deve ser tratado em fase propria para nao misturar refatoracao mecanica com mudanca de comportamento.

# Atualizacao Pos-Auditoria - Execucao Fase 3

Melhorias locais de performance aplicadas em 2026-06-30:

- `client/src/App.tsx`: `GlobalSearch` e `TimeoutWarning` passaram a ser lazy
  imports carregados somente em rotas protegidas.
- Evidencia de build: a entry principal publica reduziu de ~374 kB no build
  anterior (`index-Wygg9VWs.js`) para ~348 kB (`index-C37CKbbo.js`); os chunks
  `GlobalSearch` (~20 kB) e `TimeoutWarning` (~4 kB) ficaram separados.
- `client/src/pages/public/landing.tsx`: a imagem hero da vitrine publica de
  tenant (`/e/:slug`) recebeu `width`, `height`, `sizes`, `loading="eager"`,
  `fetchPriority="high"` e `decoding="async"`.

Validacoes pos-correcao:

- `npm run check`: passou.
- `npm run lint -- --quiet`: passou.
- `npm run build`: passou.
- `npm run test:smoke:e2e`: passou, 8/8.
- `git diff --check`: passou.

Pendencia:

- Medir Lighthouse/Web Vitals em preview/staging real para confirmar LCP/CLS e
  orientar a proxima rodada de split de bundle ou troca de imagem remota por
  asset local AVIF/WebP.

# Atualizacao Pos-Auditoria - Execucao Fase 4

Baseline local de performance executado em 2026-06-30:

- Comando: `npm run test:performance -- --reporter=list --project=chromium --workers=1`.
- Resultado: 14/21 testes passaram; 7 falharam.

Falhas observadas:

- `/dashboard` mobile carregou em 4575 ms contra limite de 3000 ms.
- Peso total medido: 8,09 MB contra limite de 2 MB.
- CSS total medido: 258 KB contra limite de 100 KB.
- Requests: 100 contra limite de 50.
- Navegacao repetida indicou crescimento de heap de 391%.
- Harness: teste de animacao expirou aguardando `transitionend`; teste de tap
  usa `page.tap()` sem `hasTouch` no contexto.

Conclusao da fase:

- A suite de performance nao esta verde e nao deve ser relaxada sem criterio.
- Primeiro separar falhas do harness de falhas reais; depois reduzir CSS global,
  peso inicial, numero de requests e memoria do dashboard.

Atualizacao da continuidade da Fase 4:

- `tests/performance/mobile-performance.spec.ts` corrigido para contexto mobile
  real (`hasTouch`/`isMobile`), sem depender de `transitionend` inexistente e
  sem rota driftada `/properties/new`.
- `playwright.performance.config.ts` criado; `npm run test:performance` passou
  a rodar `npm run build` e testar contra `vite preview`.
- `client/src/pages/auth/login.tsx` criado e o login saiu do shell principal.
- `DashboardLayout` e `Toaster` passaram a lazy chunks em `client/src/App.tsx`.
- Evidencia: entry principal reduziu de ~348 kB para ~236 kB; JS medido pela
  suite caiu de ~866 KB para ~778 KB.
- Estado atual: `npm run test:performance -- --reporter=list --workers=1`
  passou 19/21; falha somente em JS total (~778 KB > 500 KB) e CSS total
  (~194 KB > 100 KB).
- Validacoes complementares: `npm run check`, `npm run lint -- --quiet`,
  `npm run test:smoke:e2e` e `git diff --check` passaram.

# Matriz de Riscos

| Risco | Severidade | Estado | Mitigacao |
| --- | --- | --- | --- |
| RLS sem prova real | CRITICO | aberto | aplicar e rodar `db:rls:verify` em staging/prod |
| Secrets locais reais | CRITICO | owner-gated | remover, rotacionar, manter em secrets manager |
| Restore drill/pentest ausentes | CRITICO | aberto | executar gates e anexar evidencias |
| Redis TLS sem prova | ALTO | aberto | configurar `rediss://` e validar locks/rate limit |
| Tokens Microsoft legados | ALTO | parcial | rodar script de criptografia com `ENCRYPTION_KEY` |
| E2E driftado | ALTO | aberto | corrigir rotas/fixtures |
| Monolitos backend/frontend | MEDIO | aberto | refatoracao incremental por dominio |
| Performance publica | MEDIO | aberto | medir e otimizar LCP/chunks |

# Veredito Final

O ImobiBase esta **bem encaminhado**, mas ainda nao deve ser vendido/operado como SaaS enterprise sem a rodada de staging real e fechamento dos P0. A prioridade agora e parar de ampliar escopo e transformar as garantias locais em evidencias operacionais: banco real, Redis real, secrets reais, restore real, pentest real e UX real em navegadores reais.
