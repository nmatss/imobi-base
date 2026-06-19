# Revisão Profunda de UI/UX + Integridade Financeira + Dark Mode — 2026-06-19

> Revisão multi-agente (workflows + subagentes) de layout, carregamento e navegação
> em todas as ~87 páginas do client, com correções, melhorias e dark mode, preparando
> o produto para validação de usuários. Branch `fix/csrf-hardening` · PR #4.

## 1. Escopo e método

**Objetivo:** garantir layout 100%, carregamento/navegação consistentes entre páginas,
resolver dores reais da usuária (imobiliária) e liberar para validação.

**Método — loop autônomo:** revisão → correção → re-revisão → correção → testes →
verificação final, usando workflows multi-agente (concorrência moderada para evitar
rate-limit) e edições validadas por `tsc`/`build`/testes a cada lote. 5 rodadas de
workflow + verificação adversarial final.

**Gate de validação (a cada onda e no fim):**
- `npx tsc --noEmit` → **0 erros**
- `npm run build` → OK (11 rotas estáticas + server + serverless)
- `npm run test:unit` → **320 testes / 51 arquivos, 100% passando**
- Verificação adversarial final → **APROVADA, 0 bloqueadores**

## 2. 🔴 Achado crítico — integridade de dados financeiros (release blocker)

**Descoberta (confirmada por sourcemap, não suposição):** a rota `/financeiro` importa
`@/pages/financeiro`, que resolve para `client/src/pages/financeiro.tsx` — um re-export
(`export { default } from "./financial"`). Portanto a **página financeira LIVE é
`pages/financial/*`**. O arquivo `pages/financeiro/index.tsx` (78KB) **era código morto**
(não embarcava) e vinha sendo editado por engano por trabalhos anteriores.

**Bugs reais na página live (corrigidos):**
1. **Métricas fabricadas** em `financial/components/FinancialDashboard.tsx`: os cards
   "Contas a Receber/Pagar/Inadimplência" exibiam 30%/20%/5% da receita + contadores
   fixos (`12 faturas`, `3 contratos`) como se fossem dados reais. → Agora usam os campos
   reais opcionais da API quando presentes; quando ausentes, exibem **KPIs reais
   alternativos** (Comissões Recebidas, Repasses a Proprietários, Despesas Operacionais).
2. **Fluxo `flow` inconsistente:** o formulário gravava `'in'/'out'`, mas seed/origin-sync
   gravavam `'income'/'expense'`. A tabela e o backend comparavam com `'in'/'out'`.
   Efeitos: despesas somando **R$ 0**, gráfico mensal classificando **toda receita como
   despesa**, filtro de tipo quebrado, "Marcar como pago" não aparecendo.
   → Unificado para **`income`/`expense` ponta a ponta**:
   - Client: `types.ts`, `TransactionFormDialog.tsx`, `TransactionTable.tsx` (helper
     `isIncomeFlow` com normalização de legado), `FINANCE_CATEGORIES`.
   - Server: `server/storage.ts` — `getFinancialMetrics` (operationalExpenses),
     `getFinancialTransactions` (campo `type`), `getFinancialChartData` (byMonth, byCategory).
   - Normalização defensiva (`'in'`/`'out'` legado tratado como income/expense) em ambos os lados.

**Resolução do código morto:** `pages/financeiro/index.tsx` (78KB) e `.backup` removidos
(commit `d460b10`). A rota continua resolvendo via `financeiro.tsx → ./financial`.

## 3. Correções de layout / carregamento / navegação

### Navegação SPA (sem full reload / perda de estado / re-init de CSRF)
- `<a>` interno → `<Link>` do wouter: LoginPage, signup, ForgotPassword/Reset, calendar
  (Ver no CRM / Ver imóvel), contracts (idem), vendas (CRM/Detalhes), onboarding (/pricing),
  vitrine pública (footer).
- `window.open("/properties/:id", "_blank")` interno → `setLocation` (vendas, kanban/lista).
- Bug `subWeeks(selectedDate, -1)` na agenda semanal (seta "anterior" avançava) → corrigido.
- Deep-link `/properties?edit=<id>` agora é consumido em `list.tsx` (abre o modal de edição).
- `VerifyEmail` redireciona para `/login` (antes `/dashboard`, protegido → salto confuso).

### Estados de carregamento / erro / vazio (sem flash de "vazio")
- Portais proprietário/inquilino: loading + erro (com "Tentar novamente") + empty em todas
  as queries; `portal-login` com loader de verificação de sessão; card de contato condicional.
- Vistorias: feedback nos filtros, **erros HTTP (não-403) → estado de erro** (antes caíam em
  empty enganoso), empty state diferenciando filtros ativos.
- Settings/Usuários: skeleton durante o fetch (antes "Nenhum usuário" durante o carregamento).
- Financeiro (live): toasts de erro por fetch já presentes; consistência de fluxo garantida.

### Botões mortos / ações quebradas
- Dashboard: "Confirmar visita" (PATCH `/api/visits/:id` → completed + refetch) e WhatsApp wired.
- Aluguéis: "Ver" → detalhe do imóvel, "Contato" → WhatsApp do inquilino, "Boleto" removido
  (sem fluxo admin — honesto).
- Reports: tipo `comissoes` não dispara mais fetch da SPA (toast de erro espúrio) e o export
  aguarda os dados (sem race de `setTimeout`).

### Layout / responsividade / a11y
- Vistorias: barra fixa com `flex-wrap` + safe-area iOS (`pb-safe-4`); `ring` de seleção
  estático (era purgado por interpolação `ring-${var}`); **upload de foto real** (era `console.log`).
- Admin (4 telas): loader `h-screen` → `min-h-[60vh]` (estourava dentro do layout).
- product-landing: menu mobile não sobrepõe mais o header; pricing: menu `top-16` + acentuação.
- public/property-details: mapa com fallback (link Google Maps) quando não há API key
  (`YOUR_GOOGLE_MAPS_API_KEY` placeholder exibia mapa quebrado).
- Settings/PermissionsTab: `React.Fragment key` no `.map`.
- Onboarding: componentes de etapa eram definidos no render → **perda de foco a cada tecla**;
  convertidos para chamadas de função.
- Auth (Forgot/Reset/VerifyEmail): migrados para tokens do design system; debounce no
  `validate-password`.
- admin/index: guard contra `NaN%` (divisão por zero de tenants).
- CommissionReports: gráfico Top 5 Corretores `layout="vertical"` (barras horizontais).

### Limpeza de código morto
- Removidos: `financeiro/index.tsx` (+ `.backup`), `settings/index-improved.tsx`,
  `reports/index-new.tsx` (zero referências, confirmados).

## 4. ✨ Dark mode (opt-in)

Antes inerte (o seletor de tema não aplicava nada). Agora funcional:
- Novo `client/src/lib/theme.ts`: aplica `.dark` no `<html>` a partir de
  `localStorage` + `prefers-color-scheme`; `initTheme()` no boot (`main.tsx`) evita flash.
- Configurações → Preferências aplica/persiste o tema imediatamente. **Default light**
  (dark é opt-in; usuários atuais não são afetados).
- A paleta `.dark` já existia em `index.css` (UI baseada em tokens shadcn já funcionava).
  Esta revisão adicionou **~150 variantes `dark:` aditivas** (não alteram o light) nas telas
  core: shell/dashboard, imóveis, leads/agenda, vendas/contratos, aluguéis,
  financeiro/relatórios, configurações/admin/onboarding/portais/compliance.
- Configs de cor com extração via `.split(" ")[1]` preservados (não receberam `dark:`).

## 5. Decisões conscientes / follow-up

- **QA visual do dark mode** no navegador para refinar páginas públicas/long-tail.
- **e2e Playwright** (`test:smoke:e2e`) requer browser + servidor — rodar no ambiente do dev.
- **WIP pré-existente da branch** (~67 arquivos: docs, deploy.yml, alguns componentes)
  mantido **fora** dos commits desta revisão para não misturar trabalho de outros autores.
- Módulo `pages/financial/` permanece como página financeira canônica (mais estável e já
  embarcada); a versão de 78KB foi descartada por ser código morto.

## 6. Commits e PR

| Commit | Descrição |
|---|---|
| `9a99bd6` | Revisão de layout/carregamento/navegação + integridade financeira |
| `d460b10` | Remoção da página morta `financeiro/index.tsx` |
| `191a630` | Dark mode funcional (opt-in) + variantes `dark:` |

**PR #4** → `fix/csrf-hardening` para `main`: https://github.com/nmatss/imobi-base/pull/4
