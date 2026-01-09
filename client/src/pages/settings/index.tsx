import React, { useEffect, useState } from "react";
import { useImobi } from "@/lib/imobi-context";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Palette,
  CreditCard,
  Users,
  Shield,
  Plug,
  Bell,
  Sparkles,
  Menu,
  Search,
  ChevronRight,
  Settings as SettingsIcon,
  MessageSquare,
  User as UserIcon,
  Eye,
  Sliders,
  Info,
} from "lucide-react";
import { GeneralTab } from "./tabs/GeneralTab";
import { BrandTab } from "./tabs/BrandTab";
import { PlansTab } from "./tabs/PlansTab";
import { UsersTab } from "./tabs/UsersTab";
import { PermissionsTab } from "./tabs/PermissionsTab";
import { IntegrationsTab } from "./tabs/IntegrationsTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { AITab } from "./tabs/AITab";
import { WhatsAppTab } from "./tabs/WhatsAppTab";
import { SecurityTab } from "./tabs/SecurityTab";
import { AccessibilityTab } from "./tabs/AccessibilityTab";

// Import new improved sections
import {
  ProfileSettings,
  SecuritySettings,
  NotificationSettings,
  CompanySettings,
  PreferencesSettings,
  AboutSettings,
} from "@/components/settings/sections";

import type { TenantSettings, BrandSettings, AISettings, User } from "./types";

type TabId = "general" | "brand" | "plans" | "users" | "permissions" | "security" | "integrations" | "notifications" | "ai" | "whatsapp" | "profile" | "securityNew" | "notificationsNew" | "company" | "accessibility" | "preferences" | "about";

interface NavItem {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "profile",
    label: "Perfil",
    shortLabel: "Perfil",
    icon: <UserIcon className="w-4 h-4" />,
    description: "Dados pessoais e foto de perfil",
  },
  {
    id: "company",
    label: "Empresa",
    shortLabel: "Empresa",
    icon: <Building2 className="w-4 h-4" />,
    description: "Dados da imobiliária e redes sociais",
  },
  {
    id: "securityNew",
    label: "Segurança",
    shortLabel: "Segurança",
    icon: <Shield className="w-4 h-4" />,
    description: "Senha, 2FA e sessões ativas",
  },
  {
    id: "notificationsNew",
    label: "Notificações",
    shortLabel: "Notificações",
    icon: <Bell className="w-4 h-4" />,
    description: "Preferências de alertas e horários",
  },
  {
    id: "brand",
    label: "Marca & Site",
    shortLabel: "Marca",
    icon: <Palette className="w-4 h-4" />,
    description: "Logo, cores, domínio",
  },
  {
    id: "plans",
    label: "Planos",
    shortLabel: "Planos",
    icon: <CreditCard className="w-4 h-4" />,
    description: "Assinatura e cobrança",
  },
  {
    id: "users",
    label: "Usuários",
    shortLabel: "Usuários",
    icon: <Users className="w-4 h-4" />,
    description: "Gerenciar equipe e convites",
  },
  {
    id: "permissions",
    label: "Permissões",
    shortLabel: "Permissões",
    icon: <Shield className="w-4 h-4" />,
    description: "Controle de acesso por cargo",
  },
  {
    id: "integrations",
    label: "Integrações",
    shortLabel: "Integrações",
    icon: <Plug className="w-4 h-4" />,
    description: "Conectar portais e serviços",
  },
  {
    id: "whatsapp",
    label: "Templates WhatsApp",
    shortLabel: "WhatsApp",
    icon: <MessageSquare className="w-4 h-4" />,
    description: "Mensagens prontas e automação",
  },
  {
    id: "ai",
    label: "IA & Automação",
    shortLabel: "IA",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Assistente inteligente",
  },
  {
    id: "accessibility",
    label: "Acessibilidade",
    shortLabel: "Acess.",
    icon: <Eye className="w-4 h-4" />,
    description: "Opções de acessibilidade",
  },
  {
    id: "preferences",
    label: "Preferências",
    shortLabel: "Prefer.",
    icon: <Sliders className="w-4 h-4" />,
    description: "Interface, tema e idioma",
  },
  {
    id: "about",
    label: "Sobre",
    shortLabel: "Sobre",
    icon: <Info className="w-4 h-4" />,
    description: "Versão e informações do sistema",
  },
];

export default function SettingsPage() {
  const { tenant } = useImobi();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAIDrawer, setShowAIDrawer] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [generalSettings, setGeneralSettings] = useState<Partial<TenantSettings> | null>(null);
  const [brandSettings, setBrandSettings] = useState<Partial<BrandSettings> | null>(null);
  const [aiSettings, setAISettings] = useState<Partial<AISettings> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchGeneralSettings(),
        fetchBrandSettings(),
        fetchAISettings(),
      ]);
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchGeneralSettings = async () => {
    try {
      const response = await fetch("/api/settings/general", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setGeneralSettings(data);
      }
    } catch (error) {
      console.error("Error fetching general settings:", error);
    }
  };

  const fetchBrandSettings = async () => {
    try {
      const response = await fetch("/api/settings/brand", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setBrandSettings(data);
      }
    } catch (error) {
      console.error("Error fetching brand settings:", error);
    }
  };

  const fetchAISettings = async () => {
    try {
      const response = await fetch("/api/settings/ai", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setAISettings(data);
      }
    } catch (error) {
      console.error("Error fetching AI settings:", error);
    }
  };

  const handleSaveGeneral = async (data: Partial<TenantSettings>) => {
    const response = await fetch("/api/settings/general", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao salvar configurações");
    }

    const updated = await response.json();
    setGeneralSettings(updated);
    return updated;
  };

  const handleSaveBrand = async (data: Partial<BrandSettings>) => {
    const response = await fetch("/api/settings/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao salvar configurações de marca");
    }

    const updated = await response.json();
    setBrandSettings(updated);
    return updated;
  };

  const handleSaveAI = async (data: Partial<AISettings>) => {
    const response = await fetch("/api/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao salvar configurações de IA");
    }

    const updated = await response.json();
    setAISettings(updated);
    return updated;
  };

  const generalInitialData: Partial<TenantSettings> = {
    name: generalSettings?.name || tenant?.name || "",
    email: generalSettings?.email || tenant?.email || "",
    phone: generalSettings?.phone || tenant?.phone || "",
    address: generalSettings?.address || tenant?.address || "",
    cnpj: generalSettings?.cnpj || "",
    inscricaoMunicipal: generalSettings?.inscricaoMunicipal || "",
    creci: generalSettings?.creci || "",
    bankName: generalSettings?.bankName || "",
    bankAgency: generalSettings?.bankAgency || "",
    bankAccount: generalSettings?.bankAccount || "",
    pixKey: generalSettings?.pixKey || "",
    businessHoursStart: generalSettings?.businessHoursStart || "09:00",
    businessHoursEnd: generalSettings?.businessHoursEnd || "18:00",
  };

  const brandInitialData: Partial<BrandSettings> = {
    logoUrl: brandSettings?.logoUrl || tenant?.logo || "",
    primaryColor: brandSettings?.primaryColor || tenant?.primaryColor || "#0066cc",
    secondaryColor: brandSettings?.secondaryColor || tenant?.secondaryColor || "#333333",
    subdomain: brandSettings?.subdomain || tenant?.slug || "",
    customDomain: brandSettings?.customDomain || "",
    facebookUrl: brandSettings?.facebookUrl || "",
    instagramUrl: brandSettings?.instagramUrl || "",
    linkedinUrl: brandSettings?.linkedinUrl || "",
    youtubeUrl: brandSettings?.youtubeUrl || "",
    footerText: brandSettings?.footerText || "",
  };

  const aiInitialData: Partial<AISettings> = {
    aiActive: aiSettings?.aiActive ?? true,
    language: aiSettings?.language || "pt-BR",
    tone: aiSettings?.tone || "neutral",
    modulePresets: aiSettings?.modulePresets || {},
    brokersCanEdit: aiSettings?.brokersCanEdit ?? true,
  };

  // Filter nav items based on search
  const filteredNavItems = searchQuery
    ? NAV_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : NAV_ITEMS;

  const currentNavItem = NAV_ITEMS.find((item) => item.id === activeTab);

  const handleNavClick = (tabId: TabId) => {
    setActiveTab(tabId);
    setMobileNavOpen(false);
    setSearchQuery("");
  };

  const renderTabContent = () => {
    switch (activeTab) {
      // New improved sections
      case "profile":
        return <ProfileSettings />;
      case "company":
        return <CompanySettings />;
      case "securityNew":
        return <SecuritySettings />;
      case "notificationsNew":
        return <NotificationSettings />;
      case "accessibility":
        return <AccessibilityTab />;
      case "preferences":
        return <PreferencesSettings />;
      case "about":
        return <AboutSettings />;

      // Existing tabs
      case "general":
        return <GeneralTab initialData={generalInitialData} onSave={handleSaveGeneral} />;
      case "brand":
        return <BrandTab initialData={brandInitialData} onSave={handleSaveBrand} />;
      case "plans":
        return <PlansTab />;
      case "users":
        return <UsersTab users={users} onRefresh={fetchUsers} />;
      case "permissions":
        return <PermissionsTab />;
      case "security":
        return <SecurityTab />;
      case "integrations":
        return <IntegrationsTab />;
      case "whatsapp":
        return <WhatsAppTab />;
      case "notifications":
        return <NotificationsTab />;
      case "ai":
        return <AITab initialData={aiInitialData} onSave={handleSaveAI} />;
      default:
        return null;
    }
  };

  // Navigation sidebar component (reused for desktop and mobile)
  const NavContent = ({ showSearch = true }: { showSearch?: boolean }) => (
    <div className="flex flex-col h-full">
      {showSearch && (
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar configuração..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>
      )}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200",
                "hover:bg-accent hover:text-accent-foreground",
                "border-l-4 transition-all",
                activeTab === item.id
                  ? "bg-blue-50 text-blue-700 border-blue-600 shadow-sm"
                  : "border-transparent hover:border-blue-200"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-md shrink-0 transition-all",
                  activeTab === item.id ? "bg-blue-600 text-white" : "bg-muted"
                )}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className={cn("font-medium text-sm", activeTab === item.id && "font-semibold")}>{item.label}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{item.description}</div>
              </div>
              {activeTab === item.id && (
                <ChevronRight className="w-4 h-4 shrink-0 mt-2 text-blue-600" />
              )}
            </button>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );

  return (
    <div className="min-h-screen pb-safe">
      {/* Header with breadcrumb */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span className="truncate max-w-[150px]">{tenant?.name || "Imobiliária"}</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
            <span className="text-foreground font-medium">Configurações</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile menu trigger */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="icon" className="shrink-0 h-10 w-10">
                    <Menu className="w-4 h-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-[320px] p-0">
                  <div className="flex items-center gap-2 p-4 border-b">
                    <SettingsIcon className="w-5 h-5" />
                    <span className="font-semibold">Configurações</span>
                  </div>
                  <NavContent />
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground flex items-center gap-2">
                  <span className="shrink-0">{currentNavItem?.icon}</span>
                  <span className="hidden sm:inline truncate">{currentNavItem?.label}</span>
                  <span className="sm:hidden truncate">{currentNavItem?.shortLabel}</span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block truncate">
                  {currentNavItem?.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile horizontal tabs - Alternative navigation */}
        <div className="lg:hidden border-t overflow-x-auto scrollbar-hide">
          <div className="flex px-2 min-w-max">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap",
                  activeTab === item.id
                    ? "border-blue-600 text-blue-700 bg-blue-50/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-blue-200"
                )}
              >
                {item.icon}
                <span className={cn(activeTab === item.id && "font-semibold")}>{item.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[280px] border-r bg-muted/30 shrink-0 sticky top-[85px] h-[calc(100vh-85px)]">
          <NavContent />
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            {renderTabContent()}
          </div>
        </main>
      </div>

      {/* AITOPIA Floating Drawer */}
      <Sheet open={showAIDrawer} onOpenChange={setShowAIDrawer}>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="lg"
            className="fixed bottom-6 right-6 rounded-full shadow-lg gap-2 h-14 px-6 z-40"
          >
            <Sparkles className="w-5 h-5" />
            <span className="hidden sm:inline">Assistente IA</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-96 p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AITOPIA
            </SheetTitle>
            <SheetDescription>
              IA Especializada em Imobiliário
            </SheetDescription>
          </SheetHeader>
          <div className="p-6 space-y-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Olá! Sou o assistente de IA do ImobiBase. Como posso ajudar você com as configurações?
              </p>
            </div>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4"
                onClick={() => {
                  setShowAIDrawer(false);
                  toast({
                    title: "Sugestão aplicada",
                    description: "Otimizando suas configurações...",
                  });
                }}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm">Otimizar Perfil</div>
                  <div className="text-xs text-muted-foreground">
                    Preencher campos vazios automaticamente
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4"
                onClick={() => {
                  setShowAIDrawer(false);
                  toast({
                    title: "Análise iniciada",
                    description: "Verificando integrações...",
                  });
                }}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm">Verificar Integrações</div>
                  <div className="text-xs text-muted-foreground">
                    Analisar conexões com portais
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4"
                onClick={() => {
                  setShowAIDrawer(false);
                  toast({
                    title: "Dicas carregadas",
                    description: "Visualize as sugestões de melhoria",
                  });
                }}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm">Dicas de Configuração</div>
                  <div className="text-xs text-muted-foreground">
                    Recomendações personalizadas
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
