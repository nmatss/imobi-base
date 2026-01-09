# Exemplos de Uso - Utilities CSS Customizadas

## Visão Geral

Este documento mostra exemplos práticos de como utilizar as novas utilities CSS adicionadas ao sistema ImobiBase.

---

## 1. Visual Hierarchy (Hierarquia Visual)

### Page Container

Container padrão para páginas com espaçamento consistente:

```tsx
export default function DashboardPage() {
  return (
    <div className="page-container">
      {/* Conteúdo da página */}
      <h1>Dashboard</h1>
      <div>Conteúdo...</div>
    </div>
  );
}
```

**Resultado:**
- Padding: 32px (2rem) em mobile, 40px (2.5rem) em desktop
- Espaçamento vertical entre elementos: 32px (space-y-8)

---

### Metrics Grid (Grid de KPIs)

Grid responsivo para métricas/KPIs:

```tsx
function MetricsSection() {
  return (
    <div className="metrics-grid">
      <Card className="card-metric">
        <CardContent>
          <div className="text-sm text-muted-foreground">Total Vendas</div>
          <div className="text-2xl font-bold">R$ 1.234.567</div>
        </CardContent>
      </Card>
      <Card className="card-metric">
        <CardContent>
          <div className="text-sm text-muted-foreground">Novos Leads</div>
          <div className="text-2xl font-bold">156</div>
        </CardContent>
      </Card>
      <Card className="card-metric">
        <CardContent>
          <div className="text-sm text-muted-foreground">Conversão</div>
          <div className="text-2xl font-bold">23.5%</div>
        </CardContent>
      </Card>
      <Card className="card-metric">
        <CardContent>
          <div className="text-sm text-muted-foreground">Ticket Médio</div>
          <div className="text-2xl font-bold">R$ 450.000</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Layout responsivo:**
- Mobile (< 475px): 1 coluna
- Small (≥ 475px): 2 colunas
- Large (≥ 1024px): 4 colunas
- Gap: 24px entre cards

---

### Cards Grid

Grid para cards gerais:

```tsx
function PropertiesGrid() {
  return (
    <div className="cards-grid">
      {properties.map(property => (
        <Card key={property.id} className="card-standard">
          <CardHeader>
            <CardTitle>{property.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{property.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

**Layout responsivo:**
- Mobile: 1 coluna
- Small (≥ 640px): 2 colunas
- Large (≥ 1024px): 3 colunas
- Gap: 24px

---

### Section Spacing

Espaçamento para seções:

```tsx
function PageWithSections() {
  return (
    <div className="page-container">
      <div className="section">
        <h2>Métricas</h2>
        <div className="metrics-grid">
          {/* Cards de métricas */}
        </div>
      </div>

      <div className="section">
        <h2>Propriedades</h2>
        <div className="cards-grid">
          {/* Cards de propriedades */}
        </div>
      </div>
    </div>
  );
}
```

**Resultado:**
- Espaçamento vertical: 24px (space-y-6) entre elementos da seção

---

## 2. Card Variants

### Card Metric (com hover)

Card interativo com efeito hover:

```tsx
<Card className="card-metric" onClick={() => navigate('/details')}>
  <CardContent>
    <div className="text-sm text-muted-foreground">Vendas do Mês</div>
    <div className="text-2xl font-bold">R$ 1.234.567</div>
    <div className="text-xs text-green-600">+12.5% vs mês anterior</div>
  </CardContent>
</Card>
```

**Efeitos:**
- Padding: 24px (p-6)
- Hover: shadow-lg + translateY(-2px)
- Cursor: pointer
- Transição: 200ms

---

### Card Standard

Card padrão para conteúdo geral:

```tsx
<Card className="card-standard">
  <CardHeader>
    <CardTitle>Título do Card</CardTitle>
    <CardDescription>Descrição breve</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Conteúdo do card aqui...</p>
  </CardContent>
  <CardFooter>
    <Button>Ação</Button>
  </CardFooter>
</Card>
```

**Propriedades:**
- Padding: 24px (p-6)
- Espaçamento vertical: 16px (space-y-4)

---

### Card Compact

Card compacto para listas densas:

```tsx
<Card className="card-compact">
  <div className="flex items-center gap-3">
    <Avatar>
      <AvatarImage src={user.avatar} />
      <AvatarFallback>{user.initials}</AvatarFallback>
    </Avatar>
    <div>
      <div className="font-medium">{user.name}</div>
      <div className="text-xs text-muted-foreground">{user.email}</div>
    </div>
  </div>
</Card>
```

**Propriedades:**
- Padding: 16px (p-4)
- Espaçamento vertical: 12px (space-y-3)

---

## 3. Badges Semânticos

### Badge Success

```tsx
<Badge className="badge-success">
  Disponível
</Badge>

<Badge className="badge-success">
  Concluído
</Badge>
```

**Cores:**
- Light: bg-green-100, text-green-700
- Dark: bg-green-900/30, text-green-400

---

### Badge Warning

```tsx
<Badge className="badge-warning">
  Pendente
</Badge>

<Badge className="badge-warning">
  Atenção
</Badge>
```

**Cores:**
- Light: bg-amber-100, text-amber-700
- Dark: bg-amber-900/30, text-amber-400

---

### Badge Error

```tsx
<Badge className="badge-error">
  Urgente
</Badge>

<Badge className="badge-error">
  Atrasado
</Badge>
```

**Cores:**
- Light: bg-red-100, text-red-700
- Dark: bg-red-900/30, text-red-400

---

### Badge Info

```tsx
<Badge className="badge-info">
  Nova
</Badge>

<Badge className="badge-info">
  Informação
</Badge>
```

**Cores:**
- Light: bg-blue-100, text-blue-700
- Dark: bg-blue-900/30, text-blue-400

---

### Exemplo Completo com Status

```tsx
import { getStatusClass } from '@/lib/cn-helpers';

function PropertyStatus({ status }: { status: Status }) {
  const statusLabel = {
    success: 'Disponível',
    warning: 'Reservado',
    error: 'Indisponível',
    info: 'Nova',
  };

  return (
    <Badge className={getStatusClass(status)}>
      {statusLabel[status]}
    </Badge>
  );
}
```

---

## 4. Loading States

### Skeleton Card

```tsx
function LoadingPropertyCard() {
  return (
    <div className="skeleton-card h-48 w-full" />
  );
}
```

---

### Skeleton Text

```tsx
function LoadingText() {
  return (
    <div className="space-y-2">
      <div className="skeleton-text" />
      <div className="skeleton-text w-3/4" />
      <div className="skeleton-text w-1/2" />
    </div>
  );
}
```

---

### Skeleton Circle (Avatar)

```tsx
function LoadingAvatar() {
  return (
    <div className="skeleton-circle w-12 h-12" />
  );
}
```

---

### Exemplo Completo de Loading State

```tsx
function LoadingDashboard() {
  return (
    <div className="page-container">
      {/* Título */}
      <div className="skeleton-text h-8 w-48 mb-8" />

      {/* Métricas */}
      <div className="metrics-grid">
        <div className="skeleton-card h-32" />
        <div className="skeleton-card h-32" />
        <div className="skeleton-card h-32" />
        <div className="skeleton-card h-32" />
      </div>

      {/* Seção */}
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

---

## 5. Animations

### Slide Up

Animação de entrada deslizando de baixo para cima:

```tsx
function NotificationToast() {
  return (
    <div className="animate-slide-up">
      <Alert>
        <AlertTitle>Sucesso!</AlertTitle>
        <AlertDescription>
          Operação realizada com sucesso.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

**Propriedades:**
- Duração: 300ms
- Easing: ease-out
- Transform: translateY(10px) → translateY(0)
- Opacity: 0 → 1

---

### Fade In

Animação de fade in simples:

```tsx
function ModalContent() {
  return (
    <div className="animate-fade-in">
      <DialogContent>
        {/* Conteúdo do modal */}
      </DialogContent>
    </div>
  );
}
```

**Propriedades:**
- Duração: 200ms
- Easing: ease-out
- Opacity: 0 → 1

---

## 6. Focus States (Acessibilidade)

### Focus Ring Primary

```tsx
<Button className="focus-ring-primary">
  Ação Principal
</Button>

<Input
  type="text"
  className="focus-ring-primary"
  placeholder="Digite aqui..."
/>
```

**Propriedades:**
- Ring: 2px solid primary
- Ring offset: 2px
- Apenas visível com teclado (focus-visible)

---

### Focus Ring Error

```tsx
<Input
  type="email"
  className="focus-ring-error"
  placeholder="Email inválido"
/>
```

**Propriedades:**
- Ring: 2px solid red-500
- Ring offset: 2px
- Apenas visível com teclado (focus-visible)

---

## 7. Helpers TypeScript

### Usando Constantes

```typescript
import { SPACING, SEMANTIC_COLORS, TYPOGRAPHY } from '@/lib/design-constants';

// Espaçamento
const containerPadding = SPACING.comfortable; // '2rem'
const cardPadding = SPACING.default; // '1.5rem'

// Cores
const primaryColor = SEMANTIC_COLORS.primary; // '#1E7BE8'
const successColor = SEMANTIC_COLORS.success; // '#10B981'

// Tipografia
const h1Classes = TYPOGRAPHY.h1; // 'text-2xl sm:text-3xl font-bold'
```

---

### Usando Helper Functions

```typescript
import { getStatusClass, getTypographyClass } from '@/lib/cn-helpers';

function PropertyCard({ status, title }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className={getTypographyClass('h3')}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge className={getStatusClass(status)}>
          {status}
        </Badge>
      </CardContent>
    </Card>
  );
}
```

---

## 8. Exemplos de Páginas Completas

### Dashboard Completo

```tsx
import { getTypographyClass, getStatusClass } from '@/lib/cn-helpers';
import type { Status } from '@/lib/design-constants';

export default function Dashboard() {
  const metrics = [
    { label: 'Total Vendas', value: 'R$ 1.234.567', change: '+12.5%' },
    { label: 'Novos Leads', value: '156', change: '+8.2%' },
    { label: 'Conversão', value: '23.5%', change: '+2.1%' },
    { label: 'Ticket Médio', value: 'R$ 450.000', change: '+5.3%' },
  ];

  const properties = [
    { id: 1, name: 'Casa no Centro', status: 'success' as Status },
    { id: 2, name: 'Apartamento Zona Sul', status: 'warning' as Status },
    { id: 3, name: 'Sala Comercial', status: 'info' as Status },
  ];

  return (
    <div className="page-container">
      {/* Cabeçalho */}
      <h1 className={getTypographyClass('h1')}>Dashboard</h1>

      {/* Métricas */}
      <div className="section">
        <h2 className={getTypographyClass('h2')}>Métricas Principais</h2>
        <div className="metrics-grid">
          {metrics.map((metric, i) => (
            <Card key={i} className="card-metric">
              <CardContent className="pt-6">
                <div className="text-sm text-muted-foreground">
                  {metric.label}
                </div>
                <div className="text-2xl font-bold mt-2">
                  {metric.value}
                </div>
                <div className="text-xs text-green-600 mt-1">
                  {metric.change} vs mês anterior
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Propriedades */}
      <div className="section">
        <h2 className={getTypographyClass('h2')}>Propriedades Recentes</h2>
        <div className="cards-grid">
          {properties.map(property => (
            <Card key={property.id} className="card-standard">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className={getTypographyClass('h4')}>
                    {property.name}
                  </CardTitle>
                  <Badge className={getStatusClass(property.status)}>
                    {property.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Descrição da propriedade...
                </p>
              </CardContent>
              <CardFooter>
                <Button className="focus-ring-primary">
                  Ver Detalhes
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

### Loading State da Página

```tsx
export default function DashboardLoading() {
  return (
    <div className="page-container">
      {/* Título */}
      <div className="skeleton-text h-8 w-48 mb-8" />

      {/* Métricas */}
      <div className="section">
        <div className="skeleton-text h-6 w-40 mb-6" />
        <div className="metrics-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-card h-32" />
          ))}
        </div>
      </div>

      {/* Propriedades */}
      <div className="section">
        <div className="skeleton-text h-6 w-48 mb-6" />
        <div className="cards-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card h-48" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Checklist de Implementação

Ao criar uma nova página/componente, siga este checklist:

- [ ] Usar `page-container` como wrapper principal
- [ ] Aplicar `metrics-grid` para KPIs (1-4 métricas)
- [ ] Usar `cards-grid` para listas de cards (3+ itens)
- [ ] Aplicar `section` para separar seções principais
- [ ] Escolher variant de card apropriado:
  - [ ] `card-metric` para métricas interativas
  - [ ] `card-standard` para conteúdo geral
  - [ ] `card-compact` para listas densas
- [ ] Usar badges semânticos com helper `getStatusClass()`
- [ ] Implementar loading states com skeletons
- [ ] Adicionar animações de entrada (`animate-slide-up` ou `animate-fade-in`)
- [ ] Garantir acessibilidade com `focus-ring-primary` em elementos interativos
- [ ] Usar helpers de tipografia `getTypographyClass()` para títulos

---

## Performance Tips

1. **Lazy Loading de Cards:**
   ```tsx
   const PropertyCard = lazy(() => import('./PropertyCard'));

   <Suspense fallback={<div className="skeleton-card h-48" />}>
     <PropertyCard />
   </Suspense>
   ```

2. **Virtualization para Grids Grandes:**
   ```tsx
   // Para listas com 100+ itens
   import { useVirtualizer } from '@tanstack/react-virtual';
   ```

3. **Memoização de Cards:**
   ```tsx
   const MemoizedCard = memo(PropertyCard);
   ```

---

## Conclusão

Estas utilities fornecem um sistema consistente e escalável para construir interfaces no ImobiBase. Sempre consulte este guia e o `SPACING_GUIDE.md` para manter a consistência visual em toda a aplicação.
