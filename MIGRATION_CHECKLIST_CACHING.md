# Checklist de Migração para Sistema de Caching

## Para Desenvolvedores: Como Migrar Hooks Existentes

Este guia ajuda a migrar hooks useState/useEffect existentes para o novo sistema de caching com React Query.

## Antes de Começar

- [ ] Leia o [Guia Rápido](CACHING_QUICK_START.md)
- [ ] Veja os [Exemplos Práticos](client/src/examples/CachingExamples.tsx)
- [ ] Entenda as [Estratégias de Cache](client/src/lib/CACHING_GUIDE.md)

## Migração Passo a Passo

### 1. Identificar Tipo de Dados

Primeiro, identifique que tipo de dado seu hook gerencia:

- [ ] **Estático** (muda raramente) → useStaticData pattern
- [ ] **Semi-Estático** (muda ocasionalmente) → useProperties pattern
- [ ] **Dinâmico** (muda frequentemente) → useLeads pattern
- [ ] **Tempo Real** (sempre atualizado) → useRealtimeData pattern

### 2. Criar Query Keys

```typescript
// Antes
const [data, setData] = useState([]);

// Depois
export const myEntityKeys = {
  all: ['myEntity'] as const,
  lists: () => [...myEntityKeys.all, 'list'] as const,
  list: (filters?: Filters) => [...myEntityKeys.lists(), filters] as const,
  details: () => [...myEntityKeys.all, 'detail'] as const,
  detail: (id: string) => [...myEntityKeys.details(), id] as const,
};
```

### 3. Criar Funções de API

```typescript
// Extrair lógica de fetch
async function fetchMyEntities(filters?: Filters) {
  const response = await fetch('/api/my-entities', {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

async function fetchMyEntityById(id: string) {
  const response = await fetch(`/api/my-entities/${id}`, {
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to fetch');
  return response.json();
}

// Mutations
async function createMyEntity(data: CreateData) {
  const response = await fetch('/api/my-entities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to create');
  return response.json();
}
```

### 4. Criar Hook de Consulta

```typescript
import { useQuery } from '@tanstack/react-query';
import { cacheStrategies } from '@/lib/queryClient';

// Antes
export function useMyEntities() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/my-entities')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// Depois
export function useMyEntities(filters?: Filters) {
  return useQuery({
    queryKey: myEntityKeys.list(filters),
    queryFn: () => fetchMyEntities(filters),
    // Escolha a estratégia apropriada
    ...cacheStrategies.semiStatic, // ou dynamic, ou static
  });
}
```

### 5. Criar Hooks de Mutation

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast-enhanced';

export function useCreateMyEntity() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: createMyEntity,
    onSuccess: (newEntity) => {
      // Invalida listas
      queryClient.invalidateQueries({ queryKey: myEntityKeys.lists() });

      // Adiciona ao cache de detalhes
      queryClient.setQueryData(myEntityKeys.detail(newEntity.id), newEntity);

      success('Criado', 'Item criado com sucesso');
    },
    onError: (err: Error) => {
      error('Erro', err.message);
    },
  });
}

export function useUpdateMyEntity() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: updateMyEntity,
    // Optimistic update
    onMutate: async (updatedEntity) => {
      await queryClient.cancelQueries({
        queryKey: myEntityKeys.detail(updatedEntity.id)
      });

      const previous = queryClient.getQueryData(
        myEntityKeys.detail(updatedEntity.id)
      );

      if (previous) {
        queryClient.setQueryData(
          myEntityKeys.detail(updatedEntity.id),
          { ...previous, ...updatedEntity }
        );
      }

      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: myEntityKeys.lists() });
      queryClient.setQueryData(myEntityKeys.detail(updated.id), updated);
      success('Atualizado', 'Item atualizado com sucesso');
    },
    onError: (err: Error, updatedEntity, context) => {
      // Rollback
      if (context?.previous) {
        queryClient.setQueryData(
          myEntityKeys.detail(updatedEntity.id),
          context.previous
        );
      }
      error('Erro', err.message);
    },
  });
}
```

### 6. Atualizar Componentes

```typescript
// Antes
function MyComponent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/items')
      .then(r => r.json())
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return <div>{items.map(...)}</div>;
}

// Depois
function MyComponent() {
  const { data: items, isLoading } = useMyEntities();

  if (isLoading) return <div>Loading...</div>;

  return <div>{items?.map(...)}</div>;
}
```

## Checklist de Migração Completa

### Estrutura do Hook

- [ ] Query keys estruturados criados
- [ ] Funções de API extraídas e tipadas
- [ ] Hook de consulta implementado
- [ ] Hooks de mutation implementados (create, update, delete)
- [ ] Estratégia de cache escolhida e configurada
- [ ] Error handling implementado
- [ ] Success feedback implementado

### Optimistic Updates

- [ ] onMutate implementado com snapshot
- [ ] Update otimista aplicado ao cache
- [ ] onError com rollback implementado
- [ ] onSuccess com sync de cache

### Invalidação

- [ ] Listas invalidadas após mutations
- [ ] Cache de detalhes atualizado
- [ ] Entidades relacionadas consideradas

### Testes

- [ ] Hook testado com dados mockados
- [ ] Loading states verificados
- [ ] Error states verificados
- [ ] Success states verificados
- [ ] Optimistic updates testados

### Documentação

- [ ] JSDoc adicionado aos hooks
- [ ] Tipos exportados
- [ ] Exemplo de uso criado
- [ ] README atualizado (se necessário)

## Exemplos de Migração

### Exemplo 1: Hook Simples

**Antes:**
```typescript
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, []);

  return { products, loading };
}
```

**Depois:**
```typescript
export const productsKeys = {
  all: ['products'] as const,
  lists: () => [...productsKeys.all, 'list'] as const,
  list: (filters?: Filters) => [...productsKeys.lists(), filters] as const,
};

async function fetchProducts(filters?: Filters) {
  const response = await fetch('/api/products', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch products');
  return response.json();
}

export function useProducts(filters?: Filters) {
  return useQuery({
    queryKey: productsKeys.list(filters),
    queryFn: () => fetchProducts(filters),
    ...cacheStrategies.semiStatic,
  });
}
```

### Exemplo 2: Hook com Mutation

**Antes:**
```typescript
export function useCreateProduct() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const create = async (data) => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const product = await response.json();
      toast({ title: 'Sucesso' });
      return product;
    } catch (error) {
      toast({ title: 'Erro', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return { create, loading };
}
```

**Depois:**
```typescript
async function createProduct(data: CreateProductData) {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to create product');
  return response.json();
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { success, error } = useToast();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: productsKeys.lists() });
      queryClient.setQueryData(productsKeys.detail(newProduct.id), newProduct);
      success('Produto criado', 'O produto foi criado com sucesso');
    },
    onError: (err: Error) => {
      error('Erro ao criar produto', err.message);
    },
  });
}
```

## Benefícios da Migração

Após migrar, você terá:

✅ Cache automático e inteligente
✅ Menos código boilerplate
✅ Optimistic updates fáceis
✅ Error handling padronizado
✅ Invalidação automática
✅ Prefetching facilitado
✅ Debugging melhorado
✅ Performance otimizada

## Problemas Comuns

### Cache não atualiza após mutation

**Problema:** Mutation executou mas lista não atualizou

**Solução:**
```typescript
onSuccess: () => {
  // Certifique-se de invalidar corretamente
  queryClient.invalidateQueries({ queryKey: myEntityKeys.lists() });
}
```

### Muitos re-renders

**Problema:** Componente re-renderiza demais

**Solução:**
```typescript
// Use select para derivar dados
const { data } = useMyEntities({
  select: (data) => data.filter(item => item.active),
});
```

### Dados desatualizados

**Problema:** Dados parecem antigos

**Solução:**
```typescript
// Ajuste staleTime
const { data } = useMyEntities({
  staleTime: 1 * 60 * 1000, // 1 minuto ao invés de 5
});
```

## Recursos Adicionais

- [Guia Completo de Caching](client/src/lib/CACHING_GUIDE.md)
- [Guia Rápido](CACHING_QUICK_START.md)
- [Exemplos Práticos](client/src/examples/CachingExamples.tsx)
- [React Query Docs](https://tanstack.com/query/latest)

## Ajuda

Se tiver dúvidas:
1. Consulte os hooks já migrados: `useProperties`, `useLeads`, `useFollowUps`
2. Veja os exemplos em `client/src/examples/CachingExamples.tsx`
3. Use o cache debugger: `cacheUtils.debugCache()`

---

**Boas práticas:**
- Sempre use query keys estruturados
- Escolha a estratégia de cache apropriada
- Implemente optimistic updates quando fizer sentido
- Invalide cache relacionado
- Adicione error handling adequado
- Documente seu hook
