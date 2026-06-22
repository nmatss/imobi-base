# CLAUDE.md — ImobiBase

As regras permanentes para agentes de IA neste repositorio vivem em
**[`AGENTS.md`](AGENTS.md)** (papel multidisciplinar, workflow obrigatorio,
seguranca, validacoes, git e memoria). Leia-o antes de qualquer alteracao.

## Atalhos de contexto

- **Indice de docs:** [`DOCUMENTATION_INDEX.md`](DOCUMENTATION_INDEX.md)
- **Memoria do projeto:** [`docs/PROJECT_MEMORY.md`](docs/PROJECT_MEMORY.md) ·
  [`docs/SESSION_MEMORY.md`](docs/SESSION_MEMORY.md)
- **Roadmap / debito / issues:** [`docs/ROADMAP.md`](docs/ROADMAP.md) ·
  [`docs/TECH_DEBT.md`](docs/TECH_DEBT.md) ·
  [`docs/KNOWN_ISSUES.md`](docs/KNOWN_ISSUES.md)

## Auditoria completa / evolucao do produto

Para revisao 360, padronizacao ou evolucao, use o **Prompt Master**:
[`docs/prompts/PROMPT_MASTER_AUDITORIA.md`](docs/prompts/PROMPT_MASTER_AUDITORIA.md).
16 fases — descobrir, analisar, documentar, criticar e planejar **antes** de
alterar codigo. Entregavel em `docs/reports/`.

## Validacoes rapidas

`npm run check` · `npm run build` · `npm run test:unit` · `npm run test:smoke`
· `npm run lint` · Lighthouse/Playwright para paginas publicas.
