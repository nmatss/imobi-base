import React from "react";
// @ts-nocheck
import { useState } from "react";
import { useImobi } from "@/lib/imobi-context";
import { ChevronRight } from "lucide-react";
import {
  User,
  Shield,
  Bell,
  Building2,
  Sliders,
  Info,
  Eye,
  Palette,
  CreditCard,
  Users,
  Plug,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import type { SettingsSection } from "@/components/settings/SettingsLayout";

// Import new sections
import {
  ProfileSettings,
  SecuritySettings,
  NotificationSettings,
  CompanySettings,
  PreferencesSettings,
  AboutSettings,
} from "@/components/settings/sections";

// Import existing tabs
import { AccessibilityTab } from "./tabs/AccessibilityTab";
import { BrandTab } from "./tabs/BrandTab";
import { PlansTab } from "./tabs/PlansTab";
import { UsersTab } from "./tabs/UsersTab";
import { PermissionsTab } from "./tabs/PermissionsTab";
import { IntegrationsTab } from "./tabs/IntegrationsTab";
import { WhatsAppTab } from "./tabs/WhatsAppTab";
import { AITab } from "./tabs/AITab";

export default function SettingsPage() {
  const { tenant } = useImobi();

  const sections: SettingsSection[] = [
    {
      id: "profile",
      label: "Perfil",
      icon: User,
      component: ProfileSettings,
      description: "Dados pessoais e foto de perfil",
    },
    {
      id: "security",
      label: "Segurança",
      icon: Shield,
      component: SecuritySettings,
      description: "Senha, 2FA e sessões ativas",
    },
    {
      id: "notifications",
      label: "Notificações",
      icon: Bell,
      component: NotificationSettings,
      description: "Preferências de alertas",
    },
    {
      id: "company",
      label: "Empresa",
      icon: Building2,
      component: CompanySettings,
      description: "Dados da imobiliária",
    },
    {
      id: "brand",
      label: "Marca",
      icon: Palette,
      component: BrandTab,
      description: "Logo, cores e site",
    },
    {
      id: "plans",
      label: "Planos",
      icon: CreditCard,
      component: PlansTab,
      description: "Assinatura e cobrança",
    },
    {
      id: "users",
      label: "Usuários",
      icon: Users,
      component: UsersTab,
      description: "Gerenciar equipe",
    },
    {
      id: "permissions",
      label: "Permissões",
      icon: Shield,
      component: PermissionsTab,
      description: "Controle de acesso",
    },
    {
      id: "integrations",
      label: "Integrações",
      icon: Plug,
      component: IntegrationsTab,
      description: "Conectar serviços",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageSquare,
      component: WhatsAppTab,
      description: "Templates e automação",
    },
    {
      id: "ai",
      label: "IA",
      icon: Sparkles,
      component: AITab,
      description: "Assistente inteligente",
    },
    {
      id: "accessibility",
      label: "Acessibilidade",
      icon: Eye,
      component: AccessibilityTab,
      description: "Opções de acessibilidade",
    },
    {
      id: "preferences",
      label: "Preferências",
      icon: Sliders,
      component: PreferencesSettings,
      description: "Interface e idioma",
    },
    {
      id: "about",
      label: "Sobre",
      icon: Info,
      component: AboutSettings,
      description: "Versão e suporte",
    },
  ];

  return (
    <div className="min-h-screen pb-safe">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="truncate max-w-[150px]">{tenant?.name || "Imobiliária"}</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <span className="text-foreground font-medium">Configurações</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas preferências e configurações do sistema
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <SettingsLayout sections={sections} defaultSection="profile" />
      </div>
    </div>
  );
}
