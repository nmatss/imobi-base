import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useImobi } from "@/lib/imobi-context";
import {
  Building2, Users, DollarSign, CalendarCheck, Plus, Eye, Clock, MapPin, Phone,
  Bell, AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Home, UserPlus,
  FileText, Handshake, AlertTriangle, ArrowRight, MessageSquare, PhoneCall,
  Calendar, Target, Activity, Banknote, CircleDollarSign, Timer, ChevronRight,
  BarChart3, PieChart as PieChartIcon, Sparkles, RefreshCw, Send, Menu
} from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { format, isToday, isPast, isTomorrow, differenceInDays, startOfDay, endOfDay, isWithinInterval, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type FollowUp = {
  id: string;
  tenantId: string;
  leadId: string;
  assignedTo: string | null;
  dueAt: string;
  type: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

const FOLLOW_UP_TYPE_LABELS: Record<string, string> = {
  call: "Ligar",
  email: "E-mail",
  whatsapp: "WhatsApp",
  visit: "Visita",
  proposal: "Proposta",
  other: "Outro",
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  qualification: "#8b5cf6",
  visit: "#f97316",
  proposal: "#eab308",
  contract: "#22c55e",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  qualification: "Em Contato",
  visit: "Em Visita",
  proposal: "Proposta",
  contract: "Fechado",
};

const SOURCE_LABELS: Record<string, string> = {
  website: "Site",
  Site: "Site",
  referral: "Indicação",
  Indicação: "Indicação",
  instagram: "Instagram",
  Instagram: "Instagram",
  facebook: "Facebook",
  Facebook: "Facebook",
  whatsapp: "WhatsApp",
  Portais: "Portais",
  other: "Outro",
};

function parseCurrencyValue(value: string | null | undefined): number {
  if (!value) return 0;
  const cleanValue = value.replace(/[R$\s.]/g, "").replace(",", ".");
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

export default function Dashboard() {
  const { tenant, properties, leads, contracts, visits, refetchLeads } = useImobi();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "website",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    try {
      const res = await fetch("/api/follow-ups?status=pending", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data);
      }
    } catch (error) {
      console.error("Failed to fetch follow-ups:", error);
    }
  };

  const handleCompleteFollowUp = async (id: string) => {
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        toast({ title: "Lembrete concluído", description: "O lembrete foi marcado como concluído." });
        fetchFollowUps();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível concluir o lembrete.", variant: "destructive" });
    }
  };

  // ==================== MÉTRICAS OPERACIONAIS ====================

  const operationalMetrics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Leads por status
    const newLeads = leads.filter(l => l.status === "new").length;
    const inContactLeads = leads.filter(l => l.status === "qualification").length;
    const inVisitLeads = leads.filter(l => l.status === "visit").length;
    const proposalLeads = leads.filter(l => l.status === "proposal").length;
    const closedLeads = leads.filter(l => l.status === "contract").length;

    // Visitas
    const todayVisits = visits.filter(v => {
      const visitDate = new Date(v.scheduledFor);
      return isWithinInterval(visitDate, { start: today, end: todayEnd }) && v.status === "scheduled";
    }).length;
    const scheduledVisits = visits.filter(v => v.status === "scheduled").length;
    const completedVisits = visits.filter(v => v.status === "completed").length;

    // Propostas
    const draftContracts = contracts.filter(c => c.status === "draft").length;
    const sentContracts = contracts.filter(c => c.status === "sent").length;
    const signedContracts = contracts.filter(c => c.status === "signed").length;

    // Imóveis
    const availableProperties = properties.filter(p => p.status === "available").length;
    const featuredProperties = properties.filter(p => p.featured).length;
    const rentProperties = properties.filter(p => p.category === "rent" && p.status === "available").length;
    const saleProperties = properties.filter(p => p.category === "sale" && p.status === "available").length;

    // Taxas de conversão
    const totalLeads = leads.length || 1;
    const conversionToVisit = Math.round(((inVisitLeads + proposalLeads + closedLeads) / totalLeads) * 100);
    const conversionToProposal = Math.round(((proposalLeads + closedLeads) / totalLeads) * 100);
    const conversionToClosed = Math.round((closedLeads / totalLeads) * 100);

    return {
      newLeads,
      inContactLeads,
      inVisitLeads,
      proposalLeads,
      closedLeads,
      todayVisits,
      scheduledVisits,
      completedVisits,
      draftContracts,
      sentContracts,
      signedContracts,
      availableProperties,
      featuredProperties,
      rentProperties,
      saleProperties,
      conversionToVisit,
      conversionToProposal,
      conversionToClosed,
      totalLeads: leads.length,
    };
  }, [leads, visits, contracts, properties]);

  // ==================== PENDÊNCIAS DE HOJE ====================

  const todayPendencies = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Leads sem contato há mais de 2 dias
    const leadsWithoutContact = leads.filter(l => {
      if (l.status === "contract") return false;
      const daysSinceUpdate = differenceInDays(now, new Date(l.updatedAt));
      return daysSinceUpdate >= 2;
    });

    // Visitas de hoje
    const todayVisitsList = visits.filter(v => {
      const visitDate = new Date(v.scheduledFor);
      return isWithinInterval(visitDate, { start: today, end: todayEnd }) && v.status === "scheduled";
    }).map(visit => ({
      ...visit,
      property: properties.find(p => p.id === visit.propertyId),
      lead: leads.find(l => l.id === visit.leadId),
    }));

    // Follow-ups atrasados
    const overdueFollowUps = followUps.filter(f => {
      const dueDate = new Date(f.dueAt);
      return f.status === "pending" && isPast(dueDate) && !isToday(dueDate);
    }).map(f => ({
      ...f,
      lead: leads.find(l => l.id === f.leadId),
    }));

    // Follow-ups de hoje
    const todayFollowUps = followUps.filter(f => {
      const dueDate = new Date(f.dueAt);
      return f.status === "pending" && isToday(dueDate);
    }).map(f => ({
      ...f,
      lead: leads.find(l => l.id === f.leadId),
    }));

    return {
      leadsWithoutContact,
      todayVisitsList,
      overdueFollowUps,
      todayFollowUps,
      totalUrgent: overdueFollowUps.length + leadsWithoutContact.filter(l => l.status === "new").length,
    };
  }, [leads, visits, followUps, properties]);

  // ==================== PIPELINE DE LEADS ====================

  const pipelineData = useMemo(() => {
    const stages = [
      { key: "new", label: "Novo", color: "#3b82f6", icon: UserPlus },
      { key: "qualification", label: "Em Contato", color: "#8b5cf6", icon: MessageSquare },
      { key: "visit", label: "Em Visita", color: "#f97316", icon: Calendar },
      { key: "proposal", label: "Proposta", color: "#eab308", icon: FileText },
      { key: "contract", label: "Fechado", color: "#22c55e", icon: Handshake },
    ];

    return stages.map(stage => ({
      ...stage,
      count: leads.filter(l => l.status === stage.key).length,
      leads: leads.filter(l => l.status === stage.key).slice(0, 3),
    }));
  }, [leads]);

  // ==================== ÚLTIMOS LEADS COM TIMELINE ====================

  const recentLeads = useMemo(() => {
    return leads
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(lead => {
        const daysSinceCreated = differenceInDays(new Date(), new Date(lead.createdAt));
        const daysSinceUpdate = differenceInDays(new Date(), new Date(lead.updatedAt));

        let nextAction = "Fazer primeiro contato";
        if (lead.status === "qualification") nextAction = "Agendar visita";
        if (lead.status === "visit") nextAction = "Enviar proposta";
        if (lead.status === "proposal") nextAction = "Aguardar retorno";
        if (lead.status === "contract") nextAction = "Concluído";

        return {
          ...lead,
          daysSinceCreated,
          daysSinceUpdate,
          nextAction,
          needsAttention: daysSinceUpdate >= 2 && lead.status !== "contract",
        };
      });
  }, [leads]);

  // ==================== VISITAS DO DIA (TIMELINE) ====================

  const todayTimeline = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    return visits
      .filter(v => {
        const visitDate = new Date(v.scheduledFor);
        return isWithinInterval(visitDate, { start: today, end: todayEnd });
      })
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .map(visit => ({
        ...visit,
        property: properties.find(p => p.id === visit.propertyId),
        lead: leads.find(l => l.id === visit.leadId),
        isPast: isPast(new Date(visit.scheduledFor)),
      }));
  }, [visits, properties, leads]);

  // ==================== IMÓVEIS INTELIGENTES ====================

  const propertyInsights = useMemo(() => {
    const available = properties.filter(p => p.status === "available");
    const withoutImages = available.filter(p => !p.images || p.images.length === 0);
    const withoutDescription = available.filter(p => !p.description || p.description.length < 50);

    // Imóveis por tipo com insights
    const byType: Record<string, { total: number; available: number; rent: number; sale: number }> = {};
    properties.forEach(prop => {
      const type = prop.type === "house" ? "Casa" :
                   prop.type === "apartment" ? "Apto" :
                   prop.type === "land" ? "Terreno" :
                   prop.type === "commercial" ? "Comercial" : prop.type;
      if (!byType[type]) byType[type] = { total: 0, available: 0, rent: 0, sale: 0 };
      byType[type].total++;
      if (prop.status === "available") {
        byType[type].available++;
        if (prop.category === "rent") byType[type].rent++;
        if (prop.category === "sale") byType[type].sale++;
      }
    });

    return {
      total: properties.length,
      available: available.length,
      withoutImages: withoutImages.length,
      withoutDescription: withoutDescription.length,
      needsAttention: withoutImages.length + withoutDescription.length,
      byType: Object.entries(byType).map(([name, data]) => ({ name, ...data })),
    };
  }, [properties]);

  // ==================== HANDLERS ====================

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.email || !newLeadForm.phone) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newLeadForm.name,
          email: newLeadForm.email,
          phone: newLeadForm.phone,
          source: newLeadForm.source,
          status: "new",
        }),
      });

      if (res.ok) {
        setNewLeadOpen(false);
        setNewLeadForm({ name: "", email: "", phone: "", source: "website" });
        await refetchLeads();
        toast({ title: "Lead criado", description: "O lead foi cadastrado com sucesso." });
      }
    } catch (error) {
      console.error("Failed to create lead:", error);
      toast({ title: "Erro", description: "Não foi possível criar o lead.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  }

  const totalContractValue = useMemo(() => {
    return contracts
      .filter(c => c.status === "signed")
      .reduce((sum, c) => sum + parseCurrencyValue(c.value), 0);
  }, [contracts]);

  // Action buttons for mobile sheet
  const ActionButtons = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={inSheet ? "flex flex-col gap-3" : "hidden sm:flex gap-2"}>
      <Button
        variant="outline"
        size={inSheet ? "default" : "sm"}
        className={`${inSheet ? "justify-start min-h-[44px]" : "min-h-[36px]"} focus-visible:ring-2`}
        onClick={() => { setLocation("/properties"); inSheet && setActionsSheetOpen(false); }}
      >
        <Home className="mr-2 h-4 w-4" />
        Novo Imóvel
      </Button>
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size={inSheet ? "default" : "sm"}
            className={`${inSheet ? "justify-start min-h-[44px]" : "min-h-[36px]"} focus-visible:ring-2`}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Lead
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg xs:text-xl">Cadastrar Novo Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-4 xs:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="lead-name" className="text-sm xs:text-base">Nome</Label>
              <Input
                id="lead-name"
                value={newLeadForm.name}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                className="min-h-[44px] text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-email" className="text-sm xs:text-base">E-mail</Label>
              <Input
                id="lead-email"
                type="email"
                value={newLeadForm.email}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="min-h-[44px] text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-phone" className="text-sm xs:text-base">Telefone</Label>
              <Input
                id="lead-phone"
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="min-h-[44px] text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead-source" className="text-sm xs:text-base">Origem</Label>
              <Select
                value={newLeadForm.source}
                onValueChange={(value) => setNewLeadForm(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger className="min-h-[44px] text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Site</SelectItem>
                  <SelectItem value="referral">Indicação</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewLeadOpen(false)}
                className="min-h-[44px] focus-visible:ring-2"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-[44px] focus-visible:ring-2"
              >
                {isSubmitting ? "Salvando..." : "Salvar Lead"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Button
        size={inSheet ? "default" : "sm"}
        className={`${inSheet ? "justify-start min-h-[44px]" : "min-h-[36px]"} focus-visible:ring-2`}
        onClick={() => { setLocation("/calendar"); inSheet && setActionsSheetOpen(false); }}
      >
        <CalendarCheck className="mr-2 h-4 w-4" />
        Agendar Visita
      </Button>
    </div>
  );

  return (
    <main className="space-y-4 sm:space-y-6 lg:space-y-8">
      {/* ==================== ACTION BAR ==================== */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground truncate">
            Painel Operacional
          </h1>
          <p className="text-sm xs:text-base sm:text-lg text-muted-foreground truncate mt-0.5 sm:mt-1">
            {tenant?.name} • {format(new Date(), "EEE, dd MMM", { locale: ptBR })}
          </p>
        </div>

        {/* Mobile: Sheet with actions */}
        <Sheet open={actionsSheetOpen} onOpenChange={setActionsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden min-h-[44px] min-w-[44px] shrink-0 touch-manipulation active:scale-95 transition-transform"
              aria-label="Abrir ações rápidas"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader className="pb-4">
              <SheetTitle>Ações Rápidas</SheetTitle>
            </SheetHeader>
            <ActionButtons inSheet={true} />
          </SheetContent>
        </Sheet>

        {/* Desktop: Inline buttons */}
        <ActionButtons />
      </header>

      {/* ==================== PENDÊNCIAS DE HOJE (URGENTE) ==================== */}
      {(todayPendencies.totalUrgent > 0 || todayPendencies.todayVisitsList.length > 0 || todayPendencies.todayFollowUps.length > 0) && (
        <section aria-labelledby="pendencies-title">
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="p-4 xs:p-5 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-10 xs:w-10 sm:h-12 sm:w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <CardTitle id="pendencies-title" className="text-base xs:text-lg sm:text-xl font-bold">
                    Pendências de Hoje
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-sm xs:text-base mt-0.5">
                    {todayPendencies.overdueFollowUps.length > 0 && `${todayPendencies.overdueFollowUps.length} atrasado • `}
                    {todayPendencies.todayVisitsList.length} visita(s) • {todayPendencies.todayFollowUps.length} tarefa(s)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
              {/* Mobile: Horizontal scroll | Desktop: Grid */}
              <ScrollArea className="sm:overflow-visible">
                <div className="flex gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                  {/* Atrasados */}
                  {todayPendencies.overdueFollowUps.length > 0 && (
                    <div className="p-3 xs:p-4 sm:p-5 rounded-lg bg-red-100/50 border border-red-200 min-w-[200px] xs:min-w-[220px] sm:min-w-0 shrink-0 sm:shrink transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        <span className="text-sm sm:text-base font-semibold text-red-700">Atrasados</span>
                      </div>
                      <div className="space-y-2">
                        {todayPendencies.overdueFollowUps.slice(0, 2).map(f => (
                          <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate flex-1">{f.lead?.name || "Lead"}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[32px] min-w-[32px] p-0 shrink-0 hover:bg-red-200 focus-visible:ring-2 focus-visible:ring-red-600"
                              onClick={() => handleCompleteFollowUp(f.id)}
                              aria-label={`Marcar ${f.lead?.name} como concluído`}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visitas de Hoje */}
                  {todayPendencies.todayVisitsList.length > 0 && (
                    <div className="p-3 xs:p-4 sm:p-5 rounded-lg bg-blue-100/50 border border-blue-200 min-w-[200px] xs:min-w-[220px] sm:min-w-0 shrink-0 sm:shrink transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <span className="text-sm sm:text-base font-semibold text-blue-700">Visitas Hoje</span>
                      </div>
                      <div className="space-y-2">
                        {todayPendencies.todayVisitsList.slice(0, 2).map(v => (
                          <div key={v.id} className="text-sm">
                            <span className="font-medium">{format(new Date(v.scheduledFor), "HH:mm")}</span>
                            <span className="text-muted-foreground ml-1.5 truncate block sm:inline">
                              {v.property?.title?.slice(0, 20)}...
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tarefas de Hoje */}
                  {todayPendencies.todayFollowUps.length > 0 && (
                    <div className="p-3 xs:p-4 sm:p-5 rounded-lg bg-purple-100/50 border border-purple-200 min-w-[200px] xs:min-w-[220px] sm:min-w-0 shrink-0 sm:shrink transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <span className="text-sm sm:text-base font-semibold text-purple-700">Tarefas</span>
                      </div>
                      <div className="space-y-2">
                        {todayPendencies.todayFollowUps.slice(0, 2).map(f => (
                          <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate flex-1">{f.lead?.name || "Lead"}</span>
                            <Badge variant="secondary" className="text-xs shrink-0 px-2 py-0.5">
                              {FOLLOW_UP_TYPE_LABELS[f.type]}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
            </CardContent>
          </Card>
        </section>
      )}

      {/* ==================== KPIs DO FUNIL ==================== */}
      <section aria-labelledby="kpis-title" className="sr-only">
        <h2 id="kpis-title">Indicadores principais</h2>
      </section>
      <ScrollArea className="sm:overflow-visible">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
          {/* Imóveis Ativos */}
          <Card
            className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 touch-manipulation"
            onClick={() => setLocation("/properties")}
            role="button"
            tabIndex={0}
            aria-label="Ver imóveis ativos"
            onKeyDown={(e) => e.key === 'Enter' && setLocation("/properties")}
          >
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
                <Badge variant="secondary" className="text-xs px-2 py-0.5 shrink-0">
                  {operationalMetrics.featuredProperties} dest.
                </Badge>
              </div>
              <div>
                <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-foreground">
                  {operationalMetrics.availableProperties}
                </p>
                <p className="text-xs xs:text-sm text-muted-foreground mt-1">Imóveis Ativos</p>
              </div>
            </CardContent>
          </Card>

          {/* Leads Totais */}
          <Card
            className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 touch-manipulation"
            onClick={() => setLocation("/leads")}
            role="button"
            tabIndex={0}
            aria-label="Ver leads totais"
            onKeyDown={(e) => e.key === 'Enter' && setLocation("/leads")}
          >
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
                {operationalMetrics.newLeads > 0 && (
                  <Badge className="bg-green-500 text-white text-xs px-2 py-0.5 shrink-0">
                    {operationalMetrics.newLeads} novo
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-foreground">
                  {operationalMetrics.totalLeads}
                </p>
                <p className="text-xs xs:text-sm text-muted-foreground mt-1">Leads Totais</p>
              </div>
            </CardContent>
          </Card>

          {/* Em Atendimento */}
          <Card
            className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 touch-manipulation"
            onClick={() => setLocation("/leads")}
            role="button"
            tabIndex={0}
            aria-label="Ver leads em atendimento"
            onKeyDown={(e) => e.key === 'Enter' && setLocation("/leads")}
          >
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-foreground">
                  {operationalMetrics.inContactLeads}
                </p>
                <p className="text-xs xs:text-sm text-muted-foreground mt-1">Em Atendimento</p>
              </div>
            </CardContent>
          </Card>

          {/* Visitas Agendadas */}
          <Card
            className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 touch-manipulation"
            onClick={() => setLocation("/calendar")}
            role="button"
            tabIndex={0}
            aria-label="Ver visitas agendadas"
            onKeyDown={(e) => e.key === 'Enter' && setLocation("/calendar")}
          >
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                  <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                </div>
                {operationalMetrics.todayVisits > 0 && (
                  <Badge className="bg-orange-500 text-white text-xs px-2 py-0.5 shrink-0">
                    {operationalMetrics.todayVisits} hoje
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-foreground">
                  {operationalMetrics.scheduledVisits}
                </p>
                <p className="text-xs xs:text-sm text-muted-foreground mt-1">Visitas Agendadas</p>
              </div>
            </CardContent>
          </Card>

          {/* Propostas Ativas */}
          <Card
            className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 touch-manipulation"
            onClick={() => setLocation("/contracts")}
            role="button"
            tabIndex={0}
            aria-label="Ver propostas ativas"
            onKeyDown={(e) => e.key === 'Enter' && setLocation("/contracts")}
          >
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-lg bg-yellow-100 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600" />
                </div>
              </div>
              <div>
                <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-foreground">
                  {operationalMetrics.draftContracts + operationalMetrics.sentContracts}
                </p>
                <p className="text-xs xs:text-sm text-muted-foreground mt-1">Propostas Ativas</p>
              </div>
            </CardContent>
          </Card>

          {/* Contratos Fechados */}
          <Card
            className="transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer active:scale-95 touch-manipulation"
            onClick={() => setLocation("/contracts")}
            role="button"
            tabIndex={0}
            aria-label="Ver contratos fechados"
            onKeyDown={(e) => e.key === 'Enter' && setLocation("/contracts")}
          >
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <Handshake className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-foreground">
                  {operationalMetrics.signedContracts}
                </p>
                <p className="text-xs xs:text-sm text-muted-foreground mt-1">Contratos Fechados</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* ==================== INDICADORES DE SAÚDE ==================== */}
      <section aria-labelledby="health-title">
        <h2 id="health-title" className="sr-only">Indicadores de saúde do negócio</h2>
        <div className="grid gap-3 xs:gap-4 sm:gap-6 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="min-h-[44px] min-w-[44px] xs:h-12 xs:w-12 sm:h-14 sm:w-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Target className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs xs:text-sm text-muted-foreground truncate">Lead → Visita</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl xs:text-2xl sm:text-3xl font-bold">{operationalMetrics.conversionToVisit}%</p>
                    <Progress value={operationalMetrics.conversionToVisit} className="h-2 flex-1 hidden lg:flex" />
                  </div>
                  <Progress value={operationalMetrics.conversionToVisit} className="h-2 mt-2 lg:hidden" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="min-h-[44px] min-w-[44px] xs:h-12 xs:w-12 sm:h-14 sm:w-14 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs xs:text-sm text-muted-foreground truncate">Lead → Proposta</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl xs:text-2xl sm:text-3xl font-bold">{operationalMetrics.conversionToProposal}%</p>
                    <Progress value={operationalMetrics.conversionToProposal} className="h-2 flex-1 hidden lg:flex" />
                  </div>
                  <Progress value={operationalMetrics.conversionToProposal} className="h-2 mt-2 lg:hidden" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="min-h-[44px] min-w-[44px] xs:h-12 xs:w-12 sm:h-14 sm:w-14 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <Handshake className="h-6 w-6 sm:h-7 sm:w-7 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs xs:text-sm text-muted-foreground truncate">Lead → Fechamento</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xl xs:text-2xl sm:text-3xl font-bold">{operationalMetrics.conversionToClosed}%</p>
                    <Progress value={operationalMetrics.conversionToClosed} className="h-2 flex-1 hidden lg:flex" />
                  </div>
                  <Progress value={operationalMetrics.conversionToClosed} className="h-2 mt-2 lg:hidden" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`transition-all duration-200 hover:shadow-md ${propertyInsights.needsAttention > 0 ? "border-amber-200 bg-amber-50/20" : ""}`}>
            <CardContent className="p-4 xs:p-5 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`min-h-[44px] min-w-[44px] xs:h-12 xs:w-12 sm:h-14 sm:w-14 rounded-full flex items-center justify-center shrink-0 ${propertyInsights.needsAttention > 0 ? "bg-amber-100" : "bg-gray-100"}`}>
                  <AlertTriangle className={`h-6 w-6 sm:h-7 sm:w-7 ${propertyInsights.needsAttention > 0 ? "text-amber-600" : "text-gray-400"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs xs:text-sm text-muted-foreground truncate">Imóveis Incompletos</p>
                  <p className="text-xl xs:text-2xl sm:text-3xl font-bold mt-1">{propertyInsights.needsAttention}</p>
                  {propertyInsights.needsAttention > 0 && (
                    <p className="text-xs text-amber-600 truncate mt-1">{propertyInsights.withoutImages} sem fotos</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ==================== CONTEÚDO PRINCIPAL ==================== */}
      <div className="grid gap-4 xs:gap-6 lg:grid-cols-3 lg:gap-8">
        {/* PIPELINE VISUAL */}
        <section aria-labelledby="pipeline-title" className="lg:col-span-2">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-4 xs:p-5 sm:p-6 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base xs:text-lg sm:text-xl font-bold" id="pipeline-title">
                    Pipeline de Vendas
                  </CardTitle>
                  <CardDescription className="text-sm xs:text-base mt-0.5">
                    Funil de conversão de leads
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[36px] text-sm shrink-0 focus-visible:ring-2"
                  onClick={() => setLocation("/leads")}
                >
                  Ver CRM <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
              <ScrollArea className="sm:overflow-visible">
                <div className="flex gap-3 sm:gap-4">
                  {pipelineData.map((stage, i) => (
                    <div
                      key={stage.key}
                      className="flex-1 min-w-[130px] xs:min-w-[150px] sm:min-w-[160px] p-3 xs:p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 shrink-0 sm:shrink"
                      style={{ borderColor: stage.color + "40", backgroundColor: stage.color + "10" }}
                    >
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center gap-2">
                          <stage.icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: stage.color }} />
                          <span className="text-xs sm:text-sm font-semibold">{stage.label}</span>
                        </div>
                        <span className="text-lg sm:text-xl font-bold" style={{ color: stage.color }}>
                          {stage.count}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {stage.leads.slice(0, 2).map(lead => (
                          <div key={lead.id} className="text-xs p-1.5 rounded bg-white/80 truncate shadow-sm">
                            {lead.name}
                          </div>
                        ))}
                        {stage.count > 2 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            +{stage.count - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" className="sm:hidden" />
              </ScrollArea>
            </CardContent>
          </Card>
        </section>

        {/* AGENDA DO DIA */}
        <section aria-labelledby="agenda-title">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-4 xs:p-5 sm:p-6 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base xs:text-lg sm:text-xl font-bold" id="agenda-title">
                    Agenda de Hoje
                  </CardTitle>
                  <CardDescription className="text-sm xs:text-base mt-0.5">
                    {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-[44px] min-w-[44px] shrink-0 focus-visible:ring-2"
                  onClick={() => setLocation("/calendar")}
                  aria-label="Ver calendário completo"
                >
                  <Calendar className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
              {todayTimeline.length > 0 ? (
                <ScrollArea className="h-48 xs:h-56 sm:h-64 lg:h-80">
                  <div className="space-y-3 sm:space-y-4">
                    {todayTimeline.map((visit, i) => (
                      <div
                        key={visit.id}
                        className={`flex gap-3 p-2 xs:p-3 rounded-lg transition-all duration-200 ${
                          visit.isPast ? "opacity-60" : "hover:bg-muted/50 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`min-h-[44px] min-w-[44px] xs:h-10 xs:w-10 rounded-full flex items-center justify-center text-xs font-bold ${
                            visit.isPast ? "bg-gray-200 text-gray-500" :
                            visit.status === "completed" ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                          }`}>
                            {format(new Date(visit.scheduledFor), "HH:mm")}
                          </div>
                          {i < todayTimeline.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-2" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm xs:text-base font-semibold truncate">
                            {visit.property?.title || "Imóvel"}
                          </p>
                          <p className="text-xs xs:text-sm text-muted-foreground truncate mt-0.5">
                            {visit.lead?.name || "Cliente"}
                          </p>
                          {!visit.isPast && visit.status === "scheduled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-[32px] text-xs px-3 mt-2 focus-visible:ring-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Confirmar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-48 xs:h-56 sm:h-64 lg:h-80 flex flex-col items-center justify-center text-muted-foreground">
                  <Calendar className="h-12 w-12 sm:h-16 sm:w-16 mb-3 opacity-50" />
                  <p className="text-sm xs:text-base font-medium">Nenhuma visita hoje</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="min-h-[32px] text-sm mt-2 focus-visible:ring-2"
                    onClick={() => setLocation("/calendar")}
                  >
                    Agendar visita
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ==================== LEADS E IMÓVEIS ==================== */}
      <div className="grid gap-4 xs:gap-6 lg:grid-cols-2 lg:gap-8">
        {/* ÚLTIMOS LEADS COM TIMELINE */}
        <section aria-labelledby="recent-leads-title">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-4 xs:p-5 sm:p-6 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base xs:text-lg sm:text-xl font-bold" id="recent-leads-title">
                    Últimos Leads
                  </CardTitle>
                  <CardDescription className="text-sm xs:text-base mt-0.5 hidden sm:block">
                    Com sugestão de próximo passo
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[36px] text-sm shrink-0 focus-visible:ring-2"
                  onClick={() => setLocation("/leads")}
                >
                  Ver todos <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
              {recentLeads.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recentLeads.slice(0, 4).map((lead) => (
                    <article
                      key={lead.id}
                      className={`p-3 xs:p-4 rounded-lg border transition-all duration-200 ${
                        lead.needsAttention
                          ? "border-amber-200 bg-amber-50/50 hover:shadow-md"
                          : "hover:bg-muted/50 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="min-h-[44px] min-w-[44px] xs:h-11 xs:w-11 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base shrink-0"
                            style={{ backgroundColor: LEAD_STATUS_COLORS[lead.status] }}
                            aria-hidden="true"
                          >
                            {lead.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm xs:text-base truncate">{lead.name}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="text-xs px-2 py-0.5"
                                style={{
                                  backgroundColor: LEAD_STATUS_COLORS[lead.status] + "20",
                                  color: LEAD_STATUS_COLORS[lead.status]
                                }}
                              >
                                {LEAD_STATUS_LABELS[lead.status]}
                              </Badge>
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {SOURCE_LABELS[lead.source] || lead.source}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[36px] min-w-[36px] hover:bg-blue-100 focus-visible:ring-2"
                            aria-label={`Ligar para ${lead.name}`}
                          >
                            <PhoneCall className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[36px] min-w-[36px] hover:bg-green-100 focus-visible:ring-2"
                            aria-label={`WhatsApp para ${lead.name}`}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t flex items-center justify-between gap-2">
                        <span className="text-xs xs:text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{lead.nextAction}</span>
                        </span>
                        {lead.needsAttention && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 shrink-0 px-2">
                            {lead.daysSinceUpdate}d
                          </Badge>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="h-48 xs:h-56 sm:h-64 flex flex-col items-center justify-center text-muted-foreground">
                  <Users className="h-12 w-12 sm:h-16 sm:w-16 mb-3 opacity-50" />
                  <p className="text-sm xs:text-base font-medium">Nenhum lead cadastrado</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="min-h-[32px] text-sm mt-2 focus-visible:ring-2"
                    onClick={() => setNewLeadOpen(true)}
                  >
                    Cadastrar lead
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* IMÓVEIS POR TIPO */}
        <section aria-labelledby="property-portfolio-title">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-4 xs:p-5 sm:p-6 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base xs:text-lg sm:text-xl font-bold" id="property-portfolio-title">
                    Portfólio de Imóveis
                  </CardTitle>
                  <CardDescription className="text-sm xs:text-base mt-0.5">
                    {propertyInsights.available} disponíveis de {propertyInsights.total}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-[36px] text-sm shrink-0 focus-visible:ring-2"
                  onClick={() => setLocation("/properties")}
                >
                  Ver todos <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 xs:p-5 sm:p-6 pt-0">
              {propertyInsights.byType.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160} className="xs:!h-[180px] sm:!h-[200px] lg:!h-[220px]">
                    <BarChart data={propertyInsights.byType} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={70}
                        tick={{ fontSize: 12 }}
                        className="text-xs xs:text-sm"
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          fontSize: '13px'
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "sale") return [value, "Venda"];
                          if (name === "rent") return [value, "Aluguel"];
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="sale" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="Venda" />
                      <Bar dataKey="rent" stackId="a" fill="#22c55e" radius={[0, 4, 4, 0]} name="Aluguel" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 xs:gap-6 mt-4" role="list" aria-label="Legenda do gráfico">
                    <div className="flex items-center gap-2" role="listitem">
                      <div className="w-3 h-3 rounded bg-blue-500" aria-hidden="true" />
                      <span className="text-xs xs:text-sm text-muted-foreground">
                        Venda ({operationalMetrics.saleProperties})
                      </span>
                    </div>
                    <div className="flex items-center gap-2" role="listitem">
                      <div className="w-3 h-3 rounded bg-green-500" aria-hidden="true" />
                      <span className="text-xs xs:text-sm text-muted-foreground">
                        Aluguel ({operationalMetrics.rentProperties})
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-48 xs:h-56 sm:h-64 flex flex-col items-center justify-center text-muted-foreground">
                  <Building2 className="h-12 w-12 sm:h-16 sm:w-16 mb-3 opacity-50" />
                  <p className="text-sm xs:text-base font-medium">Nenhum imóvel cadastrado</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="min-h-[32px] text-sm mt-2 focus-visible:ring-2"
                    onClick={() => setLocation("/properties")}
                  >
                    Cadastrar imóvel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* ==================== VALOR TOTAL ==================== */}
      {totalContractValue > 0 && (
        <section aria-labelledby="total-value-title">
          <Card className="bg-gradient-to-r from-emerald-500 to-green-600 text-white overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.01]">
            <CardContent className="p-5 xs:p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4 xs:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-emerald-100 text-sm xs:text-base sm:text-lg font-medium" id="total-value-title">
                    Valor Total em Contratos Fechados
                  </p>
                  <p className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold mt-1 sm:mt-2 truncate">
                    {formatCurrency(totalContractValue)}
                  </p>
                  <p className="text-emerald-200 text-sm xs:text-base sm:text-lg mt-2 sm:mt-3">
                    {operationalMetrics.signedContracts} contrato(s) assinado(s)
                  </p>
                </div>
                <div className="min-h-[64px] min-w-[64px] xs:h-20 xs:w-20 sm:h-24 sm:w-24 lg:h-28 lg:w-28 rounded-full bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm">
                  <CircleDollarSign className="h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 lg:h-14 lg:w-14 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </main>
  );
}
