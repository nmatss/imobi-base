# ADR 0001 - Enterprise Harness para agentes de IA

Data: 17/06/2026

## Status

Aceita.

## Contexto

O ImobiBase esta evoluindo para um SaaS imobiliario completo e competitivo. O projeto possui muitas areas de risco e especialidade: multi-tenancy, banco, SEO, seguranca, compliance, pagamentos, WhatsApp, assinatura digital, IA, portal, performance e operacao em producao.

Sem memoria e governanca, agentes de IA podem repetir auditorias, perder contexto, alterar arquivos fora de escopo ou deixar documentacao desatualizada.

## Decisao

Adotar um harness enterprise permanente no repositorio:

- `AGENTS.md` com regras operacionais.
- `docs/PROJECT_MEMORY.md` para memoria consolidada.
- `docs/SESSION_MEMORY.md` para historico de sessoes.
- `docs/KNOWN_ISSUES.md` para riscos conhecidos.
- `docs/TECH_DEBT.md` para divida tecnica.
- `docs/ROADMAP.md` para backlog P0-P3.
- Documentos executivos de arquitetura, banco, API, deploy, runbook, observabilidade e performance.

## Consequencias

- Agentes passam a ter fonte de contexto padronizada.
- Descobertas importantes devem ser preservadas.
- Mudancas de arquitetura devem ser registradas por ADR.
- O custo inicial de manutencao documental aumenta, mas reduz risco operacional e perda de conhecimento.

