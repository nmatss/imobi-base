# Guia Rápido: Otimização de Performance

## 📊 Como Usar as Novas Ferramentas de Performance

### 1. Hook de Performance Metrics

```typescript
import { usePerformanceMetrics, getPerformanceRating } from '@/hooks/usePerformanceMetrics';

function MyComponent() {
  const metrics = usePerformanceMetrics();

  // Ver métricas no console (development mode)
  // Métricas são logadas automaticamente após 3 segundos

  // Verificar rating de uma métrica
  const lcpRating = getPerformanceRating('LCP', metrics.LCP);
  // Returns: 'good' | 'needs-improvement' | 'poor' | 'unknown'

  return (
    <div>
      <p>LCP: {metrics.LCP?.toFixed(2)}ms ({lcpRating})</p>
      <p>FID: {metrics.FID?.toFixed(2)}ms</p>
      <p>CLS: {metrics.CLS?.toFixed(3)}</p>
    </div>
  );
}
```

### 2. OptimizedImage Component

```typescript
import { OptimizedImage } from '@/components/OptimizedImage';

function PropertyCard() {
  return (
    <OptimizedImage
      src="/path/to/image.jpg"
      alt="Property Image"
      width={800}
      height={600}
      aspectRatio="video" // 'square' | 'video' | 'auto'
      objectFit="cover"   // 'cover' | 'contain' | 'fill'
      priority={false}    // true para imagens acima da dobra
      sizes="(max-width: 768px) 100vw, 50vw" // Responsive sizes
    />
  );
}
```

### 3. VirtualizedList Component

```typescript
import { VirtualizedList } from '@/components/VirtualizedList';

function PropertiesList() {
  const properties = [...]; // Array grande

  return (
    <VirtualizedList
      items={properties}
      estimateSize={280} // Altura estimada de cada item
      overscan={5}       // Items extras para scroll suave
      height="800px"     // Altura do container
      renderItem={(property, index) => (
        <PropertyCard key={property.id} {...property} />
      )}
    />
  );
}
```

### 4. React.memo para Componentes

```typescript
import { memo } from 'react';

// Componente simples
const MyCard = memo(function MyCard({ title, description }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
});

// Com comparação customizada
const MyComplexCard = memo(
  function MyComplexCard({ id, data, onClick }) {
    return <div onClick={onClick}>{data.title}</div>;
  },
  (prevProps, nextProps) => {
    // Só re-renderiza se id ou data.title mudarem
    return (
      prevProps.id === nextProps.id &&
      prevProps.data.title === nextProps.data.title
    );
  }
);
```

---

## 🎯 Best Practices

### Lazy Loading de Rotas

```typescript
// ✅ CORRETO - Lazy load
const Dashboard = lazy(() => import("@/pages/dashboard"));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Route path="/dashboard" component={Dashboard} />
    </Suspense>
  );
}

// ❌ ERRADO - Carrega tudo no início
import Dashboard from "@/pages/dashboard";
```

### Lazy Loading de Bibliotecas Pesadas

```typescript
// ✅ CORRETO - Lazy load Recharts
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));

function MyChart() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <BarChart data={data} />
    </Suspense>
  );
}

// ❌ ERRADO - Importa tudo no bundle inicial
import { BarChart } from "recharts";
```

### Otimização de Imagens

```typescript
// ✅ CORRETO - Prioridades adequadas
function Hero() {
  return (
    <OptimizedImage
      src="/hero.jpg"
      alt="Hero"
      priority={true}        // ← Acima da dobra
      width={1920}
      height={1080}
      sizes="100vw"
    />
  );
}

function Gallery() {
  return images.map(img => (
    <OptimizedImage
      key={img.id}
      src={img.url}
      alt={img.title}
      priority={false}       // ← Lazy load
      width={400}
      height={300}
      sizes="(max-width: 768px) 100vw, 400px"
    />
  ));
}

// ❌ ERRADO - Todas as imagens com priority
<OptimizedImage src="/gallery-1.jpg" priority={true} /> {/* Não! */}
```

### Memoização de Componentes

```typescript
// ✅ CORRETO - Memoizar componentes que renderizam frequentemente
const ExpensiveList = memo(function ExpensiveList({ items }) {
  return items.map(item => <ExpensiveItem key={item.id} {...item} />);
});

// ❌ ERRADO - Memoizar componentes simples (overhead desnecessário)
const SimpleButton = memo(function SimpleButton({ label }) {
  return <button>{label}</button>; // Muito simples, não precisa
});
```

---

## 🔍 Como Monitorar Performance

### 1. Development Mode

```bash
# Build com análise de bundle
npm run build

# Abrir stats.html para visualizar bundle
# Arquivo gerado em: dist/stats.html
```

### 2. Lighthouse CI

```bash
# Rodar Lighthouse localmente
npm run lighthouse

# CI/CD
npm run lighthouse:ci
```

### 3. Browser DevTools

1. Abra DevTools (F12)
2. Performance Tab → Gravar → Interagir → Stop
3. Lighthouse Tab → Generate Report
4. Network Tab → Disable Cache → Reload

### 4. Métricas em Produção

```typescript
// main.tsx ou App.tsx
import { reportWebVitals } from '@/hooks/usePerformanceMetrics';

// Reportar para analytics
reportWebVitals(metrics => {
  console.log('Web Vitals:', metrics);
  // Ou enviar para Google Analytics, DataDog, etc.
});
```

---

## 📈 Thresholds de Performance

### Web Vitals

| Métrica | Good | Needs Improvement | Poor |
|---------|------|-------------------|------|
| LCP | < 2.5s | 2.5s - 4s | > 4s |
| FID | < 100ms | 100ms - 300ms | > 300ms |
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| FCP | < 1.8s | 1.8s - 3s | > 3s |
| TTFB | < 600ms | 600ms - 1800ms | > 1800ms |

### Bundle Size

| Tipo | Good | Warning | Critical |
|------|------|---------|----------|
| Initial Bundle | < 500KB | 500KB - 800KB | > 800KB |
| Route Chunk | < 100KB | 100KB - 200KB | > 200KB |
| Vendor Chunk | < 150KB | 150KB - 300KB | > 300KB |

---

## 🚀 Checklist para Novas Features

Ao adicionar nova feature, verificar:

- [ ] Rota usa lazy loading?
- [ ] Imagens usam OptimizedImage?
- [ ] Listas grandes usam VirtualizedList?
- [ ] Componentes pesados usam memo?
- [ ] Bibliotecas pesadas são lazy loaded?
- [ ] Suspense boundaries configurados?
- [ ] Bundle size não aumentou > 10%?

---

## 🛠️ Ferramentas Disponíveis

### Scripts NPM

```bash
# Build e análise
npm run build              # Build production
npm run preview            # Preview build local

# Performance
npm run lighthouse         # Lighthouse local
npm run lighthouse:ci      # Lighthouse CI

# Testes
npm run test               # Unit tests
npm run test:coverage      # Coverage report

# Desenvolvimento
npm run dev                # Dev server
npm run check              # TypeScript check
```

### VSCode Extensions Recomendadas

1. **Import Cost** - Ver tamanho de imports
2. **Bundle Size** - Análise de bundle em tempo real
3. **React DevTools** - Profiling de componentes

---

## 📚 Recursos Adicionais

### Documentação

- [Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Vite Performance](https://vitejs.dev/guide/performance.html)

### Tools Online

- [PageSpeed Insights](https://pagespeed.web.dev/)
- [WebPageTest](https://www.webpagetest.org/)
- [Bundlephobia](https://bundlephobia.com/) - Checar tamanho de pacotes

---

**Última atualização:** 25 de Dezembro de 2024
**Versão:** 1.0.0
