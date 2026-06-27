# Changelog

All notable changes to ImobiBase are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [2.5.0] - 2026-06-27 — Google SSO + Google Calendar/Meet

> Relatório completo em `docs/reports/GOOGLE_SSO_CALENDAR_2026-06-27.md`.
> PR [#5](https://github.com/nmatss/imobi-base/pull/5) (`feat/google-sso-calendar`).
> Código **dormente** até o dono configurar credenciais Google + verificação do app
> (scope `calendar.events` é sensível). `tsc` verde; 765/766 testes (a 1 falha
> `data-export` é pré-existente).

### Added

- **Google SSO ligado (Onda 1)** — `OAuthButtons` montado em login/signup; **onboarding
  pós-Google** (`server/auth/oauth-provisioning.ts`): usuário Google novo cria nova
  imobiliária + admin (`onboarding_completed=false`) e segue para `/onboarding/agency`
  (`client/src/pages/onboarding/agency.tsx`); endpoint `POST /api/auth/complete-onboarding`.
- **Criptografia de tokens at-rest** — `server/security/token-encryption.ts` (AES-256-GCM
  via `ENCRYPTION_KEY`, fail-closed em produção, retrocompatível com texto puro). Aplicada
  aos tokens OAuth do Google. Novo `tests/unit/token-encryption.test.ts` (6 casos).
- **Google Agenda + Meet por corretor (Onda 2)** — conexão por usuário (scope
  `calendar.events`), tabela `user_calendar_connections` (dual schema + RLS), cliente REST
  `axios` (`server/integrations/google-calendar/client.ts`, sem dep `googleapis`) com
  `conferenceData`=Meet, serviço de sync best-effort, rotas
  `server/routes-google-calendar.ts`, e UI `GoogleCalendarCard.tsx` em Configurações.
- **Schema** — `tenants.onboarding_completed`; colunas de sync em `visits`
  (`googleCalendarEventId/googleMeetUrl/googleSyncState/googleSyncError/lastSyncedAt`);
  migrations `20260627_001_tenant_onboarding.sql` e `20260627_002_google_calendar.sql`
  (+ política RLS em `RLS_enable.sql`).
- **`oauth-state.ts`** estendido com `meta` assinado (HMAC) — carrega `userId/tenantId` no
  callback do connect de Calendar sem depender do cookie de sessão.

### Changed

- **CSP** (`vercel.json`) libera `accounts.google.com`, `oauth2.googleapis.com`,
  `www.googleapis.com` e `*.googleusercontent.com`.
- **`secret-manager.ts`** valida `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ENCRYPTION_KEY`.
- **Visitas** — `POST/PATCH/DELETE /api/visits` sincronizam com o Google Agenda do corretor;
  link do Meet entra nas notificações WhatsApp/e-mail de visita.

## [2.4.0] - 2026-06-22 — Execução do Plano de Excelência (Ondas 0-3 parciais)

> Execução do backlog priorizado em `docs/reports/PLANO_EXCELENCIA_2026-06-22.md`
> (auditoria multi-agente das 10 dimensões). Ações de infra que exigem credenciais
> de produção ficam em `docs/RUNBOOK_EXCELENCIA_DONO.md`.

### Added

- **`server/db-tx.ts`** — `withTenantTransaction(tenantId, fn)`: uma transação com contexto RLS (`SET LOCAL app.tenant_id`), base para mutações atômicas (`FOR UPDATE`/`ON CONFLICT`). (ACT-1)
- **`server/utils/db-errors.ts`** — `isUniqueViolation` agnóstico de driver (PG 23505 / SQLite), compartilhado com `webhook-ledger`. (ACT-2)
- **Decomposição de `routes.ts` iniciada (arch-1)** — `server/routes/_shared.ts` (helpers de erro/validação + família `validate*Reference` de IDOR + tipo `RouteDeps`) e domínios `server/routes/newsletter.ts` e `server/routes/interactions.ts`. `routes.ts`: 4523 → 4349 LOC.
- **`getChartColor`/`getChartPalette`** em `client/src/lib/design-helpers.ts`, ancorados nas CSS vars `--chart-*` (light/dark). (UI-1)
- **Governança/planejamento** — `CLAUDE.md`, `docs/prompts/PROMPT_MASTER_AUDITORIA.md`, `docs/reports/PLANO_EXCELENCIA_2026-06-22.md`, `docs/RUNBOOK_EXCELENCIA_DONO.md`.

### Performance

- **`getDashboardStats`** agrega com `COUNT(*)` no banco (era 4 full-table scans + `.length`) e passa a servir do cache Redis (TTL 60s, invalidado nos creates de lead/property/contract/visit). (PERF-1, ESC-1/PERF-4)
- **`query-cache` ativado** (estava morto, nunca invocado) e tornado **no-op seguro sem `REDIS_URL`** (antes cairia para `localhost:6379`, gerando latência em serverless). (arch-4)
- **Idempotência de pagamento durável** em Redis (`SET NX` + TTL 7d, 409 em concorrência in-flight, fallback observável via Sentry) — antes era `Map` in-process (risco de dupla cobrança em multi-instância). (ACT-3/ESC-2)
- **CDN nos endpoints públicos** de catálogo: carve-out do `no-store` no `vercel.json` + `Cache-Control`/`ETag` em `/api/properties/public/*`. (PERF-2/3)
- **Clamp de paginação** na camada de storage (defesa além do Zod). (ACT-6)

### Fixed / Security

- **Upload**: script/web-shell/SVG-XSS embutido em imagem agora **bloqueia** (era apenas warning); varredura até 256KB. (A4)
- **Race de de-dup de lead** resolvido deterministicamente: violação do índice único parcial → 409 limpo (era 400/500 genérico). (ACT-2)
- **Isolamento de tenant no client**: `logout` e `switchTenant` limpam o cache do React Query; `switchTenant` só aceita tenant autorizado. (FE-1/FE-2)
- **Onboarding** não falha mais silenciosamente — erro vira toast e o fluxo não avança fingindo sucesso. (U1)
- **Leak de timers** no prefetch on-hover (`useRef` + cleanup no unmount). (PERF-8)
- **`db:rls:apply`** passa a cobrir parent + child tables na ordem correta (antes o child vazava para o `db:migrate` normal). (DB-2)
- **Observabilidade**: alerta Sentry quando o rate-limit degrada para store em memória. (ESC-6)

### Removed

- `server/storage-cached.ts` (exemplo de integração morto, substituído pelo cache real). (arch-4)

### Notas

- Confirmado já correto (sem mudança): dedup de webhook atômico em `webhook-ledger.ts` (ACT-4) e contexto RLS nos `POST /api/leads` (ACT-5).
- Todo o trabalho com tsc + build verdes e 759 testes passando (+ novos: idempotência, `db-tx`, dedup de lead, cores de chart, segurança do cache). Permanece 1 falha **pré-existente** em `data-export.test.ts` (fixture).

## [2.3.0] - 2026-06-12 — Nova identidade visual & polimento profissional

### Added

- **Identidade visual nova** — logo "pin predial" (pin de localização com fachada de prédio, janela verde de destaque). SVGs master em `client/public/brand/` (logo-icon, logo-full, logo-full-white, favicon simplificado). Componente React `<Logo>`/`<LogoIcon>` em `client/src/components/brand/logo.tsx` aplicado em sidebar, login, signup, landing, pricing, terms, privacy, footers, 404 e ErrorBoundary.
- **Favicon/ícones completos** — `favicon.svg` + `favicon.ico` (16/32/48) + `apple-touch-icon.png` (180) + `icon-192/512.png` + `icon-maskable-512.png` (safe zone PWA). Gerados por `npm run brand:assets` (`scripts/generate-brand-assets.mjs`, sharp + png-to-ico).
- **manifest.webmanifest** fonte em `client/public/` com `lang: pt-BR`, theme_color #0066CC e ícones novos; `theme-color` meta (light/dark) no index.html.
- **Open Graph novo** — `opengraph.png` 1200x630 (padrão correto; o anterior era 1280x720) com a marca nova; URLs absolutas nas meta tags.
- **Títulos de página** — hook `usePageTitle` aplicado em 30 páginas internas que não tinham título de aba.
- **Página pública de contato** (`/contato`) com form + `POST /api/public/contact` (rate-limited, email para contato@imobibase.com).
- **Changelog público** (`/novidades`) com releases curados em linguagem de usuário.
- **Central de Ajuda in-app** (`/ajuda`) — 11 artigos em 6 categorias com busca client-side; item "Ajuda" no sidebar.
- **Dados de exemplo pós-onboarding** — `POST/DELETE /api/onboarding/demo-data` (6 imóveis, 8 leads, 2 visitas, 4 lançamentos, prefixo `[Exemplo] `); opção "Explorar com dados de exemplo" no wizard e "Limpar dados de exemplo" em Configurações.
- **Checklist de primeiros passos** no dashboard (estado derivado dos dados reais, dispensável).
- **Tour de primeiro acesso** (driver.js) destacando navegação principal — uma vez por usuário, desktop.
- **Preview de templates de email em dev** — `GET /api/email/preview/:templateName` renderiza os 15 templates com dados fake no navegador.

### Fixed

- Copyright "© 2024" hardcoded atualizado para ano dinâmico (client + 5 templates de email).
- `confirm()`/`alert()` nativos substituídos por `ConfirmDialog`/toast em vistorias, AVM, privacidade (LGPD) e página pública de imóvel.
- Botão "Simular financiamento" que só mostrava "em breve" removido da página pública de imóvel.
- Cores semânticas `success`/`warning`/`info` mapeadas no tailwind.config (classes `text-success` etc. não eram geradas no Tailwind 3).
- Emails transacionais sem branding de tenant agora usam o logo padrão da plataforma (antes ficavam sem logo).

## [2.2.0] - 2026-04-21 — Pre-launch hardening & Stripe checkout

### Added

- **Stripe Checkout Session** (hosted) — `POST /api/payments/stripe/create-checkout-session` cria session em modo subscription, redireciona para Stripe-hosted page (PCI-compliant nativa). Substitui o fluxo anterior que não coletava cartão.
- **Stripe Customer Portal** — `POST /api/payments/stripe/create-portal-session` abre portal self-service com upgrade/downgrade/cancel/reactivate/invoices/cartão em uma URL única.
- **Stripe reactivate** — `POST /api/payments/stripe/reactivate-subscription` reverte `cancel_at_period_end=false`.
- **Webhook idempotente** — `stripe-webhooks.ts` usa Redis SETNX (TTL 24h) por `event.id`. Replays do Stripe não reprocessam. Em falha, limpa a chave e responde 500 para Stripe fazer retry automático.
- **Handler `checkout.session.completed`** — persiste `stripeCustomerId` antes do `subscription.created` chegar.
- **Plan downgrade enforcement** — `enforceIntegrationLimit` desconecta integrações excedentes quando tenant faz downgrade. Chamado no webhook + job diário `/api/cron/enforce-plan-limits` (06:30 UTC).
- **Admin bootstrap** — `POST /api/admin/bootstrap` cria o primeiro `super_admin` one-shot (bloqueado após criação), protegido por `ADMIN_BOOTSTRAP_SECRET` + rate-limit 5/h. Aceita credenciais via body ou env fallback (`ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME`).
- **Seed scripts idempotentes** — `script/seed-super-admin.ts`, `script/seed-stripe-prices.ts`, orchestrator `script/setup-first-run.ts` (`npm run setup:first-run`).
- **Tenant resource middleware** — `server/middleware/tenant-resource.ts` centraliza `validateResourceTenant` e adiciona HOF `withTenantResource` para proteção IDOR consistente.
- **`/api/health` composto** — retorna status de database (raw SELECT 1), redis, stripe com latência. Classifica erros de DB em categorias sem vazar credencial.
- **SEO dinâmico por rota** — `SeoHead` component com Helmet + Schema.org JSON-LD (SoftwareApplication + Organization na home, FAQPage + BreadcrumbList em pricing, BreadcrumbList em terms/privacy). noindex em login/signup.
- **Sitemap.xml** — gerado automaticamente no build via `script/generate-sitemap.ts`. Rotas canônicas públicas com `<lastmod>`, `<changefreq>`, `<priority>`.
- **PublicFooter component** — reusado em pricing/terms/privacy com links sociais (Instagram, LinkedIn, YouTube).
- **Social proof na pricing** — stats strip (1.500+ imóveis, 80+ imobiliárias, etc.), 3 testemunhos com autor/cargo, 4 selos (SSL, LGPD, hospedagem BR, SLA 99%).
- **Paginação SQL real** — `getPropertiesByTenant`/`getLeadsByTenant`/`getUsersByTenant` aceitam `{limit, offset}`, aplicam no Drizzle. Novos `countXByTenant`. `Promise.all([get, count])` em `/api/properties`, `/api/leads`, `/api/properties/public/:tenantId`.
- **Pool Postgres configurável** — `max=20, min=2, idleTimeoutMillis=30s, connectionTimeoutMillis=5s` (override via `PG_POOL_*` env).
- **Rate limit em `/api/payments/*`** — `paymentMutationLimiter` 5 req/min por tenant/IP em create-subscription, create-checkout-session, create-portal-session, cancel-subscription, reactivate-subscription, update-payment-method, create-pix, create-boleto.
- **Soft-delete filter** — helper `activeRowsFilter(table)` aplicado em listagens, exclui `deletedAt IS NOT NULL`.
- **Image loading optimization** — atributos `loading/decoding/fetchpriority` em imagens da landing. Script `npm run assets:optimize` gera WebP/AVIF via sharp (opt-in).

### Fixed

- **Typos em pt-BR** — `pricing.tsx`, `terms.tsx`, `privacy.tsx` reescritos com acentuação correta (crítico para LGPD/credibilidade).
- **Webhook metadata preserved** — handlers `subscription.created/updated` agora fazem merge de metadata ao invés de overwrite (preserva `stripeCustomerId` + adiciona `stripeSubscriptionId`).
- **Sitemap.xml resolution** — gerado em `client/public/sitemap.xml` (Vite `root:"client"` só copia daqui). Domínio default `imobibase.com.br`.
- **Build on Vercel** — `script/generate-sitemap.ts` movido de `scripts/` (excluído pelo `.vercelignore`) para `script/` (incluído).
- **Robots.txt** — removido `Disallow: /*.xml$` que bloqueava o próprio sitemap, Sitemap URL corrigido para `.com.br`.

### Infrastructure

- **Supabase Postgres** — projeto `gpwgbkoliyunaivwylqp` (us-east-1, pooler transaction mode)
- **Stripe sandbox** (`acct_1TOjdV4JCD3gv4bh`) — 4 produtos, 8 preços (BRL monthly + yearly), webhook `we_1TOjkCKiHzehqo7Z7iWTUoA1` (10 eventos), Customer Portal `bpc_1TOjkDKiHzehqo7ZqKjOSola`.
- **Vercel** — 9 deploys em produção, domínio `imobibase.com.br`, todas env vars configuradas.

## [2.1.0] - 2026-03-23

### Added

- **5-tier pricing model** — Gratuito (R$0), Starter (R$89), Profissional (R$199), Business (R$399), Enterprise (R$799)
- **Plan enforcement per tenant** — Middleware enforces limits on users, properties, leads/month, and integrations
- **Feature flags system** — 23 feature flags gating premium features (WhatsApp, AI, multi-branch, API, etc.)
- **Plan seed on startup** — `server/seed-plans.ts` upserts 5 canonical plans on every server start
- **GET /api/subscription/usage** — Real-time usage stats endpoint (users, properties, leads, integrations)
- **Auto-create free subscription** — New tenants receive free plan subscription on registration
- **Lead limit enforcement** — `checkLeadLimit` middleware enforces monthly lead limits
- **Stripe plan resolution** — Webhooks auto-update planId on subscription upgrade/downgrade
- **Landing page overhaul** — Social proof strip, "How It Works" 3-step section, testimonials, expanded bento grid, trust badges, scroll animations
- **Animated counters** — Stats count up when scrolled into view (framer-motion)
- **Shared plans-config.ts** — Single source of truth for plan display data (landing + pricing)
- **docs/PLANS.md** — Complete plan architecture documentation

### Fixed

- **CSS not loading in production** — Removed inline `css.postcss.plugins: []` from vite.config.ts that overrode postcss.config.js, preventing Tailwind from processing
- **Vercel deploy failure** — Tracked `api/index.mjs` in git so Vercel functions config resolves before build
- **PostCSS plugins** — Configured tailwindcss and autoprefixer inline in Vite for reliable Vercel builds
- **Pricing inconsistency** — Landing page and pricing page now share the same plan data
- **Placeholder content** — Removed fake CNPJ, placeholder WhatsApp numbers, generic social icons
- **Dead footer links** — Removed links to non-existent pages (Blog, API Docs, Status)
- **"Ver Demo" button** — Now scrolls to features section instead of doing nothing
- **OG image path** — Fixed `og-image.png` to `opengraph.jpg` (actual file)
- **Portuguese accents** — Fixed 20+ missing accents in pricing.tsx
- **Broken nav links** — Pricing page nav now points to existing sections
- **Accessibility** — Added aria-label to pricing page mobile menu button
- **Copyright year** — Uses `new Date().getFullYear()` instead of hardcoded 2024
- **Plan limits fallback** — Default limits now match free plan (was 2 users/10 properties)
- **Unlimited handling** — All limit checks now treat -1 as unlimited (skip check)

### Changed

- **GET /api/plans** — Now returns plans from database instead of hardcoded array
- **storage.getAllPlans()** — Queries database instead of returning hardcoded defaults
- **storage.updatePlan()** — Persists to database instead of returning mock data
- **Plans table schema** — Added slug, maxLeads, yearlyPrice, stripePriceId, stripeYearlyPriceId, trialDays columns
- **PlansTab.tsx** — Fetches real usage from /api/subscription/usage (was hardcoded 3/10 users)
- **Footer** — Reduced to functional links only (Pricing, Login, Signup, Terms, Privacy)
- **Landing page pricing** — Shows 4 plans (Gratuito/Starter/Pro/Business) with link to full pricing

---

## [2.0.0] - 2026-03-19

### Security

- **Portal tokens migrated to httpOnly cookies** - JWT tokens for owner/renter portal moved from localStorage to httpOnly cookies, preventing XSS token theft
- **Stripe fallback key removed** - No more dummy `sk_test_dummy_key` fallback in production
- **Admin role enforcement** - Job management routes now require `role === 'admin'`
- **Session idle timeout** - Rolling sessions with 30min idle timeout in production
- **@ts-nocheck removed** from 6 server route files (esignature, inspections, portal, auto-marketing, avm, isa)
- **Tenant isolation middleware** - New reusable middleware prevents cross-tenant data access
- **Security email alerts** - Critical events trigger email notifications via SendGrid
- **Redis-backed rate limiting** - All rate limiters use Redis in production for multi-instance consistency
- **AVM rate limit** - Property valuation endpoint limited to 3 requests/hour
- **Compliance path randomization** - Export/deletion certificate paths include UUID to prevent guessing
- **CSRF exclusions** - Portal JWT routes and cron endpoints properly excluded from CSRF checks

### Added

- `server/middleware/tenant-isolation.ts` - Reusable tenant ownership verification
- `server/utils/soft-delete.ts` - Soft delete utilities (filter, delete, purge)
- `server/utils/api-response.ts` - Standardized API response helpers
- `server/docs/openapi.ts` - OpenAPI 3.0 specification (22 endpoints)
- `server/routes-docs.ts` - Serves OpenAPI spec at `/api/docs/openapi.json`
- `client/src/lib/logger.ts` - Client-side logger (no-op in production)
- `.vercelignore` - Reduces Vercel upload size
- `POST /api/portal/logout` endpoint
- `GET /api/cron/cleanup-soft-deletes` cron job (90-day purge)
- `deletedAt` field on 9 database tables for soft delete support
- Client-side session refresh (20min interval)
- Deploy script exponential backoff health check with auto-rollback

### Changed

- Portal login no longer returns token in response body (cookie only)
- Portal pages use `credentials: 'include'` instead of Authorization headers
- CI coverage threshold check is now blocking (removed `continue-on-error`)
- Deploy health check uses exponential backoff (5 attempts) instead of `sleep 5`
- API response format standardized on 5 key endpoints (properties, leads, auth)

### Removed

- `client/src/pages/settings/tabs/GeneralTabImproved.tsx` (unused duplicate)
- `client/src/pages/settings/tabs/GeneralTabWithUnsavedChanges.tsx` (unused duplicate)
- 18 abandoned git worktrees cleaned up
- `api/index.ts` removed from git tracking

### Fixed

- Auto-marketing routes had write-then-check tenant vulnerability
- AVM routes leaked resource existence via 403 (now 404)
- E-signature route used `req.user.username` instead of `req.user.name`

## [1.0.0] - 2026-03-15

### Added

- Initial production-ready release
- Multi-tenant real estate management platform
- Property CRUD with image management
- Lead management with Kanban board
- Rental contract management with payment tracking
- Owner/Renter self-service portal
- WhatsApp integration (ISA AI assistant)
- E-signature integration (ClickSign)
- Automated Valuation Model (AVM)
- Auto-marketing with AI content generation
- Financial management (categories, entries, reports)
- Background job system (BullMQ + Redis)
- Vercel Cron integration
- Comprehensive security middleware (Helmet, CORS, CSRF, rate limiting)
- Sentry error tracking
- CI/CD pipeline (GitHub Actions)
