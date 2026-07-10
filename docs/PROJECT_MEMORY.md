# Project Memory - ImobiBase

Atualizado em: 18/06/2026

## Objetivo do produto

ImobiBase e um SaaS imobiliario multi-tenant para centralizar operacoes de imobiliarias e corretores: CRM, leads, imoveis, agenda, contratos, locacoes, financeiro, vistorias, portal de clientes, sites publicos, IA, analytics e integracoes.

## Posicionamento estrategico

O diferencial recomendado e posicionar o produto como o sistema que nao perde visitas: captacao do lead, qualificacao, sugestao de imovel, agendamento, confirmacao, visita, feedback, proxima acao e acompanhamento do gestor em um fluxo unico.

## Stack confirmada

- Frontend: React 19, TypeScript, Vite, Wouter, TanStack Query, Tailwind, shadcn/Radix, Framer Motion, PWA.
- Backend: Node.js, Express 5, TypeScript/ESM.
- Banco: PostgreSQL via Drizzle em producao; SQLite como fallback/dev.
- Storage: Supabase Storage.
- Cache/jobs: Redis/BullMQ disponivel; crons HTTP na Vercel.
- Deploy: Vercel, regiao `gru1`, build `npm run build`, output `dist/public`.
- Observabilidade: Sentry, PostHog, GA, web vitals.
- SEO publico: manifest em `script/public-seo-manifest.ts`, sitemap estatico em build e HTML estatico por rota publica conhecida.

## Modulos principais

- Dashboard e KPIs.
- Imoveis.
- CRM/leads/funil/follow-ups.
- Agenda/visitas.
- Contratos e assinatura.
- Locacoes, proprietarios, inquilinos, pagamentos e repasses.
- Vendas, propostas e comissoes.
- Financeiro.
- Relatorios.
- Auto marketing, AVM e ISA.
- Vistorias.
- Portal do proprietario/inquilino.
- Sites publicos por imobiliaria.
- Compliance/LGPD.

## Integracoes

- WhatsApp Business API.
- Stripe.
- Mercado Pago.
- Twilio.
- SendGrid/Resend/SMTP.
- Google Maps/Leaflet.
- ClickSign.
- Supabase.
- Redis.
- Sentry.
- PostHog.
- Google Analytics.
- Anthropic/Claude para IA quando configurado.

## Banco de dados

- Schema PostgreSQL: `shared/schema.ts`.
- Schema SQLite: `shared/schema-sqlite.ts`.
- Migrations PostgreSQL: `migrations/`.
- Migrations SQLite: `migrations-sqlite/`.
- Tabelas multi-tenant dependem de `tenantId`.
- RLS e isolamento por banco sao prioridade enterprise; `webhook_events` tambem esta coberta pela migration RLS.
- Webhooks criticos usam ledger persistente `webhook_events` para idempotencia de Stripe, Mercado Pago e ClickSign.

## Infraestrutura conhecida

- Vercel em `gru1`.
- Variaveis de ambiente indicam Supabase pooler de producao em `aws-1-us-east-1.pooler.supabase.com`.
- Supabase URL de producao identificada pelo host `gpwgbkoliyunaivwylqp.supabase.co`.
- Redis de producao identificado como Redis Cloud em `us-east-1`.
- Risco: latencia por banco/Redis fora da regiao do deploy.

## Guardrails de seguranca confirmados

- Fetch de URL externa deve passar por `server/security/url-validator.ts` via `fetchExternalUrl`, que valida protocolo/host/IP, resolve DNS, bloqueia IP privado em respostas DNS e controla redirects manualmente.
- Upload generico deve resolver bucket por `fileType`; cliente nao deve escolher bucket publico arbitrario.
- Upload generico/documentos deve validar ownership de `entityType`/`entityId` antes de fazer upload ou gravar metadados; tipos desconhecidos ou entidades de outro tenant devem falhar fechado.
- Upload de imagens de imovel esta limitado localmente a 10 arquivos de ate 10MB, lote maximo de 50MB e validacao de tenant do `propertyId`; maturidade 10/10 ainda pede streaming/upload assinado.
- ClickSign document downloads, backup duravel por URL pre-assinada e restore drill remoto tambem devem usar `fetchExternalUrl`; fetch direto de URL externa e proibido para esses fluxos.
- Rate limit/lockout de 2FA usa Redis quando `REDIS_URL` esta configurado; sem Redis, degrada para memoria apenas em dev/test/fallback explicito.
- Webhook oficial do WhatsApp usa `webhook_events` para idempotencia persistente por change roteado ao tenant.
- Resolucao de tenant do WhatsApp por `phoneNumberId` deve falhar fechado quando houver mais de um tenant correspondente; duplicidade de configuracao nao pode rotear silenciosamente para o primeiro tenant.
- `phoneNumberId` do WhatsApp deve ser normalizado pelo helper compartilhado antes de salvar configuracao, comparar no webhook e abrir contexto RLS.
- `migrations/20260618_001_whatsapp_phone_number_unique.sql` deve ser aplicada para impedir `phoneNumberId` duplicado entre integracoes WhatsApp configuradas.
- Links de navegacao nao devem envolver `Button`/`button`; usar `Button asChild` ou elemento visual nao interativo dentro de card-link.
- Botoes icon-only precisam de nome acessivel (`aria-label` ou texto visivel) antes de qualquer release.
- Go Live enterprise deve ser bloqueado por `npm run ops:go-live:verify:strict` no workflow de producao; o modo `strict` exige prova real de Redis, DB, RLS, backup, restore drill e pentest.
- O gate `ops:go-live:verify:strict` tambem deve validar schema/migrations criticas no banco real: `webhook_events`, RLS forçado, campos/indice de opt-out, existencia de `_migrations` e registros de migrations recentes.
- Deploy manual de producao deve seguir o mesmo rigor do workflow: build prebuilt, `ops:go-live:verify:strict`, sem migrations automaticas e sem push de tag sem `PUSH_RELEASE_TAG=true`; rollback Vercel deve receber deployment URL/ID explicito.
- Unsubscribe publico exige token assinado, persiste opt-out em `newsletter_subscriptions`, nao reativa email descadastrado por subscribe publico e bulk email filtra destinatarios optados-out.
- Lead score deve manter contrato API/UI em `/api/leads/:leadId/score/calculate`; GET retorna `calculated:false` para estado vazio e respostas calculadas incluem `calculatedAt` e `trend`.
- Payloads externos de WhatsApp/integracoes nao podem controlar campos imutaveis (`id`, `tenantId`, chaves de integracao e timestamps); manter sanitizacao defensiva na rota e no servico/storage.
- Em componentes Radix Select, nao usar `SelectItem value=""`; usar sentinelas como `__all__` ou `__none__` e converter no `onValueChange`.
- Links publicos Wouter nao devem renderizar `<Link><a>...</a></Link>` nem `<a><Button>...</Button></a>`; usar `Link` direto ou `Button asChild` para evitar erro de hidratacao e controles aninhados.
- Snapshot de prontidão atual (17/06/2026): 79/100, com scorecard consolidado em `docs/qa/GO_LIVE_SCORECARD_2026-06-17.md`; meta enterprise permanece 99/100.
- Validacao local mais recente (18/06/2026): `npm run check`, `npm run check:scripts`, `npm run test` (1480 passed, 1 skipped), `npm run build`, `npm run test:smoke:e2e`, `npm run lint -- --quiet`, `npm run ops:go-live:verify:static`, `npm run ops:cron:verify`, `git diff --check` e varredura de `Link/a > Button` passaram; ainda nao substitui provas de staging/producao. O gate strict (18 pass/11 fail) e a cobertura enterprise (12,90% lines) ainda bloqueiam producao sem evidencias reais.
- Relatorio consolidado de readiness: `docs/qa/PRODUCTION_READINESS_WORKLOG_2026-06-18.md`.
- Revisao go-live completa 2026-06-29: `docs/reports/REVISAO_GO_LIVE_COMPLETA_2026-06-29.md`. Veredito **NO-GO enterprise**. Validacoes locais: `check`, `lint -- --quiet`, `build`, `ops:go-live:verify:static`, `ops:cron:verify`; `test:unit` falhou apenas no caso pre-existente `data-export`. Novos bloqueadores: secrets reais em `.env.production` local, verifier RLS sem child tables, risco de quebra da assinatura publica sob RLS child tables, Microsoft OAuth sem criptografia de tokens, Redis/TLS/fail-open e Playwright/UX driftados.
- Execucao pos-auditoria 2026-06-30: `data-export` corrigido e `npm run test:unit`
  passou 770/770; UX/QA de propriedades/sidebar ajustado; rotas Playwright
  driftadas foram alinhadas; SQLite local ignorado foi atualizado
  aditivamente para smoke; `npm run test:smoke:e2e` passou 8/8; `lead-tags`
  foi extraido para `server/routes/lead-tags.ts` com `tenant-isolation` 27/27,
  `check`, `lint -- --quiet` e `git diff --check` verdes; `GlobalSearch` e
  `TimeoutWarning` viraram lazy chunks apenas para rotas protegidas, reduzindo a
  entry publica local de ~374 kB para ~348 kB; hero da vitrine `/e/:slug`
  recebeu dimensoes/prioridade para LCP/CLS. ADR:
  `docs/ADR/0002-modularizacao-incremental-routes.md`.

## Documentacao importante

- `README.md`
- `docs/SECURITY.md`
- `docs/RLS_RUNBOOK.md`
- `docs/PLANS.md`
- `docs/TESTING.md`
- `docs/DEPLOYMENT_RUNBOOK.md`
- `docs/MONITORING_ANALYTICS_GUIDE.md`
- `docs/PERFORMANCE_INTEGRATION_GUIDE.md`
- `docs/relatorio-arquitetura-seo-mercado-imobibase-2026-06-17.md`
- `docs/relatorio-arquitetura-seo-mercado-imobibase-2026-06-17.pdf`
