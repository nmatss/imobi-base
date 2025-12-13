import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";

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
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  features: string[] | null;
  images: string[] | null;
  status: string;
  featured: boolean;
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
  createdAt: Date;
  updatedAt: Date;
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

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch data when user/tenant changes
  useEffect(() => {
    if (user && tenant) {
      fetchAllData();
    }
  }, [user, tenant]);

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setTenant(data.tenant);
        
        // Fetch all tenants
        const tenantsRes = await fetch("/api/tenants", {
          credentials: "include",
        });
        if (tenantsRes.ok) {
          const tenantsData = await tenantsRes.json();
          setTenants(tenantsData);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllData() {
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
  }

  async function refetchProperties() {
    try {
      const res = await fetch("/api/properties", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (error) {
      console.error("Failed to fetch properties:", error);
    }
  }

  async function refetchLeads() {
    try {
      const res = await fetch("/api/leads", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    }
  }

  async function refetchVisits() {
    try {
      const res = await fetch("/api/visits", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setVisits(data);
      }
    } catch (error) {
      console.error("Failed to fetch visits:", error);
    }
  }

  async function refetchContracts() {
    try {
      const res = await fetch("/api/contracts", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setContracts(data);
      }
    } catch (error) {
      console.error("Failed to fetch contracts:", error);
    }
  }

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
