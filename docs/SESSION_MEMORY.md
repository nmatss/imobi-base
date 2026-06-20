# Session Memory

Atualizado em: 17/06/2026

## Solicitacao atendida

O usuario pediu analise profunda de arquitetura, banco, hospedagem, SEO, IA, responsividade e concorrentes, alem de aplicacao de melhorias e geracao de PDF profissional.

## Descobertas principais

- O sistema e um SaaS imobiliario multi-tenant com frontend React/Vite e backend Node/Express.
- Deploy principal configurado na Vercel em `gru1`.
- Banco de producao apontou para Supabase pooler em `us-east-1`, criando risco de latencia frente ao deploy no Brasil.
- SEO tecnico tinha inconsistencias de dominio `.com` vs `.com.br`.
- Sitemap dinamico anunciava rotas privadas `/properties`.
- Home nao cobria suficientemente termos de busca como CRM imobiliario, sistema imobiliario completo, agenda de visitas e site para imobiliaria.
- Concorrentes vendem ecossistema completo: CRM, site, portais, WhatsApp, agenda, BI, locacao/financeiro, app, contratos e IA.

## Alteracoes aplicadas nesta sessao

- Padronizacao de canonical em `https://imobibase.com.br`.
- Ajuste de `robots.txt`.
- Regeneracao e ampliacao de `sitemap.xml`.
- Ajuste de sitemap dinamico para URLs publicas `/e/:tenantSlug/imovel/:id`.
- Criacao de paginas publicas:
  - `/sistema-imobiliario-completo`
  - `/crm-imobiliario`
  - `/software-de-agendamento-imobiliario`
  - `/site-para-imobiliaria`
  - `/crm-imobiliario-com-ia`
- Aplicacao de JSON-LD/canonical em paginas publicas de tenant, catalogo e imovel.
- Home ampliada com secao de plataforma completa.
- Melhorias de acessibilidade em botoes, galeria, newsletter, switch e iframe.
- Melhorias de responsividade na home.
- Geracao de imagens AVIF/WebP para o mockup do dashboard.
- Geracao do PDF profissional de arquitetura, SEO e mercado.
- Copia do PDF para `C:\\Users\\nic20\\Downloads`.
- Criacao deste harness enterprise e documentos de memoria.
- Pacote P0 aplicado em 17/06/2026:
  - helper unico de CORS em `server/config/cors.ts`;
  - serverless e Express agora usam a mesma origem de verdade (`CORS_ORIGINS`) com compatibilidade legada para `ALLOWED_ORIGINS`;
  - dominios `.com.br` adicionados aos defaults e ao `.env.example`;
  - wrapper `api/index.mjs` gerado por `script/build.ts` deixou de vazar `message`/`stack` em producao quando ocorre falha de cold-start;
  - testes adicionados em `tests/unit/cors-config.test.ts`.
- Pacote P1 inicial aplicado em 17/06/2026:
  - regra de disponibilidade em `server/services/visit-scheduling.ts`;
  - `/api/visits` agora valida conflito ativo de 60 minutos por imovel e por corretor;
  - `/api/visits` agora valida que imovel, lead e corretor pertencem ao mesmo tenant antes de criar/atualizar;
  - testes adicionados em `tests/unit/visit-scheduling.test.ts`.
- Rodada P1/P2 adicional em 17/06/2026:
  - `server/services/lead-sla.ts` agora calcula primeiro atendimento, lead parado pela ultima interacao, prioridade e proxima acao;
  - `/api/leads/sla/summary` exposto para resumo de SLA do funil;
  - Kanban de leads consome o resumo de SLA e exibe alertas de primeiro atendimento, fora do SLA, parados, urgentes e sem corretor;
  - politica de agendamento foi centralizada em `createVisitWithPolicy` e passou a ser usada tambem pela ISA WhatsApp;
  - criacao/edicao de leads e follow-ups validam `assignedTo`/`leadId` contra o tenant;
  - novas interacoes atualizam `updatedAt` do lead via `storage.touchLead`;
  - rotas publicas de solucao/contato/novidades nao disparam mais `/api/auth/me`;
  - preload global do mockup do dashboard foi removido de `client/index.html`;
  - footer compacto e botoes finais de termos/privacidade foram ajustados para mobile.
- Rodada P0 critica adicional em 17/06/2026:
  - criado `server/jobs/cron-manifest.ts` como fonte unica para cron HTTP, fallback `node-cron` e `vercel.json`;
  - `database-backup` foi adicionado ao `vercel.json`;
  - `cleanup-sessions`, `cleanup-logs`, `integration-sync`, `cleanup-soft-deletes` e `enforce-plan-limits` foram alinhados ao manifesto;
  - criado `npm run ops:cron:verify`;
  - `server/jobs/processors/backup-processor.ts` passou a suportar upload duravel por `BACKUP_UPLOAD_URL_TEMPLATE`/`BACKUP_UPLOAD_URL`;
  - criado `npm run ops:backup:verify`;
  - criado `npm run ops:restore:drill` para restore em banco isolado;
  - criado `npm run db:rls:verify` para validar role runtime, `BYPASSRLS`, owner, `ENABLE/FORCE RLS` e policies;
  - atualizado `scripts/security/pen-test.ts` para endpoints atuais e exposto `npm run security:pentest`;
  - `ENABLE_BACKGROUND_JOBS=true` habilita workers/fallback em servidores persistentes sem afetar Vercel.
- Rodada P0/P2 de continuidade em 17/06/2026:
  - criada tabela `webhook_events` no schema Postgres/SQLite e migration `migrations/20260617_001_webhook_events.sql`;
  - criado ledger persistente de webhooks em `server/integrations/webhook-ledger.ts`, removendo dependencia de Redis como unico mecanismo de idempotencia para webhooks criticos;
  - Stripe e Mercado Pago passaram a reservar/processar/falhar eventos pelo ledger persistente;
  - ClickSign passou a validar HMAC sobre `rawBody`, aceitar assinatura hex ou `sha256=`, usar `timingSafeEqual` e registrar idempotencia no ledger;
  - IPN legado do Mercado Pago ficou desabilitado por padrao e, quando habilitado, exige segredo explicito;
  - webhook legado da ISA ficou desabilitado por padrao em producao, mantendo trafego oficial no webhook WhatsApp validado pela Meta;
  - RLS passou a cobrir `webhook_events`;
  - criado manifesto SEO publico em `script/public-seo-manifest.ts`;
  - `script/generate-sitemap.ts` passou a gerar `client/public/sitemap.xml` a partir do manifesto publico;
  - criado `script/generate-static-public-html.ts` e o build agora gera HTML estatico por rota publica conhecida com title, description, canonical, OG/Twitter e JSON-LD sem depender de JS;
  - `/sitemap-dynamic.xml` foi exposto para o sitemap dinamico, mantendo `/sitemap.xml` como arquivo estatico do build;
  - `robots.txt` passou a anunciar os dois sitemaps.
- Rodada Go Live operacional/seguranca em 17/06/2026:
  - defaults de CORS em producao nao permitem mais localhost nem dominio legado `.com`;
  - `server/api-handler.ts` registra `cookie-parser` e inclui `Authorization` no preflight serverless, preservando CSRF e portal por cookie em Vercel;
  - `/api/cron/*` ganhou lock distribuido via Redis, skip de duplicata e status de ultima execucao em `/api/cron/status`;
  - `backup-processor` suporta modo Supabase PITR explicito sem exigir `pg_dump` em serverless;
  - workflow de producao deixou de rodar `npm run db:migrate` cego apos deploy e passou a validar `npm run ops:cron:verify`;
  - artefatos Playwright (`test-results/`, `playwright-report/`) foram removidos do versionamento e adicionados ao `.gitignore`;
  - `POST /api/inspections` valida `propertyId`, `rentalContractId` e `renterId` contra o tenant, e o relatorio de vistoria revalida o imovel antes de renderizar;
  - setup TOTP/2FA gera QR Code localmente via pacote `qrcode` e nao envia mais `otpauth://...secret=...` para API externa;
  - adicionados testes `cron-runtime-guards`, `backup-pitr-readiness`, `deploy-workflow-policy` e `security-go-live-guards`.
- Continuacao do plano rumo a 10/10 em 17/06/2026:
  - `server/routes.ts` ganhou helpers de referencia por tenant para imovel, locador, inquilino, contrato de aluguel e categoria financeira;
  - criacao/edicao de contratos, contratos de aluguel, pagamentos, repasses, propostas, vendas e lancamentos financeiros validam FKs contra o tenant antes de persistir;
  - `POST /api/avm/evaluate` valida `propertyId` opcional contra o tenant antes de gravar avaliacao;
  - adicionado teste `tests/unit/tenant-fk-ownership-guards.test.ts`.
- Bloco anti-SSRF/upload em 17/06/2026:
  - `server/security/url-validator.ts` ganhou `validateExternalUrlResolved` e `fetchExternalUrl`, com resolucao DNS, bloqueio de IP privado em respostas DNS, redirect manual e timeout;
  - security webhooks passaram a usar `fetchExternalUrl` com redirect bloqueado para POST;
  - download de midia do WhatsApp passou a usar `fetchExternalUrl`, e `/api/whatsapp/send-media` passou a resolver DNS antes de enfileirar URL de midia;
  - upload generico deixou de aceitar bucket arbitrario incompatível com o `fileType`;
  - upload de imagens de imovel passou a limitar 10 arquivos de ate 10MB, lote maximo de 50MB e validar que `propertyId` pertence ao tenant;
  - adicionados testes `url-validator`, `ssrf-protection`, `upload-hardening-source` e `ssrf-fetch-adoption-source` para as novas garantias.
- Bloco 2FA/WhatsApp ledger em 17/06/2026:
  - rate limit/lockout de 2FA em `server/routes-security.ts` passou a usar Redis quando `REDIS_URL` esta configurado, com fallback local apenas para dev/test ou indisponibilidade explicita;
  - verificacao, validacao e desativacao de 2FA agora aguardam o rate limit distribuido e limpam a chave Redis em sucesso;
  - webhook oficial do WhatsApp em `server/routes-whatsapp.ts` passou a gerar ID estavel por change, reservar no ledger persistente, ignorar duplicatas e marcar sucesso/falha em `webhook_events`;
  - adicionados testes `two-factor-redis-rate-limit-source` e `whatsapp-webhook-ledger-source`.
- Bloco gate Go Live em 17/06/2026:
  - criado `script/verify-go-live-readiness.ts` com modos `static`, `deploy` e `strict`;
  - adicionados scripts `ops:go-live:verify`, `ops:go-live:verify:static` e `ops:go-live:verify:strict`;
  - workflow de producao passou a rodar `npm run ops:go-live:verify:strict` apos `vercel pull`/build e antes do deploy, com `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` no ambiente do job;
  - `docs/GO_LIVE_CHECKLIST.md`, `docs/RUNBOOK.md` e `docs/DEPLOYMENT_RUNBOOK.md` passaram a documentar o gate unificado;
  - adicionado teste `tests/unit/go-live-readiness-gate.test.ts`.
- Bloco opt-out/unsubscribe em 17/06/2026:
  - criada migration `20260617_002_newsletter_opt_out.sql` com campos `unsubscribed_at`, `unsubscribe_reason` e `resubscribed_at`;
  - `storage.unsubscribeNewsletter` agora persiste supressao mesmo sem assinatura previa e `subscribeNewsletter` nao reativa opt-out silenciosamente;
  - `POST /api/email/send-bulk` filtra destinatarios descadastrados;
  - adicionados testes `newsletter-opt-out-storage` e `newsletter-opt-out-source`.
- Bloco CRM/lead score em 17/06/2026:
  - backend passou a expor `POST /api/leads/:leadId/score/calculate`, mantendo compatibilidade com `POST /api/leads/:leadId/score`;
  - respostas calculadas agora incluem `calculated`, `calculatedAt`, `lastCalculated`, `trend` e `scoreHistory` normalizado;
  - `LeadScoreDisplay` trata `{ calculated:false }` como estado vazio e nao tenta renderizar score inexistente;
  - adicionado teste `lead-score-contract-source`.
- Bloco segurança hardening em 17/06/2026:
  - unsubscribe público passou a exigir token com assinatura HMAC (fallback legado sem assinatura foi removido);
  - rota pública `/api/signatures/token/:token` passou a recusar vínculo com contratos vencidos antes de marcar como visualizado;
  - assinatura pública inválida/expirada retorna `Link expirado` e não vaza metadados de contrato;
  - `/api/files/:id/url` agora limita `expiresIn` entre 60s e 3600s.

## Validacoes executadas

- `npm run check`: passou.
- `npm run build`: passou.
- Playwright local: canonical, uma meta description por rota, JSON-LD e sem overflow horizontal nas paginas publicas novas.
- Lighthouse home: Performance 74, Acessibilidade 100, Boas praticas 96, SEO 100.
- Baseline enterprise em 17/06/2026:
  - `npm audit --json`: 0 vulnerabilidades reportadas.
  - `npm run lint -- --format json`: 5166 warnings, 0 errors.
  - `npm run test:coverage`: 1365 testes passaram, 1 ignorado; statements 11,1%, branches 8,19%, functions 8,84%, lines 11,51%.
  - `npm run test`: 78 arquivos passaram; 1376 testes passaram, 1 ignorado.
  - Testes P0 focados: `tests/unit/cors-config.test.ts`, `db-rls-context`, `rls-migration-parity`, `auth-rls-context`: 30 testes passaram.
  - Testes P1 agenda: `tests/unit/visit-scheduling.test.ts`: 7 testes passaram.
- Validacao final da rodada P1/P2 em 17/06/2026:
  - `npm run check`: passou.
  - `npm run test`: 79 arquivos passaram; 1386 testes passaram, 1 ignorado.
  - `npm run build`: passou.
  - `npm run lint -- --format json`: 5166 warnings, 0 errors.
  - Testes focados CORS/SLA/agenda: 21 testes passaram.
  - Playwright em preview local: `/contato`, `/novidades`, `/termos`, `/privacidade` sem overflow horizontal em 320px e 390px.
- Validacao P0 critica em 17/06/2026:
  - `npm run ops:cron:verify`: passou, 11 jobs alinhados.
  - `DATABASE_URL=postgresql://user:pass@localhost:5432/db BACKUP_OPTIONAL=true SUPABASE_PITR_ENABLED=true npm run ops:backup:verify`: passou.
  - Testes focados CORS/SLA/agenda/cron: 23 testes passaram.
  - `npm run check`: passou apos ajustes P0.
  - `npm run lint -- --format json`: 5166 warnings, 0 errors.
  - `npm run test`: 80 arquivos passaram; 1388 testes passaram, 1 ignorado.
  - `npm run build`: passou.
- Validacao P0/P2 de continuidade em 17/06/2026:
  - `npm run check`: passou.
  - Testes focados de ledger/webhook/SEO/schema: 13 testes passaram.
  - `npm run test:integration -- tests/integration/security/webhook-validation.test.ts --reporter=verbose`: 25 testes passaram.
  - `npm run test`: 83 arquivos passaram; 1398 testes passaram, 1 ignorado.
  - `npm run build`: passou e gerou HTML estatico para 11 rotas publicas.
  - `npm run lint -- --format json`: 5166 warnings, 0 errors.
  - `npm run seo:sitemap`: passou.
  - Verificacao de HTML gerado confirmou title/description/canonical corretos, apenas uma meta description e preload do hero somente na home.
- Validacao focada da rodada Go Live operacional/seguranca em 17/06/2026:
  - `npm run check`: passou.
  - Testes focados `security-go-live-guards`, `cors-config`, `cron-runtime-guards` e `backup-pitr-readiness`: 12 testes passaram.
  - `DATABASE_URL=postgresql://user:pass@localhost:5432/db BACKUP_OPTIONAL=true SUPABASE_PITR_ENABLED=true npm run ops:backup:verify`: passou.
  - `npm run ops:cron:verify`: passou.
- Validacao final da rodada Go Live operacional/seguranca em 17/06/2026:
  - `npm run check`: passou.
  - `npm run lint -- --quiet`: passou, sem erros bloqueantes.
  - `npm run test`: 87 arquivos passaram; 1410 testes passaram, 1 ignorado.
  - `npm run build`: passou e gerou HTML estatico para 11 rotas publicas.
  - `npm run seo:sitemap`: passou.
  - `npm run ops:cron:verify`: passou, 11 jobs alinhados com `vercel.json`.
  - `DATABASE_URL=postgresql://user:pass@localhost:5432/db BACKUP_OPTIONAL=true SUPABASE_PITR_ENABLED=true npm run ops:backup:verify`: passou.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
- Validacao focada da continuacao rumo a 10/10 em 17/06/2026:
  - `npm run check`: passou.
  - Testes focados `tenant-fk-ownership-guards` e `security-go-live-guards`: 4 testes passaram.
  - `npm run lint -- --quiet`: passou, sem erros bloqueantes.
  - `npm run test`: 88 arquivos passaram; 1412 testes passaram, 1 ignorado.
  - `npm run build`: passou e gerou HTML estatico para 11 rotas publicas.
- Validacao focada do bloco anti-SSRF/upload em 17/06/2026:
  - `npm run check`: passou.
  - Testes focados `url-validator`, `ssrf-protection`, `upload-hardening-source` e `ssrf-fetch-adoption-source`: 75 testes passaram.
  - `npm run lint -- --quiet`: passou, sem erros bloqueantes.
  - `npm run test`: 90 arquivos passaram; 1423 testes passaram, 1 ignorado.
  - `npm run build`: passou e gerou HTML estatico para 11 rotas publicas.
- Validacao focada do bloco 2FA/WhatsApp ledger em 17/06/2026:
  - `npm run check`: passou.
  - Testes focados `two-factor-redis-rate-limit-source`, `whatsapp-webhook-ledger-source`, `security-go-live-guards`, `auth-rls-context`, `webhook-validation` e `auth-http`: 50 testes passaram.
  - `npm run lint -- --quiet`: passou, sem erros bloqueantes.
  - `npm run test`: 92 arquivos passaram; 1430 testes passaram, 1 ignorado.
  - `npm run build`: passou e gerou HTML estatico para 11 rotas publicas.
- Validacao focada do bloco gate Go Live em 17/06/2026:
  - `npm run ops:go-live:verify:static`: passou, 12 checks aprovados.
- Validacao focada do bloco opt-out/unsubscribe em 17/06/2026:
  - `npx vitest run tests/unit/backend/newsletter-opt-out-storage.test.ts tests/unit/newsletter-opt-out-source.test.ts tests/unit/backend/email-unsubscribe-token.test.ts --reporter=verbose`: passou, 9 testes.
- Validacao focada do bloco CRM/lead score em 17/06/2026:
  - `npx vitest run tests/unit/lead-score-contract-source.test.ts tests/unit/lead-sla.test.ts tests/unit/feature-routes-map-tenant.test.ts --reporter=verbose`: passou, 15 testes.
- Validacao focada de segurança em 17/06/2026:
  - `tests/unit/backend/email-unsubscribe-token.test.ts`: validando rejeicao de token legado sem assinatura;
  - `tests/unit/feature-routes-signatures-tenant.test.ts`: validade de token de assinatura pública antes de leitura;
  - `tests/unit/feature-routes-signatures-tenant.test.ts`: validade de token de assinatura antes de assinar (`POST /api/signatures/token/:token/sign`) com token vencido;
  - `tests/unit/upload-hardening-source.test.ts`: cobertura de limite de `expiresIn` em `/api/files/:id/url`.
  - `npm run lint -- --quiet`: passou, sem erros bloqueantes.
  - `npx vitest run tests/unit/backend/email-unsubscribe-token.test.ts tests/unit/feature-routes-signatures-tenant.test.ts tests/unit/upload-hardening-source.test.ts tests/unit/lead-score-contract-source.test.ts --reporter=verbose`: passou, 30 testes.
  - `npm run test`: 96 arquivos passaram; 1448 testes passaram, 1 ignorado.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
  - `npm run ops:go-live:verify:static`: passou, 12 checks.

## Revisão de prontidão e score 17/06/2026

- Nota global consolidada: **7.9 / 10 (79/100)**.
- O score por processo está documentado em `docs/qa/GO_LIVE_SCORECARD_2026-06-17.md`.
- Progresso para meta enterprise 99/100: faltam **20 pontos** e os 3 bloqueadores com maior impacto são:
  - validação de RLS em staging/producao com role de aplicação sem `BYPASSRLS`;
  - cobertura de testes com meta >= 80% em branches/functions/lines/statements;
  - execução de pentest externo/manual e evidência de restore drill em ambiente real.

## Pendencias relevantes

- RLS PostgreSQL possui artefatos e verificador; ainda precisa ser aplicado e validado em staging/producao com role nao-owner e sem `BYPASSRLS`.
- Cobertura de testes >= 80%.
- Reducao de warnings de lint.
- Pentest externo/manual.
- Execucao real de restore drill e registro de RPO/RTO.
- Validar locks/status de cron no deploy real com `REDIS_URL` e `CRON_SECRET`.
- Rodar `npm run ops:go-live:verify:strict` contra staging/producao com evidencias reais.
- Provar dinamicamente FK ownership cross-tenant em staging/producao e ampliar testes de isolamento multi-tenant.
- Provar anti-SSRF/upload, Redis 2FA e ledger WhatsApp em staging/producao; evoluir upload para streaming/upload assinado.
- Reducao adicional de LCP e bundle inicial.
- SEO de rotas publicas conhecidas ja possui HTML estatico no build; ainda faltam prerender/SSR ou geracao estatica para vitrines dinamicas de tenant/imovel/cidade/bairro.
- `/sitemap-dynamic.xml` foi roteado para o backend; ainda precisa ser validado no deploy Vercel real.
- Portal comprador/lead, acoes de IA auditaveis, persistencia real de opt-out/unsubscribe e extensao do ledger para WhatsApp ainda estao pendentes.

## Revisao e hardening local 18/06/2026

- Contexto consultado antes das alteracoes:
  - `docs/PROJECT_MEMORY.md`;
  - `docs/SESSION_MEMORY.md`;
  - `docs/ROADMAP.md`;
  - `docs/KNOWN_ISSUES.md`;
  - `docs/TECH_DEBT.md`;
  - `docs/qa/GO_LIVE_SCORECARD_2026-06-17.md`;
  - README, docs de seguranca/testes/deploy e codigo-fonte afetado.
- Fase seguranca/backend concluida localmente:
  - ClickSign document downloads, backup duravel e restore drill remoto agora usam `fetchExternalUrl`.
  - WhatsApp templates/auto-responses e storage de integracoes sanitizam campos imutaveis de payload externo.
  - `/api/files/:id/url` ganhou teste comportamental para clamp 60s-3600s e cross-tenant 403.
  - Unsubscribe publico ganhou teste HTTP para token assinado e rejeicao de token legado.
  - Lookup publico de assinatura ganhou teste de token valido apos validacao/`viewedAt`.
- Fase frontend/layout/formularios concluida localmente:
  - Removidos todos os `SelectItem value=""` em `client/src`.
  - Ajustados botoes de senha sem nome acessivel em signup/reset/portal.
  - Ajustada hierarquia de `h1` em auth e estado visivel para reset de senha com token invalido.
  - Corrigidos links aninhados da vitrine publica `/e/:slug/imoveis`.
  - Corrigido match de rota da vitrine publica `/e/:slug/imoveis`.
  - Corrigido drawer de filtros de `/vendas`.
  - Adicionados labels/autocomplete em newsletter publica.
- Validacoes executadas em 18/06/2026:
  - `npm run check`: passou.
  - `npx vitest run tests/unit/immutable-payload-sanitization-source.test.ts tests/unit/ssrf-fetch-adoption-source.test.ts tests/integration/security/ssrf-protection.test.ts tests/unit/backup-pitr-readiness.test.ts tests/unit/file-url-expiry-route.test.ts tests/unit/email-unsubscribe-route.test.ts tests/unit/feature-routes-signatures-tenant.test.ts --reporter=verbose`: 65 testes passaram.
  - `npm run test`: 99 arquivos passaram; 1462 testes passaram, 1 ignorado.
  - `npm run build`: passou; gerou HTML estatico para 11 rotas publicas.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
  - `npm run lint`: passou com 0 erros e 5179 warnings.
  - Playwright manual inicial: 64 combinacoes rota/viewport; identificou reset invalido em branco e `<a>` aninhado em `/e/sol/imoveis`.
  - Playwright manual apos correcoes: 24 combinacoes rota/viewport; 0 achado acionavel.
- Limites da revisao:
  - Rotas autenticadas internas redirecionaram para `/login` na varredura Playwright manual sem sessao; smoke E2E cobriu login/dashboard/navegacao basica, mas revisao visual completa autenticada ainda precisa de fixture/sessao dedicada.
  - Nao e correto declarar 100% enterprise ate executar RLS, Redis, restore drill, pentest e gate strict em staging/producao real.

## Ajuste de produto 18/06/2026 - balao do assistente IA

- Pedido: disponibilizar o assistente de IA como um balao no sistema.
- Implementado:
  - `client/src/components/AIAssistantBubble.tsx` adiciona botao flutuante no canto inferior direito do layout autenticado.
  - `client/src/components/layout/dashboard-layout.tsx` renderiza o balao em telas protegidas e super admin, sem aparecer nas paginas publicas/login.
  - `client/src/components/AIAssistant.tsx` recebeu `aria-label` no modo icone, label de modulo em portugues e nome acessivel para o botao de copiar resultado.
  - Botao de logout icon-only da sidebar recebeu `aria-label`.
- Validacoes:
  - `npm run check`: passou.
  - Playwright autenticado no dashboard: balao visivel, popover abre, badge em portugues aparece, nenhum botao sem nome com o popover aberto.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
- Deploy:
  - Nao executado nesta rodada porque a condicao "100%" ainda nao esta cumprida; permanecem bloqueios de staging/producao documentados.

## Gate final de deploy 18/06/2026

- Pedido: revisar se o sistema estava 100% funcionando e executar deploy se estivesse 100%.
- Resultado: deploy **nao executado**. A condicao "100%" nao foi comprovada e os gates de producao bloquearam a liberacao.
- Evidencias locais aprovadas:
  - `npm run check`: passou.
  - `npm run check:scripts`: passou.
  - `npm run ops:go-live:verify:static`: passou, 12 checks.
  - `git diff --check`: passou.
  - `npm run test`: 99 arquivos passaram; 1462 testes passaram, 1 ignorado.
  - `npm run build`: passou; gerou HTML estatico para 11 rotas publicas.
  - `npm run lint -- --quiet`: passou sem erros.
  - `npm run lint`: passou com 0 erros e 5180 warnings.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
- Evidencias bloqueadoras:
  - `npm run ops:go-live:verify:strict`: falhou com 11 falhas, incluindo URL canonica ausente, chaves Stripe/WhatsApp ausentes, estrategia de backup ausente, autenticacao do banco falhando, RLS runtime sem sucesso e ausencia de evidencia de restore drill/pentest.
  - `npm run test:coverage:enterprise`: falhou contra gate 80%; linhas 12,90%, statements 12,44%, functions 10,11%, branches 9,50%.
  - `git status --short`: worktree segue com alteracoes nao commitadas e arquivos novos, o que impede um deploy de producao rastreavel.
  - Revisao paralela de seguranca/deploy confirmou bloqueios de RLS real, gates operacionais, migrations sem prova em staging/producao, upload generico por `entityType/entityId` e roteamento WhatsApp por `phoneNumberId`.
  - Revisao paralela de documentacao confirmou que a documentacao sustenta pre-go-live local, nao Go Live enterprise 100%.

## Hardening pos-gate 18/06/2026

- Pedido: continuar revisando ate obter garantias totais.
- Posicionamento tecnico: garantia "1000%" nao e promessa honesta; a revisao foi transformada em gates objetivos e bloqueios rastreaveis.
- Correcoes locais aplicadas:
  - `scripts/deploy.sh` passou a executar `npm run check:scripts`, `npm run lint -- --quiet` e, em producao, `npm run ops:go-live:verify:strict` antes de publicar.
  - `scripts/deploy.sh` e `scripts/rollback.sh` foram alinhados para `https://imobibase.com.br`.
  - Push automatico de tag no deploy manual virou opt-in por `PUSH_RELEASE_TAG=true`.
  - Upload generico/documentos passou a validar ownership de `entityType`/`entityId` antes de chamar upload/storage; tipos desconhecidos, campos incompletos e entidades de outro tenant falham fechado.
  - Resolucao de tenant do webhook WhatsApp por `phoneNumberId` passou a acumular matches e retornar `null` quando houver mais de um tenant, evitando roteamento silencioso ao primeiro tenant.
- Testes adicionados/atualizados:
  - `tests/unit/file-upload-entity-ownership-route.test.ts`;
  - `tests/unit/upload-hardening-source.test.ts`;
  - `tests/unit/whatsapp-webhook-ledger-source.test.ts`;
  - `tests/unit/deploy-workflow-policy.test.ts`.
- Validacoes executadas:
  - `npm run check`: passou.
  - `npm run check:scripts`: passou.
  - `npm run lint -- --quiet`: passou.
  - `npx vitest run tests/unit/deploy-workflow-policy.test.ts tests/unit/upload-hardening-source.test.ts tests/unit/whatsapp-webhook-ledger-source.test.ts --reporter=verbose`: 14 testes passaram.
  - `npx vitest run tests/unit/file-upload-entity-ownership-route.test.ts tests/unit/file-url-expiry-route.test.ts --reporter=verbose`: 7 testes passaram.
  - `npm run test`: 100 arquivos passaram; 1468 testes passaram, 1 ignorado.
  - `npm run ops:go-live:verify:static`: passou, 12 checks.
  - `bash -n scripts/deploy.sh && bash -n scripts/rollback.sh`: passou.
  - `npm run build`: passou; ainda exibiu chunk circular e bundles grandes.
  - `git diff --check`: passou.
  - `npm run ops:go-live:verify:strict`: falhou novamente com 11 falhas de ambiente/evidencia real.
  - `npm run test:coverage:enterprise`: falhou contra gate 80%; linhas 12,90%, statements 12,44%, functions 10,11%, branches 9,50%.
- Estado apos hardening:
  - Bloqueios locais de deploy manual, upload generico e roteamento WhatsApp duplicado foram reduzidos.
  - Producao continua bloqueada ate `ops:go-live:verify:strict`, cobertura enterprise, RLS/backup/restore/pentest e evidencias de staging/producao passarem.

## Readiness consolidado 18/06/2026

- Relatorio criado: `docs/qa/PRODUCTION_READINESS_WORKLOG_2026-06-18.md`.
- Melhorias adicionais aplicadas:
  - Deploy manual de Vercel passou a usar `vercel build` + `vercel deploy --prebuilt`.
  - Deploy manual passou a falhar quando nenhum target de deploy for executado.
  - Migrations automaticas em producao foram desabilitadas no deploy manual.
  - `script/verify-go-live-readiness.ts` passou a validar RLS forçado de `webhook_events`, colunas/indice de opt-out e registros de migrations criticas no banco real.
  - `migrations/20260618_001_whatsapp_phone_number_unique.sql` adicionou indice unico parcial para impedir `phoneNumberId` WhatsApp duplicado em integracoes configuradas.
  - Saida de erro de subcomandos do gate strict passou a priorizar linhas de falha.
  - `vite.config.ts` agrupou overlays Radix em `vendor-ui-overlays`, removendo o alerta de chunk circular no build.
- Validacoes adicionais:
  - `npm run check`: passou.
  - `npm run check:scripts`: passou.
  - `npm run lint -- --quiet`: passou.
  - `npx vitest run tests/unit/go-live-readiness-gate.test.ts tests/unit/deploy-workflow-policy.test.ts --reporter=verbose`: 11 testes passaram.
  - `npx vitest run tests/unit/go-live-readiness-gate.test.ts tests/unit/whatsapp-webhook-ledger-source.test.ts --reporter=verbose`: 13 testes passaram.
  - `npm run ops:go-live:verify:static`: passou, 13 checks.
  - `npm run test`: 100 arquivos passaram; 1471 testes passaram, 1 ignorado.
  - `npm run build`: passou sem alerta de chunk circular.
  - `npm run ops:go-live:verify:strict`: ainda falhou com 11 falhas de ambiente/evidencia real.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium apos o pacote final de deploy/backend.

## Revisao paralela final 18/06/2026

- Revisores paralelos apontaram achados locais corrigiveis e bloqueios externos restantes.
- Correcoes aplicadas apos a revisao:
  - `phoneNumberId` do WhatsApp passou a ser normalizado em helper compartilhado, na persistencia de integracoes e no roteamento do webhook oficial.
  - Balao global da IA passou a evitar conflito com a pagina de settings e a subir em rotas mobile com barras/FABs fixos.
  - CTAs publicos foram convertidos para `Button asChild`; menus mobile, botoes icon-only e swatches de cor receberam atributos acessiveis.
  - `scripts/rollback.sh` passou a exigir alvo explicito no Vercel e removeu fallback por `git checkout`.
  - Workflow de producao passou a notificar Sentry apenas depois de deploy e health check bem-sucedidos.
  - Gate strict passou a exigir `_migrations` e registros das migrations criticas em banco real.
- Validacoes finais:
  - `npm run check`: passou.
  - `npm run check:scripts`: passou.
  - `npm run lint -- --quiet`: passou.
  - `npx vitest run tests/unit/whatsapp-webhook-ledger-source.test.ts tests/unit/deploy-workflow-policy.test.ts tests/unit/go-live-readiness-gate.test.ts --reporter=verbose`: 19 testes passaram.
  - `npm run build`: passou; HTML estatico gerado para 11 rotas publicas.
  - `npm run ops:go-live:verify:static`: passou, 13 checks.
  - `npm run test`: 100 arquivos passaram; 1471 testes passaram, 1 ignorado.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
  - `git diff --check`: passou.
  - `npm run ops:go-live:verify:strict`: falhou com 18 checks aprovados e 11 falhas de ambiente/evidencia real.
  - `npm run test:coverage:enterprise`: falhou contra gate 80%; lines 12,90%, statements 12,44%, functions 10,11%, branches 9,50%.

## Continuidade rumo a 100% - 18/06/2026

- Correcoes locais adicionais:
  - Adicionados testes unitarios para `server/utils/pagination.ts`, `server/utils/pii-mask.ts`, `server/utils/log-sanitizer.ts` e `server/utils/api-response.ts`.
  - `scripts/setup-production.sh` deixou de recomendar `db:push`, `vercel --prod` direto e "Codigo: 100% pronto"; agora aponta para migrations revisadas, RLS runbook e `ops:go-live:verify:strict`.
  - README passou a tratar Redis como obrigatorio em producao e CI/CD de producao como dependente do gate strict, sem migrations automaticas.
  - README, `docs/DEPLOYMENT_RUNBOOK.md`, guias de WhatsApp e storage foram alinhados para evitar deploy/migrations diretos em producao; instrucoes atuais apontam para `npm run deploy:production` e migrations revisadas.
  - Resultado do assistente de IA passou a quebrar linhas longas com `whitespace-pre-wrap`, `break-words` e `overflow-wrap:anywhere`.
  - Lightbox, calendario, Kanban de leads, contratos, upload, cookies, financeiro e CTAs publicos/help receberam nomes acessiveis ou semantica `Button asChild` para remover controles interativos aninhados.
  - Card publico de imovel deixou de renderizar um `Button` dentro do link do card; o CTA visual agora e elemento nao interativo.
- Varreduras locais:
  - `rg -U "<Link...><Button|<Link...><button|<a...><Button" client/src`: 0 ocorrencias apos correcoes.
  - `git diff --check`: passou.
- Validacao focada:
  - `npx vitest run tests/unit/server-utils.test.ts --reporter=verbose`: 9 testes passaram.
- Validacoes completas da rodada:
  - `npm run check`: passou.
  - `npm run check:scripts`: passou.
  - `npm run lint -- --quiet`: passou.
  - `npm run ops:go-live:verify:static`: passou, 13 checks.
  - `npm run ops:cron:verify`: passou, 11 jobs alinhados com `vercel.json`.
  - `npm run test`: 101 arquivos passaram; 1480 testes passaram, 1 ignorado.
  - `npm run build`: passou; HTML estatico gerado para 11 rotas publicas.
  - `npm run test:smoke:e2e`: 8 testes passaram em Chromium.
  - `npm run ops:go-live:verify:strict`: falhou com 18 checks aprovados e 11 falhas de ambiente/evidencia real.
  - `npm run test:coverage:enterprise`: falhou contra gate 80%; lines 12,90%, statements 12,44%, functions 10,11%, branches 9,50%.
- Estado:
  - O codigo local ficou mais forte e validado, mas producao continua **NO-GO** ate ambiente real, cobertura/evidencias e gate strict passarem.
