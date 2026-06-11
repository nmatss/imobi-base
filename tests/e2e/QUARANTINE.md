# Quarentena de suítes E2E

**Status:** estas suítes foram escritas contra uma UI que não existe no app atual
(seletores, rotas e fluxos divergem do produto real). Elas nunca passaram e
mascaravam o sinal do CI. Estão **quarentenadas** via `testIgnore` no
`playwright.config.ts` — não rodam em `npx playwright test` nem no CI — até
serem reescritas contra a UI real.

Única suíte e2e válida hoje: `tests/e2e/smoke.spec.ts` (roda no job `e2e` do CI).

## Suítes quarentenadas (pendentes de reescrita)

| Suíte | Conteúdo nominal |
|---|---|
| `tests/e2e/auth.spec.ts` | Login/logout/registro |
| `tests/e2e/calendar.spec.ts` | Agenda/visitas |
| `tests/e2e/financial.spec.ts` | Financeiro |
| `tests/e2e/leads.spec.ts` | CRM/leads |
| `tests/e2e/mobile.spec.ts` | Fluxos mobile |
| `tests/e2e/properties.spec.ts` | Imóveis |
| `tests/e2e/rentals.spec.ts` | Locações |
| `tests/e2e/sales.spec.ts` | Vendas |
| `tests/e2e/search.spec.ts` | Busca |
| `tests/e2e/settings.spec.ts` | Configurações |

## Como tirar uma suíte da quarentena

1. Reescreva a suíte contra a UI real (use `tests/e2e/smoke.spec.ts` e os
   page objects de `tests/e2e/pages/` como referência de seletores válidos).
2. Rode localmente: `npx playwright test tests/e2e/<suite>.spec.ts --project=chromium`.
3. Remova a entrada correspondente do `testIgnore` em `playwright.config.ts`.
4. Adicione a suíte ao job `e2e` do `.github/workflows/ci.yml` (ou amplie o
   glob quando todas estiverem verdes).
