# Guia de Espaçamento - ImobiBase

Sistema de espaçamento baseado em 8pt grid para consistência visual.

## Sistema 8pt Grid

O ImobiBase utiliza um sistema de espaçamento baseado em múltiplos de 8 pixels para criar hierarquia visual consistente.

### Valores Base

```css
--space-1: 0.25rem;   /* 4px  - uso muito raro */
--space-2: 0.5rem;    /* 8px  - espaçamento mínimo */
--space-3: 0.75rem;   /* 12px - espaçamento pequeno */
--space-4: 1rem;      /* 16px - compact */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px - default (PADRÃO) */
--space-8: 2rem;      /* 32px - comfortable */
--space-10: 2.5rem;   /* 40px - seções grandes */
--space-12: 3rem;     /* 48px - muito espaçoso */
```

### Padrões Recomendados

Padronize em **3 tamanhos principais**:

- **Compact** (16px / 1rem): Elementos muito próximos
- **Default** (24px / 1.5rem): Padrão geral (USE ESTE)
- **Comfortable** (32px / 2rem): Seções e divisões

## Aplicações Práticas

### Cards
- Padding interno: `p-6` (24px)
- Gap entre cards: `gap-6` (24px)

### Seções
- Espaçamento vertical: `space-y-8` (32px)

### Páginas
- Margens: `p-8 lg:p-10` (32-40px)

### Classes Utilities

#### Containers
```tsx
<div className="page-container">
  {/* Conteúdo */}
</div>
```

#### Grids
```tsx
{/* KPIs */}
<div className="metrics-grid">
  <MetricCard />
  <MetricCard />
</div>

{/* Cards gerais */}
<div className="cards-grid">
  <Card />
  <Card />
</div>
```

#### Cards
```tsx
{/* Card com hover */}
<Card className="card-metric">

{/* Card padrão */}
<Card className="card-standard">

{/* Card compacto */}
<Card className="card-compact">
```

## Badges Semânticos

```tsx
{/* Status de sucesso */}
<Badge className="badge-success">Concluído</Badge>

{/* Status de aviso */}
<Badge className="badge-warning">Pendente</Badge>

{/* Status de erro */}
<Badge className="badge-error">Urgente</Badge>

{/* Informação */}
<Badge className="badge-info">Nova</Badge>
```

## Loading States

```tsx
{/* Card skeleton */}
<div className="skeleton-card h-32" />

{/* Texto skeleton */}
<div className="skeleton-text" />

{/* Avatar/Círculo skeleton */}
<div className="skeleton-circle w-12 h-12" />
```

## Animações

```tsx
{/* Slide up animation */}
<div className="animate-slide-up">
  {/* Conteúdo */}
</div>

{/* Fade in animation */}
<div className="animate-fade-in">
  {/* Conteúdo */}
</div>
```

## Focus States (Acessibilidade)

```tsx
{/* Focus ring primário */}
<button className="focus-ring-primary">
  Clique aqui
</button>

{/* Focus ring de erro */}
<input className="focus-ring-error" />
```

## Helpers TypeScript

### Uso de constantes

```typescript
import { SPACING, SEMANTIC_COLORS, TYPOGRAPHY } from '@/lib/design-constants';

// Espaçamento
const cardPadding = SPACING.default; // '1.5rem'

// Cores
const primaryColor = SEMANTIC_COLORS.primary; // '#1E7BE8'

// Tipografia
const headingClass = TYPOGRAPHY.h1; // 'text-2xl sm:text-3xl font-bold'
```

### Helpers de classes

```typescript
import { getStatusClass, getTypographyClass } from '@/lib/cn-helpers';

// Aplicar status badge
const statusClass = getStatusClass('success'); // 'badge-success'

// Aplicar tipografia
const h1Class = getTypographyClass('h1'); // 'text-2xl sm:text-3xl font-bold'
```

## Exemplos Práticos

### Página com container padrão

```tsx
export default function MyPage() {
  return (
    <div className="page-container">
      <h1 className={getTypographyClass('h1')}>Título</h1>

      <div className="metrics-grid">
        <Card className="card-metric">
          <CardHeader>
            <CardTitle>Métrica 1</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
          </CardContent>
        </Card>
        {/* Mais cards... */}
      </div>

      <div className="section">
        <h2 className={getTypographyClass('h2')}>Seção</h2>
        <div className="cards-grid">
          <Card className="card-standard">
            {/* Conteúdo */}
          </Card>
          {/* Mais cards... */}
        </div>
      </div>
    </div>
  );
}
```

### Cards com estados

```tsx
function PropertyCard({ status }: { status: Status }) {
  return (
    <Card className="card-standard">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Imóvel</CardTitle>
          <Badge className={getStatusClass(status)}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Conteúdo do card */}
      </CardContent>
    </Card>
  );
}
```

### Loading skeleton

```tsx
function LoadingState() {
  return (
    <div className="page-container">
      <div className="skeleton-text h-8 w-48 mb-8" />

      <div className="metrics-grid">
        <div className="skeleton-card h-32" />
        <div className="skeleton-card h-32" />
        <div className="skeleton-card h-32" />
        <div className="skeleton-card h-32" />
      </div>

      <div className="section">
        <div className="skeleton-text h-6 w-32 mb-6" />
        <div className="cards-grid">
          <div className="skeleton-card h-48" />
          <div className="skeleton-card h-48" />
          <div className="skeleton-card h-48" />
        </div>
      </div>
    </div>
  );
}
```

## Modo Escuro

Todas as classes utilities possuem suporte automático para dark mode:

```css
/* Light mode */
.badge-success {
  @apply bg-green-100 text-green-700;
}

/* Dark mode */
.dark .badge-success {
  @apply dark:bg-green-900/30 dark:text-green-400;
}
```

## Acessibilidade

Sempre utilize as classes de focus para garantir navegação por teclado:

```tsx
<Button className="focus-ring-primary">
  Ação Principal
</Button>

<Input className="focus-ring-error" />
```

## Checklist de Uso

- [ ] Usar `page-container` para páginas principais
- [ ] Aplicar `metrics-grid` para KPIs/métricas
- [ ] Usar `cards-grid` para listas de cards
- [ ] Aplicar `section` para separar seções
- [ ] Utilizar `card-metric`, `card-standard` ou `card-compact` conforme necessidade
- [ ] Aplicar badges semânticos com `getStatusClass()`
- [ ] Usar skeletons durante loading
- [ ] Adicionar animações `animate-slide-up` ou `animate-fade-in`
- [ ] Garantir focus states com `focus-ring-primary`
