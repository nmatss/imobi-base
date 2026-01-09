# Sistema de Caching - Guia Rápido

## TL;DR - O Que Você Precisa Saber

### 5 Estratégias de Cache

```typescript
1. Static (30min)      → Configurações, tipos
2. Semi-Static (5min)  → Propriedades, contratos
3. Dynamic (1min)      → Leads, follow-ups
4. Realtime (30s)      → Dashboard, métricas
5. Detail (5min)       → Detalhes de entidades
```

## Uso Rápido

### 1. Dados Estáticos (Longa Duração)
```typescript
import { usePropertyTypes, useLeadSources } from '@/hooks/useStaticData';

const { data: types } = usePropertyTypes(); // Cache 30min
```

### 2. Listas Normais
```typescript
import { useProperties } from '@/hooks/useProperties';

const { data: properties } = useProperties(); // Cache 5min
const { data: filtered } = useProperties({ type: 'house' }); // Cache separado
```

### 3. Dados Dinâmicos
```typescript
import { useLeads } from '@/hooks/useLeads';

const { data: leads } = useLeads(); // Cache 1min, sempre revalida
```

### 4. Tempo Real
```typescript
import { useDashboardMetrics } from '@/hooks/useRealtimeData';

const { data: metrics } = useDashboardMetrics(); // Auto-refetch 30s
```

### 5. Criar/Atualizar/Deletar
```typescript
import { useCreateProperty, useUpdateProperty } from '@/hooks/useProperties';

const create = useCreateProperty();
const update = useUpdateProperty();

// Optimistic update automático
update.mutate({ id: '123', title: 'Novo Título' });
```

### 6. Prefetch ao Hover
```typescript
import { usePrefetchOnHover } from '@/hooks/usePrefetch';

const { onPropertyHover } = usePrefetchOnHover();

<div onMouseEnter={() => onPropertyHover(property.id)}>
  {/* Dados já em cache ao clicar */}
</div>
```

### 7. Invalidar Cache
```typescript
import { cacheManager } from '@/lib/cache-manager';

// Invalida propriedade e relacionados
await cacheManager.invalidation.invalidateProperty(propertyId);

// Invalida lead e relacionados
await cacheManager.invalidation.invalidateLead(leadId);
```

## Quando Usar Cada Hook

### Dados Estáticos
- `usePropertyTypes()` - Tipos de imóveis
- `usePropertyCategories()` - Venda/Aluguel
- `useLeadSources()` - Fontes de leads
- `useSystemSettings()` - Configurações

### Dados Semi-Estáticos
- `useProperties()` - Lista de propriedades
- `useProperty(id)` - Detalhe de propriedade
- `useContracts()` - Lista de contratos
- `useContract(id)` - Detalhe de contrato

### Dados Dinâmicos
- `useLeads()` - Lista de leads
- `useLead(id)` - Detalhe de lead
- `useFollowUps()` - Lista de follow-ups
- `useLeadFollowUps(leadId)` - Follow-ups de um lead

### Tempo Real
- `useDashboardMetrics()` - Métricas
- `useRecentActivities()` - Atividades
- `useNotifications()` - Notificações
- `useTodayAgenda()` - Agenda

## Padrões Comuns

### 1. Lista + Filtros
```typescript
const [filters, setFilters] = useState({});
const { data } = useProperties(filters);
// Cada filtro tem cache separado
```

### 2. Master-Detail
```typescript
const { data: properties } = useProperties();
const { data: property } = useProperty(selectedId);
// Detalhe usa cache da lista se disponível
```

### 3. Search com Debounce
```typescript
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);
const { data } = useLeads({ search: debouncedSearch });
```

### 4. Conditional Fetching
```typescript
const { data } = useProperty(propertyId, {
  enabled: !!propertyId // Só busca se ID existir
});
```

### 5. Prefetch em Listas
```typescript
const { data: properties } = useProperties();
const { prefetchListPage } = useSmartPrefetch();

useEffect(() => {
  const ids = properties?.map(p => p.id) || [];
  prefetchListPage('properties', ids, 5); // Primeiros 5
}, [properties]);
```

## Debug

### Ver Estatísticas
```typescript
import { cacheUtils } from '@/lib/cache-manager';

const stats = cacheUtils.getCacheStats();
console.table(stats);
```

### Debug Completo
```typescript
cacheUtils.debugCache(); // Loga tudo no console
```

### React Query DevTools
```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

## Troubleshooting

### Cache não atualiza
```typescript
// Força refetch
const { refetch } = useProperties();
refetch();

// Ou invalida
await cacheManager.invalidation.invalidateAll('properties');
```

### Muitos requests
```typescript
// Aumente staleTime
const { data } = useProperties({
  staleTime: 10 * 60 * 1000 // 10 minutos
});
```

### Dados dessincronizados
```typescript
// Use invalidação após mutations
const update = useUpdateProperty();
update.mutate(data, {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });
  }
});
```

## Performance Tips

1. **Use prefetch em listas:** Hover = dados prontos
2. **Debounce em searches:** Menos requests
3. **Conditional fetching:** Só busca quando necessário
4. **Ajuste staleTime:** Mais tempo = menos requests
5. **Use optimistic updates:** UX instantânea

## Estrutura de Query Keys

```typescript
// Properties
propertiesKeys.all              // ['properties']
propertiesKeys.lists()          // ['properties', 'list']
propertiesKeys.list(filters)    // ['properties', 'list', {...filters}]
propertiesKeys.details()        // ['properties', 'detail']
propertiesKeys.detail(id)       // ['properties', 'detail', id]

// Leads (mesma estrutura)
leadsKeys.all
leadsKeys.lists()
leadsKeys.list(filters)
leadsKeys.details()
leadsKeys.detail(id)
```

## Arquivos Importantes

- `client/src/lib/queryClient.ts` - Configuração
- `client/src/lib/cache-manager.ts` - Utilitários
- `client/src/hooks/useStaticData.ts` - Dados estáticos
- `client/src/hooks/useRealtimeData.ts` - Tempo real
- `client/src/hooks/usePrefetch.ts` - Prefetching
- `client/src/lib/CACHING_GUIDE.md` - Guia completo
- `client/src/examples/CachingExamples.tsx` - Exemplos

## Checklist de Implementação

Ao criar novo hook de API:

- [ ] Criar query keys estruturados
- [ ] Escolher estratégia de cache apropriada
- [ ] Implementar optimistic updates (se aplicável)
- [ ] Adicionar invalidação de cache nas mutations
- [ ] Configurar retry strategy
- [ ] Adicionar error handling
- [ ] Documentar uso

## Recursos

- [React Query Docs](https://tanstack.com/query/latest)
- [Guia Completo Local](client/src/lib/CACHING_GUIDE.md)
- [Exemplos Práticos](client/src/examples/CachingExamples.tsx)

---

**Dúvidas?** Consulte o guia completo em `/client/src/lib/CACHING_GUIDE.md`
