import { useState, useEffect, useMemo } from "react";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  HandCoins,
  Calendar,
  Filter,
  Download,
  FileSpreadsheet,
  Printer,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  DollarSign,
  Loader2,
  RefreshCw,
  Search,
  X,
  Building2,
  Home,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import CommissionReportTable, { Commission } from "@/components/reports/CommissionReportTable";
import CommissionReceipt from "@/components/reports/CommissionReceipt";
import {
  formatCurrency,
  formatDate,
  exportToCSV,
  printDocument,
  generatePDF,
  calculateCommissionStats,
} from "@/lib/report-generators";

type PeriodFilter = "current_month" | "last_month" | "quarter" | "year" | "custom";
type StatusFilter = "all" | "pending" | "paid";
type TypeFilter = "all" | "sale" | "rental";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function CommissionReports() {
  const { tenant } = useImobi();
  const { toast } = useToast();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("current_month");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [brokerFilter, setBrokerFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");

  // UI State
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [periodFilter, customStartDate, customEndDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Get date range
      const { start, end } = getPeriodDates();

      // Fetch commissions from sales
      const salesRes = await fetch(
        `/api/property-sales?startDate=${start}&endDate=${end}`,
        { credentials: "include" }
      );
      const sales = salesRes.ok ? await salesRes.json() : [];

      // Fetch brokers
      const brokersRes = await fetch("/api/users?role=broker", {
        credentials: "include",
      });
      const brokersData = brokersRes.ok ? await brokersRes.json() : [];
      setBrokers(brokersData);

      // Fetch company info
      const companyRes = await fetch("/api/tenant", { credentials: "include" });
      const companyData = companyRes.ok ? await companyRes.json() : null;
      setCompany(companyData);

      // Transform sales to commissions
      const transformedCommissions: Commission[] = sales
        .filter((s: any) => s.commissionValue && parseFloat(s.commissionValue) > 0)
        .map((sale: any) => ({
          id: sale.id,
          date: sale.saleDate || sale.createdAt,
          type: "sale" as const,
          propertyTitle: sale.property?.title || "Imóvel",
          propertyAddress: sale.property?.address || "",
          clientName: sale.buyerLead?.name || "Cliente",
          transactionValue: sale.saleValue || "0",
          commissionRate: sale.commissionRate || "6",
          commissionValue: sale.commissionValue || "0",
          brokerName: sale.broker?.name || "Sem corretor",
          brokerId: sale.brokerId,
          status: sale.commissionPaid ? "paid" : "pending",
          createdAt: sale.createdAt,
        }));

      setCommissions(transformedCommissions);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar comissões",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPeriodDates = () => {
    const now = new Date();
    let start: Date, end: Date;

    switch (periodFilter) {
      case "current_month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterStart, 1);
        end = new Date(now.getFullYear(), quarterStart + 3, 0, 23, 59, 59);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case "custom":
        start = customStartDate ? new Date(customStartDate) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = customEndDate ? new Date(customEndDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  // Filtered commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      // Status filter
      if (statusFilter !== "all" && c.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== "all" && c.type !== typeFilter) return false;

      // Broker filter
      if (brokerFilter.length > 0 && c.brokerId && !brokerFilter.includes(c.brokerId))
        return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          c.propertyTitle.toLowerCase().includes(query) ||
          c.clientName.toLowerCase().includes(query) ||
          c.brokerName.toLowerCase().includes(query);
        if (!matches) return false;
      }

      // Value range
      const commValue = parseFloat(String(c.commissionValue));
      if (minValue && commValue < parseFloat(minValue)) return false;
      if (maxValue && commValue > parseFloat(maxValue)) return false;

      return true;
    });
  }, [commissions, statusFilter, typeFilter, brokerFilter, searchQuery, minValue, maxValue]);

  // Statistics
  const stats = useMemo(() => calculateCommissionStats(filteredCommissions), [filteredCommissions]);

  // Chart data - commission trend by month
  const trendData = useMemo(() => {
    const monthlyData: Record<string, number> = {};
    filteredCommissions.forEach((c) => {
      const month = new Date(c.date).toISOString().slice(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + parseFloat(String(c.commissionValue));
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, value]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", {
          month: "short",
          year: "2-digit",
        }),
        value,
      }));
  }, [filteredCommissions]);

  // Chart data - by broker
  const brokerData = useMemo(() => {
    const brokerTotals: Record<string, number> = {};
    filteredCommissions.forEach((c) => {
      brokerTotals[c.brokerName] =
        (brokerTotals[c.brokerName] || 0) + parseFloat(String(c.commissionValue));
    });

    return Object.entries(brokerTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredCommissions]);

  // Chart data - sales vs rentals
  const typeComparisonData = useMemo(() => {
    return [
      {
        name: "Vendas",
        value: stats.byType.sales,
      },
      {
        name: "Locações",
        value: stats.byType.rentals,
      },
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Handlers
  const handleViewReceipt = (commission: Commission) => {
    setSelectedCommission(commission);
    setShowReceiptDialog(true);
  };

  const handleMarkAsPaid = async (ids: string[]) => {
    try {
      // Update commission status
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/property-sales/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ commissionPaid: true }),
          })
        )
      );

      toast({
        title: "Comissões atualizadas",
        description: `${ids.length} comissão(ões) marcada(s) como paga(s)`,
      });

      fetchData();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar comissões",
        variant: "destructive",
      });
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const data = filteredCommissions.map((c) => ({
        Data: formatDate(c.date),
        Tipo: c.type === "sale" ? "Venda" : "Locação",
        Imóvel: c.propertyTitle,
        Cliente: c.clientName,
        "Valor Transação": formatCurrency(c.transactionValue),
        "Taxa (%)": c.commissionRate,
        Comissão: formatCurrency(c.commissionValue),
        Corretor: c.brokerName,
        Status: c.status === "paid" ? "Pago" : "Pendente",
      }));

      exportToCSV(data, `comissoes_${new Date().toISOString().split("T")[0]}.csv`);

      toast({
        title: "Exportado com sucesso",
        description: "Relatório exportado em formato CSV",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao exportar relatório",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!selectedCommission) return;
    printDocument("commission-receipt");
  };

  const handleDownloadPDF = async () => {
    if (!selectedCommission) return;
    try {
      await generatePDF(
        "commission-receipt",
        `recibo_${selectedCommission.id.slice(0, 8)}.pdf`
      );
      toast({
        title: "PDF gerado",
        description: "Recibo baixado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao gerar PDF",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setBrokerFilter([]);
    setSearchQuery("");
    setMinValue("");
    setMaxValue("");
  };

  const hasActiveFilters =
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    brokerFilter.length > 0 ||
    searchQuery !== "" ||
    minValue !== "" ||
    maxValue !== "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <HandCoins className="h-7 w-7 text-primary" />
            Relatório de Comissões
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Análise completa de comissões de vendas e locações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCSV}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel/CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Period */}
              <div className="space-y-2">
                <Label className="text-xs">Período</Label>
                <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Este Mês</SelectItem>
                    <SelectItem value="last_month">Mês Passado</SelectItem>
                    <SelectItem value="quarter">Trimestre Atual</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Pendente
                      </div>
                    </SelectItem>
                    <SelectItem value="paid">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Pago
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-xs">Tipo</Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sale">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Vendas
                      </div>
                    </SelectItem>
                    <SelectItem value="rental">
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        Locações
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <Label className="text-xs">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Imóvel, cliente, corretor..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Custom date range */}
            {periodFilter === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Value range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Valor Mínimo (R$)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Valor Máximo (R$)</Label>
                <Input
                  type="number"
                  placeholder="10000.00"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  step="0.01"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Comissões</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(stats.total)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatCurrency(stats.pending)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Pago</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {formatCurrency(stats.paid)}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Média</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {formatCurrency(stats.average)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-500 opacity-50" />
          </div>
        </Card>

        <Card className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Top Corretor</p>
              <p className="text-sm font-bold text-amber-700 mt-1 truncate">
                {stats.topBroker.name}
              </p>
              <p className="text-xs text-amber-600">
                {formatCurrency(stats.topBroker.total)}
              </p>
            </div>
            <Award className="h-8 w-8 text-amber-500 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução Mensal</CardTitle>
            <CardDescription>Comissões nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    name="Comissões"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales vs Rentals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas x Locações</CardTitle>
            <CardDescription>Distribuição por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {typeComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeComparisonData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} (${(percent * 100).toFixed(0)}%)`
                      }
                    >
                      {typeComparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p className="text-sm">Sem dados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Brokers Chart */}
      {brokerData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 Corretores</CardTitle>
            <CardDescription>Ranking por comissões no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brokerData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Commission Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listagem de Comissões</CardTitle>
          <CardDescription>
            {filteredCommissions.length} comissão(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <div className="py-12 text-center">
              <HandCoins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma comissão encontrada</h3>
              <p className="text-sm text-muted-foreground">
                Ajuste os filtros ou selecione outro período
              </p>
            </div>
          ) : (
            <CommissionReportTable
              commissions={filteredCommissions}
              onViewReceipt={handleViewReceipt}
              onMarkAsPaid={handleMarkAsPaid}
              selectable
            />
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recibo de Comissão</DialogTitle>
            <DialogDescription>
              Visualize, imprima ou baixe o recibo em PDF
            </DialogDescription>
          </DialogHeader>

          {selectedCommission && company && (
            <>
              <CommissionReceipt
                commission={selectedCommission}
                broker={{
                  name: selectedCommission.brokerName,
                  cpf: "",
                  email: "",
                  phone: "",
                }}
                company={{
                  name: company.name || "Imobiliária",
                  logo: company.logo,
                  cnpj: company.cnpj || "",
                  address: company.address,
                  phone: company.phone,
                  email: company.email,
                }}
              />

              <div className="flex justify-end gap-2 pt-4 border-t no-print">
                <Button variant="outline" onClick={handlePrintReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
