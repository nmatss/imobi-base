import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast-enhanced";
import type { Property } from "@/lib/imobi-context";

// ==================== TYPES ====================

export type PropertyFilters = {
  type?: string;
  category?: string;
  city?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
};

export type CreatePropertyData = {
  title: string;
  description?: string;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  neighborhood?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  features?: string[];
  images?: string[];
  status?: string;
  featured?: boolean;
  latitude?: number;
  longitude?: number;
};

export type UpdatePropertyData = Partial<CreatePropertyData> & { id: string };

// ==================== API FUNCTIONS ====================

async function fetchProperties(filters?: PropertyFilters): Promise<Property[]> {
  const queryParams = new URLSearchParams();

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        queryParams.append(key, value.toString());
      }
    });
  }

  const url = `/api/properties${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch properties");
  }

  return response.json();
}

async function fetchPropertyById(id: string): Promise<Property> {
  const response = await fetch(`/api/properties/${id}`, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Property not found");
    }
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch property");
  }

  return response.json();
}

async function createProperty(data: CreatePropertyData): Promise<Property> {
  const response = await fetch("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create property");
  }

  return response.json();
}

async function updateProperty({ id, ...data }: UpdatePropertyData): Promise<Property> {
  const response = await fetch(`/api/properties/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update property");
  }

  return response.json();
}

async function deleteProperty(id: string): Promise<void> {
  const response = await fetch(`/api/properties/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete property");
  }
}

// ==================== QUERY KEYS ====================

export const propertiesKeys = {
  all: ["properties"] as const,
  lists: () => [...propertiesKeys.all, "list"] as const,
  list: (filters?: PropertyFilters) => [...propertiesKeys.lists(), filters] as const,
  details: () => [...propertiesKeys.all, "detail"] as const,
  detail: (id: string) => [...propertiesKeys.details(), id] as const,
};

// ==================== HOOKS ====================

/**
 * Hook para buscar lista de propriedades
 * @param filters - Filtros opcionais para a busca
 * @param options - Opções adicionais do React Query
 */
export function useProperties(filters?: PropertyFilters, options?: { enabled?: boolean }) {
  const { toast } = useToast();

  return useQuery({
    queryKey: propertiesKeys.list(filters),
    queryFn: () => fetchProperties(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (anteriormente cacheTime)
    retry: 2,
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar uma propriedade específica por ID
 * @param id - ID da propriedade
 * @param options - Opções adicionais do React Query
 */
export function useProperty(id: string | undefined, options?: { enabled?: boolean }) {
  const { toast } = useToast();

  return useQuery({
    queryKey: propertiesKeys.detail(id || ""),
    queryFn: () => fetchPropertyById(id!),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!id && options?.enabled !== false,
    retry: (failureCount, error) => {
      // Não retenta se for 404
      if (error.message === "Property not found") return false;
      return failureCount < 2;
    },
  });
}

/**
 * Hook para criar nova propriedade
 */
export function useCreateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createProperty,
    onSuccess: (newProperty) => {
      // Invalida todas as listas de propriedades
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });

      // Adiciona a nova propriedade ao cache de detalhes
      queryClient.setQueryData(propertiesKeys.detail(newProperty.id), newProperty);

      toast.success("Propriedade criada", "A propriedade foi criada com sucesso.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar propriedade", error.message);
    },
  });
}

/**
 * Hook para atualizar propriedade existente
 */
export function useUpdateProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: updateProperty,
    onMutate: async (updatedProperty) => {
      // Cancela queries em andamento
      await queryClient.cancelQueries({ queryKey: propertiesKeys.detail(updatedProperty.id) });

      // Snapshot do valor anterior
      const previousProperty = queryClient.getQueryData<Property>(
        propertiesKeys.detail(updatedProperty.id)
      );

      // Atualização otimista
      if (previousProperty) {
        queryClient.setQueryData(
          propertiesKeys.detail(updatedProperty.id),
          { ...previousProperty, ...updatedProperty }
        );
      }

      return { previousProperty };
    },
    onSuccess: (updatedProperty) => {
      // Invalida listas para refletir mudanças
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });

      // Atualiza cache de detalhes com dados do servidor
      queryClient.setQueryData(propertiesKeys.detail(updatedProperty.id), updatedProperty);

      toast.success("Propriedade atualizada", "As alterações foram salvas com sucesso.");
    },
    onError: (error: Error, updatedProperty, context) => {
      // Rollback em caso de erro
      if (context?.previousProperty) {
        queryClient.setQueryData(
          propertiesKeys.detail(updatedProperty.id),
          context.previousProperty
        );
      }

      toast.error("Erro ao atualizar propriedade", error.message);
    },
  });
}

/**
 * Hook para deletar propriedade
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: (_, deletedId) => {
      // Remove do cache de detalhes
      queryClient.removeQueries({ queryKey: propertiesKeys.detail(deletedId) });

      // Invalida listas
      queryClient.invalidateQueries({ queryKey: propertiesKeys.lists() });

      toast.success("Propriedade removida", "A propriedade foi removida com sucesso.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover propriedade", error.message);
    },
  });
}
