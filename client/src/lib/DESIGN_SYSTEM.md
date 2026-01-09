# ImobiBase Design System

Sistema de design padronizado para garantir consistência visual em toda a aplicação.

## Uso dos Design Tokens

Todos os design tokens estão centralizados em `/client/src/lib/design-tokens.ts`.

### Importando Design Tokens

```typescript
import {
  spacing,
  statusColors,
  semanticColors,
  typography,
  getStatusColor,
  getSemanticColor,
  getStatusBadgeClasses
} from "@/lib/design-tokens";
```

## Cores de Status

Cores padronizadas para pipeline CRM e leads:

| Status | Cor | Hex | Uso |
|--------|-----|-----|-----|
| `new` | Azul | `#3b82f6` | Novo lead/item |
| `qualification` | Roxo | `#8b5cf6` | Em qualificação/contato |
| `visit` | Laranja | `#f97316` | Visita agendada |
| `proposal` | Cyan | `#06b6d4` | Proposta enviada |
| `negotiation` | Rosa | `#ec4899` | Em negociação |
| `contract` | Verde | `#22c55e` | Contrato/Fechado |
| `closed` | Verde | `#22c55e` | Fechado (alias) |
| `lost` | Vermelho | `#ef4444` | Perdido |

### Uso com CSS

```tsx
// Usando classes CSS diretas
<div className="bg-status-new">Novo</div>
<div className="text-status-contract">Fechado</div>
<div className="border-status-proposal">Proposta</div>
```

### Uso com Design Tokens

```tsx
import { getStatusColor } from "@/lib/design-tokens";

const color = getStatusColor("new");
// color = { hex, rgb, hsl, bg, bgLight, text, border }

<div className={color.bg}>Novo Lead</div>
<div className={color.bgLight + " " + color.text}>Badge</div>
```

### Usando StatusBadge Component

```tsx
import { StatusBadge } from "@/components/ui/status-badge";

<StatusBadge status="new">Novo</StatusBadge>
<StatusBadge status="contract" size="lg">Fechado</StatusBadge>
```

## Cores Semânticas

Para feedback e estados do sistema:

| Tipo | Cor | Uso |
|------|-----|-----|
| `success` | Verde Esmeralda | Sucesso, confirmações |
| `warning` | Âmbar | Avisos, atenção |
| `error` | Vermelho | Erros, falhas |
| `info` | Azul Céu | Informações |

### Uso

```tsx
// CSS classes
<div className="badge-success">Sucesso</div>
<div className="badge-warning">Atenção</div>
<div className="badge-error">Erro</div>
<div className="badge-info">Info</div>

// Design tokens
import { getSemanticColor } from "@/lib/design-tokens";
const color = getSemanticColor("success");
```

## Espaçamento

Sistema baseado em grid de 8pt:

```typescript
spacing.xs   // 4px
spacing.sm   // 8px
spacing.md   // 16px
spacing.lg   // 24px
spacing.xl   // 32px
spacing["2xl"] // 48px
spacing["3xl"] // 64px
spacing["4xl"] // 96px
```

### Uso

```tsx
import { spacing } from "@/lib/design-tokens";

const styles = {
  padding: spacing.md,  // 16px
  margin: spacing.lg,   // 24px
};
```

## Tipografia

Escala tipográfica baseada em Major Third (1.25):

### Títulos

```tsx
typography.h1  // 36px, weight: 700
typography.h2  // 30px, weight: 600
typography.h3  // 24px, weight: 600
typography.h4  // 20px, weight: 500
typography.h5  // 18px, weight: 500
typography.h6  // 16px, weight: 500
```

### Corpo de Texto

```tsx
typography.body.lg    // 18px
typography.body.base  // 16px
typography.body.sm    // 14px
typography.body.xs    // 12px
```

### Classes CSS de Tipografia

```tsx
<h1 className="heading-1">Título Principal</h1>
<h2 className="heading-2">Subtítulo</h2>
<p className="body-base">Texto normal</p>
<p className="body-sm">Texto pequeno</p>
<span className="caption">Legenda</span>
```

## Botões

Componente Button atualizado com estados visuais melhorados:

### Variantes

```tsx
import { Button } from "@/components/ui/button";

// Default - Botão primário com elevação no hover
<Button>Salvar</Button>

// Destructive - Ações destrutivas
<Button variant="destructive">Excluir</Button>

// Outline - Ação secundária
<Button variant="outline">Cancelar</Button>

// Secondary - Menos ênfase
<Button variant="secondary">Voltar</Button>

// Ghost - Mínima interferência visual
<Button variant="ghost">Fechar</Button>

// Link - Aparência de link
<Button variant="link">Saiba mais</Button>
```

### Tamanhos

```tsx
<Button size="sm">Pequeno</Button>
<Button size="default">Normal</Button>
<Button size="lg">Grande</Button>
<Button size="icon"><Icon /></Button>
```

### Estados

- **Hover**: Elevação suave (-translate-y-0.5) + shadow-md
- **Active**: Scale down (0.98) para feedback tátil
- **Disabled**: opacity-50 + pointer-events-none
- **Loading**: Suporte nativo com `isLoading` prop

```tsx
<Button isLoading>Carregando...</Button>
<Button disabled>Desabilitado</Button>
```

## Transições

```typescript
transitions.fast    // 150ms - Hover states
transitions.base    // 200ms - Default
transitions.slow    // 300ms - Modals/Sheets
transitions.spring  // 300ms com bounce
```

### Uso

```tsx
const styles = {
  transition: `all ${transitions.base}`,
};
```

## Bordas e Sombras

### Radius

```typescript
radius.sm   // 4px
radius.md   // 6px
radius.lg   // 8px
radius.xl   // 12px
radius["2xl"] // 16px
radius.full // 9999px (circular)
```

### Shadows

```typescript
shadows.xs    // Sombra mínima
shadows.sm    // Sombra suave
shadows.md    // Sombra padrão
shadows.lg    // Sombra pronunciada
shadows.xl    // Sombra grande
shadows["2xl"] // Sombra máxima
shadows.inner // Sombra interna
```

## Z-Index

Camadas de profundidade padronizadas:

```typescript
zIndex.dropdown      // 1000
zIndex.sticky        // 1020
zIndex.fixed         // 1030
zIndex.modalBackdrop // 1040
zIndex.modal         // 1050
zIndex.popover       // 1060
zIndex.tooltip       // 1070
```

## Breakpoints

```typescript
breakpoints.xs   // 480px
breakpoints.sm   // 640px
breakpoints.md   // 768px
breakpoints.lg   // 1024px
breakpoints.xl   // 1280px
breakpoints["2xl"] // 1536px
breakpoints["3xl"] // 1920px
```

## Boas Práticas

### 1. Sempre use Design Tokens

❌ **Errado:**
```tsx
<div style={{ color: "#3b82f6" }}>Texto</div>
<div className="bg-blue-500">Background</div>
```

✅ **Correto:**
```tsx
import { statusColors } from "@/lib/design-tokens";
<div style={{ color: statusColors.new.hex }}>Texto</div>
<div className="bg-status-new">Background</div>
```

### 2. Use Componentes Padronizados

❌ **Errado:**
```tsx
<div className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
  Novo
</div>
```

✅ **Correto:**
```tsx
<StatusBadge status="new">Novo</StatusBadge>
```

### 3. Consistência de Cores por Contexto

- **Status de Leads/CRM**: Use `statusColors`
- **Feedback de Sistema**: Use `semanticColors`
- **Tags/Categorias**: Use `tagColors`

### 4. Acessibilidade

- Sempre mantenha contraste mínimo de 4.5:1 para texto
- Use `focus-visible:ring` em elementos interativos
- Teste com modo escuro ativado

### 5. Responsividade

Use as classes responsivas do Tailwind:
```tsx
<div className="text-sm sm:text-base lg:text-lg">
  Texto responsivo
</div>
```

## Exemplos Práticos

### Card de Lead com Status

```tsx
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

function LeadCard({ lead }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{lead.name}</CardTitle>
          <StatusBadge status={lead.status}>
            {getStatusLabel(lead.status)}
          </StatusBadge>
        </div>
      </CardHeader>
    </Card>
  );
}
```

### Botão de Ação com Loading

```tsx
import { Button } from "@/components/ui/button";

function SaveButton({ onSave, isLoading }) {
  return (
    <Button
      onClick={onSave}
      isLoading={isLoading}
      disabled={isLoading}
    >
      Salvar
    </Button>
  );
}
```

### Pipeline com Cores Padronizadas

```tsx
import { statusColors } from "@/lib/design-tokens";

const PIPELINE_COLUMNS = [
  { id: "new", label: "Novo", color: statusColors.new },
  { id: "qualification", label: "Qualificação", color: statusColors.qualification },
  { id: "visit", label: "Visita", color: statusColors.visit },
  { id: "proposal", label: "Proposta", color: statusColors.proposal },
  { id: "contract", label: "Fechado", color: statusColors.contract },
];
```

## Contribuindo

Ao adicionar novos componentes ou estilos:

1. Verifique se já existe um token no design system
2. Se precisar de uma nova cor/tamanho, adicione ao `design-tokens.ts`
3. Documente o uso neste arquivo
4. Mantenha consistência com o sistema existente
5. Teste em modo claro e escuro
