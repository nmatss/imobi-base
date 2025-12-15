import { useState, useEffect, useCallback } from "react";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import {
  Home,
  Users,
  FileText,
  DollarSign,
  Plus,
  Loader2,
  MoreVertical,
  Phone,
  Mail,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  BarChart2,
  Download,
  Filter,
  TrendingUp,
  TrendingDown,
  X,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Sparkles,
  Send,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { RentalDashboard } from "./components/RentalDashboard";
import { RentalAlerts } from "./components/RentalAlerts";
import { LocadoresTab } from "./components/tabs/LocadoresTab";
import { InquilinosTab } from "./components/tabs/InquilinosTab";
import { RepassesTab } from "./components/tabs/RepassesTab";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { QuickSendModal } from "@/components/whatsapp/QuickSendModal";

import type {
  Owner,
  Renter,
  RentalContract,
  RentalPayment,
  RentalTransfer,
  Property,
  RentalMetrics,
  ChartDataPoint,
  RentalAlerts as RentalAlertsType,
  OwnerForm,
  RenterForm,
  ContractForm,
  PaymentForm,
} from "./types";
import { formatPrice, formatDate, formatMonth, getStatusColor, getStatusLabel, getDaysOverdue } from "./types";

type Period = "currentMonth" | "lastMonth" | "year";
type TabValue = "locadores" | "inquilinos" | "contratos" | "boletos" | "repasses" | "relatorios";

// AI Templates for AITOPIA
type RentalAIPrompt = {
  id: string;
  label: string;
  icon: typeof MessageCircle;
  template: (data: any) => string;
};

const RENTAL_AI_PROMPTS: RentalAIPrompt[] = [
  {
    id: "cobranca_amigavel",
    label: "Cobranca amigavel",
    icon: MessageCircle,
    template: (data: { renterName: string; value: string; daysOverdue: number }) =>
      `Ola ${data.renterName}! Esperamos que esteja bem. Identificamos que o aluguel no valor de ${data.value} esta com ${data.daysOverdue} dias de atraso. Sabemos que imprevistos acontecem, por isso gostaramos de verificar se ha algo em que possamos ajudar. Por favor, entre em contato conosco para regularizar a situacao. Estamos a disposicao!`,
  },
  {
    id: "reajuste_explicacao",
    label: "Explicar reajuste",
    icon: TrendingUp,
    template: (data: { renterName: string; oldValue: string; newValue: string; index: string }) =>
      `Prezado(a) ${data.renterName}, informamos que conforme previsto em contrato, seu aluguel sera reajustado pelo indice ${data.index}. O valor atual de ${data.oldValue} passara para ${data.newValue} a partir do proximo mes. Qualquer duvida, estamos a disposicao.`,
  },
  {
    id: "lembrete_vencimento",
    label: "Lembrete de vencimento",
    icon: Calendar,
    template: (data: { renterName: string; value: string; dueDate: string }) =>
      `Ola ${data.renterName}! Lembramos que o aluguel no valor de ${data.value} vence em ${data.dueDate}. Para sua comodidade, o pagamento pode ser realizado via PIX ou transferencia bancaria. Caso ja tenha efetuado o pagamento, desconsidere esta mensagem.`,
  },
  {
    id: "boas_vindas",
    label: "Boas-vindas",
    icon: Home,
    template: (data: { renterName: string; propertyTitle: string }) =>
      `Seja bem-vindo(a) ${data.renterName}! E um prazer te-lo como inquilino do imovel ${data.propertyTitle}. Estamos a disposicao para qualquer necessidade. Desejamos que sua estadia seja muito agradavel!`,
  },
];

export default function RentalsPage() {
  const { properties, tenant } = useImobi();
  const { toast } = useToast();

  // Main state
  const [activeTab, setActiveTab] = useState<TabValue>("locadores");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data state
  const [owners, setOwners] = useState<Owner[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [rentalContracts, setRentalContracts] = useState<RentalContract[]>([]);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [transfers, setTransfers] = useState<RentalTransfer[]>([]);

  // Metrics state
  const [metrics, setMetrics] = useState<RentalMetrics | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [alerts, setAlerts] = useState<RentalAlertsType | null>(null);
  const [chartPeriod, setChartPeriod] = useState<Period>("currentMonth");

  // Modal states
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isRenterModalOpen, setIsRenterModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // Form states
  const [ownerForm, setOwnerForm] = useState<OwnerForm>({
    name: "", email: "", phone: "", cpfCnpj: "", address: "",
    bankName: "", bankAgency: "", bankAccount: "", pixKey: "", notes: ""
  });

  const [renterForm, setRenterForm] = useState<RenterForm>({
    name: "", email: "", phone: "", cpfCnpj: "", rg: "", profession: "",
    income: "", address: "", emergencyContact: "", emergencyPhone: "", notes: ""
  });

  const [contractForm, setContractForm] = useState<ContractForm>({
    propertyId: "", ownerId: "", renterId: "", rentValue: "", condoFee: "",
    iptuValue: "", dueDay: "10", startDate: "", endDate: "", adjustmentIndex: "IGPM",
    depositValue: "", administrationFee: "10", notes: ""
  });

  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    rentalContractId: "", referenceMonth: "", dueDate: "", rentValue: "",
    condoFee: "", iptuValue: "", extraCharges: "", discounts: "", totalValue: "", notes: ""
  });

  // AI state
  const [aiMessage, setAiMessage] = useState("");
  const [aiContext, setAiContext] = useState<any>(null);

  // Contract filters
  const [contractFilters, setContractFilters] = useState({
    ownerId: "", renterId: "", propertyId: "", status: "", searchText: ""
  });

  // Payment filters
  const [paymentFilters, setPaymentFilters] = useState({
    status: "", contractId: "", periodPreset: "", startDate: "", endDate: "", onlyOverdue: false
  });

  // Report filters
  const [reportFilters, setReportFilters] = useState({
    ownerId: "", renterId: "", status: "", startDate: "", endDate: "",
    propertyId: "", minValue: "", maxValue: "", onlyOverdue: false, periodPreset: ""
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Report data
  const [ownerReport, setOwnerReport] = useState<any[]>([]);
  const [renterReport, setRenterReport] = useState<any[]>([]);
  const [paymentsReport, setPaymentsReport] = useState<any>(null);
  const [overdueReport, setOverdueReport] = useState<any>(null);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [ownersRes, rentersRes, contractsRes, paymentsRes, transfersRes, metricsRes, alertsRes] = await Promise.all([
        fetch("/api/owners", { credentials: "include" }),
        fetch("/api/renters", { credentials: "include" }),
        fetch("/api/rental-contracts", { credentials: "include" }),
        fetch("/api/rental-payments", { credentials: "include" }),
        fetch("/api/rental-transfers", { credentials: "include" }),
        fetch("/api/rentals/metrics", { credentials: "include" }),
        fetch("/api/rentals/alerts", { credentials: "include" }),
      ]);

      if (ownersRes.ok) setOwners(await ownersRes.json());
      if (rentersRes.ok) setRenters(await rentersRes.json());
      if (contractsRes.ok) setRentalContracts(await contractsRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (transfersRes.ok) setTransfers(await transfersRes.json());
      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (alertsRes.ok) setAlerts(await alertsRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erro", description: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch chart data
  const fetchChartData = useCallback(async (period: Period) => {
    try {
      const res = await fetch(`/api/rentals/metrics/chart?period=${period}`, { credentials: "include" });
      if (res.ok) {
        setChartData(await res.json());
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  }, []);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (reportFilters.ownerId) params.append("ownerId", reportFilters.ownerId);
      if (reportFilters.renterId) params.append("renterId", reportFilters.renterId);
      if (reportFilters.status) params.append("status", reportFilters.status);
      if (reportFilters.startDate) params.append("startDate", reportFilters.startDate);
      if (reportFilters.endDate) params.append("endDate", reportFilters.endDate);

      const [ownerRes, renterRes, paymentsRes, overdueRes] = await Promise.all([
        fetch(`/api/reports/owners?${params}`, { credentials: "include" }),
        fetch(`/api/reports/renters?${params}`, { credentials: "include" }),
        fetch(`/api/reports/payments-detailed?${params}`, { credentials: "include" }),
        fetch(`/api/reports/overdue`, { credentials: "include" }),
      ]);

      if (ownerRes.ok) setOwnerReport(await ownerRes.json());
      if (renterRes.ok) setRenterReport(await renterRes.json());
      if (paymentsRes.ok) setPaymentsReport(await paymentsRes.json());
      if (overdueRes.ok) setOverdueReport(await overdueRes.json());
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  }, [reportFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchChartData(chartPeriod);
  }, [chartPeriod, fetchChartData]);

  useEffect(() => {
    if (activeTab === "relatorios") {
      fetchReports();
    }
  }, [activeTab, fetchReports]);

  // CRUD Handlers
  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(ownerForm),
      });
      if (!res.ok) throw new Error("Erro ao criar locador");
      toast({ title: "Sucesso", description: "Locador criado com sucesso" });
      setIsOwnerModalOpen(false);
      setOwnerForm({ name: "", email: "", phone: "", cpfCnpj: "", address: "", bankName: "", bankAgency: "", bankAccount: "", pixKey: "", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateRenter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/renters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(renterForm),
      });
      if (!res.ok) throw new Error("Erro ao criar inquilino");
      toast({ title: "Sucesso", description: "Inquilino criado com sucesso" });
      setIsRenterModalOpen(false);
      setRenterForm({ name: "", email: "", phone: "", cpfCnpj: "", rg: "", profession: "", income: "", address: "", emergencyContact: "", emergencyPhone: "", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rental-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(contractForm),
      });
      if (!res.ok) throw new Error("Erro ao criar contrato");
      toast({ title: "Sucesso", description: "Contrato criado com sucesso" });
      setIsContractModalOpen(false);
      setContractForm({ propertyId: "", ownerId: "", renterId: "", rentValue: "", condoFee: "", iptuValue: "", dueDay: "10", startDate: "", endDate: "", adjustmentIndex: "IGPM", depositValue: "", administrationFee: "10", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rental-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(paymentForm),
      });
      if (!res.ok) throw new Error("Erro ao criar pagamento");
      toast({ title: "Sucesso", description: "Pagamento criado com sucesso" });
      setIsPaymentModalOpen(false);
      setPaymentForm({ rentalContractId: "", referenceMonth: "", dueDate: "", rentValue: "", condoFee: "", iptuValue: "", extraCharges: "", discounts: "", totalValue: "", notes: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaymentAsPaid = async (payment: RentalPayment) => {
    try {
      const res = await fetch(`/api/rental-payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "paid", paidValue: payment.totalValue, paidDate: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar pagamento");
      toast({ title: "Sucesso", description: "Pagamento marcado como pago" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleGenerateTransfers = async (referenceMonth: string) => {
    try {
      const res = await fetch("/api/rental-transfers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ referenceMonth }),
      });
      if (!res.ok) throw new Error("Erro ao gerar repasses");
      const newTransfers = await res.json();
      toast({ title: "Sucesso", description: `${newTransfers.length} repasses gerados` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleMarkTransferAsPaid = async (transfer: RentalTransfer) => {
    try {
      const res = await fetch(`/api/rental-transfers/${transfer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "paid", paidDate: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar repasse");
      toast({ title: "Sucesso", description: "Repasse marcado como pago" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  // WhatsApp handler
  const sendToWhatsApp = (phone?: string) => {
    if (!phone || !aiMessage) return;
    const cleanPhone = phone.replace(/\D/g, "");
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(aiMessage)}`;
    window.open(url, "_blank");
  };

  // Filter helpers for contracts
  const filteredContracts = rentalContracts.filter((contract) => {
    if (contractFilters.ownerId && contract.ownerId !== contractFilters.ownerId) return false;
    if (contractFilters.renterId && contract.renterId !== contractFilters.renterId) return false;
    if (contractFilters.propertyId && contract.propertyId !== contractFilters.propertyId) return false;
    if (contractFilters.status && contract.status !== contractFilters.status) return false;
    if (contractFilters.searchText) {
      const property = properties.find(p => p.id === contract.propertyId);
      const owner = owners.find(o => o.id === contract.ownerId);
      const renter = renters.find(r => r.id === contract.renterId);
      const searchLower = contractFilters.searchText.toLowerCase();
      if (
        !property?.title.toLowerCase().includes(searchLower) &&
        !owner?.name.toLowerCase().includes(searchLower) &&
        !renter?.name.toLowerCase().includes(searchLower)
      ) return false;
    }
    return true;
  });

  // Filter helpers for payments
  const filteredPayments = payments.filter((payment) => {
    if (paymentFilters.status && payment.status !== paymentFilters.status) return false;
    if (paymentFilters.contractId && payment.rentalContractId !== paymentFilters.contractId) return false;
    if (paymentFilters.onlyOverdue) {
      if (payment.status !== "pending" || new Date(payment.dueDate) >= new Date()) return false;
    }
    if (paymentFilters.startDate && new Date(payment.dueDate) < new Date(paymentFilters.startDate)) return false;
    if (paymentFilters.endDate && new Date(payment.dueDate) > new Date(paymentFilters.endDate)) return false;
    return true;
  });

  // Get payment status badge
  const getPaymentStatusBadge = (payment: RentalPayment) => {
    if (payment.status === "paid") {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Pago
        </Badge>
      );
    }
    const daysOverdue = getDaysOverdue(payment.dueDate);
    if (daysOverdue > 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <AlertCircle className="h-3 w-3 mr-1" />
          {daysOverdue}d atraso
        </Badge>
      );
    }
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
        <Clock className="h-3 w-3 mr-1" />
        Pendente
      </Badge>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-2xl font-heading font-bold">Alugueis</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gestao completa de locacoes, contratos e repasses
          </p>
        </div>
      </div>

      {/* Dashboard */}
      <RentalDashboard
        metrics={metrics}
        chartData={chartData}
        period={chartPeriod}
        onPeriodChange={setChartPeriod}
        loading={loading}
      />

      {/* Alerts */}
      <RentalAlerts
        alerts={alerts}
        loading={loading}
        onPaymentClick={(payment) => {
          setActiveTab("boletos");
        }}
        onContractClick={(contract) => {
          setActiveTab("contratos");
        }}
      />

      {/* Tabs - Mobile-First Scrollable */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <TabsList className="w-full sm:w-auto inline-flex min-w-max border-b border-border bg-transparent h-auto p-0 gap-0">
            <TabsTrigger
              value="contratos"
              className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <FileText className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Contratos
              <Badge variant="secondary" className="ml-1.5 text-[10px] hidden sm:inline-flex">{rentalContracts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="locadores"
              className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Building2 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Locadores
              <Badge variant="secondary" className="ml-1.5 text-[10px] hidden sm:inline-flex">{owners.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="inquilinos"
              className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Users className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Inquilinos
              <Badge variant="secondary" className="ml-1.5 text-[10px] hidden sm:inline-flex">{renters.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="boletos"
              className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <DollarSign className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Pagamentos
              <Badge variant="secondary" className="ml-1.5 text-[10px] hidden sm:inline-flex">{payments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="repasses"
              className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <CreditCard className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Repasses
              <Badge variant="secondary" className="ml-1.5 text-[10px] hidden sm:inline-flex">{transfers.length}</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="relatorios"
              className="text-xs sm:text-sm min-h-[44px] px-3 sm:px-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <BarChart2 className="h-4 w-4 mr-1.5 hidden sm:inline" />
              Relatorios
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Locadores Tab */}
        <TabsContent value="locadores" className="mt-4">
          <LocadoresTab
            owners={owners}
            contracts={rentalContracts}
            transfers={transfers}
            properties={properties}
            onCreateOwner={() => setIsOwnerModalOpen(true)}
            onViewOwner={(owner) => toast({ title: "Em breve", description: "Detalhes do locador" })}
            onEditOwner={(owner) => toast({ title: "Em breve", description: "Editar locador" })}
            onGenerateTransfer={(owner) => {
              const now = new Date();
              const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              handleGenerateTransfers(referenceMonth);
            }}
            loading={loading}
          />
        </TabsContent>

        {/* Inquilinos Tab */}
        <TabsContent value="inquilinos" className="mt-4">
          <InquilinosTab
            renters={renters}
            contracts={rentalContracts}
            payments={payments}
            onCreateRenter={() => setIsRenterModalOpen(true)}
            onViewRenter={(renter) => toast({ title: "Em breve", description: "Detalhes do inquilino" })}
            onEditRenter={(renter) => toast({ title: "Em breve", description: "Editar inquilino" })}
            onSendCollection={(renter) => {
              setAiContext({ renter });
              setAiMessage(RENTAL_AI_PROMPTS[0].template({
                renterName: renter.name,
                value: "R$ 1.500,00",
                daysOverdue: 5,
              }));
              setIsAIModalOpen(true);
            }}
            loading={loading}
          />
        </TabsContent>

        {/* Contratos Tab */}
        <TabsContent value="contratos" className="mt-4">
          <div className="space-y-4">
            {/* Filters */}
            <Card className="rounded-xl">
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contrato..."
                      value={contractFilters.searchText}
                      onChange={(e) => setContractFilters({ ...contractFilters, searchText: e.target.value })}
                      className="pl-9 min-h-[44px]"
                    />
                  </div>
                  <Select value={contractFilters.status} onValueChange={(v) => setContractFilters({ ...contractFilters, status: v })}>
                    <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="ended">Encerrados</SelectItem>
                      <SelectItem value="cancelled">Cancelados</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setIsContractModalOpen(true)} className="min-h-[44px]">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Novo Contrato</span>
                    <span className="sm:hidden">Novo</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Contracts List - Enhanced Mobile Cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : filteredContracts.length === 0 ? (
                <Card className="col-span-full rounded-xl">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum contrato encontrado
                  </CardContent>
                </Card>
              ) : (
                filteredContracts.map((contract) => {
                  const property = properties.find(p => p.id === contract.propertyId);
                  const owner = owners.find(o => o.id === contract.ownerId);
                  const renter = renters.find(r => r.id === contract.renterId);

                  return (
                    <Card key={contract.id} className="rounded-xl border-2 hover:shadow-md transition-all">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-base truncate">{property?.title || "Imovel"}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {renter?.name}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(contract.status)} shrink-0`}>
                            {getStatusLabel(contract.status)}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                          <span className="text-xs text-muted-foreground">Valor do Aluguel</span>
                          <span className="text-lg font-bold">{formatPrice(contract.rentValue)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground mb-1">Vencimento</p>
                            <p className="font-semibold">Dia {contract.dueDay}</p>
                          </div>
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground mb-1">Inicio</p>
                            <p className="font-semibold">{formatDate(contract.startDate)}</p>
                          </div>
                          <div className="text-center p-2 bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground mb-1">Fim</p>
                            <p className="font-semibold">{formatDate(contract.endDate)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm" className="flex-1 min-h-[40px]">
                            <FileText className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1 min-h-[40px]">
                            <Phone className="h-4 w-4 mr-1" />
                            Contato
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* Boletos Tab */}
        <TabsContent value="boletos" className="mt-4">
          <div className="space-y-4">
            {/* Filters */}
            <Card className="rounded-xl">
              <CardContent className="pt-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select value={paymentFilters.status} onValueChange={(v) => setPaymentFilters({ ...paymentFilters, status: v })}>
                    <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="paid">Pagos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant={paymentFilters.onlyOverdue ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentFilters({ ...paymentFilters, onlyOverdue: !paymentFilters.onlyOverdue })}
                    className="min-h-[44px]"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Apenas Atrasados</span>
                    <span className="sm:hidden">Atrasados</span>
                  </Button>
                  <div className="flex-1" />
                  <Button onClick={() => setIsPaymentModalOpen(true)} className="min-h-[44px]">
                    <Plus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Novo Pagamento</span>
                    <span className="sm:hidden">Novo</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payments Table - Desktop */}
            <div className="hidden sm:block">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : filteredPayments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum pagamento encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Badge variant="outline">{formatMonth(payment.referenceMonth)}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(payment.dueDate)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatPrice(payment.totalValue)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getPaymentStatusBadge(payment)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {payment.status === "pending" && (
                                  <DropdownMenuItem onClick={() => handleMarkPaymentAsPaid(payment)}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Marcar como Pago
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => toast({ title: "Em breve", description: "Gerar 2a via" })}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Gerar 2a Via
                                </DropdownMenuItem>
                                {payment.status === "pending" && getDaysOverdue(payment.dueDate) > 0 && (
                                  <DropdownMenuItem onClick={() => {
                                    const contract = rentalContracts.find(c => c.id === payment.rentalContractId);
                                    const renter = contract ? renters.find(r => r.id === contract.renterId) : null;
                                    if (renter) {
                                      setAiContext({ renter, payment });
                                      setAiMessage(RENTAL_AI_PROMPTS[0].template({
                                        renterName: renter.name,
                                        value: formatPrice(payment.totalValue),
                                        daysOverdue: getDaysOverdue(payment.dueDate),
                                      }));
                                      setIsAIModalOpen(true);
                                    }
                                  }}>
                                    <MessageCircle className="h-4 w-4 mr-2" />
                                    Enviar Cobranca
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Payments Cards - Mobile Enhanced */}
            <div className="sm:hidden space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <Card className="rounded-xl">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Nenhum pagamento encontrado
                  </CardContent>
                </Card>
              ) : (
                filteredPayments.map((payment) => {
                  const contract = rentalContracts.find(c => c.id === payment.rentalContractId);
                  const property = contract ? properties.find(p => p.id === contract.propertyId) : null;
                  const renter = contract ? renters.find(r => r.id === contract.renterId) : null;
                  const daysOverdue = getDaysOverdue(payment.dueDate);

                  return (
                    <Card key={payment.id} className="rounded-xl border-2 hover:shadow-md transition-all">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {formatMonth(payment.referenceMonth)}
                              </Badge>
                              {getPaymentStatusBadge(payment)}
                            </div>
                            <p className="font-medium text-sm truncate">{property?.title || "Imovel"}</p>
                            <p className="text-xs text-muted-foreground truncate">{renter?.name}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-3 px-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="text-xs text-muted-foreground">Valor Total</p>
                            <p className="text-2xl font-bold">{formatPrice(payment.totalValue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Vencimento</p>
                            <p className="text-sm font-medium">{formatDate(payment.dueDate)}</p>
                            {payment.status === "pending" && daysOverdue > 0 && (
                              <p className="text-xs text-red-600 font-medium">{daysOverdue}d atraso</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t">
                          {payment.status === "pending" && (
                            <Button
                              size="sm"
                              className="flex-1 min-h-[44px] bg-green-600 hover:bg-green-700"
                              onClick={() => handleMarkPaymentAsPaid(payment)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Marcar Pago
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="flex-1 min-h-[44px]">
                            <FileText className="h-4 w-4 mr-1" />
                            Boleto
                          </Button>
                          {payment.status === "pending" && daysOverdue > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="min-h-[44px] min-w-[44px] p-0"
                              onClick={() => {
                                const contract = rentalContracts.find(c => c.id === payment.rentalContractId);
                                const renter = contract ? renters.find(r => r.id === contract.renterId) : null;
                                if (renter) {
                                  setAiContext({ renter, payment });
                                  setAiMessage(RENTAL_AI_PROMPTS[0].template({
                                    renterName: renter.name,
                                    value: formatPrice(payment.totalValue),
                                    daysOverdue: getDaysOverdue(payment.dueDate),
                                  }));
                                  setIsAIModalOpen(true);
                                }
                              }}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>

        {/* Repasses Tab */}
        <TabsContent value="repasses" className="mt-4">
          <RepassesTab
            transfers={transfers}
            owners={owners}
            onGenerateTransfers={handleGenerateTransfers}
            onMarkAsPaid={handleMarkTransferAsPaid}
            onViewTransfer={(transfer) => toast({ title: "Em breve", description: "Detalhes do repasse" })}
            onExportTransfer={(transfer) => toast({ title: "Em breve", description: "Exportar repasse" })}
            loading={loading}
          />
        </TabsContent>

        {/* Relatorios Tab */}
        <TabsContent value="relatorios" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Relatorios de Locacao</CardTitle>
                <CardDescription>Analise o desempenho da sua carteira de alugueis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Locadores</p>
                          <p className="text-xl font-bold">{ownerReport.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Inquilinos</p>
                          <p className="text-xl font-bold">{renterReport.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total Recebido</p>
                          <p className="text-xl font-bold">{formatPrice(paymentsReport?.summary?.totalReceived || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Inadimplencia</p>
                          <p className="text-xl font-bold">{formatPrice(overdueReport?.summary?.totalOverdue || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Owner Modal */}
      <Dialog open={isOwnerModalOpen} onOpenChange={setIsOwnerModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Locador</DialogTitle>
            <DialogDescription>Cadastre um novo locador (proprietario)</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateOwner} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input value={ownerForm.name} onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={ownerForm.email} onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={ownerForm.cpfCnpj} onChange={(e) => setOwnerForm({ ...ownerForm, cpfCnpj: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Endereco</Label>
                <Input value={ownerForm.address} onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })} />
              </div>
              <div className="col-span-2 border-t pt-4">
                <p className="text-sm font-medium mb-2">Dados Bancarios</p>
              </div>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input value={ownerForm.bankName} onChange={(e) => setOwnerForm({ ...ownerForm, bankName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Agencia</Label>
                <Input value={ownerForm.bankAgency} onChange={(e) => setOwnerForm({ ...ownerForm, bankAgency: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Input value={ownerForm.bankAccount} onChange={(e) => setOwnerForm({ ...ownerForm, bankAccount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input value={ownerForm.pixKey} onChange={(e) => setOwnerForm({ ...ownerForm, pixKey: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observacoes</Label>
                <Textarea value={ownerForm.notes} onChange={(e) => setOwnerForm({ ...ownerForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOwnerModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renter Modal */}
      <Dialog open={isRenterModalOpen} onOpenChange={setIsRenterModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Inquilino</DialogTitle>
            <DialogDescription>Cadastre um novo inquilino</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRenter} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input value={renterForm.name} onChange={(e) => setRenterForm({ ...renterForm, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input value={renterForm.phone} onChange={(e) => setRenterForm({ ...renterForm, phone: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={renterForm.email} onChange={(e) => setRenterForm({ ...renterForm, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>CPF/CNPJ</Label>
                <Input value={renterForm.cpfCnpj} onChange={(e) => setRenterForm({ ...renterForm, cpfCnpj: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>RG</Label>
                <Input value={renterForm.rg} onChange={(e) => setRenterForm({ ...renterForm, rg: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Profissao</Label>
                <Input value={renterForm.profession} onChange={(e) => setRenterForm({ ...renterForm, profession: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Renda</Label>
                <Input value={renterForm.income} onChange={(e) => setRenterForm({ ...renterForm, income: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Endereco</Label>
                <Input value={renterForm.address} onChange={(e) => setRenterForm({ ...renterForm, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Contato de Emergencia</Label>
                <Input value={renterForm.emergencyContact} onChange={(e) => setRenterForm({ ...renterForm, emergencyContact: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tel. Emergencia</Label>
                <Input value={renterForm.emergencyPhone} onChange={(e) => setRenterForm({ ...renterForm, emergencyPhone: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observacoes</Label>
                <Textarea value={renterForm.notes} onChange={(e) => setRenterForm({ ...renterForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRenterModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contract Modal */}
      <Dialog open={isContractModalOpen} onOpenChange={setIsContractModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contrato de Locacao</DialogTitle>
            <DialogDescription>Crie um novo contrato de aluguel</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateContract} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Imovel *</Label>
                <Select value={contractForm.propertyId} onValueChange={(v) => setContractForm({ ...contractForm, propertyId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {properties.filter(p => p.category === "rent").map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Locador *</Label>
                <Select value={contractForm.ownerId} onValueChange={(v) => setContractForm({ ...contractForm, ownerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {owners.map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Inquilino *</Label>
                <Select value={contractForm.renterId} onValueChange={(v) => setContractForm({ ...contractForm, renterId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {renters.map(r => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do Aluguel *</Label>
                <Input type="number" step="0.01" value={contractForm.rentValue} onChange={(e) => setContractForm({ ...contractForm, rentValue: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Condominio</Label>
                <Input type="number" step="0.01" value={contractForm.condoFee} onChange={(e) => setContractForm({ ...contractForm, condoFee: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>IPTU</Label>
                <Input type="number" step="0.01" value={contractForm.iptuValue} onChange={(e) => setContractForm({ ...contractForm, iptuValue: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Dia Vencimento *</Label>
                <Input type="number" min="1" max="31" value={contractForm.dueDay} onChange={(e) => setContractForm({ ...contractForm, dueDay: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Data Inicio *</Label>
                <Input type="date" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input type="date" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Indice Reajuste</Label>
                <Select value={contractForm.adjustmentIndex} onValueChange={(v) => setContractForm({ ...contractForm, adjustmentIndex: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IGPM">IGPM</SelectItem>
                    <SelectItem value="IPCA">IPCA</SelectItem>
                    <SelectItem value="INPC">INPC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Taxa Administracao (%)</Label>
                <Input type="number" step="0.1" value={contractForm.administrationFee} onChange={(e) => setContractForm({ ...contractForm, administrationFee: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Caucao</Label>
                <Input type="number" step="0.01" value={contractForm.depositValue} onChange={(e) => setContractForm({ ...contractForm, depositValue: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observacoes</Label>
                <Textarea value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsContractModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Pagamento</DialogTitle>
            <DialogDescription>Registre um novo pagamento de aluguel</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePayment} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Contrato *</Label>
                <Select value={paymentForm.rentalContractId} onValueChange={(v) => {
                  const contract = rentalContracts.find(c => c.id === v);
                  if (contract) {
                    setPaymentForm({
                      ...paymentForm,
                      rentalContractId: v,
                      rentValue: contract.rentValue,
                      condoFee: contract.condoFee || "",
                      iptuValue: contract.iptuValue || "",
                      totalValue: (Number(contract.rentValue || 0) + Number(contract.condoFee || 0) + Number(contract.iptuValue || 0)).toString(),
                    });
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger>
                  <SelectContent>
                    {rentalContracts.filter(c => c.status === "active").map(c => {
                      const property = properties.find(p => p.id === c.propertyId);
                      return (
                        <SelectItem key={c.id} value={c.id}>{property?.title || "Contrato"}</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mes Referencia *</Label>
                <Input type="month" value={paymentForm.referenceMonth} onChange={(e) => setPaymentForm({ ...paymentForm, referenceMonth: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={paymentForm.dueDate} onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Valor Total *</Label>
                <Input type="number" step="0.01" value={paymentForm.totalValue} onChange={(e) => setPaymentForm({ ...paymentForm, totalValue: e.target.value })} required />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Observacoes</Label>
                <Textarea value={paymentForm.notes} onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Modal (AITOPIA) */}
      <Dialog open={isAIModalOpen} onOpenChange={setIsAIModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AITOPIA - Assistente de Locacao
            </DialogTitle>
            <DialogDescription>
              Mensagens prontas para comunicacao com inquilinos
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mensagens prontas</Label>
              <div className="grid gap-2">
                {RENTAL_AI_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt.id}
                    variant="outline"
                    className="h-auto p-3 justify-start text-left"
                    onClick={() => {
                      const renter = aiContext?.renter;
                      const payment = aiContext?.payment;
                      setAiMessage(prompt.template({
                        renterName: renter?.name || "Cliente",
                        value: payment ? formatPrice(payment.totalValue) : "R$ 1.500,00",
                        daysOverdue: payment ? getDaysOverdue(payment.dueDate) : 5,
                        oldValue: "R$ 1.500,00",
                        newValue: "R$ 1.600,00",
                        index: "IGPM",
                        dueDate: payment ? formatDate(payment.dueDate) : "10/01/2025",
                        propertyTitle: "Apartamento Centro",
                      }));
                    }}
                  >
                    <prompt.icon className="h-4 w-4 mr-2 shrink-0" />
                    <span className="text-xs">{prompt.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {aiMessage && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mensagem</Label>
                <Textarea
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  rows={6}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => sendToWhatsApp(aiContext?.renter?.phone)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1.5" />
                    Enviar WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
