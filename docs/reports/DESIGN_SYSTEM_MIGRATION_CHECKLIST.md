# Design System - Checklist de Migração de Páginas

Use este checklist ao migrar páginas existentes para o Design System.

---

## 📋 Checklist Geral

### 1. Imports

- [ ] Remover imports de valores hardcoded (cores, spacing, etc.)
- [ ] Importar do design system centralizado (`@/lib/design-system`)
- [ ] Importar componentes de UI (`@/components/ui/`)

### 2. Typography

- [ ] Substituir `<h1>` por `<H1>` (e h2-h6)
- [ ] Substituir `<p>` genéricos por `<Text>`
- [ ] Usar `<Caption>` para textos pequenos
- [ ] Remover classes de font-size hardcoded

### 3. Colors

- [ ] Substituir cores hex/rgb por status colors
- [ ] Usar `StatusBadge` para status de leads
- [ ] Usar helpers de cor (`getStatusColor`, etc.)
- [ ] Validar contraste WCAG AA

### 4. Spacing

- [ ] Substituir valores hardcoded por tokens
- [ ] Usar classes utilitárias (`p-lg`, `gap-base`)
- [ ] Usar `getCardSizeClassName()` para cards
- [ ] Seguir 8pt grid system

### 5. Components

- [ ] Substituir cards customizados por `<Card>` padrão
- [ ] Usar `<MetricCard>` para KPIs
- [ ] Usar `<PageHeader>` para cabeçalhos
- [ ] Adicionar skeleton loaders

### 6. States

- [ ] Adicionar estado de loading com skeleton
- [ ] Adicionar estado de erro com `<ErrorState>`
- [ ] Adicionar estado vazio com `<EmptyState>`
- [ ] Usar `<LoadingState>` quando apropriado

### 7. Accessibility

- [ ] Adicionar `aria-label` em ícones
- [ ] Garantir touch targets de 44px
- [ ] Usar classes de focus (`focus-visible:ring-2`)
- [ ] Testar navegação por teclado

### 8. Responsiveness

- [ ] Usar classes responsive (`responsive-grid-4`)
- [ ] Testar em mobile (320px+)
- [ ] Usar `horizontal-scroll` para mobile
- [ ] Adicionar `min-h-[44px]` em botões mobile

---

## 📄 Exemplo de Migração: Dashboard

### Antes ❌

```tsx
export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>

      <div className="grid grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-lg border">
          <span className="text-sm text-gray-500">Total Leads</span>
          <p className="text-2xl font-bold">142</p>
        </div>
      </div>

      {isLoading && <div>Carregando...</div>}
    </div>
  );
}
```

### Depois ✅

```tsx
import { H1, MetricCard } from "@/lib/design-system";
import { DashboardSkeleton } from "@/components/ui/skeleton-loaders";
import { Users } from "lucide-react";

export default function Dashboard() {
  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="page-container">
      <H1 className="mb-4">Dashboard</H1>

      <div className="responsive-grid-4">
        <MetricCard
          icon={Users}
          label="Total Leads"
          value="142"
          trend={{ value: "+12%", direction: "up" }}
        />
      </div>
    </div>
  );
}
```

---

## 🎯 Migração por Página

### Dashboard

- [ ] Migrar KPIs para `<MetricCard>`
- [ ] Usar `<DashboardSkeleton>`
- [ ] Aplicar `responsive-grid-4`
- [ ] Usar status colors para pipeline

### Leads (Kanban)

- [ ] Usar `<StatusBadge>` para status
- [ ] Aplicar `getStatusLabel()` para labels
- [ ] Usar `<KanbanBoardSkeleton>`
- [ ] Aplicar cores de status do design system

### Properties (Imóveis)

- [ ] Usar `<PropertyGridSkeleton>`
- [ ] Aplicar `responsive-grid-3`
- [ ] Usar `<Card>` padrão
- [ ] Adicionar `<EmptyState>` quando vazio

### Financial

- [ ] Usar `<FinancialPageSkeleton>`
- [ ] Aplicar semantic colors (success, warning)
- [ ] Usar `<MetricCard>` para totais
- [ ] Aplicar `<TableSkeleton>` para tabelas

### Calendar

- [ ] Usar `<CalendarSkeleton>`
- [ ] Aplicar status colors para eventos
- [ ] Usar `<Badge>` para tipos de evento
- [ ] Adicionar `<EmptyState>` para dias vazios

### Settings

- [ ] Usar `<SettingsSkeleton>`
- [ ] Aplicar layout de sidebar
- [ ] Usar componentes de form padrão
- [ ] Adicionar validation feedback

---

## 🔍 Validação Final

### Checklist de QA

- [ ] **Visual:** Design consistente com outras páginas
- [ ] **Typography:** Todos os headings usam componentes
- [ ] **Colors:** Nenhuma cor hardcoded
- [ ] **Spacing:** Segue 8pt grid
- [ ] **Loading:** Skeleton loaders funcionando
- [ ] **Empty State:** Estados vazios com ações claras
- [ ] **Error State:** Erros com mensagens úteis
- [ ] **Mobile:** Funciona em 320px+
- [ ] **Touch:** Botões com 44px mínimo
- [ ] **Keyboard:** Navegação por teclado OK
- [ ] **Screen Reader:** Labels e ARIA corretos
- [ ] **Contrast:** WCAG AA (4.5:1+)

### Performance

- [ ] Componentes lazy loaded quando possível
- [ ] Skeleton loaders evitam CLS (layout shift)
- [ ] Imagens otimizadas
- [ ] Bundle size não aumentou significativamente

---

## 📊 Métricas de Sucesso

### Antes da Migração

- Registrar bundle size atual
- Registrar lighthouse score
- Registrar performance metrics

### Depois da Migração

- [ ] Bundle size similar ou menor
- [ ] Lighthouse score >= 90
- [ ] Performance mantida ou melhorada
- [ ] Acessibilidade score 100

---

## 🚀 Deploy

### Pré-Deploy

- [ ] Todas as páginas migradas testadas
- [ ] QA completo realizado
- [ ] Documentação atualizada
- [ ] Changelog criado

### Deploy

- [ ] Deploy em staging
- [ ] Testes de regressão
- [ ] Validação com stakeholders
- [ ] Deploy em produção

### Pós-Deploy

- [ ] Monitorar erros (Sentry)
- [ ] Validar métricas de performance
- [ ] Coletar feedback dos usuários
- [ ] Ajustes finos se necessário

---

**Última Atualização:** 28/12/2024 - AGENTE 7
**Status:** ✅ Pronto para uso
