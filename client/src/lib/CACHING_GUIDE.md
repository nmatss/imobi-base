# Sistema de Caching de API - Guia Completo

## Visão Geral

Este projeto implementa um sistema completo de caching de API usando **React Query (TanStack Query)** com estratégias diferenciadas para diferentes tipos de dados.

## Estratégias de Cache

### 1. Cache-First (Dados Estáticos)
**Quando usar:** Dados que raramente mudam (configurações, tipos, categorias)

**Configuração:**
- staleTime: 30 minutos
- gcTime: 1 hora
- refetchOnWindowFocus: false
- refetchOnMount: false

**Exemplo:**
```typescript
import { usePropertyTypes, useLeadSources } from '@/hooks/useStaticData';

function MyComponent() {
  // Esses dados ficam em cache por 30 minutos
  const { data: propertyTypes } = usePropertyTypes();
  const { data: leadSources } = useLeadSources();
}
```

### 2. Stale-While-Revalidate (Dados Semi-Estáticos)
**Quando usar:** Propriedades, contratos, dados que mudam ocasionalmente

**Configuração:**
- staleTime: 5 minutos
- gcTime: 30 minutos
- refetchOnWindowFocus: always
- refetchOnMount: false

**Exemplo:**
```typescript
import { useProperties, useProperty } from '@/hooks/useProperties';

function PropertyList() {
  // Cache por 5 minutos, revalida ao focar na janela
  const { data: properties } = useProperties();

  return (
    <div>
      {properties?.map(property => (
        <PropertyCard
          key={property.id}
          property={property}
        />
      ))}
    </div>
  );
}
```

### 3. Network-First (Dados Dinâmicos)
**Quando usar:** Leads, follow-ups, atividades que mudam frequentemente

**Configuração:**
- staleTime: 1 minuto
- gcTime: 10 minutos
- refetchOnWindowFocus: always
- refetchOnMount: true

**Exemplo:**
```typescript
import { useLeads, useLead } from '@/hooks/useLeads';

function LeadKanban() {
  // Sempre busca dados frescos
  const { data: leads } = useLeads({ status: 'new' });
}
```

### 4. Realtime (Dados em Tempo Real)
**Quando usar:** Dashboard, métricas, notificações

**Configuração:**
- staleTime: 0 (sempre stale)
- gcTime: 5 minutos
- refetchInterval: 30 segundos
- refetchOnWindowFocus: always

**Exemplo:**
```typescript
import { useDashboardMetrics, useNotifications } from '@/hooks/useRealtimeData';

function Dashboard() {
  // Atualiza automaticamente a cada 30 segundos
  const { data: metrics } = useDashboardMetrics();

  // Atualiza a cada 1 minuto
  const { data: notifications } = useNotifications(true);
}
```

## Optimistic Updates

Atualizações otimistas melhoram a UX fazendo update imediato no cache antes da resposta do servidor.

### Exemplo Básico
```typescript
import { useUpdateProperty } from '@/hooks/useProperties';

function PropertyEditor({ propertyId }) {
  const updateProperty = useUpdateProperty();

  const handleSave = (data) => {
    // O hook já implementa optimistic update
    updateProperty.mutate({ id: propertyId, ...data });
    // UI atualiza imediatamente, rollback se falhar
  };
}
```

### Exemplo Avançado (Kanban)
```typescript
import { useUpdateLeadStatus } from '@/hooks/useLeads';

function LeadKanban() {
  const updateStatus = useUpdateLeadStatus();

  const handleDragEnd = (result) => {
    const { draggableId, destination } = result;

    if (!destination) return;

    // Atualização otimista do status
    updateStatus.mutate({
      id: draggableId,
      status: destination.droppableId,
    });
    // Lead move instantaneamente, rollback se API falhar
  };
}
```

## Prefetching

Melhora a performance carregando dados antes de serem necessários.

### Prefetch ao Fazer Hover
```typescript
import { usePrefetchOnHover } from '@/hooks/usePrefetch';

function PropertyCard({ property }) {
  const { onPropertyHover } = usePrefetchOnHover();

  return (
    <div
      onMouseEnter={() => onPropertyHover(property.id)}
      onClick={() => navigate(`/properties/${property.id}`)}
    >
      {/* Dados já estarão em cache ao clicar */}
    </div>
  );
}
```

### Prefetch de Listas
```typescript
import { useSmartPrefetch } from '@/hooks/usePrefetch';

function PropertyList() {
  const { data: properties } = useProperties();
  const { prefetchListPage } = useSmartPrefetch();

  useEffect(() => {
    if (properties) {
      // Prefetch dos primeiros 5 itens
      const ids = properties.map(p => p.id);
      prefetchListPage('properties', ids, 5);
    }
  }, [properties, prefetchListPage]);
}
```

### Prefetch de Dados Relacionados
```typescript
import { usePrefetchRelated } from '@/hooks/usePrefetch';

function PropertyDetails({ propertyId }) {
  const { prefetchPropertyRelated } = usePrefetchRelated();

  useEffect(() => {
    // Prefetch contratos e visitas relacionadas
    prefetchPropertyRelated(propertyId);
  }, [propertyId, prefetchPropertyRelated]);
}
```

## Invalidação de Cache

### Invalidação Simples
```typescript
import { cacheManager } from '@/lib/cache-manager';

function handleDelete(propertyId) {
  await deleteProperty(propertyId);

  // Invalida propriedade e dados relacionados
  await cacheManager.invalidation.invalidateProperty(propertyId);
}
```

### Invalidação de Múltiplas Entidades
```typescript
import { invalidateEntities } from '@/lib/queryClient';

function handleBulkUpdate() {
  await bulkUpdateProperties();

  // Invalida múltiplas entidades
  await invalidateEntities(['properties', 'contracts']);
}
```

## Sincronização de Cache

### Após Criar
```typescript
import { cacheManager } from '@/lib/cache-manager';

async function createProperty(data) {
  const newProperty = await apiCreateProperty(data);

  // Sincroniza cache automaticamente
  await cacheManager.synchronization.afterCreateProperty(newProperty);

  return newProperty;
}
```

### Após Atualizar
```typescript
async function updateProperty(id, data) {
  const updated = await apiUpdateProperty(id, data);

  // Atualiza em todas as listas e detalhes
  await cacheManager.synchronization.afterUpdateProperty(updated);

  return updated;
}
```

## Utilitários de Cache

### Verificar se Dados Estão em Cache
```typescript
import { cacheUtils } from '@/lib/cache-manager';
import { propertiesKeys } from '@/hooks/useProperties';

function MyComponent({ propertyId }) {
  const isCached = cacheUtils.isCached(
    propertiesKeys.detail(propertyId)
  );

  if (isCached) {
    // Dados já estão disponíveis
    const data = cacheUtils.getCachedData(
      propertiesKeys.detail(propertyId)
    );
  }
}
```

### Estatísticas de Cache
```typescript
import { cacheUtils } from '@/lib/cache-manager';

function DebugPanel() {
  const stats = cacheUtils.getCacheStats();

  return (
    <div>
      <p>Total Queries: {stats.totalQueries}</p>
      <p>Stale Queries: {stats.staleQueries}</p>
      <p>Cache Size: {stats.cacheSize} bytes</p>
    </div>
  );
}
```

### Debug de Cache
```typescript
import { cacheUtils } from '@/lib/cache-manager';

// Em desenvolvimento, debug do cache
if (import.meta.env.DEV) {
  window.debugCache = cacheUtils.debugCache;
  // No console: debugCache()
}
```

## Padrões Comuns

### 1. Lista + Detalhes
```typescript
function PropertyPage() {
  // Lista com cache de 5 minutos
  const { data: properties } = useProperties();

  // Detalhe com cache otimista
  const { data: property } = useProperty(selectedId);

  return (
    <div>
      <PropertyList properties={properties} />
      {selectedId && <PropertyDetails property={property} />}
    </div>
  );
}
```

### 2. Filtros com Cache
```typescript
function PropertySearch() {
  const [filters, setFilters] = useState({});

  // Cada combinação de filtros tem seu próprio cache
  const { data } = useProperties(filters);

  return (
    <div>
      <Filters onChange={setFilters} />
      <PropertyList properties={data} />
    </div>
  );
}
```

### 3. Polling para Dados Críticos
```typescript
function CriticalMetrics() {
  // Polling a cada 10 segundos
  const { data } = useDashboardMetrics({
    refetchInterval: 10 * 1000,
  });

  return <MetricsDisplay data={data} />;
}
```

### 4. Conditional Fetching
```typescript
function ConditionalData({ userId }) {
  // Só busca se userId existir
  const { data } = useLeads(
    { assignedTo: userId },
    { enabled: !!userId }
  );

  if (!userId) return null;
  return <LeadList leads={data} />;
}
```

## Performance Tips

### 1. Use Structural Sharing
React Query já faz isso por padrão, mas certifique-se de não desabilitar:
```typescript
// ✅ Bom - structural sharing habilitado
const { data } = useProperties();

// ❌ Evite desabilitar
const { data } = useProperties({
  structuralSharing: false, // Evite isso
});
```

### 2. Prefetch em Listas Longas
```typescript
function LongList() {
  const { data: items } = useProperties();
  const { prefetchProperties } = usePrefetch();

  useEffect(() => {
    // Prefetch apenas dos visíveis
    const visibleIds = items?.slice(0, 10).map(i => i.id) || [];
    prefetchProperties(visibleIds);
  }, [items]);
}
```

### 3. Cleanup de Cache Antigo
```typescript
import { cacheUtils } from '@/lib/cache-manager';

// Limpar cache com mais de 1 hora
useEffect(() => {
  const interval = setInterval(() => {
    cacheUtils.cleanupOldCache(60 * 60 * 1000);
  }, 5 * 60 * 1000); // A cada 5 minutos

  return () => clearInterval(interval);
}, []);
```

### 4. Debounce em Searches
```typescript
import { useDebounce } from '@/hooks/useDebounce';

function SearchProperties() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Só faz request após 300ms sem digitar
  const { data } = useProperties({ search: debouncedSearch });
}
```

## Troubleshooting

### Cache não Invalida
```typescript
// ❌ Problema
queryClient.invalidateQueries(['properties']);

// ✅ Solução - use query keys corretos
import { propertiesKeys } from '@/hooks/useProperties';
queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });
```

### Dados Stale Muito Rápido
```typescript
// Ajuste staleTime conforme necessário
const { data } = useProperties({
  staleTime: 10 * 60 * 1000, // 10 minutos ao invés de 5
});
```

### Memory Leaks
```typescript
// Sempre retorne cleanup em effects com intervalos
useEffect(() => {
  const interval = setInterval(() => {
    // ...
  }, 1000);

  return () => clearInterval(interval); // ✅ Cleanup
}, []);
```

## Métricas e Monitoramento

### Analytics de Cache
O sistema já envia eventos para Google Analytics:
```typescript
// Configurado em queryClient.ts
window.gtag('event', 'exception', {
  description: 'Query error: ...',
  fatal: false,
  error_type: 'network',
});
```

### Logs de Desenvolvimento
```typescript
// Em DEV, queries e mutations são logadas
if (import.meta.env.DEV) {
  console.log('Query success [query-hash]');
  console.log('Mutation success [mutation-id]');
}
```

## Conclusão

Este sistema de caching proporciona:
- ✅ Performance otimizada com cache inteligente
- ✅ UX melhorada com optimistic updates
- ✅ Menos requests ao servidor
- ✅ Dados sempre sincronizados
- ✅ Prefetching para navegação fluida
- ✅ Estratégias diferenciadas por tipo de dado
- ✅ Debug e monitoramento facilitados

Para mais informações, consulte a [documentação do React Query](https://tanstack.com/query/latest).
