# Changelog

## 2026-06-17

### Added

- Harness enterprise em `AGENTS.md`.
- Memorias do projeto e da sessao.
- Documentos executivos de arquitetura, banco, API, deploy, runbook, observabilidade, performance, roadmap, issues e debito tecnico.
- ADR para adocao do harness enterprise.
- Relatorio profissional em Markdown e PDF.
- Paginas publicas de intencao SEO:
  - sistema imobiliario completo;
  - CRM imobiliario;
  - software de agendamento imobiliario;
  - site para imobiliaria;
  - CRM imobiliario com IA.
- Imagens AVIF/WebP responsivas para hero do dashboard.
- Helper central de CORS em `server/config/cors.ts`.
- Testes unitarios para CORS, compatibilidade `ALLOWED_ORIGINS` e envelope seguro do wrapper serverless.
- Servico de conflito de agenda em `server/services/visit-scheduling.ts`.
- Testes unitarios para conflito de visitas por imovel/corretor.
- Servico de SLA de leads em `server/services/lead-sla.ts`.
- Rota `/api/leads/sla/summary`.
- Testes unitarios de SLA de leads e politica central de agendamento.
- Manifesto unico de crons em `server/jobs/cron-manifest.ts`.
- Verificadores operacionais:
  - `npm run db:rls:verify`;
  - `npm run ops:cron:verify`;
  - `npm run ops:backup:verify`;
  - `npm run ops:restore:drill`;
  - `npm run security:pentest`.
- Teste unitario para alinhamento do manifesto de crons com `vercel.json`.
- Tabela `webhook_events` em Postgres/SQLite e migration `migrations/20260617_001_webhook_events.sql`.
- Ledger persistente de webhooks em `server/integrations/webhook-ledger.ts`.
- Testes unitarios para ledger persistente, hardening de webhooks e HTML estatico SEO.
- Manifesto SEO publico em `script/public-seo-manifest.ts`.
- Gerador de HTML estatico publico em `script/generate-static-public-html.ts`.
- Rota `/sitemap-dynamic.xml` para o sitemap dinamico.
- Testes unitarios `cron-runtime-guards`, `backup-pitr-readiness`, `deploy-workflow-policy` e `security-go-live-guards`.

### Changed

- Canonical padronizado em `https://imobibase.com.br`.
- Sitemap e robots alinhados a rotas publicas reais.
- Home ampliada com conteudo de plataforma completa.
- Paginas publicas de tenant/catalogo/imovel com SEO estruturado.
- Formulario de interesse reposicionado para atendimento/agendamento.
- Melhorias de acessibilidade e responsividade.
- `script/build.ts` agora gera `api/index.mjs` sem vazar `message`/`stack` em producao.
- `server/api-handler.ts` e `server/routes.ts` passaram a usar a mesma origem de configuracao CORS.
- `.env.example` padronizado para `CORS_ORIGINS` com dominio `.com.br`.
- Rotas `/api/visits` agora validam tenant de imovel, lead e corretor antes de criar/atualizar.
- Rotas `/api/visits` agora bloqueiam conflito ativo de 60 minutos por imovel ou corretor.
- ISA WhatsApp passou a criar visitas por `createVisitWithPolicy`, reutilizando validacao de tenant e conflito.
- Kanban de leads passou a consumir `/api/leads/sla/summary` e exibir alertas de primeiro atendimento, fora do SLA, parados, urgentes e sem corretor.
- SLA de lead parado passou a considerar a ultima interacao.
- `POST /api/interactions` atualiza `updatedAt` do lead atendido.
- Criacao/edicao de leads e follow-ups validam responsavel/lead contra o tenant.
- Rotas publicas de solucao, contato e novidades deixaram de disparar `/api/auth/me`.
- Preload global do mockup do dashboard foi removido.
- Footer compacto e botoes finais de termos/privacidade permitem quebra em telas pequenas.
- `vercel.json` passou a incluir `database-backup` e ficou alinhado ao manifesto de crons.
- `routes-cron.ts`, status de cron e fallback `node-cron` passaram a usar a mesma fonte de verdade.
- `backup-processor` passou a aceitar upload duravel por URL PUT pre-assinada.
- Workers/fallback em servidores persistentes podem ser habilitados por `ENABLE_BACKGROUND_JOBS=true`, sem afetar Vercel.
- `scripts/security/pen-test.ts` foi atualizado para endpoints atuais.
- Stripe, Mercado Pago e ClickSign passaram a usar ledger persistente para idempotencia de webhooks.
- ClickSign passou a validar HMAC sobre `rawBody` com comparacao timing-safe.
- IPN legado do Mercado Pago ficou desabilitado por padrao e exige segredo quando habilitado.
- Webhook legado da ISA ficou desabilitado por padrao em producao.
- `RLS_enable.sql` passou a cobrir `webhook_events`.
- `script/build.ts` passou a gerar HTML estatico para 11 rotas publicas conhecidas apos o build Vite.
- `sitemap.xml` estatico passou a vir do manifesto publico, enquanto `/sitemap-dynamic.xml` atende URLs dinamicas.
- `robots.txt` passou a declarar os sitemaps estatico e dinamico.
- `server/api-handler.ts` passou a registrar `cookie-parser` e aceitar `Authorization` no preflight serverless.
- CORS de producao passou a usar defaults seguros sem localhost e sem dominio legado `.com`.
- `/api/cron/*` passou a usar lock distribuido Redis, skip de duplicata e status de ultima execucao.
- `backup-processor` passou a aceitar Supabase PITR como estrategia DR explicita sem exigir `pg_dump` no serverless.
- Workflow de producao deixou de rodar `npm run db:migrate` cego apos deploy e passou a validar o manifesto de crons.
- Artefatos Playwright (`test-results/`, `playwright-report/`) foram removidos do versionamento e ignorados.
- Vistorias passaram a validar ownership por tenant de `propertyId`, `rentalContractId` e `renterId` antes da criacao e do relatorio.
- Setup TOTP/2FA passou a gerar QR Code localmente com `qrcode`, sem enviar segredo para API externa.

### Validated

- `npm run check`.
- `npm run build`.
- `npm run test`: 78 arquivos, 1376 testes aprovados, 1 ignorado.
- `npm run test`: 79 arquivos, 1386 testes aprovados, 1 ignorado apos a rodada P1/P2 adicional.
- `npm audit --json`: 0 vulnerabilidades reportadas.
- `npm run lint -- --format json`: 5166 warnings, 0 errors.
- `npm run lint -- --format json`: 5166 warnings, 0 errors apos a rodada P1/P2 adicional.
- `npm run test:coverage`: statements 11,1%, branches 8,19%, functions 8,84%, lines 11,51%.
- Testes focados CORS/SLA/agenda: 21 testes aprovados.
- Testes focados CORS/SLA/agenda/cron: 23 testes aprovados.
- `npm run ops:cron:verify`: aprovado.
- `npm run ops:backup:verify`: aprovado em modo PITR explicito.
- `npm run test`: 80 arquivos, 1388 testes aprovados, 1 ignorado apos a rodada P0 critica.
- `npm run build`: aprovado apos a rodada P0 critica.
- `npm run lint -- --format json`: 5166 warnings, 0 errors apos a rodada P0 critica.
- Testes focados de ledger/webhook/SEO/schema: 13 testes aprovados.
- Teste de integracao de validacao de webhooks: 25 testes aprovados.
- `npm run test`: 83 arquivos, 1398 testes aprovados, 1 ignorado apos a rodada P0/P2 de continuidade.
- `npm run build`: aprovado e gerou HTML estatico para 11 rotas publicas.
- `npm run seo:sitemap`: aprovado.
- Testes focados `security-go-live-guards`, `cors-config`, `cron-runtime-guards` e `backup-pitr-readiness`: 12 testes aprovados.
- `npm run ops:backup:verify`: aprovado em modo Supabase PITR explicito.
- `npm run ops:cron:verify`: aprovado apos hardening operacional.
- `npm run check`: aprovado apos a rodada Go Live operacional/seguranca.
- `npm run lint -- --quiet`: aprovado sem erros bloqueantes.
- `npm run test`: 87 arquivos, 1410 testes aprovados, 1 ignorado apos a rodada Go Live operacional/seguranca.
- `npm run build`: aprovado apos a rodada Go Live operacional/seguranca.
- `npm run test:smoke:e2e`: 8 testes Chromium aprovados.
- `npm run lint -- --format json`: 5166 warnings, 0 errors apos a rodada P0/P2 de continuidade.
- Checks Playwright de meta/canonical/JSON-LD/overflow.
- Playwright em preview local: `/contato`, `/novidades`, `/termos`, `/privacidade` sem overflow horizontal em 320px e 390px.
- Lighthouse home: SEO 100, acessibilidade 100, boas praticas 96, performance 74.
