/**
 * Exemplos Práticos de Uso do Sistema de Caching
 *
 * Este arquivo contém exemplos reais de como usar o sistema de caching
 * em diferentes cenários da aplicação.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ==================== Exemplo 1: Lista com Prefetch ====================
import { useProperties } from '@/hooks/useProperties';
import { usePrefetchOnHover } from '@/hooks/usePrefetch';

export function PropertyListWithPrefetch() {
  const { data: properties, isLoading } = useProperties();
  const { onPropertyHover } = usePrefetchOnHover();
  const navigate = useNavigate();

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {properties?.map((property) => (
        <div
          key={property.id}
          className="p-4 border rounded cursor-pointer hover:shadow-lg"
          // Prefetch ao fazer hover
          onMouseEnter={() => onPropertyHover(property.id, 200)}
          onClick={() => navigate(`/properties/${property.id}`)}
        >
          <h3>{property.title}</h3>
          <p>{property.price}</p>
        </div>
      ))}
    </div>
  );
}

// ==================== Exemplo 2: Search com Debounce ====================
import { useDebounce } from '@/hooks/useDebounce';
import { useLeads } from '@/hooks/useLeads';

export function LeadSearch() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Query só dispara após 300ms sem digitar
  const { data: leads, isFetching } = useLeads(
    { search: debouncedSearch },
    { enabled: debouncedSearch.length >= 3 }
  );

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar leads..."
        className="w-full p-2 border rounded"
      />
      {isFetching && <span>Buscando...</span>}
      <div className="mt-4">
        {leads?.map((lead) => (
          <div key={lead.id} className="p-2 border-b">
            {lead.name} - {lead.email}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== Exemplo 3: Optimistic Update (Kanban) ====================
import { useUpdateLeadStatus } from '@/hooks/useLeads';

function LeadKanbanBoardExample() {
  const { data: leads = [] } = useLeads();
  const updateStatus = useUpdateLeadStatus();

  const handleStatusChange = (leadId: string, newStatus: string) => {
    // Atualização otimista - UI atualiza imediatamente
    updateStatus.mutate(
      { id: leadId, status: newStatus },
      {
        onError: () => {
          // Rollback automático já está configurado no hook
          console.error('Falha ao atualizar status');
        },
      }
    );
  };

  const columns = ['new', 'qualification', 'visit', 'proposal', 'contract'];

  return (
    <div className="flex gap-4">
      {columns.map((status) => (
        <div key={status} className="flex-1 bg-gray-100 p-4 rounded">
          <h3 className="font-bold mb-4">{status}</h3>
          {leads
            .filter((lead) => lead.status === status)
            .map((lead) => (
              <div
                key={lead.id}
                className="bg-white p-3 mb-2 rounded shadow cursor-move"
                onClick={() => {
                  // Exemplo simplificado - em produção use drag & drop
                  const nextStatus = columns[columns.indexOf(status) + 1];
                  if (nextStatus) handleStatusChange(lead.id, nextStatus);
                }}
              >
                {lead.name}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

export { LeadKanbanBoardExample as LeadKanbanBoard };

// ==================== Exemplo 4: Dashboard com Realtime ====================
import {
  useDashboardMetrics,
  useRecentActivities,
  useTodayAgenda,
} from '@/hooks/useRealtimeData';

export function RealtimeDashboard() {
  // Atualiza automaticamente a cada 30 segundos
  const { data: metrics } = useDashboardMetrics();

  // Atualiza a cada 30 segundos
  const { data: activities } = useRecentActivities(5);

  // Atualiza a cada 1 minuto
  const { data: agenda } = useTodayAgenda();

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard title="Novos Leads" value={metrics?.newLeads || 0} />
        <MetricCard title="Visitas Hoje" value={metrics?.todayVisits || 0} />
        <MetricCard
          title="Contratos"
          value={metrics?.signedContracts || 0}
        />
        <MetricCard
          title="Imóveis"
          value={metrics?.availableProperties || 0}
        />
      </div>

      {/* Atividades Recentes */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold mb-4">Atividades Recentes</h3>
        {activities?.map((activity) => (
          <div key={activity.id} className="p-2 border-b">
            <p className="text-sm">{activity.description}</p>
            <span className="text-xs text-gray-500">
              {new Date(activity.createdAt).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Agenda de Hoje */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-bold mb-4">Agenda de Hoje</h3>
        {agenda?.visits.map((visit) => (
          <div key={visit.id} className="p-2 border-b">
            <p>{visit.leadName}</p>
            <p className="text-sm text-gray-600">{visit.propertyAddress}</p>
            <span className="text-xs">
              {new Date(visit.scheduledFor).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white p-4 rounded shadow">
      <p className="text-sm text-gray-600">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ==================== Exemplo 5: Dados Estáticos ====================
import { usePropertyTypes, useLeadSources } from '@/hooks/useStaticData';

export function PropertyForm() {
  // Esses dados ficam em cache por 30 minutos
  const { data: propertyTypes } = usePropertyTypes();
  const { data: leadSources } = useLeadSources();

  const [formData, setFormData] = useState({
    type: '',
    source: '',
  });

  return (
    <form className="space-y-4">
      <div>
        <label>Tipo de Imóvel</label>
        <select
          value={formData.type}
          onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          className="w-full p-2 border rounded"
        >
          <option value="">Selecione...</option>
          {propertyTypes?.map((type) => (
            <option key={type.id} value={type.name}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Fonte do Lead</label>
        <select
          value={formData.source}
          onChange={(e) =>
            setFormData({ ...formData, source: e.target.value })
          }
          className="w-full p-2 border rounded"
        >
          <option value="">Selecione...</option>
          {leadSources?.map((source) => (
            <option key={source.id} value={source.name}>
              {source.label}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
}

// ==================== Exemplo 6: Prefetch Relacionado ====================
import { useProperty } from '@/hooks/useProperties';
import { usePrefetchRelated } from '@/hooks/usePrefetch';

export function PropertyDetails({ propertyId }: { propertyId: string }) {
  const { data: property, isLoading } = useProperty(propertyId);
  const { prefetchPropertyRelated } = usePrefetchRelated();

  useEffect(() => {
    // Prefetch de contratos e visitas relacionadas
    prefetchPropertyRelated(propertyId);
  }, [propertyId, prefetchPropertyRelated]);

  if (isLoading) return <div>Carregando...</div>;
  if (!property) return <div>Propriedade não encontrada</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{property.title}</h1>
      <p>{property.description}</p>
      <p className="text-xl font-bold">{property.price}</p>

      {/* Esses dados já foram pré-carregados */}
      <RelatedContracts propertyId={propertyId} />
      <RelatedVisits propertyId={propertyId} />
    </div>
  );
}

function RelatedContracts({ propertyId }: { propertyId: string }) {
  const { data: contracts } = useContracts({ propertyId });
  // Dados já estão em cache!
  return (
    <div>
      <h3>Contratos</h3>
      {contracts?.map((contract) => (
        <div key={contract.id}>{contract.type}</div>
      ))}
    </div>
  );
}

function RelatedVisits({ propertyId }: { propertyId: string }) {
  // Similar ao RelatedContracts
  return <div>Visitas relacionadas...</div>;
}

// ==================== Exemplo 7: Invalidação Manual ====================
import { useDeleteProperty } from '@/hooks/useProperties';
import { cacheManager } from '@/lib/cache-manager';

export function PropertyActions({ propertyId }: { propertyId: string }) {
  const deleteProperty = useDeleteProperty();

  const handleDelete = async () => {
    if (!confirm('Tem certeza?')) return;

    // Mutation já invalida o cache automaticamente
    await deleteProperty.mutateAsync(propertyId);

    // Mas você pode invalidar manualmente se necessário
    await cacheManager.invalidation.invalidateProperty(propertyId);
  };

  return (
    <button
      onClick={handleDelete}
      className="px-4 py-2 bg-red-500 text-white rounded"
    >
      Deletar
    </button>
  );
}

// ==================== Exemplo 8: Cache Utils ====================
import { cacheUtils } from '@/lib/cache-manager';
import { propertiesKeys } from '@/hooks/useProperties';

export function CacheDebugger() {
  const [stats, setStats] = useState<any>(null);

  const updateStats = () => {
    setStats(cacheUtils.getCacheStats());
  };

  const checkPropertyCache = (propertyId: string) => {
    const isCached = cacheUtils.isCached(propertiesKeys.detail(propertyId));
    const isStale = cacheUtils.isStale(propertiesKeys.detail(propertyId));

    console.log('Propriedade em cache:', isCached);
    console.log('Propriedade stale:', isStale);

    if (isCached) {
      const data = cacheUtils.getCachedData(propertiesKeys.detail(propertyId));
      console.log('Dados:', data);
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded">
      <h3 className="font-bold mb-4">Cache Debugger</h3>

      <button
        onClick={updateStats}
        className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
      >
        Atualizar Stats
      </button>

      <button
        onClick={() => cacheUtils.debugCache()}
        className="px-4 py-2 bg-green-500 text-white rounded"
      >
        Debug Console
      </button>

      {stats && (
        <div className="mt-4 space-y-2">
          <p>Total Queries: {stats.totalQueries}</p>
          <p>Queries Stale: {stats.staleQueries}</p>
          <p>Queries em Fetch: {stats.fetchingQueries}</p>
          <p>Queries com Erro: {stats.errorQueries}</p>
          <p>Cache Size: {(stats.cacheSize / 1024).toFixed(2)} KB</p>
        </div>
      )}
    </div>
  );
}

// ==================== Exemplo 9: Smart Prefetch ====================
import { useSmartPrefetch } from '@/hooks/usePrefetch';

export function SmartPropertyList() {
  const { data: properties } = useProperties();
  const { prefetchListPage, prefetchDetailPage } = useSmartPrefetch();

  useEffect(() => {
    if (properties) {
      // Prefetch dos primeiros 5 itens automaticamente
      const ids = properties.map((p) => p.id);
      prefetchListPage('properties', ids, 5);
    }
  }, [properties, prefetchListPage]);

  const handleClick = (propertyId: string) => {
    // Prefetch de dados relacionados antes de navegar
    prefetchDetailPage('property', propertyId);
    // navigate(`/properties/${propertyId}`); // Descomente em produção
    console.log('Navigate to:', propertyId);
  };

  return (
    <div>
      {properties?.map((property) => (
        <div key={property.id} onClick={() => handleClick(property.id)}>
          {property.title}
        </div>
      ))}
    </div>
  );
}

// ==================== Imports necessários ====================
import { useContracts } from '@/hooks/useContracts';

// Exports já feitos inline acima, não precisa re-exportar
export type { }; // Empty export to make TypeScript happy
