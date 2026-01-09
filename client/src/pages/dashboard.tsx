import React, { Suspense, lazy, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useImobi } from "@/lib/imobi-context";
import {
  Building2, UserPlus, CalendarCheck, Handshake, Plus, Home,
  AlertTriangle, AlertCircle, CheckCircle2, MessageSquare, PhoneCall,
  Calendar, ArrowRight, ChevronRight, CircleDollarSign, Users, Bell,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useDashboardData } from "@/hooks/useDashboardData";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardPipeline } from "@/components/dashboard/DashboardPipeline";
import { DashboardCardSkeleton } from "@/components/ui/skeleton-loaders";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { Spinner } from "@/components/ui/spinner";

// Lazy load Recharts components to reduce initial bundle size
const Bar = lazy(() => import("recharts").then(m => ({ default: m.Bar })));
const BarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const ResponsiveContainer = lazy(() => import("recharts").then(m => ({ default: m.ResponsiveContainer })));
const XAxis = lazy(() => import("recharts").then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import("recharts").then(m => ({ default: m.YAxis })));
const RechartsTooltip = lazy(() => import("recharts").then(m => ({ default: m.Tooltip })));

// Constantes
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function Dashboard() {
  const { tenant, refetchLeads, contracts, leads } = useImobi();
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
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);

  // Hook customizado com toda a lógica de dados
  const {
    metrics,
    pendencies,
    propertyInsights,
    recentLeads,
    todayTimeline,
    refetchFollowUps,
    loading: dashboardDataLoading,
  } = useDashboardData();

  const [completingFollowUp, setCompletingFollowUp] = useState<string | null>(null);

  const handleCompleteFollowUp = async (id: string) => {
    setCompletingFollowUp(id);
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed", completedAt: new Date().toISOString() }),
      });
      if (res.ok) {
        toast({ title: "Lembrete concluído", description: "O lembrete foi marcado como concluído." });
        refetchFollowUps();
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível concluir o lembrete.", variant: "destructive" });
    } finally {
      setCompletingFollowUp(null);
    }
  };


  // Pipeline de leads - Formato para DashboardPipeline component
  const pipelineStages = useMemo(() => {
    const stages = [
      { id: "new", name: "Novo", color: "#3b82f6" },
      { id: "qualification", name: "Em Contato", color: "#8b5cf6" },
      { id: "visit", name: "Em Visita", color: "#f97316" },
      { id: "proposal", name: "Proposta", color: "#eab308" },
      { id: "contract", name: "Fechado", color: "#22c55e" },
    ];

    return stages.map(stage => ({
      ...stage,
      leads: leads
        .filter(l => l.status === stage.id)
        .map(l => ({
          id: l.id,
          name: l.name,
          propertyInterest: l.interests?.[0] || undefined,
          daysInStage: Math.floor(
            (new Date().getTime() - new Date(l.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
          ),
        })),
    }));
  }, [leads]);

  // Handlers
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
                {isSubmitting ? <><Spinner size="sm" className="mr-2" /> Salvando...</> : "Salvar Lead"}
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
    <main className="space-y-6 sm:space-y-8 lg:space-y-10">
      {/* ==================== ACTION BAR ==================== */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold text-foreground truncate leading-tight">
            Painel Operacional
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground truncate mt-1 leading-relaxed">
            {tenant?.name} • {format(new Date(), "EEE, dd MMM", { locale: ptBR })}
          </p>
        </div>

        {/* Mobile: Sheet with actions */}
        <Sheet open={actionsSheetOpen} onOpenChange={setActionsSheetOpen}>
          <SheetTrigger asChild>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="sm:hidden min-h-[44px] min-w-[44px] shrink-0 touch-manipulation active:scale-95 transition-transform"
                    aria-label="Abrir ações rápidas"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrir ações rápidas</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
      {(pendencies.totalUrgent > 0 || pendencies.todayVisitsList.length > 0 || pendencies.todayFollowUps.length > 0) && (
        <section aria-labelledby="pendencies-title">
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 transition-all duration-200 hover:shadow-lg">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center gap-3">
                <div className="min-h-[44px] min-w-[44px] xs:h-10 xs:w-10 sm:h-12 sm:w-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 xs:h-5 xs:w-5 sm:h-6 sm:w-6 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <CardTitle id="pendencies-title" className="text-lg sm:text-xl font-semibold leading-tight">
                    Pendências de Hoje
                  </CardTitle>
                  <CardDescription className="text-amber-700 text-sm sm:text-base mt-1 leading-relaxed">
                    {pendencies.overdueFollowUps.length > 0 && `${pendencies.overdueFollowUps.length} atrasado • `}
                    {pendencies.todayVisitsList.length} visita(s) • {pendencies.todayFollowUps.length} tarefa(s)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {/* Mobile: Horizontal scroll | Desktop: Grid */}
              <ScrollArea className="sm:overflow-visible">
                <div className="flex gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                  {/* Atrasados */}
                  {pendencies.overdueFollowUps.length > 0 && (
                    <div className="p-3 xs:p-4 sm:p-5 rounded-lg bg-red-100/50 border border-red-200 min-w-[200px] xs:min-w-[220px] sm:min-w-0 shrink-0 sm:shrink transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        <span className="text-sm sm:text-base font-semibold text-red-700">Atrasados</span>
                      </div>
                      <div className="space-y-2">
                        {pendencies.overdueFollowUps.slice(0, 2).map(f => (
                          <div key={f.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate flex-1">{f.lead?.name || "Lead"}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="min-h-[32px] min-w-[32px] p-0 shrink-0 hover:bg-red-200 focus-visible:ring-2 focus-visible:ring-red-600"
                              onClick={() => handleCompleteFollowUp(f.id)}
                              disabled={completingFollowUp === f.id}
                              aria-label={`Marcar ${f.lead?.name} como concluído`}
                            >
                              {completingFollowUp === f.id ? <Spinner size="sm" /> : <CheckCircle2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visitas de Hoje */}
                  {pendencies.todayVisitsList.length > 0 && (
                    <div className="p-3 xs:p-4 sm:p-5 rounded-lg bg-blue-100/50 border border-blue-200 min-w-[200px] xs:min-w-[220px] sm:min-w-0 shrink-0 sm:shrink transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <span className="text-sm sm:text-base font-semibold text-blue-700">Visitas Hoje</span>
                      </div>
                      <div className="space-y-2">
                        {pendencies.todayVisitsList.slice(0, 2).map(v => (
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
                  {pendencies.todayFollowUps.length > 0 && (
                    <div className="p-3 xs:p-4 sm:p-5 rounded-lg bg-purple-100/50 border border-purple-200 min-w-[200px] xs:min-w-[220px] sm:min-w-0 shrink-0 sm:shrink transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                        <span className="text-sm sm:text-base font-semibold text-purple-700">Tarefas</span>
                      </div>
                      <div className="space-y-2">
                        {pendencies.todayFollowUps.slice(0, 2).map(f => (
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

      {/* ==================== KPIs PRINCIPAIS - COMPONENTE NOVO ==================== */}
      <PageErrorBoundary componentName="DashboardMetrics" pageName="Dashboard">
        <section aria-labelledby="kpis-title">
          <h2 id="kpis-title" className="sr-only">Indicadores principais</h2>
          <DashboardMetrics
            metrics={{
              properties: { value: metrics.availableProperties },
              leads: { value: metrics.totalLeads },
              visits: { value: metrics.scheduledVisits },
              contracts: { value: metrics.signedContracts },
            }}
            isLoading={dashboardDataLoading}
          />
        </section>
      </PageErrorBoundary>

      {/* Seção de Indicadores removida - informação redundante com KPIs principais */}

      {/* ==================== CONTEÚDO PRINCIPAL - COM DASHBOARD PIPELINE ==================== */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-3 lg:gap-10">
        {/* PIPELINE VISUAL - NOVO COMPONENTE */}
        <PageErrorBoundary componentName="DashboardPipeline" pageName="Dashboard">
          <section aria-labelledby="pipeline-title" className="lg:col-span-2">
            <Card className="transition-all duration-200 hover:shadow-md">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight" id="pipeline-title">
                      Pipeline de Vendas
                    </CardTitle>
                    <CardDescription className="text-sm sm:text-base mt-1 leading-relaxed">
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
              <CardContent className="p-4 sm:p-6 pt-0">
                <DashboardPipeline
                  stages={pipelineStages}
                  onLeadClick={(leadId) => setLocation(`/leads/${leadId}`)}
                  maxCardsVisible={3}
                />
              </CardContent>
            </Card>
          </section>
        </PageErrorBoundary>

        {/* AGENDA DO DIA */}
        <section aria-labelledby="agenda-title">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl font-semibold leading-tight" id="agenda-title">
                    Agenda de Hoje
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-1 leading-relaxed">
                    {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] shrink-0 focus-visible:ring-2"
                        onClick={() => setLocation("/calendar")}
                        aria-label="Ver calendário completo"
                      >
                        <Calendar className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver calendário completo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
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

      {/* ==================== LEADS E IMÓVEIS - COM MAIS ESPAÇO ==================== */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-10">
        {/* ÚLTIMOS LEADS COM TIMELINE */}
        <section aria-labelledby="recent-leads-title">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl font-semibold leading-tight" id="recent-leads-title">
                    Últimos Leads
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-1 leading-relaxed hidden sm:block">
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
            <CardContent className="p-4 sm:p-6 pt-0">
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
                          {/* Priorizar WhatsApp - evitar duplicação de ícones */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="min-h-[36px] min-w-[36px] hover:bg-green-100 focus-visible:ring-2"
                                  aria-label={`WhatsApp para ${lead.name}`}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Enviar WhatsApp</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl font-semibold leading-tight" id="property-portfolio-title">
                    Portfólio de Imóveis
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base mt-1 leading-relaxed">
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
            <CardContent className="p-4 sm:p-6 pt-0">
              {propertyInsights.byType.length > 0 ? (
                <>
                  <Suspense fallback={
                    <div className="h-[160px] xs:h-[180px] sm:h-[200px] lg:h-[220px] flex items-center justify-center">
                      <div className="animate-pulse text-muted-foreground text-sm">Carregando gráfico...</div>
                    </div>
                  }>
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
                        <RechartsTooltip
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
                  </Suspense>
                  <div className="flex justify-center gap-4 xs:gap-6 mt-4" role="list" aria-label="Legenda do gráfico">
                    <div className="flex items-center gap-2" role="listitem">
                      <div className="w-3 h-3 rounded bg-blue-500" aria-hidden="true" />
                      <span className="text-xs xs:text-sm text-muted-foreground">
                        Venda ({metrics.saleProperties})
                      </span>
                    </div>
                    <div className="flex items-center gap-2" role="listitem">
                      <div className="w-3 h-3 rounded bg-green-500" aria-hidden="true" />
                      <span className="text-xs xs:text-sm text-muted-foreground">
                        Aluguel ({metrics.rentProperties})
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
                    {metrics.signedContracts} contrato(s) assinado(s)
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
