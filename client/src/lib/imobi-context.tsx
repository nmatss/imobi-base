import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useLocation } from "wouter";
import { setCSRFToken, clearCSRFToken } from "@/lib/queryClient";

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

export function ImobiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  // Memoized refetch functions para evitar re-criação em cada render
  const refetchProperties = useCallback(async () => {
    try {
      const res = await fetch("/api/properties", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
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
        const data = await res.json();
        setLeads(data);
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
        const data = await res.json();
        setVisits(data);
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
        const data = await res.json();
        setContracts(data);
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

  const checkAuth = useCallback(async () => {
    let mounted = true; // Controle de componente montado para evitar race conditions

    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!mounted) return; // Verifica se o componente ainda está montado antes de setState

      if (res.ok) {
        const data = await res.json();
        if (mounted) {
          setUser(data.user);
          setTenant(data.tenant);
        }

        // Fetch all tenants
        const tenantsRes = await fetch("/api/tenants", {
          credentials: "include",
        });
        if (tenantsRes.ok && mounted) {
          const tenantsData = await tenantsRes.json();
          if (mounted) {
            setTenants(tenantsData);
          }
        }
      } else if (res.status === 401) {
        // Session expired, clear state
        if (mounted) {
          setUser(null);
          setTenant(null);
          setTenants([]);
          setProperties([]);
          setLeads([]);
          setVisits([]);
          setContracts([]);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // On network error, try to maintain state but mark as potentially stale
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }

    return () => {
      mounted = false; // Cleanup function para marcar componente como desmontado
    };
  }, []);

  // Check auth on mount
  useEffect(() => {
    const cleanup = checkAuth();
    return () => {
      if (cleanup instanceof Promise) {
        cleanup.then((fn) => fn && fn());
      }
    };
  }, [checkAuth]);

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
      setTenants(tenantsData);
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
