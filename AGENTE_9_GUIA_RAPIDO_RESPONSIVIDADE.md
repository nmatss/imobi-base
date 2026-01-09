# 📱 GUIA RÁPIDO - Responsividade Mobile-First

**Para desenvolvedores do ImobiBase**

---

## 🎯 REGRAS DE OURO

### 1. **Touch-Friendly (44x44px mínimo)**
```tsx
// ✅ CORRETO
<Button size="default">Salvar</Button>        // 44px height
<Button size="icon">                          // 44x44px
  <Search className="h-5 w-5" />
</Button>

// ❌ EVITAR
<button className="h-8 w-8">                  // Muito pequeno (32px)
```

### 2. **Grids Responsivos**
```tsx
// ✅ PADRÃO: 1 col → 2 cols → 3 cols → 4 cols
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => <Card>{item}</Card>)}
</div>

// ✅ PADRÃO: 1 col → 2 cols
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

### 3. **Tabelas → Cards Mobile**
```tsx
import { ResponsiveTable } from "@/components/ui/responsive-table";

// Desktop: Table | Mobile: Cards (automático)
<ResponsiveTable
  columns={[
    { key: "name", label: "Nome" },
    { key: "email", label: "Email", hideOnMobile: true },
  ]}
  data={users}
  renderCard={(user) => (
    <Card className="p-4">
      <p className="font-semibold">{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </Card>
  )}
/>
```

### 4. **Scroll Horizontal Mobile**
```tsx
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

// Mobile: scroll horizontal | Desktop: grid
<ScrollArea className="sm:overflow-visible">
  <div className="flex gap-3 sm:grid sm:grid-cols-3 sm:gap-4">
    {items.map(item => (
      <div key={item.id} className="min-w-[200px] sm:min-w-0">
        <ItemCard {...item} />
      </div>
    ))}
  </div>
  <ScrollBar orientation="horizontal" className="sm:hidden" />
</ScrollArea>
```

### 5. **Charts Responsivos**
```tsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

// Container com altura adaptativa
<div className="h-[300px] sm:h-[350px] lg:h-[400px]">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ left: -20 }}>
      <XAxis tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      <Bar dataKey="value" />
    </BarChart>
  </ResponsiveContainer>
</div>
```

---

## 📐 BREAKPOINTS TAILWIND

| Breakpoint | Width | Uso |
|------------|-------|-----|
| `sm:` | 640px+ | Tablet portrait |
| `md:` | 768px+ | Tablet landscape |
| `lg:` | 1024px+ | Desktop small |
| `xl:` | 1280px+ | Desktop large |
| `2xl:` | 1536px+ | Desktop XL |

---

## 🎨 PADRÕES DE SPACING

```tsx
// Spacing progressivo (cresce com viewport)
<div className="space-y-4 sm:space-y-6 lg:space-y-8">
<div className="gap-3 sm:gap-4 lg:gap-6">
<div className="p-4 sm:p-6 lg:p-8">
```

---

## 🔤 TIPOGRAFIA RESPONSIVA

```tsx
// Títulos
<h1 className="text-2xl sm:text-3xl lg:text-4xl">

// Parágrafos
<p className="text-sm sm:text-base lg:text-lg">

// Textos pequenos
<span className="text-xs sm:text-sm">
```

---

## 📋 INPUTS E FORMS

```tsx
// Forms: 1 coluna mobile → 2 colunas desktop
<form className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <Label>Nome *</Label>
      <Input className="min-h-[44px]" />
    </div>
    <div>
      <Label>Email *</Label>
      <Input type="email" className="min-h-[44px]" />
    </div>
  </div>
</form>
```

---

## 🍔 NAVEGAÇÃO MOBILE

### Sidebar Hamburger
```tsx
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

<Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
  <SheetTrigger asChild>
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden h-11 w-11 touch-manipulation"
      aria-label="Abrir menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-[280px] p-0">
    <NavigationContent />
  </SheetContent>
</Sheet>
```

### Tabs Horizontais Mobile
```tsx
// Mobile: scroll horizontal | Desktop: inline
<div className="lg:hidden overflow-x-auto">
  <div className="flex gap-2 min-w-max">
    {tabs.map(tab => (
      <button className="px-4 py-3 whitespace-nowrap">
        {tab.label}
      </button>
    ))}
  </div>
</div>
```

---

## 🎯 CHECKLIST PRÉ-COMMIT

Antes de fazer commit de um componente novo:

- [ ] **Testei em mobile (375px)?**
- [ ] **Testei em tablet (768px)?**
- [ ] **Testei em desktop (1024px+)?**
- [ ] **Botões têm min 44x44px?**
- [ ] **Inputs têm min 44px height?**
- [ ] **Grids têm breakpoints definidos?**
- [ ] **Tabelas viram cards no mobile?**
- [ ] **Charts usam ResponsiveContainer?**
- [ ] **Textos truncam com overflow?**
- [ ] **Spacing é progressivo (sm/md/lg)?**

---

## 🚀 EXEMPLOS PRÁTICOS

### Dashboard KPIs
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <MetricCard title="Total" value="R$ 10.000" />
  <MetricCard title="Receitas" value="R$ 8.000" />
  <MetricCard title="Despesas" value="R$ 2.000" />
  <MetricCard title="Lucro" value="R$ 6.000" />
</div>
```

### Lista de Leads (Kanban Mobile)
```tsx
{/* Mobile: scroll horizontal snap */}
<div className="md:hidden overflow-x-auto snap-x snap-mandatory">
  <div className="flex gap-4">
    {stages.map(stage => (
      <div
        key={stage.id}
        className="snap-center w-[calc(100vw-2rem)]"
      >
        <StageColumn stage={stage} />
      </div>
    ))}
  </div>
</div>

{/* Desktop: grid */}
<div className="hidden md:flex gap-4">
  {stages.map(stage => (
    <div key={stage.id} className="flex-1">
      <StageColumn stage={stage} />
    </div>
  ))}
</div>
```

### Settings Page com Sheet Mobile
```tsx
<Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
  <SheetTrigger asChild>
    <Button
      variant="outline"
      size="icon"
      className="lg:hidden h-10 w-10"
    >
      <Menu className="w-4 h-4" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0">
    <SettingsNav />
  </SheetContent>
</Sheet>

{/* Desktop: sidebar fixa */}
<aside className="hidden lg:block w-[280px] sticky top-0">
  <SettingsNav />
</aside>
```

---

## 🛠️ FERRAMENTAS DE TESTE

### Chrome DevTools
```bash
# 1. Abrir DevTools (F12)
# 2. Toggle device toolbar (Ctrl+Shift+M)
# 3. Testar viewports:
#    - 375px (iPhone SE)
#    - 768px (iPad)
#    - 1024px (Desktop)
```

### Comandos úteis
```bash
# Lighthouse mobile audit
npx lighthouse http://localhost:5000 --preset=mobile --view

# Análise de bundle size
npm run build -- --analyze
```

---

## ❌ ANTI-PADRÕES (EVITAR)

```tsx
// ❌ Botões muito pequenos
<button className="h-8 w-8">X</button>

// ❌ Grids sem breakpoints
<div className="grid grid-cols-4">

// ❌ Tabelas sem fallback mobile
<Table>
  <TableRow>...</TableRow>
</Table>

// ❌ Charts sem ResponsiveContainer
<BarChart width={500} height={300}>

// ❌ Overflow sem scroll
<div className="flex">
  {manyItems.map(...)}  // Overflow sem ScrollArea
</div>

// ❌ Fixed widths em mobile
<div className="w-[800px]">  // Maior que viewport mobile
```

---

## ✅ BOAS PRÁTICAS

```tsx
// ✅ Touch-manipulation para performance
<button className="touch-manipulation active:scale-95">

// ✅ Min/max widths responsivos
<div className="w-full max-w-7xl mx-auto">

// ✅ Truncate com overflow
<p className="truncate max-w-[200px]">

// ✅ Line-clamp para múltiplas linhas
<p className="line-clamp-2">

// ✅ Hidden/block responsivo
<div className="hidden md:block">Desktop only</div>
<div className="md:hidden">Mobile only</div>

// ✅ Flex direction responsivo
<div className="flex flex-col md:flex-row">
```

---

## 📚 COMPONENTES DISPONÍVEIS

| Componente | Arquivo | Uso |
|------------|---------|-----|
| **ResponsiveTable** | `ui/responsive-table.tsx` | Tabelas → Cards mobile |
| **ScrollArea** | `ui/scroll-area.tsx` | Scroll horizontal touch |
| **Sheet** | `ui/sheet.tsx` | Drawers mobile |
| **Button** | `ui/button.tsx` | Touch-friendly 44px |
| **MetricCard** | `ui/MetricCard.tsx` | KPIs responsivos |

---

## 🎓 RECURSOS ADICIONAIS

- **Tailwind Docs:** https://tailwindcss.com/docs/responsive-design
- **WCAG Touch Target:** https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- **Mobile UX Best Practices:** https://material.io/design/platform-guidance/android-touch.html

---

**Agente 9 - ImobiBase Mobile-First Team**

*Desenvolvendo para mobile primeiro, desktop depois.*
