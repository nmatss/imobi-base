# 🚀 GUIA RÁPIDO - ARQUITETURA GLOBAL IMOBIBASE

## 📁 ESTRUTURA DE ARQUIVOS PRINCIPAIS

```
client/src/
├── lib/
│   ├── design-system.ts          # Exports centralizados do design system
│   ├── design-tokens.ts          # Tokens de design (cores, spacing, etc)
│   ├── design-helpers.ts         # Funções auxiliares
│   ├── imobi-context.tsx         # Context principal da aplicação
│   ├── accessibility-context.tsx # Context de acessibilidade
│   ├── queryClient.ts            # Configuração React Query
│   └── utils.ts                  # Utilitários gerais
├── components/
│   ├── ui/                       # 93 componentes base
│   ├── layout/
│   │   └── dashboard-layout.tsx  # Layout principal responsivo
│   └── dashboard/                # Componentes do dashboard
├── hooks/                        # 15+ hooks customizados
│   ├── useDebounce.ts
│   ├── useAutoSave.ts
│   └── useDashboardData.ts
├── pages/                        # Páginas da aplicação
├── index.css                     # 336 utility classes globais
└── main.tsx                      # Entry point + Web Vitals

vite.config.ts                    # Configuração Vite + PWA
tsconfig.json                     # TypeScript strict mode
package.json                      # 138 dependencies
```

---

## 🎨 DESIGN SYSTEM

### Importar Tokens

```tsx
import {
  spacing,
  statusColors,
  typography,
  getStatusColor,
  Button,
  Badge,
  StatusBadge,
} from "@/lib/design-system";

// Usar tokens
const mySpacing = spacing.lg; // "1.5rem"
const statusColor = getStatusColor("new"); // { hex, hsl, bg, text, border }
```

### Utility Classes Principais

```tsx
// Grids Responsivos
<div className="responsive-grid-3">        {/* 1 col mobile, 2 tablet, 3 desktop */}
<div className="grid-auto-fill-md">       {/* Auto-fit 240px cards */}

// KPI Cards Mobile
<div className="kpi-scroll">              {/* Horizontal scroll mobile */}
  <div className="kpi-card">...</div>

// Kanban Board
<div className="kanban-board">            {/* Scroll mobile, grid desktop */}
  <div className="kanban-column">...</div>

// Touch Targets
<button className="touch-target">        {/* Min 44x44px */}

// Responsive Text
<h1 className="text-responsive-xl">      {/* Escala em breakpoints */}

// Spacing Responsivo
<div className="p-responsive">           {/* p-3 sm:p-4 lg:p-6 */}
<div className="gap-responsive">         {/* gap-4 sm:gap-6 lg:gap-8 */}

// Acessibilidade
<a className="skip-link" href="#main">  {/* Skip to content */}
<span className="sr-only">Hidden</span> {/* Screen reader only */}
<button className="focus-ring">         {/* Focus visible ring */}

// Status Colors
<div className="bg-status-new">         {/* Blue status background */}
<span className="text-status-contract"> {/* Green status text */}
```

---

## 📱 BREAKPOINTS

```css
/* Sistema de 6 breakpoints + 2 customizados */
xs:  480px   /* Very small phones (custom) */
sm:  640px   /* Phones */
md:  768px   /* Tablets */
lg:  1024px  /* Laptops */
xl:  1280px  /* Desktops */
2xl: 1536px  /* Large desktops */
3xl: 1920px  /* Ultra-wide (custom) */

/* Uso */
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-6">
```

---

## 🎣 HOOKS ESSENCIAIS

### useDebounce

```tsx
import { useDebounce } from "@/hooks/useDebounce";

const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  // Executa 300ms após parar de digitar
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

### useAutoSave

```tsx
import { useAutoSave } from "@/hooks/useAutoSave";

const { isSaving, lastSaved, hasUnsavedChanges, saveNow } = useAutoSave({
  data: formData,
  onSave: async (data) => {
    await fetch("/api/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delay: 2000,
  enabled: true,
});

// Indicador de salvamento
{
  isSaving && <Spinner />;
}
{
  lastSaved && <span>Salvo às {format(lastSaved, "HH:mm")}</span>;
}
```

### useImobi (Context Principal)

```tsx
import { useImobi } from "@/lib/imobi-context";

const { user, tenant, properties, leads, refetchProperties, logout } =
  useImobi();
```

### useAccessibility

```tsx
import { useAccessibility } from "@/lib/accessibility-context";

const { settings, updateSettings } = useAccessibility();

// Toggle high contrast
updateSettings({ highContrast: !settings.highContrast });

// Increase font size
updateSettings({ fontSize: settings.fontSize + 0.1 });
```

---

## 🧩 COMPONENTES UI BASE

### Button

```tsx
import { Button } from "@/components/ui/button"

<Button variant="default">Primary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Subtle</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button isLoading>Loading...</Button>
```

### Status Badge

```tsx
import { StatusBadge } from "@/components/ui/status-badge"

<StatusBadge status="new" />
<StatusBadge status="contract" />
<StatusBadge status="lost" />
```

### Card

```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

<Card className="card-hover">
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content here</CardContent>
</Card>;
```

### Dialog

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent className="dialog-responsive">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    Content
  </DialogContent>
</Dialog>;
```

---

## 🚀 PERFORMANCE

### Lazy Loading de Rotas

```tsx
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("@/pages/dashboard"));

<Suspense fallback={<PageLoader />}>
  <Dashboard />
</Suspense>;
```

### Otimizações React

```tsx
// useMemo para cálculos pesados
const metrics = useMemo(() => {
  return calculateMetrics(data);
}, [data]);

// useCallback para funções em deps
const handleSubmit = useCallback(
  async (values) => {
    await save(values);
  },
  [save],
);

// React.memo para componentes
export const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
```

### React Query

```tsx
import { useQuery, useMutation } from "@tanstack/react-query";

// Query
const { data, isLoading, refetch } = useQuery({
  queryKey: ["properties"],
  queryFn: async () => {
    const res = await fetch("/api/properties");
    return res.json();
  },
  staleTime: 5 * 60 * 1000, // 5 min
});

// Mutation
const mutation = useMutation({
  mutationFn: async (data) => {
    return fetch("/api/properties", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries(["properties"]);
  },
});
```

---

## 🎯 PADRÕES DE LAYOUT

### Dashboard Layout Base

```tsx
export default function MyPage() {
  return (
    <>
      {/* Header com ações */}
      <div className="action-bar mb-6">
        <div>
          <h1 className="text-responsive-xl">Título</h1>
          <p className="text-muted-foreground">Descrição</p>
        </div>
        <Button>Nova Ação</Button>
      </div>

      {/* KPIs em horizontal scroll mobile */}
      <div className="kpi-scroll mb-6">
        <MetricCard className="kpi-card" />
        <MetricCard className="kpi-card" />
        <MetricCard className="kpi-card" />
      </div>

      {/* Grid responsivo de cards */}
      <div className="responsive-grid-3 gap-6">
        <Card>Card 1</Card>
        <Card>Card 2</Card>
        <Card>Card 3</Card>
      </div>
    </>
  );
}
```

### Form Layout

```tsx
<form onSubmit={handleSubmit} className="form-grid">
  {/* 2 colunas no desktop */}
  <div>
    <Label>Nome</Label>
    <Input />
  </div>
  <div>
    <Label>Email</Label>
    <Input />
  </div>

  {/* Full width */}
  <div className="form-full">
    <Label>Descrição</Label>
    <Textarea />
  </div>

  {/* Buttons */}
  <div className="form-full btn-group">
    <Button type="submit">Salvar</Button>
    <Button variant="outline">Cancelar</Button>
  </div>
</form>
```

---

## 🔧 CONFIGURAÇÕES

### Vite Build

```bash
# Development
npm run dev

# Build com análise
npm run build

# Preview build
npm run preview

# Analisar bundle (gera dist/stats.html)
# Automaticamente gerado em cada build
```

### TypeScript

```bash
# Type check
npm run check

# Build com type check
npm run build
```

### Testes

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests (Playwright)
npm run test:smoke

# Accessibility tests
npm run test:a11y

# Coverage
npm run test:coverage
```

---

## 📊 BUNDLE MONITORING

### Verificar Tamanho dos Chunks

```bash
# Após build, verificar dist/stats.html no navegador
# Ou usar:
ls -lh dist/public/assets/js/*.js | sort -k5 -h
```

### Bundle Size Limits

```
✅ Main chunk:        < 200KB (gzipped)
✅ Vendor chunk:      < 150KB (gzipped)
⚠️  Total bundle:     < 500KB (gzipped) - Initial load
🎯  Target LCP:       < 2.5s
🎯  Target TTI:       < 3.5s
```

---

## 🐛 DEBUGGING

### React Query Devtools

```tsx
// Adicionar em desenvolvimento
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  <App />
  {import.meta.env.DEV && <ReactQueryDevtools />}
</QueryClientProvider>;
```

### Accessibility Testing

```bash
# Axe Core em desenvolvimento (já configurado)
# Abre console e verifica warnings

# Lighthouse CI
npm run lighthouse

# Playwright a11y tests
npm run test:a11y
```

---

## 📚 REFERÊNCIAS RÁPIDAS

### Arquivos de Documentação

- `AGENTE_10_GLOBAL_ARCHITECTURE_REPORT.md` - Relatório completo
- `AGENTE_10_EXECUTIVE_SUMMARY.md` - Resumo executivo
- `DESIGN_SYSTEM.md` - Documentação do design system
- `DESIGN_SYSTEM_GUIDE.md` - Guia de uso do design system

### Links Úteis

- Radix UI: https://radix-ui.com/
- Tailwind CSS: https://tailwindcss.com/
- React Query: https://tanstack.com/query/
- Vite: https://vitejs.dev/
- Lucide Icons: https://lucide.dev/

---

## 🎓 CONVENÇÕES DE CÓDIGO

### Naming

```tsx
// Components: PascalCase
export function MyComponent() { ... }

// Hooks: camelCase com 'use' prefix
export function useMyHook() { ... }

// Contexts: PascalCase com 'Context' suffix
export const MyContext = createContext<MyContextType>()

// Utilities: camelCase
export function formatCurrency() { ... }

// Constants: UPPER_SNAKE_CASE
const API_BASE_URL = '/api'
```

### File Structure

```tsx
// 1. Imports
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'

// 2. Types
type MyComponentProps = { ... }

// 3. Constants
const DEFAULT_VALUE = 'value'

// 4. Component
export function MyComponent({ prop }: MyComponentProps) {
  // 4.1. Hooks
  const [state, setState] = useState()
  const query = useQuery(...)

  // 4.2. Handlers
  const handleClick = () => { ... }

  // 4.3. Effects
  useEffect(() => { ... }, [])

  // 4.4. Render
  return <div>...</div>
}
```

---

**Última atualização:** 25/12/2024
**Versão:** 1.0
**Mantenedor:** Equipe ImobiBase
