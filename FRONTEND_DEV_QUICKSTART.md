# Quick Start - Desenvolvedores Frontend

**Para:** Devs que vão implementar as correções
**Objetivo:** Iniciar correções AGORA sem ler 2000 linhas

---

## 🔥 Começar Aqui (1 hora)

### 1. Problema #1: Context Hell

**Arquivo:** `client/src/lib/imobi-context.tsx`

```bash
# Instalar Zustand
npm install zustand immer

# Criar novo arquivo
touch client/src/stores/auth.ts
```

```typescript
// client/src/stores/auth.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  devtools((set) => ({
    user: null,
    tenant: null,
    login: async (email, password) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      set({ user: data.user, tenant: data.tenant });
    },
    logout: async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      set({ user: null, tenant: null });
    },
  }))
);
```

**Migração gradual:**
```typescript
// ANTES (em qualquer componente)
const { user, tenant } = useImobi();

// DEPOIS
import { useAuthStore } from '@/stores/auth';
const user = useAuthStore(state => state.user);
const tenant = useAuthStore(state => state.tenant);
```

---

### 2. Problema #2: Dashboard O(n²)

**Arquivo:** `client/src/hooks/useDashboardData.ts` (linha 103-161)

```typescript
// ❌ ANTES (O(n²) - 15+ iterações)
const metrics = useMemo(() => {
  const newLeads = leads.filter(l => l.status === "new").length;
  const inContactLeads = leads.filter(l => l.status === "qualification").length;
  const inVisitLeads = leads.filter(l => l.status === "visit").length;
  // ... +12 iterações
}, [leads, visits, contracts, properties]);

// ✅ DEPOIS (O(n) - 1 iteração)
const metrics = useMemo(() => {
  const counts = { new: 0, qualification: 0, visit: 0, proposal: 0, contract: 0 };

  // Uma única iteração
  leads.forEach(lead => {
    counts[lead.status]++;
  });

  return {
    newLeads: counts.new,
    inContactLeads: counts.qualification,
    inVisitLeads: counts.visit,
    proposalLeads: counts.proposal,
    closedLeads: counts.contract,
    totalLeads: leads.length,
  };
}, [leads]);
```

**Ganho:** 85% mais rápido (de 100ms para 15ms com 500 leads)

---

### 3. Problema #3: Memory Leak

**Arquivo:** `client/src/lib/imobi-context.tsx` (linha 205-216)

```typescript
// ❌ ANTES (memory leak)
useEffect(() => {
  if (user && tenant) {
    fetchAllData();
  }
}, [user, tenant, fetchAllData]);

// ✅ DEPOIS (com cleanup)
useEffect(() => {
  let mounted = true;
  const controller = new AbortController();

  const fetchData = async () => {
    try {
      const res = await fetch('/api/properties', {
        signal: controller.signal,
      });

      if (!mounted) return;

      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
    }
  };

  if (user && tenant) {
    fetchData();
  }

  return () => {
    mounted = false;
    controller.abort();
  };
}, [user, tenant]);
```

---

### 4. Problema #4: Console.logs em Produção

**Criar:** `client/src/lib/logger.ts`

```typescript
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },

  error: (context: string, error: Error) => {
    if (isDev) {
      console.error(`[${context}]`, error);
    } else {
      // TODO: Integrar com Sentry
      // Sentry.captureException(error, { tags: { context } });
    }
  },

  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
};
```

**Buscar e substituir:**
```bash
# Encontrar todos console.log
grep -r "console\." client/src --exclude-dir=node_modules

# Substituir
# ANTES: console.error("Failed to fetch", error);
# DEPOIS: logger.error("PropertyList", error);
```

---

### 5. Problema #5: Callbacks Não Memorizados

**Arquivo:** Vários (dashboard, properties, etc.)

```typescript
// ❌ ANTES
<Button onClick={() => setLocation(`/properties/${id}`)}>

// ✅ DEPOIS
const handleView = useCallback((id: string) => {
  setLocation(`/properties/${id}`);
}, [setLocation]);

<Button onClick={() => handleView(id)}>
```

**Pattern:**
```typescript
// Hook customizado para handlers comuns
function usePropertyHandlers() {
  const [, setLocation] = useLocation();

  const handleView = useCallback((id: string) => {
    setLocation(`/properties/${id}`);
  }, [setLocation]);

  const handleEdit = useCallback((property: Property) => {
    // Lógica de edição
  }, []);

  const handleDelete = useCallback((id: string) => {
    // Lógica de delete
  }, []);

  return { handleView, handleEdit, handleDelete };
}

// Uso
const handlers = usePropertyHandlers();
<PropertyCard onView={handlers.handleView} />
```

---

## 🛠️ Ferramentas Úteis

### React DevTools Profiler

```bash
# 1. Instalar React DevTools (Chrome/Firefox)
# 2. Abrir DevTools > Profiler
# 3. Clicar Record
# 4. Fazer ação (ex: mudar filtro)
# 5. Stop
# 6. Ver flamegraph

# Procurar por:
# - Componentes com muitos re-renders (amarelo/vermelho)
# - Componentes com tempo alto (>16ms)
```

### Bundle Analyzer

```bash
# Instalar
npm install -D rollup-plugin-visualizer

# Adicionar em vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      filename: 'bundle-stats.html',
      gzipSize: true,
    }),
  ],
});

# Build e ver
npm run build
# Abre bundle-stats.html automaticamente
```

### Performance Monitoring

```typescript
// client/src/lib/performance.ts
export function measureRender(componentName: string) {
  const start = performance.now();

  return () => {
    const end = performance.now();
    const duration = end - start;

    if (duration > 16) { // 16ms = 60fps
      console.warn(`${componentName} render took ${duration.toFixed(2)}ms`);
    }
  };
}

// Uso
function MyComponent() {
  const endMeasure = measureRender('MyComponent');

  useEffect(() => {
    endMeasure();
  });

  return <div>...</div>;
}
```

---

## 📋 Checklist de PR

Antes de criar PR com otimizações:

```
[ ] Rodar profiler antes/depois
[ ] Medir tempo de render (console.time)
[ ] Verificar bundle size (rollup-plugin-visualizer)
[ ] Testar em mobile (Chrome DevTools > Device Mode)
[ ] Verificar memory leaks (DevTools > Memory > Heap Snapshot)
[ ] Lighthouse score (DevTools > Lighthouse)
[ ] Sem console.logs esquecidos
[ ] React DevTools: sem warnings
```

---

## 🎯 Metas por Sprint

### Sprint 1 (Esta Semana)
```
[ ] Migrar useAuthStore (8h)
[ ] Fix dashboard O(n²) (4h)
[ ] Adicionar logger.ts (2h)
[ ] Debounce em 3 inputs principais (2h)
[ ] Error boundary no Dashboard (2h)
[ ] Memory leak em imobi-context (4h)

Total: 22h
Meta: -30% crashes, +20% velocidade
```

### Sprint 2-3 (Próximas 2 Semanas)
```
[ ] Migrar usePropertiesStore (12h)
[ ] Migrar useLeadsStore (12h)
[ ] Implementar React Query (16h)
[ ] Memoizar PropertyCard (4h)
[ ] Memoizar LeadCard (4h)
[ ] Virtualização properties bugfix (4h)

Total: 52h
Meta: Dashboard 5x mais rápido
```

---

## 💡 Dicas Rápidas

### 1. Encontrar Re-renders
```typescript
// Adicionar em qualquer componente
useEffect(() => {
  console.log('Component rendered');
});

// Ou usar why-did-you-render
import whyDidYouRender from '@welldone-software/why-did-you-render';
whyDidYouRender(React);
```

### 2. Memoização Básica
```typescript
// useMemo para cálculos pesados
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// useCallback para funções
const handleClick = useCallback(() => {
  doSomething();
}, []);

// React.memo para componentes
const MyComponent = React.memo(({ data }) => {
  return <div>{data}</div>;
});
```

### 3. Code Splitting Básico
```typescript
// Lazy load componentes pesados
const HeavyComponent = lazy(() => import('./HeavyComponent'));

// Usar com Suspense
<Suspense fallback={<Skeleton />}>
  <HeavyComponent />
</Suspense>
```

### 4. Debounce Pattern
```typescript
// Hook reutilizável
function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Uso
const [search, setSearch] = useState('');
const debouncedSearch = useDebouncedValue(search);

useEffect(() => {
  // Só faz fetch após 300ms sem digitar
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

---

## 🐛 Debug Common Issues

### 1. "Too many re-renders"
```
Causa: setState dentro do render
Fix: Mover para useEffect ou evento
```

### 2. "Memory leak detected"
```
Causa: useEffect sem cleanup
Fix: Retornar função de cleanup
```

### 3. "Component unmounted"
```
Causa: setState após unmount
Fix: Usar flag 'mounted' ou AbortController
```

### 4. "Maximum update depth exceeded"
```
Causa: useEffect com deps erradas
Fix: Revisar array de dependências
```

---

## 📚 Recursos

- **Relatório Completo:** `/FRONTEND_COMPLETE_ANALYSIS_REPORT.md`
- **React Docs:** https://react.dev
- **Zustand Docs:** https://zustand-demo.pmnd.rs
- **React Query Docs:** https://tanstack.com/query
- **Web.dev Performance:** https://web.dev/performance

---

**Boa sorte! 🚀**

**Dúvidas?** Ver relatório completo ou perguntar no Slack #frontend
