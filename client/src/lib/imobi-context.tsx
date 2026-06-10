import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useLocation } from "wouter";
import { setCSRFToken, clearCSRFToken } from "@/lib/queryClient";
import { unwrapList, unwrapData } from "@/lib/api-envelope";

// --- Types ---
export type User = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
};

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

export type Property = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  zipCode: string | null;
  neighborhood: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  features: string[] | null;
  images: string[] | null;
  status: string;
  featured: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt?: string;
};

export type LeadStatus = "new" | "qualification" | "visit" | "proposal" | "contract";

export type Lead = {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  budget: string | null;
  interests: string[] | null;
  notes: string | null;
  assignedTo: string | null;
  preferredType: string | null;
  preferredCategory: string | null;
  preferredCity: string | null;
  preferredNeighborhood: string | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type Visit = {
  id: string;
  tenantId: string;
  propertyId: string;
  leadId: string | null;
  scheduledFor: Date;
  status: string;
  notes: string | null;
  assignedTo: string | null;
};

export type Contract = {
  id: string;
  tenantId: string;
  propertyId: string;
  leadId: string;
  type: string;
  status: string;
  value: string;
  terms: string | null;
  signedAt: Date | null;
  createdAt?: string;
};

// --- Context ---
type ImobiContextType = {
  user: User | null;
  tenant: Tenant | null;
  tenants: Tenant[];
  properties: Property[];
  leads: Lead[];
  visits: Visit[];
  contracts: Contract[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  loading: boolean;
  refetchProperties: () => Promise<void>;
  refetchLeads: () => Promise<void>;
  refetchVisits: () => Promise<void>;
  refetchContracts: () => Promise<void>;
};

const ImobiContext = createContext<ImobiContextType | undefined>(undefined);

function isPublicAuthOptionalPath(path: string): boolean {
  return (
    path === "/" ||
    path === "/login" ||
    path === "/pricing" ||
    path === "/signup" ||
    path === "/termos" ||
    path === "/privacidade" ||
    path.startsWith("/e/") ||
    path.startsWith("/portal/login") ||
    path.startsWith("/portal/reset-password")
  );
}

export function ImobiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();

  // Memoized refetch functions para evitar re-criação em cada render
  const refetchProperties = useCallback(async () => {
    try {
      const res = await fetch("/api/properties", {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setProperties(unwrapList<Property>(json));
      } else if (res.status === 401) {
        // Session expired, redirect to login
        setUser(null);
        setTenant(null);
        setLocation("/login");
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    }
  }, [setLocation]);

  const refetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads", {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setLeads(unwrapList<Lead>(json));
      } else if (res.status === 401) {
        setUser(null);
        setTenant(null);
        setLocation("/login");
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    }
  }, [setLocation]);

  const refetchVisits = useCallback(async () => {
    try {
      const res = await fetch("/api/visits", {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setVisits(unwrapList<Visit>(json));
      } else if (res.status === 401) {
        setUser(null);
        setTenant(null);
        setLocation("/login");
      }
    } catch (error) {
      console.error("Failed to fetch visits:", error);
    }
  }, [setLocation]);

  const refetchContracts = useCallback(async () => {
    try {
      const res = await fetch("/api/contracts", {
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        setContracts(unwrapList<Contract>(json));
      } else if (res.status === 401) {
        setUser(null);
        setTenant(null);
        setLocation("/login");
      }
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    }
  }, [setLocation]);

  const fetchAllData = useCallback(async () => {
    try {
      await Promise.all([
        refetchProperties(),
        refetchLeads(),
        refetchVisits(),
        refetchContracts(),
      ]);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
  }, [refetchProperties, refetchLeads, refetchVisits, refetchContracts]);

  // A sessão é verificada UMA vez por carga do app, adiada até a primeira rota
  // protegida (páginas públicas não disparam /api/auth/me). Enquanto não há
  // resposta definitiva, `loading` fica true para o ProtectedRoute aguardar em
  // vez de redirecionar para /login com a checagem ainda em voo.
  const hasCheckedAuthRef = useRef(false);

  const checkAuth = useCallback(async () => {
    if (isPublicAuthOptionalPath(location)) return;
    if (hasCheckedAuthRef.current) return;
    hasCheckedAuthRef.current = true;

    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (res.ok) {
        const data = unwrapData<{ user: User; tenant: Tenant }>(await res.json());
        setUser(data.user);
        setTenant(data.tenant);

        // Fetch all tenants
        const tenantsRes = await fetch("/api/tenants", {
          credentials: "include",
        });
        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          setTenants(unwrapList<Tenant>(tenantsData));
        }
      } else if (res.status === 401) {
        // Session expired, clear state
        setUser(null);
        setTenant(null);
        setTenants([]);
        setProperties([]);
        setLeads([]);
        setVisits([]);
        setContracts([]);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // On network error, try to maintain state but mark as potentially stale
    } finally {
      setLoading(false);
    }
  }, [location]);

  // Re-executa a cada navegação, mas só faz trabalho na primeira rota protegida.
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Periodic session refresh to prevent idle timeout (every 20 minutes)
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok && res.status === 401) {
          setUser(null);
          setTenant(null);
        }
      } catch {
        // Network error - session will be refreshed on next successful request
      }
    }, 20 * 60 * 1000); // 20 minutes

    return () => clearInterval(refreshInterval);
  }, [user]);

  // Fetch data when user/tenant changes
  useEffect(() => {
    if (user && tenant) {
      fetchAllData();
    }
  }, [user, tenant, fetchAllData]);

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await res.json();
    setUser(data.user);
    setTenant(data.tenant);
    // Login responde o estado da sessão — não precisa do /api/auth/me adiado.
    hasCheckedAuthRef.current = true;
    setLoading(false);

    // Store CSRF token from login response
    if (data.csrfToken) {
      setCSRFToken(data.csrfToken);
    }

    // Fetch all tenants
    const tenantsRes = await fetch("/api/tenants", {
      credentials: "include",
    });
    if (tenantsRes.ok) {
      const tenantsData = await tenantsRes.json();
      setTenants(unwrapList<Tenant>(tenantsData));
    }

    setLocation("/dashboard");
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Clear CSRF token on logout
    clearCSRFToken();

    setUser(null);
    setTenant(null);
    setTenants([]);
    setProperties([]);
    setLeads([]);
    setVisits([]);
    setContracts([]);
    setLocation("/login");
  }

  async function switchTenant(tenantId: string) {
    const newTenant = tenants.find((t) => t.id === tenantId);
    if (newTenant) {
      setTenant(newTenant);
      // In a real app, we'd need to switch the user's tenant on the server
      // For now, we just switch locally
    }
  }

  const value = {
    user,
    tenant,
    tenants,
    properties,
    leads,
    visits,
    contracts,
    login,
    logout,
    switchTenant,
    loading,
    refetchProperties,
    refetchLeads,
    refetchVisits,
    refetchContracts,
  };

  return <ImobiContext.Provider value={value}>{children}</ImobiContext.Provider>;
}

export function useImobi() {
  const context = useContext(ImobiContext);
  if (!context) {
    throw new Error("useImobi must be used within ImobiProvider");
  }
  return context;
}
