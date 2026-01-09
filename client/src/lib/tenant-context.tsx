import React from "react";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "./auth-context";

// ==================== TYPES ====================

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type TenantContextType = {
  tenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  refetchTenant: () => Promise<void>;
};

// ==================== CONTEXT ====================

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ==================== PROVIDER ====================

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Busca dados do tenant atual
   */
  const fetchTenant = useCallback(async () => {
    if (!user) {
      setTenant(null);
      setTenants([]);
      setLoading(false);
      return;
    }

    try {
      // Busca tenant atual do usuário
      const tenantRes = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (tenantRes.ok) {
        const data = await tenantRes.json();
        setTenant(data.tenant);
      }

      // Busca todos os tenants disponíveis
      const tenantsRes = await fetch("/api/tenants", {
        credentials: "include",
      });

      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData);
      }
    } catch (error) {
      console.error("Failed to fetch tenant:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Troca o tenant ativo
   */
  async function switchTenant(tenantId: string) {
    const newTenant = tenants.find((t) => t.id === tenantId);
    if (newTenant) {
      setTenant(newTenant);
      // Em produção, deveria atualizar no servidor também
      // await fetch("/api/auth/switch-tenant", { method: "POST", ... });
    }
  }

  /**
   * Refaz busca do tenant (útil após updates)
   */
  async function refetchTenant() {
    await fetchTenant();
  }

  // Busca dados do tenant quando usuário muda
  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const value = {
    tenant,
    tenants,
    loading,
    switchTenant,
    refetchTenant,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

// ==================== HOOK ====================

/**
 * Hook para acessar o contexto de tenant
 * @throws Error se usado fora do TenantProvider
 */
export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}
