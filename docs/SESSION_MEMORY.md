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

## Pendencias relevantes

- RLS PostgreSQL possui artefatos e verificador; ainda precisa ser aplicado e validado em staging/producao com role nao-owner e sem `BYPASSRLS`.
- Cobertura de testes >= 80%.
- Reducao de warnings de lint.
- Pentest externo/manual.
- Execucao real de restore drill e registro de RPO/RTO.
- Validar locks/status de cron no deploy real com `REDIS_URL` e `CRON_SECRET`.
- Provar dinamicamente FK ownership cross-tenant em staging/producao e ampliar testes de isolamento multi-tenant.
- Fortalecer anti-SSRF, upload de imagens e rate limit/lockout distribuido de 2FA.
- Reducao adicional de LCP e bundle inicial.
- SEO de rotas publicas conhecidas ja possui HTML estatico no build; ainda faltam prerender/SSR ou geracao estatica para vitrines dinamicas de tenant/imovel/cidade/bairro.
- `/sitemap-dynamic.xml` foi roteado para o backend; ainda precisa ser validado no deploy Vercel real.
- Portal comprador/lead, acoes de IA auditaveis, persistencia real de opt-out/unsubscribe e extensao do ledger para WhatsApp ainda estao pendentes.
