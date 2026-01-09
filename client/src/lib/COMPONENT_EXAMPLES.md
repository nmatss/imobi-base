# Exemplos de Componentes

Exemplos práticos de uso dos componentes base do ImobiBase Design System.

## MetricCard

### Básico
```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { Users } from 'lucide-react';

<MetricCard
  icon={Users}
  label="Total de Leads"
  value={127}
/>
```

### Com Trend
```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { DollarSign } from 'lucide-react';

<MetricCard
  icon={DollarSign}
  label="Receita Mensal"
  value="R$ 45.000"
  trend={{
    value: "+12%",
    direction: "up",
    label: "vs mês anterior"
  }}
/>
```

### Clicável
```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { Building2 } from 'lucide-react';
import { useNavigate } from 'wouter';

const navigate = useNavigate();

<MetricCard
  icon={Building2}
  label="Imóveis Ativos"
  value={42}
  onClick={() => navigate('/properties')}
/>
```

### Grid de Métricas
```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { Building2, Users, DollarSign, Calendar } from 'lucide-react';

<div className="metrics-grid">
  <MetricCard
    icon={Building2}
    label="Imóveis"
    value={42}
    trend={{ value: "+5", direction: "up" }}
  />
  <MetricCard
    icon={Users}
    label="Leads"
    value={127}
    trend={{ value: "+18", direction: "up" }}
  />
  <MetricCard
    icon={DollarSign}
    label="Receita"
    value="R$ 45.000"
    trend={{ value: "+12%", direction: "up" }}
  />
  <MetricCard
    icon={Calendar}
    label="Visitas Hoje"
    value={8}
  />
</div>
```

## PageHeader

### Básico
```tsx
import { PageHeader } from '@/components/ui/PageHeader';

<PageHeader
  title="Dashboard"
  description="Visão geral do sistema"
/>
```

### Com Badge
```tsx
import { PageHeader } from '@/components/ui/PageHeader';

<PageHeader
  title="Leads"
  description="Gestão de leads e oportunidades"
  badge={{ label: "127 ativos", variant: "secondary" }}
/>
```

### Com Ação
```tsx
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

<PageHeader
  title="Imóveis"
  description="Gestão de propriedades"
  actions={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Novo Imóvel
    </Button>
  }
/>
```

### Completo
```tsx
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';

<PageHeader
  title="Propriedades"
  description="Gerencie todos os imóveis da carteira"
  badge={{ label: "42 ativos", variant: "default" }}
  actions={
    <>
      <Button variant="outline">
        <Filter className="h-4 w-4 mr-2" />
        Filtrar
      </Button>
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar
      </Button>
    </>
  }
/>
```

## StatusBadge

### Variantes
```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge status="success" label="Disponível" />
<StatusBadge status="warning" label="Pendente" />
<StatusBadge status="error" label="Atrasado" />
<StatusBadge status="info" label="Em análise" />
<StatusBadge status="neutral" label="Arquivado" />
```

### Tamanhos
```tsx
import { StatusBadge } from '@/components/ui/status-badge';

<StatusBadge status="success" label="Pequeno" size="sm" />
<StatusBadge status="success" label="Médio" size="md" />
<StatusBadge status="success" label="Grande" size="lg" />
```

### Em Cards
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';

<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Apartamento Centro</CardTitle>
      <StatusBadge status="success" label="Disponível" size="sm" />
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold">R$ 450.000</p>
  </CardContent>
</Card>
```

## EmptyState

### Básico
```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Inbox } from 'lucide-react';

<EmptyState
  icon={Inbox}
  title="Nenhum item encontrado"
  description="Não há itens para exibir no momento"
/>
```

### Com Ação
```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Building2 } from 'lucide-react';

<EmptyState
  icon={Building2}
  title="Nenhum imóvel cadastrado"
  description="Adicione seu primeiro imóvel para começar a gerenciar sua carteira"
  action={{
    label: "Adicionar Imóvel",
    onClick: () => openModal()
  }}
/>
```

### Filtro Sem Resultados
```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchX } from 'lucide-react';

<EmptyState
  icon={SearchX}
  title="Nenhum resultado encontrado"
  description="Tente ajustar os filtros ou realizar uma nova busca"
  action={{
    label: "Limpar Filtros",
    onClick: () => clearFilters()
  }}
/>
```

## LoadingState

### Skeleton Card
```tsx
import { Card } from '@/components/ui/card';

<Card className="card-standard">
  <div className="skeleton-text w-32 h-6 mb-3" />
  <div className="skeleton-text w-full h-4 mb-2" />
  <div className="skeleton-text w-3/4 h-4" />
</Card>
```

### Skeleton Metrics Grid
```tsx
<div className="metrics-grid">
  {[1, 2, 3, 4].map((i) => (
    <Card key={i} className="card-metric">
      <div className="skeleton-circle w-10 h-10 mb-3" />
      <div className="skeleton-text w-24 h-8 mb-2" />
      <div className="skeleton-text w-32 h-4" />
    </Card>
  ))}
</div>
```

## Layouts Comuns

### Página Padrão
```tsx
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

<div className="page-container">
  <PageHeader
    title="Título da Página"
    description="Descrição da página"
    actions={
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Nova Ação
      </Button>
    }
  />

  <div className="metrics-grid">
    {/* KPIs aqui */}
  </div>

  <div className="cards-grid">
    {/* Cards aqui */}
  </div>
</div>
```

### Dashboard Layout
```tsx
import { PageHeader } from '@/components/ui/PageHeader';
import { MetricCard } from '@/components/ui/MetricCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building2, Users, DollarSign, Calendar } from 'lucide-react';

<div className="page-container">
  {/* Header */}
  <PageHeader
    title="Dashboard"
    description="Visão geral do sistema"
  />

  {/* Métricas principais */}
  <div className="metrics-grid">
    <MetricCard icon={Building2} label="Imóveis" value={42} />
    <MetricCard icon={Users} label="Leads" value={127} />
    <MetricCard icon={DollarSign} label="Receita" value="R$ 45k" />
    <MetricCard icon={Calendar} label="Visitas" value={8} />
  </div>

  {/* Conteúdo principal */}
  <div className="grid lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
      <Card className="card-standard">
        <CardHeader>
          <CardTitle>Pipeline de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Conteúdo */}
        </CardContent>
      </Card>
    </div>
    <div>
      <Card className="card-standard">
        <CardHeader>
          <CardTitle>Agenda Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Conteúdo */}
        </CardContent>
      </Card>
    </div>
  </div>
</div>
```

### Lista com Filtros
```tsx
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Filter, Inbox } from 'lucide-react';

<div className="page-container">
  <PageHeader
    title="Imóveis"
    description="Gestão de propriedades"
    actions={
      <>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtrar
        </Button>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Imóvel
        </Button>
      </>
    }
  />

  {items.length === 0 ? (
    <EmptyState
      icon={Inbox}
      title="Nenhum imóvel cadastrado"
      description="Adicione seu primeiro imóvel"
      action={{ label: "Adicionar", onClick: handleAdd }}
    />
  ) : (
    <div className="cards-grid">
      {items.map(item => (
        <Card key={item.id} className="card-standard">
          {/* Card content */}
        </Card>
      ))}
    </div>
  )}
</div>
```

## Dicas de Uso

1. **Sempre use page-container**: Garante espaçamento consistente
2. **Prefira metrics-grid para KPIs**: Layout responsivo automático
3. **Use StatusBadge para status**: Cores semânticas consistentes
4. **EmptyState é obrigatório**: Sempre mostre estado vazio
5. **1 CTA principal**: Use variant="outline" para secundários
6. **Mobile-first**: Teste sempre em mobile primeiro
7. **Acessibilidade**: Adicione aria-labels quando necessário
8. **Loading states**: Sempre mostre skeleton durante carregamento
