# Sistema de Design - ImobiBase

Guia completo do sistema de design interno.

## Princípios

1. **Clareza**: Uma página = um objetivo principal
2. **Consistência**: Mesmos padrões em toda aplicação
3. **Progressive Disclosure**: Informações secundárias em hover/expand
4. **Mobile First**: Design mobile limpo, desktop enhanced
5. **Ação Clara**: 1 CTA primário por seção

## Cores

### Semânticas
- **Primary** (#1E7BE8): Ações principais, links
- **Success** (#10B981): Concluído, disponível, pago
- **Warning** (#F59E0B): Atenção, pendente, reservado
- **Error** (#DC2626): Erro, atrasado, cancelado
- **Info** (#0EA5E9): Informações gerais, dicas
- **Neutral** (#64748B): Dados neutros

### Uso
```tsx
import { SEMANTIC_COLORS } from '@/lib/design-tokens';

<Badge className="badge-success">Disponível</Badge>
<Badge className="badge-warning">Pendente</Badge>
<Badge className="badge-error">Atrasado</Badge>
```

## Espaçamento

### Sistema 8pt Grid
- **Compact**: 16px - Elementos muito próximos
- **Default**: 24px - Padrão geral
- **Comfortable**: 32px - Seções

### Classes
```tsx
// Container de página
<div className="page-container">

// Grid de KPIs
<div className="metrics-grid">

// Grid de cards
<div className="cards-grid">

// Cards
<Card className="card-standard">
<Card className="card-compact">
<Card className="card-metric"> {/* com hover */}
```

## Tipografia

### Hierarquia
```tsx
import { TYPOGRAPHY } from '@/lib/design-tokens';

<h1 className={TYPOGRAPHY.h1}>Página</h1>
<h2 className={TYPOGRAPHY.h2}>Seção</h2>
<h3 className={TYPOGRAPHY.h3}>Card</h3>
<h4 className={TYPOGRAPHY.h4}>Grupo</h4>
<p className={TYPOGRAPHY.body}>Texto normal</p>
<span className={TYPOGRAPHY.caption}>Legenda</span>
```

## Componentes Base

### MetricCard
Para exibir KPIs e métricas.

```tsx
import { MetricCard } from '@/components/ui/MetricCard';

<MetricCard
  icon={Building2}
  label="Imóveis Disponíveis"
  value={42}
  trend={{ value: "+5", direction: "up", label: "vs mês anterior" }}
  onClick={() => navigate('/properties')}
/>
```

### PageHeader
Header padrão de página.

```tsx
import { PageHeader } from '@/components/ui/PageHeader';

<PageHeader
  title="Dashboard"
  description="Visão geral do sistema"
  badge={{ label: "Beta", variant: "secondary" }}
  actions={<Button>Nova Ação</Button>}
/>
```

### StatusBadge
Badges semânticos.

```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge status="success" label="Disponível" size="md" />
<StatusBadge status="warning" label="Pendente" size="sm" />
<StatusBadge status="error" label="Atrasado" size="lg" />
```

### EmptyState
Estado vazio.

```tsx
import { EmptyState } from '@/components/ui/EmptyState';

<EmptyState
  icon={Inbox}
  title="Nenhum item encontrado"
  description="Adicione seu primeiro item para começar"
  action={{ label: "Adicionar Item", onClick: handleAdd }}
/>
```

## Responsividade

### Breakpoints
- **xs**: 475px
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Mobile-First
```tsx
// Correto
<div className="flex flex-col lg:flex-row">

// Incorreto
<div className="flex flex-row lg:flex-col">
```

## Acessibilidade

### Focus States
```tsx
<button className="focus-ring-primary">
<input className="focus-ring-error">
```

### ARIA
```tsx
<button aria-label="Fechar modal" aria-pressed={isActive}>
<input aria-describedby="helper-text" aria-invalid={hasError}>
```

## Animações

### Classes
```tsx
<div className="animate-slide-up">
<div className="animate-fade-in">
```

### Durações
```tsx
import { ANIMATION_DURATION } from '@/lib/design-tokens';

transition: `all ${ANIMATION_DURATION.normal} ease-out`
```

## Checklist de Implementação

Ao criar nova página/componente:

- [ ] Usar `page-container` para layout
- [ ] Usar `PageHeader` para título
- [ ] KPIs em `metrics-grid`
- [ ] Cards em `cards-grid`
- [ ] Espaçamento consistente (gap-6, space-y-8)
- [ ] StatusBadge para status
- [ ] EmptyState para listas vazias
- [ ] LoadingState durante carregamento
- [ ] Responsivo mobile-first
- [ ] Focus states para acessibilidade
- [ ] 1 CTA principal por seção
