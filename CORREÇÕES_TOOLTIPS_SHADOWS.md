# Correções Tier 1 & 2 - Shadows & Tooltips

## STATUS: ✅ CARD SHADOWS IMPLEMENTADO

### 1. Card Component - Shadow Depth
**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/components/ui/card.tsx`

**✅ COMPLETO** - Implementado shadow-sm e hover:shadow-md com transition-all duration-200

```tsx
className={cn(
  "rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200",
  className
)}
```

---

## STATUS: ⚠️ TOOLTIPS PENDENTES (Arquivo em modificação)

### 2. Tooltips em Botões Icon - Reports Page
**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/reports/index.tsx`

#### Imports Necessários:
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreVertical } from "lucide-react";
```

#### Locais para adicionar tooltips:

1. **Botão de Download nos Report Type Cards** (linha ~840-850)
2. **Botão de Download nos Report Type Cards inferior** (linha ~870-880)
3. **Botão Salvar** (linha ~973-978)
4. **Botão Exportar** (linha ~984-989)

---

### 3. Tooltips em Botões Icon - Dashboard
**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/dashboard.tsx`

#### Botões que precisam de tooltip:
- **Botão Sheet de Ações Rápidas** (linha ~324-331) - "Abrir ações rápidas"
- **Botão Calendário na Agenda** (linha ~506-513) - "Ver calendário completo"

---

### 4. Tooltips em Botões Icon - Leads Kanban
**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/leads/kanban.tsx`

#### Import já existe:
```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

#### Botões que precisam de tooltip:
- **Botão More Options (3 pontos)** - "Mais opções"
- **Botões de ação rápida** - WhatsApp, Telefone, Email

---

### 5. Tooltips em Botões Icon - Properties List
**Arquivo:** `/home/nic20/ProjetosWeb/ImobiBase/client/src/pages/properties/list.tsx`

#### Botões que precisam de tooltip:
- **Botão More Options (3 pontos)** - "Mais opções"
- **Botões de ação** - Editar, Deletar, Compartilhar
- **Botões de visualização** - Grid/List toggle

---

## Exemplo de Implementação

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="ghost" size="icon">
        <Download className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Exportar PDF</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## Progresso Geral

- ✅ Card shadows: COMPLETO
- ⚠️ Tooltips Reports: PENDENTE (arquivo em modificação)
- ⚠️ Tooltips Dashboard: PENDENTE
- ⚠️ Tooltips Leads: PENDENTE
- ⚠️ Tooltips Properties: PENDENTE

**Total estimado:** 15+ tooltips a adicionar
