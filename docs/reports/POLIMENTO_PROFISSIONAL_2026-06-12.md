# Polimento Profissional — Execução 2026-06-12

> Rodada "1000% profissional": identidade visual nova + eliminação dos gaps de
> percepção profissional. Branch `feat/professional-polish`, **PR #2**
> (https://github.com/nmatss/imobi-base/pull/2), 87 arquivos, commit `d6a7803`.
>
> Contexto: as auditorias técnicas (ondas 0-4, PR #1, commit `d136db5`) já estavam
> em produção. Esta rodada cobre a camada voltada ao cliente final.

## Verificação

| Check | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 erros |
| `npm run build` (prod) | ok — manifest, ícones e SW validados em `dist/public/` |
| `npm test` (vitest) | 1296 passed, 1 skipped |

## 1. Identidade visual (Fase 1) ✅

- Logo **"pin predial"** desenhado em SVG autoral — ver `docs/BRANDING.md`
- Componente `<Logo>`/`<LogoIcon>` (`client/src/components/brand/logo.tsx`) aplicado
  em todos os pontos de marca (sidebar, login, signup, landings, footers, 404, erro)
- Favicon completo: `favicon.svg` + `.ico` 16/32/48 + apple-touch 180 + PWA 192/512 +
  maskable; gerador `npm run brand:assets`
- `opengraph.png` 1200x630 novo (anterior era 1280x720 fora do padrão); URLs absolutas
- Manifest PWA corrigido via `vite-plugin-pwa` (era `lang: en`, theme antigo `#1E7BE8`;
  agora pt-BR, `#0066CC`, ícones novos); `theme-color` light/dark no `index.html`
- Emails sem branding de tenant: fallback para o logo da plataforma
- Copyright "© 2024" hardcoded → ano dinâmico (client + `server/auth/email-service.ts`)
- Assets antigos removidos (`favicon.png`, `opengraph.jpg`) — zero referências restantes

## 2. Quick wins (Fase 2) ✅

- **Títulos de aba**: hook `usePageTitle` (`client/src/hooks/use-page-title.ts`)
  aplicado em **30 páginas internas** que mostravam só "ImobiBase"
- **ErrorBoundary e 404** rebrandados (logo + "404" estilizado)
- **`/contato`**: página pública + `POST /api/public/contact` (publicLimiter,
  validação, escape de HTML, email via `sendEmail`; rota excluída do CSRF como o
  newsletter)
- **`/novidades`**: changelog público curado (`pages/public/changelog.tsx`,
  releases em linguagem de usuário); links nos footers; sitemap atualizado
- **`confirm()`/`alert()` nativos** substituídos por `ConfirmDialog`/toast em:
  vistorias (index + detail), AVM, PrivacySettings (LGPD), property-details público
- Botão público "Simular financiamento" (só alert "em breve") removido
- Cores semânticas `success`/`warning`/`info` mapeadas no `tailwind.config.js`
  (classes `text-success` etc. não eram geradas — Tailwind 3 ignora `--color-*`)

## 3. Onboarding (Fase 3) ✅

- **Dados de exemplo**: `POST/DELETE /api/onboarding/demo-data`
  (`server/onboarding-demo.ts` + `server/routes-onboarding.ts`) — 6 imóveis SP,
  8 leads no funil, 2 visitas, 4 lançamentos; prefixo `[Exemplo] ` (sem migration);
  idempotente (409). Wizard oferece "Explorar com dados de exemplo"; limpeza em
  Settings → Geral
- **Checklist de primeiros passos** no dashboard
  (`components/dashboard/GettingStartedChecklist.tsx`) — estado derivado dos dados
  reais, dispensável por tenant via localStorage
- **Tour de primeiro acesso** (`hooks/use-first-access-tour.ts`, driver.js) —
  1x por usuário, desktop only

## 4. UX profunda (Fase 4) — parcial

- ✅ Drawer mobile e breadcrumbs: **já existiam** no dashboard-layout (validados)
- ✅ Stubs "em breve" eliminados:
  - **Financeiro**: `TransactionFormDialog` (criar/editar/duplicar transação) +
    navegação para origem; seção FinancialAI sem backend **removida**;
    **fix de backend**: `/api/finance-entries` POST/PATCH rejeitava data ISO
    (criação manual estava quebrada)
  - **Kanban**: email (mailto), editar e mover ligados ao painel de detalhe real
  - **Aluguéis**: edição de locador/inquilino, detalhe+CSV de repasse, extrato do
    locador, histórico do inquilino; "2ª via de boleto" sem backend removido
  - **Relatórios**: opção PDF sem backend removida (Excel/CSV mantidos)
  - **SignerList**: `tenantId: 'tenant_1'` hardcoded removido (server deriva do auth)
- ⏳ **Adiado** (deliberado, para não inflar o PR): react-hook-form+zod nos 4 forms
  principais (dep já instalada); tooltips em campos financeiros complexos

## 5. Ajuda e confiança (Fase 5) ✅

- **Central de Ajuda** `/ajuda` (`pages/help/`) — 11 artigos em 6 categorias,
  baseados nos recursos reais, busca client-side com normalização de acentos;
  item "Ajuda" no sidebar
- **Preview de emails em dev**: `GET /api/email/preview/:templateName`
  (NODE_ENV !== production) renderiza os 15 templates com dados fake

## Pendências / follow-ups

1. **CSRF em fetches legados** (pré-existente): `csrfProtection` exige header
   `x-csrf-token` em todo POST/PATCH/DELETE não-excluído, mas a maioria das telas
   antigas usa `fetch` puro sem o header (ex.: criação de vistoria). Os fluxos novos
   enviam o token via `getCSRFToken()`. **Investigar se mutações antigas retornam
   403 em produção** e padronizar com `apiRequest`.
2. RHF + zod nos forms de imóvel/lead/settings/financeiro.
3. Tooltips em taxa de administração, juros/multa, repasse, comissão.
4. Página legada morta `client/src/pages/financeiro/index.tsx` (sombreada) — remover.
5. Backlog pós-launch anterior segue válido: 2FA, refund handlers, MRR dashboard,
   bundle optimization, npm audit.
6. Ações do dono (fora do código): branch protection, rotação VERCEL_TOKEN,
   Stripe live keys.
