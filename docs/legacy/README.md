# Artefatos de deploy legado (servidor persistente)

Os arquivos nesta pasta — `Dockerfile`, `docker-compose.yml` e `nginx.conf` —
descrevem um modelo de deploy **persistente** (container de longa duração atrás
de um proxy Nginx, com Postgres e Redis em containers irmãos).

> **Atenção:** este **NÃO** é o runtime de produção atual.

## Runtime atual: Vercel (serverless)

A produção real do ImobiBase roda na **Vercel** como função serverless:

- Entrada: `api/index.mjs` → `server/api-handler.ts` (Express embrulhado num handler).
- Build: `npm run build` (`script/generate-sitemap.ts` + `script/build.ts`).
- Config: `vercel.json` (região `gru1`, `maxDuration`, rewrites de `/api/*`).
- Banco: Postgres gerenciado (Supabase) via pooler — ver `server/db.ts`
  (pool reduzido em modo serverless para não estourar o pooler).

Nada do pipeline de build/deploy ativo (Vercel) referencia os arquivos desta
pasta. Eles ficam aqui apenas como referência histórica, caso seja necessário
voltar a um deploy self-hosted/on-premise.

## Por que foram movidos para cá

Mantê-los na raiz dava a falsa impressão de que Docker/Nginx faziam parte do
runtime de produção. Movê-los para `docs/legacy/` deixa explícito que são
legado e evita confusão operacional.

## Scripts que ainda assumem este modelo (legado, não usados em Vercel)

Os scripts abaixo foram escritos para o modelo persistente e referenciam
`docker-compose`. Eles **não** participam do deploy Vercel e só fazem sentido
se você reativar este modelo:

- `package.json` → scripts `docker:build`, `docker:run`, `docker:stop`, `docker:logs`
- `scripts/deploy.sh`
- `scripts/rollback.sh`

Se for reutilizar esses scripts/compose, copie os três arquivos desta pasta de
volta para a raiz do projeto (eles usam caminhos relativos entre si, então
mantenha-os juntos) e ajuste os scripts conforme necessário.
