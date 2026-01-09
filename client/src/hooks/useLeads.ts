import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast-enhanced";
import type { Lead, LeadStatus } from "@/lib/imobi-context";

// ==================== TYPES ====================

export type LeadFilters = {
  status?: LeadStatus;
  source?: string;
  assignedTo?: string;
  search?: string;
};

export type CreateLeadData = {
  name: string;
  email: string;
  phone: string;
  source: string;
  status?: LeadStatus;
  budget?: string;
  interests?: string[];
  notes?: string;
  assignedTo?: string;
  preferredType?: string;
  preferredCategory?: string;
  preferredCity?: string;
  preferredNeighborhood?: string;
  minBedrooms?: number;
  maxBedrooms?: number;
};

export type UpdateLeadData = Partial<CreateLeadData> & { id: string };

export type UpdateLeadStatusData = {
  id: string;
  status: LeadStatus;
};

// ==================== API FUNCTIONS ====================

async function fetchLeads(filters?: LeadFilters): Promise<Lead[]> {
  const queryParams = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });
  }

  const url = `/api/leads${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch leads");
  }

  return response.json();
}

async function fetchLeadById(id: string): Promise<Lead> {
  const response = await fetch(`/api/leads/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Lead not found");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch lead");
  }

  return response.json();
}

async function createLead(data: CreateLeadData): Promise<Lead> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create lead");
  }

  return response.json();
}

async function updateLead({ id, ...data }: UpdateLeadData): Promise<Lead> {
  const response = await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update lead");
  }

  return response.json();
}

async function updateLeadStatus({ id, status }: UpdateLeadStatusData): Promise<Lead> {
  const response = await fetch(`/api/leads/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update lead status");
  }

  return response.json();
}

async function deleteLead(id: string): Promise<void> {
  const response = await fetch(`/api/leads/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete lead");
  }
}

// ==================== QUERY KEYS ====================

export const leadsKeys = {
  all: ["leads"] as const,
  lists: () => [...leadsKeys.all, "list"] as const,
  list: (filters?: LeadFilters) => [...leadsKeys.lists(), filters] as const,
  details: () => [...leadsKeys.all, "detail"] as const,
  detail: (id: string) => [...leadsKeys.details(), id] as const,
};

// ==================== HOOKS ====================

/**
 * Hook para buscar lista de leads
 * @param filters - Filtros opcionais para a busca
 * @param options - Opções adicionais do React Query
 */
export function useLeads(filters?: LeadFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadsKeys.list(filters),
    queryFn: () => fetchLeads(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes (leads mudam mais frequentemente)
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar um lead específico por ID
 * @param id - ID do lead
 * @param options - Opções adicionais do React Query
 */
export function useLead(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadsKeys.detail(id || ""),
    queryFn: () => fetchLeadById(id!),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    enabled: !!id && options?.enabled !== false,
    retry: (failureCount, error) => {
      if (error.message === "Lead not found") return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook para criar novo lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: createLead,
    onSuccess: (newLead) => {
      // Invalida todas as listas de leads
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });

      // Adiciona o novo lead ao cache de detalhes
      queryClient.setQueryData(leadsKeys.detail(newLead.id), newLead);

      success("Lead criado", "O lead foi criado com sucesso.");
    },
    onError: (error: Error) => {
      showError("Erro ao criar lead", error.message);
    },
  });
}

/**
 * Hook para atualizar lead existente
 */
export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: updateLead,
    onMutate: async (updatedLead) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: leadsKeys.detail(updatedLead.id) });

      // Snapshot do valor anterior
      const previousLead = queryClient.getQueryData<Lead>(leadsKeys.detail(updatedLead.id));

      // Atualização otimista
      if (previousLead) {
        queryClient.setQueryData(leadsKeys.detail(updatedLead.id), {
          ...previousLead,
          ...updatedLead,
          updatedAt: new Date(),
        });
      }

      return { previousLead };
    },
    onSuccess: (updatedLead) => {
      // Invalida listas para refletir mudanças
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });

      // Atualiza cache de detalhes com dados do servidor
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);

      success("Lead atualizado", "As alterações foram salvas com sucesso.");
    },
    onError: (error: Error, updatedLead, context) => {
      // Rollback em caso de erro
      if (context?.previousLead) {
        queryClient.setQueryData(leadsKeys.detail(updatedLead.id), context.previousLead);
      }

      showError("Erro ao atualizar lead", error.message);
    },
  });
}

/**
 * Hook para atualizar status do lead (kanban)
 */
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  const { error: showError } = useToast();

  return useMutation({
    mutationFn: updateLeadStatus,
    onMutate: async ({ id, status }) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: leadsKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: leadsKeys.lists() });

      // Snapshot do valor anterior
      const previousLead = queryClient.getQueryData<Lead>(leadsKeys.detail(id));

      // Atualização otimista
      if (previousLead) {
        queryClient.setQueryData(leadsKeys.detail(id), {
          ...previousLead,
          status,
          updatedAt: new Date(),
        });
      }

      // Atualiza também nas listas (se existir)
      const listsCache = queryClient.getQueriesData<Lead[]>({ queryKey: leadsKeys.lists() });
      listsCache.forEach(([queryKey, leads]) => {
        if (leads) {
          const updatedLeads = leads.map((lead) =>
            lead.id === id ? { ...lead, status, updatedAt: new Date() } : lead
          );
          queryClient.setQueryData(queryKey, updatedLeads);
        }
      });

      return { previousLead };
    },
    onSuccess: (updatedLead) => {
      // Invalida listas para garantir consistência
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });

      // Atualiza cache de detalhes
      queryClient.setQueryData(leadsKeys.detail(updatedLead.id), updatedLead);
    },
    onError: (error: Error, { id }, context) => {
      // Rollback em caso de erro
      if (context?.previousLead) {
        queryClient.setQueryData(leadsKeys.detail(id), context.previousLead);
      }

      // Invalida para refetch
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });

      showError("Erro ao atualizar status", error.message);
    },
  });
}

/**
 * Hook para deletar lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: deleteLead,
    onSuccess: (_, deletedId) => {
      // Remove do cache de detalhes
      queryClient.removeQueries({ queryKey: leadsKeys.detail(deletedId) });

      // Invalida listas
      queryClient.invalidateQueries({ queryKey: leadsKeys.lists() });

      success("Lead removido", "O lead foi removido com sucesso.");
    },
    onError: (error: Error) => {
      showError("Erro ao remover lead", error.message);
    },
  });
}
