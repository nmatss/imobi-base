# ADR 0002 - Modularizacao incremental de rotas Express

Data: 2026-06-30

## Status

Aceita

## Contexto

`server/routes.ts` ainda concentra muitos dominios HTTP em um unico arquivo. A
auditoria go-live de 2026-06-30 classificou isso como risco de manutencao,
review e regressao, embora as rotas existentes ja possuam controles importantes
de autenticacao, CSRF, tenant isolation e validacao por dominio.

O repositorio ja iniciou a decomposicao com `server/routes/_shared.ts`,
`server/routes/newsletter.ts`, `server/routes/interactions.ts` e, nesta rodada,
`server/routes/lead-tags.ts`.

## Decisao

Continuar a decompor `server/routes.ts` de forma incremental por dominio,
mantendo:

- um `register<Domain>Routes(app, deps)` por dominio;
- injecao de middlewares locais via `RouteDeps` quando necessario;
- imports diretos de `storage`, schemas e helpers compartilhados no modulo de
  dominio;
- registro no mesmo ponto relativo do arquivo original para preservar ordem de
  matching do Express;
- validacao focada de typecheck, lint e testes do contrato afetado a cada
  extracao.

## Consequencias

- Reduz risco de mudancas amplas em rotas criticas.
- Facilita revisao por dominio e cobertura especifica.
- Mantem compatibilidade com o bootstrap atual enquanto a aplicacao ainda usa
  `registerRoutes`.
- Cada nova extracao precisa revisar ordem de rotas dinamicas e status codes
  existentes antes de qualquer hardening comportamental.

## Evidencia

- `server/routes/newsletter.ts`
- `server/routes/interactions.ts`
- `server/routes/lead-tags.ts`
- Validacoes da extracao de lead-tags em 2026-06-30:
  - `npx vitest run tests/integration/tenant-isolation.test.ts`: 27/27 passou.
  - `npm run check`: passou.
  - `npm run lint -- --quiet`: passou.
  - `git diff --check`: passou.
