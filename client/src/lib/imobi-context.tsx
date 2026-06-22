import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { useLocation } from "wouter";
import { setCSRFToken, clearCSRFToken, queryClient } from "@/lib/queryClient";
import { unwrapList, unwrapData, getPaginationTotal } from "@/lib/api-envelope";

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
  login: (email: string, password: string, options?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  loading: boolean;
  refetchProperties: () => Promise<void>;
  refetchLeads: () => Promise<void>;
  refetchVisits: () => Promise<void>;
  refetchContracts: () => Promise<void>;
};

const ImobiContext = createContext<ImobiContextType | undefined>(undefined);

export type LoginOptions = {
  twoFactorToken?: string;
  backupCode?: string;
};

export class TwoFactorRequiredError extends Error {
  constructor(message = "Código de autenticação necessário") {
    super(message);
    this.name = "TwoFactorRequiredError";
  }
}

const AUTH_OPTIONAL_PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/pricing",
  "/signup",
  "/contato",
  "/novidades",
  "/termos",
  "/privacidade",
  "/crm-imobiliario",
  "/software-de-agendamento-imobiliario",
  "/sistema-imobiliario-completo",
  "/site-para-imobiliaria",
  "/crm-imobiliario-com-ia",
]);

const AUTH_OPTIONAL_PUBLIC_PREFIXES = [
  "/e/",
  "/portal/login",
  "/portal/reset-password",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
];

function isPublicAuthOptionalPath(path: string): boolean {
  return AUTH_OPTIONAL_PUBLIC_PATHS.has(path) || AUTH_OPTIONAL_PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// As rotas autenticadas /api/properties e /api/leads são paginadas no servidor
// (default 50 registros); sem percorrer todas as páginas, tenants com >50
// registros viam listas truncadas no kanban, dashboard e busca global.
// Mesmo padrão de fetchAllPublicProperties (pages/public/properties.tsx),
// com hard-stop de 20 páginas (20 × 100 = 2000 registros).
async function fetchAllPages<T>(
  baseUrl: string
): Promise<{ ok: boolean; status: number; items: T[] }> {
  const limit = 100;
  const items: T[] = [];

  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${baseUrl}?page=${page}&limit=${limit}`, {
      credentials: "include",
    });
    if (!res.ok) {
      // Falha na primeira página invalida tudo (ex.: 401);
      // em páginas seguintes mantém o parcial já carregado.
      if (page === 1) return { ok: false, status: res.status, items: [] };
      break;
    }

    const json = await res.json();
    const batch = unwrapList<T>(json);
    items.push(...batch);

    // Envelope dessas rotas é { success, data, meta } — getPaginationTotal cobre meta.total.
    const total = getPaginationTotal(json);
    if (batch.length < limit || (total !== undefined && items.length >= total)) break;
  }

  return { ok: true, status: 200, items };
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
      const result = await fetchAllPages<Property>("/api/properties");
      if (result.ok) {
        setProperties(result.items);
      } else if (result.status === 401) {
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
      const result = await fetchAllPages<Lead>("/api/leads");
      if (result.ok) {
        setLeads(result.items);
      } else if (result.status === 401) {
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
        const data = unwrapData<{ user: User; tenant: Tenant; csrfToken?: string }>(await res.json());
        setUser(data.user);
        setTenant(data.tenant);

        // Restaura o token CSRF no boot/refresh (vive só em memória e se perde
        // no reload); sem isto toda mutação pós-refresh falharia com 403.
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

  async function login(email: string, password: string, options?: LoginOptions) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        ...(options?.twoFactorToken ? { twoFactorToken: options.twoFactorToken } : {}),
        ...(options?.backupCode ? { backupCode: options.backupCode } : {}),
      }),
      credentials: "include",
    });

    const data = await res.json();

    if (data.twoFactorRequired && res.ok) {
      throw new TwoFactorRequiredError(data.message);
    }

    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }
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

    // FE-1/FE-2: limpar o cache do React Query no logout impede que dados do
    // tenant/usuario anterior vazem para a proxima conta antes do refetch.
    queryClient.clear();

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
    // Só permite trocar para um tenant que o usuario realmente possui acesso
    // (a lista `tenants` ja vem escopada pelo servidor: proprio tenant, ou todos
    // para superadmin). Trocar para qualquer outro id e ignorado.
    const newTenant = tenants.find((t) => t.id === tenantId);
    if (!newTenant || newTenant.id === tenant?.id) {
      return;
    }

    // FE-1: ao mudar o contexto de tenant, descartar TODO o cache do React Query
    // e o estado local derivado, para nao exibir dados do tenant anterior sob a
    // identidade do novo. O servidor continua escopando por sessao (RLS), entao
    // os dados sao re-buscados ja no contexto correto.
    queryClient.clear();
    setProperties([]);
    setLeads([]);
    setVisits([]);
    setContracts([]);
    setTenant(newTenant);
    // O useEffect [user, tenant] dispara fetchAllData() no novo contexto.
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
