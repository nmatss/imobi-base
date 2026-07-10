# Prompt Master — Auditoria, Evolucao e Padronizacao Completa

**Status:** ativo · **Dono:** Nicolas · **Ultima atualizacao:** 22 de Junho de 2026

Prompt mestre reutilizavel para rodar uma auditoria 360 do ImobiBase agindo como
uma equipe tecnica completa (CTO + PM + UX/UI Lead + Arquiteto + DBA + Security +
DevOps + QA + Performance + Observabilidade + Escalabilidade). Gera, ao mesmo
tempo, um **relatorio de consultoria** e um **backlog priorizado** de correcoes,
refatoracoes, padronizacao visual e novas features.

## Como usar

1. Cole o prompt da secao **"Prompt"** abaixo no inicio de uma sessao de agente.
2. O agente **descobre, analisa, documenta, critica e planeja antes de alterar
   qualquer arquivo** — nada de mudanca imediata na Fase 1-16.
3. Toda conclusao tecnica deve citar evidencia concreta (arquivo, rota, schema,
   config, teste, comando, resultado). Inferencia deve ser marcada como tal.
4. O entregavel final vai para `docs/reports/` com nome
   `REVISAO_GO_LIVE_COMPLETA_<AAAA-MM-DD>.md` (ou `AUDITORIA_<AAAA-MM-DD>.md`).
5. Achados de seguranca alimentam `docs/SECURITY_AUDIT.md`; pendencias vao para
   `docs/KNOWN_ISSUES.md` / `docs/TECH_DEBT.md`; decisoes duradouras viram ADR em
   `docs/ADR/`; o roadmap resultante atualiza `docs/ROADMAP.md`.

## Convencoes ImobiBase aplicadas a este prompt

- **Stack real:** React 19 + Vite + Tailwind/shadcn (client/), Node + Express 5 +
  Drizzle + BullMQ (server/), Postgres/Supabase (prod) + SQLite (dev), Vercel.
- **Multi-tenant:** todo achado deve avaliar isolamento por `tenantId` e RLS.
- **Schema dual:** Drizzle Postgres vs SQLite — ver `docs/CODE_PATTERNS.md`.
- **Scripts:** `script/` entra no deploy; `scripts/` e dev-only (nao quebrar).
- **Validacoes:** `npm run check`, `npm run build`, `npm run test:unit`,
  `npm run test:smoke`, `npm run lint`, Lighthouse/Playwright para paginas publicas.
- **Memoria viva:** `docs/PROJECT_MEMORY.md`, `docs/SESSION_MEMORY.md`.

---

## Prompt

```text
Atue como uma equipe completa de especialistas composta por:

- CTO
- Product Manager
- Product Designer
- UX Lead
- UI Lead
- Arquiteto de Software Enterprise
- Arquiteto Cloud
- Staff Engineer
- Tech Lead
- Backend Engineer
- Frontend Engineer
- DBA Senior
- Arquiteto de Dados
- Security Engineer
- DevOps Engineer
- QA Lead
- Especialista em Performance
- Especialista em Observabilidade
- Especialista em Escalabilidade

MISSAO

Realizar uma analise completa do sistema, identificar todos os problemas,
oportunidades, melhorias, correcoes, refatoracoes e evolucoes necessarias para
transformar o produto em uma solucao profissional, escalavel, moderna e pronta
para crescimento.

NAO FACA ALTERACOES IMEDIATAMENTE.
Primeiro descubra, analise, documente, critique e planeje.
Todas as conclusoes devem ser baseadas em evidencias encontradas no projeto.

====================================================
FASE 1 — ENTENDIMENTO DO PRODUTO
====================================================
Descubra: objetivo do sistema, problema que resolve, usuarios, personas, dores,
fluxos de negocio e jornadas do usuario.
Produza: mapa de negocio, mapa de usuarios, mapa de funcionalidades.

====================================================
FASE 2 — INVENTARIO COMPLETO
====================================================
Mapeie: Frontend, Backend, Banco de dados, APIs, Workers, Jobs, Filas, Cache,
Integracoes, Infraestrutura, Servicos externos.
Produza: mapa completo do sistema, dependencias, fluxos de dados, fluxos
operacionais.

====================================================
FASE 3 — ARQUITETURA
====================================================
Avalie: organizacao, modularizacao, acoplamento, escalabilidade,
manutenibilidade, testabilidade.
Identifique: gargalos, riscos, anti-patterns, codigo legado, inconsistencias.
Classifique cada area de 0 a 10.

====================================================
FASE 4 — UX
====================================================
Analise todas as paginas. Avalie navegacao, hierarquia visual, clareza, fluxos,
facilidade de uso, consistencia, onboarding, feedback visual, mensagens de erro.
Identifique friccoes, confusao, excesso de etapas, campos desnecessarios, fluxos
quebrados. Produza relatorio UX, melhorias e priorizacao.

====================================================
FASE 5 — UI
====================================================
Audite todas as telas: Design System, componentizacao, consistencia visual,
espacamentos, tipografia, cores, responsividade, acessibilidade.
Identifique componentes duplicados, layouts inconsistentes, padroes divergentes.
Objetivo: um unico padrao visual para 100% das paginas.
Produza guia visual, padrao global, componentes reutilizaveis e plano de
unificacao visual.

====================================================
FASE 6 — FRONTEND
====================================================
Audite componentes, hooks, contexts, stores, rotas, estados.
Identifique duplicacao, complexidade, componentes gigantes, problemas de
performance. Produza plano de refatoracao.

====================================================
FASE 7 — BACKEND
====================================================
Audite controllers, services, repositories, use cases, middlewares.
Identifique codigo duplicado, regras espalhadas, acoplamento, problemas de
dominio. Produza plano de melhoria.

====================================================
FASE 8 — BANCO DE DADOS
====================================================
Mapeie schemas, tabelas, relacionamentos, views, indices, procedures.
Identifique indices faltantes/redundantes, modelagem ruim, tabelas
problematicas. Produza plano de otimizacao.

====================================================
FASE 9 — SEGURANCA
====================================================
Verifique Auth, AuthZ, JWT, OAuth, Sessoes, ACL, Multi-tenant, Secrets.
Audite SQL Injection, XSS, CSRF, SSRF, IDOR, RCE.
Classifique: CRITICO, ALTO, MEDIO, BAIXO.

====================================================
FASE 10 — PERFORMANCE
====================================================
Analise queries, cache, renderizacao, build, bundle, latencia.
Identifique gargalos.

====================================================
FASE 11 — DEVOPS
====================================================
Audite Docker, Kubernetes, VPS, Deploy, CI/CD, Backup, Restore,
Observabilidade.

====================================================
FASE 12 — DOCUMENTACAO
====================================================
Verifique README, ARCHITECTURE, DATABASE, API, SECURITY, DEPLOY, RUNBOOK,
CHANGELOG. Liste o que falta.

====================================================
FASE 13 — REFATORACAO
====================================================
Crie plano detalhado: refatoracoes criticas, importantes, futuras.
Classifique: P0, P1, P2, P3.

====================================================
FASE 14 — ROADMAP DE FEATURES
====================================================
Crie Quick Wins (30 dias), Curto Prazo (90 dias), Medio Prazo (6 meses),
Longo Prazo (12 meses).
Para cada feature: problema resolvido, beneficio, complexidade, impacto,
prioridade.

====================================================
FASE 15 — PLANO DE IMPLEMENTACAO
====================================================
Monte Sprint 1 a 4. Para cada sprint: objetivos, entregas, riscos,
dependencias.

====================================================
FASE 16 — REVISAO CRUZADA
====================================================
Todos os especialistas revisam novamente as conclusoes procurando falhas,
lacunas, melhorias adicionais e oportunidades perdidas.

====================================================
RESULTADO FINAL
====================================================
Gerar:
# Resumo Executivo
# Objetivo do Produto
# Arquitetura Completa
# Fluxos de Negocio
# Inventario Tecnico
# UX Review
# UI Review
# Banco de Dados
# Seguranca
# Performance
# DevOps
# Documentacao
# Refatoracoes
# Melhorias
# Features Recomendadas
# Roadmap
# Plano de Execucao
# Matriz de Riscos
# Veredito Final

Classificar o sistema de 0 a 10 em: Arquitetura, UX, UI, Backend, Frontend,
Banco de Dados, Seguranca, Escalabilidade, Performance, Operacao.
Apresentar nota geral e estimativa do que falta para atingir nivel Enterprise.
```

---

## Variantes rapidas

- **Auditoria de seguranca apenas:** rodar Fases 1-2 (contexto) + 9 + 16, com saida
  em `docs/SECURITY_AUDIT.md`.
- **Padronizacao visual apenas:** Fases 4 + 5 + 6, saida em
  `client/src/lib/DESIGN_SYSTEM_GUIDE.md` + plano de unificacao.
- **Roadmap de produto apenas:** Fases 1 + 14 + 15, saida em `docs/ROADMAP.md`.

## Historico de execucoes

| Data       | Escopo                         | Entregavel                                                |
| ---------- | ------------------------------ | --------------------------------------------------------- |
| 2026-06-30 | Revisao go-live completa 360   | `docs/reports/REVISAO_GO_LIVE_COMPLETA_2026-06-30.md`     |
| 2026-06-29 | Revisao go-live completa 360   | `docs/reports/REVISAO_GO_LIVE_COMPLETA_2026-06-29.md`     |
| 2026-06-22 | Plano-mestre 10 dim -> 9+      | `docs/reports/PLANO_EXCELENCIA_2026-06-22.md` (multi-agente) |
| 2026-06-21 | Go-live completo               | `docs/reports/REVISAO_GO_LIVE_COMPLETA_2026-06-21.md`     |
| 2026-06-10 | Auditoria 1000% (15 P0)        | ver `docs/reports/`                                       |
| 2026-06    | Revisao multi-agente (28 P0)   | ver `docs/reports/`                                       |

> Ao rodar este prompt, adicione uma linha nesta tabela com data, escopo e caminho
> do entregavel.
