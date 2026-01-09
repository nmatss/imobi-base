# Guia de Integração - Performance Backend

Este guia mostra como integrar as otimizações de performance no ImobiBase.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Aplicar Indexes](#1-aplicar-indexes)
3. [Configurar Redis](#2-configurar-redis)
4. [Integrar Cache](#3-integrar-cache-no-storage)
5. [Adicionar Paginação](#4-adicionar-paginação)
6. [Testar Performance](#5-testar-performance)
7. [Monitorar Produção](#6-monitorar-produção)

---

## Pré-requisitos

```bash
# PostgreSQL instalado e configurado
# Redis instalado
# Node.js 18+
# Variáveis de ambiente configuradas
```

---

## 1. Aplicar Indexes

### Passo 1.1: Backup do Banco (Opcional mas Recomendado)

```bash
# Backup manual
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# O script apply-indexes.sh já faz backup automático
```

### Passo 1.2: Executar Script de Indexes

```bash
# Dry run primeiro (apenas visualizar)
export DATABASE_URL='postgresql://user:pass@localhost:5432/imobibase'
DRY_RUN=true ./scripts/apply-indexes.sh

# Aplicar de verdade
./scripts/apply-indexes.sh

# Ou via npm
npm run db:migrate:indexes
```

### Passo 1.3: Verificar Aplicação

```bash
# Contar indexes
psql $DATABASE_URL -c "
  SELECT COUNT(*) as total_indexes
  FROM pg_indexes
  WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
"
# Deve retornar ~85

# Verificar indexes críticos
psql $DATABASE_URL -c "
  SELECT indexname FROM pg_indexes
  WHERE schemaname = 'public'
    AND indexname IN (
      'idx_properties_tenant_id',
      'idx_leads_tenant_id',
      'idx_rental_payments_tenant_id'
    );
"
```

### Passo 1.4: Otimizar Estatísticas

```bash
# Atualizar estatísticas do banco
psql $DATABASE_URL -c "ANALYZE;"

# Verificar query plan melhorado
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT * FROM properties
  WHERE tenant_id = 'some-tenant-id'
  LIMIT 10;
"
# Deve mostrar "Index Scan" em vez de "Seq Scan"
```

---

## 2. Configurar Redis

### Passo 2.1: Instalar Redis

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server

# MacOS
brew install redis

# Verificar instalação
redis-server --version
```

### Passo 2.2: Iniciar Redis

```bash
# Desenvolvimento (foreground)
redis-server

# Produção (background)
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verificar status
sudo systemctl status redis-server
```

### Passo 2.3: Testar Conexão

```bash
# Ping test
redis-cli ping
# Deve retornar: PONG

# Test with URL
redis-cli -u redis://localhost:6379 ping

# Ver informações
redis-cli info
```

### Passo 2.4: Configurar Environment

```bash
# .env.development
REDIS_URL=redis://localhost:6379
REDIS_CACHE_ENABLED=true

# .env.production
REDIS_URL=redis://production-host:6379
REDIS_CACHE_ENABLED=true

# Para desabilitar cache temporariamente
REDIS_CACHE_ENABLED=false
```

---

## 3. Integrar Cache no Storage

### Passo 3.1: Adicionar Imports

```typescript
// server/storage.ts - Adicionar no topo do arquivo

import {
  getCachedProperties,
  getCachedLeads,
  getCachedDashboardStats,
  getCachedRentalContracts,
  getCachedRentalPayments,
  InvalidateCache,
} from './cache/query-cache';
```

### Passo 3.2: Wrapper Query - Properties

```typescript
// server/storage.ts

// ANTES
async getPropertiesByTenant(
  tenantId: string,
  filters?: { type?: string; category?: string; status?: string; featured?: boolean }
): Promise<Property[]> {
  const conditions = [eq(schema.properties.tenantId, tenantId)];
  if (filters?.type) conditions.push(eq(schema.properties.type, filters.type));
  if (filters?.category) conditions.push(eq(schema.properties.category, filters.category));
  if (filters?.status) conditions.push(eq(schema.properties.status, filters.status));
  if (filters?.featured !== undefined) conditions.push(eq(schema.properties.featured, filters.featured));

  return db.select()
    .from(schema.properties)
    .where(and(...conditions))
    .orderBy(desc(schema.properties.createdAt));
}

// DEPOIS (com cache)
async getPropertiesByTenant(
  tenantId: string,
  filters?: { type?: string; category?: string; status?: string; featured?: boolean }
): Promise<Property[]> {
  // Wrapper com cache (TTL: 5 minutos)
  return getCachedProperties(tenantId, filters, async () => {
    const conditions = [eq(schema.properties.tenantId, tenantId)];
    if (filters?.type) conditions.push(eq(schema.properties.type, filters.type));
    if (filters?.category) conditions.push(eq(schema.properties.category, filters.category));
    if (filters?.status) conditions.push(eq(schema.properties.status, filters.status));
    if (filters?.featured !== undefined) conditions.push(eq(schema.properties.featured, filters.featured));

    return db.select()
      .from(schema.properties)
      .where(and(...conditions))
      .orderBy(desc(schema.properties.createdAt));
  });
}
```

### Passo 3.3: Wrapper Query - Leads

```typescript
// ANTES
async getLeadsByTenant(tenantId: string): Promise<Lead[]> {
  return db.select()
    .from(schema.leads)
    .where(eq(schema.leads.tenantId, tenantId))
    .orderBy(desc(schema.leads.createdAt));
}

// DEPOIS (com cache)
async getLeadsByTenant(tenantId: string): Promise<Lead[]> {
  return getCachedLeads(tenantId, async () => {
    return db.select()
      .from(schema.leads)
      .where(eq(schema.leads.tenantId, tenantId))
      .orderBy(desc(schema.leads.createdAt));
  });
}
```

### Passo 3.4: Invalidação em Mutations

```typescript
// CREATE property
async createProperty(property: InsertProperty): Promise<Property> {
  const id = generateId();
  const data = {
    ...property,
    id,
    features: isSqlite ? toJson(property.features as any) : property.features,
    images: isSqlite ? toJson(property.images as any) : property.images,
    createdAt: now(),
    updatedAt: now(),
  };
  const [created] = await db.insert(schema.properties).values(data as any).returning();

  // ← ADICIONAR: Invalidar cache
  await InvalidateCache.onPropertyChange(property.tenantId);

  return created;
}

// UPDATE property
async updateProperty(id: string, property: Partial<InsertProperty>): Promise<Property | undefined> {
  const data = {
    ...property,
    features: isSqlite && property.features ? toJson(property.features as any) : property.features,
    images: isSqlite && property.images ? toJson(property.images as any) : property.images,
    updatedAt: now(),
  };
  const [updated] = await db.update(schema.properties)
    .set(data as any)
    .where(eq(schema.properties.id, id))
    .returning();

  // ← ADICIONAR: Invalidar cache
  if (updated) {
    await InvalidateCache.onPropertyChange(updated.tenantId, id);
  }

  return updated;
}

// DELETE property
async deleteProperty(id: string): Promise<boolean> {
  // Buscar property primeiro para saber o tenant
  const property = await this.getProperty(id);

  await db.delete(schema.properties).where(eq(schema.properties.id, id));

  // ← ADICIONAR: Invalidar cache
  if (property) {
    await InvalidateCache.onPropertyChange(property.tenantId, id);
  }

  return true;
}
```

### Passo 3.5: Invalidação para Leads

```typescript
// CREATE lead
async createLead(lead: InsertLead): Promise<Lead> {
  const id = generateId();
  const data = {
    ...lead,
    id,
    interests: isSqlite ? toJson(lead.interests as any) : lead.interests,
    createdAt: now(),
    updatedAt: now(),
  };
  const [created] = await db.insert(schema.leads).values(data as any).returning();

  // ← ADICIONAR
  await InvalidateCache.onLeadChange(lead.tenantId);

  return created;
}

// UPDATE lead
async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead | undefined> {
  const data = {
    ...lead,
    interests: isSqlite && lead.interests ? toJson(lead.interests as any) : lead.interests,
    updatedAt: now(),
  };
  const [updated] = await db.update(schema.leads)
    .set(data as any)
    .where(eq(schema.leads.id, id))
    .returning();

  // ← ADICIONAR
  if (updated) {
    await InvalidateCache.onLeadChange(updated.tenantId, id);
  }

  return updated;
}
```

---

## 4. Adicionar Paginação

### Passo 4.1: Adicionar Imports

```typescript
// server/routes.ts

import {
  parsePaginationParams,
  createPaginatedResponse,
  paginate,
  type PaginationParams,
} from './utils/pagination';
```

### Passo 4.2: Atualizar Route de Properties

```typescript
// ANTES
app.get('/api/properties', async (req, res) => {
  const properties = await storage.getPropertiesByTenant(req.user.tenantId);
  res.json(properties);
});

// DEPOIS (com paginação)
app.get('/api/properties', async (req, res) => {
  const { page, limit, offset } = parsePaginationParams({
    page: req.query.page as string,
    limit: req.query.limit as string,
  });

  // Buscar dados paginados
  const properties = await storage.getPropertiesByTenant(req.user.tenantId)
    .limit(limit)
    .offset(offset);

  // Contar total (em paralelo se possível)
  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(schema.properties)
    .where(eq(schema.properties.tenantId, req.user.tenantId));

  // Retornar com metadata
  res.json(createPaginatedResponse(
    properties,
    Number(count),
    page,
    limit
  ));
});

// Cliente receberá:
// {
//   data: [...],
//   pagination: {
//     page: 1,
//     limit: 20,
//     total: 150,
//     totalPages: 8,
//     hasNext: true,
//     hasPrev: false
//   }
// }
```

### Passo 4.3: Helper All-in-One

```typescript
// Ou usar o helper all-in-one
app.get('/api/properties', async (req, res) => {
  const result = await paginate(
    // Query function
    async (limit, offset) => {
      return db.select()
        .from(schema.properties)
        .where(eq(schema.properties.tenantId, req.user.tenantId))
        .limit(limit)
        .offset(offset);
    },
    // Count function
    async () => {
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(schema.properties)
        .where(eq(schema.properties.tenantId, req.user.tenantId));
      return Number(count);
    },
    // Params
    {
      page: req.query.page as string,
      limit: req.query.limit as string,
    }
  );

  res.json(result);
});
```

### Passo 4.4: Atualizar Frontend

```typescript
// client/src/hooks/useProperties.ts

import { useQuery } from '@tanstack/react-query';

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useProperties(page = 1, limit = 20) {
  return useQuery<PaginatedResponse<Property>>({
    queryKey: ['properties', page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/properties?page=${page}&limit=${limit}`
      );
      return response.json();
    },
  });
}

// Usar no componente
function PropertiesPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProperties(page, 20);

  if (isLoading) return <LoadingState />;

  return (
    <div>
      <PropertyList properties={data.data} />

      <Pagination
        currentPage={data.pagination.page}
        totalPages={data.pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

---

## 5. Testar Performance

### Passo 5.1: Executar Script de Teste

```bash
# Rodar teste de performance
./scripts/test-performance.sh

# Deve mostrar:
# - Indexes instalados
# - Redis conectado
# - Query performance
# - Statistics
```

### Passo 5.2: Teste Manual de Cache

```bash
# Verificar cache stats
curl http://localhost:5000/api/admin/cache-stats

# Exemplo de resposta:
# {
#   "enabled": true,
#   "connected": true,
#   "totalKeys": 45,
#   "memoryUsage": "2.5M"
# }

# Ver keys no Redis
redis-cli KEYS "imobibase:*"

# Ver conteúdo de um cache
redis-cli GET "imobibase:properties:list:tenant-id:{}"
```

### Passo 5.3: Benchmark de Queries

```bash
# Testar query antes do cache
time curl "http://localhost:5000/api/properties"
# real    0m2.345s  (primeira chamada, sem cache)

# Testar query com cache
time curl "http://localhost:5000/api/properties"
# real    0m0.023s  (segunda chamada, cache hit) - 100x faster!

# Invalidar cache e testar novamente
curl -X POST "http://localhost:5000/api/properties" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","type":"house"}'

time curl "http://localhost:5000/api/properties"
# real    0m2.156s  (cache foi invalidado)
```

---

## 6. Monitorar Produção

### Passo 6.1: Configurar Endpoint de Stats

```typescript
// server/routes.ts

import { getCacheStats } from './cache/query-cache';

app.get('/api/admin/cache-stats', async (req, res) => {
  // Verificar permissões de admin
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const stats = await getCacheStats();
  res.json(stats);
});
```

### Passo 6.2: Dashboard de Monitoramento

```typescript
// client/src/pages/admin/performance.tsx

export function PerformanceDashboard() {
  const { data: cacheStats } = useQuery({
    queryKey: ['cache-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cache-stats');
      return res.json();
    },
    refetchInterval: 5000, // Atualizar a cada 5s
  });

  return (
    <div className="grid grid-cols-3 gap-4">
      <MetricCard
        title="Cache Status"
        value={cacheStats.connected ? 'Connected' : 'Disconnected'}
        icon={Database}
      />
      <MetricCard
        title="Cached Keys"
        value={cacheStats.totalKeys}
        icon={Key}
      />
      <MetricCard
        title="Memory Usage"
        value={cacheStats.memoryUsage}
        icon={Memory}
      />
    </div>
  );
}
```

### Passo 6.3: Alertas de Performance

```typescript
// server/monitoring/performance-alerts.ts

export async function checkPerformance() {
  const stats = await getCacheStats();

  // Alerta se cache está desconectado
  if (!stats.connected) {
    console.error('[ALERT] Redis cache is disconnected!');
    // Enviar notificação
  }

  // Alerta se uso de memória alto
  if (stats.memoryUsage && parseMemory(stats.memoryUsage) > 500) {
    console.warn('[ALERT] Redis memory usage is high:', stats.memoryUsage);
  }

  // Verificar slow queries
  const slowQueries = await checkSlowQueries();
  if (slowQueries.length > 0) {
    console.warn('[ALERT] Slow queries detected:', slowQueries);
  }
}

// Rodar a cada 5 minutos
setInterval(checkPerformance, 5 * 60 * 1000);
```

### Passo 6.4: Métricas de Database

```bash
# Slow queries (PostgreSQL)
psql $DATABASE_URL -c "
  SELECT
    query,
    calls,
    mean_exec_time,
    max_exec_time
  FROM pg_stat_statements
  WHERE mean_exec_time > 100  -- queries > 100ms
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Index usage
psql $DATABASE_URL -c "
  SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC
  LIMIT 20;
"

# Cache hit ratio (should be >99%)
psql $DATABASE_URL -c "
  SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
  FROM pg_statio_user_tables;
"
```

---

## ✅ Checklist de Integração

- [ ] Aplicar indexes com `apply-indexes.sh`
- [ ] Verificar indexes com query EXPLAIN
- [ ] Instalar e configurar Redis
- [ ] Adicionar imports de cache no storage.ts
- [ ] Wrapper queries com getCached*
- [ ] Adicionar InvalidateCache em mutations
- [ ] Adicionar imports de pagination
- [ ] Atualizar routes com paginação
- [ ] Atualizar frontend para usar paginação
- [ ] Testar performance com script
- [ ] Configurar endpoint de stats
- [ ] Configurar monitoramento
- [ ] Deploy para staging/production
- [ ] Monitorar métricas por 24h
- [ ] Ajustar TTL se necessário

---

## 🎯 Performance Targets

Após implementação completa, você deve ver:

- **Cache Hit Rate**: >80% (idealmente >90%)
- **Dashboard Load**: <500ms (de 3-5s)
- **Properties List**: <300ms (de 2-3s)
- **Query Count/Request**: <5 (de 50-100)
- **Database CPU**: <30% (de 60-80%)
- **Response Time P95**: <1s

---

## 🆘 Troubleshooting

### Cache não está funcionando

```bash
# Verificar Redis
redis-cli ping

# Verificar logs
tail -f /var/log/redis/redis-server.log

# Verificar variável de ambiente
echo $REDIS_CACHE_ENABLED

# Verificar conexão na app
curl http://localhost:5000/api/admin/cache-stats
```

### Queries ainda lentas

```bash
# Verificar se indexes foram aplicados
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM pg_indexes
  WHERE schemaname = 'public' AND indexname LIKE 'idx_%';
"

# Verificar query plan
psql $DATABASE_URL -c "
  EXPLAIN ANALYZE
  SELECT * FROM properties WHERE tenant_id = 'xxx';
"
# Deve mostrar "Index Scan"

# Atualizar estatísticas
psql $DATABASE_URL -c "ANALYZE;"
```

### Memória Redis crescendo

```bash
# Ver keys por tipo
redis-cli --scan --pattern "imobibase:*" | cut -d: -f2 | sort | uniq -c

# Limpar cache manualmente
redis-cli FLUSHDB

# Configurar eviction policy
redis-cli CONFIG SET maxmemory 500mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

**Última atualização**: 2024-12-25
**Versão**: 1.0
