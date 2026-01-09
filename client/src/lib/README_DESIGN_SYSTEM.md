# ImobiBase Design System

Sistema de design completo e padronizado para consistência visual em toda a aplicação.

## Início Rápido

### Importação Única

```typescript
import {
  // Tokens
  statusColors,
  spacing,
  typography,

  // Helpers
  getStatusLabel,
  getStatusProgress,

  // Componentes
  Button,
  StatusBadge,
  H1,
  H2,
  Text
} from "@/lib/design-system"
```

### Exemplos Básicos

#### Badge de Status
```tsx
<StatusBadge status="new">Novo</StatusBadge>
<StatusBadge status="contract" size="lg">Fechado</StatusBadge>
```

#### Botões
```tsx
<Button>Salvar</Button>
<Button variant="outline">Cancelar</Button>
<Button isLoading>Salvando...</Button>
```

#### Tipografia
```tsx
<H1>Título Principal</H1>
<H2>Subtítulo</H2>
<Text>Parágrafo normal</Text>
<Caption>Legenda pequena</Caption>
```

#### Cores com CSS
```tsx
<div className="bg-status-new text-white">Novo</div>
<span className="badge-success">Sucesso</span>
```

## Estrutura de Arquivos

```
client/src/lib/
├── design-tokens.ts          # Tokens centralizados (cores, espaçamento, etc.)
├── design-helpers.ts         # Funções utilitárias
├── design-system.ts          # Exportações centralizadas (USE ESTE!)
├── DESIGN_SYSTEM.md          # Documentação completa
├── MIGRATION_GUIDE.md        # Guia de migração
└── README_DESIGN_SYSTEM.md   # Este arquivo

client/src/components/ui/
├── status-badge.tsx          # Badge de status
├── typography.tsx            # Componentes de tipografia
├── button.tsx                # Botão com estados melhorados
└── badge.tsx                 # Badge genérico

client/src/components/examples/
└── DesignSystemExample.tsx   # Showcase completo
```

## Cores de Status

| Status | Uso | Cor |
|--------|-----|-----|
| `new` | Novo lead/item | Azul |
| `qualification` | Em qualificação | Roxo |
| `visit` | Visita agendada | Laranja |
| `proposal` | Proposta enviada | Cyan |
| `negotiation` | Em negociação | Rosa |
| `contract` | Fechado | Verde |
| `lost` | Perdido | Vermelho |

## Classes CSS Disponíveis

### Status
- `bg-status-{nome}` - Background
- `text-status-{nome}` - Texto
- `border-status-{nome}` - Borda

### Semântico
- `badge-success` - Verde (sucesso)
- `badge-warning` - Âmbar (atenção)
- `badge-error` - Vermelho (erro)
- `badge-info` - Azul (informação)

### Tipografia
- `heading-1` até `heading-6` - Títulos
- `body-lg`, `body-base`, `body-sm`, `body-xs` - Corpo
- `caption` - Legenda pequena

## Helpers Úteis

```typescript
// Labels amigáveis
getStatusLabel("new") // "Novo"

// Progresso no pipeline
getStatusProgress("visit") // 40 (%)

// Próximo status
getNextStatus("new") // "qualification"

// Verificar tipo de status
isPositiveStatus("contract") // true
isProgressStatus("visit") // true

// Estilos inline
getStatusBackgroundStyle("new") // { backgroundColor: "#3b82f6" }

// Acessibilidade
meetsWCAGAA("#3b82f6", "#ffffff") // true
```

## Componentes Principais

### StatusBadge

```tsx
<StatusBadge
  status="new"      // Obrigatório
  size="md"         // Opcional: "sm" | "md" | "lg"
  className="..."   // Classes adicionais
>
  Conteúdo
</StatusBadge>
```

### Button

```tsx
<Button
  variant="default"     // "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size="default"        // "default" | "sm" | "lg" | "icon"
  isLoading={false}     // Estado de loading
  disabled={false}      // Desabilitado
>
  Texto do Botão
</Button>
```

### Typography

```tsx
<H1 className="...">Título H1</H1>
<H2>Título H2</H2>
<H3>Título H3</H3>
<H4>Título H4</H4>

<Text size="base" variant="default">Texto normal</Text>
<Text size="sm" variant="muted">Texto secundário</Text>

<Lead>Parágrafo de abertura destacado</Lead>
<Muted>Texto discreto</Muted>
<Caption>Legenda pequena</Caption>
```

## Padrões de Uso

### Card de Lead com Status

```tsx
import { Card, CardHeader, CardTitle, StatusBadge, getStatusLabel } from "@/lib/design-system"

function LeadCard({ lead }) {
  return (
    <Card className="card-hover">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{lead.name}</CardTitle>
          <StatusBadge status={lead.status}>
            {getStatusLabel(lead.status)}
          </StatusBadge>
        </div>
      </CardHeader>
    </Card>
  )
}
```

### Barra de Progresso com Status

```tsx
import { Progress } from "@/components/ui/progress"
import { getStatusProgress, statusColors } from "@/lib/design-system"

function LeadProgress({ status }) {
  const progress = getStatusProgress(status)
  const color = statusColors[status]

  return (
    <div>
      <Progress value={progress} className={color.bg} />
      <Text size="sm" className="mt-1">{progress}% completo</Text>
    </div>
  )
}
```

### Lista de Status Filtráveis

```tsx
import { getStatusChipClassName } from "@/lib/design-system"

function StatusFilter({ activeStatus, onSelect }) {
  const statuses = ["new", "qualification", "visit", "proposal", "contract"] as const

  return (
    <div className="flex gap-2">
      {statuses.map((status) => (
        <button
          key={status}
          onClick={() => onSelect(status)}
          className={getStatusChipClassName(status, activeStatus === status)}
        >
          {getStatusLabel(status)}
        </button>
      ))}
    </div>
  )
}
```

## Boas Práticas

1. **Sempre use design tokens** ao invés de cores hardcoded
2. **Prefira componentes** sobre classes CSS quando disponível
3. **Mantenha acessibilidade** verificando contraste com helpers
4. **Teste em modo escuro** todas as suas implementações
5. **Documente novos padrões** se criar componentes reutilizáveis

## Recursos

- **Documentação Completa**: `DESIGN_SYSTEM.md`
- **Guia de Migração**: `MIGRATION_GUIDE.md`
- **Exemplo Visual**: `components/examples/DesignSystemExample.tsx`
- **Tokens**: `design-tokens.ts`
- **Helpers**: `design-helpers.ts`

## Suporte TypeScript

Todos os tokens e componentes são totalmente tipados:

```typescript
import type { StatusColorKey, SemanticColorKey } from "@/lib/design-system"

const status: StatusColorKey = "new" // ✓ Tipado
const color: StatusColorKey = "invalid" // ✗ Erro de tipo
```

## Dicas de Performance

- Classes CSS são compiladas em build time (sem overhead)
- Componentes são tree-shakeable
- Design tokens são constantes (não reativos)
- Helpers são pure functions (podem ser memoizadas)

## Próximos Passos

1. Veja o showcase: `DesignSystemExample.tsx`
2. Leia a documentação completa: `DESIGN_SYSTEM.md`
3. Consulte o guia de migração: `MIGRATION_GUIDE.md`
4. Comece a usar em seus componentes!

---

**Desenvolvido para ImobiBase - Sistema de Design v1.0**
