import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { propertiesKeys } from "./useProperties";
import { leadsKeys } from "./useLeads";
import { contractsKeys } from "./useContracts";
import { followUpsKeys } from "./useFollowUps";

/**
 * Hooks para prefetching de dados
 * Melhora a performance ao carregar dados antes de serem necessários
 */

// ==================== API FUNCTIONS ====================

async function fetchPropertyById(id: string) {
  const response = await fetch(`/api/properties/${id}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch property");
  return response.json();
}

async function fetchLeadById(id: string) {
  const response = await fetch(`/api/leads/${id}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch lead");
  return response.json();
}

async function fetchContractById(id: string) {
  const response = await fetch(`/api/contracts/${id}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch contract");
  return response.json();
}

async function fetchFollowUpById(id: string) {
  const response = await fetch(`/api/follow-ups/${id}`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch follow-up");
  return response.json();
}

// ==================== HOOKS ====================

/**
 * Hook principal de prefetching
 * Fornece funções para fazer prefetch de diferentes entidades
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  /**
   * Prefetch de uma propriedade
   * Útil ao fazer hover em cards de propriedade ou antes de navegar
   */
  const prefetchProperty = useCallback(
    async (propertyId: string) => {
      await queryClient.prefetchQuery({
        queryKey: propertiesKeys.detail(propertyId),
        queryFn: () => fetchPropertyById(propertyId),
        staleTime: 5 * 60 * 1000, // 5 minutos
      });
    },
    [queryClient]
  );

  /**
   * Prefetch de um lead
   * Útil ao fazer hover em cards de lead ou antes de abrir detalhes
   */
  const prefetchLead = useCallback(
    async (leadId: string) => {
      await queryClient.prefetchQuery({
        queryKey: leadsKeys.detail(leadId),
        queryFn: () => fetchLeadById(leadId),
        staleTime: 2 * 60 * 1000, // 2 minutos
      });
    },
    [queryClient]
  );

  /**
   * Prefetch de um contrato
   */
  const prefetchContract = useCallback(
    async (contractId: string) => {
      await queryClient.prefetchQuery({
        queryKey: contractsKeys.detail(contractId),
        queryFn: () => fetchContractById(contractId),
        staleTime: 5 * 60 * 1000, // 5 minutos
      });
    },
    [queryClient]
  );

  /**
   * Prefetch de um follow-up
   */
  const prefetchFollowUp = useCallback(
    async (followUpId: string) => {
      await queryClient.prefetchQuery({
        queryKey: followUpsKeys.detail(followUpId),
        queryFn: () => fetchFollowUpById(followUpId),
        staleTime: 2 * 60 * 1000, // 2 minutos
      });
    },
    [queryClient]
  );

  /**
   * Prefetch de múltiplas propriedades
   * Útil ao carregar uma lista e querer preparar os detalhes
   */
  const prefetchProperties = useCallback(
    async (propertyIds: string[]) => {
      await Promise.all(propertyIds.map((id) => prefetchProperty(id)));
    },
    [prefetchProperty]
  );

  /**
   * Prefetch de múltiplos leads
   */
  const prefetchLeads = useCallback(
    async (leadIds: string[]) => {
      await Promise.all(leadIds.map((id) => prefetchLead(id)));
    },
    [prefetchLead]
  );

  return {
    prefetchProperty,
    prefetchLead,
    prefetchContract,
    prefetchFollowUp,
    prefetchProperties,
    prefetchLeads,
  };
}

/**
 * Hook para prefetching ao fazer hover
 * Usa debounce para evitar requests desnecessários
 */
export function usePrefetchOnHover() {
  const { prefetchProperty, prefetchLead, prefetchContract } = usePrefetch();
  const timeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Handler para prefetch ao fazer hover em uma propriedade
   */
  const onPropertyHover = useCallback(
    (propertyId: string, delay: number = 300) => {
      // Limpa timeout anterior se existir
      if (timeouts.has(propertyId)) {
        clearTimeout(timeouts.get(propertyId));
      }

      // Cria novo timeout
      const timeout = setTimeout(() => {
        prefetchProperty(propertyId);
        timeouts.delete(propertyId);
      }, delay);

      timeouts.set(propertyId, timeout);

      // Retorna função de cleanup
      return () => {
        if (timeouts.has(propertyId)) {
          clearTimeout(timeouts.get(propertyId));
          timeouts.delete(propertyId);
        }
      };
    },
    [prefetchProperty, timeouts]
  );

  /**
   * Handler para prefetch ao fazer hover em um lead
   */
  const onLeadHover = useCallback(
    (leadId: string, delay: number = 300) => {
      if (timeouts.has(leadId)) {
        clearTimeout(timeouts.get(leadId));
      }

      const timeout = setTimeout(() => {
        prefetchLead(leadId);
        timeouts.delete(leadId);
      }, delay);

      timeouts.set(leadId, timeout);

      return () => {
        if (timeouts.has(leadId)) {
          clearTimeout(timeouts.get(leadId));
          timeouts.delete(leadId);
        }
      };
    },
    [prefetchLead, timeouts]
  );

  /**
   * Handler para prefetch ao fazer hover em um contrato
   */
  const onContractHover = useCallback(
    (contractId: string, delay: number = 300) => {
      if (timeouts.has(contractId)) {
        clearTimeout(timeouts.get(contractId));
      }

      const timeout = setTimeout(() => {
        prefetchContract(contractId);
        timeouts.delete(contractId);
      }, delay);

      timeouts.set(contractId, timeout);

      return () => {
        if (timeouts.has(contractId)) {
          clearTimeout(timeouts.get(contractId));
          timeouts.delete(contractId);
        }
      };
    },
    [prefetchContract, timeouts]
  );

  return {
    onPropertyHover,
    onLeadHover,
    onContractHover,
  };
}

/**
 * Hook para prefetching de dados relacionados
 * Quando você busca uma entidade, pode querer buscar entidades relacionadas
 */
export function usePrefetchRelated() {
  const queryClient = useQueryClient();

  /**
   * Ao visualizar uma propriedade, prefetch de contratos e visitas relacionadas
   */
  const prefetchPropertyRelated = useCallback(
    async (propertyId: string) => {
      // Prefetch contratos da propriedade
      await queryClient.prefetchQuery({
        queryKey: contractsKeys.list({ propertyId }),
        queryFn: async () => {
          const response = await fetch(`/api/contracts?propertyId=${propertyId}`, {
            credentials: "include",
          });
          if (!response.ok) throw new Error("Failed to fetch contracts");
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  /**
   * Ao visualizar um lead, prefetch de follow-ups e visitas relacionadas
   */
  const prefetchLeadRelated = useCallback(
    async (leadId: string) => {
      // Prefetch follow-ups do lead
      await queryClient.prefetchQuery({
        queryKey: followUpsKeys.byLead(leadId),
        queryFn: async () => {
          const response = await fetch(`/api/follow-ups?leadId=${leadId}`, {
            credentials: "include",
          });
          if (!response.ok) throw new Error("Failed to fetch follow-ups");
          return response.json();
        },
        staleTime: 2 * 60 * 1000,
      });
    },
    [queryClient]
  );

  return {
    prefetchPropertyRelated,
    prefetchLeadRelated,
  };
}

/**
 * Hook para prefetching inteligente baseado em navegação
 * Detecta padrões de navegação e faz prefetch proativo
 */
export function useSmartPrefetch() {
  const { prefetchProperty, prefetchLead } = usePrefetch();
  const { prefetchPropertyRelated, prefetchLeadRelated } = usePrefetchRelated();

  /**
   * Prefetch inteligente ao entrar em uma página de lista
   * Faz prefetch dos primeiros N itens
   */
  const prefetchListPage = useCallback(
    async (type: "properties" | "leads", ids: string[], limit: number = 5) => {
      const itemsToPreload = ids.slice(0, limit);

      if (type === "properties") {
        await Promise.all(itemsToPreload.map((id) => prefetchProperty(id)));
      } else if (type === "leads") {
        await Promise.all(itemsToPreload.map((id) => prefetchLead(id)));
      }
    },
    [prefetchProperty, prefetchLead]
  );

  /**
   * Prefetch ao entrar em uma página de detalhes
   * Faz prefetch de dados relacionados
   */
  const prefetchDetailPage = useCallback(
    async (type: "property" | "lead", id: string) => {
      if (type === "property") {
        await prefetchPropertyRelated(id);
      } else if (type === "lead") {
        await prefetchLeadRelated(id);
      }
    },
    [prefetchPropertyRelated, prefetchLeadRelated]
  );

  return {
    prefetchListPage,
    prefetchDetailPage,
  };
}
