import { Link, useLocation } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CalendarDays, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronDown,
  Menu,
  X,
  Search,
  Bell,
  ExternalLink,
  Loader2,
  Home,
  BarChart3,
  DollarSign,
  Wallet
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { format, isToday, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

type FollowUp = {
  id: string;
  leadId: string;
  dueAt: string;
  type: string;
  status: string;
  notes: string | null;
};
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type SearchResult = {
  properties: Array<{ id: string; title: string; address: string; city: string }>;
  leads: Array<{ id: string; name: string; email: string; phone: string }>;
  contracts: Array<{ id: string; value: string }>;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, tenant, tenants, switchTenant, logout, leads } = useImobi();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        const res = await fetch("/api/follow-ups?status=pending", { credentials: "include" });
        if (res.ok) setFollowUps(await res.json());
      } catch (e) {}
    };
    fetchFollowUps();
    const interval = setInterval(fetchFollowUps, 60000);
    return () => clearInterval(interval);
  }, []);

  const pendingFollowUps = useMemo(() => {
    return followUps
      .filter(f => f.status === "pending")
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .slice(0, 5)
      .map(f => ({ ...f, lead: leads.find(l => l.id === f.leadId), isOverdue: isPast(new Date(f.dueAt)) && !isToday(new Date(f.dueAt)) }));
  }, [followUps, leads]);

  const notificationCount = followUps.filter(f => f.status === "pending").length;

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      setSearchOpen(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setSearchOpen(true);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectResult = (type: "property" | "lead" | "contract", id: string) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults(null);
    if (type === "property") {
      setLocation(`/properties/${id}`);
    } else if (type === "lead") {
      setLocation("/leads");
    } else if (type === "contract") {
      setLocation("/contracts");
    }
  };

  const hasResults = searchResults && (
    searchResults.properties.length > 0 || 
    searchResults.leads.length > 0 || 
    searchResults.contracts.length > 0
  );

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/properties", label: "Imóveis", icon: Building2 },
    { href: "/leads", label: "Leads & CRM", icon: Users },
    { href: "/calendar", label: "Agenda", icon: CalendarDays },
    { href: "/contracts", label: "Propostas", icon: FileText },
    { href: "/vendas", label: "Vendas", icon: DollarSign },
    { href: "/rentals", label: "Aluguéis", icon: Home },
    { href: "/financeiro", label: "Financeiro", icon: Wallet },
    { href: "/reports", label: "Relatórios", icon: BarChart3 },
    { href: "/settings", label: "Configurações", icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-6 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-xl">
          I
        </div>
        <span className="font-heading font-bold text-lg tracking-tight">ImobiBase</span>
      </div>

      <div className="px-4 mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full justify-between bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground h-12"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div 
                  className="w-4 h-4 rounded-full shrink-0" 
                  style={{ backgroundColor: tenant?.primaryColor }} 
                />
                <span className="truncate">{tenant?.name}</span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="start">
            <DropdownMenuLabel>Alternar Empresa</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tenants.map((t) => (
              <DropdownMenuItem 
                key={t.id} 
                onClick={() => switchTenant(t.id)}
                className="cursor-pointer"
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: t.primaryColor }} 
                />
                {t.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all cursor-pointer group ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? "" : "opacity-70 group-hover:opacity-100"}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
      
      {/* Site Link */}
      <div className="px-4 mb-4">
        <a href={`/e/${tenant?.slug}`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full justify-start gap-2 bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80 hover:text-sidebar-foreground">
             <ExternalLink className="w-4 h-4 opacity-70" />
             Ver meu Site
          </Button>
        </a>
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-sidebar-border">
            <AvatarImage src={user?.avatar || undefined} />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen transition-all duration-300">
        <header className="h-16 border-b bg-card/50 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-heading font-bold text-lg">ImobiBase</span>
          </div>

          <div className="hidden lg:flex items-center text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{tenant?.name}</span>
            <span className="mx-2">/</span>
            <span>Dashboard</span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative hidden md:block w-64">
                  {isSearching ? (
                    <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  )}
                  <Input 
                    placeholder="Buscar imóveis, leads..." 
                    className="pl-9 h-9 bg-secondary/50 border-transparent focus:bg-background focus:border-input transition-all"
                    data-testid="input-global-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => hasResults && setSearchOpen(true)}
                  />
                </div>
              </PopoverTrigger>
              {hasResults && (
                <PopoverContent className="w-80 p-0" align="end" onOpenAutoFocus={(e) => e.preventDefault()}>
                  <div className="max-h-80 overflow-y-auto">
                    {searchResults.properties.length > 0 && (
                      <div className="p-2 border-b">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Imóveis</p>
                        {searchResults.properties.map((p) => (
                          <button
                            key={p.id}
                            className="w-full text-left px-2 py-2 hover:bg-muted rounded-md flex items-center gap-2 transition-colors"
                            onClick={() => handleSelectResult("property", p.id)}
                            data-testid={`search-result-property-${p.id}`}
                          >
                            <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{p.address}, {p.city}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.leads.length > 0 && (
                      <div className="p-2 border-b">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Leads</p>
                        {searchResults.leads.map((l) => (
                          <button
                            key={l.id}
                            className="w-full text-left px-2 py-2 hover:bg-muted rounded-md flex items-center gap-2 transition-colors"
                            onClick={() => handleSelectResult("lead", l.id)}
                            data-testid={`search-result-lead-${l.id}`}
                          >
                            <Users className="h-4 w-4 text-purple-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{l.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{l.email}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.contracts.length > 0 && (
                      <div className="p-2">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Contratos</p>
                        {searchResults.contracts.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-2 py-2 hover:bg-muted rounded-md flex items-center gap-2 transition-colors"
                            onClick={() => handleSelectResult("contract", c.id)}
                            data-testid={`search-result-contract-${c.id}`}
                          >
                            <FileText className="h-4 w-4 text-green-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium">Contrato</p>
                              <p className="text-xs text-muted-foreground">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(c.value))}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              )}
            </Popover>
            
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" data-testid="button-notifications">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center border-2 border-background">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b">
                  <p className="font-medium">Lembretes Pendentes</p>
                  <p className="text-xs text-muted-foreground">{notificationCount} pendente{notificationCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {pendingFollowUps.length > 0 ? pendingFollowUps.map((f) => (
                    <button
                      key={f.id}
                      className={`w-full text-left p-3 hover:bg-muted border-b last:border-b-0 flex items-start gap-3 ${f.isOverdue ? "bg-red-50" : ""}`}
                      onClick={() => { setNotificationsOpen(false); setLocation("/leads"); }}
                      data-testid={`notification-${f.id}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${f.isOverdue ? "bg-red-500" : "bg-amber-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{f.lead?.name || "Lead"}</p>
                        <p className="text-xs text-muted-foreground">{f.type} {f.notes ? `- ${f.notes}` : ""}</p>
                        <p className={`text-xs ${f.isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                          {f.isOverdue ? "Atrasado - " : ""}{format(new Date(f.dueAt), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </button>
                  )) : (
                    <div className="p-4 text-center text-muted-foreground text-sm">Nenhum lembrete pendente</div>
                  )}
                </div>
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => { setNotificationsOpen(false); setLocation("/leads"); }}>
                    Ver todos os leads
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
