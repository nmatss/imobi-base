# Scorecard Go Live – 17/06/2026 (ImobiBase)

Objetivo: medir a prontidão real do sistema após o bloco de hardening recente
(unsubscribe assinado, assinatura digital com expiração antecipada, limite de `expiresIn`
de arquivos e contratos de lead).

## Nota geral atual

- **Nota global: 7.9 / 10 (79/100)**
- **Meta para Go Live enterprise: 9.9 / 10 (99/100)**
- **Gap atual: 20 pontos (2.0/10)**

## Notas por processo (evidência)

| Processo | Nota | Evidência principal | Lacunas críticas |
| --- | ---: | --- | --- |
| Segurança de token/link | 9.3 | `server/email/utils.ts` exige assinatura HMAC em `parseUnsubscribeToken`; legado sem assinatura rejeitado; `tests/unit/backend/email-unsubscribe-token.test.ts`. | Expandir contratos de token para fluxos públicos restantes (webhook e links de onboarding). |
| Assinatura digital | 9.0 | `server/routes-features.ts` valida expiração em `GET /api/signatures/token/:token` e no `POST /api/signatures/token/:token/sign`; testes cobrindo lookup e assinatura com token vencido em `tests/unit/feature-routes-signatures-tenant.test.ts`. | Incluir também cenários de assinatura com token com assinatura inválida/ausente na etapa de assinatura e auditoria de status codes em clientes legados. |
| Arquivos privados | 8.2 | `server/routes-files.ts` limita `expiresIn` a 60..3600; fonte validada em `tests/unit/upload-hardening-source.test.ts`. | Reforçar política de assinatura de URL por tenant/categorias e migration de storage conforme audit. |
| Isolamento multi-tenant e RLS | 7.8 | `server/db-rls.ts`, `migrations/RLS_enable.sql`, `docs/RLS_RUNBOOK.md`, testes RLS locais. | Executar validação em staging/prod com role sem ownership + `db:rls:verify`. |
| Resiliência operacional | 8.0 | Cron manifest lock/status, `ops:go-live:verify:static`, `restore-drill`, `backup-verify`, cron verify (`PASS`). | Executar `ops:go-live:verify:strict`, backup/restore e pentest em ambiente real. |
| Qualidade de testes | 7.4 | `npm run test` (96 arquivos, 1447 testes) e testes focados anti-regressão por blocos (`npx vitest ...`). | Cobertura: 11,1% statements, 8,84% functions; ainda sem meta enterprise. |
| Performance e SEO | 7.0 | SEO técnico e páginas estáticas já documentados; smoke de rotas públicas em Playwright passou. | Cobrir páginas dinâmicas de tenant/imóvel/cidade/bairro com prerender e reduzir LCP inicial (home ainda 5.1s em algumas medições anteriores). |
| Operação, observabilidade e processos | 8.1 | Checks `npm run check`, `npm run lint -- --quiet`, `npm run test:smoke:e2e`, gate de go-live estático pass. | Executar evidência real de produção/staging (Sentry, Redis, Webhook DRY, restore RPO/RTO). |
| Produto core/comercial | 8.2 | Fluxos de leads/agenda/CRM/SLA e SEO de páginas solução avançados, sem regressões. | Portais de atendimento/IA auditável e features de conversão ainda parcialmente pendentes. |

## O que falta para 99%

- Cobertura de testes para enterprise (>=80% statements/branches/functions/lines) — maior peso de risco residual.
- Validação prática de RLS em staging/prod sem role privilegiado.
- Execução de restore drill e pentest externo com evidência.
- Prova de locks/status de cron e 2FA com Redis real no deploy.
- Migração pendente 100% aplicada em produção: `20260617_001_webhook_events.sql` e `20260617_002_newsletter_opt_out.sql`.
- Redução de warnings de lint de forma incremental (sem regressão comportamental).
- Redução de risco de latência de arquitetura entre Vercel/gru1 e Supabase/us-east-1.

## Próximo bloco recomendado

1. Completar validação de staging de RLS e isolamento tenant com smoke negativo.
2. Rodar `npm run ops:go-live:verify:strict` em staging real com variáveis confirmadas.
3. Elevar cobertura de testes dos fluxos críticos em backend (auth, pagamentos, contratos, webhooks, tenant isolation).
4. Corrigir os 5 blocos maiores de LCP/JS e bundle acima da dobra.
5. Documentar evidências de RPO/RTO (restore real) e registrar no `docs/ROADMAP.md` e `docs/SESSION_MEMORY.md`.
