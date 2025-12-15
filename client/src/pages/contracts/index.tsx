import { useState, useCallback, useMemo, useEffect } from "react";
import { useImobi, Contract, Lead, Property } from "@/lib/imobi-context";
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
import { cn } from "@/lib/utils";
import {
  FileText,
  Download,
  Send,
  FileCheck,
  MoreVertical,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  CalendarDays,
  Filter,
  Search,
  Eye,
  Copy,
  ArrowRight,
  FileSignature,
  Building,
  Home,
  User,
  Phone,
  Mail,
  ExternalLink,
  Sparkles,
  MessageCircle,
  RefreshCw,
  Calendar,
  PenLine,
  Percent,
  Ban,
  ChevronRight,
  ChevronLeft,
  History,
  FileWarning,
  AlertCircle,
  Receipt,
  X,
  ChevronDown
} from "lucide-react";
import {
  format,
  differenceInDays,
  isPast,
  addDays,
  isAfter,
  isBefore,
  startOfMonth,
  endOfMonth,
  subDays
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

// Format price to BRL
function formatPrice(price: string | number) {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

// Proposal status config
const PROPOSAL_STATUS = {
  draft: { label: "Rascunho", color: "bg-gray-100 text-gray-700 border-gray-300", icon: FileText },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700 border-blue-300", icon: Send },
  analyzing: { label: "Em Análise", color: "bg-amber-100 text-amber-700 border-amber-300", icon: Clock },
  approved: { label: "Aprovada", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle },
  rejected: { label: "Recusada", color: "bg-red-100 text-red-700 border-red-300", icon: XCircle },
  expired: { label: "Vencida", color: "bg-purple-100 text-purple-700 border-purple-300", icon: AlertTriangle },
};

// Contract status config
const CONTRACT_STATUS = {
  active: { label: "Ativo", color: "bg-green-100 text-green-700 border-green-300", icon: CheckCircle },
  terminated: { label: "Rescindido", color: "bg-red-100 text-red-700 border-red-300", icon: Ban },
  expired: { label: "Vencido", color: "bg-amber-100 text-amber-700 border-amber-300", icon: AlertTriangle },
  renewing: { label: "Em Renovação", color: "bg-blue-100 text-blue-700 border-blue-300", icon: RefreshCw },
};

// Signature status config
const SIGNATURE_STATUS = {
  pending: { label: "Aguardando", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  signed: { label: "Assinado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Recusado", color: "bg-red-100 text-red-700" },
};

// AI prompts for contracts/proposals
const AI_PROMPTS = [
  {
    id: "proposal_text",
    label: "Gerar texto de proposta",
    icon: FileText,
    template: (data: any) =>
      `Prezado(a) ${data.lead?.name || "Cliente"},\n\nApresentamos nossa proposta para o imóvel ${data.property?.title || ""}, localizado em ${data.property?.address || ""}.\n\nValor proposto: ${formatPrice(data.value || "0")}\n\nCondições: ${data.terms || "À vista ou financiamento"}\n\nAguardamos seu retorno.\n\nAtenciosamente,\nEquipe Imobiliária`
  },
  {
    id: "explain_clauses",
    label: "Explicar cláusulas de locação",
    icon: FileCheck,
    template: () =>
      `Por favor, me explique as principais cláusulas de um contrato de locação residencial, incluindo:\n- Prazo e renovação\n- Reajuste anual\n- Multa rescisória\n- Garantia locatícia\n- Deveres do locatário e locador`
  },
  {
    id: "whatsapp_send",
    label: "Mensagem para enviar proposta",
    icon: MessageCircle,
    template: (data: any) =>
      `Olá ${data.lead?.name || ""}! Tudo bem?\n\nConforme conversamos, estou enviando a proposta formal para o imóvel ${data.property?.title || ""}.\n\nValor: ${formatPrice(data.value || "0")}\n\nPor favor, analise e me retorne com suas considerações. Fico à disposição para esclarecer qualquer dúvida!\n\nAbraços!`
  },
  {
    id: "follow_up",
    label: "Follow-up de proposta pendente",
    icon: Clock,
    template: (data: any) =>
      `Olá ${data.lead?.name || ""}!\n\nEstou entrando em contato para saber se teve a oportunidade de analisar nossa proposta para o imóvel ${data.property?.title || ""}.\n\nGostaria de agendar uma conversa para discutir eventuais ajustes ou esclarecer dúvidas. Qual o melhor horário para você?`
  },
];

// Types
type ProposalDetails = Contract & {
  lead?: Lead;
  property?: Property;
};

type Filters = {
  search: string;
  type: string;
  status: string;
  period: string;
};

// Wizard steps
const WIZARD_STEPS = [
  { id: "lead", title: "Cliente", description: "Selecione o lead" },
  { id: "property", title: "Imóvel", description: "Selecione o imóvel" },
  { id: "conditions", title: "Condições", description: "Defina valores" },
  { id: "details", title: "Detalhes", description: "Observações finais" },
];

export default function ContractsPage() {
  const { contracts, leads, properties, tenant, user, refetchContracts } = useImobi();
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<"proposals" | "contracts">("proposals");

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    type: "",
    status: "",
    period: "30",
  });

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardType, setWizardType] = useState<"proposal" | "contract">("proposal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    leadId: "",
    propertyId: "",
    type: "sale",
    value: "",
    downPayment: "",
    installments: "",
    adjustmentIndex: "IGPM",
    terms: "",
    validityDays: "7",
    notes: "",
  });

  // Detail panel state
  const [selectedItem, setSelectedItem] = useState<ProposalDetails | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // AI Chat state
  const [aiMessage, setAiMessage] = useState("");

  // Get proposal/contract with details
  const getItemDetails = useCallback((contract: Contract): ProposalDetails => {
    const lead = leads.find(l => l.id === contract.leadId);
    const property = properties.find(p => p.id === contract.propertyId);
    return { ...contract, lead, property };
  }, [leads, properties]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const periodDays = parseInt(filters.period) || 30;
    const startDate = subDays(new Date(), periodDays);

    const periodContracts = contracts.filter(c =>
      c.createdAt && isAfter(new Date(c.createdAt), startDate)
    );

    // Proposals (draft, sent, analyzing)
    const proposals = periodContracts.filter(c =>
      ["draft", "sent", "analyzing"].includes(c.status)
    );

    // Approved/Signed contracts
    const approved = periodContracts.filter(c =>
      ["approved", "signed"].includes(c.status)
    );

    // Conversion rate
    const totalFinished = periodContracts.filter(c =>
      ["approved", "signed", "rejected", "expired"].includes(c.status)
    );
    const conversionRate = totalFinished.length > 0
      ? (approved.length / totalFinished.length) * 100
      : 0;

    // Average ticket
    const avgTicket = approved.length > 0
      ? approved.reduce((sum, c) => sum + parseFloat(c.value), 0) / approved.length
      : 0;

    // Average time to close (mock - would need actual tracking)
    const avgDays = 12; // Placeholder

    return {
      proposalsCount: proposals.length,
      conversionRate: conversionRate.toFixed(1),
      avgTicket,
      avgDays,
      approvedCount: approved.length,
    };
  }, [contracts, filters.period]);

  // Filter proposals (draft, sent, analyzing, rejected, expired)
  const filteredProposals = useMemo(() => {
    const proposalStatuses = ["draft", "sent", "analyzing", "rejected", "expired"];
    return contracts.filter(c => {
      if (!proposalStatuses.includes(c.status)) return false;

      // Search filter
      if (filters.search) {
        const details = getItemDetails(c);
        const searchLower = filters.search.toLowerCase();
        const matchesLead = details.lead?.name.toLowerCase().includes(searchLower);
        const matchesProperty = details.property?.title.toLowerCase().includes(searchLower);
        const matchesCode = c.id.toLowerCase().includes(searchLower);
        if (!matchesLead && !matchesProperty && !matchesCode) return false;
      }

      // Type filter
      if (filters.type && c.type !== filters.type) return false;

      // Status filter
      if (filters.status && c.status !== filters.status) return false;

      // Period filter
      if (filters.period && c.createdAt) {
        const days = parseInt(filters.period);
        const startDate = subDays(new Date(), days);
        if (isBefore(new Date(c.createdAt), startDate)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [contracts, filters, getItemDetails]);

  // Filter contracts (approved, signed)
  const filteredContracts = useMemo(() => {
    const contractStatuses = ["approved", "signed"];
    return contracts.filter(c => {
      if (!contractStatuses.includes(c.status)) return false;

      // Search filter
      if (filters.search) {
        const details = getItemDetails(c);
        const searchLower = filters.search.toLowerCase();
        const matchesLead = details.lead?.name.toLowerCase().includes(searchLower);
        const matchesProperty = details.property?.title.toLowerCase().includes(searchLower);
        const matchesCode = c.id.toLowerCase().includes(searchLower);
        if (!matchesLead && !matchesProperty && !matchesCode) return false;
      }

      // Type filter
      if (filters.type && c.type !== filters.type) return false;

      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [contracts, filters, getItemDetails]);

  // Alerts for contracts
  const contractAlerts = useMemo(() => {
    const alerts: { type: string; message: string; count: number; contracts: Contract[] }[] = [];

    // Check for expiring contracts (within 30 days) - mock using signedAt
    const expiringContracts = filteredContracts.filter(c => {
      if (!c.signedAt) return false;
      const expiryDate = addDays(new Date(c.signedAt), 365); // Assume 1 year contracts
      const daysUntilExpiry = differenceInDays(expiryDate, new Date());
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    });

    if (expiringContracts.length > 0) {
      alerts.push({
        type: "expiring",
        message: `${expiringContracts.length} contrato(s) vencendo em até 30 dias`,
        count: expiringContracts.length,
        contracts: expiringContracts,
      });
    }

    // Check for contracts needing adjustment (mock)
    const needsAdjustment = filteredContracts.filter(c => {
      if (!c.signedAt) return false;
      const monthsSince = Math.floor(differenceInDays(new Date(), new Date(c.signedAt)) / 30);
      return monthsSince > 0 && monthsSince % 12 === 0;
    });

    if (needsAdjustment.length > 0) {
      alerts.push({
        type: "adjustment",
        message: `${needsAdjustment.length} contrato(s) com reajuste programado`,
        count: needsAdjustment.length,
        contracts: needsAdjustment,
      });
    }

    return alerts;
  }, [filteredContracts]);

  // Open wizard
  const openWizard = (type: "proposal" | "contract") => {
    setWizardType(type);
    setWizardStep(0);
    setFormData({
      leadId: "",
      propertyId: "",
      type: "sale",
      value: "",
      downPayment: "",
      installments: "",
      adjustmentIndex: "IGPM",
      terms: "",
      validityDays: "7",
      notes: "",
    });
    setIsWizardOpen(true);
  };

  // Handle wizard navigation
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

  // Can proceed to next step?
  const canProceed = useMemo(() => {
    switch (wizardStep) {
      case 0: return !!formData.leadId;
      case 1: return !!formData.propertyId;
      case 2: return !!formData.value;
      case 3: return true;
      default: return false;
    }
  }, [wizardStep, formData]);

  // Calculate commission estimate
  const commissionEstimate = useMemo(() => {
    const value = parseFloat(formData.value) || 0;
    const rate = formData.type === "sale" ? 0.06 : 0.10; // 6% for sale, 10% for rent (first month)
    return value * rate;
  }, [formData.value, formData.type]);

  // Selected property price
  const selectedPropertyPrice = useMemo(() => {
    const property = properties.find(p => p.id === formData.propertyId);
    return property ? parseFloat(property.price) : 0;
  }, [formData.propertyId, properties]);

  // Handle form submit
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const payload = {
        propertyId: formData.propertyId,
        leadId: formData.leadId,
        type: formData.type,
        value: formData.value,
        terms: formData.terms || null,
        status: wizardType === "contract" ? "signed" : "draft",
        signedAt: wizardType === "contract" ? new Date().toISOString() : null,
      };

      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar registro");
      }

      toast({
        title: wizardType === "contract" ? "Contrato criado" : "Proposta criada",
        description: `${wizardType === "contract" ? "O contrato" : "A proposta"} foi criado(a) com sucesso.`,
      });

      setIsWizardOpen(false);
      await refetchContracts();
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

  // Update status
  const handleUpdateStatus = async (contractId: string, status: string) => {
    try {
      const payload: any = { status };
      if (status === "signed") {
        payload.signedAt = new Date().toISOString();
      }

      const res = await fetch(`/api/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao atualizar");

      const statusLabels: Record<string, string> = {
        sent: "enviada",
        analyzing: "em análise",
        approved: "aprovada",
        rejected: "recusada",
        signed: "assinado",
      };

      toast({
        title: "Atualizado",
        description: `Status alterado para ${statusLabels[status] || status}.`,
      });

      await refetchContracts();
      setIsDetailOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Duplicate proposal
  const handleDuplicate = async (contract: Contract) => {
    try {
      const payload = {
        propertyId: contract.propertyId,
        leadId: contract.leadId,
        type: contract.type,
        value: contract.value,
        terms: contract.terms,
        status: "draft",
      };

      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Erro ao duplicar");

      toast({
        title: "Proposta duplicada",
        description: "Uma cópia foi criada como rascunho.",
      });

      await refetchContracts();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Convert proposal to contract
  const handleConvertToContract = async (contract: Contract) => {
    await handleUpdateStatus(contract.id, "signed");
  };

  // Open detail panel
  const openDetailPanel = (contract: Contract) => {
    setSelectedItem(getItemDetails(contract));
    setAiMessage("");
    setIsDetailOpen(true);
  };

  // Send to WhatsApp
  const sendToWhatsApp = (phone?: string) => {
    if (!phone || !aiMessage) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(aiMessage)}`;
    window.open(url, "_blank");
  };

  // Get status config
  const getProposalStatusConfig = (status: string) => {
    return PROPOSAL_STATUS[status as keyof typeof PROPOSAL_STATUS] || PROPOSAL_STATUS.draft;
  };

  const getContractStatusConfig = (status: string) => {
    return CONTRACT_STATUS[status as keyof typeof CONTRACT_STATUS] || CONTRACT_STATUS.active;
  };

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-foreground">
              Propostas e Contratos
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Gerencie negociações e fechamentos • Últimos {filters.period} dias
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm h-9 sm:h-10">
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Filtros</span>
                  {(filters.search || filters.type || filters.status) && (
                    <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                      !
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Filtre propostas e contratos</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Código, lead ou imóvel..."
                        value={filters.search}
                        onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Negócio</Label>
                    <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os tipos</SelectItem>
                        <SelectItem value="sale">Venda</SelectItem>
                        <SelectItem value="rent">Locação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status (Propostas)</Label>
                    <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos os status</SelectItem>
                        {Object.entries(PROPOSAL_STATUS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>{val.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Período</Label>
                    <Select value={filters.period} onValueChange={(v) => setFilters(f => ({ ...f, period: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Últimos 7 dias</SelectItem>
                        <SelectItem value="30">Últimos 30 dias</SelectItem>
                        <SelectItem value="60">Últimos 60 dias</SelectItem>
                        <SelectItem value="90">Últimos 90 dias</SelectItem>
                        <SelectItem value="365">Último ano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setFilters({ search: "", type: "", status: "", period: "30" })}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
              onClick={() => openWizard("contract")}
            >
              <FileSignature className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Novo Contrato</span>
              <span className="sm:hidden">Contrato</span>
            </Button>

            <Button
              size="sm"
              className="gap-1.5 text-xs sm:text-sm h-9 sm:h-10"
              onClick={() => openWizard("proposal")}
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Nova Proposta</span>
              <span className="xs:hidden">Nova</span>
            </Button>
          </div>
        </div>

        {/* KPI Cards - Horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <div className="flex gap-2 sm:gap-3 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-4">
            <Card className="min-w-[140px] sm:min-w-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg shrink-0">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-medium">Propostas</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{kpis.proposalsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[140px] sm:min-w-0 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-green-500 rounded-lg shrink-0">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">Conversão</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300">{kpis.conversionRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[140px] sm:min-w-0 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg shrink-0">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium">Ticket Médio</p>
                    <p className="text-sm sm:text-lg font-bold text-purple-700 dark:text-purple-300 truncate">
                      {formatPrice(kpis.avgTicket)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-[140px] sm:min-w-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-amber-500 rounded-lg shrink-0">
                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium">Tempo Médio</p>
                    <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300">{kpis.avgDays} dias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Contract Alerts - Horizontal scroll on mobile */}
        {contractAlerts.length > 0 && (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <div className="flex gap-2 min-w-max">
              {contractAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium shrink-0",
                    alert.type === "expiring" && "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                    alert.type === "adjustment" && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                    alert.type === "delinquent" && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  )}
                >
                  {alert.type === "expiring" && <AlertTriangle className="h-3.5 w-3.5" />}
                  {alert.type === "adjustment" && <RefreshCw className="h-3.5 w-3.5" />}
                  {alert.type === "delinquent" && <AlertCircle className="h-3.5 w-3.5" />}
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "proposals" | "contracts")}>
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-auto">
          <TabsTrigger value="proposals" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm py-2">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:hidden md:inline">Propostas</span>
            <span className="xs:hidden sm:inline md:hidden">Prop.</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 min-w-[16px]">{filteredProposals.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex-1 sm:flex-none gap-1.5 text-xs sm:text-sm py-2">
            <FileSignature className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:hidden md:inline">Contratos</span>
            <span className="xs:hidden sm:inline md:hidden">Contr.</span>
            <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 min-w-[16px]">{filteredContracts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="mt-3 sm:mt-4">
          {filteredProposals.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-sm sm:text-base mb-1">Nenhuma proposta encontrada</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                  Crie uma nova proposta para iniciar uma negociação.
                </p>
                <Button onClick={() => openWizard("proposal")} size="sm" className="h-9 sm:h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Proposta
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden space-y-2">
                {filteredProposals.map((contract) => {
                  const details = getItemDetails(contract);
                  const statusConfig = getProposalStatusConfig(contract.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card
                      key={contract.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                      onClick={() => openDetailPanel(contract)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate mb-0.5">{details.lead?.name || "Cliente"}</p>
                            <p className="text-xs text-muted-foreground truncate">{details.property?.title || "Imóvel"}</p>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 text-[10px] px-2 py-0.5", statusConfig.color)}>
                            <StatusIcon className="h-2.5 w-2.5 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            {contract.type === "sale" ? "Venda" : "Locação"}
                          </Badge>
                          <span className="font-bold text-primary text-base">{formatPrice(contract.value)}</span>
                        </div>

                        <Separator className="my-2" />

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-mono">#{contract.id.slice(0, 8).toUpperCase()}</span>
                          <span>{contract.createdAt ? format(new Date(contract.createdAt), "dd/MM/yyyy") : "—"}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop: Table */}
              <Card className="hidden md:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Código</TableHead>
                          <TableHead>Lead</TableHead>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProposals.map((contract) => {
                          const details = getItemDetails(contract);
                          const statusConfig = getProposalStatusConfig(contract.status);
                          const StatusIcon = statusConfig.icon;

                          return (
                            <TableRow
                              key={contract.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => openDetailPanel(contract)}
                            >
                              <TableCell className="font-mono text-xs">
                                #{contract.id.slice(0, 8).toUpperCase()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="font-medium truncate max-w-[150px]">
                                    {details.lead?.name || "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    {details.property?.title || "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {contract.type === "sale" ? "Venda" : "Locação"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatPrice(contract.value)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {contract.createdAt ? format(new Date(contract.createdAt), "dd/MM/yyyy") : "—"}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailPanel(contract); }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Baixar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(contract); }}>
                                      <Copy className="h-4 w-4 mr-2" />
                                      Duplicar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {contract.status === "draft" && (
                                      <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(contract.id, "sent"); }}
                                      >
                                        <Send className="h-4 w-4 mr-2" />
                                        Enviar para Cliente
                                      </DropdownMenuItem>
                                    )}
                                    {contract.status === "sent" && (
                                      <DropdownMenuItem
                                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(contract.id, "analyzing"); }}
                                      >
                                        <Clock className="h-4 w-4 mr-2" />
                                        Marcar Em Análise
                                      </DropdownMenuItem>
                                    )}
                                    {["sent", "analyzing"].includes(contract.status) && (
                                      <>
                                        <DropdownMenuItem
                                          className="text-green-600"
                                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(contract.id, "approved"); }}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-2" />
                                          Aprovar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={(e) => { e.stopPropagation(); handleUpdateStatus(contract.id, "rejected"); }}
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Recusar
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {contract.status === "approved" && (
                                      <DropdownMenuItem
                                        className="text-primary"
                                        onClick={(e) => { e.stopPropagation(); handleConvertToContract(contract); }}
                                      >
                                        <ArrowRight className="h-4 w-4 mr-2" />
                                        Transformar em Contrato
                                      </DropdownMenuItem>
                                    )}
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

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="mt-3 sm:mt-4">
          {filteredContracts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
                <FileSignature className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-sm sm:text-base mb-1">Nenhum contrato encontrado</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
                  Aprove propostas ou crie contratos diretamente.
                </p>
                <Button onClick={() => openWizard("contract")} size="sm" className="h-9 sm:h-10">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Contrato
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Mobile: Card list */}
              <div className="md:hidden space-y-2">
                {filteredContracts.map((contract) => {
                  const details = getItemDetails(contract);
                  const statusConfig = getContractStatusConfig(contract.status === "signed" ? "active" : contract.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <Card
                      key={contract.id}
                      className="cursor-pointer hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                      onClick={() => openDetailPanel(contract)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate mb-0.5">{details.property?.title || "Imóvel"}</p>
                            <p className="text-xs text-muted-foreground truncate">{details.lead?.name || "Cliente"}</p>
                          </div>
                          <Badge variant="outline" className={cn("shrink-0 text-[10px] px-2 py-0.5", statusConfig.color)}>
                            <StatusIcon className="h-2.5 w-2.5 mr-1" />
                            {statusConfig.label}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                            {contract.type === "sale" ? "Venda" : "Locação"}
                          </Badge>
                          <span className="font-bold text-primary text-base">{formatPrice(contract.value)}</span>
                        </div>

                        <Separator className="my-2" />

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-mono">#{contract.id.slice(0, 8).toUpperCase()}</span>
                          <span>
                            {contract.signedAt
                              ? `Assinado: ${format(new Date(contract.signedAt), "dd/MM/yy")}`
                              : "—"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop: Table */}
              <Card className="hidden md:block">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">Número</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Situação</TableHead>
                          <TableHead>Assinatura</TableHead>
                          <TableHead className="w-[80px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContracts.map((contract) => {
                          const details = getItemDetails(contract);
                          const statusConfig = getContractStatusConfig(contract.status === "signed" ? "active" : contract.status);
                          const StatusIcon = statusConfig.icon;

                          return (
                            <TableRow
                              key={contract.id}
                              className="cursor-pointer hover:bg-muted/50"
                              onClick={() => openDetailPanel(contract)}
                            >
                              <TableCell className="font-mono text-xs">
                                #{contract.id.slice(0, 8).toUpperCase()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {contract.type === "sale" ? "Venda" : "Locação"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    {details.property?.title || "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[150px]">
                                    {details.lead?.name || "—"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatPrice(contract.value)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {contract.signedAt ? (
                                  <div className="flex items-center gap-1.5 text-xs">
                                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                    <span>{format(new Date(contract.signedAt), "dd/MM/yyyy")}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Pendente</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetailPanel(contract); }}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      Ver Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Download className="h-4 w-4 mr-2" />
                                      Baixar PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <History className="h-4 w-4 mr-2" />
                                      Ver Histórico
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

      {/* Creation Wizard Dialog - Full screen on mobile */}
      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 w-[calc(100%-2rem)] sm:w-full">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background border-b px-4 sm:px-6 py-4">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-base sm:text-lg">
                {wizardType === "contract" ? "Novo Contrato" : "Nova Proposta"}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                {wizardType === "contract"
                  ? "Crie um contrato diretamente."
                  : "Crie uma proposta comercial em etapas."}
              </DialogDescription>
            </DialogHeader>

            {/* Progress */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Etapa {wizardStep + 1} de {WIZARD_STEPS.length}</span>
                <span className="font-medium text-foreground">{WIZARD_STEPS[wizardStep].title}</span>
              </div>
              <Progress value={((wizardStep + 1) / WIZARD_STEPS.length) * 100} className="h-1.5" />
              <div className="flex justify-between">
                {WIZARD_STEPS.map((step, i) => (
                  <div
                    key={step.id}
                    className={cn(
                      "text-[10px] transition-colors",
                      i <= wizardStep ? "text-primary font-medium" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scrollable Content */}
          <ScrollArea className="flex-1 px-4 sm:px-6">
            <div className="py-4 space-y-4">
              {/* Step 1: Lead Selection */}
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Selecione o Cliente *</Label>
                    <Select
                      value={formData.leadId}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, leadId: v }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione um lead" />
                      </SelectTrigger>
                      <SelectContent>
                        {leads.map(l => (
                          <SelectItem key={l.id} value={l.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              <span>{l.name}</span>
                              <span className="text-muted-foreground text-xs">({l.phone})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.leadId && (() => {
                    const lead = leads.find(l => l.id === formData.leadId);
                    return lead ? (
                      <Card className="bg-muted/30">
                        <CardContent className="p-3 space-y-2">
                          <p className="font-medium text-sm">{lead.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </div>
                          {lead.budget && (
                            <div className="text-xs">
                              <span className="text-muted-foreground">Orçamento: </span>
                              <span className="font-medium">{formatPrice(lead.budget)}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Step 2: Property Selection */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Selecione o Imóvel *</Label>
                    <Select
                      value={formData.propertyId}
                      onValueChange={(v) => {
                        const prop = properties.find(p => p.id === v);
                        setFormData(prev => ({
                          ...prev,
                          propertyId: v,
                          value: prop ? prop.price : prev.value,
                          type: prop?.category === "rent" ? "rent" : "sale",
                        }));
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione um imóvel" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <div className="flex items-center gap-2">
                              <Home className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{p.title}</span>
                              <span className="text-muted-foreground text-xs">{formatPrice(p.price)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.propertyId && (() => {
                    const property = properties.find(p => p.id === formData.propertyId);
                    return property ? (
                      <Card className="bg-muted/30">
                        <CardContent className="p-3 space-y-2">
                          <p className="font-medium text-sm">{property.title}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {property.address}, {property.city}
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              {property.bedrooms} quartos • {property.area}m²
                            </span>
                          </div>
                          <div className="text-sm font-bold text-primary">
                            {formatPrice(property.price)}
                          </div>
                        </CardContent>
                      </Card>
                    ) : null;
                  })()}
                </div>
              )}

              {/* Step 3: Commercial Conditions */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm">Tipo de Negócio *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">Venda</SelectItem>
                          <SelectItem value="rent">Locação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">Valor Proposto (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="0,00"
                        className="h-11"
                      />
                    </div>
                  </div>

                  {formData.type === "sale" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm">Entrada (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.downPayment}
                          onChange={(e) => setFormData(prev => ({ ...prev, downPayment: e.target.value }))}
                          placeholder="Opcional"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Parcelas</Label>
                        <Input
                          type="number"
                          value={formData.installments}
                          onChange={(e) => setFormData(prev => ({ ...prev, installments: e.target.value }))}
                          placeholder="Opcional"
                          className="h-11"
                        />
                      </div>
                    </div>
                  )}

                  {formData.type === "rent" && (
                    <div className="space-y-2">
                      <Label className="text-sm">Índice de Reajuste</Label>
                      <Select
                        value={formData.adjustmentIndex}
                        onValueChange={(v) => setFormData(prev => ({ ...prev, adjustmentIndex: v }))}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IGPM">IGP-M</SelectItem>
                          <SelectItem value="IPCA">IPCA</SelectItem>
                          <SelectItem value="INPC">INPC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm">Validade da Proposta</Label>
                    <Select
                      value={formData.validityDays}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, validityDays: v }))}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 dias</SelectItem>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estimates */}
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Valor do Imóvel:</span>
                        <span>{formatPrice(selectedPropertyPrice)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Valor Proposto:</span>
                        <span className="font-medium">{formatPrice(formData.value || "0")}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Comissão Estimada ({formData.type === "sale" ? "6%" : "10%"}):
                        </span>
                        <span className="font-bold text-primary">{formatPrice(commissionEstimate)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 4: Details */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Condições e Termos</Label>
                    <Textarea
                      value={formData.terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                      placeholder="Condições especiais, forma de pagamento, prazos..."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">Observações Internas</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Notas internas (não visíveis no documento)..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  {/* Summary */}
                  <Card>
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm">Resumo</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Cliente:</span>
                        <span className="font-medium">
                          {leads.find(l => l.id === formData.leadId)?.name || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Imóvel:</span>
                        <span className="font-medium truncate ml-2 max-w-[200px]">
                          {properties.find(p => p.id === formData.propertyId)?.title || "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium">
                          {formData.type === "sale" ? "Venda" : "Locação"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor:</span>
                        <span className="font-bold text-primary">{formatPrice(formData.value || "0")}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 z-10 bg-background border-t px-4 sm:px-6 py-4">
            <DialogFooter className="gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
              {wizardStep > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  className="w-full sm:w-auto h-11"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
              )}
              {wizardStep < WIZARD_STEPS.length - 1 ? (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed}
                  className="w-full sm:w-auto h-11"
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !canProceed}
                  className="w-full sm:w-auto h-11"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {wizardType === "contract" ? "Criar Contrato" : "Criar Proposta"}
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet - Full screen on mobile */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] p-0 flex flex-col">
          {selectedItem && (
            <>
              <SheetHeader className="p-4 border-b bg-muted/20 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <FileText className="h-5 w-5 text-primary" />
                      {["approved", "signed"].includes(selectedItem.status) ? "Contrato" : "Proposta"}
                    </SheetTitle>
                    <SheetDescription className="text-xs sm:text-sm mt-1">
                      #{selectedItem.id.slice(0, 8).toUpperCase()} • {selectedItem.type === "sale" ? "Venda" : "Locação"}
                    </SheetDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs px-2 py-1",
                      ["approved", "signed"].includes(selectedItem.status)
                        ? getContractStatusConfig(selectedItem.status === "signed" ? "active" : selectedItem.status).color
                        : getProposalStatusConfig(selectedItem.status).color
                    )}
                  >
                    {["approved", "signed"].includes(selectedItem.status)
                      ? getContractStatusConfig(selectedItem.status === "signed" ? "active" : selectedItem.status).label
                      : getProposalStatusConfig(selectedItem.status).label}
                  </Badge>
                </div>
              </SheetHeader>

              <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start px-4 pt-3 bg-transparent border-b rounded-none shrink-0">
                  <TabsTrigger value="info" className="text-xs">Informações</TabsTrigger>
                  <TabsTrigger value="document" className="text-xs">Documento</TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AITOPIA
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 min-h-0">
                  <TabsContent value="info" className="p-4 space-y-4 mt-0">
                    {/* Value */}
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Valor</p>
                        <p className="text-2xl font-bold text-primary">{formatPrice(selectedItem.value)}</p>
                      </CardContent>
                    </Card>

                    {/* Lead info */}
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4 text-primary" />
                          Cliente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{selectedItem.lead?.name || "Não informado"}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <a href="/leads">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver no CRM
                            </a>
                          </Button>
                        </div>
                        {selectedItem.lead?.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {selectedItem.lead.phone}
                          </div>
                        )}
                        {selectedItem.lead?.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {selectedItem.lead.email}
                          </div>
                        )}

                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs"
                            onClick={() => selectedItem.lead?.phone && window.open(`tel:${selectedItem.lead.phone}`, "_blank")}
                          >
                            <Phone className="h-3 w-3 mr-1" />
                            Ligar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-9 text-xs text-green-600"
                            onClick={() => {
                              if (selectedItem.lead?.phone) {
                                const phone = selectedItem.lead.phone.replace(/\D/g, "");
                                window.open(`https://wa.me/55${phone}`, "_blank");
                              }
                            }}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            WhatsApp
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Property info */}
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Home className="h-4 w-4 text-primary" />
                          Imóvel
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{selectedItem.property?.title || "Não informado"}</span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                            <a href={`/properties/${selectedItem.propertyId}`}>
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Ver detalhes
                            </a>
                          </Button>
                        </div>
                        {selectedItem.property?.address && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="h-3 w-3" />
                            {selectedItem.property.address}, {selectedItem.property.city}
                          </div>
                        )}
                        {selectedItem.property?.price && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Valor anunciado: </span>
                            <span className="font-medium">{formatPrice(selectedItem.property.price)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Terms */}
                    {selectedItem.terms && (
                      <Card>
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm">Condições</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {selectedItem.terms}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Timeline */}
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <History className="h-4 w-4 text-primary" />
                          Histórico
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
                            <FileText className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Proposta criada</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedItem.createdAt ? format(new Date(selectedItem.createdAt), "dd/MM/yyyy 'às' HH:mm") : "—"}
                            </p>
                          </div>
                        </div>

                        {selectedItem.signedAt && (
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full shrink-0">
                              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Contrato assinado</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(selectedItem.signedAt), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick actions */}
                    {!["approved", "signed"].includes(selectedItem.status) && (
                      <div className="space-y-2 pb-4">
                        <Label className="text-xs text-muted-foreground">Ações rápidas</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedItem.status === "draft" && (
                            <Button
                              variant="outline"
                              className="h-10 text-xs"
                              onClick={() => handleUpdateStatus(selectedItem.id, "sent")}
                            >
                              <Send className="h-4 w-4 mr-1.5" />
                              Enviar
                            </Button>
                          )}
                          {selectedItem.status === "sent" && (
                            <Button
                              variant="outline"
                              className="h-10 text-xs"
                              onClick={() => handleUpdateStatus(selectedItem.id, "analyzing")}
                            >
                              <Clock className="h-4 w-4 mr-1.5" />
                              Em Análise
                            </Button>
                          )}
                          {["sent", "analyzing"].includes(selectedItem.status) && (
                            <>
                              <Button
                                variant="outline"
                                className="h-10 text-xs text-green-600"
                                onClick={() => handleUpdateStatus(selectedItem.id, "approved")}
                              >
                                <CheckCircle className="h-4 w-4 mr-1.5" />
                                Aprovar
                              </Button>
                              <Button
                                variant="outline"
                                className="h-10 text-xs text-red-600"
                                onClick={() => handleUpdateStatus(selectedItem.id, "rejected")}
                              >
                                <XCircle className="h-4 w-4 mr-1.5" />
                                Recusar
                              </Button>
                            </>
                          )}
                          {selectedItem.status === "approved" && (
                            <Button
                              className="h-10 text-xs col-span-2"
                              onClick={() => handleConvertToContract(selectedItem)}
                            >
                              <ArrowRight className="h-4 w-4 mr-1.5" />
                              Transformar em Contrato
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="h-10 text-xs"
                            onClick={() => handleDuplicate(selectedItem)}
                          >
                            <Copy className="h-4 w-4 mr-1.5" />
                            Duplicar
                          </Button>
                          <Button variant="outline" className="h-10 text-xs">
                            <Download className="h-4 w-4 mr-1.5" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="document" className="p-4 space-y-4 mt-0">
                    <Card className="bg-muted/30 border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <FileWarning className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <h3 className="font-semibold mb-1 text-sm">Visualização do Documento</h3>
                        <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                          A visualização do PDF será implementada com integração de assinatura digital.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Button variant="outline" size="sm" className="h-9">
                            <Download className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </Button>
                          <Button variant="outline" size="sm" className="h-9">
                            <FileSignature className="h-4 w-4 mr-2" />
                            Enviar para Assinatura
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Signature status (mock) */}
                    <Card>
                      <CardHeader className="p-3 pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <PenLine className="h-4 w-4 text-primary" />
                          Status da Assinatura
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Cliente</span>
                            <Badge variant="outline" className={cn("text-xs", SIGNATURE_STATUS.pending.color)}>
                              {SIGNATURE_STATUS.pending.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Proprietário</span>
                            <Badge variant="outline" className={cn("text-xs", SIGNATURE_STATUS.pending.color)}>
                              {SIGNATURE_STATUS.pending.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Imobiliária</span>
                            <Badge variant="outline" className={cn("text-xs", SIGNATURE_STATUS.pending.color)}>
                              {SIGNATURE_STATUS.pending.label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="ai" className="p-4 space-y-4 mt-0">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Mensagens prontas</Label>
                      <div className="grid gap-2">
                        {AI_PROMPTS.map(prompt => (
                          <Button
                            key={prompt.id}
                            variant="outline"
                            className="h-auto p-3 justify-start text-left"
                            onClick={() => setAiMessage(prompt.template({
                              lead: selectedItem.lead,
                              property: selectedItem.property,
                              value: selectedItem.value,
                              terms: selectedItem.terms,
                            }))}
                          >
                            <prompt.icon className="h-4 w-4 mr-2 shrink-0" />
                            <span className="text-xs">{prompt.label}</span>
                          </Button>
                        ))}
                      </div>
                    </div>

                    {aiMessage && (
                      <div className="space-y-2 pb-4">
                        <Label className="text-xs text-muted-foreground">Mensagem</Label>
                        <Textarea
                          value={aiMessage}
                          onChange={(e) => setAiMessage(e.target.value)}
                          rows={6}
                          className="text-sm resize-none"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 h-10"
                            onClick={() => sendToWhatsApp(selectedItem.lead?.phone)}
                          >
                            <MessageCircle className="h-4 w-4 mr-1.5" />
                            Enviar WhatsApp
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-10"
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
