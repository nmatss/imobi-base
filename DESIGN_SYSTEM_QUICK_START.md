# Design System ImobiBase - Guia Rápido

**Acesse o relatório completo:** `AGENTE_7_DESIGN_SYSTEM_VALIDATION_REPORT.md`

---

## 🚀 Início Rápido (5 minutos)

### 1. Importação Centralizada

```tsx
// Importe TUDO do design system
import {
  // Tokens
  spacing, statusColors, typography, cardSizes,

  // Helpers
  getStatusBadgeClassName, getStatusLabel, getCardSizeClassName,

  // Componentes
  Button, Card, Badge, H1, H2, Text, StatusBadge, MetricCard
} from "@/lib/design-system";
```

### 2. Usando Typography

```tsx
// ❌ Antes
<h1 className="text-3xl font-bold">Dashboard</h1>
<p className="text-sm text-gray-600">Descrição</p>

// ✅ Depois
<H1>Dashboard</H1>
<Text size="sm" variant="muted">Descrição</Text>
```

### 3. Usando Status Colors

```tsx
// ❌ Antes
<span style={{ color: "#3b82f6" }}>Novo</span>

// ✅ Depois
<StatusBadge status="new" />
// ou
<span className={getStatusBadgeClassName("new")}>
  {getStatusLabel("new")}
</span>
```

### 4. Usando Spacing

```tsx
// ❌ Antes
<div className="p-6 gap-4">

// ✅ Depois
<div className={getCardSizeClassName("normal")}>
// ou
<div className="p-lg gap-base">
```

### 5. Usando MetricCard

```tsx
<MetricCard
  icon={Building2}
  label="Imóveis Ativos"
  value="142"
  trend={{ value: "+12%", direction: "up" }}
  onClick={() => navigate("/properties")}
/>
```

### 6. Usando Skeleton Loaders

```tsx
import { DashboardSkeleton } from "@/components/ui/skeleton-loaders";

{isLoading ? <DashboardSkeleton /> : <Dashboard />}
```

---

## 📚 Recursos Principais

### Design Tokens
- **Localização:** `/client/src/lib/design-tokens.ts`
- **Conteúdo:** Cores, spacing, typography, card sizes, icon sizes

### Design Helpers (79 funções!)
- **Localização:** `/client/src/lib/design-helpers.ts`
- **Funções:** Status helpers, semantic helpers, accessibility helpers

### Componentes UI (90+ componentes)
- **Localização:** `/client/src/components/ui/`
- **Principais:** Button, Badge, Card, Dialog, Tooltip, Pagination, Skeleton

### CSS Global
- **Localização:** `/client/src/index.css`
- **Conteúdo:** CSS vars, utility classes, responsive helpers

---

## ✅ Checklist de Validação

- ✅ Design Tokens completos (421 linhas)
- ✅ Design Helpers (437 linhas, 79 funções)
- ✅ 90+ Componentes UI
- ✅ 17 Skeleton Variants
- ✅ 7 Guias de documentação
- ✅ 120+ CSS Variables
- ✅ WCAG AA Compliant
- ✅ TypeScript Type-Safe

---

## 🎯 Próximos Passos

1. **Para desenvolvedores:**
   - Use componentes de Typography ao invés de tags HTML puras
   - Sempre importe do design system
   - Use helpers ao invés de valores hardcoded

2. **Para designers:**
   - Consulte `/lib/design-tokens.ts` para valores oficiais
   - Use Storybook (se implementado) para preview

3. **Para QA:**
   - Verifique acessibilidade WCAG AA
   - Teste em dispositivos móveis
   - Valide estados de loading (skeletons)

---

**Status:** ✅ Sistema Completo e Pronto para Produção
**Última Validação:** 28/12/2024 - AGENTE 7
