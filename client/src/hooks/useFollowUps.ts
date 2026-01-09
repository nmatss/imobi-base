import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast-enhanced";
import { cacheStrategies } from "@/lib/queryClient";

// ==================== TYPES ====================

export type FollowUp = {
  id: string;
  leadId: string;
  tenantId: string;
  assignedTo: string | null;
  dueAt: string;
  type: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type FollowUpFilters = {
  status?: string;
  leadId?: string;
  assignedTo?: string;
  overdue?: boolean;
};

export type CreateFollowUpData = {
  leadId: string;
  type: string;
  dueAt: string;
  notes?: string;
  assignedTo?: string;
};

export type UpdateFollowUpData = Partial<CreateFollowUpData> & { id: string };

export type CompleteFollowUpData = {
  id: string;
  notes?: string;
};

// ==================== API FUNCTIONS ====================

async function fetchFollowUps(filters?: FollowUpFilters): Promise<FollowUp[]> {
  const queryParams = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });
  }

  const url = `/api/follow-ups${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch follow-ups");
  }

  return response.json();
}

async function fetchFollowUpById(id: string): Promise<FollowUp> {
  const response = await fetch(`/api/follow-ups/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Follow-up not found");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch follow-up");
  }

  return response.json();
}

async function createFollowUp(data: CreateFollowUpData): Promise<FollowUp> {
  const response = await fetch("/api/follow-ups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create follow-up");
  }

  return response.json();
}

async function updateFollowUp({ id, ...data }: UpdateFollowUpData): Promise<FollowUp> {
  const response = await fetch(`/api/follow-ups/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update follow-up");
  }

  return response.json();
}

async function completeFollowUp({ id, notes }: CompleteFollowUpData): Promise<FollowUp> {
  const response = await fetch(`/api/follow-ups/${id}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to complete follow-up");
  }

  return response.json();
}

async function deleteFollowUp(id: string): Promise<void> {
  const response = await fetch(`/api/follow-ups/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete follow-up");
  }
}

// ==================== QUERY KEYS ====================

export const followUpsKeys = {
  all: ["follow-ups"] as const,
  lists: () => [...followUpsKeys.all, "list"] as const,
  list: (filters?: FollowUpFilters) => [...followUpsKeys.lists(), filters] as const,
  details: () => [...followUpsKeys.all, "detail"] as const,
  detail: (id: string) => [...followUpsKeys.details(), id] as const,
  byLead: (leadId: string) => [...followUpsKeys.all, "lead", leadId] as const,
};

// ==================== HOOKS ====================

/**
 * Hook para buscar lista de follow-ups
 * Usa estratégia dinâmica (network-first) pois follow-ups mudam frequentemente
 */
export function useFollowUps(filters?: FollowUpFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: followUpsKeys.list(filters),
    queryFn: () => fetchFollowUps(filters),
    ...cacheStrategies.dynamic, // network-first com 1 minuto de staleTime
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar follow-ups de um lead específico
 */
export function useLeadFollowUps(leadId: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: followUpsKeys.byLead(leadId || ""),
    queryFn: () => fetchFollowUps({ leadId: leadId! }),
    ...cacheStrategies.dynamic,
    enabled: !!leadId && options?.enabled !== false,
  });
}

/**
 * Hook para buscar um follow-up específico por ID
 */
export function useFollowUp(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: followUpsKeys.detail(id || ""),
    queryFn: () => fetchFollowUpById(id!),
    ...cacheStrategies.detail,
    enabled: !!id && options?.enabled !== false,
    retry: (failureCount, error) => {
      if (error.message === "Follow-up not found") return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook para criar novo follow-up
 */
export function useCreateFollowUp() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: createFollowUp,
    onSuccess: (newFollowUp) => {
      // Invalida todas as listas de follow-ups
      queryClient.invalidateQueries({ queryKey: followUpsKeys.lists() });

      // Invalida follow-ups do lead
      queryClient.invalidateQueries({ queryKey: followUpsKeys.byLead(newFollowUp.leadId) });

      // Adiciona o novo follow-up ao cache de detalhes
      queryClient.setQueryData(followUpsKeys.detail(newFollowUp.id), newFollowUp);

      success("Follow-up criado", "O lembrete foi criado com sucesso.");
    },
    onError: (error: Error) => {
      showError("Erro ao criar follow-up", error.message);
    },
  });
}

/**
 * Hook para atualizar follow-up existente
 */
export function useUpdateFollowUp() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: updateFollowUp,
    onMutate: async (updatedFollowUp) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: followUpsKeys.detail(updatedFollowUp.id) });

      // Snapshot do valor anterior
      const previousFollowUp = queryClient.getQueryData<FollowUp>(
        followUpsKeys.detail(updatedFollowUp.id)
      );

      // Atualização otimista
      if (previousFollowUp) {
        queryClient.setQueryData(followUpsKeys.detail(updatedFollowUp.id), {
          ...previousFollowUp,
          ...updatedFollowUp,
        });
      }

      return { previousFollowUp };
    },
    onSuccess: (updatedFollowUp) => {
      // Invalida listas para refletir mudanças
      queryClient.invalidateQueries({ queryKey: followUpsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpsKeys.byLead(updatedFollowUp.leadId) });

      // Atualiza cache de detalhes com dados do servidor
      queryClient.setQueryData(followUpsKeys.detail(updatedFollowUp.id), updatedFollowUp);

      success("Follow-up atualizado", "As alterações foram salvas com sucesso.");
    },
    onError: (error: Error, updatedFollowUp, context) => {
      // Rollback em caso de erro
      if (context?.previousFollowUp) {
        queryClient.setQueryData(
          followUpsKeys.detail(updatedFollowUp.id),
          context.previousFollowUp
        );
      }

      showError("Erro ao atualizar follow-up", error.message);
    },
  });
}

/**
 * Hook para marcar follow-up como completo
 */
export function useCompleteFollowUp() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: completeFollowUp,
    onMutate: async ({ id }) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: followUpsKeys.detail(id) });

      // Snapshot do valor anterior
      const previousFollowUp = queryClient.getQueryData<FollowUp>(followUpsKeys.detail(id));

      // Atualização otimista
      if (previousFollowUp) {
        queryClient.setQueryData(followUpsKeys.detail(id), {
          ...previousFollowUp,
          status: "completed",
          completedAt: new Date().toISOString(),
        });
      }

      return { previousFollowUp };
    },
    onSuccess: (completedFollowUp) => {
      // Invalida listas
      queryClient.invalidateQueries({ queryKey: followUpsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: followUpsKeys.byLead(completedFollowUp.leadId) });

      // Atualiza cache de detalhes
      queryClient.setQueryData(followUpsKeys.detail(completedFollowUp.id), completedFollowUp);

      success("Follow-up concluído", "O lembrete foi marcado como completo.");
    },
    onError: (error: Error, { id }, context) => {
      // Rollback em caso de erro
      if (context?.previousFollowUp) {
        queryClient.setQueryData(followUpsKeys.detail(id), context.previousFollowUp);
      }

      showError("Erro ao completar follow-up", error.message);
    },
  });
}

/**
 * Hook para deletar follow-up
 */
export function useDeleteFollowUp() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();

  return useMutation({
    mutationFn: deleteFollowUp,
    onSuccess: (_, deletedId) => {
      // Remove do cache de detalhes
      queryClient.removeQueries({ queryKey: followUpsKeys.detail(deletedId) });

      // Invalida listas
      queryClient.invalidateQueries({ queryKey: followUpsKeys.lists() });

      success("Follow-up removido", "O lembrete foi removido com sucesso.");
    },
    onError: (error: Error) => {
      showError("Erro ao remover follow-up", error.message);
    },
  });
}
