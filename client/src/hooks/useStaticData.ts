import { useQuery } from "@tanstack/react-query";
import { cacheStrategies } from "@/lib/queryClient";

/**
 * Hooks para dados estáticos que raramente mudam
 * Usa cache-first strategy com staleTime longo
 */

// ==================== TYPES ====================

export type PropertyType = {
  id: string;
  name: string;
  label: string;
  icon?: string;
};

export type PropertyCategory = {
  id: string;
  name: string;
  label: string;
};

export type LeadSource = {
  id: string;
  name: string;
  label: string;
  color?: string;
};

export type SystemSettings = {
  id: string;
  tenantId: string;
  currency: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  features: Record<string, boolean>;
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
};

// ==================== API FUNCTIONS ====================

async function fetchPropertyTypes(): Promise<PropertyType[]> {
  const response = await fetch("/api/static/property-types", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch property types");
  }

  return response.json();
}

async function fetchPropertyCategories(): Promise<PropertyCategory[]> {
  const response = await fetch("/api/static/property-categories", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch property categories");
  }

  return response.json();
}

async function fetchLeadSources(): Promise<LeadSource[]> {
  const response = await fetch("/api/static/lead-sources", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch lead sources");
  }

  return response.json();
}

async function fetchSystemSettings(): Promise<SystemSettings> {
  const response = await fetch("/api/settings", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch system settings");
  }

  return response.json();
}

// ==================== QUERY KEYS ====================

export const staticDataKeys = {
  all: ["static"] as const,
  propertyTypes: () => [...staticDataKeys.all, "property-types"] as const,
  propertyCategories: () => [...staticDataKeys.all, "property-categories"] as const,
  leadSources: () => [...staticDataKeys.all, "lead-sources"] as const,
  settings: () => [...staticDataKeys.all, "settings"] as const,
};

// ==================== HOOKS ====================

/**
 * Hook para buscar tipos de propriedade (Casa, Apartamento, etc.)
 * Usa cache-first: dados ficam em cache por 30 minutos
 */
export function usePropertyTypes() {
  return useQuery({
    queryKey: staticDataKeys.propertyTypes(),
    queryFn: fetchPropertyTypes,
    ...cacheStrategies.static,
    // Fornece dados padrão em caso de erro
    placeholderData: [
      { id: "house", name: "house", label: "Casa" },
      { id: "apartment", name: "apartment", label: "Apartamento" },
      { id: "land", name: "land", label: "Terreno" },
      { id: "commercial", name: "commercial", label: "Comercial" },
    ],
  });
}

/**
 * Hook para buscar categorias de propriedade (Venda, Aluguel)
 * Usa cache-first: dados ficam em cache por 30 minutos
 */
export function usePropertyCategories() {
  return useQuery({
    queryKey: staticDataKeys.propertyCategories(),
    queryFn: fetchPropertyCategories,
    ...cacheStrategies.static,
    placeholderData: [
      { id: "sale", name: "sale", label: "Venda" },
      { id: "rent", name: "rent", label: "Aluguel" },
    ],
  });
}

/**
 * Hook para buscar fontes de leads
 * Usa cache-first: dados ficam em cache por 30 minutos
 */
export function useLeadSources() {
  return useQuery({
    queryKey: staticDataKeys.leadSources(),
    queryFn: fetchLeadSources,
    ...cacheStrategies.static,
    placeholderData: [
      { id: "website", name: "website", label: "Site", color: "#3b82f6" },
      { id: "social", name: "social", label: "Redes Sociais", color: "#8b5cf6" },
      { id: "referral", name: "referral", label: "Indicação", color: "#10b981" },
      { id: "direct", name: "direct", label: "Direto", color: "#f59e0b" },
    ],
  });
}

/**
 * Hook para buscar configurações do sistema
 * Usa cache-first mas com staleTime menor (10 min)
 */
export function useSystemSettings() {
  return useQuery({
    queryKey: staticDataKeys.settings(),
    queryFn: fetchSystemSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
