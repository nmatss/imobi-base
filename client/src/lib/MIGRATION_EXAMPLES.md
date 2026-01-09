# Exemplos de Migração - Utilities CSS

Guia prático de como migrar componentes existentes para usar as novas utilities CSS.

---

## 1. Dashboard de Vendas

### Antes (código antigo)

```tsx
export default function VendasDashboard() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Dashboard de Vendas</h1>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Vendas</div>
            <div className="text-2xl font-bold">R$ 1.234.567</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Novas Vendas</div>
            <div className="text-2xl font-bold">45</div>
          </CardContent>
        </Card>
      </div>

      {/* Vendas Recentes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Vendas Recentes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Casa Centro</CardTitle>
            </CardHeader>
            <CardContent>
              <p>R$ 450.000</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

### Depois (com utilities) ✨

```tsx
import { getTypographyClass, getStatusClass } from '@/lib/cn-helpers';

export default function VendasDashboard() {
  return (
    <div className="page-container">
      <h1 className={getTypographyClass('h1')}>Dashboard de Vendas</h1>

      {/* Métricas */}
      <div className="metrics-grid">
        <Card className="card-metric">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Total Vendas</div>
            <div className="text-2xl font-bold">R$ 1.234.567</div>
          </CardContent>
        </Card>
        <Card className="card-metric">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Novas Vendas</div>
            <div className="text-2xl font-bold">45</div>
          </CardContent>
        </Card>
      </div>

      {/* Vendas Recentes */}
      <div className="section">
        <h2 className={getTypographyClass('h2')}>Vendas Recentes</h2>
        <div className="cards-grid">
          <Card className="card-standard">
            <CardHeader>
              <CardTitle>Casa Centro</CardTitle>
            </CardHeader>
            <CardContent>
              <p>R$ 450.000</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

**Mudanças:**
- ✅ `space-y-6 p-6` → `page-container`
- ✅ `text-2xl font-bold` → `getTypographyClass('h1')`
- ✅ Grid manual → `metrics-grid`
- ✅ `space-y-4` + `text-xl` → `section` + `getTypographyClass('h2')`
- ✅ Grid manual → `cards-grid`
- ✅ Card padrão → `card-standard`
- ✅ Card de métrica → `card-metric`

---

## 2. Lista de Propriedades

### Antes

```tsx
function PropertiesList({ properties }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Propriedades</h2>
        <Button>Nova Propriedade</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map(property => (
          <Card key={property.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{property.name}</CardTitle>
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                  Disponível
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p>{property.address}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Depois ✨

```tsx
import { getTypographyClass, getStatusClass } from '@/lib/cn-helpers';

function PropertiesList({ properties, loading }: Props) {
  if (loading) {
    return (
      <div className="cards-grid">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton-card h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="section">
      <div className="flex items-center justify-between">
        <h2 className={getTypographyClass('h2')}>Propriedades</h2>
        <Button className="focus-ring-primary">Nova Propriedade</Button>
      </div>

      <div className="cards-grid">
        {properties.map(property => (
          <Card key={property.id} className="card-standard">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{property.name}</CardTitle>
                <Badge className={getStatusClass('success')}>
                  Disponível
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p>{property.address}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Mudanças:**
- ✅ Grid manual → `cards-grid`
- ✅ Skeleton manual → `skeleton-card`
- ✅ `space-y-6` → `section`
- ✅ `text-xl font-semibold` → `getTypographyClass('h2')`
- ✅ Badge manual → `getStatusClass('success')`
- ✅ Card padrão → `card-standard`
- ✅ Button → `focus-ring-primary`

---

## 3. Kanban de Leads

### Antes

```tsx
function LeadsKanban({ leads }: Props) {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pipeline de Leads</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {['Novo', 'Contato', 'Qualificado', 'Proposta', 'Ganho'].map(status => (
          <div key={status} className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="font-medium">{status}</div>
            <div className="space-y-2">
              {leads[status]?.map(lead => (
                <Card key={lead.id} className="p-3">
                  <div className="font-medium text-sm">{lead.name}</div>
                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Depois ✨

```tsx
import { getTypographyClass } from '@/lib/cn-helpers';

function LeadsKanban({ leads }: Props) {
  return (
    <div className="page-container">
      <h1 className={getTypographyClass('h1')}>Pipeline de Leads</h1>

      <div className="cards-grid">
        {['Novo', 'Contato', 'Qualificado', 'Proposta', 'Ganho'].map(status => (
          <div key={status} className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className={getTypographyClass('h4')}>{status}</div>
            <div className="space-y-2">
              {leads[status]?.map(lead => (
                <Card key={lead.id} className="card-compact">
                  <div className="font-medium text-sm">{lead.name}</div>
                  <div className="text-xs text-muted-foreground">{lead.email}</div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Mudanças:**
- ✅ `p-6 space-y-6` → `page-container`
- ✅ `text-2xl font-bold` → `getTypographyClass('h1')`
- ✅ Grid manual → `cards-grid`
- ✅ `font-medium` → `getTypographyClass('h4')`
- ✅ `p-3` → `card-compact`

---

## 4. Métricas do Dashboard Financeiro

### Antes

```tsx
function FinancialMetrics({ metrics }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Métricas Financeiras</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <Card
            key={i}
            className="cursor-pointer transition-all hover:shadow-lg"
            onClick={() => navigate(`/financial/${metric.id}`)}
          >
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div className="text-2xl font-bold mt-2">{metric.value}</div>
              <div className="text-xs text-green-600 mt-1">
                {metric.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

### Depois ✨

```tsx
import { getTypographyClass } from '@/lib/cn-helpers';

function FinancialMetrics({ metrics }: Props) {
  return (
    <div className="section">
      <h2 className={getTypographyClass('h2')}>Métricas Financeiras</h2>

      <div className="metrics-grid">
        {metrics.map((metric, i) => (
          <Card
            key={i}
            className="card-metric"
            onClick={() => navigate(`/financial/${metric.id}`)}
          >
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div className="text-2xl font-bold mt-2">{metric.value}</div>
              <div className="text-xs text-green-600 mt-1">
                {metric.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

**Mudanças:**
- ✅ `space-y-6` → `section`
- ✅ `text-xl font-semibold` → `getTypographyClass('h2')`
- ✅ Grid manual → `metrics-grid`
- ✅ Classes de hover → `card-metric`

---

## 5. Modal/Dialog com Loading

### Antes

```tsx
function PropertyModal({ propertyId, open, onOpenChange }: Props) {
  const { data: property, isLoading } = useProperty(propertyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-6 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                {property.name}
              </DialogTitle>
            </DialogHeader>
            <div>
              <p>{property.description}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button>Salvar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### Depois ✨

```tsx
import { getTypographyClass } from '@/lib/cn-helpers';

function PropertyModal({ propertyId, open, onOpenChange }: Props) {
  const { data: property, isLoading } = useProperty(propertyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="animate-fade-in">
        {isLoading ? (
          <div className="space-y-4">
            <div className="skeleton-text h-6" />
            <div className="skeleton-text w-3/4" />
            <div className="skeleton-card h-32" />
          </div>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className={getTypographyClass('h2')}>
                {property.name}
              </DialogTitle>
            </DialogHeader>
            <div>
              <p>{property.description}</p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                className="focus-ring-primary"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button className="focus-ring-primary">Salvar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Mudanças:**
- ✅ Skeleton manual → `skeleton-text` + `skeleton-card`
- ✅ `text-xl font-semibold` → `getTypographyClass('h2')`
- ✅ Dialog → `animate-fade-in`
- ✅ Buttons → `focus-ring-primary`

---

## 6. Notificação Toast

### Antes

```tsx
function showSuccessToast(message: string) {
  toast({
    title: "Sucesso!",
    description: message,
    duration: 3000,
  });
}
```

### Depois ✨

```tsx
function showSuccessToast(message: string) {
  toast({
    title: (
      <div className="animate-slide-up">
        Sucesso!
      </div>
    ),
    description: message,
    duration: 3000,
    className: "animate-fade-in",
  });
}
```

**Mudanças:**
- ✅ Toast → `animate-slide-up` + `animate-fade-in`

---

## 7. Formulário com Status

### Antes

```tsx
function PropertyForm({ property }: Props) {
  const [status, setStatus] = useState<'available' | 'reserved' | 'sold'>('available');

  return (
    <form className="space-y-6">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="available">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                Disponível
              </span>
            </SelectItem>
            <SelectItem value="reserved">
              <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs">
                Reservado
              </span>
            </SelectItem>
            <SelectItem value="sold">
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                Vendido
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit">Salvar</Button>
        <Button type="button" variant="outline">Cancelar</Button>
      </div>
    </form>
  );
}
```

### Depois ✨

```tsx
import { getStatusClass } from '@/lib/cn-helpers';

function PropertyForm({ property }: Props) {
  const [status, setStatus] = useState<Status>('success');

  const statusOptions = [
    { value: 'success', label: 'Disponível' },
    { value: 'warning', label: 'Reservado' },
    { value: 'error', label: 'Vendido' },
  ] as const;

  return (
    <form className="space-y-6">
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="focus-ring-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                <Badge className={getStatusClass(option.value)}>
                  {option.label}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="focus-ring-primary">
          Salvar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="focus-ring-primary"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
```

**Mudanças:**
- ✅ Badge manual → `getStatusClass()`
- ✅ Type-safe status → `Status` type
- ✅ Inputs → `focus-ring-primary`
- ✅ Buttons → `focus-ring-primary`

---

## Checklist de Migração

Ao migrar um componente, siga este checklist:

### Layout
- [ ] `p-6 space-y-6` → `page-container`?
- [ ] `space-y-4/6` → `section`?
- [ ] Grid de métricas → `metrics-grid`?
- [ ] Grid de cards → `cards-grid`?

### Tipografia
- [ ] `text-2xl font-bold` → `getTypographyClass('h1')`?
- [ ] `text-xl font-semibold` → `getTypographyClass('h2')`?
- [ ] Outros headings → helpers?

### Cards
- [ ] Card com hover → `card-metric`?
- [ ] Card padrão → `card-standard`?
- [ ] Card pequeno → `card-compact`?

### Status/Badges
- [ ] Badges manuais → `getStatusClass()`?
- [ ] Type safety → `Status` type?

### Loading
- [ ] Skeletons manuais → utilities?
- [ ] `skeleton-card`, `skeleton-text`, `skeleton-circle`?

### Animações
- [ ] Modals → `animate-fade-in`?
- [ ] Toasts → `animate-slide-up`?

### Acessibilidade
- [ ] Buttons → `focus-ring-primary`?
- [ ] Inputs → `focus-ring-primary`?
- [ ] Erros → `focus-ring-error`?

---

## Benefícios da Migração

### Redução de Código
- **Antes:** ~50 linhas de classes CSS inline
- **Depois:** ~20 linhas usando utilities
- **Redução:** 60% menos código

### Type Safety
```tsx
// Antes (sem type safety)
<Badge className="bg-green-100 text-green-700">
  {status}
</Badge>

// Depois (com type safety)
<Badge className={getStatusClass(status)}>
  {status}
</Badge>
```

### Consistência
- ✅ Espaçamento padronizado (8pt grid)
- ✅ Cores consistentes
- ✅ Tipografia consistente
- ✅ Animações consistentes

### Manutenibilidade
- ✅ Mudanças centralizadas em `design-constants.ts`
- ✅ Utilities reutilizáveis
- ✅ Documentação clara
- ✅ Type-safe

### Performance
- ✅ Classes CSS otimizadas
- ✅ Menos CSS customizado
- ✅ Melhor tree-shaking
- ✅ Menor bundle size

---

## Dicas de Migração

1. **Migre gradualmente:** Comece pelas páginas mais usadas
2. **Teste cada migração:** Valide responsividade e dark mode
3. **Use os helpers:** Sempre prefira `getStatusClass()` e `getTypographyClass()`
4. **Mantenha consistência:** Use as mesmas utilities em contextos similares
5. **Documente mudanças:** Atualize comentários se necessário

---

## Recursos

- [SPACING_GUIDE.md](./SPACING_GUIDE.md) - Guia de espaçamento
- [UTILITIES_EXAMPLES.md](./UTILITIES_EXAMPLES.md) - Exemplos detalhados
- [design-constants.ts](./design-constants.ts) - Constantes TypeScript
- [cn-helpers.ts](./cn-helpers.ts) - Helper functions
