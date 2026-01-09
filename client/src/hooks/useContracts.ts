import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast-enhanced";
import type { Contract } from "@/lib/imobi-context";

// ==================== TYPES ====================

export type ContractFilters = {
  type?: string;
  status?: string;
  propertyId?: string;
  leadId?: string;
};

export type CreateContractData = {
  propertyId: string;
  leadId: string;
  type: string;
  status?: string;
  value: string;
  terms?: string;
  signedAt?: Date;
};

export type UpdateContractData = Partial<CreateContractData> & { id: string };

// ==================== API FUNCTIONS ====================

async function fetchContracts(filters?: ContractFilters): Promise<Contract[]> {
  const queryParams = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });
  }

  const url = `/api/contracts${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch contracts");
  }

  return response.json();
}

async function fetchContractById(id: string): Promise<Contract> {
  const response = await fetch(`/api/contracts/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Contract not found");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch contract");
  }

  return response.json();
}

async function createContract(data: CreateContractData): Promise<Contract> {
  const response = await fetch("/api/contracts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create contract");
  }

  return response.json();
}

async function updateContract({ id, ...data }: UpdateContractData): Promise<Contract> {
  const response = await fetch(`/api/contracts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update contract");
  }

  return response.json();
}

async function deleteContract(id: string): Promise<void> {
  const response = await fetch(`/api/contracts/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete contract");
  }
}

// ==================== QUERY KEYS ====================

export const contractsKeys = {
  all: ["contracts"] as const,
  lists: () => [...contractsKeys.all, "list"] as const,
  list: (filters?: ContractFilters) => [...contractsKeys.lists(), filters] as const,
  details: () => [...contractsKeys.all, "detail"] as const,
  detail: (id: string) => [...contractsKeys.details(), id] as const,
};

// ==================== HOOKS ====================

/**
 * Hook para buscar lista de contratos
 * @param filters - Filtros opcionais para a busca
 * @param options - Opções adicionais do React Query
 */
export function useContracts(filters?: ContractFilters, options?: { enabled?: boolean }) {
  const { toast } = useToast();

  return useQuery({
    queryKey: contractsKeys.list(filters),
    queryFn: () => fetchContracts(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    retry: 2,
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar um contrato específico por ID
 * @param id - ID do contrato
 * @param options - Opções adicionais do React Query
 */
export function useContract(id: string | undefined, options?: { enabled?: boolean }) {
  const { toast } = useToast();

  return useQuery({
    queryKey: contractsKeys.detail(id || ""),
    queryFn: () => fetchContractById(id!),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!id && options?.enabled !== false,
    retry: (failureCount, error) => {
      if (error.message === "Contract not found") return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook para criar novo contrato
 */
export function useCreateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createContract,
    onSuccess: (newContract) => {
      // Invalida todas as listas de contratos
      queryClient.invalidateQueries({ queryKey: contractsKeys.lists() });

      // Adiciona o novo contrato ao cache de detalhes
      queryClient.setQueryData(contractsKeys.detail(newContract.id), newContract);

      toast.success("Contrato criado", "O contrato foi criado com sucesso.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar contrato", error.message);
    },
  });
}

/**
 * Hook para atualizar contrato existente
 */
export function useUpdateContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateContract,
    onMutate: async (updatedContract) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: contractsKeys.detail(updatedContract.id) });

      // Snapshot do valor anterior
      const previousContract = queryClient.getQueryData<Contract>(
        contractsKeys.detail(updatedContract.id)
      );

      // Atualização otimista
      if (previousContract) {
        queryClient.setQueryData(contractsKeys.detail(updatedContract.id), {
          ...previousContract,
          ...updatedContract,
        });
      }

      return { previousContract };
    },
    onSuccess: (updatedContract) => {
      // Invalida listas para refletir mudanças
      queryClient.invalidateQueries({ queryKey: contractsKeys.lists() });

      // Atualiza cache de detalhes com dados do servidor
      queryClient.setQueryData(contractsKeys.detail(updatedContract.id), updatedContract);

      toast.success("Contrato atualizado", "As alterações foram salvas com sucesso.");
    },
    onError: (error: Error, updatedContract, context) => {
      // Rollback em caso de erro
      if (context?.previousContract) {
        queryClient.setQueryData(
          contractsKeys.detail(updatedContract.id),
          context.previousContract
        );
      }

      toast.error("Erro ao atualizar contrato", error.message);
    },
  });
}

/**
 * Hook para deletar contrato
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteContract,
    onSuccess: (_, deletedId) => {
      // Remove do cache de detalhes
      queryClient.removeQueries({ queryKey: contractsKeys.detail(deletedId) });

      // Invalida listas
      queryClient.invalidateQueries({ queryKey: contractsKeys.lists() });

      toast.success("Contrato removido", "O contrato foi removido com sucesso.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover contrato", error.message);
    },
  });
}
