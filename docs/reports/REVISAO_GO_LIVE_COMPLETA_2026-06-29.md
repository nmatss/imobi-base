---
title: Revisao Go-Live Completa - ImobiBase
data: 2026-06-29
status: NO-GO enterprise
escopo: auditoria completa 360 conforme docs/prompts/PROMPT_MASTER_AUDITORIA.md
validacoes_locais: check, lint quiet, build, ops:cron:verify, ops:go-live:verify:static, test:unit
---

# Resumo Executivo

O ImobiBase esta em estado **production-capable localmente**, mas ainda **NO-GO para go-live enterprise**.

A base tem stack moderna, cobertura documental forte, hardening relevante de seguranca, CI/CD com gate estrito e varios controles multi-tenant ja implementados. O bloqueio principal nao e falta de produto, e sim falta de **provas reais de ambiente**: RLS aplicado e validado em staging/producao, role runtime nao-owner, Redis real/TLS, backup/PITR, restore drill, pentest, migrations recentes aplicadas, Google OAuth verificado e `ops:go-live:verify:strict` verde.

Nesta rodada, a revisao multi-especialista tambem encontrou novos bloqueadores tecnicos antes do rollout:

- `CRITICO`: existem secrets reais em arquivo local ignorado pelo git (`.env.production`). Nao foram expostos neste relatorio. A acao correta e mover para Vercel/GitHub Secrets, remover do workspace e rotacionar credenciais.
- `CRITICO`: RLS ainda nao pode ser tratado como defesa enterprise porque permanece sem prova em banco real.
- `ALTO`: `db:rls:verify` cobre `migrations/RLS_enable.sql`, mas nao cobre as policies em `migrations/RLS_enable_child_tables.sql`.
- `ALTO`: links publicos de assinatura digital podem quebrar quando RLS das tabelas filhas for aplicado, pois `digital_signatures` exige `app.tenant_id` e a rota publica por token nao abre contexto proprio.
- `ALTO`: Microsoft OAuth ainda persiste tokens em texto puro, enquanto Google ja usa criptografia.
- `ALTO`: Redis/rate limit/locks ainda degradam para memoria/fail-open, inadequado para serverless em producao sem prova real de Redis.

Veredito: **nao publicar como enterprise ainda**. O caminho correto e uma fase curta de remediacao P0, seguida de staging real com evidencias anexadas.

# Objetivo do Produto

O ImobiBase e um SaaS imobiliario multi-tenant para imobiliarias e corretores, cobrindo CRM, leads, imoveis, agenda, contratos, locacoes, financeiro, vistorias, portal, sites publicos, IA, analytics e integracoes.

Evidencias:

- `README.md`: define "CRM imobiliario multi-tenant SaaS" e lista modulos.
- `docs/PROJECT_MEMORY.md`: confirma o posicionamento como sistema que nao perde visitas, conectando lead, agendamento, visita, feedback e acompanhamento gestor.
- `docs/PLANS.md`: documenta tiers, feature flags e enforcement por tenant.

Personas inferidas a partir do codigo/documentacao:

- Dono/gestor de imobiliaria.
- Corretor/agente.
- Admin/superadmin.
- Proprietario.
- Inquilino.
- Comprador/lead.
- Visitante publico/SEO.

Lacuna: falta um documento explicito de ICP/personas/jobs-to-be-done e proposta de valor por segmento.

# Arquitetura Completa

Stack inventariada:

- Frontend: React 19, Vite, TypeScript, Wouter, TanStack Query, Tailwind/shadcn, Recharts, Leaflet, PWA.
- Backend: Node.js, Express 5, Passport, Drizzle, BullMQ, jobs HTTP via Vercel Cron.
- Banco: PostgreSQL/Supabase em producao; SQLite em dev/test.
- Cache/jobs: Redis/ioredis/BullMQ.
- Deploy: Vercel em `gru1`, serverless `api/index.mjs`, output `dist/public`.
- Observabilidade: Sentry, PostHog, GA, Web Vitals.

Evidencias locais:

- `package.json`: scripts de build/test/go-live/deploy e dependencias.
- `vercel.json`: regiao `gru1`, headers, rewrites, 12 crons e funcao serverless.
- `server/routes.ts`: 4410 linhas.
- `server/storage.ts`: 4549 linhas.
- `shared/schema.ts`: 1999 linhas.
- `shared/schema-sqlite.ts`: 1861 linhas.
- `client/src/App.tsx`: lazy routes e protecao de rotas.

Principais riscos arquiteturais:

- Monolitos ainda grandes em backend (`routes.ts`, `storage.ts`).
- Mega-paginas frontend: `vendas/index.tsx` 2652 LOC, `leads/kanban.tsx` 2415, `calendar/index.tsx` 2255, `contracts/index.tsx` 2009, `reports/index.tsx` 1881, `rentals/index.tsx` 1598.
- Drift dual schema: auditoria encontrou 81 tabelas PG vs 77 SQLite; WhatsApp so em PG e `legal_documents` so em SQLite.
- Repositorios base por ID sem tenant em alguns metodos dependem de guard externo ou RLS (`getProperty`, `updateProperty`, `getLead`, `updateLead`, `getVisit` em `server/storage.ts`).

# Fluxos de Negocio

Fluxos cobertos pelo produto:

- Captacao e qualificacao de lead.
- Matching lead-imovel.
- Agenda/visitas, confirmacao, lembretes e feedback.
- Funil CRM e SLA.
- Cadastro e publicacao de imoveis.
- Contratos e assinatura digital.
- Locacao: proprietarios, inquilinos, pagamentos e repasses.
- Vendas, propostas, comissoes e financeiro.
- Portais publicos e por token.
- Integracoes WhatsApp, SMS, email, pagamentos, ClickSign, Google Calendar/Meet.
- Compliance LGPD, auditoria e export/delete.

Gaps de produto/go-live:

- Google SSO/Calendar/Meet esta codado, mas dormente ate Google Console, envs, verificacao do app e migrations.
- Assinatura digital ainda nao deve ser vendida como assinatura qualificada ICP-Brasil sem cadeia ICP, revogacao/OCSP/CRL, OID de policy e carimbo de tempo adequado.
- Features P1 codadas em 20/06 ainda precisam prova em staging/producao e migrations aplicadas.

# Inventario Tecnico

Validacoes executadas nesta auditoria:

- `npm run check`: passou.
- `npm run lint -- --quiet`: passou.
- `npm run ops:go-live:verify:static`: passou, 13 pass, 0 fail.
- `npm run ops:cron:verify`: passou, 12 jobs alinhados com `vercel.json`.
- `npm run build`: passou; gerou HTML estatico para 11 rotas; `dist/index.cjs` 4.1 MB e `api/_handler.mjs` 13.0 MB.
- `npm run test:unit`: falhou em 1 teste pre-existente (`tests/unit/data-export.test.ts`), 765/766 passaram.

Observacao: `client/public/sitemap.xml` ja estava modificado antes da auditoria e o build regenera esse arquivo.

Chunks relevantes observados no build:

- `vendor-charts`: 456.47 kB raw.
- `jspdf`: 387.23 kB raw.
- shell principal `index-BE6Rx0Cu.js`: 374.45 kB raw.
- `html2canvas`: 201.04 kB raw.
- `vendor-react`: 197.86 kB raw.
- `product-landing`: 163.35 kB raw.

# UX Review

Nota UX: **7.0/10**.

Pontos fortes:

- Rotas lazy-loaded.
- Estados de loading e componentes de feedback existem.
- Design system shadcn/Radix consistente em varias areas.
- Onboarding, assistente IA e modulos principais documentados.

Achados:

- `ALTO`: busca global duplicada. `client/src/App.tsx` injeta `GlobalSearch`; `dashboard-layout.tsx` tambem registra `Ctrl/Cmd+K`; `GlobalSearch.tsx` registra outro listener.
- `MEDIO`: fluxos administrativos em `client/src/pages/properties/list.tsx` ainda usam `prompt()` para URL de imagem/caracteristica.
- `MEDIO`: fetch cru em `useEffect` ainda aparece em paginas como rentals, vendas, leads e settings, reduzindo consistencia de cache/loading/erro.
- `MEDIO`: Playwright de a11y/responsividade esta driftado: teste usa `/financial`, mas router usa `/financeiro`; teste usa `/properties/new`, rota ausente.

Acao prioritaria:

- Unificar busca/atalho global.
- Remover `prompt()` e usar dialogs do design system.
- Corrigir Playwright para rotas reais e adicionar fixtures autenticadas.

# UI Review

Nota UI: **7.4/10**.

Pontos fortes:

- Biblioteca de componentes UI extensa.
- Tokens/design docs existem em `client/src/lib/DESIGN_SYSTEM*`.
- Varias correcoes recentes removeram links/botoes aninhados e nomes acessiveis ausentes.

Achados:

- `ALTO`: controles nao semanticos em `client/src/pages/properties/list.tsx`: `div` clicavel para imagem e `div role="button"` sem teclado/foco completo.
- `ALTO`: navegacao lateral em `dashboard-layout.tsx` usa `Link` envolvendo `div role="link"`, em vez de link real estilizado.
- `MEDIO`: breadcrumb atual anunciado como link desabilitado em `client/src/components/ui/breadcrumb.tsx`.
- `MEDIO`: dependencia de imagens/texturas remotas e Google Fonts nas paginas publicas afeta LCP, privacidade e disponibilidade.

Acao prioritaria:

- Substituir `div role=button/link` por elementos nativos.
- Corrigir breadcrumb atual para texto com `aria-current`.
- Self-host/otimizar assets criticos publicos.

# Frontend

Nota Frontend: **7.0/10**.

Riscos:

- Mega-componentes acima de 1500 LOC em fluxos core.
- Fetch e estado dispersos fora de React Query em varias paginas.
- Testes E2E relevantes ainda quarentenados ou driftados.
- Bundle publico ainda pesado para meta LCP < 2.5s.

Plano:

- Decompor paginas por dominio e hooks.
- Escopar query keys por tenant.
- Migrar fetch cru para React Query.
- Reabrir Playwright com fixtures reais: public, auth, portal, dashboard, vendas, leads, calendar, contracts, rentals, financeiro.

# Backend

Nota Backend: **7.2/10**.

Pontos fortes:

- Sessao regenera apos login local/OAuth.
- CSRF double-submit ativo.
- Webhooks criticos usam assinatura e ledger persistente.
- Uploads validam magic bytes, extensoes perigosas e ownership.
- `withTenantTransaction`/RLS runtime existem.

Achados:

- `ALTO`: Microsoft OAuth grava access/refresh token em texto puro; Google ja usa criptografia.
- `ALTO`: rotas legadas retornam `403` em recurso cross-tenant, vazando existencia; padrao recomendado e `404`.
- `ALTO`: rate limit/locks/2FA degradam para memoria/fail-open sem Redis real.
- `MEDIO`: ClickSign timestamp/replay protection e opcional.
- `MEDIO`: reset token do portal e armazenado em texto puro, enquanto reset principal usa hash.

Acao prioritaria:

- Criptografar Microsoft OAuth e migrar legados.
- Padronizar helpers tenant-aware e status `404` para mismatch.
- Tornar Redis/TLS requisito hard em producao.
- Hash de reset token do portal.

# Banco de Dados

Nota Banco de Dados: **6.8/10**.

Pontos fortes:

- Schema PG e SQLite amplos.
- Migrations recentes para webhook ledger, opt-out, WhatsApp unique, Google Calendar.
- RLS runtime e migration com `ENABLE/FORCE ROW LEVEL SECURITY`.
- Auditoria encontrou cobertura estatica forte: tabelas PG com `tenantId` cobertas por RLS principal e tabelas filhas em arquivo separado.

Bloqueadores:

- `CRITICO`: RLS ainda nao aplicado/provado em staging/producao com role nao-owner sem `BYPASSRLS`.
- `ALTO`: `script/verify-rls.ts` le apenas `migrations/RLS_enable.sql`; nao verifica `migrations/RLS_enable_child_tables.sql`.
- `ALTO`: `digital_signatures` em RLS child tables exige `app.tenant_id`; rota publica por token pode quebrar apos aplicar RLS.
- `ALTO`: policies com `tenant_id IS NULL` em logs/newsletter/webhook_events podem expor registros globais para qualquer contexto que consiga consultar a tabela.
- `ALTO`: `migrations/add-performance-indexes.sql` nao e seguro como migration comum em producao: `CREATE INDEX` sem `CONCURRENTLY` e predicate com `CURRENT_DATE`.
- `MEDIO`: drift PG/SQLite reduz valor dos testes SQLite como simulacao de producao.

Acao prioritaria antes de aplicar RLS:

1. Expandir `db:rls:verify` para child tables.
2. Criar policy/contexto seguro para assinatura publica por token.
3. Revisar todos os `tenant_id IS NULL`.
4. Separar indices concorrentes de migrations transacionais.

# Seguranca

Nota Seguranca: **6.8/10**.

Classificacao dos achados:

- `CRITICO`: secrets reais em `.env.production` local ignorado pelo git. Risco operacional de vazamento por copia, backup ou agentes. Acao: mover para secrets manager, remover local, rotacionar.
- `CRITICO`: RLS nao provado em ambiente real.
- `ALTO`: Microsoft OAuth tokens em texto puro.
- `ALTO`: Redis sem TLS/fora da regiao e degradacao para memoria/fail-open.
- `ALTO`: existencia de recursos cross-tenant pode vazar por `403`.
- `ALTO`: RLS verifier incompleto e risco de quebra em assinatura publica.
- `MEDIO`: Sentry Replay com `maskAllText: false`, PostHog autocapture/session recording e identify com email/nome exigem revisao LGPD/consentimento.
- `MEDIO`: preview PR publica credenciais demo em comentario.
- `MEDIO`: ClickSign anti-replay por timestamp opcional.
- `MEDIO`: reset token do portal em texto puro.

Controles positivos:

- CSRF.
- Helmet/security headers.
- HMAC/webhook signatures.
- Upload validation.
- SSRF guard central `fetchExternalUrl`.
- Ledger persistente de webhooks.
- Gate strict no workflow de producao.

# Performance

Nota Performance: **6.4/10**.

Achados:

- Bundle ainda pesado em charts/PDF/html2canvas/shell.
- Relatorios fazem agregacao em memoria/N+1 em trechos de `server/storage.ts`, como `getPropertiesReport` e `getRentalMetrics`.
- Home ja teve Lighthouse 74 e LCP 5.1s registrado em docs.
- Banco/Redis em `us-east-1` vs Vercel `gru1` cria risco de latencia.

Plano:

- Lazy-load PDF/charts apenas nos fluxos que usam.
- Agregacoes SQL/materialized views para relatorios.
- Medir Lighthouse atual em staging real.
- Co-localizar banco/cache ou ajustar regiao de deploy.

# DevOps

Nota Operacao/DevOps: **6.2/10**.

Pontos fortes:

- `deploy-production.yml` roda check/lint/test/build antes do deploy.
- Workflow usa `ops:go-live:verify:strict` antes do deploy.
- Migrations automaticas de producao estao desabilitadas.
- Health check pos-deploy existe.
- `ops:cron:verify` passou com 12 crons alinhados.

Achados:

- `CRITICO`: secrets reais locais.
- `ALTO`: divergencia de dominio canonico entre `.com.br` e env local apontando CORS para `.com`.
- `ALTO`: Redis sem `rediss://` e fora da regiao.
- `ALTO`: Snyk pode nao rodar se token estiver apenas em `secrets`, pois condicao usa `vars.SNYK_TOKEN`.
- `MEDIO`: Vercel usa `npm install`, enquanto CI usa `npm ci`.
- `MEDIO`: backup cron depende de PITR/upload configurado; sem isso falha em serverless.
- `BAIXO`: docs de cron parcialmente defasadas.

# Documentacao

Nota Documentacao: **8.3/10**.

Pontos fortes:

- README, memorias, roadmap, known issues, tech debt, runbooks e relatorios extensos.
- Prompt master existe e instrui auditoria completa.
- Go-live anterior documentado com evidencias.

Gaps:

- Muitas fontes para go-live; falta uma tabela canonica unica de bloqueadores atuais.
- Alguns docs mantem estados mistos: "codigo concluido", "pendente staging", "dormente", "oportunidade".
- `docs/SECURITY_AUDIT.md` estava desatualizado (data 2025) antes desta auditoria.
- Personas/ICP nao formalizados.

# Refatoracoes

P0:

- Corrigir verifier RLS para child tables.
- Corrigir RLS/assinatura publica por token.
- Remover/rotacionar secrets locais.
- Criptografar Microsoft OAuth.
- Redis hard/TLS em producao.

P1:

- Decompor `server/routes.ts` e `server/storage.ts`.
- Decompor mega-paginas frontend.
- Substituir `403` cross-tenant por `404` fail-closed.
- Corrigir semantica UI em links/botoes.
- Corrigir Playwright driftado e tirar suites de quarentena com fixtures.

P2:

- Reduzir chunks PDF/charts/html2canvas.
- Materialized views/agregacoes SQL.
- Self-host assets/fontes criticas.
- Ratchet de cobertura e lint warnings.

# Melhorias

Quick wins tecnicos:

- `vercel.json`: trocar `installCommand` para `npm ci`.
- `.github/workflows/security-scan.yml`: alinhar condicao do Snyk com `secrets.SNYK_TOKEN` ou documentar repository variable.
- `docs/DEPLOYMENT_RUNBOOK.md`: atualizar horarios de crons.
- Corrigir breadcrumb semantico.
- Remover credenciais demo do comentario de preview.

Melhorias estruturais:

- Criar documento `docs/GO_LIVE_BLOCKERS.md` ou consolidar em `docs/KNOWN_ISSUES.md` com dono/status/evidencia.
- Criar `docs/PERSONAS.md`.
- Criar matriz RLS por tabela, incluindo policies globais/nullable.

# Features Recomendadas

30 dias:

- Ativar Google SSO/Calendar/Meet em staging apos Google Console e verificacao.
- Portal comprador validado em staging.
- IA acionavel com aprovacao humana e auditoria validada.
- Agenda completa com confirmacao/lembrete/ficha/feedback validada.

90 dias:

- SEO dinamico por cidade/bairro/tipo/finalidade.
- Dashboards de gestao com SLA e conversao por corretor.
- Painel de saude operacional por tenant.

6 meses:

- App/PWA aprimorado para corretores.
- Marketplace de integracoes.
- BI executivo e benchmarking.

12 meses:

- Multi-filiais enterprise.
- API publica com webhooks e limites por plano.
- Trilha de compliance/enterprise audit-ready.

# Roadmap

## Sprint 1 - Bloqueadores de seguranca e RLS

Objetivo: impedir rollout inseguro.

Entregas:

- Remover e rotacionar secrets locais.
- Expandir `db:rls:verify` para `RLS_enable_child_tables.sql`.
- Corrigir policy/contexto de assinatura publica.
- Criptografar Microsoft OAuth.
- Revisar `tenant_id IS NULL`.

Riscos: quebra de fluxos publicos por token; dados reais com duplicidades antes de constraints.

Dependencias: acesso aos secrets manager, staging DB e owner do Supabase.

## Sprint 2 - Staging real e gates

Objetivo: produzir evidencias reais.

Entregas:

- Aplicar migrations revisadas em staging.
- Rodar `db:rls:verify`, `ops:go-live:verify:strict`, backup verify, restore drill, pentest.
- Provar Redis TLS e locks/2FA/crons.
- Registrar RPO/RTO.

Riscos: migrations falharem por dados legados; latencia cross-region.

Dependencias: Vercel/Supabase/Redis/Stripe/WhatsApp configurados.

## Sprint 3 - UX/UI/QA pre-release

Objetivo: fechar riscos visiveis ao usuario.

Entregas:

- Busca global unica.
- Elementos nativos em links/botoes.
- Remover `prompt()`.
- Corrigir Playwright driftado.
- Smoke autenticado completo.

Riscos: mega-componentes aumentam regressao.

Dependencias: fixtures e contas demo confiaveis.

## Sprint 4 - Performance e release candidate

Objetivo: release candidate com evidencias.

Entregas:

- Split PDF/charts/html2canvas.
- Lighthouse staging.
- Relatorios SQL otimizados.
- Go-live checklist final.
- Decisao formal de risco sobre cobertura se ainda abaixo de 80%.

Riscos: performance real depender de regiao banco/cache.

Dependencias: staging equivalente a producao.

# Matriz de Riscos

| Risco | Severidade | Probabilidade | Evidencia | Acao |
| --- | --- | --- | --- | --- |
| Secrets locais vazarem | CRITICO | Media | `.env.production` local ignorado pelo git | Remover e rotacionar |
| RLS nao aplicado/provado | CRITICO | Alta | `docs/RLS_RUNBOOK.md`, `docs/KNOWN_ISSUES.md` | Staging apply/verify |
| RLS child tables nao verificado | ALTO | Alta | `script/verify-rls.ts`, `RLS_enable_child_tables.sql` | Expandir verifier |
| Assinatura publica quebrar com RLS | ALTO | Media | `routes-features.ts`, `RLS_enable_child_tables.sql` | Policy/contexto por token |
| Token Microsoft em texto puro | ALTO | Media | `oauth-microsoft.ts` | Criptografar/migrar |
| Rate limit fail-open sem Redis | ALTO | Media | `routes.ts`, `routes-security.ts` | Redis hard/TLS |
| Drift PG/SQLite | MEDIO | Alta | `shared/schema*.ts` | Schema parity |
| Testes E2E driftados | MEDIO | Alta | Playwright rotas antigas | Atualizar suites |
| LCP ruim em publico | MEDIO | Media | build chunks, docs Lighthouse | Split/medir staging |
| Backup/restore sem prova | CRITICO | Alta | worklog 18/06 | PITR/restore drill |

# Notas

| Dimensao | Nota | Evidencia | Acao minima para subir |
| --- | ---: | --- | --- |
| Arquitetura | 7.0 | `routes.ts`/`storage.ts` > 4k LOC; docs de refatoracao | Modularizar rotas/storage |
| UX | 7.0 | busca duplicada, `prompt()`, Playwright driftado | Unificar busca e corrigir fluxos |
| UI | 7.4 | `div role=button/link`, breadcrumb link disabled | Elementos nativos e a11y |
| Backend | 7.2 | bons controles, mas Microsoft token/403/Redis | Cripto, 404, Redis hard |
| Frontend | 7.0 | mega-paginas, fetch disperso, bundles | Decompor e React Query |
| Banco de Dados | 6.8 | RLS nao provado, verifier incompleto, drift | Apply/verify RLS completo |
| Seguranca | 6.8 | secrets locais, RLS, tokens, Redis | Rotacao e hardening P0 |
| Escalabilidade | 6.7 | Redis/region/N+1/cache | Redis real e SQL aggregates |
| Performance | 6.4 | chunks grandes, LCP historico 5.1s | split/lighthouse |
| Operacao | 6.2 | strict real pendente, backup/restore/pentest | evidencias staging/prod |

Nota geral estimada: **6.9/10**.

Estimativa para nivel enterprise: faltam **4 a 6 semanas de trabalho focado** se o ambiente/staging/secrets estiverem disponiveis, ou mais se depender de criacao/verificacao externa de Google, Stripe, WhatsApp, Supabase e pentest.

# Veredito Final

**NO-GO para go-live enterprise em 2026-06-29.**

Liberar apenas quando:

1. Secrets locais forem removidos e rotacionados.
2. RLS completo, incluindo child tables, for aplicado e verificado em staging.
3. Assinatura publica funcionar sob RLS.
4. `ops:go-live:verify:strict` passar contra staging/producao.
5. Backup/PITR e restore drill tiverem evidencia.
6. Pentest e smoke autenticado passarem.
7. Redis TLS real estiver comprovado.
8. Migrations recentes estiverem aplicadas e auditadas.

O produto tem base tecnica para chegar la, mas hoje a decisao correta e bloquear producao enterprise ate as provas reais existirem.
