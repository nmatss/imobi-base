import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommissionReports from "./CommissionReports";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  BarChart3,
  Building2,
  Wallet,
  Filter,
  Star,
  StarOff,
  Target,
  Activity,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  X,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Bookmark,
  Menu,
  Eye,
  Clock,
  HandCoins,
  Receipt
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/lib/toast-helpers";
import { cn } from "@/lib/utils";

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Report Types
type ReportType = "vendas" | "alugueis" | "leads" | "financeiro" | "corretores" | "comissoes";

interface ReportTypeCard {
  id: ReportType;
  title: string;
  icon: any;
  description: string;
  gradient: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SavedReport {
  id: string;
  name: string;
  type: ReportType;
  filters: any;
  createdAt: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatCompactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toString();
}

const REPORT_TYPES: ReportTypeCard[] = [
  {
    id: "comissoes",
    title: "Comissões",
    icon: HandCoins,
    description: "Comissões de vendas e locações com RPA",
    gradient: "from-emerald-500/10 to-emerald-500/5"
  },
  {
    id: "vendas",
    title: "Vendas",
    icon: DollarSign,
    description: "Comissões, ticket médio e conversão",
    gradient: "from-green-500/10 to-green-500/5"
  },
  {
    id: "alugueis",
    title: "Aluguéis",
    icon: Home,
    description: "Contratos, inadimplência e vacância",
    gradient: "from-blue-500/10 to-blue-500/5"
  },
  {
    id: "leads",
    title: "Funil de Leads",
    icon: Target,
    description: "Conversão e origem dos leads",
    gradient: "from-purple-500/10 to-purple-500/5"
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: Wallet,
    description: "DRE, margens e lucratividade",
    gradient: "from-orange-500/10 to-orange-500/5"
  },
  {
    id: "corretores",
    title: "Corretores",
    icon: Users,
    description: "Ranking e performance da equipe",
    gradient: "from-pink-500/10 to-pink-500/5"
  }
];

// KPI Card Component
function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  description
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: { value: number; direction: 'up' | 'down' };
  description?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-2">
          <div className={cn(
            "p-2 rounded-lg",
            "bg-gradient-to-br from-primary/10 to-primary/5"
          )}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          {trend && (
            <div className={cn(
              "flex items-center text-sm font-medium",
              trend.direction === 'up' ? "text-green-600" : "text-red-600"
            )}>
              {trend.direction === 'up' ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <p className="text-xl sm:text-2xl font-bold mb-1">{value}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Report Card for Mobile Table Alternative
function ReportCard({ data }: { data: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1">
            <p className="font-semibold text-sm mb-1">{data.title || data.property}</p>
            <p className="text-xs text-muted-foreground">{data.date || data.broker}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">{formatCurrency(data.value || 0)}</p>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform ml-auto mt-1",
              expanded && "transform rotate-180"
            )} />
          </div>
        </div>
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2 text-xs">
            {Object.entries(data).map(([key, value]) => (
              key !== 'id' && key !== 'title' && key !== 'property' && (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">{key}:</span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              )
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading Skeleton Component
function ChartSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-48 sm:h-64 lg:h-72 w-full" />
      <div className="flex justify-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [showSavedReports, setShowSavedReports] = useState(false);

  // Add print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 1cm;
        }

        body * {
          visibility: hidden;
        }

        #report-content, #report-content * {
          visibility: visible;
        }

        #report-content {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }

        .no-print {
          display: none !important;
        }

        .print-break-avoid {
          page-break-inside: avoid;
        }

        .print-break-after {
          page-break-after: always;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Filters
  const [period, setPeriod] = useState("month");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedBroker, setSelectedBroker] = useState<string>("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Report data
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
    loadSavedReports();
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

  const loadSavedReports = () => {
    // Mock saved reports - in production, fetch from backend
    setSavedReports([
      {
        id: "1",
        name: "Relatório Mensal Vendas",
        type: "vendas",
        filters: { period: "month" },
        createdAt: new Date().toISOString()
      },
      {
        id: "2",
        name: "Performance Trimestral",
        type: "corretores",
        filters: { period: "quarter" },
        createdAt: new Date().toISOString()
      }
    ]);
  };

  const loadReportData = async (type: ReportType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        ...(selectedBroker !== "all" && { brokerId: selectedBroker }),
      });

      let endpoint = '';
      switch (type) {
        case 'vendas':
          endpoint = '/api/reports/sales';
          break;
        case 'alugueis':
          endpoint = '/api/reports/rentals';
          break;
        case 'leads':
          endpoint = '/api/reports/leads-funnel';
          break;
        case 'financeiro':
          endpoint = '/api/reports/financial-summary';
          break;
        case 'corretores':
          endpoint = '/api/reports/broker-performance';
          break;
      }

      const res = await fetch(`${endpoint}?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.errors.operation("carregar o relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleReportTypeSelect = async (type: ReportType) => {
    setGeneratingReport(type);
    setSelectedReport(type);
    try {
      await loadReportData(type);
      toast.success("Relatório gerado", "Os dados foram carregados com sucesso");
    } catch (error) {
      toast.errors.operation("gerar o relatório");
    } finally {
      setGeneratingReport(null);
    }
  };

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    if (newPeriod === 'custom') {
      setShowDatePicker(true);
      return;
    }

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
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end);
    setShowDatePicker(false);
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'print') => {
    setExportLoading(true);
    try {
      if (format === 'print') {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        window.print();
        toast.info("Impressão iniciada", "Verifique a fila de impressão");
      } else if (format === 'excel') {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 800));
        const csvData = generateCSV();
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio_${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.action.downloaded("Relatório CSV");
      } else if (format === 'pdf') {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast.info("Em desenvolvimento", "Exportação para PDF será implementada em breve");
      }
      setShowExportOptions(false);
    } catch (error) {
      toast.error("Erro", "Não foi possível exportar o relatório");
    } finally {
      setExportLoading(false);
    }
  };

  const generateCSV = () => {
    if (!reportData) return '';

    let headers = '';
    let rows: string[] = [];

    switch (selectedReport) {
      case 'vendas':
        headers = 'Data,Imóvel,Comprador,Corretor,Valor\n';
        rows = (reportData.sales || []).map((sale: any) =>
          `${new Date(sale.saleDate).toLocaleDateString('pt-BR')},"${sale.property?.title || 'N/A'}","${sale.buyer?.name || 'N/A'}","${sale.broker?.name || 'N/A'}",${sale.saleValue}`
        );
        break;
      case 'corretores':
        headers = 'Posição,Corretor,Leads,Visitas,Propostas,Fechados,Ticket Médio,Conversão\n';
        rows = (reportData.ranking || []).map((broker: any, index: number) =>
          `${index + 1},"${broker.name}",${broker.leadsWorked},${broker.visits},${broker.proposals},${broker.contractsClosed},${broker.averageTicket},${broker.conversionRate}`
        );
        break;
      default:
        headers = 'Relatório\n';
        rows = ['Dados não disponíveis para exportação'];
    }

    return headers + rows.join('\n');
  };

  const handleSaveReport = () => {
    const newReport: SavedReport = {
      id: Date.now().toString(),
      name: `Relatório ${selectedReport} - ${new Date().toLocaleDateString('pt-BR')}`,
      type: selectedReport!,
      filters: { period, startDate, endDate, selectedBroker },
      createdAt: new Date().toISOString()
    };
    setSavedReports([newReport, ...savedReports]);
    toast.success("Relatório salvo", "Você pode acessá-lo rapidamente depois");
  };

  // Date Picker Bottom Sheet (Mobile)
  const DatePickerSheet = () => (
    <Sheet open={showDatePicker} onOpenChange={setShowDatePicker}>
      <SheetContent side="bottom" className="h-[80vh] sm:h-auto">
        <SheetHeader>
          <SheetTitle>Selecionar Período</SheetTitle>
          <SheetDescription>
            Escolha um período pré-definido ou selecione datas personalizadas
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['today', 'week', 'month', 'quarter', 'year'].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                className="h-14"
                onClick={() => {
                  handlePeriodChange(p);
                  setShowDatePicker(false);
                }}
              >
                {p === 'today' && 'Hoje'}
                {p === 'week' && '7 dias'}
                {p === 'month' && '30 dias'}
                {p === 'quarter' && 'Trimestre'}
                {p === 'year' && 'Ano'}
              </Button>
            ))}
          </div>
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Período Personalizado</h4>
            <div className="space-y-3">
              <div>
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 h-12"
                />
              </div>
              <div>
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 h-12"
                />
              </div>
              <Button
                className="w-full h-12"
                onClick={() => {
                  setPeriod('custom');
                  setShowDatePicker(false);
                  if (selectedReport) loadReportData(selectedReport);
                }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" size="sm" />
                    Aplicando...
                  </>
                ) : (
                  'Aplicar Período'
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Export Options Bottom Sheet (Mobile)
  const ExportSheet = () => (
    <Sheet open={showExportOptions} onOpenChange={setShowExportOptions}>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Exportar Relatório</SheetTitle>
          <SheetDescription>
            Escolha o formato de exportação
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-3">
          <Button
            variant="outline"
            className="w-full h-14 justify-start text-left"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <Spinner className="h-5 w-5 mr-3" />
            ) : (
              <FileText className="h-5 w-5 mr-3 text-red-500" />
            )}
            <div>
              <div className="font-semibold">{exportLoading ? 'Exportando...' : 'PDF'}</div>
              {!exportLoading && <div className="text-xs text-muted-foreground">Documento portátil</div>}
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full h-14 justify-start text-left"
            onClick={() => handleExport('excel')}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <Spinner className="h-5 w-5 mr-3" />
            ) : (
              <FileSpreadsheet className="h-5 w-5 mr-3 text-green-500" />
            )}
            <div>
              <div className="font-semibold">{exportLoading ? 'Exportando...' : 'Excel'}</div>
              {!exportLoading && <div className="text-xs text-muted-foreground">Planilha editável</div>}
            </div>
          </Button>
          <Button
            variant="outline"
            className="w-full h-14 justify-start text-left"
            onClick={() => handleExport('print')}
            disabled={exportLoading}
          >
            {exportLoading ? (
              <Spinner className="h-5 w-5 mr-3" />
            ) : (
              <Printer className="h-5 w-5 mr-3 text-blue-500" />
            )}
            <div>
              <div className="font-semibold">{exportLoading ? 'Imprimindo...' : 'Imprimir'}</div>
              {!exportLoading && <div className="text-xs text-muted-foreground">Enviar para impressora</div>}
            </div>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Filters Bottom Sheet (Mobile)
  const FiltersSheet = () => (
    <Sheet open={showFilters} onOpenChange={setShowFilters}>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Filtros do Relatório</SheetTitle>
          <SheetDescription>
            Refine os dados exibidos
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div>
            <Label>Corretor</Label>
            <Select value={selectedBroker} onValueChange={setSelectedBroker}>
              <SelectTrigger className="mt-1 h-12">
                <SelectValue placeholder="Todos os corretores" />
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
          <div>
            <Label>Período</Label>
            <Button
              variant="outline"
              className="w-full h-12 justify-between mt-1"
              onClick={() => {
                setShowFilters(false);
                setShowDatePicker(true);
              }}
            >
              <span>
                {period === 'custom'
                  ? `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}`
                  : period === 'today' ? 'Hoje'
                  : period === 'week' ? '7 dias'
                  : period === 'month' ? '30 dias'
                  : period === 'quarter' ? 'Trimestre'
                  : 'Ano'
                }
              </span>
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
          <Button
            className="w-full h-12"
            onClick={() => {
              setShowFilters(false);
              if (selectedReport) loadReportData(selectedReport);
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner className="mr-2" size="sm" />
                Aplicando...
              </>
            ) : (
              'Aplicar Filtros'
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  // Render Report Type Selection Screen
  if (!selectedReport) {
    return (
      <TooltipProvider>
      <div className="space-y-4 sm:space-y-6 pb-8 px-4 sm:px-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
            Relatórios Gerenciais
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecione o tipo de relatório que deseja visualizar
          </p>
        </div>

        {/* Saved Reports Quick Access */}
        {savedReports.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                  Relatórios Salvos
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSavedReports(!showSavedReports)}
                >
                  {showSavedReports ? (
                    <>Ocultar <ChevronDown className="h-4 w-4 ml-1" /></>
                  ) : (
                    <>Ver todos <ChevronRight className="h-4 w-4 ml-1" /></>
                  )}
                </Button>
              </div>
            </CardHeader>
            {showSavedReports && (
              <CardContent>
                <div className="space-y-2">
                  {savedReports.slice(0, 3).map((report) => (
                    <Button
                      key={report.id}
                      variant="outline"
                      className="w-full justify-start h-auto py-3 px-4"
                      onClick={() => {
                        setSelectedReport(report.type);
                        // Apply saved filters
                        setPeriod(report.filters.period);
                        setStartDate(report.filters.startDate);
                        setEndDate(report.filters.endDate);
                        setSelectedBroker(report.filters.selectedBroker || 'all');
                        loadReportData(report.type);
                      }}
                    >
                      <div className="text-left flex-1">
                        <div className="font-semibold text-sm">{report.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Report Type Cards - 2 Column Grid on Mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          {REPORT_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Card
                key={type.id}
                className={cn(
                  "group cursor-pointer transition-all duration-300",
                  "hover:shadow-lg hover:border-primary/50 hover:-translate-y-1",
                  "active:scale-95",
                  "overflow-hidden"
                )}
                onClick={() => handleReportTypeSelect(type.id)}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center",
                      "bg-gradient-to-br transition-transform duration-300 group-hover:scale-110",
                      type.gradient
                    )}>
                      <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedReport(type.id);
                            loadReportData(type.id);
                            setTimeout(() => setShowExportOptions(true), 500);
                          }}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Exportar relatório</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base mb-2">
                    {type.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
                    {type.description}
                  </p>
                  {/* Preview thumbnail */}
                  <div className="bg-muted rounded-md h-24 sm:h-32 flex items-center justify-center overflow-hidden">
                    <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/30" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={generatingReport === type.id}
                    >
                      {generatingReport === type.id ? (
                        <>
                          <Spinner className="mr-2" size="sm" />
                          Gerando...
                        </>
                      ) : (
                        'Gerar'
                      )}
                    </Button>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReportTypeSelect(type.id);
                            setTimeout(() => setShowExportOptions(true), 500);
                          }}
                          disabled={generatingReport === type.id}
                        >
                          {generatingReport === type.id ? (
                            <Spinner className="w-4 h-4" size="sm" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Baixar relatório</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats Preview */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Resumo Rápido do Mês</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-green-600">12</p>
                <p className="text-xs text-muted-foreground">Vendas</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">38</p>
                <p className="text-xs text-muted-foreground">Contratos</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-purple-600">156</p>
                <p className="text-xs text-muted-foreground">Leads</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-xl sm:text-2xl font-bold text-orange-600">87%</p>
                <p className="text-xs text-muted-foreground">Meta</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </TooltipProvider>
    );
  }

  // Special handling for Commission Reports
  if (selectedReport === "comissoes") {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedReport(null)}
          className="mb-4"
        >
          <X className="h-4 w-4 mr-2" />
          Voltar aos Relatórios
        </Button>
        <CommissionReports />
      </div>
    );
  }

  // Render Selected Report
  const reportConfig = REPORT_TYPES.find(r => r.id === selectedReport)!;
  const Icon = reportConfig.icon;

  return (
    <TooltipProvider>
    <div className="space-y-4 sm:space-y-6 pb-8 px-4 sm:px-0">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedReport(null);
              setReportData(null);
            }}
            className="h-9 w-9 p-0 sm:h-10 sm:w-auto sm:px-4"
          >
            <X className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Voltar</span>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h1 className="text-xl sm:text-3xl font-heading font-bold">
                {reportConfig.title}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              {reportConfig.description}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveReport}
                className="h-9 sm:h-10 no-print"
              >
                <Bookmark className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Salvar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Salvar relatório para acesso rápido</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportOptions(true)}
                className="h-9 sm:h-10 no-print"
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Exportar como PDF, Excel ou Imprimir</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Report Content Wrapper for Print */}
      <div id="report-content">
        {/* Print Header */}
        <div className="hidden print:block mb-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h1 className="text-2xl font-bold">ImobiBase - Relatório de {reportConfig.title}</h1>
              <p className="text-sm text-muted-foreground">
                Período: {new Date(startDate).toLocaleDateString('pt-BR')} a {new Date(endDate).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">
                Gerado em: {new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

      {/* Filters Bar - Mobile Optimized */}
      <Card className="no-print">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            {/* Mobile: Single Filter Button */}
            <div className="sm:hidden flex-1 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11 justify-between"
                onClick={() => setShowFilters(true)}
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm">Filtros</span>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {selectedBroker !== 'all' ? '1' : '0'}
                </Badge>
              </Button>
              <Button
                variant="outline"
                className="h-11 px-3"
                onClick={() => setShowDatePicker(true)}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>

            {/* Desktop: Inline Filters */}
            <div className="hidden sm:flex items-center gap-3 flex-1">
              <div className="flex-1 max-w-xs">
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">7 dias</SelectItem>
                    <SelectItem value="month">30 dias</SelectItem>
                    <SelectItem value="quarter">Trimestre</SelectItem>
                    <SelectItem value="year">Ano</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-10 w-40"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-10 w-40"
                  />
                </>
              )}

              <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                <SelectTrigger className="h-10 w-48">
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

              <Button
                onClick={() => loadReportData(selectedReport)}
                className="h-10"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="mr-2" size="sm" />
                    Aplicando...
                  </>
                ) : (
                  'Aplicar'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && !reportData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                  <Skeleton className="h-6 w-20 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <ChartSkeleton />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {/* KPIs Summary - 2 Column Grid on Mobile */}
          {reportData && renderKPIs(selectedReport, reportData)}

          {/* Charts */}
          {reportData && renderCharts(selectedReport, reportData)}

          {/* Data Tables */}
          {reportData && renderTables(selectedReport, reportData)}
        </>
      )}

      {/* Bottom Sheets */}
      <DatePickerSheet />
      <ExportSheet />
      <FiltersSheet />

      </div> {/* End of report-content */}
    </div>
    </TooltipProvider>
  );

  // Render KPIs based on report type
  function renderKPIs(type: ReportType, data: any) {
    switch (type) {
      case 'vendas':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <KPICard
              title="Total de Vendas"
              value={data.kpis?.totalSales || 0}
              icon={BarChart3}
              trend={{ value: 12, direction: 'up' }}
            />
            <KPICard
              title="Valor Total"
              value={formatCurrency(data.kpis?.totalValue || 0)}
              icon={DollarSign}
              trend={{ value: 8, direction: 'up' }}
            />
            <KPICard
              title="Ticket Médio"
              value={formatCurrency(data.kpis?.averageTicket || 0)}
              icon={TrendingUp}
            />
            <KPICard
              title="Taxa de Conversão"
              value={formatPercent(data.kpis?.conversionRate || 0)}
              icon={Target}
              trend={{ value: 3, direction: 'down' }}
            />
            <KPICard
              title="Top Corretor"
              value={data.kpis?.topBroker || 'N/A'}
              icon={Users}
            />
          </div>
        );
      case 'alugueis':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              title="Contratos Ativos"
              value={data.activeContracts || 0}
              icon={FileText}
            />
            <KPICard
              title="Receita Recorrente"
              value={formatCurrency(data.totalReceived || 0)}
              icon={DollarSign}
              trend={{ value: 5, direction: 'up' }}
            />
            <KPICard
              title="Taxa de Inadimplência"
              value={formatPercent(
                data.totalOverdue > 0
                  ? (data.totalOverdue / (data.totalReceived + data.totalOverdue)) * 100
                  : 0
              )}
              icon={AlertCircle}
              trend={{ value: 2, direction: 'down' }}
            />
            <KPICard
              title="Taxa de Ocupação"
              value={formatPercent(data.occupancyRate || 0)}
              icon={Home}
            />
          </div>
        );
      case 'leads':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              title="Total de Leads"
              value={data.funnel?.reduce((acc: number, stage: any) => acc + stage.count, 0) || 0}
              icon={Target}
            />
            <KPICard
              title="Leads Ganhos"
              value={data.wonLeads || 0}
              icon={Check}
              trend={{ value: 15, direction: 'up' }}
            />
            <KPICard
              title="Leads Perdidos"
              value={data.lostLeads || 0}
              icon={X}
              trend={{ value: 5, direction: 'down' }}
            />
            <KPICard
              title="Taxa de Conversão"
              value={formatPercent(
                data.wonLeads > 0
                  ? (data.wonLeads / (data.wonLeads + data.lostLeads)) * 100
                  : 0
              )}
              icon={Activity}
            />
          </div>
        );
      case 'financeiro':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              title="Receita Total"
              value={formatCurrency(data.dre?.totalRevenue || 0)}
              icon={DollarSign}
              trend={{ value: 10, direction: 'up' }}
            />
            <KPICard
              title="Despesas"
              value={formatCurrency(data.dre?.operationalExpenses || 0)}
              icon={TrendingDown}
            />
            <KPICard
              title="Lucro Líquido"
              value={formatCurrency(data.dre?.netProfit || 0)}
              icon={TrendingUp}
              trend={{ value: 18, direction: 'up' }}
            />
            <KPICard
              title="Margem de Lucro"
              value={formatPercent(data.dre?.profitMargin || 0)}
              icon={Activity}
            />
          </div>
        );
      case 'corretores':
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <KPICard
              title="Total de Corretores"
              value={data.ranking?.length || 0}
              icon={Users}
            />
            <KPICard
              title="Melhor Conversão"
              value={
                data.ranking?.[0]
                  ? formatPercent(data.ranking[0].conversionRate)
                  : '0%'
              }
              icon={Star}
            />
            <KPICard
              title="Total de Leads"
              value={
                data.ranking?.reduce(
                  (acc: number, broker: any) => acc + broker.leadsWorked,
                  0
                ) || 0
              }
              icon={Target}
            />
            <KPICard
              title="Contratos Fechados"
              value={
                data.ranking?.reduce(
                  (acc: number, broker: any) => acc + broker.contractsClosed,
                  0
                ) || 0
              }
              icon={Check}
            />
          </div>
        );
      default:
        return null;
    }
  }

  // Render Charts based on report type
  function renderCharts(type: ReportType, data: any) {
    switch (type) {
      case 'vendas':
        return (
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Vendas por Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-48 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.salesByMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        tickFormatter={(value) => formatCompactNumber(value)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'Valor']}
                      />
                      <Bar
                        dataKey="value"
                        fill="#22c55e"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Vendas por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-48 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={data.salesByType || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ type, percent }: any) =>
                          `${type} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius="70%"
                        dataKey="value"
                      >
                        {(data.salesByType || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'alugueis':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Receitas Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-48 sm:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.paymentsByMonth || []}>
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={(value) => formatCompactNumber(value)}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="received"
                      stroke="#22c55e"
                      fillOpacity={1}
                      fill="url(#colorReceived)"
                      name="Recebido"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="pending"
                      stroke="#f59e0b"
                      fillOpacity={1}
                      fill="url(#colorPending)"
                      name="Pendente"
                      strokeWidth={2}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      case 'leads':
        return (
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Funil de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data.funnel || []).map((stage: any, index: number) => {
                    const maxCount = Math.max(...(data.funnel || []).map((s: any) => s.count));
                    const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;

                    return (
                      <div key={stage.stage} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium capitalize">{stage.stage}</span>
                          <span className="text-muted-foreground">
                            {stage.count} leads · {stage.avgDays}d médio
                          </span>
                        </div>
                        <div className="h-10 sm:h-12 bg-muted rounded-lg overflow-hidden relative">
                          <div
                            className="h-full flex items-center justify-between px-3 sm:px-4 transition-all duration-500"
                            style={{
                              width: `${width}%`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          >
                            <span className="text-white font-bold text-sm sm:text-base">
                              {stage.count}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Origem dos Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-48 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={data.sourceAnalysis || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ source, percent }: any) =>
                          `${source} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius="70%"
                        dataKey="count"
                      >
                        {(data.sourceAnalysis || []).map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'financeiro':
        return (
          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Margem por Canal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-48 sm:h-64 lg:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.marginByChannel || []}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        dataKey="channel"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        tickFormatter={(value) => formatCompactNumber(value)}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb'
                        }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar
                        dataKey="margin"
                        fill="#8b5cf6"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">DRE Simplificado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <span className="text-sm font-medium">Receita de Vendas</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(data.dre?.salesRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <span className="text-sm font-medium">Receita de Aluguéis</span>
                    <span className="font-bold text-blue-600">
                      {formatCurrency(data.dre?.rentalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <span className="text-sm font-medium">Outras Receitas</span>
                    <span className="font-bold text-purple-600">
                      {formatCurrency(data.dre?.otherIncome || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center p-3 bg-primary/10 rounded-lg">
                    <span className="font-semibold">Receita Total</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(data.dre?.totalRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <span className="text-sm font-medium">Despesas Operacionais</span>
                    <span className="font-bold text-red-600">
                      {formatCurrency(data.dre?.operationalExpenses || 0)}
                    </span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center p-3 bg-green-100 dark:bg-green-950/30 rounded-lg">
                    <span className="font-semibold">Lucro Líquido</span>
                    <span className="text-lg font-bold text-green-600">
                      {formatCurrency(data.dre?.netProfit || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'corretores':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Performance Comparativa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-48 sm:h-64 lg:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={(data.ranking || []).slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="leadsWorked" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="visits" name="Visitas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="contractsClosed" name="Fechados" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  }

  // Render Tables based on report type
  function renderTables(type: ReportType, data: any) {
    switch (type) {
      case 'vendas':
        if (!data.sales || data.sales.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Detalhamento de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Data</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Imóvel</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Comprador</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Corretor</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.slice(0, 10).map((sale: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 text-sm">
                          {new Date(sale.saleDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium">
                          {sale.property?.title || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {sale.buyer?.name || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {sale.broker?.name || 'N/A'}
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-sm">
                          {formatCurrency(Number(sale.saleValue))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="sm:hidden space-y-3">
                {data.sales.slice(0, 10).map((sale: any, index: number) => (
                  <ReportCard
                    key={index}
                    data={{
                      title: sale.property?.title || 'N/A',
                      date: new Date(sale.saleDate).toLocaleDateString('pt-BR'),
                      broker: sale.broker?.name || 'N/A',
                      buyer: sale.buyer?.name || 'N/A',
                      value: Number(sale.saleValue)
                    }}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case 'corretores':
        if (!data.ranking || data.ranking.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Ranking de Corretores</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Posição</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Corretor</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Leads</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Visitas</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Propostas</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Fechados</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm">Ticket Médio</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">Conversão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ranking.map((broker: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-sm">#{index + 1}</td>
                        <td className="py-3 px-4 font-medium text-sm">{broker.name}</td>
                        <td className="text-center py-3 px-4 text-sm">{broker.leadsWorked}</td>
                        <td className="text-center py-3 px-4 text-sm">{broker.visits}</td>
                        <td className="text-center py-3 px-4 text-sm">{broker.proposals}</td>
                        <td className="text-center py-3 px-4 font-semibold text-green-600 text-sm">
                          {broker.contractsClosed}
                        </td>
                        <td className="text-right py-3 px-4 text-sm">
                          {formatCurrency(broker.averageTicket)}
                        </td>
                        <td className="text-center py-3 px-4">
                          <Badge
                            variant={broker.conversionRate >= 20 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {formatPercent(broker.conversionRate)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card List */}
              <div className="lg:hidden space-y-3">
                {data.ranking.map((broker: any, index: number) => (
                  <Card key={index} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-semibold">{broker.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {broker.contractsClosed} contratos fechados
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={broker.conversionRate >= 20 ? "default" : "secondary"}
                        >
                          {formatPercent(broker.conversionRate)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Leads</p>
                          <p className="font-semibold text-sm">{broker.leadsWorked}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Visitas</p>
                          <p className="font-semibold text-sm">{broker.visits}</p>
                        </div>
                        <div className="p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Propostas</p>
                          <p className="font-semibold text-sm">{broker.proposals}</p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Ticket Médio</span>
                        <span className="font-bold text-sm">
                          {formatCurrency(broker.averageTicket)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  }
}
