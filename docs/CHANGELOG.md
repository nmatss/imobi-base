# Changelog

## 2026-06-20

### Added

- **Portal de atendimento ao comprador** (P1): tabelas `buyer_selections`/`buyer_selection_items`, rotas públicas por token (`/api/portal/selection/:token` + página `/s/:token`) com rate-limit e sem vazar PII do lead, respostas aceitar/recusar/comentar e agendamento de visita registrando no CRM; rotas admin tenant-scoped para criar/listar/fechar seleções (`server/routes-buyer-portal.ts`).
- **IA acionável auditável** (P1): tabelas `ai_actions` + `ai_action_audit` (append-only); registry/planner/executor (`server/services/ai-actions/*`) com aprovação humana para `move_stage`/`reactivate_contacts`, idempotência e auditoria before/after; rotas `server/routes-ai-actions.ts` e UI `AIActionReview`.
- **Agenda completa + CRM** (P1): colunas de confirmação/ficha/feedback/próxima-ação em `visits`; confirmação/remarcação por token (`/v/confirm/:token`) com WhatsApp+email; cron `visit-reminders`; deduplicação de leads com índices únicos parciais e resposta 409 em `POST /api/leads`; roleta de distribuição (round-robin/least-loaded); score de oportunidade com pesos por tenant (`lead_score_weights`) mantendo o contrato atual como default.
- **Assinatura digital — bloqueadores legais**: trilha de auditoria com **HMAC-SHA256 real** + `verifyAuditTrailIntegrity` (tamper-evidence); `signature_certificates` persistido e `parseCertificate` via `node:crypto` X509Certificate (subject/serial/validade reais, fim do `MOCK_SERIAL`).
- 80 testes novos: `buyer-portal` (18), `ai-actions` (21), `agenda-crm` (29), `signature-legal` (12). Suíte unit: 745 testes / 67 arquivos.
- Migrations `20260620_001..005` + políticas RLS `tenant_isolation`/`FORCE` para as 6 tabelas novas multi-tenant em `RLS_enable.sql`.

### Verificação

- `tsc` 0 erros, `schema-parity` 3/3, `npm run build` OK, `ops:cron:verify` 12 jobs, `check:scripts` 0.

## 2026-06-18

### Added

- Testes unitarios de utilitarios de servidor em `tests/unit/server-utils.test.ts` cobrindo paginacao, mascara de PII, sanitizacao de logs e envelope de resposta.
- Testes unitarios/comportamentais para:
  - clamp de `expiresIn` e bloqueio cross-tenant em `/api/files/:id/url`;
  - unsubscribe publico assinado, rejeitando token legado sem assinatura;
  - lookup publico de assinatura com token valido apos marcacao de visualizacao;
  - sanitizacao de payloads imutaveis em WhatsApp e integracoes;
  - adocao obrigatoria de `fetchExternalUrl` em ClickSign, backup duravel e restore drill remoto.
- Relatorio QA de fases da revisao 18/06/2026 em `docs/qa/PHASE_REVIEW_2026-06-18.md`.
- Relatorio consolidado de readiness/producao em `docs/qa/PRODUCTION_READINESS_WORKLOG_2026-06-18.md`.
- Balao global do assistente de IA no layout autenticado do sistema.
- Teste comportamental para impedir upload generico associado a entidade de outro tenant.
- Helper para normalizar `phoneNumberId` do WhatsApp em configuracao salva e webhook recebido.

### Changed

- Ajustes adicionais de acessibilidade/layout:
  - resultado do assistente de IA passou a quebrar conteudo longo sem overflow horizontal;
  - lightbox recebeu `aria-label` em fechar, zoom, navegacao, dots e miniaturas;
  - calendario, Kanban de leads, contratos, upload, cookies e tabela financeira receberam nomes acessiveis em botoes icon-only;
  - paginas publicas/help/dashboard/checkout trocaram `Link` envolvendo `Button` por `Button asChild`;
  - card publico de imovel deixou de conter botao real dentro do link do card.
- `scripts/setup-production.sh` deixou de sugerir `db:push`, `vercel --prod` direto e declaracao de codigo "100% pronto"; agora aponta para migrations revisadas, RLS runbook, gate strict e `scripts/deploy.sh production`.
- README passou a documentar Redis como requisito de producao e deploy de producao como dependente de gate strict, sem migrations automaticas.
- README, `docs/DEPLOYMENT_RUNBOOK.md`, guias de WhatsApp e storage passaram a evitar deploy/migrations diretos em producao e a apontar para `npm run deploy:production` e migrations revisadas.
- Downloads de documentos ClickSign, upload duravel de backup e download remoto de restore drill passaram a usar `fetchExternalUrl` com validacao anti-SSRF central.
- Rotas e servicos de WhatsApp passaram a remover campos imutaveis enviados pelo cliente antes de criar/atualizar templates e auto-respostas.
- Persistencia de configuracoes de integracao passou a ignorar campos imutaveis como `id`, `tenantId`, `integrationName`, `createdAt` e `updatedAt` vindos de payload externo.
- Persistencia e resolucao de WhatsApp passaram a normalizar `phoneNumberId` com trim antes de salvar, comparar e abrir contexto RLS.
- Formularios e filtros React/Radix deixaram de usar `SelectItem value=""`, substituindo vazio por sentinelas explicitas.
- CTAs publicos trocaram `Link/a` envolvendo `Button` por `Button asChild`; menus/FABs/swatches receberam nomes e estados acessiveis adicionais.
- Paginas publicas/auth/portal receberam ajustes de acessibilidade em botoes de senha, labels de newsletter, hierarquia de `h1` e estado visivel para token invalido em reset de senha.
- Vitrine publica `/e/:slug/imoveis` deixou de renderizar `<a>` aninhado em links do header/footer.
- Drawer de filtros de `/vendas` deixou de usar classe inexistente `sm:side-right` e passou a abrir como painel lateral responsivo.
- Assistente de IA contextual passou a ter gatilho circular flutuante, labels acessiveis e badges de modulo em portugues.
- Botao icon-only de logout na sidebar passou a ter nome acessivel.
- Deploy manual de producao passou a executar `check:scripts`, lint sem erros e `ops:go-live:verify:strict` antes de publicar; push de tag passou a exigir `PUSH_RELEASE_TAG=true`.
- Deploy manual de Vercel passou a usar artifact prebuilt (`vercel build` + `vercel deploy --prebuilt`) e a falhar quando nenhum target de deploy for executado.
- Migrations automaticas em producao foram desabilitadas no deploy manual; aplicar migrations revisadas deve seguir `docs/DEPLOYMENT_RUNBOOK.md`.
- Scripts manuais de deploy/rollback passaram a usar o dominio canonico `imobibase.com.br`.
- Rollback manual Vercel passou a exigir deployment URL/ID explicito e removeu fallback com `git checkout`; workflow de producao passou a notificar Sentry apenas apos health check aprovado.
- Upload generico/documentos passou a validar ownership de `entityType`/`entityId` antes de fazer upload ou gravar metadados.
- Resolucao de tenant do WhatsApp por `phoneNumberId` passou a falhar fechado quando houver duplicidade entre tenants.
- Gate strict passou a validar RLS de `webhook_events`, campos/indice de opt-out persistente, tabela `_migrations` e registros das migrations criticas quando conectado ao banco real.
- Migration `20260618_001_whatsapp_phone_number_unique.sql` adicionou indice unico parcial para evitar `phoneNumberId` WhatsApp duplicado entre tenants configurados.
- Saida de erro de subcomandos do gate strict passou a priorizar linhas de falha.
- Manual chunking do Vite agrupou overlays Radix em `vendor-ui-overlays`, removendo o alerta de chunk circular no build.
- Sitemap gerado atualizou `lastmod` para 2026-06-18.

### Validated

- Rodada incremental rumo a producao em 18/06/2026:
  - `npx vitest run tests/unit/server-utils.test.ts`: 9 testes passaram.
  - `rg -U "<Link...><Button|<Link...><button|<a...><Button" client/src`: 0 ocorrencias apos correcoes.
  - `npm run check`: passou.
  - `npm run check:scripts`: passou.
  - `npm run lint -- --quiet`: passou.
  - `git diff --check`: passou.
  - `npm run ops:go-live:verify:static`: passou, 13 checks.
  - `npm run ops:cron:verify`: passou, 11 jobs alinhados com `vercel.json`.
  - `npm run test`: 101 arquivos passaram; 1480 testes passaram, 1 ignorado.
  - `npm run build`: passou; HTML estatico gerado para 11 rotas publicas.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
  - `npm run ops:go-live:verify:strict`: falhou com 18 checks aprovados e 11 falhas de ambiente/evidencia real.
  - `npm run test:coverage:enterprise`: falhou contra gate 80% com linhas 12,90%, statements 12,44%, functions 10,11%, branches 9,50%.
- `npm run check`: passou.
- `npm run test`: 100 arquivos passaram; 1471 testes passaram, 1 ignorado.
- Testes focados de seguranca/rotas: 65 testes passaram.
- `npm run build`: passou e gerou HTML estatico para 11 rotas publicas.
- `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
- `npm run lint`: passou com 0 erros; warnings conhecidos permanecem como debito tecnico.
- Playwright manual focado: 24 combinacoes rota/viewport, 0 achado acionavel apos correcoes.
- Playwright autenticado focado confirmou o balao do assistente no dashboard, popover funcional e nenhum botao sem nome com o balao aberto.
- Testes focados pos-gate:
  - `npx vitest run tests/unit/deploy-workflow-policy.test.ts tests/unit/upload-hardening-source.test.ts tests/unit/whatsapp-webhook-ledger-source.test.ts --reporter=verbose`: 14 testes passaram.
  - `npx vitest run tests/unit/file-upload-entity-ownership-route.test.ts tests/unit/file-url-expiry-route.test.ts --reporter=verbose`: 7 testes passaram.
- `bash -n scripts/deploy.sh && bash -n scripts/rollback.sh`: passou.
- `npm run check:scripts`: passou.
- `npm run lint -- --quiet`: passou sem erros.
- `npm run test`: 100 arquivos passaram; 1471 testes passaram, 1 ignorado.
- `npm run ops:go-live:verify:static`: passou, 13 checks.
- `npm run build`: passou sem alerta de chunk circular.
- Gate final de deploy em 18/06/2026:
  - `npm run check`: passou.
  - `npm run check:scripts`: passou.
  - `npm run ops:go-live:verify:static`: passou, 13 checks.
  - `git diff --check`: passou.
  - `npm run lint -- --quiet`: passou sem erros.
  - `npm run lint`: passou com 0 erros e 5180 warnings.
  - `npm run test`: 100 arquivos passaram; 1471 testes passaram, 1 ignorado.
  - `npm run build`: passou sem alerta de chunk circular.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
  - `npm run ops:go-live:verify:strict`: falhou com 18 checks aprovados e 11 falhas.
  - `npm run test:coverage:enterprise`: falhou contra gate 80% com linhas 12,90%, statements 12,44%, functions 10,11%, branches 9,50%.
- Deploy de producao nao foi executado porque os gates estritos e a condicao "100%" nao foram cumpridos.

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
- Teste unitario `tenant-fk-ownership-guards` para travar validacao de FKs por tenant em rotas core.
- Testes focados `upload-hardening-source` e `ssrf-fetch-adoption-source`.
- Testes focados `two-factor-redis-rate-limit-source` e `whatsapp-webhook-ledger-source`.
- Script `script/verify-go-live-readiness.ts` e teste `go-live-readiness-gate`.
- Scripts `ops:go-live:verify`, `ops:go-live:verify:static` e `ops:go-live:verify:strict`.
- Migration `20260617_002_newsletter_opt_out.sql`.
- Testes `newsletter-opt-out-storage` e `newsletter-opt-out-source`.

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
- Contratos, contratos de aluguel, pagamentos, repasses, propostas, vendas, lancamentos financeiros e AVM passaram a validar FKs sensiveis contra o tenant antes de criar/atualizar.
- Guard anti-SSRF passou a resolver DNS, bloquear respostas DNS privadas e seguir redirects manualmente com revalidacao de destino.
- Security webhooks e download de midia do WhatsApp passaram a usar `fetchExternalUrl`; envio de midia WhatsApp resolve DNS antes de enfileirar URL.
- Upload generico passou a bloquear bucket arbitrario incompativel com o `fileType`.
- Upload de imagens de imovel passou a limitar 10 arquivos de ate 10MB, lote maximo de 50MB e validar ownership do `propertyId`.
- Rate limit/lockout de 2FA passou a usar Redis quando `REDIS_URL` esta configurado, mantendo fallback local para dev/test.
- Webhook oficial do WhatsApp passou a usar ledger persistente por change, ignorando duplicatas e marcando falhas para retry.
- Workflow de producao passou a rodar o gate `npm run ops:go-live:verify:strict` antes do deploy e a configurar `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` no job.
- Checklist/runbooks de Go Live passaram a apontar para o gate unificado em modo estatico/deploy/strict.
- Descadastro publico passou a persistir opt-out real, bloquear reativacao silenciosa por subscribe publico e filtrar bulk email para destinatarios optados-out.
- Lead score passou a expor a rota `/api/leads/:leadId/score/calculate` consumida pela UI, com resposta normalizada (`calculatedAt`, `lastCalculated`, `trend`, `calculated`).
- Unsubscribe agora rejeita token não assinado e contratos vencidos em `/api/signatures/token/:token` passam a retornar `Link expirado` antes de expor contrato.
- URL de download privado em `/api/files/:id/url` passou a validar `expiresIn` com teto de 3600s e piso de 60s.
- `/api/signatures/token/:token/sign` passou a validar expiração antes de permitir assinatura, alinhando regra com o fluxo de leitura do token.

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
- Testes focados `tenant-fk-ownership-guards` e `security-go-live-guards`: 4 testes aprovados.
- `npm run lint -- --quiet`: aprovado apos hardening de FK ownership.
- `npm run test`: 88 arquivos, 1412 testes aprovados, 1 ignorado apos hardening de FK ownership.
- `npm run build`: aprovado apos hardening de FK ownership.
- Testes focados `url-validator`, `ssrf-protection`, `upload-hardening-source` e `ssrf-fetch-adoption-source`: 75 testes aprovados.
- `npm run check`: aprovado apos hardening anti-SSRF/upload.
- `npm run lint -- --quiet`: aprovado apos hardening anti-SSRF/upload.
- `npm run test`: 90 arquivos, 1423 testes aprovados, 1 ignorado apos hardening anti-SSRF/upload.
- `npm run build`: aprovado apos hardening anti-SSRF/upload.
- Testes focados `two-factor-redis-rate-limit-source`, `whatsapp-webhook-ledger-source`, `security-go-live-guards`, `auth-rls-context`, `webhook-validation` e `auth-http`: 50 testes aprovados.
- `npm run check`: aprovado apos hardening 2FA/WhatsApp ledger.
- `npm run lint -- --quiet`: aprovado apos hardening 2FA/WhatsApp ledger.
- `npm run test`: 92 arquivos, 1430 testes aprovados, 1 ignorado apos hardening 2FA/WhatsApp ledger.
- `npm run build`: aprovado apos hardening 2FA/WhatsApp ledger.
- `npm run ops:go-live:verify:static`: aprovado, 12 checks.
- `npx vitest run tests/unit/backend/newsletter-opt-out-storage.test.ts tests/unit/newsletter-opt-out-source.test.ts tests/unit/backend/email-unsubscribe-token.test.ts --reporter=verbose`: aprovado, 9 testes.
- `npx vitest run tests/unit/lead-score-contract-source.test.ts tests/unit/lead-sla.test.ts tests/unit/feature-routes-map-tenant.test.ts --reporter=verbose`: aprovado, 15 testes.
- `npm run lint -- --format json`: 5166 warnings, 0 errors apos a rodada P0/P2 de continuidade.
- Checks Playwright de meta/canonical/JSON-LD/overflow.
- Playwright em preview local: `/contato`, `/novidades`, `/termos`, `/privacidade` sem overflow horizontal em 320px e 390px.
- Lighthouse home: SEO 100, acessibilidade 100, boas praticas 96, performance 74.
