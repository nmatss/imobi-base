# Changelog

All notable changes to ImobiBase are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
