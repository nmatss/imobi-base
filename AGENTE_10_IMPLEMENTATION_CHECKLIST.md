# ✅ CHECKLIST DE IMPLEMENTAÇÃO - MELHORIAS AGENTE 10

## 🔴 ALTA PRIORIDADE (Semana 1)

### 1. Corrigir Duplicate Class Member
**Arquivo:** `server/storage.ts`
**Linhas:** 1829 e 3287
**Impacto:** ⭐⭐⭐⭐⭐

- [ ] Abrir `server/storage.ts`
- [ ] Localizar método `getTenantSettings` na linha 3287
- [ ] Comparar com implementação da linha 1829
- [ ] Remover duplicata (manter a implementação mais completa)
- [ ] Testar endpoints que usam `getTenantSettings`
- [ ] Rodar testes: `npm run test:integration`
- [ ] Verificar build: `npm run build`

**Verificação:**
```bash
# Não deve haver warnings
npm run build 2>&1 | grep -i "duplicate"
```

---

### 2. Lazy Load de Vendor Chunks Pesados
**Impacto:** ⭐⭐⭐⭐⭐ (Redução ~1MB bundle inicial)

#### 2.1. Lazy Load de Charts (430KB → lazy)

**Arquivos afetados:**
- `client/src/pages/dashboard.tsx`
- `client/src/pages/financeiro/index.tsx`
- `client/src/pages/rentals/index.tsx`

**Implementação:**

```tsx
// ANTES
import { Bar, BarChart, ResponsiveContainer } from "recharts";

// DEPOIS
import { lazy, Suspense } from 'react';
const LazyCharts = lazy(() => import('@/components/charts/ChartWrapper'));

// No componente
{showCharts && (
  <Suspense fallback={<ChartSkeleton />}>
    <LazyCharts data={chartData} />
  </Suspense>
)}
```

**Passos:**
- [ ] Criar `client/src/components/charts/ChartWrapper.tsx`
- [ ] Mover imports de recharts para ChartWrapper
- [ ] Criar componente `ChartSkeleton.tsx`
- [ ] Substituir imports diretos por lazy load
- [ ] Testar em dashboard
- [ ] Testar em financeiro
- [ ] Testar em rentals
- [ ] Verificar bundle: `npm run build` (stats.html)

**Verificação:**
```bash
# vendor-charts NÃO deve estar no bundle inicial
ls -lh dist/public/assets/js/index-*.js
# Deve ser menor que antes
```

---

#### 2.2. Lazy Load de PDF (388KB → lazy)

**Arquivos afetados:**
- `client/src/pages/contracts/index.tsx` (geração de PDFs)

**Implementação:**

```tsx
// ANTES
import jsPDF from 'jspdf';

// DEPOIS
const generatePDF = async () => {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  // ... resto do código
};
```

**Passos:**
- [ ] Localizar imports de jspdf
- [ ] Converter para dynamic import
- [ ] Adicionar loading state
- [ ] Testar geração de PDF
- [ ] Verificar bundle: `npm run build`

---

#### 2.3. Lazy Load de html2canvas (202KB → lazy)

**Implementação:**

```tsx
// Similar ao PDF
const captureScreenshot = async () => {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element);
  // ...
};
```

**Passos:**
- [ ] Localizar imports de html2canvas
- [ ] Converter para dynamic import
- [ ] Testar funcionalidade
- [ ] Verificar bundle

---

### 3. Bundle Budget Warnings
**Impacto:** ⭐⭐⭐

**Arquivo:** `vite.config.ts`

```typescript
// Adicionar
import { Plugin } from 'vite';

const bundleBudgetPlugin = (): Plugin => ({
  name: 'bundle-budget',
  writeBundle(options, bundle) {
    const budgets = {
      js: 200 * 1024, // 200KB per chunk (gzipped estimate)
      css: 50 * 1024,  // 50KB per chunk
    };

    Object.entries(bundle).forEach(([fileName, chunk]) => {
      if (chunk.type === 'chunk') {
        const size = chunk.code.length;
        const gzipEstimate = size * 0.3; // ~30% gzip ratio

        if (fileName.endsWith('.js') && gzipEstimate > budgets.js) {
          console.warn(`⚠️  Large JS chunk: ${fileName}`);
          console.warn(`   Size: ${(size / 1024).toFixed(2)}KB (${(gzipEstimate / 1024).toFixed(2)}KB gzipped)`);
        }
      }
    });
  },
});

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    bundleBudgetPlugin(),
    // ... outros plugins
  ],
});
```

**Passos:**
- [ ] Adicionar plugin ao `vite.config.ts`
- [ ] Rodar build: `npm run build`
- [ ] Verificar warnings no console
- [ ] Ajustar budgets se necessário

---

## 🟡 MÉDIA PRIORIDADE (Semanas 2-3)

### 4. Otimizar Server Bundle (3.5MB → <1.5MB)
**Impacto:** ⭐⭐⭐⭐

#### 4.1. Análise de Dependências

```bash
# Instalar bundle analyzer
npm install --save-dev rollup-plugin-analyzer

# Adicionar ao vite.config.ts (server build)
import { analyzer } from 'rollup-plugin-analyzer';
```

**Passos:**
- [ ] Analisar dependências do servidor
- [ ] Identificar libs não utilizadas
- [ ] Verificar imports desnecessários
- [ ] Externalize dependências opcionais

#### 4.2. Tree Shaking Agressivo

**vite.config.ts:**
```typescript
build: {
  rollupOptions: {
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
    },
    external: [
      'fsevents',
      'bufferutil',
      // Adicionar outras deps opcionais
    ],
  }
}
```

**Passos:**
- [ ] Configurar tree shaking
- [ ] Testar build
- [ ] Testar deploy local
- [ ] Medir tamanho final

**Verificação:**
```bash
# Deve ser < 1.5MB
ls -lh dist/index.cjs
```

---

### 5. Implementar Critical CSS
**Impacto:** ⭐⭐⭐⭐

#### 5.1. Extrair Critical CSS

```bash
# Instalar critical
npm install --save-dev critical
```

**script/extract-critical-css.ts:**
```typescript
import { generate } from 'critical';

await generate({
  src: 'dist/public/index.html',
  target: 'dist/public/index.html',
  inline: true,
  width: 1300,
  height: 900,
});
```

**Passos:**
- [ ] Adicionar script de extração
- [ ] Identificar above-the-fold CSS
- [ ] Inline critical CSS no index.html
- [ ] Defer non-critical CSS
- [ ] Testar em produção
- [ ] Medir FCP/LCP improvement

**package.json:**
```json
{
  "scripts": {
    "build": "tsx script/build.ts && npm run critical-css",
    "critical-css": "tsx script/extract-critical-css.ts"
  }
}
```

---

### 6. Separar ImobiContext
**Impacto:** ⭐⭐⭐⭐

#### 6.1. Criar Contextos Separados

**client/src/lib/properties-context.tsx:**
```tsx
import { createContext, useContext, useState, useCallback } from 'react';

type PropertiesContextType = {
  properties: Property[];
  refetchProperties: () => Promise<void>;
  // ... apenas properties
};

const PropertiesContext = createContext<PropertiesContextType | undefined>(undefined);

export function PropertiesProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([]);
  // ... lógica apenas de properties
  return <PropertiesContext.Provider value={value}>{children}</PropertiesContext.Provider>;
}

export function useProperties() {
  const context = useContext(PropertiesContext);
  if (!context) throw new Error('useProperties must be used within PropertiesProvider');
  return context;
}
```

**Passos:**
- [ ] Criar `properties-context.tsx`
- [ ] Criar `leads-context.tsx`
- [ ] Criar `visits-context.tsx`
- [ ] Criar `contracts-context.tsx`
- [ ] Manter `imobi-context.tsx` apenas para user/tenant
- [ ] Atualizar App.tsx para compor contextos
- [ ] Atualizar imports em componentes
- [ ] Testar re-renders (React DevTools)

**App.tsx:**
```tsx
<AuthProvider>
  <TenantProvider>
    <PropertiesProvider>
      <LeadsProvider>
        <VisitsProvider>
          <ContractsProvider>
            <Router />
          </ContractsProvider>
        </VisitsProvider>
      </LeadsProvider>
    </PropertiesProvider>
  </TenantProvider>
</AuthProvider>
```

---

## 🟢 BAIXA PRIORIDADE (Mês 1)

### 7. Aumentar Storybook Coverage (34% → 80%)
**Impacto:** ⭐⭐⭐

**Componentes prioritários sem stories:**

Layouts & Navigation:
- [ ] `calendar.tsx`
- [ ] `collapsible.tsx`
- [ ] `drawer.tsx`
- [ ] `hover-card.tsx`
- [ ] `navigation-menu.tsx`
- [ ] `pagination.tsx`
- [ ] `scroll-area.tsx`

Forms:
- [ ] `radio-group.tsx`
- [ ] `slider.tsx`
- [ ] `checkbox.tsx` (atualizar story existente)

Feedback:
- [ ] `toast.tsx` (complementar story)
- [ ] `skeleton.tsx`
- [ ] `spinner.tsx`

**Template de Story:**
```tsx
// components/ui/component.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Component } from './component';

const meta: Meta<typeof Component> = {
  title: 'UI/Component',
  component: Component,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Default: Story = {
  args: {
    children: 'Default Component',
  },
};

export const Variant: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Variant',
  },
};
```

---

### 8. Implementar Prefetch Estratégico
**Impacto:** ⭐⭐⭐

**App.tsx:**
```tsx
import { useEffect } from 'react';

function Router() {
  const { user } = useImobi();

  useEffect(() => {
    if (!user) return;

    // Prefetch rotas mais acessadas após login
    const prefetchRoutes = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Aguarda 2s

      // Prefetch dashboard (rota mais acessada)
      import('@/pages/dashboard');

      // Prefetch properties (segunda mais acessada)
      setTimeout(() => {
        import('@/pages/properties/list');
      }, 1000);
    };

    prefetchRoutes();
  }, [user]);

  // ... resto do código
}
```

**Passos:**
- [ ] Identificar rotas mais acessadas (analytics)
- [ ] Implementar prefetch com delay
- [ ] Testar em produção
- [ ] Medir improvement em navegação

---

### 9. Virtual Scrolling em Listas Grandes
**Impacto:** ⭐⭐⭐

**Verificar uso de VirtualizedList.tsx:**

```tsx
// Já existe: client/src/components/VirtualizedList.tsx
// Verificar onde pode ser aplicado

// Exemplo de uso em properties/list.tsx
import { VirtualizedList } from '@/components/VirtualizedList';

{properties.length > 100 ? (
  <VirtualizedList
    items={filteredProperties}
    itemHeight={120}
    renderItem={(property) => (
      <PropertyCard key={property.id} {...property} />
    )}
  />
) : (
  filteredProperties.map(property => (
    <PropertyCard key={property.id} {...property} />
  ))
)}
```

**Passos:**
- [ ] Verificar `VirtualizedList.tsx` está completo
- [ ] Aplicar em `properties/list.tsx` (se > 100 items)
- [ ] Aplicar em `leads/kanban.tsx` (colunas com > 50 items)
- [ ] Aplicar em tabelas grandes
- [ ] Testar scroll performance
- [ ] Medir improvement

---

## 📊 MÉTRICAS DE SUCESSO

### Antes das Otimizações

```
Bundle Total:        4.1 MB
Server Bundle:       3.5 MB
Vendor Charts:       430 KB
JSPDF:               388 KB
html2canvas:         202 KB
CSS Bundle:          248 KB (34KB gzipped)

Estimated Metrics:
- FCP: ~1.2s
- LCP: ~2.1s
- TTI: ~3.5s
```

### Após Otimizações (Target)

```
Bundle Total:        < 3.0 MB  (27% reduction)
Server Bundle:       < 1.5 MB  (57% reduction)
Vendor Charts:       Lazy loaded
JSPDF:               Lazy loaded
html2canvas:         Lazy loaded
CSS Bundle:          < 200 KB (< 30KB gzipped)

Target Metrics:
- FCP: < 1.0s
- LCP: < 1.8s
- TTI: < 2.5s
- Lighthouse Score: > 90
```

---

## 🧪 TESTING CHECKLIST

### Após Cada Implementação

- [ ] Build sem erros: `npm run build`
- [ ] Type check: `npm run check`
- [ ] Unit tests: `npm run test:unit`
- [ ] E2E tests: `npm run test:smoke`
- [ ] Bundle analysis: Verificar `dist/stats.html`
- [ ] Lighthouse: `npm run lighthouse`
- [ ] Manual testing em:
  - [ ] Chrome Desktop
  - [ ] Firefox Desktop
  - [ ] Safari Desktop
  - [ ] Chrome Mobile
  - [ ] Safari iOS

### Métricas a Monitorar

```bash
# Bundle sizes
ls -lh dist/public/assets/js/*.js | sort -k5 -h

# Server bundle
ls -lh dist/index.cjs

# Total dist size
du -sh dist/public

# Lighthouse score
npm run lighthouse
```

---

## 📝 DOCUMENTAÇÃO

### Atualizar Após Implementações

- [ ] Atualizar `AGENTE_10_GLOBAL_ARCHITECTURE_REPORT.md` com novos scores
- [ ] Atualizar `AGENTE_10_EXECUTIVE_SUMMARY.md` com métricas
- [ ] Criar changelog das melhorias
- [ ] Documentar novos padrões implementados
- [ ] Atualizar Storybook com exemplos

---

## 🎯 PRIORIZAÇÃO SUGERIDA

### Sprint 1 (Semana 1)
1. ✅ Corrigir duplicate class member
2. ✅ Lazy load vendor chunks (charts, pdf, html2canvas)
3. ✅ Adicionar bundle budget warnings

### Sprint 2 (Semana 2)
4. ✅ Otimizar server bundle (análise + tree shaking)
5. ✅ Implementar critical CSS

### Sprint 3 (Semana 3)
6. ✅ Separar ImobiContext em múltiplos contextos

### Sprint 4 (Semana 4)
7. ✅ Aumentar Storybook coverage
8. ✅ Implementar prefetch estratégico
9. ✅ Adicionar virtual scrolling onde necessário

---

**Total Estimado:** 4 sprints (1 mês)
**Effort:** ~40-60 horas de desenvolvimento
**Impacto Esperado:** Score 9.2 → 9.7+/10

---

*Última atualização: 25/12/2024*
