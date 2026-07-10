# Enterprise Baseline - 2026-06-17

## Objetivo

Registrar o estado real do ImobiBase apos a auditoria P0/P1 inicial e o primeiro pacote P0 aplicado em 17/06/2026.

## Evidencias executadas

| Check | Resultado |
| --- | --- |
| Typecheck | `npm run check` passou |
| Build | `npm run build` passou |
| Vitest completo | 78 arquivos passaram; 1376 testes passaram; 1 ignorado |
| Testes P0 focados | 30 testes passaram |
| Audit | `npm audit --json` reportou 0 vulnerabilidades |
| Lint | 5166 warnings; 0 errors |
| Coverage | statements 11,1%; branches 8,19%; functions 8,84%; lines 11,51% |
| Lighthouse home | Performance 74; Acessibilidade 100; Boas praticas 96; SEO 100 |

## P0 corrigido nesta rodada

- CORS foi centralizado em `server/config/cors.ts`.
- `server/api-handler.ts` e `server/routes.ts` usam a mesma origem de configuracao.
- `CORS_ORIGINS` passa a ser a variavel canonica; `ALLOWED_ORIGINS` fica apenas como compatibilidade legada.
- Defaults e `.env.example` foram alinhados ao dominio `imobibase.com.br`.
- O wrapper serverless gerado por `script/build.ts` nao expoe `message`/`stack` em producao quando a importacao do handler falha.
- `tests/unit/cors-config.test.ts` cobre parsing, wildcard, warnings de producao e envelope seguro do wrapper.

## P1 iniciado nesta rodada

- `server/services/visit-scheduling.ts` implementa conflito de agenda por imovel e por corretor.
- `/api/visits` bloqueia visitas ativas sobrepostas em janela de 60 minutos.
- `/api/visits` valida que imovel, lead e corretor pertencem ao tenant autenticado antes de criar/atualizar a visita.
- `tests/unit/visit-scheduling.test.ts` cobre conflitos, status inativos, borda de 60 minutos, edicao da propria visita e data invalida.

## RLS

Status: pronto para validacao de staging, ainda nao aplicado em producao.

Evidencias:

- `server/db-rls.ts` implementa contexto RLS com `AsyncLocalStorage`.
- `server/db.ts` instala o patch no pool Postgres.
- `migrations/RLS_enable.sql` habilita e força RLS nas tabelas com `tenant_id`.
- `docs/RLS_RUNBOOK.md` documenta rollout, role de aplicacao e rollback.
- `tests/unit/db-rls-context.test.ts`, `tests/unit/rls-migration-parity.test.ts` e `tests/unit/auth-rls-context.test.ts` passaram.

Bloqueios para producao:

- Criar/validar role de aplicacao nao-owner e sem `BYPASSRLS`.
- Aplicar `npm run db:rls:apply` em staging.
- Rodar smoke multi-tenant contra Postgres real.
- Validar rotas administrativas que precisam de visao cross-tenant.

## Gaps enterprise restantes

- Cobertura de testes precisa subir de 11,1% para >= 80%.
- 5166 warnings de lint precisam ser reduzidos por modulo.
- Backup/restore ainda precisa de prova operacional com RPO/RTO.
- Pentest externo ainda nao foi executado.
- Banco Supabase em `us-east-1` segue distante do deploy Vercel `gru1`.
- Jobs longos precisam decisao oficial: crons HTTP serverless ou workers persistentes.

## Proximo pacote recomendado

1. Agenda de visitas P1: conflitos, disponibilidade, confirmacao, lembretes e feedback.
2. CRM SLA: tempo de primeiro atendimento, lead parado, deduplicacao e roleta.
3. Testes de seguranca: IDOR multi-tenant e rotas publicas/webhooks.
4. Validacao operacional de RLS em staging.
