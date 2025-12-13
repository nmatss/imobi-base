import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import imgApartment1 from "@assets/stock_images/modern_luxury_apartm_fdcbcc3c.jpg";
import imgApartment2 from "@assets/stock_images/modern_luxury_apartm_95363778.jpg";
import imgHouse1 from "@assets/stock_images/modern_house_exterio_8f066623.jpg";
import imgHouse2 from "@assets/stock_images/modern_house_exterio_391b4275.jpg";
import imgOffice from "@assets/stock_images/modern_office_buildi_ec9c6c89.jpg";

// --- Types ---

export type UserRole = "admin" | "manager" | "broker" | "support";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
};

export type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  colors: {
    primary: string;
    secondary: string;
  };
};

export type Property = {
  id: string;
  title: string;
  address: string;
  price: number;
  type: "sale" | "rent";
  status: "active" | "pending" | "sold" | "rented";
  beds: number;
  baths: number;
  sqm: number;
  image: string;
  tenantId: string;
  description: string;
};

export type LeadStatus = "new" | "qualification" | "visit" | "proposal" | "contract" | "closed" | "lost";

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  source: string;
  interest?: string; // Property ID
  budget?: number;
  tenantId: string;
  createdAt: string;
};

export type Visit = {
  id: string;
  leadId: string;
  propertyId: string;
  date: string; // ISO string
  status: "scheduled" | "completed" | "cancelled";
  notes?: string;
  tenantId: string;
};

export type Contract = {
  id: string;
  leadId: string;
  propertyId: string;
  status: "draft" | "sent" | "signed" | "rejected";
  value: number;
  createdAt: string;
  tenantId: string;
};

// --- Mock Data ---

const MOCK_TENANTS: Tenant[] = [
  {
    id: "t1",
    name: "Imobiliária Sol",
    slug: "sol",
    colors: { primary: "hsl(221, 83%, 53%)", secondary: "hsl(210, 40%, 96.1%)" },
  },
  {
    id: "t2",
    name: "Nova Casa",
    slug: "novacasa",
    colors: { primary: "hsl(142, 76%, 36%)", secondary: "hsl(142, 70%, 96%)" },
  },
];

const MOCK_USER: User = {
  id: "u1",
  name: "Carlos Admin",
  email: "admin@demo.com",
  role: "admin",
  avatar: "https://github.com/shadcn.png",
};

export const MOCK_LEADS: Lead[] = [
  { id: "l1", name: "Ana Silva", email: "ana@gmail.com", phone: "(11) 99999-1111", status: "new", source: "Instagram", budget: 500000, tenantId: "t1", createdAt: "2023-10-01" },
  { id: "l2", name: "João Souza", email: "joao@hotmail.com", phone: "(11) 98888-2222", status: "visit", source: "Portal", budget: 3500, tenantId: "t1", createdAt: "2023-10-05" },
  { id: "l3", name: "Marcos Lima", email: "marcos@empresa.com", phone: "(11) 97777-3333", status: "proposal", source: "Indicação", budget: 1200000, tenantId: "t1", createdAt: "2023-09-20" },
  { id: "l4", name: "Julia Costa", email: "julia@gmail.com", phone: "(21) 99999-4444", status: "new", source: "Site", budget: 4000, tenantId: "t2", createdAt: "2023-10-10" },
  { id: "l5", name: "Roberto Dias", email: "roberto@uol.com.br", phone: "(11) 91234-5678", status: "contract", source: "Google", budget: 2500000, tenantId: "t1", createdAt: "2023-09-15" },
];

export const MOCK_VISITS: Visit[] = [
  { id: "v1", leadId: "l2", propertyId: "p1", date: "2023-10-20T14:00:00", status: "scheduled", tenantId: "t1" },
  { id: "v2", leadId: "l1", propertyId: "p2", date: "2023-10-21T10:00:00", status: "scheduled", tenantId: "t1" },
  { id: "v3", leadId: "l3", propertyId: "p1", date: "2023-10-18T16:00:00", status: "completed", notes: "Gostou muito, vai fazer proposta", tenantId: "t1" },
];

export const MOCK_CONTRACTS: Contract[] = [
  { id: "c1", leadId: "l3", propertyId: "p1", status: "draft", value: 2400000, createdAt: "2023-10-19", tenantId: "t1" },
  { id: "c2", leadId: "l5", propertyId: "p3", status: "signed", value: 340000, createdAt: "2023-09-25", tenantId: "t1" },
];

// --- Context ---

type ImobiContextType = {
  user: User | null;
  tenant: Tenant | null;
  tenants: Tenant[];
  properties: Property[];
  leads: Lead[];
  visits: Visit[];
  contracts: Contract[];
  login: () => void;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "tenantId">) => void;
};

const ImobiContext = createContext<ImobiContextType | undefined>(undefined);

export function ImobiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_USER); // Auto login for mockup
  const [tenant, setTenant] = useState<Tenant | null>(MOCK_TENANTS[0]);
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);
  const [properties, setProperties] = useState<Property[]>([]);
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [, setLocation] = useLocation();

  useEffect(() => {
     const props: Property[] = [
      {
        id: "p1",
        title: "Apartamento Luxo Jardins",
        address: "Rua Oscar Freire, 1200 - Jardins, SP",
        price: 2500000,
        type: "sale",
        status: "active",
        beds: 3,
        baths: 3,
        sqm: 145,
        image: imgApartment1,
        tenantId: "t1",
        description: "Apartamento de alto padrão, recém reformado.",
      },
      {
        id: "p2",
        title: "Casa Condomínio Fechado",
        address: "Av. Morumbi, 4500 - Morumbi, SP",
        price: 15000,
        type: "rent",
        status: "active",
        beds: 4,
        baths: 5,
        sqm: 400,
        image: imgHouse1,
        tenantId: "t1",
        description: "Casa espetacular com piscina e área gourmet.",
      },
      {
        id: "p3",
        title: "Studio Centro",
        address: "Rua da Consolação, 800 - Centro, SP",
        price: 350000,
        type: "sale",
        status: "sold",
        beds: 1,
        baths: 1,
        sqm: 35,
        image: imgApartment2,
        tenantId: "t1",
        description: "Ideal para investidores. Próximo ao metrô.",
      },
       {
        id: "p4",
        title: "Cobertura Duplex",
        address: "Rua Bahia, 200 - Higienópolis, SP",
        price: 4500000,
        type: "sale",
        status: "active",
        beds: 4,
        baths: 4,
        sqm: 280,
        image: imgOffice,
        tenantId: "t2",
        description: "Vista panorâmica da cidade.",
      },
       {
        id: "p5",
        title: "Casa de Campo",
        address: "Estrada do Vinho, km 5 - São Roque, SP",
        price: 980000,
        type: "sale",
        status: "active",
        beds: 3,
        baths: 2,
        sqm: 1200,
        image: imgHouse2,
        tenantId: "t2",
        description: "Lazer completo em meio à natureza.",
      },
    ];
    setProperties(props);
  }, []);

  const login = () => setUser(MOCK_USER);
  const logout = () => {
    setUser(null);
    setLocation("/login");
  };

  const switchTenant = (tenantId: string) => {
    const t = MOCK_TENANTS.find((x) => x.id === tenantId);
    if (t) setTenant(t);
  };

  const addLead = (leadData: Omit<Lead, "id" | "createdAt" | "tenantId">) => {
    if (!tenant) return;
    const newLead: Lead = {
      ...leadData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      tenantId: tenant.id,
    };
    setLeads((prev) => [newLead, ...prev]);
  };

  return (
    <ImobiContext.Provider
      value={{
        user,
        tenant,
        tenants: MOCK_TENANTS,
        properties: properties.filter(p => p.tenantId === tenant?.id),
        leads: leads.filter(l => l.tenantId === tenant?.id),
        visits: visits.filter(v => v.tenantId === tenant?.id),
        contracts: contracts.filter(c => c.tenantId === tenant?.id),
        login,
        logout,
        switchTenant,
        addLead,
      }}
    >
      {children}
    </ImobiContext.Provider>
  );
}

export const useImobi = () => {
  const context = useContext(ImobiContext);
  if (!context) throw new Error("useImobi must be used within ImobiProvider");
  return context;
};
