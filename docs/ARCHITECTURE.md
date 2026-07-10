# Architecture

Atualizado em: 22/06/2026

## Visao geral

ImobiBase e um SaaS imobiliario multi-tenant com SPA React/Vite, API Node/Express, Drizzle ORM, PostgreSQL/SQLite, Supabase Storage, Redis opcional, integracoes externas e deploy em Vercel.

## Camadas

- Frontend: `client/`.
- Backend/API: `server/`.
- Serverless entrypoint: `api/index.mjs` e handler gerado.
- Schemas compartilhados: `shared/`.
- Migrations: `migrations/` e `migrations-sqlite/`.
- Scripts operacionais: `script/` e `scripts/`.
- Documentacao: `docs/`.

## Fluxo de deploy

1. Vercel executa `npm run build`.
2. Sitemap estatico e gerado a partir de `script/public-seo-manifest.ts`.
3. Frontend compila para `dist/public`.
4. HTML estatico das rotas publicas conhecidas e escrito em `dist/public/**/index.html`.
5. Server bundle e gerado.
6. Handler serverless e empacotado em `api/_handler.mjs`.
7. Rotas `/api/*` e `/sitemap-dynamic.xml` vao para serverless.
8. Demais rotas usam fallback SPA.

## Camada de rotas (decomposicao em andamento — arch-1)

O monolito `server/routes.ts` (~4.5k LOC) esta sendo decomposto por dominio:

- `server/routes/_shared.ts` — helpers puros reutilizaveis (erro: `toHttpError`/`createHttpError`; validacao: `isValidEmail`/`isValidPhone`/`isValidDate`/`sanitizePagination`; familia `validate*Reference` para prevencao de IDOR) e o tipo `RouteDeps`.
- `server/routes/<dominio>.ts` — cada arquivo exporta `register<Dominio>Routes(app, deps)`. Os middlewares locais de `registerRoutes` (`requireAuth`, limiters) sao injetados via `deps: RouteDeps`; `storage`/schemas/`_shared` sao imports diretos.
- Dominios ja extraidos: `newsletter.ts`, `interactions.ts`. As demais ~35 secoes seguem o mesmo molde (follow-up mecanico).

## Transacoes e cache

- `server/db-tx.ts` — `withTenantTransaction(tenantId, fn)`: executa o callback em UMA transacao com contexto RLS aplicado (via patch de pool em `server/db-rls.ts`); base para operacoes atomicas com locking. Em SQLite (dev/test) degrada para conexao unica statement-atomica.
- `server/cache/query-cache.ts` — cache Redis por tenant; integrado em `getDashboardStats` (TTL 60s, invalidado nos creates). NO-OP seguro quando `REDIS_URL` nao esta configurada.
- `server/middleware/idempotency.ts` — idempotencia de pagamento duravel em Redis (`SET NX` + TTL 7d), com fallback observavel para memoria.
- `server/utils/db-errors.ts` — `isUniqueViolation` (PG/SQLite) para resolver corridas de escrita pelo indice unico do banco.

## Fronteiras de seguranca

- Autenticacao por sessao/Passport no app principal.
- JWT/cookie httpOnly no portal.
- CSRF para fluxos autenticados.
- Tenant isolation por `tenantId` nas queries e middlewares.
- RLS e prioridade para defesa em profundidade no banco.
- Webhooks externos criticos usam assinatura/HMAC e ledger persistente `webhook_events`.

## Referencias

- `README.md`
- `vite.config.ts`
- `vercel.json`
- `server/index.ts`
- `server/routes.ts` e `server/routes/` (`_shared.ts`, dominios extraidos)
- `server/db-tx.ts`, `server/db-rls.ts`
- `server/cache/query-cache.ts`, `server/middleware/idempotency.ts`
- `server/api-handler.ts`
- `server/storage.ts`
- `docs/reports/PLANO_EXCELENCIA_2026-06-22.md`, `docs/RUNBOOK_EXCELENCIA_DONO.md`
- `docs/relatorio-arquitetura-seo-mercado-imobibase-2026-06-17.md`
