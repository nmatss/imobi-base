import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Home,
  Loader2,
  Download,
  Calendar,
  FileText,
  Users,
  Clock,
  ArrowRight,
  BarChart3,
  Building2,
  Wallet,
  Filter,
  Star,
  StarOff,
  PieChart,
  Target,
  Activity
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import type {
  ReportFilters,
  SalesReportData,
  RentalsReportData,
  LeadsFunnelReportData,
  BrokerPerformanceData,
  PropertiesReportData,
  FinancialReportData,
  PERIOD_OPTIONS
} from "./types";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

const LEAD_STAGES = [
  { id: "new", label: "Novo", color: "#3b82f6" },
  { id: "qualification", label: "Qualificação", color: "#8b5cf6" },
  { id: "visit", label: "Visita", color: "#f97316" },
  { id: "proposal", label: "Proposta", color: "#eab308" },
  { id: "contract", label: "Contrato", color: "#22c55e" },
  { id: "lost", label: "Perdido", color: "#ef4444" },
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ComprehensiveReportsPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("sales");
  const [users, setUsers] = useState<User[]>([]);

  // Filters
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");

  // Report data
  const [salesReport, setSalesReport] = useState<SalesReportData | null>(null);
  const [rentalsReport, setRentalsReport] = useState<any>(null);
  const [funnelReport, setFunnelReport] = useState<LeadsFunnelReportData | null>(null);
  const [brokerReport, setBrokerReport] = useState<BrokerPerformanceData | null>(null);
  const [propertiesReport, setPropertiesReport] = useState<PropertiesReportData | null>(null);
  const [financialReport, setFinancialReport] = useState<FinancialReportData | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    fetchUsers();
    loadReports();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedBroker !== "all" && { brokerId: selectedBroker }),
      });

      // Load all reports in parallel
      const [salesRes, rentalsRes, funnelRes, brokerRes, propertiesRes, financialRes] = await Promise.all([
        fetch(`/api/reports/sales?${params}`, { credentials: "include" }),
        fetch(`/api/reports/rentals?${params}`, { credentials: "include" }),
        fetch(`/api/reports/leads-funnel?${params}`, { credentials: "include" }),
        fetch(`/api/reports/broker-performance?${params}`, { credentials: "include" }),
        fetch(`/api/reports/properties?${params}`, { credentials: "include" }),
        fetch(`/api/reports/financial-summary?${params}`, { credentials: "include" }),
      ]);

      if (salesRes.ok) setSalesReport(await salesRes.json());
      if (rentalsRes.ok) setRentalsReport(await rentalsRes.json());
      if (funnelRes.ok) setFunnelReport(await funnelRes.json());
      if (brokerRes.ok) setBrokerReport(await brokerRes.json());
      if (propertiesRes.ok) setPropertiesReport(await propertiesRes.json());
      if (financialRes.ok) setFinancialReport(await financialRes.json());
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    const now = new Date();
    const end = now.toISOString().split('T')[0];
    let start = new Date();

    switch (newPeriod) {
      case 'today':
        start = now;
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return; // custom - don't auto-update dates
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end);
  };

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data.length) return;

    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).join(","));
    const csv = [headers, ...rows].join("\n");

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${startDate}_${endDate}.csv`;
    link.click();
  };

  if (loading && !salesReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">
              Relatórios Gerenciais da Imobiliária
            </h1>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFavorite(!isFavorite)}
            >
              {isFavorite ? (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              ) : (
                <StarOff className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            Análises completas de vendas, aluguéis, funil, corretores, imóveis e finanças
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Globais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={period} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta semana</SelectItem>
                  <SelectItem value="month">Este mês</SelectItem>
                  <SelectItem value="quarter">Este trimestre</SelectItem>
                  <SelectItem value="year">Este ano</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Corretor</Label>
              <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os corretores</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadReports} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto">
          <TabsTrigger value="sales" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Vendas</span>
          </TabsTrigger>
          <TabsTrigger value="rentals" className="gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Aluguéis</span>
          </TabsTrigger>
          <TabsTrigger value="funnel" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Funil</span>
          </TabsTrigger>
          <TabsTrigger value="brokers" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Corretores</span>
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Imóveis</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Financeiro</span>
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Relatório de Vendas</h2>
            <Button
              variant="outline"
              onClick={() => salesReport && handleExportCSV(salesReport.sales, 'vendas')}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Sales KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{salesReport?.kpis.totalSales || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Vendas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(salesReport?.kpis.totalValue || 0)}</p>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(salesReport?.kpis.averageTicket || 0)}</p>
                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Activity className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatPercent(salesReport?.kpis.conversionRate || 0)}</p>
                    <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100">
                    <Users className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-lg font-bold truncate">{salesReport?.kpis.topBroker || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">Top Corretor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesReport?.salesByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendas por Tipo de Imóvel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={salesReport?.salesByType || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percent }: any) => `${type} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="value"
                      >
                        {(salesReport?.salesByType || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sales Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Detalhamento de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Data</th>
                      <th className="text-left py-3 px-4">Imóvel</th>
                      <th className="text-left py-3 px-4">Comprador</th>
                      <th className="text-left py-3 px-4">Corretor</th>
                      <th className="text-right py-3 px-4">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(salesReport?.sales || []).slice(0, 10).map((sale: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{new Date(sale.saleDate).toLocaleDateString('pt-BR')}</td>
                        <td className="py-3 px-4">{sale.property?.title || 'N/A'}</td>
                        <td className="py-3 px-4">{sale.buyer?.name || 'N/A'}</td>
                        <td className="py-3 px-4">{sale.broker?.name || 'N/A'}</td>
                        <td className="text-right py-3 px-4 font-semibold">{formatCurrency(Number(sale.saleValue))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rentals Tab */}
        <TabsContent value="rentals" className="space-y-6">
          <h2 className="text-xl font-semibold">Relatório de Aluguéis</h2>

          {/* Rentals KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{rentalsReport?.activeContracts || 0}</p>
                    <p className="text-sm text-muted-foreground">Contratos Ativos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(rentalsReport?.totalReceived || 0)}</p>
                    <p className="text-sm text-muted-foreground">Receita Recorrente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {rentalsReport && rentalsReport.totalOverdue > 0
                        ? formatPercent((rentalsReport.totalOverdue / (rentalsReport.totalReceived + rentalsReport.totalOverdue)) * 100)
                        : '0%'}
                    </p>
                    <p className="text-sm text-muted-foreground">Inadimplência</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Home className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatPercent(rentalsReport?.occupancyRate || 0)}</p>
                    <p className="text-sm text-muted-foreground">Taxa Ocupação</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Vencendo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Receitas e Inadimplência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rentalsReport?.paymentsByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="received" name="Recebido" stroke="#22c55e" strokeWidth={2} />
                    <Line type="monotone" dataKey="pending" name="Pendente" stroke="#f59e0b" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-6">
          <h2 className="text-xl font-semibold">Funil de Leads</h2>

          {/* Funnel Visualization */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(funnelReport?.funnel || []).map((stage, index) => {
                    const stageConfig = LEAD_STAGES.find(s => s.id === stage.stage) || LEAD_STAGES[0];
                    const maxCount = Math.max(...(funnelReport?.funnel || []).map(s => s.count));
                    const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

                    return (
                      <div key={stage.stage} className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium">{stageConfig.label}</div>
                        <div className="flex-1">
                          <div className="h-12 bg-muted rounded-lg overflow-hidden relative">
                            <div
                              className="h-full flex items-center justify-between px-4 transition-all"
                              style={{
                                width: `${width}%`,
                                backgroundColor: stageConfig.color,
                              }}
                            >
                              <span className="text-white font-bold">{stage.count}</span>
                              <span className="text-white text-sm">{stage.avgDays}d médio</span>
                            </div>
                          </div>
                        </div>
                        {index < (funnelReport?.funnel.length || 0) - 1 && (
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Origem dos Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={funnelReport?.sourceAnalysis || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ source, percent }: any) => `${source} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        dataKey="count"
                      >
                        {(funnelReport?.sourceAnalysis || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Win/Loss Analysis */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-green-600">{funnelReport?.wonLeads || 0}</p>
                    <p className="text-muted-foreground">Leads Ganhos</p>
                  </div>
                  <TrendingUp className="h-12 w-12 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-red-600">{funnelReport?.lostLeads || 0}</p>
                    <p className="text-muted-foreground">Leads Perdidos</p>
                  </div>
                  <TrendingDown className="h-12 w-12 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Brokers Tab */}
        <TabsContent value="brokers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Performance de Corretores</h2>
            <Button
              variant="outline"
              onClick={() => brokerReport && handleExportCSV(brokerReport.ranking, 'corretores')}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ranking de Corretores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Posição</th>
                      <th className="text-left py-3 px-4">Corretor</th>
                      <th className="text-center py-3 px-4">Leads</th>
                      <th className="text-center py-3 px-4">Visitas</th>
                      <th className="text-center py-3 px-4">Propostas</th>
                      <th className="text-center py-3 px-4">Fechados</th>
                      <th className="text-right py-3 px-4">Ticket Médio</th>
                      <th className="text-center py-3 px-4">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(brokerReport?.ranking || []).map((broker, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-bold">#{index + 1}</td>
                        <td className="py-3 px-4">{broker.name}</td>
                        <td className="text-center py-3 px-4">{broker.leadsWorked}</td>
                        <td className="text-center py-3 px-4">{broker.visits}</td>
                        <td className="text-center py-3 px-4">{broker.proposals}</td>
                        <td className="text-center py-3 px-4 font-semibold text-green-600">{broker.contractsClosed}</td>
                        <td className="text-right py-3 px-4">{formatCurrency(broker.averageTicket)}</td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant={broker.conversionRate >= 20 ? "default" : "secondary"}
                          >
                            {formatPercent(broker.conversionRate)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Comparação de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={brokerReport?.ranking || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="leadsWorked" name="Leads" fill="#3b82f6" />
                    <Bar dataKey="visits" name="Visitas" fill="#8b5cf6" />
                    <Bar dataKey="contractsClosed" name="Fechados" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-6">
          <h2 className="text-xl font-semibold">Relatório de Imóveis</h2>

          {/* Properties Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Imóveis Mais Visitados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(propertiesReport?.mostVisited || []).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.property.title}</p>
                        <p className="text-sm text-muted-foreground">{item.property.city}</p>
                      </div>
                      <Badge variant="outline">{item.visits} visitas</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Estoque por Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={propertiesReport?.inventoryByStatus || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percent }: any) => `${status} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="count"
                      >
                        {(propertiesReport?.inventoryByStatus || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stagnant Properties Alert */}
          {(propertiesReport?.stagnant || []).length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Imóveis Parados (sem visitas em 30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  {propertiesReport?.stagnant.length} imóveis precisam de atenção
                </p>
                <div className="grid gap-2">
                  {propertiesReport?.stagnant.slice(0, 5).map((property: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="font-medium">{property.title}</span>
                      <span className="text-sm text-muted-foreground">{property.city}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Time to Sell/Rent */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tempo Médio para Vender/Alugar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={propertiesReport?.timeToSellByType || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis label={{ value: 'Dias', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value: number) => `${value} dias`} />
                    <Bar dataKey="avgDays" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Relatório Financeiro (DRE Simplificado)</h2>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

          {/* DRE Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demonstração do Resultado (DRE)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <p className="text-sm text-muted-foreground">Receita de Vendas (Comissões)</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(financialReport?.dre.salesRevenue || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita de Aluguéis (Adm)</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(financialReport?.dre.rentalRevenue || 0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <p className="text-sm text-muted-foreground">Outras Receitas</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(financialReport?.dre.otherIncome || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(financialReport?.dre.totalRevenue || 0)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                  <div>
                    <p className="text-sm text-muted-foreground">Despesas Operacionais</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(financialReport?.dre.operationalExpenses || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lucro Líquido</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(financialReport?.dre.netProfit || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                  <span className="font-semibold">Margem de Lucro</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatPercent(financialReport?.dre.profitMargin || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Margin by Channel */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Margem por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={financialReport?.marginByChannel || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ channel, percent }: any) => `${channel} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="margin"
                      >
                        {(financialReport?.marginByChannel || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Margem por Corretor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={(financialReport?.marginByBroker || []).slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="broker" />
                      <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="margin" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* AI Assistant Panel (Contextual) */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Análise Inteligente AITOPIA
          </CardTitle>
          <CardDescription>
            Pergunte sobre seus dados e receba insights acionáveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Button variant="outline" className="justify-start h-auto py-3 px-4">
              <span className="text-left">Explique o que aconteceu com meu funil este mês</span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4">
              <span className="text-left">Quais corretores tiveram melhor conversão?</span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4">
              <span className="text-left">Quais imóveis estão travando meu estoque?</span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4">
              <span className="text-left">Gere um resumo executivo para apresentar aos sócios</span>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3 px-4">
              <span className="text-left">Identifique tendências de mercado baseadas nos dados</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
