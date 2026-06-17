# Architecture

Atualizado em: 17/06/2026

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
- `server/routes.ts`
- `server/api-handler.ts`
- `server/storage.ts`
- `docs/relatorio-arquitetura-seo-mercado-imobibase-2026-06-17.md`
