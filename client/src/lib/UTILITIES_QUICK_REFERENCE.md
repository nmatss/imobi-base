# Quick Reference - Utilities CSS

Referência rápida das utilities CSS customizadas do ImobiBase.

---

## Imports

```tsx
// Constantes
import { SPACING, SEMANTIC_COLORS, TYPOGRAPHY } from '@/lib/design-constants';
import type { Status } from '@/lib/design-constants';

// Helpers
import { cn, getStatusClass, getTypographyClass } from '@/lib/cn-helpers';
```

---

## Layout

### Page Container
```tsx
<div className="page-container">
  {/* padding: 32-40px, spacing: 32px */}
</div>
```

### Grids

```tsx
{/* KPIs: 1→2→4 cols */}
<div className="metrics-grid">
  <Card className="card-metric" />
</div>

{/* Cards: 1→2→3 cols */}
<div className="cards-grid">
  <Card className="card-standard" />
</div>
```

### Section
```tsx
<div className="section">
  {/* space-y-6 */}
</div>
```

---

## Cards

```tsx
{/* Com hover (métricas) */}
<Card className="card-metric">

{/* Padrão (p-6, space-y-4) */}
<Card className="card-standard">

{/* Compacto (p-4, space-y-3) */}
<Card className="card-compact">
```

---

## Badges

```tsx
<Badge className={getStatusClass('success')}>Disponível</Badge>
<Badge className={getStatusClass('warning')}>Pendente</Badge>
<Badge className={getStatusClass('error')}>Urgente</Badge>
<Badge className={getStatusClass('info')}>Nova</Badge>
<Badge className={getStatusClass('neutral')}>Normal</Badge>
```

---

## Loading States

```tsx
{/* Card skeleton */}
<div className="skeleton-card h-32" />

{/* Texto skeleton */}
<div className="skeleton-text" />
<div className="skeleton-text w-3/4" />

{/* Avatar skeleton */}
<div className="skeleton-circle w-12 h-12" />
```

---

## Tipografia

```tsx
<h1 className={getTypographyClass('h1')}>Título H1</h1>
<h2 className={getTypographyClass('h2')}>Título H2</h2>
<h3 className={getTypographyClass('h3')}>Título H3</h3>
<h4 className={getTypographyClass('h4')}>Título H4</h4>
<p className={getTypographyClass('body')}>Corpo</p>
<span className={getTypographyClass('caption')}>Legenda</span>
```

---

## Animações

```tsx
{/* Slide up */}
<div className="animate-slide-up">

{/* Fade in */}
<div className="animate-fade-in">
```

---

## Focus States

```tsx
{/* Primário */}
<Button className="focus-ring-primary">
<Input className="focus-ring-primary" />

{/* Erro */}
<Input className="focus-ring-error" />
```

---

## Constantes

```tsx
// Espaçamento
SPACING.compact       // '1rem' (16px)
SPACING.default       // '1.5rem' (24px)
SPACING.comfortable   // '2rem' (32px)

// Cores
SEMANTIC_COLORS.primary   // '#1E7BE8'
SEMANTIC_COLORS.success   // '#10B981'
SEMANTIC_COLORS.warning   // '#F59E0B'
SEMANTIC_COLORS.error     // '#DC2626'
SEMANTIC_COLORS.info      // '#0EA5E9'
SEMANTIC_COLORS.neutral   // '#64748B'

// Tipografia (classes)
TYPOGRAPHY.h1         // 'text-2xl sm:text-3xl font-bold'
TYPOGRAPHY.h2         // 'text-xl sm:text-2xl font-semibold'
TYPOGRAPHY.h3         // 'text-lg sm:text-xl font-semibold'
TYPOGRAPHY.h4         // 'text-base sm:text-lg font-medium'
TYPOGRAPHY.body       // 'text-sm'
TYPOGRAPHY.caption    // 'text-xs text-muted-foreground'
```

---

## Padrões Comuns

### Dashboard com Métricas
```tsx
<div className="page-container">
  <h1 className={getTypographyClass('h1')}>Dashboard</h1>

  <div className="metrics-grid">
    <Card className="card-metric">
      <CardContent className="pt-6">
        <div className="text-sm text-muted-foreground">Label</div>
        <div className="text-2xl font-bold">Valor</div>
      </CardContent>
    </Card>
  </div>
</div>
```

### Lista de Cards
```tsx
<div className="section">
  <h2 className={getTypographyClass('h2')}>Título</h2>
  <div className="cards-grid">
    <Card className="card-standard">
      <CardHeader>
        <CardTitle>Título Card</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Conteúdo</p>
      </CardContent>
    </Card>
  </div>
</div>
```

### Loading State
```tsx
{isLoading ? (
  <div className="cards-grid">
    {[1, 2, 3].map(i => (
      <div key={i} className="skeleton-card h-48" />
    ))}
  </div>
) : (
  <div className="cards-grid">
    {/* Cards reais */}
  </div>
)}
```

### Card com Badge
```tsx
<Card className="card-standard">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Título</CardTitle>
      <Badge className={getStatusClass('success')}>
        Status
      </Badge>
    </div>
  </CardHeader>
</Card>
```

### Modal Animado
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="animate-fade-in">
    <DialogHeader>
      <DialogTitle className={getTypographyClass('h2')}>
        Título
      </DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button className="focus-ring-primary">Salvar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Responsividade

### Breakpoints
```
xs:  ≥475px   (2 cols)
sm:  ≥640px   (2 cols)
md:  ≥768px   (-)
lg:  ≥1024px  (3-4 cols)
xl:  ≥1280px  (-)
2xl: ≥1536px  (-)
```

### Grids
```
metrics-grid:  1 → 2 (xs) → 4 (lg)
cards-grid:    1 → 2 (sm) → 3 (lg)
```

---

## Dark Mode

Todas as utilities suportam dark mode automaticamente:

```tsx
{/* Light: green-100/700, Dark: green-900/30 + green-400 */}
<Badge className="badge-success">

{/* Skeletons usam bg-muted (auto dark mode) */}
<div className="skeleton-card" />
```

---

## Acessibilidade

```tsx
{/* Focus ring apenas com teclado (focus-visible) */}
<Button className="focus-ring-primary">

{/* Touch target mínimo 44x44 */}
<Button className="min-h-[44px] min-w-[44px]">
```

---

## Migração Rápida

### Antes → Depois

```tsx
// Antes
<div className="space-y-6 p-6">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card className="p-6 transition-all hover:shadow-lg">

// Depois
<div className="page-container">
  <div className="metrics-grid">
    <Card className="card-metric">
```

```tsx
// Antes
<h1 className="text-2xl font-bold">

// Depois
<h1 className={getTypographyClass('h1')}>
```

```tsx
// Antes
<span className="bg-green-100 text-green-700 px-2 py-1 rounded">

// Depois
<Badge className={getStatusClass('success')}>
```

---

## Dicas

1. Use `page-container` como wrapper principal
2. Prefira `metrics-grid` para KPIs (1-4 items)
3. Use `cards-grid` para listas de cards (3+ items)
4. Sempre use helpers TypeScript para type safety
5. Adicione `focus-ring-primary` em elementos interativos
6. Use skeletons durante loading
7. Adicione animações em modals/toasts

---

## Links

- [SPACING_GUIDE.md](./SPACING_GUIDE.md) - Guia completo
- [UTILITIES_EXAMPLES.md](./UTILITIES_EXAMPLES.md) - Exemplos detalhados
- [MIGRATION_EXAMPLES.md](./MIGRATION_EXAMPLES.md) - Guia de migração
