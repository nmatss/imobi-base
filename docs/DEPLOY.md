# Deploy

Atualizado em: 17/06/2026

## Plataforma

- Deploy principal: Vercel.
- Regiao: `gru1`.
- Build: `npm run build`.
- Output: `dist/public`.
- API serverless: `api/index.mjs`.

## Rotas Vercel

- `/api/:path*` -> `api/index.mjs`.
- `/*` -> `index.html` para SPA.

## Crons

Configurados em `vercel.json` para:

- payment reminders;
- daily/weekly/monthly reports;
- cleanup sessions;
- cleanup logs;
- integration sync;
- cleanup temp files;
- cleanup soft deletes;
- enforce plan limits.

## Riscos

- Banco/cache fora da regiao do deploy podem aumentar latencia.
- Jobs longos precisam decisao clara: Vercel crons HTTP ou workers externos.
- Padronizar variaveis `CORS_ORIGINS` e `ALLOWED_ORIGINS`.

## Referencias

- `vercel.json`
- `script/build.ts`
- `server/routes-cron.ts`
- `docs/DEPLOYMENT_RUNBOOK.md`

