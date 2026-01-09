import React from "react";
import {
  Globe,
  MessageCircle,
  Instagram,
  Facebook,
  Users,
  Building2,
  Phone,
  MoreHorizontal,
} from "lucide-react";

export type LeadSource =
  | "Site"
  | "WhatsApp"
  | "Instagram"
  | "Facebook"
  | "Indicação"
  | "Portal"
  | "Telefone"
  | "Outro";

export const LEAD_SOURCE_CONFIG: Record<LeadSource, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  description: string;
}> = {
  Site: {
    icon: Globe,
    label: "Site",
    color: "#3b82f6",
    description: "Lead vindo do seu site institucional ou landing page",
  },
  WhatsApp: {
    icon: MessageCircle,
    label: "WhatsApp",
    color: "#25D366",
    description: "Contato direto via WhatsApp",
  },
  Instagram: {
    icon: Instagram,
    label: "Instagram",
    color: "#E4405F",
    description: "Lead gerado através do Instagram",
  },
  Facebook: {
    icon: Facebook,
    label: "Facebook",
    color: "#1877F2",
    description: "Lead gerado através do Facebook",
  },
  Indicação: {
    icon: Users,
    label: "Indicação",
    color: "#8b5cf6",
    description: "Indicação de cliente ou parceiro",
  },
  Portal: {
    icon: Building2,
    label: "Portal",
    color: "#f59e0b",
    description: "Portais imobiliários (ZAP, OLX, VivaReal, etc)",
  },
  Telefone: {
    icon: Phone,
    label: "Telefone",
    color: "#06b6d4",
    description: "Contato direto via telefone",
  },
  Outro: {
    icon: MoreHorizontal,
    label: "Outro",
    color: "#6b7280",
    description: "Outras fontes de lead",
  },
};

export function getSourceConfig(source: string) {
  return LEAD_SOURCE_CONFIG[source as LeadSource] || LEAD_SOURCE_CONFIG.Outro;
}

export function SourceIcon({ source, className }: { source: string; className?: string }) {
  const config = getSourceConfig(source);
  const Icon = config.icon;
  return <Icon className={className} />;
}
