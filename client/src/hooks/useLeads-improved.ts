/**
 * Hook de Leads com error handling melhorado
 * EXEMPLO de como refatorar hooks existentes
 */

import { useQuery } from "@tanstack/react-query";
import type { Lead, LeadStatus } from "@/lib/imobi-context";
import {
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
} from "@/hooks/useApiMutation";
import { errorLogger } from "@/lib/error-handling";

// ==================== TYPES (mesmo do original) ====================

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

// ==================== API FUNCTIONS (mesmo do original) ====================

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

// ==================== HOOKS COM ERROR HANDLING MELHORADO ====================

/**
 * Hook para buscar lista de leads
 */
export function useLeads(filters?: LeadFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadsKeys.list(filters),
    queryFn: async () => {
      try {
        return await fetchLeads(filters);
      } catch (error) {
        // Log automático de erros
        errorLogger.log(error, {
          action: "fetch_leads",
          filters,
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 2,
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar um lead específico
 */
export function useLead(id: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: leadsKeys.detail(id || ""),
    queryFn: async () => {
      try {
        return await fetchLeadById(id!);
      } catch (error) {
        errorLogger.log(error, {
          action: "fetch_lead",
          leadId: id,
        });
        throw error;
      }
    },
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    enabled: !!id && options?.enabled !== false,
    retry: (failureCount, error) => {
      if (error.message === "Lead not found") return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook para criar novo lead - COM ERROR HANDLING MELHORADO
 */
export function useCreateLead() {
  return useCreateMutation<Lead, CreateLeadData>({
    mutationFn: createLead,
    resourceName: "lead",
    invalidateKeys: [leadsKeys.lists()],
    logContext: {
      feature: "leads",
      action: "create",
    },
  });
}

/**
 * Hook para atualizar lead - COM ERROR HANDLING MELHORADO
 */
export function useUpdateLead() {
  return useUpdateMutation<Lead, UpdateLeadData>({
    mutationFn: updateLead,
    resourceName: "lead",
    invalidateKeys: [leadsKeys.lists()],
    logContext: {
      feature: "leads",
      action: "update",
    },
    onSuccess: (data) => {
      // Lógica adicional específica se necessário
      console.log("Lead atualizado:", data.id);
    },
  });
}

/**
 * Hook para atualizar status do lead - COM ERROR HANDLING MELHORADO
 */
export function useUpdateLeadStatus() {
  return useUpdateMutation<Lead, UpdateLeadStatusData>({
    mutationFn: updateLeadStatus,
    resourceName: "lead",
    invalidateKeys: [leadsKeys.lists()],
    successMessage: "Status atualizado com sucesso",
    showSuccessToast: false, // Não mostra toast para drag & drop no kanban
    logContext: {
      feature: "leads",
      action: "update_status",
    },
  });
}

/**
 * Hook para deletar lead - COM ERROR HANDLING MELHORADO
 */
export function useDeleteLead() {
  return useDeleteMutation<void, string>({
    mutationFn: deleteLead,
    resourceName: "lead",
    invalidateKeys: [leadsKeys.lists()],
    logContext: {
      feature: "leads",
      action: "delete",
    },
  });
}
