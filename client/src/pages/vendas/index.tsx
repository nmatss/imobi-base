import { usePageTitle } from "@/hooks/use-page-title";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import { useImobi, User as UserType, Lead, Property } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TrendingUp,
  DollarSign,
  FileText,
  CheckCircle,
  Plus,
  Loader2,
  MoreVertical,
  Calendar,
  Building2,
  User,
  AlertTriangle,
  Filter,
  Search,
  Clock,
  XCircle,
  Eye,
  ArrowRight,
  Percent,
  Users,
  Award,
  Target,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  Sparkles,
  History,
  ChevronRight,
  ChevronLeft,
  Home,
  MapPin,
  Receipt,
  Banknote,
  FileSignature,
  Send,
  X,
  AlertCircle,
  TrendingDown,
  Flame,
  CalendarClock,
  BarChart3,
  Handshake,
  FileCheck,
  PiggyBank,
  Image as ImageIcon
} from "lucide-react";
import {
  format,
  differenceInDays,
  isPast,
  isAfter,
  isBefore,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { SalesDashboard, SalesCharts } from "./components";

// Types
type SaleProposal = {
  id: string;
  tenantId: string;
  propertyId: string;
  leadId: string;
  proposedValue: string;
  validityDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type PropertySale = {
  id: string;
  tenantId: string;
  propertyId: string;
  buyerLeadId: string;
  sellerId: string | null;
  brokerId: string | null;
  saleValue: string;
  saleDate: string;
  commissionRate: string | null;
  commissionValue: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

type ProposalDetails = SaleProposal & {
  lead?: Lead;
  property?: Property;
};

type SaleDetails = PropertySale & {
  lead?: Lead;
  property?: Property;
  broker?: UserType;
};

// Format price
function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

// Proposal status config
const PROPOSAL_STATUS = {
  pending: { label: "Pendente", color: "badge-warning", icon: Clock, stage: "proposta" },
  sent: { label: "Enviada", color: "badge-info", icon: Send, stage: "negociacao" },
  negotiating: { label: "Em Negociação", color: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400", icon: MessageCircle, stage: "negociacao" },
  accepted: { label: "Aceita", color: "badge-success", icon: CheckCircle, stage: "documentacao" },
  rejected: { label: "Recusada", color: "badge-error", icon: XCircle, stage: "rejected" },
  expired: { label: "Vencida", color: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400", icon: AlertTriangle, stage: "expired" },
};

// Pipeline stages
const PIPELINE_STAGES = [
  { id: "proposta", label: "Proposta", icon: FileText, color: "text-warning" },
  { id: "negociacao", label: "Negociação", icon: Handshake, color: "text-info" },
  { id: "documentacao", label: "Documentação", icon: FileCheck, color: "text-status-qualification" },
  { id: "fechado", label: "Fechado", icon: CheckCircle, color: "text-success" },
];

// Period options
const PERIOD_OPTIONS = [
  { value: "month", label: "Mês Atual" },
  { value: "quarter", label: "Último Trimestre" },
  { value: "year", label: "Ano Atual" },
  { value: "all", label: "Todo Período" },
];

// Closing probability options
const PROBABILITY_OPTIONS = [
  { value: "low", label: "Baixa", color: "text-red-600", percent: 25 },
  { value: "medium", label: "Média", color: "text-amber-600", percent: 50 },
  { value: "high", label: "Alta", color: "text-green-600", percent: 75 },
  { value: "very_high", label: "Muito Alta", color: "text-emerald-600", percent: 90 },
];

// Lead sources
const LEAD_SOURCES = [
  { value: "site", label: "Site" },
  { value: "portal", label: "Portal" },
  { value: "indicacao", label: "Indicação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "presencial", label: "Presencial" },
];

// AI Prompts for sales
const AI_PROMPTS = [
  {
    id: "send_proposal",
    label: "E-mail de envio de proposta",
    icon: Send,
    template: (data: any) =>
      `Prezado(a) ${data.lead?.name || "Cliente"},\n\nConforme nosso último contato, tenho o prazer de apresentar nossa proposta para o imóvel ${data.property?.title || ""}, localizado em ${data.property?.address || ""}.\n\nValor proposto: ${formatPrice(data.proposedValue || data.saleValue || "0")}\n\nEsta proposta é válida até ${data.validityDate ? format(new Date(data.validityDate), "dd/MM/yyyy") : "prazo a definir"}.\n\nAguardo seu retorno para discutirmos os próximos passos.\n\nAtenciosamente,\nEquipe Imobiliária`
  },
  {
    id: "follow_up",
    label: "Follow-up de proposta",
    icon: Clock,
    template: (data: any) =>
      `Olá ${data.lead?.name || ""}!\n\nEspero que esteja bem. Estou entrando em contato para saber se teve a oportunidade de analisar nossa proposta para o imóvel ${data.property?.title || ""}.\n\n${data.validityDate ? `Lembro que a proposta é válida até ${format(new Date(data.validityDate), "dd/MM/yyyy")}.` : ""}\n\nFico à disposição para esclarecer qualquer dúvida ou agendar uma nova visita.\n\nAbraços!`
  },
  {
    id: "explain_conditions",
    label: "Explicar condições comerciais",
    icon: FileText,
    template: (data: any) =>
      `Olá ${data.lead?.name || ""}!\n\nSegue um resumo das condições comerciais da nossa proposta:\n\n📍 Imóvel: ${data.property?.title || ""}\n💰 Valor: ${formatPrice(data.proposedValue || data.saleValue || "0")}\n📋 Condições: ${data.notes || "À vista ou via financiamento bancário"}\n\nO processo de compra envolve:\n1. Aceite formal da proposta\n2. Análise de documentação\n3. Elaboração do contrato\n4. Assinatura e registro\n\nDúvidas? Estou à disposição!`
  },
  {
    id: "closing_message",
    label: "Mensagem de fechamento",
    icon: CheckCircle,
    template: (data: any) =>
      `Parabéns ${data.lead?.name || ""}! 🎉\n\nÉ com grande satisfação que confirmamos o fechamento da venda do imóvel ${data.property?.title || ""}!\n\nValor: ${formatPrice(data.saleValue || "0")}\nData: ${data.saleDate ? format(new Date(data.saleDate), "dd/MM/yyyy") : "A definir"}\n\nNossos próximos passos:\n1. Documentação\n2. Contrato\n3. Escritura\n\nBem-vindo ao seu novo lar!`
  },
];

// Wizard steps
const WIZARD_STEPS = [
  { id: "source", title: "Origem", description: "Selecione proposta ou lead" },
  { id: "values", title: "Valores", description: "Defina valores e comissões" },
  { id: "payment", title: "Pagamento", description: "Condições de pagamento" },
  { id: "confirm", title: "Confirmar", description: "Revise e confirme" },
];

type Filters = {
  search: string;
  status: string;
  period: string;
  brokerId: string;
  source: string;
  pipelineStage: string;
};

export default function VendasPage() {
  usePageTitle("Vendas");
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { leads, properties, tenant, user } = useImobi();
  const { toast } = useToast();

  // Data state
  const [proposals, setProposals] = useState<SaleProposal[]>([]);
  const [sales, setSales] = useState<PropertySale[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  // Filter state
  const [filters, setFilters] = useState<Filters>({
    search: "",
    status: "",
    period: "month",
    brokerId: "",
    source: "",
    pipelineStage: "",
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modals
  const [isProposalModalOpen, setIsProposalModalOpen] = useState(false);
  const [isSaleWizardOpen, setIsSaleWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail panel
  const [selectedProposal, setSelectedProposal] = useState<ProposalDetails | null>(null);
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState<"proposal" | "sale">("proposal");

  // AI state
  const [aiMessage, setAiMessage] = useState("");

  // Form states
  const [proposalForm, setProposalForm] = useState({
    propertyId: "",
    leadId: "",
    proposedValue: "",
    validityDate: "",
    probability: "medium",
    notes: "",
  });

  const [saleForm, setSaleForm] = useState({
    sourceType: "direct", // "proposal" or "direct"
    proposalId: "",
    propertyId: "",
    buyerLeadId: "",
    brokerId: "",
    saleValue: "",
    saleDate: new Date().toISOString().split("T")[0],
    commissionRate: "6",
    brokerCommissionRate: "40", // 40% of total commission goes to broker
    discount: "",
    paymentMethod: "avista",
    installments: "",
    downPayment: "",
    notes: "",
  });

  // Fetch data
  const fetchData = async () => {
    try {
      const [proposalsRes, salesRes, usersRes] = await Promise.all([
        fetch("/api/sale-proposals", { credentials: "include" }),
        fetch("/api/property-sales", { credentials: "include" }),
        fetch("/api/users", { credentials: "include" }),
      ]);

      if (proposalsRes.ok) setProposals(await proposalsRes.json());
      if (salesRes.ok) setSales(await salesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get period date range
  const getPeriodRange = useCallback((period: string) => {
    const now = new Date();
    switch (period) {
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "year":
        return { start: startOfYear(now), end: endOfYear(now) };
      default:
        return { start: new Date(0), end: now };
    }
  }, []);

  // Get details helpers
  const getProposalDetails = useCallback((proposal: SaleProposal): ProposalDetails => {
    const lead = leads.find(l => l.id === proposal.leadId);
    const property = properties.find(p => p.id === proposal.propertyId);
    return { ...proposal, lead, property };
  }, [leads, properties]);

  const getSaleDetails = useCallback((sale: PropertySale): SaleDetails => {
    const lead = leads.find(l => l.id === sale.buyerLeadId);
    const property = properties.find(p => p.id === sale.propertyId);
    const broker = users.find(u => u.id === sale.brokerId);
    return { ...sale, lead, property, broker };
  }, [leads, properties, users]);

  // Calculate KPIs with comparison to previous period
  const kpis = useMemo(() => {
    const range = getPeriodRange(filters.period);

    // Calculate previous period range
    const periodDiff = range.end.getTime() - range.start.getTime();
    const prevRange = {
      start: new Date(range.start.getTime() - periodDiff),
      end: range.start
    };

    // Filter sales by period
    const periodSales = sales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return isAfter(saleDate, range.start) && isBefore(saleDate, range.end);
    });

    // Filter sales by previous period
    const prevPeriodSales = sales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return isAfter(saleDate, prevRange.start) && isBefore(saleDate, prevRange.end);
    });

    // Filter proposals by period
    const periodProposals = proposals.filter(p => {
      const createdAt = new Date(p.createdAt);
      return isAfter(createdAt, range.start) && isBefore(createdAt, range.end);
    });

    // Current period metrics
    const totalSalesValue = periodSales.reduce((acc, s) => acc + parseFloat(s.saleValue || "0"), 0);
    const totalCommissions = periodSales.reduce((acc, s) => acc + parseFloat(s.commissionValue || "0"), 0);
    const avgTicket = periodSales.length > 0 ? totalSalesValue / periodSales.length : 0;

    // Previous period metrics
    const prevTotalSalesValue = prevPeriodSales.reduce((acc, s) => acc + parseFloat(s.saleValue || "0"), 0);
    const prevTotalCommissions = prevPeriodSales.reduce((acc, s) => acc + parseFloat(s.commissionValue || "0"), 0);
    const prevAvgTicket = prevPeriodSales.length > 0 ? prevTotalSalesValue / prevPeriodSales.length : 0;

    // Calculate trends
    const salesValueTrend = prevTotalSalesValue > 0
      ? ((totalSalesValue - prevTotalSalesValue) / prevTotalSalesValue) * 100
      : 0;
    const salesCountTrend = prevPeriodSales.length > 0
      ? ((periodSales.length - prevPeriodSales.length) / prevPeriodSales.length) * 100
      : 0;
    const avgTicketTrend = prevAvgTicket > 0
      ? ((avgTicket - prevAvgTicket) / prevAvgTicket) * 100
      : 0;
    const commissionsTrend = prevTotalCommissions > 0
      ? ((totalCommissions - prevTotalCommissions) / prevTotalCommissions) * 100
      : 0;

    // Conversion rate: accepted proposals / total proposals (excluding pending)
    const finishedProposals = periodProposals.filter(p => ["accepted", "rejected", "expired"].includes(p.status));
    const acceptedProposals = periodProposals.filter(p => p.status === "accepted");
    const conversionRate = finishedProposals.length > 0
      ? (acceptedProposals.length / finishedProposals.length) * 100
      : 0;

    return {
      totalSales: periodSales.length,
      totalSalesValue,
      totalCommissions,
      avgTicket,
      conversionRate: conversionRate.toFixed(1),
      pendingProposals: periodProposals.filter(p => p.status === "pending").length,
      acceptedProposals: acceptedProposals.length,
      // Trends
      salesValueTrend: salesValueTrend.toFixed(1),
      salesCountTrend: salesCountTrend.toFixed(1),
      avgTicketTrend: avgTicketTrend.toFixed(1),
      commissionsTrend: commissionsTrend.toFixed(1),
    };
  }, [sales, proposals, filters.period, getPeriodRange]);

  // Performance by broker
  const brokerPerformance = useMemo(() => {
    const range = getPeriodRange(filters.period);
    const periodSales = sales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return isAfter(saleDate, range.start) && isBefore(saleDate, range.end);
    });

    const performance: Record<string, { name: string; count: number; value: number; commission: number }> = {};

    periodSales.forEach(sale => {
      const brokerId = sale.brokerId || "unassigned";
      const broker = users.find(u => u.id === sale.brokerId);

      if (!performance[brokerId]) {
        performance[brokerId] = {
          name: broker?.name || "Não atribuído",
          count: 0,
          value: 0,
          commission: 0,
        };
      }

      performance[brokerId].count++;
      performance[brokerId].value += parseFloat(sale.saleValue || "0");
      performance[brokerId].commission += parseFloat(sale.commissionValue || "0");
    });

    return Object.values(performance).sort((a, b) => b.value - a.value);
  }, [sales, users, filters.period, getPeriodRange]);

  // Performance by lead source
  const sourcePerformance = useMemo(() => {
    const range = getPeriodRange(filters.period);
    const periodSales = sales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return isAfter(saleDate, range.start) && isBefore(saleDate, range.end);
    });

    const performance: Record<string, { source: string; count: number; value: number }> = {};

    periodSales.forEach(sale => {
      const lead = leads.find(l => l.id === sale.buyerLeadId);
      const source = lead?.source || "outros";

      if (!performance[source]) {
        performance[source] = { source, count: 0, value: 0 };
      }

      performance[source].count++;
      performance[source].value += parseFloat(sale.saleValue || "0");
    });

    return Object.values(performance).sort((a, b) => b.value - a.value);
  }, [sales, leads, filters.period, getPeriodRange]);

  // Filter proposals
  const filteredProposals = useMemo(() => {
    const range = getPeriodRange(filters.period);

    return proposals.filter(p => {
      // Period filter
      const createdAt = new Date(p.createdAt);
      if (!isAfter(createdAt, range.start) || !isBefore(createdAt, range.end)) {
        if (filters.period !== "all") return false;
      }

      // Status filter
      if (filters.status && p.status !== filters.status) return false;

      // Pipeline stage filter
      if (filters.pipelineStage) {
        const statusConfig = PROPOSAL_STATUS[p.status as keyof typeof PROPOSAL_STATUS];
        if (statusConfig && statusConfig.stage !== filters.pipelineStage) return false;
      }

      // Search filter
      if (filters.search) {
        const details = getProposalDetails(p);
        const searchLower = filters.search.toLowerCase();
        const matchesLead = details.lead?.name.toLowerCase().includes(searchLower);
        const matchesProperty = details.property?.title?.toLowerCase().includes(searchLower);
        if (!matchesLead && !matchesProperty) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [proposals, filters, getPeriodRange, getProposalDetails]);

  // Filter sales
  const filteredSales = useMemo(() => {
    const range = getPeriodRange(filters.period);

    return sales.filter(s => {
      // Period filter
      const saleDate = new Date(s.saleDate);
      if (filters.period !== "all") {
        if (!isAfter(saleDate, range.start) || !isBefore(saleDate, range.end)) return false;
      }

      // Broker filter
      if (filters.brokerId && s.brokerId !== filters.brokerId) return false;

      // Search filter
      if (filters.search) {
        const details = getSaleDetails(s);
        const searchLower = filters.search.toLowerCase();
        const matchesLead = details.lead?.name.toLowerCase().includes(searchLower);
        const matchesProperty = details.property?.title?.toLowerCase().includes(searchLower);
        if (!matchesLead && !matchesProperty) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, filters, getPeriodRange, getSaleDetails]);

  // Group proposals by pipeline stage
  const proposalsByStage = useMemo(() => {
    const grouped: Record<string, ProposalDetails[]> = {
      proposta: [],
      negociacao: [],
      documentacao: [],
      fechado: [],
    };

    filteredProposals.forEach(p => {
      const statusConfig = PROPOSAL_STATUS[p.status as keyof typeof PROPOSAL_STATUS];
      if (statusConfig) {
        const stage = statusConfig.stage;
        if (grouped[stage]) {
          grouped[stage].push(getProposalDetails(p));
        }
      }
    });

    return grouped;
  }, [filteredProposals, getProposalDetails]);

  // Critical opportunities
  const criticalOpportunities = useMemo(() => {
    const opportunities: { type: string; message: string; item: any; severity: "high" | "medium" | "low" }[] = [];

    // Proposals expiring soon (within 3 days)
    proposals.filter(p => {
      if (p.status !== "pending" || !p.validityDate) return false;
      const daysUntil = differenceInDays(new Date(p.validityDate), new Date());
      return daysUntil >= 0 && daysUntil <= 3;
    }).forEach(p => {
      const details = getProposalDetails(p);
      const daysUntil = differenceInDays(new Date(p.validityDate!), new Date());
      opportunities.push({
        type: "expiring",
        message: `Proposta para ${details.lead?.name || "Cliente"} vence em ${daysUntil} dia(s)`,
        item: p,
        severity: daysUntil <= 1 ? "high" : "medium",
      });
    });

    // High-value proposals stalled (pending for more than 7 days)
    proposals.filter(p => {
      if (p.status !== "pending") return false;
      const value = parseFloat(p.proposedValue);
      const daysOld = differenceInDays(new Date(), new Date(p.createdAt));
      return value >= 500000 && daysOld >= 7;
    }).forEach(p => {
      const details = getProposalDetails(p);
      const daysOld = differenceInDays(new Date(), new Date(p.createdAt));
      opportunities.push({
        type: "stalled",
        message: `Proposta de ${formatPrice(p.proposedValue)} parada há ${daysOld} dias`,
        item: p,
        severity: "high",
      });
    });

    // Accepted proposals without sale registered
    proposals.filter(p => {
      if (p.status !== "accepted") return false;
      const hasSale = sales.some(s => s.propertyId === p.propertyId && s.buyerLeadId === p.leadId);
      return !hasSale;
    }).forEach(p => {
      const details = getProposalDetails(p);
      opportunities.push({
        type: "pending_sale",
        message: `Proposta aceita de ${details.lead?.name || "Cliente"} sem venda registrada`,
        item: p,
        severity: "medium",
      });
    });

    // Sales without commission registered
    sales.filter(s => !s.commissionValue || parseFloat(s.commissionValue) === 0).forEach(s => {
      const details = getSaleDetails(s);
      opportunities.push({
        type: "no_commission",
        message: `Venda para ${details.lead?.name || "Cliente"} sem comissão registrada`,
        item: s,
        severity: "low",
      });
    });

    return opportunities.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }, [proposals, sales, getProposalDetails, getSaleDetails]);

  // Create proposal
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        propertyId: proposalForm.propertyId,
        leadId: proposalForm.leadId,
        proposedValue: proposalForm.proposedValue,
        validityDate: proposalForm.validityDate || null,
        notes: proposalForm.notes ? `[PROB:${proposalForm.probability}] ${proposalForm.notes}` : `[PROB:${proposalForm.probability}]`,
        status: "pending",
      };

      await apiRequest("POST", "/api/sale-proposals", payload);

      toast({
        title: "Proposta criada",
        description: "A proposta de venda foi registrada com sucesso.",
      });

      setIsProposalModalOpen(false);
      setProposalForm({ propertyId: "", leadId: "", proposedValue: "", validityDate: "", probability: "medium", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create sale
  const handleCreateSale = async () => {
    setIsSubmitting(true);

    try {
      const saleValue = parseFloat(saleForm.saleValue);
      const commissionRate = parseFloat(saleForm.commissionRate) || 6;
      const commissionValue = (saleValue * commissionRate / 100).toFixed(2);

      const payload = {
        propertyId: saleForm.propertyId,
        buyerLeadId: saleForm.buyerLeadId,
        brokerId: saleForm.brokerId || null,
        saleValue: saleForm.saleValue,
        saleDate: new Date(saleForm.saleDate).toISOString(),
        commissionRate: saleForm.commissionRate,
        commissionValue,
        notes: saleForm.notes || null,
        status: "completed",
      };

      await apiRequest("POST", "/api/property-sales", payload);

      // Update proposal status if from proposal
      if (saleForm.sourceType === "proposal" && saleForm.proposalId) {
        await apiRequest("PATCH", `/api/sale-proposals/${saleForm.proposalId}`, { status: "accepted" });
      }

      toast({
        title: "Venda registrada",
        description: "A venda foi registrada com sucesso.",
      });

      setIsSaleWizardOpen(false);
      setWizardStep(0);
      setSaleForm({
        sourceType: "direct",
        proposalId: "",
        propertyId: "",
        buyerLeadId: "",
        brokerId: "",
        saleValue: "",
        saleDate: new Date().toISOString().split("T")[0],
        commissionRate: "6",
        brokerCommissionRate: "40",
        discount: "",
        paymentMethod: "avista",
        installments: "",
        downPayment: "",
        notes: "",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update proposal status
  const handleUpdateProposalStatus = async (id: string, status: string) => {
    try {
      await apiRequest("PATCH", `/api/sale-proposals/${id}`, { status });

      const statusLabels: Record<string, string> = {
        sent: "enviada",
        negotiating: "em negociação",
        accepted: "aceita",
        rejected: "rejeitada",
        expired: "vencida",
      };

      toast({
        title: "Status atualizado",
        description: `Proposta marcada como ${statusLabels[status] || status}.`,
      });

      fetchData();
      setIsDetailOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Open detail panel
  const openProposalDetail = (proposal: SaleProposal) => {
    setSelectedProposal(getProposalDetails(proposal));
    setSelectedSale(null);
    setDetailType("proposal");
    setAiMessage("");
    setIsDetailOpen(true);
  };

  const openSaleDetail = (sale: PropertySale) => {
    setSelectedSale(getSaleDetails(sale));
    setSelectedProposal(null);
    setDetailType("sale");
    setAiMessage("");
    setIsDetailOpen(true);
  };

  // Open sale wizard from proposal
  const openSaleWizardFromProposal = (proposal: SaleProposal) => {
    const details = getProposalDetails(proposal);
    setSaleForm({
      sourceType: "proposal",
      proposalId: proposal.id,
      propertyId: proposal.propertyId,
      buyerLeadId: proposal.leadId,
      brokerId: "",
      saleValue: proposal.proposedValue,
      saleDate: new Date().toISOString().split("T")[0],
      commissionRate: "6",
      brokerCommissionRate: "40",
      discount: "",
      paymentMethod: "avista",
      installments: "",
      downPayment: "",
      notes: proposal.notes?.replace(/\[PROB:\w+\]\s*/g, "") || "",
    });
    setWizardStep(1); // Skip source selection
    setIsSaleWizardOpen(true);
  };

  // Wizard navigation
  const nextStep = () => {
    if (wizardStep < WIZARD_STEPS.length - 1) {
      setWizardStep(wizardStep + 1);
    }
  };

  const prevStep = () => {
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
    }
  };

  // Can proceed validation
  const canProceed = useMemo(() => {
    switch (wizardStep) {
      case 0:
        return saleForm.sourceType === "proposal"
          ? !!saleForm.proposalId
          : !!saleForm.propertyId && !!saleForm.buyerLeadId;
      case 1:
        return !!saleForm.saleValue;
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  }, [wizardStep, saleForm]);

  // Calculate commissions
  const commissionCalc = useMemo(() => {
    const saleValue = parseFloat(saleForm.saleValue) || 0;
    const commissionRate = parseFloat(saleForm.commissionRate) || 6;
    const brokerRate = parseFloat(saleForm.brokerCommissionRate) || 40;
    const discount = parseFloat(saleForm.discount) || 0;

    const totalCommission = saleValue * (commissionRate / 100);
    const brokerCommission = totalCommission * (brokerRate / 100);
    const agencyCommission = totalCommission - brokerCommission;
    const ownerPayout = saleValue - totalCommission - discount;

    return {
      totalCommission,
      brokerCommission,
      agencyCommission,
      ownerPayout,
    };
  }, [saleForm.saleValue, saleForm.commissionRate, saleForm.brokerCommissionRate, saleForm.discount]);

  // Get status config
  const getStatusConfig = (status: string) => PROPOSAL_STATUS[status as keyof typeof PROPOSAL_STATUS] || PROPOSAL_STATUS.pending;

  // Parse probability from notes
  const getProbability = (notes: string | null) => {
    if (!notes) return "medium";
    const match = notes.match(/\[PROB:(\w+)\]/);
    return match ? match[1] : "medium";
  };

  // Send to WhatsApp
  const sendToWhatsApp = (phone?: string) => {
    if (!phone || !aiMessage) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(aiMessage)}`;
    window.open(url, "_blank");
  };

  const availableProperties = properties.filter(p => p.status === "available" && p.category === "sale");
  const pendingProposals = proposals.filter(p => ["pending", "sent", "negotiating"].includes(p.status));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Vendas</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gerencie propostas e vendas de imóveis</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {PERIOD_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant={filters.period === opt.value ? "default" : "ghost"}
                  size="sm"
                  className="h-8 text-xs px-3"
                  onClick={() => setFilters(f => ({ ...f, period: opt.value }))}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Filtre propostas e vendas</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Lead ou imóvel..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="pl-9 h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Status (Propostas)</Label>
                    <Select
                      value={filters.status || "__all__"}
                      onValueChange={(v) => setFilters(f => ({ ...f, status: v === "__all__" ? "" : v }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os status</SelectItem>
                        {Object.entries(PROPOSAL_STATUS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Corretor</Label>
                    <Select
                      value={filters.brokerId || "__all__"}
                      onValueChange={(v) => setFilters(f => ({ ...f, brokerId: v === "__all__" ? "" : v }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Todos os corretores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os corretores</SelectItem>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full h-11"
                    onClick={() => setFilters({ search: "", status: "", period: "month", brokerId: "", source: "", pipelineStage: "" })}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => setIsProposalModalOpen(true)}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Nova Proposta</span>
            </Button>

            <Button
              size="sm"
              className="gap-1.5 h-9"
              onClick={() => {
                setSaleForm({ ...saleForm, sourceType: "direct" });
                setWizardStep(0);
                setIsSaleWizardOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Registrar Venda</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards - 2x2 grid on mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-6 sm:gap-8">
          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-green-500 rounded-xl shrink-0">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-green-600 font-medium mb-0.5">Total em Vendas</p>
                    <p className="text-base sm:text-xl font-bold text-green-700 truncate">
                      {formatPrice(kpis.totalSalesValue)}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  parseFloat(kpis.salesValueTrend) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {parseFloat(kpis.salesValueTrend) >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(parseFloat(kpis.salesValueTrend))}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-blue-500 rounded-xl shrink-0">
                    <Target className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-blue-600 font-medium mb-0.5">Vendas</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700">{kpis.totalSales}</p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  parseFloat(kpis.salesCountTrend) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {parseFloat(kpis.salesCountTrend) >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(parseFloat(kpis.salesCountTrend))}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-purple-500 rounded-xl shrink-0">
                    <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-purple-600 font-medium mb-0.5">Ticket Médio</p>
                    <p className="text-base sm:text-xl font-bold text-purple-700 truncate">
                      {formatPrice(kpis.avgTicket)}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  parseFloat(kpis.avgTicketTrend) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {parseFloat(kpis.avgTicketTrend) >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(parseFloat(kpis.avgTicketTrend))}%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-amber-500 rounded-xl shrink-0">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-amber-600 font-medium mb-0.5">Conversão</p>
                  <p className="text-xl sm:text-2xl font-bold text-amber-700">{kpis.conversionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-emerald-500 rounded-xl shrink-0">
                    <Percent className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-emerald-600 font-medium mb-0.5">Comissões</p>
                    <p className="text-base sm:text-xl font-bold text-emerald-700 truncate">
                      {formatPrice(kpis.totalCommissions)}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  parseFloat(kpis.commissionsTrend) >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {parseFloat(kpis.commissionsTrend) >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(parseFloat(kpis.commissionsTrend))}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Opportunities */}
        {criticalOpportunities.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                <Flame className="h-4 w-4" />
                Oportunidades Críticas ({criticalOpportunities.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 max-h-[150px] overflow-y-auto">
                {criticalOpportunities.slice(0, 5).map((opp, i) => (
                  <button
                    key={i}
                    className={cn(
                      "w-full flex items-center gap-3 text-sm p-3 rounded-xl transition-all active:scale-[0.98]",
                      opp.severity === "high" && "bg-red-100 text-red-800 hover:bg-red-200",
                      opp.severity === "medium" && "bg-amber-100 text-amber-800 hover:bg-amber-200",
                      opp.severity === "low" && "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    )}
                    onClick={() => {
                      if (opp.type === "no_commission") {
                        openSaleDetail(opp.item);
                      } else {
                        openProposalDetail(opp.item);
                      }
                    }}
                  >
                    {opp.severity === "high" && <AlertTriangle className="h-4 w-4 shrink-0" />}
                    {opp.severity === "medium" && <AlertCircle className="h-4 w-4 shrink-0" />}
                    {opp.severity === "low" && <Clock className="h-4 w-4 shrink-0" />}
                    <span className="flex-1 text-left truncate">{opp.message}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content - Pipeline Kanban or List */}
      <Tabs defaultValue="dashboard" className="space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <TabsList className="w-auto">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5 text-xs sm:text-sm">
              <Handshake className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-1.5 text-xs sm:text-sm">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Vendas</span>
              <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs">{filteredSales.length}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Tab - Analytics & Charts */}
        <TabsContent value="dashboard" className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
          {/* KPI Dashboard */}
          <SalesDashboard kpis={kpis} period={filters.period} />

          {/* Charts */}
          <SalesCharts
            salesByMonth={(() => {
              // Process sales data by month for chart
              const monthMap: Record<string, { value: number; count: number }> = {};
              sales.forEach(sale => {
                const date = new Date(sale.saleDate);
                const monthKey = format(date, "MMM/yy", { locale: ptBR });
                if (!monthMap[monthKey]) {
                  monthMap[monthKey] = { value: 0, count: 0 };
                }
                monthMap[monthKey].value += parseFloat(sale.saleValue || "0");
                monthMap[monthKey].count++;
              });
              return Object.entries(monthMap)
                .map(([month, data]) => ({ month, ...data }))
                .sort((a, b) => {
                  const [aMonth, aYear] = a.month.split("/");
                  const [bMonth, bYear] = b.month.split("/");
                  return new Date(`20${aYear}-${aMonth}-01`).getTime() - new Date(`20${bYear}-${bMonth}-01`).getTime();
                });
            })()}
            conversionFunnel={PIPELINE_STAGES.map(stage => {
              const stageProposals = proposalsByStage[stage.id] || [];
              return {
                stage: stage.label,
                count: stageProposals.length,
                value: stageProposals.reduce((acc, p) => acc + parseFloat(p.proposedValue || "0"), 0),
              };
            })}
            sourcePerformance={sourcePerformance.map(s => ({
              source: LEAD_SOURCES.find(ls => ls.value === s.source)?.label || s.source,
              count: s.count,
              value: s.value,
            }))}
            brokerPerformance={brokerPerformance}
          />
        </TabsContent>

        {/* Pipeline View - Kanban */}
        <TabsContent value="pipeline" className="mt-6 sm:mt-8 space-y-6 sm:space-y-8">
          {/* Mobile: Horizontal scroll kanban */}
          <div className="lg:hidden">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4">
              {PIPELINE_STAGES.map(stage => {
                const StageIcon = stage.icon;
                const stageProposals = proposalsByStage[stage.id] || [];
                const stageValue = stageProposals.reduce((acc, p) => acc + parseFloat(p.proposedValue || "0"), 0);

                return (
                  <div key={stage.id} className="snap-center min-w-[85vw] sm:min-w-[320px] flex-shrink-0">
                    <Card className="h-full">
                      <CardHeader className="p-4 pb-3 bg-muted/30 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("p-1.5 rounded-lg bg-white", stage.color)}>
                              <StageIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-sm font-semibold">{stage.label}</CardTitle>
                              <p className="text-xs text-muted-foreground">{stageProposals.length} propostas</p>
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-primary mt-2">{formatPrice(stageValue)}</p>
                      </CardHeader>
                      <CardContent className="p-3">
                        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                          {stageProposals.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-8">Nenhuma proposta</p>
                          ) : (
                            stageProposals.map(proposal => {
                              const statusConfig = getStatusConfig(proposal.status);
                              const probability = getProbability(proposal.notes);
                              const probConfig = PROBABILITY_OPTIONS.find(p => p.value === probability);

                              return (
                                <button
                                  key={proposal.id}
                                  onClick={() => openProposalDetail(proposal)}
                                  className="w-full p-4 rounded-xl border bg-card hover:shadow-md transition-all active:scale-[0.98] text-left space-y-3"
                                >
                                  {/* Property image placeholder */}
                                  <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                    {proposal.property?.images?.[0] ? (
                                      <img
                                        src={proposal.property.images[0]}
                                        alt={proposal.property.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <div>
                                      <h4 className="font-semibold text-sm line-clamp-1">
                                        {proposal.property?.title || "Imóvel"}
                                      </h4>
                                      <p className="text-xs text-muted-foreground line-clamp-1">
                                        {proposal.property?.address || "Endereço não informado"}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <User className="h-3 w-3" />
                                      <span className="truncate">{proposal.lead?.name || "Cliente"}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-xl font-bold text-primary">
                                          {formatPrice(proposal.proposedValue)}
                                        </p>
                                        {probConfig && (
                                          <p className={cn("text-xs font-medium", probConfig.color)}>
                                            {probConfig.percent}% probabilidade
                                          </p>
                                        )}
                                      </div>
                                      <Badge variant="outline" className={cn("text-[10px]", statusConfig.color)}>
                                        {statusConfig.label}
                                      </Badge>
                                    </div>

                                    {/* Quick actions */}
                                    <div className="flex gap-2 pt-2 border-t">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="flex-1 h-8 text-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (proposal.lead?.phone) {
                                            const clean = proposal.lead.phone.replace(/\D/g, "");
                                            window.open(`https://wa.me/55${clean}`, "_blank");
                                          }
                                        }}
                                      >
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        Contato
                                      </Button>
                                      {proposal.property?.id && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="flex-1 h-8 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setLocation(`/properties/${proposal.property?.id}`);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-1" />
                                          Imóvel
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desktop: Full kanban board */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-6 sm:gap-8">
            {PIPELINE_STAGES.map(stage => {
              const StageIcon = stage.icon;
              const stageProposals = proposalsByStage[stage.id] || [];
              const stageValue = stageProposals.reduce((acc, p) => acc + parseFloat(p.proposedValue || "0"), 0);

              return (
                <Card key={stage.id} className="flex flex-col h-[calc(100vh-400px)]">
                  <CardHeader className="p-4 pb-3 bg-muted/30 border-b shrink-0">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg bg-white", stage.color)}>
                        <StageIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold">{stage.label}</CardTitle>
                        <p className="text-xs text-muted-foreground">{stageProposals.length} propostas</p>
                      </div>
                    </div>
                    <p className="text-sm font-bold text-primary mt-2">{formatPrice(stageValue)}</p>
                  </CardHeader>
                  <ScrollArea className="flex-1">
                    <CardContent className="p-3 space-y-3">
                      {stageProposals.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">Nenhuma proposta</p>
                      ) : (
                        stageProposals.map(proposal => {
                          const statusConfig = getStatusConfig(proposal.status);
                          const probability = getProbability(proposal.notes);
                          const probConfig = PROBABILITY_OPTIONS.find(p => p.value === probability);

                          return (
                            <button
                              key={proposal.id}
                              onClick={() => openProposalDetail(proposal)}
                              className="w-full p-3 rounded-xl border bg-card hover:shadow-md transition-all text-left space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm line-clamp-1">
                                    {proposal.property?.title || "Imóvel"}
                                  </h4>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {proposal.lead?.name || "Cliente"}
                                  </p>
                                </div>
                                <Badge variant="outline" className={cn("text-[10px] shrink-0", statusConfig.color)}>
                                  {statusConfig.label}
                                </Badge>
                              </div>

                              <div className="flex items-baseline justify-between">
                                <p className="text-lg font-bold text-primary">
                                  {formatPrice(proposal.proposedValue)}
                                </p>
                                {probConfig && (
                                  <span className={cn("text-xs font-medium", probConfig.color)}>
                                    {probConfig.percent}%
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </CardContent>
                  </ScrollArea>
                </Card>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredProposals.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">Nenhuma proposta encontrada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Crie uma nova proposta para iniciar uma negociação.
                </p>
                <Button onClick={() => setIsProposalModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Proposta
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          {filteredSales.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold mb-1">Nenhuma venda encontrada</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Registre uma venda ou converta uma proposta aceita.
                </p>
                <Button onClick={() => {
                  setWizardStep(0);
                  setIsSaleWizardOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Venda
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="lg:hidden space-y-3">
                {filteredSales.map((sale) => {
                  const details = getSaleDetails(sale);

                  return (
                    <button
                      key={sale.id}
                      onClick={() => openSaleDetail(sale)}
                      className="w-full p-4 rounded-xl border bg-card hover:shadow-md transition-all active:scale-[0.98] text-left space-y-3"
                    >
                      {/* Property image */}
                      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                        {details.property?.images?.[0] ? (
                          <img
                            src={details.property.images[0]}
                            alt={details.property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm line-clamp-1">
                              {details.property?.title || "Imóvel"}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {details.property?.address || "Endereço"}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300 text-[10px] shrink-0">
                            <CheckCircle className="h-2.5 w-2.5 mr-1" />
                            Fechado
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="truncate">{details.lead?.name || "Comprador"}</span>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t">
                          <div>
                            <p className="text-xl font-bold text-primary">
                              {formatPrice(sale.saleValue)}
                            </p>
                            <p className="text-xs text-green-600 font-medium">
                              Comissão: {formatPrice(sale.commissionValue || "0")}
                            </p>
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(sale.saleDate), "dd/MM/yyyy")}
                            </p>
                            {details.broker && (
                              <p className="flex items-center gap-1 justify-end">
                                <User className="h-3 w-3" />
                                {details.broker.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quick actions */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="flex-1 h-8 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (details.lead?.phone) {
                                window.open(`tel:${details.lead.phone}`, "_blank");
                              }
                            }}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Ligar
                          </Button>
                          {details.property?.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/properties/${details.property?.id}`);
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Ver Imóvel
                            </Button>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Desktop: Table */}
              <Card className="hidden lg:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Código</TableHead>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Comprador</TableHead>
                          <TableHead>Corretor</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Comissão</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSales.map((sale) => {
                          const details = getSaleDetails(sale);

                          return (
                            <TableRow
                              key={sale.id}
                              className="cursor-pointer"
                              onClick={() => openSaleDetail(sale)}
                            >
                              <TableCell className="font-mono text-xs">
                                #{sale.id.slice(0, 6).toUpperCase()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate max-w-[150px]">
                                    {details.property?.title || "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="truncate max-w-[120px] block">
                                  {details.lead?.name || "—"}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="truncate max-w-[100px] block">
                                  {details.broker?.name || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatPrice(sale.saleValue)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-col items-end">
                                  <span className="font-semibold text-green-600">
                                    {formatPrice(sale.commissionValue || "0")}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    ({sale.commissionRate}%)
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(sale.saleDate), "dd/MM/yyyy")}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Abrir ações da venda">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openSaleDetail(sale); }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Receipt className="h-4 w-4 mr-2" />
                                      Ver no Financeiro
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <FileSignature className="h-4 w-4 mr-2" />
                                      Ver Contrato
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Performance Cards - Below main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Broker Performance */}
        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Performance por Corretor
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {brokerPerformance.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem vendas no período</p>
            ) : (
              <div className="space-y-3">
                {brokerPerformance.slice(0, 3).map((broker, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                        i === 0 && "bg-amber-100 text-amber-700",
                        i === 1 && "bg-gray-100 text-gray-700",
                        i === 2 && "bg-orange-100 text-orange-700"
                      )}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{broker.name}</p>
                        <p className="text-xs text-muted-foreground">{broker.count} venda(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{formatPrice(broker.value)}</p>
                      <p className="text-xs text-muted-foreground">Com: {formatPrice(broker.commission)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Performance */}
        <Card>
          <CardHeader className="p-4 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Performance por Origem
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {sourcePerformance.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem vendas no período</p>
            ) : (
              <div className="space-y-3">
                {sourcePerformance.slice(0, 3).map((source, i) => {
                  const sourceLabel = LEAD_SOURCES.find(s => s.value === source.source)?.label || source.source;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-sm font-medium capitalize">{sourceLabel}</p>
                        <p className="text-xs text-muted-foreground">{source.count} venda(s)</p>
                      </div>
                      <p className="text-sm font-bold text-primary">{formatPrice(source.value)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Proposal Modal */}
      <Dialog open={isProposalModalOpen} onOpenChange={setIsProposalModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Proposta de Venda</DialogTitle>
            <DialogDescription>Registre uma proposta de compra para um imóvel</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProposal} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Imóvel *</Label>
                <Select
                  value={proposalForm.propertyId}
                  onValueChange={(v) => {
                    const prop = availableProperties.find(p => p.id === v);
                    setProposalForm({
                      ...proposalForm,
                      propertyId: v,
                      proposedValue: prop ? prop.price : proposalForm.proposedValue,
                    });
                  }}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o imóvel" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProperties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <Home className="h-3 w-3" />
                          <span className="truncate">{p.title}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Lead (Comprador) *</Label>
                <Select value={proposalForm.leadId} onValueChange={(v) => setProposalForm({ ...proposalForm, leadId: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Selecione o lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          {l.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor Proposto (R$) *</Label>
                <Input
                  type="number"
                  value={proposalForm.proposedValue}
                  onChange={(e) => setProposalForm({ ...proposalForm, proposedValue: e.target.value })}
                  placeholder="500000"
                  className="h-11"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Probabilidade</Label>
                <Select value={proposalForm.probability} onValueChange={(v) => setProposalForm({ ...proposalForm, probability: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROBABILITY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className={opt.color}>{opt.label} ({opt.percent}%)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Validade da Proposta</Label>
              <Input
                type="date"
                value={proposalForm.validityDate}
                onChange={(e) => setProposalForm({ ...proposalForm, validityDate: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={proposalForm.notes}
                onChange={(e) => setProposalForm({ ...proposalForm, notes: e.target.value })}
                placeholder="Condições, forma de pagamento..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsProposalModalOpen(false)} className="h-11">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !proposalForm.propertyId || !proposalForm.leadId || !proposalForm.proposedValue}
                className="h-11"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Proposta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sale Wizard - Multi-step */}
      <Dialog open={isSaleWizardOpen} onOpenChange={setIsSaleWizardOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Venda</DialogTitle>
            <DialogDescription>
              Preencha os dados para registrar uma venda concluída.
            </DialogDescription>
          </DialogHeader>

          {/* Multi-step indicator */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              {WIZARD_STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                      index === wizardStep ? "bg-primary text-white scale-110" :
                      index < wizardStep ? "bg-green-500 text-white" :
                      "bg-muted text-muted-foreground"
                    )}
                  >
                    {index < wizardStep ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mx-1",
                      index < wizardStep ? "bg-green-500" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">{WIZARD_STEPS[wizardStep].title}</p>
              <p className="text-xs text-muted-foreground">{WIZARD_STEPS[wizardStep].description}</p>
            </div>
            <Progress value={((wizardStep + 1) / WIZARD_STEPS.length) * 100} className="h-2" />
          </div>

          <div className="py-4">
            {/* Step 0: Source Selection */}
            {wizardStep === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Origem da Venda</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSaleForm({ ...saleForm, sourceType: "proposal", propertyId: "", buyerLeadId: "" })}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        saleForm.sourceType === "proposal" ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/50"
                      )}
                    >
                      <FileText className="h-6 w-6 mb-2 text-primary" />
                      <p className="text-sm font-medium">De Proposta</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Converter proposta aceita</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSaleForm({ ...saleForm, sourceType: "direct", proposalId: "" })}
                      className={cn(
                        "p-4 rounded-xl border-2 text-left transition-all",
                        saleForm.sourceType === "direct" ? "border-primary bg-primary/5 shadow-sm" : "border-muted hover:border-primary/50"
                      )}
                    >
                      <Plus className="h-6 w-6 mb-2 text-primary" />
                      <p className="text-sm font-medium">Venda Direta</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Registrar manualmente</p>
                    </button>
                  </div>
                </div>

                {saleForm.sourceType === "proposal" && (
                  <div className="space-y-2">
                    <Label>Selecione a Proposta *</Label>
                    <Select
                      value={saleForm.proposalId}
                      onValueChange={(v) => {
                        const proposal = proposals.find(p => p.id === v);
                        if (proposal) {
                          setSaleForm({
                            ...saleForm,
                            proposalId: v,
                            propertyId: proposal.propertyId,
                            buyerLeadId: proposal.leadId,
                            saleValue: proposal.proposedValue,
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione uma proposta" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingProposals.map((p) => {
                          const details = getProposalDetails(p);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <span>{details.lead?.name}</span>
                                <span className="text-muted-foreground">-</span>
                                <span className="text-muted-foreground truncate">{details.property?.title}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {saleForm.sourceType === "direct" && (
                  <>
                    <div className="space-y-2">
                      <Label>Imóvel *</Label>
                      <Select
                        value={saleForm.propertyId}
                        onValueChange={(v) => {
                          const prop = properties.find(p => p.id === v);
                          setSaleForm({
                            ...saleForm,
                            propertyId: v,
                            saleValue: prop ? prop.price : saleForm.saleValue,
                          });
                        }}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione o imóvel" />
                        </SelectTrigger>
                        <SelectContent>
                          {properties.filter(p => p.category === "sale").map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex items-center gap-2">
                                <Home className="h-3 w-3" />
                                <span className="truncate">{p.title}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Comprador (Lead) *</Label>
                      <Select value={saleForm.buyerLeadId} onValueChange={(v) => setSaleForm({ ...saleForm, buyerLeadId: v })}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Selecione o comprador" />
                        </SelectTrigger>
                        <SelectContent>
                          {leads.map((l) => (
                            <SelectItem key={l.id} value={l.id}>
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3" />
                                {l.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 1: Values */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor da Venda (R$) *</Label>
                    <Input
                      type="number"
                      value={saleForm.saleValue}
                      onChange={(e) => setSaleForm({ ...saleForm, saleValue: e.target.value })}
                      placeholder="500000"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Desconto (R$)</Label>
                    <Input
                      type="number"
                      value={saleForm.discount}
                      onChange={(e) => setSaleForm({ ...saleForm, discount: e.target.value })}
                      placeholder="0"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Comissão Total (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={saleForm.commissionRate}
                      onChange={(e) => setSaleForm({ ...saleForm, commissionRate: e.target.value })}
                      placeholder="6"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Corretor Responsável</Label>
                    <Select value={saleForm.brokerId} onValueChange={(v) => setSaleForm({ ...saleForm, brokerId: v })}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {saleForm.brokerId && (
                  <div className="space-y-2">
                    <Label>% da Comissão para o Corretor</Label>
                    <Input
                      type="number"
                      step="1"
                      value={saleForm.brokerCommissionRate}
                      onChange={(e) => setSaleForm({ ...saleForm, brokerCommissionRate: e.target.value })}
                      placeholder="40"
                      className="h-11"
                    />
                  </div>
                )}

                {/* Commission calculator - Premium visual */}
                <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                      <PiggyBank className="h-4 w-4" />
                      Calculadora de Comissões
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-white">
                      <span className="text-sm text-muted-foreground">Comissão Total ({saleForm.commissionRate}%):</span>
                      <span className="text-lg font-bold text-green-600">{formatPrice(commissionCalc.totalCommission)}</span>
                    </div>
                    {saleForm.brokerId && (
                      <>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-blue-50 text-blue-800">
                          <span className="text-sm">Corretor ({saleForm.brokerCommissionRate}%):</span>
                          <span className="text-base font-bold">{formatPrice(commissionCalc.brokerCommission)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg bg-purple-50 text-purple-800">
                          <span className="text-sm">Imobiliária:</span>
                          <span className="text-base font-bold">{formatPrice(commissionCalc.agencyCommission)}</span>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center p-3 rounded-lg bg-emerald-50 text-emerald-800">
                      <span className="text-sm font-medium">Repasse Proprietário:</span>
                      <span className="text-lg font-bold">{formatPrice(commissionCalc.ownerPayout)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Step 2: Payment */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <Select value={saleForm.paymentMethod} onValueChange={(v) => setSaleForm({ ...saleForm, paymentMethod: v })}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avista">À Vista</SelectItem>
                      <SelectItem value="financiamento">Financiamento Bancário</SelectItem>
                      <SelectItem value="parcelado">Parcelado Direto</SelectItem>
                      <SelectItem value="permuta">Permuta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {saleForm.paymentMethod === "parcelado" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Entrada (R$)</Label>
                      <Input
                        type="number"
                        value={saleForm.downPayment}
                        onChange={(e) => setSaleForm({ ...saleForm, downPayment: e.target.value })}
                        placeholder="100000"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Parcelas</Label>
                      <Input
                        type="number"
                        value={saleForm.installments}
                        onChange={(e) => setSaleForm({ ...saleForm, installments: e.target.value })}
                        placeholder="12"
                        className="h-11"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Data de Fechamento *</Label>
                  <Input
                    type="date"
                    value={saleForm.saleDate}
                    onChange={(e) => setSaleForm({ ...saleForm, saleDate: e.target.value })}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={saleForm.notes}
                    onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                    placeholder="Detalhes adicionais..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="p-4 pb-3">
                    <CardTitle className="text-base">Resumo da Venda</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Imóvel:</span>
                      <span className="font-medium text-sm truncate ml-2 max-w-[200px]">
                        {properties.find(p => p.id === saleForm.propertyId)?.title || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Comprador:</span>
                      <span className="font-medium text-sm">
                        {leads.find(l => l.id === saleForm.buyerLeadId)?.name || "—"}
                      </span>
                    </div>
                    {saleForm.brokerId && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Corretor:</span>
                        <span className="font-medium text-sm">
                          {users.find(u => u.id === saleForm.brokerId)?.name || "—"}
                        </span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valor da Venda:</span>
                      <span className="text-xl font-bold text-primary">{formatPrice(saleForm.saleValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Comissão Total:</span>
                      <span className="font-bold text-green-600">{formatPrice(commissionCalc.totalCommission)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Data:</span>
                      <span className="font-medium text-sm">{format(new Date(saleForm.saleDate), "dd/MM/yyyy")}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="font-medium flex items-center gap-2 text-sm text-amber-800">
                    <AlertTriangle className="h-4 w-4" />
                    Atenção
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Ao confirmar, a venda será registrada e os dados serão enviados para o módulo Financeiro.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <div className="flex gap-2 w-full sm:w-auto">
              {wizardStep > 0 && (
                <Button type="button" variant="outline" onClick={prevStep} className="flex-1 sm:flex-none h-11">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <Button onClick={nextStep} disabled={!canProceed} className="flex-1 sm:flex-none h-11">
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreateSale}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none h-11"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirmar Venda
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side={isMobile ? "bottom" : "right"} className={isMobile ? "h-[90vh] p-0" : "w-full sm:max-w-[500px] p-0"}>
          {(selectedProposal || selectedSale) && (
            <>
              <SheetHeader className="p-4 border-b bg-muted/20">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="flex items-center gap-2 text-lg">
                      {detailType === "proposal" ? (
                        <>
                          <FileText className="h-5 w-5 text-primary" />
                          Proposta de Venda
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          Venda Concluída
                        </>
                      )}
                    </SheetTitle>
                    <SheetDescription>
                      #{(selectedProposal?.id || selectedSale?.id || "").slice(0, 8).toUpperCase()}
                    </SheetDescription>
                  </div>
                  {detailType === "proposal" && selectedProposal && (
                    <Badge variant="outline" className={getStatusConfig(selectedProposal.status).color}>
                      {getStatusConfig(selectedProposal.status).label}
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <Tabs defaultValue="info" className="flex-1">
                <TabsList className="w-full justify-start px-4 pt-2 bg-transparent border-b rounded-none">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">Informações</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs sm:text-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AITOPIA
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="h-[calc(90vh-150px)] sm:h-[calc(100vh-200px)]">
                  <TabsContent value="info" className="p-4 space-y-4 mt-0">
                    {/* Value Card - Premium */}
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">
                          {detailType === "proposal" ? "Valor Proposto" : "Valor da Venda"}
                        </p>
                        <p className="text-3xl sm:text-4xl font-bold text-primary">
                          {formatPrice(selectedProposal?.proposedValue || selectedSale?.saleValue || "0")}
                        </p>
                        {selectedSale?.commissionValue && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-base font-semibold text-green-600">
                              Comissão: {formatPrice(selectedSale.commissionValue)}
                            </p>
                            <p className="text-xs text-green-600/70">({selectedSale.commissionRate}%)</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Lead info */}
                    <Card>
                      <CardHeader className="p-4 pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          {detailType === "proposal" ? "Lead" : "Comprador"}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {selectedProposal?.lead?.name || selectedSale?.lead?.name || "—"}
                          </span>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                            <Link href="/leads">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              CRM
                            </Link>
                          </Button>
                        </div>
                        {(selectedProposal?.lead?.phone || selectedSale?.lead?.phone) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            {selectedProposal?.lead?.phone || selectedSale?.lead?.phone}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-11"
                            onClick={() => {
                              const phone = selectedProposal?.lead?.phone || selectedSale?.lead?.phone;
                              if (phone) window.open(`tel:${phone}`, "_blank");
                            }}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Ligar
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              const phone = selectedProposal?.lead?.phone || selectedSale?.lead?.phone;
                              if (phone) {
                                const clean = phone.replace(/\D/g, "");
                                window.open(`https://wa.me/55${clean}`, "_blank");
                              }
                            }}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Property info */}
                    <Card>
                      <CardHeader className="p-4 pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          Imóvel
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {selectedProposal?.property?.title || selectedSale?.property?.title || "—"}
                          </span>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
                            <Link href={`/properties/${selectedProposal?.propertyId || selectedSale?.propertyId}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Detalhes
                            </Link>
                          </Button>
                        </div>
                        {(selectedProposal?.property?.address || selectedSale?.property?.address) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {selectedProposal?.property?.address || selectedSale?.property?.address}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Notes */}
                    {(selectedProposal?.notes || selectedSale?.notes) && (
                      <Card>
                        <CardHeader className="p-4 pb-3">
                          <CardTitle className="text-sm">Observações</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {(selectedProposal?.notes || selectedSale?.notes || "")
                              .replace(/\[PROB:\w+\]\s*/g, "")
                              .trim() || "Sem observações"}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Quick actions - Proposal */}
                    {detailType === "proposal" && selectedProposal && !["accepted", "rejected", "expired"].includes(selectedProposal.status) && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Ações rápidas</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedProposal.status === "pending" && (
                            <Button
                              variant="outline"
                              className="h-11"
                              onClick={() => handleUpdateProposalStatus(selectedProposal.id, "sent")}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Marcar Enviada
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="h-11 text-green-600 hover:text-green-700"
                            onClick={() => handleUpdateProposalStatus(selectedProposal.id, "accepted")}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Aceitar
                          </Button>
                          <Button
                            variant="outline"
                            className="h-11 text-red-600 hover:text-red-700"
                            onClick={() => handleUpdateProposalStatus(selectedProposal.id, "rejected")}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Recusar
                          </Button>
                        </div>
                        {selectedProposal.status === "accepted" && (
                          <Button
                            className="w-full h-11"
                            onClick={() => {
                              setIsDetailOpen(false);
                              openSaleWizardFromProposal(selectedProposal);
                            }}
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Converter em Venda
                          </Button>
                        )}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="timeline" className="p-4 space-y-4 mt-0">
                    <div className="space-y-4">
                      {/* Creation */}
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-full shrink-0">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {detailType === "proposal" ? "Proposta criada" : "Venda registrada"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(selectedProposal?.createdAt || selectedSale?.createdAt || new Date()), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      </div>

                      {/* Sale-specific timeline */}
                      {detailType === "sale" && selectedSale && (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-full shrink-0">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Venda concluída</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(selectedSale.saleDate), "dd/MM/yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 rounded-full shrink-0">
                              <Receipt className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Lançamento financeiro</p>
                              <p className="text-xs text-muted-foreground">
                                Comissão de {formatPrice(selectedSale.commissionValue || "0")}
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="ai" className="p-4 space-y-4 mt-0">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Mensagens prontas</Label>
                      <div className="grid gap-2">
                        {AI_PROMPTS.map(prompt => (
                          <Button
                            key={prompt.id}
                            variant="outline"
                            className="h-auto p-4 justify-start text-left"
                            onClick={() => setAiMessage(prompt.template({
                              lead: selectedProposal?.lead || selectedSale?.lead,
                              property: selectedProposal?.property || selectedSale?.property,
                              proposedValue: selectedProposal?.proposedValue,
                              saleValue: selectedSale?.saleValue,
                              validityDate: selectedProposal?.validityDate,
                              saleDate: selectedSale?.saleDate,
                              notes: selectedProposal?.notes || selectedSale?.notes,
                            }))}
                          >
                            <prompt.icon className="h-5 w-5 mr-3 shrink-0 text-primary" />
                            <span className="text-sm">{prompt.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {aiMessage && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Mensagem</Label>
                        <Textarea
                          value={aiMessage}
                          onChange={(e) => setAiMessage(e.target.value)}
                          rows={6}
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                            onClick={() => sendToWhatsApp(selectedProposal?.lead?.phone || selectedSale?.lead?.phone)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Enviar WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-11"
                            onClick={() => {
                              navigator.clipboard.writeText(aiMessage);
                              toast({ title: "Copiado!", description: "Mensagem copiada." });
                            }}
                          >
                            Copiar
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
