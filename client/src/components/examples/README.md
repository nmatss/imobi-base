# Component Examples

Este diretório contém exemplos práticos de uso dos componentes do Design System do ImobiBase.

## Arquivos de Exemplo

### MetricCardExample.tsx
Demonstra diferentes variações do componente `MetricCard`:
- Básico (sem trend)
- Com trend positivo/negativo/neutro
- Clicável (com navegação)
- Valores formatados
- Customizado com className

### StatusBadgeExample.tsx
Demonstra uso do componente `StatusBadge`:
- Todas as variantes de status (success, warning, error, info, neutral)
- Diferentes tamanhos (sm, md, lg)
- Uso em cards, tabelas e listas
- Guia de cores semânticas

## Como Usar

### 1. Visualizar Exemplos

Para visualizar os exemplos, você pode:

1. Importar e renderizar diretamente em uma página de desenvolvimento:

```tsx
import MetricCardExamples from '@/components/examples/MetricCardExample';

export default function DevPage() {
  return <MetricCardExamples />;
}
```

2. Ou criar uma rota específica para visualização:

```tsx
// Em App.tsx ou routes
<Route path="/dev/examples/metric-card" component={MetricCardExamples} />
<Route path="/dev/examples/status-badge" component={StatusBadgeExamples} />
```

### 2. Copiar Código

Todos os exemplos estão prontos para copiar e colar. Cada seção demonstra um caso de uso específico.

### 3. Referência Rápida

Use os exemplos como referência ao implementar novas páginas:

```tsx
// Copie diretamente do exemplo:
import { MetricCard } from '@/components/ui/MetricCard';

<div className="metrics-grid">
  <MetricCard
    icon={Building2}
    label="Imóveis"
    value={42}
    trend={{ value: "+5", direction: "up" }}
  />
</div>
```

## Estrutura Recomendada

Ao adicionar novos exemplos, siga esta estrutura:

```tsx
export function ComponentNameExamples() {
  return (
    <div className="page-container">
      <h1>ComponentName Examples</h1>
      <p className="text-muted-foreground">Descrição</p>

      {/* Exemplo 1 */}
      <section className="section">
        <h2>1. Caso de Uso Básico</h2>
        {/* Código exemplo */}
      </section>

      {/* Exemplo 2 */}
      <section className="section">
        <h2>2. Caso de Uso Avançado</h2>
        {/* Código exemplo */}
      </section>

      {/* Dicas */}
      <section className="section">
        <div className="bg-muted p-6 rounded-lg">
          <h3>Dicas de Uso:</h3>
          <ul>
            <li>Dica 1</li>
            <li>Dica 2</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
```

## Adicionar Novos Exemplos

Para adicionar um novo arquivo de exemplo:

1. Crie um arquivo `ComponentNameExample.tsx`
2. Siga a estrutura acima
3. Documente diferentes casos de uso
4. Adicione dicas práticas
5. Atualize este README

### Exemplo de Novo Arquivo

```tsx
/**
 * EmptyState Component Examples
 */

import { EmptyState } from '@/components/ui/EmptyState';

export function EmptyStateExamples() {
  return (
    <div className="page-container">
      <h1>EmptyState Examples</h1>

      <section className="section">
        <h2>1. Básico</h2>
        <EmptyState
          icon={Inbox}
          title="Nenhum item"
          description="Descrição aqui"
        />
      </section>

      {/* Mais exemplos... */}
    </div>
  );
}
```

## Componentes Faltantes

Exemplos ainda não criados:

- [ ] PageHeaderExample.tsx
- [ ] EmptyStateExample.tsx
- [ ] LoadingStateExample.tsx
- [ ] TypographyExample.tsx
- [ ] LayoutsExample.tsx (combinação de componentes)

## Recursos Adicionais

- [Design System Guide](../../lib/DESIGN_SYSTEM_GUIDE.md)
- [Component Examples](../../lib/COMPONENT_EXAMPLES.md)
- [Spacing Guide](../../lib/SPACING_GUIDE.md)
- [Migration Guide](../../lib/MIGRATION_GUIDE.md)
