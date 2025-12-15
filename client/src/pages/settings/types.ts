export interface TenantSettings {
  name: string;
  cnpj: string;
  inscricaoMunicipal: string;
  creci: string;
  phone: string;
  email: string;
  address: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  pixKey: string;
  businessHoursStart: string;
  businessHoursEnd: string;
}

export interface BrandSettings {
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  faviconUrl?: string;
  customDomain?: string;
  subdomain: string;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  youtubeUrl?: string;
  footerText?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "inactive" | "pending";
  avatar?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: Record<string, boolean>;
}

export interface Permission {
  category: string;
  permissions: {
    label: string;
    key: string;
  }[];
}

export interface Integration {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: "connected" | "disconnected";
  configurable: boolean;
}

export interface NotificationEvent {
  type: string;
  label: string;
  email: boolean;
  whatsapp: boolean;
  appPush: boolean;
  recipients: string[];
}

export interface AISettings {
  aiActive: boolean;
  language: string;
  tone: string;
  modulePresets: {
    properties?: string[];
    leads?: string[];
    rentals?: string[];
    sales?: string[];
    financial?: string[];
  };
  brokersCanEdit: boolean;
}

export type WhatsAppTemplateCategory =
  | "leads"
  | "properties"
  | "visits"
  | "contracts"
  | "payments";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: WhatsAppTemplateCategory;
  content: string;
  isDefault: boolean;
  usageCount: number;
  createdAt: string;
}
