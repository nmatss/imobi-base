import { queryClient } from "./queryClient";
import { propertiesKeys } from "@/hooks/useProperties";
import { leadsKeys } from "@/hooks/useLeads";
import { contractsKeys } from "@/hooks/useContracts";
import { followUpsKeys } from "@/hooks/useFollowUps";

/**
 * Gerenciador avançado de cache para React Query
 * Fornece utilitários para invalidação, sincronização e otimização de cache
 */

// ==================== CACHE INVALIDATION ====================

/**
 * Estratégias de invalidação de cache
 */
export const cacheInvalidation = {
  /**
   * Invalida cache de uma propriedade e todas as queries relacionadas
   */
  invalidateProperty: async (propertyId: string) => {
    await Promise.all([
      // Invalida o detalhe da propriedade
      queryClient.invalidateQueries({ queryKey: propertiesKeys.detail(propertyId) }),
      // Invalida todas as listas de propriedades
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() }),
      // Invalida contratos relacionados
      queryClient.invalidateQueries({ queryKey: contractsKeys.list({ propertyId }) }),
    ]);
  },

  /**
   * Invalida cache de um lead e todas as queries relacionadas
   */
  invalidateLead: async (leadId: string) => {
    await Promise.all([
      // Invalida o detalhe do lead
      queryClient.invalidateQueries({ queryKey: leadsKeys.detail(leadId) }),
      // Invalida todas as listas de leads
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() }),
      // Invalida follow-ups do lead
      queryClient.invalidateQueries({ queryKey: followUpsKeys.byLead(leadId) }),
      // Invalida contratos do lead
      queryClient.invalidateQueries({ queryKey: contractsKeys.list({ leadId }) }),
    ]);
  },

  /**
   * Invalida cache de um contrato
   */
  invalidateContract: async (contractId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: contractsKeys.detail(contractId) }),
      queryClient.invalidateQueries({ queryKey: contractsKeys.lists() }),
    ]);
  },

  /**
   * Invalida cache de um follow-up
   */
  invalidateFollowUp: async (followUpId: string, leadId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: followUpsKeys.detail(followUpId) }),
      queryClient.invalidateQueries({ queryKey: followUpsKeys.lists() }),
      leadId
        ? queryClient.invalidateQueries({ queryKey: followUpsKeys.byLead(leadId) })
        : Promise.resolve(),
    ]);
  },

  /**
   * Invalida todos os dados relacionados a uma entidade
   */
  invalidateAll: async (entity: "properties" | "leads" | "contracts" | "follow-ups") => {
    const keyMap = {
      properties: propertiesKeys.all,
      leads: leadsKeys.all,
      contracts: contractsKeys.all,
      "follow-ups": followUpsKeys.all,
    };

    await queryClient.invalidateQueries({ queryKey: keyMap[entity] });
  },
};

// ==================== CACHE SYNCHRONIZATION ====================

/**
 * Sincronização de cache após mutations
 */
export const cacheSynchronization = {
  /**
   * Sincroniza cache após criar uma propriedade
   */
  afterCreateProperty: async (newProperty: any) => {
    // Adiciona aos detalhes
    queryClient.setQueryData(propertiesKeys.detail(newProperty.id), newProperty);

    // Invalida listas para incluir o novo item
    await queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });
  },

  /**
   * Sincroniza cache após atualizar uma propriedade
   */
  afterUpdateProperty: async (updatedProperty: any) => {
    // Atualiza o detalhe
    queryClient.setQueryData(propertiesKeys.detail(updatedProperty.id), updatedProperty);

    // Atualiza nas listas
    const listQueries = queryClient.getQueriesData({ queryKey: propertiesKeys.lists() });
    listQueries.forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const updatedList = data.map((item: any) =>
          item.id === updatedProperty.id ? updatedProperty : item
        );
        queryClient.setQueryData(queryKey, updatedList);
      }
    });
  },

  /**
   * Sincroniza cache após deletar uma propriedade
   */
  afterDeleteProperty: async (propertyId: string) => {
    // Remove dos detalhes
    queryClient.removeQueries({ queryKey: propertiesKeys.detail(propertyId) });

    // Remove das listas
    const listQueries = queryClient.getQueriesData({ queryKey: propertiesKeys.lists() });
    listQueries.forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const filteredList = data.filter((item: any) => item.id !== propertyId);
        queryClient.setQueryData(queryKey, filteredList);
      }
    });
  },

  /**
   * Sincroniza cache após criar um lead
   */
  afterCreateLead: async (newLead: any) => {
    queryClient.setQueryData(leadsKeys.detail(newLead.id), newLead);
    await queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });
  },

  /**
   * Sincroniza cache após atualizar um lead
   */
  afterUpdateLead: async (updatedLead: any) => {
    queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);

    const listQueries = queryClient.getQueriesData({ queryKey: leadsKeys.lists() });
    listQueries.forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const updatedList = data.map((item: any) =>
          item.id === updatedLead.id ? updatedLead : item
        );
        queryClient.setQueryData(queryKey, updatedList);
      }
    });
  },

  /**
   * Sincroniza cache após deletar um lead
   */
  afterDeleteLead: async (leadId: string) => {
    queryClient.removeQueries({ queryKey: leadsKeys.detail(leadId) });

    const listQueries = queryClient.getQueriesData({ queryKey: leadsKeys.lists() });
    listQueries.forEach(([queryKey, data]) => {
      if (Array.isArray(data)) {
        const filteredList = data.filter((item: any) => item.id !== leadId);
        queryClient.setQueryData(queryKey, filteredList);
      }
    });
  },
};

// ==================== OPTIMISTIC UPDATES ====================

/**
 * Helpers para optimistic updates
 */
export const optimisticUpdates = {
  /**
   * Prepara optimistic update para uma propriedade
   */
  preparePropertyUpdate: (propertyId: string) => {
    // Cancela queries em andamento
    queryClient.cancelQueries({ queryKey: propertiesKeys.detail(propertyId) });

    // Captura snapshot
    const previous = queryClient.getQueryData(propertiesKeys.detail(propertyId));

    return {
      previous,
      rollback: () => {
        if (previous) {
          queryClient.setQueryData(propertiesKeys.detail(propertyId), previous);
        }
      },
    };
  },

  /**
   * Prepara optimistic update para um lead
   */
  prepareLeadUpdate: (leadId: string) => {
    queryClient.cancelQueries({ queryKey: leadsKeys.detail(leadId) });
    const previous = queryClient.getQueryData(leadsKeys.detail(leadId));

    return {
      previous,
      rollback: () => {
        if (previous) {
          queryClient.setQueryData(leadsKeys.detail(leadId), previous);
        }
      },
    };
  },

  /**
   * Aplica optimistic update em uma lista
   */
  updateInList: <T extends { id: string }>(
    queryKey: readonly unknown[],
    itemId: string,
    updater: (item: T) => T
  ) => {
    const previous = queryClient.getQueryData<T[]>(queryKey);

    if (previous) {
      const updated = previous.map((item) => (item.id === itemId ? updater(item) : item));
      queryClient.setQueryData(queryKey, updated);
    }

    return {
      previous,
      rollback: () => {
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
        }
      },
    };
  },

  /**
   * Adiciona item em uma lista (optimistic)
   */
  addToList: <T extends { id: string }>(queryKey: readonly unknown[], newItem: T) => {
    const previous = queryClient.getQueryData<T[]>(queryKey);

    if (previous) {
      queryClient.setQueryData(queryKey, [...previous, newItem]);
    }

    return {
      previous,
      rollback: () => {
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
        }
      },
    };
  },

  /**
   * Remove item de uma lista (optimistic)
   */
  removeFromList: <T extends { id: string }>(queryKey: readonly unknown[], itemId: string) => {
    const previous = queryClient.getQueryData<T[]>(queryKey);

    if (previous) {
      const filtered = previous.filter((item) => item.id !== itemId);
      queryClient.setQueryData(queryKey, filtered);
    }

    return {
      previous,
      rollback: () => {
        if (previous) {
          queryClient.setQueryData(queryKey, previous);
        }
      },
    };
  },
};

// ==================== CACHE UTILITIES ====================

/**
 * Utilitários gerais de cache
 */
export const cacheUtils = {
  /**
   * Obtém dados do cache sem fazer request
   */
  getCachedData: <T>(queryKey: readonly unknown[]): T | undefined => {
    return queryClient.getQueryData<T>(queryKey);
  },

  /**
   * Verifica se dados estão no cache e são válidos
   */
  isCached: (queryKey: readonly unknown[]): boolean => {
    const query = queryClient.getQueryState(queryKey);
    return query !== undefined && query.data !== undefined && !query.isInvalidated;
  },

  /**
   * Verifica se dados estão stale
   */
  isStale: (queryKey: readonly unknown[]): boolean => {
    const query = queryClient.getQueryState(queryKey);
    return query?.isStale ?? true;
  },

  /**
   * Obtém timestamp da última atualização
   */
  getLastUpdated: (queryKey: readonly unknown[]): number | undefined => {
    const query = queryClient.getQueryState(queryKey);
    return query?.dataUpdatedAt;
  },

  /**
   * Força refetch de uma query
   */
  refetch: (queryKey: readonly unknown[]) => {
    return queryClient.refetchQueries({ queryKey });
  },

  /**
   * Limpa cache de queries antigas (garbage collection manual)
   */
  cleanupOldCache: (maxAge: number = 30 * 60 * 1000) => {
    const now = Date.now();
    const queries = queryClient.getQueryCache().getAll();

    queries.forEach((query) => {
      const lastUpdated = query.state.dataUpdatedAt;
      if (lastUpdated && now - lastUpdated > maxAge) {
        queryClient.removeQueries({ queryKey: query.queryKey });
      }
    });
  },

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats: () => {
    const queries = queryClient.getQueryCache().getAll();
    const mutations = queryClient.getMutationCache().getAll();

    return {
      totalQueries: queries.length,
      totalMutations: mutations.length,
      staleQueries: queries.filter((q) => q.state.isStale).length,
      fetchingQueries: queries.filter((q) => q.state.fetchStatus === "fetching").length,
      errorQueries: queries.filter((q) => q.state.status === "error").length,
      successQueries: queries.filter((q) => q.state.status === "success").length,
      cacheSize: queries.reduce((acc, q) => {
        const size = JSON.stringify(q.state.data || {}).length;
        return acc + size;
      }, 0),
    };
  },

  /**
   * Debug: loga estado do cache no console
   */
  debugCache: () => {
    const stats = cacheUtils.getCacheStats();
    console.group("Cache Stats");
    console.table(stats);
    console.groupEnd();

    console.group("All Queries");
    queryClient
      .getQueryCache()
      .getAll()
      .forEach((query) => {
        console.log({
          key: query.queryKey,
          status: query.state.status,
          fetchStatus: query.state.fetchStatus,
          dataUpdatedAt: new Date(query.state.dataUpdatedAt),
          isStale: query.state.isStale,
        });
      });
    console.groupEnd();
  },
};

// ==================== EXPORTS ====================

export const cacheManager = {
  invalidation: cacheInvalidation,
  synchronization: cacheSynchronization,
  optimistic: optimisticUpdates,
  utils: cacheUtils,
};
