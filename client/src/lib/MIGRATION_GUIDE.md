# Guia de Migração - Design System ImobiBase

Este guia ajuda a migrar código existente para usar o novo design system padronizado.

## Visão Geral das Mudanças

1. Cores de status agora são padronizadas via design tokens
2. Botões têm estados hover/disabled melhorados
3. Componentes de tipografia padronizados
4. Classes CSS utilitárias para cores de status
5. Componente StatusBadge para badges consistentes

## Migração Passo a Passo

### 1. Cores de Status

#### Antes (Código Antigo)
```tsx
const COLUMNS = [
  { id: "new", label: "Novo", color: "#3b82f6", bgColor: "bg-blue-500" },
  { id: "qualification", label: "Em Contato", color: "#8b5cf6", bgColor: "bg-purple-500" },
];

<div className="bg-blue-500 text-white">Novo</div>
```

#### Depois (Novo Design System)
```tsx
import { statusColors } from "@/lib/design-tokens";

const COLUMNS = [
  { id: "new", label: "Novo", color: statusColors.new.hex, bgColor: "bg-status-new" },
  { id: "qualification", label: "Em Contato", color: statusColors.qualification.hex, bgColor: "bg-status-qualification" },
];

<div className="bg-status-new text-white">Novo</div>
```

### 2. Badges de Status

#### Antes
```tsx
<Badge className="bg-blue-100 text-blue-700 border-blue-300">
  Novo
</Badge>
```

#### Depois
```tsx
import { StatusBadge } from "@/components/ui/status-badge";

<StatusBadge status="new">Novo</StatusBadge>
```

### 3. Cores Semânticas

#### Antes
```tsx
const STATUS = {
  pending: { color: "bg-amber-100 text-amber-700 border-amber-300" },
  accepted: { color: "bg-green-100 text-green-700 border-green-300" },
  rejected: { color: "bg-red-100 text-red-700 border-red-300" },
};
```

#### Depois
```tsx
const STATUS = {
  pending: { color: "badge-warning" },
  accepted: { color: "badge-success" },
  rejected: { color: "badge-error" },
};
```

### 4. Tipografia

#### Antes
```tsx
<h1 className="text-4xl font-bold">Título</h1>
<p className="text-base">Parágrafo</p>
<span className="text-xs text-gray-500">Legenda</span>
```

#### Depois
```tsx
import { H1, Text, Caption } from "@/components/ui/typography";

<H1>Título</H1>
<Text>Parágrafo</Text>
<Caption>Legenda</Caption>
```

### 5. Botões

#### Antes
```tsx
<button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
  Salvar
</button>
```

#### Depois
```tsx
import { Button } from "@/components/ui/button";

<Button>Salvar</Button>
```

Os botões agora têm automaticamente:
- Efeito hover com elevação
- Transições suaves
- Estados disabled melhorados
- Suporte a loading state

```tsx
<Button isLoading>Salvando...</Button>
<Button disabled>Desabilitado</Button>
```

## Tabela de Substituição de Classes

### Cores de Status

| Antiga | Nova |
|--------|------|
| `bg-blue-500` (para status "new") | `bg-status-new` |
| `bg-purple-500` (para status "qualification") | `bg-status-qualification` |
| `bg-orange-500` (para status "visit") | `bg-status-visit` |
| `bg-yellow-500` (para status "proposal") | `bg-status-proposal` |
| `bg-pink-500` (para status "negotiation") | `bg-status-negotiation` |
| `bg-green-500` (para status "contract/closed") | `bg-status-contract` |
| `bg-red-500` (para status "lost") | `bg-status-lost` |

### Badges Semânticos

| Antiga | Nova |
|--------|------|
| `bg-green-100 text-green-700 border-green-300` | `badge-success` |
| `bg-amber-100 text-amber-700 border-amber-300` | `badge-warning` |
| `bg-red-100 text-red-700 border-red-300` | `badge-error` |
| `bg-sky-100 text-sky-700 border-sky-300` | `badge-info` |

### Tipografia

| Antiga | Nova |
|--------|------|
| `text-4xl font-bold` | `heading-1` |
| `text-3xl font-semibold` | `heading-2` |
| `text-2xl font-semibold` | `heading-3` |
| `text-xl font-medium` | `heading-4` |
| `text-lg` | `body-lg` |
| `text-base` | `body-base` |
| `text-sm` | `body-sm` |
| `text-xs` | `body-xs` |
| `text-xs text-muted-foreground` | `caption` |

## Checklist de Migração

Para cada arquivo que você estiver atualizando:

- [ ] Substituir cores hardcoded por design tokens
- [ ] Usar classes CSS de status (`bg-status-*`, `text-status-*`, `border-status-*`)
- [ ] Substituir badges customizados por `<StatusBadge>`
- [ ] Usar badges semânticos (`badge-success`, `badge-warning`, etc.)
- [ ] Substituir tags de título HTML por componentes de tipografia
- [ ] Atualizar botões para usar o componente `<Button>`
- [ ] Verificar acessibilidade (contraste, foco visível)
- [ ] Testar em modo claro e escuro

## Exemplos de Arquivos Migrados

### Arquivo: `pages/leads/kanban.tsx`

```tsx
// ANTES
const COLUMNS = [
  { id: "new", label: "Novo", color: "#3b82f6", bgColor: "bg-blue-500" },
  { id: "qualification", label: "Em Contato", color: "#8b5cf6", bgColor: "bg-purple-500" },
  { id: "visit", label: "Visita", color: "#f97316", bgColor: "bg-orange-500" },
];

// DEPOIS
const COLUMNS = [
  { id: "new", label: "Novo", color: "#3b82f6", bgColor: "bg-status-new" },
  { id: "qualification", label: "Em Contato", color: "#8b5cf6", bgColor: "bg-status-qualification" },
  { id: "visit", label: "Visita", color: "#f97316", bgColor: "bg-status-visit" },
];
```

### Arquivo: `pages/vendas/index.tsx`

```tsx
// ANTES
const PROPOSAL_STATUS = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-300" },
  accepted: { label: "Aceita", color: "bg-green-100 text-green-700 border-green-300" },
};

// DEPOIS
const PROPOSAL_STATUS = {
  pending: { label: "Pendente", color: "badge-warning" },
  accepted: { label: "Aceita", color: "badge-success" },
};
```

## Recursos Adicionais

- **Documentação Completa**: `/client/src/lib/DESIGN_SYSTEM.md`
- **Design Tokens**: `/client/src/lib/design-tokens.ts`
- **Exemplo Prático**: `/client/src/components/examples/DesignSystemExample.tsx`
- **Importação Central**: `/client/src/lib/design-system.ts`

## Perguntas Frequentes

### Q: Preciso migrar tudo de uma vez?

**A:** Não. O design system é retrocompatível. Você pode migrar gradualmente, arquivo por arquivo.

### Q: E se eu precisar de uma cor que não está no design system?

**A:** Primeiro, verifique se alguma cor existente atende sua necessidade. Se realmente precisar de uma nova cor, adicione-a ao `design-tokens.ts` para manter a consistência.

### Q: Os botões agora têm animações. Como desabilitar?

**A:** As animações respeitam `prefers-reduced-motion`. Para desabilitar completamente, você pode sobrescrever as classes no componente específico.

### Q: Como usar design tokens com estilos inline?

**A:**
```tsx
import { statusColors, spacing } from "@/lib/design-tokens";

<div style={{
  backgroundColor: statusColors.new.hex,
  padding: spacing.md
}}>
  Conteúdo
</div>
```

### Q: Posso misturar componentes antigos e novos?

**A:** Sim, mas recomendamos migrar completamente cada página/feature para garantir consistência visual.

## Exemplo Completo: Antes e Depois de uma Página

### Antes (Inconsistente)

```tsx
export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <button className="bg-blue-500 text-white px-4 py-2 rounded">
          Ação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded shadow">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">42</p>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-xl mb-4">Imóveis</h2>
        <div className="grid grid-cols-3 gap-6">
          {/* Cards */}
        </div>
      </div>
    </div>
  );
}
```

### Depois (Padronizado)

```tsx
import { PageHeader, MetricCard, H2 } from '@/lib/design-system';
import { Building2 } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="page-container">
      <PageHeader
        title="Dashboard"
        actions={<Button>Ação</Button>}
      />

      <div className="metrics-grid">
        <MetricCard
          icon={Building2}
          label="Total de Imóveis"
          value={42}
        />
      </div>

      <div className="section">
        <H2>Imóveis</H2>
        <div className="cards-grid">
          {/* Cards */}
        </div>
      </div>
    </div>
  );
}
```

## Benefícios da Migração

1. **Consistência Visual**: Mesmos padrões em toda aplicação
2. **Manutenibilidade**: Mudanças centralizadas nos componentes base
3. **Acessibilidade**: Componentes com ARIA e focus states corretos
4. **Performance**: Componentes otimizados
5. **Dark Mode**: Suporte automático
6. **Menor Bundle**: Classes utilitárias reutilizadas

## Suporte

Se tiver dúvidas sobre a migração, consulte:
1. A documentação em `DESIGN_SYSTEM_GUIDE.md`
2. Exemplos em `COMPONENT_EXAMPLES.md`
3. Guia de espaçamento em `SPACING_GUIDE.md`
4. Os design tokens em `design-tokens.ts`
