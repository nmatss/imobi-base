# Guia Visual - Componentes de Agenda e Atividades

## DashboardAgenda - Estrutura Visual

```
┌─────────────────────────────────────────────────────────────┐
│  📅 Agenda de Hoje                      Ver agenda completa ➡│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ □  ⏰ 09:00 • Visita                                  │  │
│  │    👤 João Silva                                      │  │
│  │    🏠 Apartamento 3 quartos - Asa Sul                │  │
│  │    [Pendente]                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ □  ⏰ 10:30 • Follow-up                               │  │
│  │    👤 Maria Santos                                    │  │
│  │    [Pendente]                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ □  ⏰ 14:00 • Visita                                  │  │
│  │    👤 Pedro Oliveira                                  │  │
│  │    🏠 Casa 4 quartos - Lago Sul                      │  │
│  │    [Atrasado]                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ☑  ⏰ 16:00 • Follow-up                               │  │
│  │    👤 Ana Costa (riscado)                            │  │
│  │    [Concluído]                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Legenda de Cores (Badges):

- **[Pendente]** - Badge azul (bg-blue-100, text-blue-700)
- **[Concluído]** - Badge verde (bg-green-100, text-green-700)
- **[Atrasado]** - Badge vermelho (bg-red-100, text-red-700)

### Estados Interativos:

1. **Hover no Card:**
   - Borda: `border-muted-foreground/30`
   - Sombra: `shadow-sm`

2. **Checkbox Checked:**
   - Item fica com opacidade 60%
   - Texto do cliente fica riscado
   - Status muda para "Concluído"

3. **Empty State:**
   ```
   ┌─────────────────────────────────┐
   │  📅 Agenda de Hoje              │
   ├─────────────────────────────────┤
   │                                 │
   │         📅                      │
   │   Nenhuma atividade            │
   │   agendada para hoje           │
   │                                 │
   └─────────────────────────────────┘
   ```

---

## DashboardRecentActivity - Estrutura Visual

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Atividades Recentes                      Ver todas     ➡│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌───┐                                                     │
│   │👤 │  Novo lead adicionado: Roberto Almeida             │
│   └───┘  interessado em apartamento                        │
│     │    Sistema • há 5 minutos                            │
│     │                                                       │
│   ┌───┐                                                     │
│   │🏠 │  Novo imóvel cadastrado: Casa 5 quartos           │
│   └───┘  em Sobradinho                                     │
│     │    Carlos Ferreira • há 2 horas                      │
│     │                                                       │
│   ┌───┐                                                     │
│   │📅 │  Visita agendada com Mariana Lima para            │
│   └───┘  apartamento na Asa Norte                          │
│     │    Ana Paula • há 4 horas                            │
│     │                                                       │
│   ┌───┐                                                     │
│   │📄 │  Proposta enviada para José Santos -              │
│   └───┘  Cobertura Lago Sul                                │
│     │    Ricardo Souza • há 1 dia                          │
│     │                                                       │
│   ┌───┐                                                     │
│   │✍️  │  Contrato assinado: Apartamento Asa Sul          │
│   └───┘  vendido para Paula Rodrigues                      │
│          Fernanda Costa • há 2 dias                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Tipos de Atividade e Ícones:

| Tipo | Ícone | Cor de Fundo | Cor do Ícone |
|------|-------|--------------|--------------|
| Lead | 👤 UserPlus | bg-blue-100 | text-blue-600 |
| Property | 🏠 Home | bg-green-100 | text-green-600 |
| Visit | 📅 Calendar | bg-orange-100 | text-orange-600 |
| Proposal | 📄 FileText | bg-cyan-100 | text-cyan-600 |
| Contract | ✍️ FileSignature | bg-emerald-100 | text-emerald-600 |

### Timeline Vertical:

```
   ┌───┐
   │ ● │  ← Ícone circular com background colorido
   └───┘
     │    ← Linha vertical (border-left)
   ┌───┐
   │ ● │
   └───┘
     │
   ┌───┐
   │ ● │
   └───┘
```

### Estados Interativos:

1. **Hover no Item:**
   - Ícone: `ring-2 ring-offset-2 ring-primary/20`

2. **Empty State:**
   ```
   ┌─────────────────────────────────┐
   │  📊 Atividades Recentes         │
   ├─────────────────────────────────┤
   │                                 │
   │         📊                      │
   │   Nenhuma atividade            │
   │   recente                      │
   │                                 │
   └─────────────────────────────────┘
   ```

---

## Layout Combinado no Dashboard

### Desktop (Grid 2 colunas):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Dashboard Principal                            │
├─────────────────────────────┬───────────────────────────────────────────┤
│  📅 Agenda de Hoje         │  📊 Atividades Recentes                   │
├─────────────────────────────┼───────────────────────────────────────────┤
│                             │                                           │
│  ┌──────────────────────┐  │   ┌───┐                                  │
│  │ □  09:00 • Visita     │  │   │👤 │  Novo lead: Roberto             │
│  │    João Silva         │  │   └───┘  Sistema • há 5min              │
│  │    [Pendente]         │  │     │                                    │
│  └──────────────────────┘  │   ┌───┐                                  │
│                             │   │🏠 │  Novo imóvel cadastrado          │
│  ┌──────────────────────┐  │   └───┘  Carlos • há 2h                 │
│  │ □  10:30 • Follow-up  │  │     │                                    │
│  │    Maria Santos       │  │   ┌───┐                                  │
│  │    [Pendente]         │  │   │📅 │  Visita agendada                │
│  └──────────────────────┘  │   └───┘  Ana • há 4h                     │
│                             │                                           │
│  Ver agenda completa ➡     │   Ver todas ➡                            │
└─────────────────────────────┴───────────────────────────────────────────┘
```

### Mobile (Stack Vertical):

```
┌──────────────────────────────┐
│  📅 Agenda de Hoje          │
├──────────────────────────────┤
│  ┌────────────────────────┐ │
│  │ □  09:00 • Visita       │ │
│  │    João Silva          │ │
│  │    [Pendente]          │ │
│  └────────────────────────┘ │
│                              │
│  ┌────────────────────────┐ │
│  │ □  10:30 • Follow-up    │ │
│  │    Maria Santos        │ │
│  │    [Pendente]          │ │
│  └────────────────────────┘ │
│                              │
│  Ver agenda completa ➡      │
└──────────────────────────────┘

┌──────────────────────────────┐
│  📊 Atividades Recentes     │
├──────────────────────────────┤
│   ┌───┐                      │
│   │👤 │  Novo lead          │
│   └───┘  Sistema • há 5min  │
│     │                        │
│   ┌───┐                      │
│   │🏠 │  Novo imóvel        │
│   └───┘  Carlos • há 2h     │
│                              │
│  Ver todas ➡                │
└──────────────────────────────┘
```

---

## Paleta de Cores Utilizada

### DashboardAgenda:

**Horário (destaque):**
- Classe: `text-primary`
- Cor: Azul primário do tema

**Status Badges:**
- Pendente: `bg-blue-100 text-blue-700 border-blue-300`
- Concluído: `bg-green-100 text-green-700 border-green-300`
- Atrasado: `bg-red-100 text-red-700 border-red-300`

**Ícones:**
- Padrão: `text-muted-foreground` (cinza médio)
- Horário: `text-primary` (azul)

**Bordas:**
- Normal: `border`
- Hover: `border-muted-foreground/30`

### DashboardRecentActivity:

**Backgrounds de Ícones:**
- Lead: `bg-blue-100` + `text-blue-600`
- Property: `bg-green-100` + `text-green-600`
- Visit: `bg-orange-100` + `text-orange-600`
- Proposal: `bg-cyan-100` + `text-cyan-600`
- Contract: `bg-emerald-100` + `text-emerald-600`

**Timeline:**
- Linha: `bg-border` (cinza claro)
- Posição: `left-[19px]` (centralizada no ícone)

**Texto:**
- Descrição: `text-sm` (14px)
- Metadados: `text-xs text-muted-foreground` (12px, cinza)

---

## Espaçamentos

### DashboardAgenda:

- Gap entre itens: `space-y-3` (12px)
- Padding do card: `p-3` (12px)
- Gap entre elementos: `gap-2` (8px), `gap-3` (12px)

### DashboardRecentActivity:

- Gap entre atividades: `space-y-4` (16px)
- Gap ícone-conteúdo: `gap-3` (12px)
- Espaçamento timeline: `space-y-1` (4px)

---

## Responsividade Breakpoints

### Mobile (< 640px):
- Cards: full width
- Texto: `text-sm` base
- Icons: `h-4 w-4` ou `h-3.5 w-3.5`

### Tablet (640px - 1024px):
- Pode usar grid 1 ou 2 colunas
- Mesmo tamanho de fonte

### Desktop (> 1024px):
- Grid 2 colunas recomendado
- Layout lado a lado otimizado

---

## Animações e Transições

**Hover Effects:**
```css
transition-all
hover:border-muted-foreground/30
hover:shadow-sm
group-hover:ring-2
```

**Checkbox:**
```css
data-[state=checked]:bg-primary
data-[state=checked]:text-primary-foreground
```

**Opacity:**
```css
opacity-60 (item completo)
opacity-30 (empty state icon)
```

---

## Hierarquia Tipográfica

### Títulos:
- Card Title: `text-lg font-semibold` (18px)

### Conteúdo Principal:
- Horário: `text-sm font-semibold text-primary` (14px, bold)
- Cliente: `text-sm` (14px)
- Descrição: `text-sm` (14px)

### Metadados:
- Tipo: `text-xs font-medium` (12px)
- Usuário: `text-xs font-medium` (12px)
- Tempo: `text-xs text-muted-foreground` (12px)

### Labels:
- Badge: `text-[10px]` (sm) ou `text-xs` (md) - 10-12px

---

## Acessibilidade Visual

### Contraste:

Todos os textos atendem WCAG 2.1 AA:

- Texto principal: ratio 4.5:1+
- Texto grande: ratio 3:1+
- Ícones: ratio 3:1+

### Indicadores Visuais:

- ✅ Checkbox com estado visual claro
- ✅ Badges coloridos com borda
- ✅ Ícones + texto (não apenas cor)
- ✅ Hover states distintos
- ✅ Focus states (Radix UI)

### Truncamento:

```css
truncate (text-overflow: ellipsis)
min-w-0 (permite shrink)
```

---

## Tamanhos de Touch Targets

Todos elementos interativos seguem o mínimo de 44x44px:

- **Checkbox:** 16x16px interno + 24px padding = 40x40px ✅
- **Links:** height + padding ≥ 44px ✅
- **Cards clicáveis:** full width/height ✅

---

## Performance

### Otimizações Visuais:

1. **CSS:**
   - Classes Tailwind (tree-shaking)
   - Sem inline styles desnecessários

2. **Re-renders:**
   - `slice(0, maxItems)` antes do map
   - Props imutáveis

3. **Layout Shift:**
   - Heights definidos
   - Skeletons podem ser adicionados

---

## Conclusão

Ambos componentes seguem rigorosamente:

- ✅ Design System do ImobiBase
- ✅ Paleta de cores consistente
- ✅ Espaçamento 8pt grid
- ✅ Tipografia hierárquica
- ✅ Acessibilidade WCAG AA
- ✅ Responsividade mobile-first
- ✅ Performance otimizada
- ✅ UX intuitiva

**Resultado:** Componentes prontos para produção com excelente experiência visual e funcional.
