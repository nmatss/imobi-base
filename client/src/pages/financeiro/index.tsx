import { useState, useEffect, useMemo } from "react";
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Loader2,
  Edit,
  Copy,
  Trash2,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Home,
  HandCoins,
  Building,
  Receipt,
  Filter,
  Calendar,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Users,
  Sparkles,
  X,
  RefreshCw,
  Download,
  PieChart as PieChartIcon,
  BarChart3,
  TrendingUp as LineChartIcon,
  Info,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart,
} from "recharts";
import { AIAssistant } from "@/components/AIAssistant";
import { cn } from "@/lib/utils";

// ================== TIPOS ==================

type PeriodFilter = "today" | "current_month" | "last_month" | "last_quarter" | "year" | "custom";

type OriginType = "sale" | "rental" | "transfer" | "commission" | "manual" | null;

type TransactionStatus = "pending" | "completed" | "overdue";

type TransactionTab = "all" | "sales" | "rentals" | "transfers" | "commissions" | "manual";

type FinanceCategory = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  color: string | null;
  isSystemGenerated: boolean;
  createdAt: string;
};

type FinanceTransaction = {
  id: string;
  tenantId: string;
  categoryId: string | null;
  description: string;
  amount: string;
  flow: string;
  entryDate: string;
  status: TransactionStatus;
  originType: OriginType;
  originId: string | null;
  notes: string | null;
  createdAt: string;
  category?: FinanceCategory;
  relatedEntityType?: string;
  relatedEntityId?: string;
  // Dados relacionados para exibição
  relatedContract?: { id: string; referenceMonth?: string };
  relatedOwner?: { id: string; name: string };
  relatedRenter?: { id: string; name: string };
  relatedBroker?: { id: string; name: string };
  relatedProperty?: { id: string; title: string };
};

type MetricData = {
  commissionsReceived: number;
  rentalRevenue: number;
  ownerTransfers: number;
  saleRevenue: number;
  operationalExpenses: number;
  cashBalance: number;
  commissionsChange: number;
  rentalChange: number;
  transfersChange: number;
  salesChange: number;
  expensesChange: number;
  balanceChange: number;
  // Dados adicionais para contexto de IA
  topCategories?: { name: string; total: number }[];
  pendingPayments?: number;
  overduePayments?: number;
};

type ChartViewMode = "month" | "category" | "origin";

type StatusFilter = "all" | "pending" | "completed" | "overdue";

type FlowFilter = "all" | "income" | "expense";

// ================== UTILITÁRIOS ==================

function formatPrice(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatPriceCompact(price: string | number): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "R$ 0";
  if (Math.abs(num) >= 1000000) {
    return `R$ ${(num / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(num) >= 1000) {
    return `R$ ${(num / 1000).toFixed(1)}k`;
  }
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatDateShort(date: string): string {
  return new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function getPeriodLabel(period: PeriodFilter): string {
  switch (period) {
    case "today": return "Hoje";
    case "current_month": return "Este Mês";
    case "last_month": return "Mês Passado";
    case "last_quarter": return "Último Trimestre";
    case "year": return "Este Ano";
    case "custom": return "Personalizado";
    default: return "Este Mês";
  }
}

function getPeriodDates(period: PeriodFilter, customStart?: string, customEnd?: string): { start: string; end: string; prevStart: string; prevEnd: string } {
  const now = new Date();
  let start: Date, end: Date, prevStart: Date, prevEnd: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      prevStart = new Date(start);
      prevStart.setDate(start.getDate() - 1);
      prevEnd = new Date(prevStart);
      prevEnd.setHours(23, 59, 59);
      break;

    case "current_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;

    case "last_month":
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
      break;

    case "last_quarter":
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
      start = new Date(now.getFullYear(), quarterStartMonth, 1);
      end = new Date(now.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), quarterStartMonth - 3, 1);
      prevEnd = new Date(now.getFullYear(), quarterStartMonth, 0, 23, 59, 59);
      break;

    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      prevStart = new Date(now.getFullYear() - 1, 0, 1);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
      break;

    case "custom":
      if (!customStart || !customEnd) {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else {
        start = new Date(customStart);
        end = new Date(customEnd);
        const diff = end.getTime() - start.getTime();
        prevEnd = new Date(start.getTime() - 1);
        prevStart = new Date(prevEnd.getTime() - diff);
      }
      break;

    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    prevStart: prevStart.toISOString(),
    prevEnd: prevEnd.toISOString(),
  };
}

function getStatusBadgeVariant(status: TransactionStatus): "default" | "secondary" | "destructive" {
  switch (status) {
    case "pending": return "secondary";
    case "completed": return "default";
    case "overdue": return "destructive";
    default: return "default";
  }
}

function getStatusIcon(status: TransactionStatus) {
  switch (status) {
    case "pending": return <Clock className="h-3 w-3" />;
    case "completed": return <CheckCircle className="h-3 w-3" />;
    case "overdue": return <AlertCircle className="h-3 w-3" />;
  }
}

function getStatusLabel(status: TransactionStatus): string {
  switch (status) {
    case "pending": return "Previsto";
    case "completed": return "Realizado";
    case "overdue": return "Atrasado";
    default: return status;
  }
}

function getOriginBadgeColor(originType: OriginType): string {
  switch (originType) {
    case "sale": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    case "rental": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    case "transfer": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
    case "commission": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    case "manual": return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function getOriginIcon(originType: OriginType) {
  switch (originType) {
    case "sale": return <Building className="h-3 w-3" />;
    case "rental": return <Home className="h-3 w-3" />;
    case "transfer": return <ArrowUpCircle className="h-3 w-3" />;
    case "commission": return <HandCoins className="h-3 w-3" />;
    default: return <FileText className="h-3 w-3" />;
  }
}

function getOriginLabel(originType: OriginType): string {
  switch (originType) {
    case "sale": return "Venda";
    case "rental": return "Locação";
    case "transfer": return "Repasse";
    case "commission": return "Comissão";
    case "manual": return "Manual";
    default: return "Manual";
  }
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const DEFAULT_CATEGORIES = [
  { name: "Comissões de Venda", type: "income", color: "#10b981" },
  { name: "Comissões de Locação", type: "income", color: "#22c55e" },
  { name: "Taxas de Administração", type: "income", color: "#06b6d4" },
  { name: "Receitas de Aluguel", type: "income", color: "#3b82f6" },
  { name: "Taxas de IPTU", type: "income", color: "#0ea5e9" },
  { name: "Taxas de Condomínio", type: "income", color: "#6366f1" },
  { name: "Repasses a Proprietários", type: "expense", color: "#f59e0b" },
  { name: "Comissões de Corretores", type: "expense", color: "#eab308" },
  { name: "Salários e Encargos", type: "expense", color: "#ef4444" },
  { name: "Marketing e Publicidade", type: "expense", color: "#8b5cf6" },
  { name: "Aluguel de Escritório", type: "expense", color: "#ec4899" },
  { name: "Contas e Utilidades", type: "expense", color: "#84cc16" },
  { name: "Manutenção de Imóveis", type: "expense", color: "#14b8a6" },
  { name: "Honorários e Serviços", type: "expense", color: "#f97316" },
  { name: "Impostos e Taxas", type: "expense", color: "#dc2626" },
  { name: "Materiais e Suprimentos", type: "expense", color: "#a855f7" },
];

// ================== COMPONENTES AUXILIARES ==================

// Card de KPI responsivo
function KPICard({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
  valueColor,
  invertTrend = false,
  compact = false,
}: {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  iconColor: string;
  valueColor: string;
  invertTrend?: boolean;
  compact?: boolean;
}) {
  const isPositiveChange = invertTrend ? change <= 0 : change >= 0;
  const TrendIcon = change >= 0 ? TrendingUp : TrendingDown;
  const trendColor = isPositiveChange ? "text-green-500" : "text-red-500";

  return (
    <Card className="relative overflow-hidden">
      <CardContent className={cn("p-4", compact && "p-3")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn(
              "text-xs font-medium text-muted-foreground truncate",
              compact && "text-[10px]"
            )}>
              {title}
            </p>
            <p className={cn(
              "text-lg sm:text-xl lg:text-2xl font-bold mt-1 truncate",
              valueColor,
              compact && "text-base sm:text-lg"
            )}>
              {formatPriceCompact(value)}
            </p>
          </div>
          <div className={cn(
            "rounded-full p-2 shrink-0",
            iconColor.includes("green") && "bg-green-100 dark:bg-green-900/30",
            iconColor.includes("blue") && "bg-blue-100 dark:bg-blue-900/30",
            iconColor.includes("orange") && "bg-orange-100 dark:bg-orange-900/30",
            iconColor.includes("purple") && "bg-purple-100 dark:bg-purple-900/30",
            iconColor.includes("red") && "bg-red-100 dark:bg-red-900/30",
            iconColor.includes("muted") && "bg-muted",
          )}>
            <Icon className={cn("h-4 w-4", iconColor, compact && "h-3 w-3")} />
          </div>
        </div>
        <div className={cn(
          "flex items-center gap-1 mt-2 text-xs",
          trendColor,
          compact && "mt-1 text-[10px]"
        )}>
          <TrendIcon className={cn("h-3 w-3", compact && "h-2.5 w-2.5")} />
          <span className="font-medium">{formatPercentage(change)}</span>
          <span className="text-muted-foreground hidden sm:inline">vs anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Card de transação para mobile
function TransactionCard({
  transaction,
  onEdit,
  onDuplicate,
  onMarkAsPaid,
  onDelete,
}: {
  transaction: FinanceTransaction;
  onEdit: () => void;
  onDuplicate: () => void;
  onMarkAsPaid: () => void;
  onDelete: () => void;
}) {
  const isIncome = transaction.flow === "income";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-4 space-y-3">
          {/* Header com data e status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDate(transaction.entryDate)}
              </span>
              <Badge variant={getStatusBadgeVariant(transaction.status)} className="gap-1 text-xs">
                {getStatusIcon(transaction.status)}
                {getStatusLabel(transaction.status)}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {transaction.status === "pending" && (
                  <DropdownMenuItem onClick={onMarkAsPaid}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Pago
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Descrição e valor */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{transaction.description}</p>
              {transaction.notes && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {transaction.notes}
                </p>
              )}
            </div>
            <div className="text-right shrink-0">
              <p className={cn(
                "font-semibold text-base",
                isIncome ? "text-green-600" : "text-red-600"
              )}>
                {isIncome ? "+" : "-"} {formatPrice(transaction.amount)}
              </p>
            </div>
          </div>

          {/* Tags de categoria e origem */}
          <div className="flex flex-wrap gap-2">
            {transaction.category && (
              <Badge
                variant="outline"
                className="text-xs"
                style={{
                  borderColor: transaction.category.color || "#6b7280",
                  color: transaction.category.color || "#6b7280",
                }}
              >
                {transaction.category.name}
              </Badge>
            )}
            <Badge className={cn("text-xs gap-1", getOriginBadgeColor(transaction.originType))}>
              {getOriginIcon(transaction.originType)}
              {getOriginLabel(transaction.originType)}
              {transaction.originId && (
                <span className="opacity-75">#{transaction.originId.slice(0, 4)}</span>
              )}
            </Badge>
            <Badge variant={isIncome ? "default" : "destructive"} className="text-xs gap-1">
              {isIncome ? <ArrowUpCircle className="h-3 w-3" /> : <ArrowDownCircle className="h-3 w-3" />}
              {isIncome ? "Receita" : "Despesa"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Filtros avançados em Sheet para mobile
function FiltersSheet({
  statusFilter,
  setStatusFilter,
  flowFilter,
  setFlowFilter,
  categoryFilter,
  setCategoryFilter,
  categories,
  onClearFilters,
}: {
  statusFilter: StatusFilter;
  setStatusFilter: (v: StatusFilter) => void;
  flowFilter: FlowFilter;
  setFlowFilter: (v: FlowFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  categories: FinanceCategory[];
  onClearFilters: () => void;
}) {
  const hasFilters = statusFilter !== "all" || flowFilter !== "all" || categoryFilter !== "";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
              {[statusFilter !== "all", flowFilter !== "all", categoryFilter !== ""].filter(Boolean).length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
          <SheetDescription>
            Refine a visualização dos lançamentos
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Previsto</SelectItem>
                <SelectItem value="completed">Realizado</SelectItem>
                <SelectItem value="overdue">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={flowFilter} onValueChange={(v) => setFlowFilter(v as FlowFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Receitas e Despesas</SelectItem>
                <SelectItem value="income">Apenas Receitas</SelectItem>
                <SelectItem value="expense">Apenas Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || "#6b7280" }} />
                      {cat.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button variant="outline" onClick={onClearFilters} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ================== COMPONENTE PRINCIPAL ==================

export default function FinanceiroPage() {
  const { tenant } = useImobi();
  const { toast } = useToast();

  // Estados principais
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [metrics, setMetrics] = useState<MetricData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filtros
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("current_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<TransactionTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [chartViewMode, setChartViewMode] = useState<ChartViewMode>("month");

  // Filtros avançados
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [flowFilter, setFlowFilter] = useState<FlowFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Modais
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [showCustomPeriod, setShowCustomPeriod] = useState(false);

  // Formulários
  const [transactionForm, setTransactionForm] = useState({
    categoryId: "",
    description: "",
    amount: "",
    flow: "income",
    entryDate: new Date().toISOString().split("T")[0],
    status: "completed" as TransactionStatus,
    notes: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    type: "income",
    color: "#3b82f6",
  });

  // ================== FETCH DATA ==================

  const fetchMetrics = async () => {
    try {
      const dates = getPeriodDates(periodFilter, customStartDate, customEndDate);
      const params = new URLSearchParams({
        startDate: dates.start,
        endDate: dates.end,
        previousPeriodStart: dates.prevStart,
        previousPeriodEnd: dates.prevEnd,
      });

      const res = await fetch(`/api/financial/metrics?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const dates = getPeriodDates(periodFilter, customStartDate, customEndDate);
      const params = new URLSearchParams({
        startDate: dates.start,
        endDate: dates.end,
      });

      if (activeTab !== "all") {
        let originType = "";
        switch (activeTab) {
          case "sales": originType = "sale"; break;
          case "rentals": originType = "rental"; break;
          case "transfers": originType = "transfer"; break;
          case "commissions": originType = "commission"; break;
          case "manual": originType = "manual"; break;
        }
        if (originType) params.append("origin", originType);
      }

      const res = await fetch(`/api/financial/transactions?${params}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/finance-categories", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      await Promise.all([fetchMetrics(), fetchTransactions(), fetchCategories()]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodFilter, customStartDate, customEndDate, activeTab]);

  // ================== HANDLERS ==================

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        categoryId: transactionForm.categoryId || null,
        description: transactionForm.description,
        amount: transactionForm.amount,
        flow: transactionForm.flow,
        entryDate: new Date(transactionForm.entryDate).toISOString(),
        status: transactionForm.status,
        notes: transactionForm.notes || null,
      };

      const url = editingTransaction
        ? `/api/finance-entries/${editingTransaction.id}`
        : "/api/finance-entries";

      const res = await fetch(url, {
        method: editingTransaction ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar lançamento");
      }

      toast({
        title: editingTransaction ? "Lançamento atualizado" : "Lançamento criado",
        description: "O lançamento financeiro foi salvo com sucesso.",
      });

      setIsTransactionModalOpen(false);
      setEditingTransaction(null);
      resetTransactionForm();
      fetchData(true);
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: categoryForm.name,
        type: categoryForm.type,
        color: categoryForm.color,
      };

      const res = await fetch("/api/finance-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao criar categoria");
      }

      toast({
        title: "Categoria criada",
        description: "A categoria financeira foi criada com sucesso.",
      });

      setIsCategoryModalOpen(false);
      setCategoryForm({ name: "", type: "income", color: "#3b82f6" });
      fetchCategories();
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

  const handleCreateDefaultCategories = async () => {
    setIsSubmitting(true);
    try {
      const promises = DEFAULT_CATEGORIES.map((cat) =>
        fetch("/api/finance-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(cat),
        })
      );

      await Promise.all(promises);

      toast({
        title: "Categorias criadas",
        description: "Categorias padrão de imobiliária foram adicionadas.",
      });

      fetchCategories();
      setIsCategoryModalOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: "Erro ao criar categorias padrão.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = (transaction: FinanceTransaction) => {
    setEditingTransaction(transaction);
    setTransactionForm({
      categoryId: transaction.categoryId || "",
      description: transaction.description,
      amount: transaction.amount,
      flow: transaction.flow,
      entryDate: new Date(transaction.entryDate).toISOString().split("T")[0],
      status: transaction.status,
      notes: transaction.notes || "",
    });
    setIsTransactionModalOpen(true);
  };

  const handleDuplicateTransaction = (transaction: FinanceTransaction) => {
    setTransactionForm({
      categoryId: transaction.categoryId || "",
      description: `${transaction.description} (Cópia)`,
      amount: transaction.amount,
      flow: transaction.flow,
      entryDate: new Date().toISOString().split("T")[0],
      status: "pending",
      notes: transaction.notes || "",
    });
    setIsTransactionModalOpen(true);
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/finance-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar status");

      toast({
        title: "Status atualizado",
        description: "Lançamento marcado como realizado.",
      });

      fetchData(true);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      const res = await fetch(`/api/finance-entries/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Erro ao excluir lançamento");

      toast({
        title: "Lançamento excluído",
        description: "O lançamento foi removido com sucesso.",
      });

      fetchData(true);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetTransactionForm = () => {
    setTransactionForm({
      categoryId: "",
      description: "",
      amount: "",
      flow: "income",
      entryDate: new Date().toISOString().split("T")[0],
      status: "completed",
      notes: "",
    });
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setFlowFilter("all");
    setCategoryFilter("");
    setSearchQuery("");
  };

  // ================== DADOS PROCESSADOS ==================

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          t.description.toLowerCase().includes(query) ||
          (t.category?.name.toLowerCase().includes(query) || false) ||
          (t.originId?.toLowerCase().includes(query) || false) ||
          (t.notes?.toLowerCase().includes(query) || false);
        if (!matchesSearch) return false;
      }

      // Filtro de status
      if (statusFilter !== "all" && t.status !== statusFilter) return false;

      // Filtro de tipo (receita/despesa)
      if (flowFilter !== "all" && t.flow !== flowFilter) return false;

      // Filtro de categoria
      if (categoryFilter && t.categoryId !== categoryFilter) return false;

      return true;
    });
  }, [transactions, searchQuery, statusFilter, flowFilter, categoryFilter]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort(
      (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    );
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    if (chartViewMode === "month") {
      const months: Record<string, { income: number; expense: number }> = {};
      transactions.forEach((t) => {
        const month = new Date(t.entryDate).toISOString().slice(0, 7);
        if (!months[month]) months[month] = { income: 0, expense: 0 };
        const amount = parseFloat(t.amount || "0");
        if (t.flow === "income") {
          months[month].income += amount;
        } else {
          months[month].expense += amount;
        }
      });
      return Object.entries(months)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({
          name: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
          receitas: data.income,
          despesas: data.expense,
          margem: data.income - data.expense,
        }));
    } else if (chartViewMode === "category") {
      const categoryTotals: Record<string, { income: number; expense: number; color: string }> = {};
      transactions.forEach((t) => {
        const catName = t.category?.name || "Sem categoria";
        const catColor = t.category?.color || "#6b7280";
        if (!categoryTotals[catName]) {
          categoryTotals[catName] = { income: 0, expense: 0, color: catColor };
        }
        const amount = parseFloat(t.amount || "0");
        if (t.flow === "income") {
          categoryTotals[catName].income += amount;
        } else {
          categoryTotals[catName].expense += amount;
        }
      });
      return Object.entries(categoryTotals)
        .map(([name, data]) => ({
          name,
          value: data.income + data.expense,
          income: data.income,
          expense: data.expense,
          color: data.color,
        }))
        .filter((c) => c.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);
    } else {
      const originTotals: Record<string, { income: number; expense: number }> = {};
      transactions.forEach((t) => {
        const origin = getOriginLabel(t.originType);
        if (!originTotals[origin]) {
          originTotals[origin] = { income: 0, expense: 0 };
        }
        const amount = parseFloat(t.amount || "0");
        if (t.flow === "income") {
          originTotals[origin].income += amount;
        } else {
          originTotals[origin].expense += amount;
        }
      });
      return Object.entries(originTotals)
        .map(([name, data]) => ({
          name,
          receitas: data.income,
          despesas: data.expense,
          total: data.income + data.expense,
        }))
        .filter((c) => c.total > 0)
        .sort((a, b) => b.total - a.total);
    }
  }, [transactions, chartViewMode]);

  const marginData = useMemo(() => {
    const months: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const month = new Date(t.entryDate).toISOString().slice(0, 7);
      if (!months[month]) months[month] = { income: 0, expense: 0 };
      const amount = parseFloat(t.amount || "0");
      if (t.flow === "income") {
        months[month].income += amount;
      } else {
        months[month].expense += amount;
      }
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        name: new Date(month + "-01").toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
        margem: data.income - data.expense,
        receitas: data.income,
        despesas: data.expense,
      }));
  }, [transactions]);

  // Contexto para IA
  const aiContextData = useMemo(() => ({
    period: getPeriodLabel(periodFilter),
    metrics: metrics,
    totalTransactions: transactions.length,
    totalIncome: transactions.filter(t => t.flow === "income").reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0),
    totalExpense: transactions.filter(t => t.flow === "expense").reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0),
    pendingCount: transactions.filter(t => t.status === "pending").length,
    overdueCount: transactions.filter(t => t.status === "overdue").length,
    topCategories: chartData.slice(0, 5).map((c: any) => ({ name: c.name, value: c.value || c.receitas })),
    marginTrend: marginData.map(m => ({ month: m.name, margin: m.margem })),
  }), [periodFilter, metrics, transactions, chartData, marginData]);

  // ================== RENDER ==================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Controle Financeiro
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Comissões, aluguéis, repasses e despesas da imobiliária
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AIAssistant
              module="financial"
              contextData={aiContextData}
              variant="outline"
              size="sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:inline ml-2">Atualizar</span>
            </Button>
            <Button onClick={() => setIsTransactionModalOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Novo Lançamento</span>
            </Button>
          </div>
        </div>

        {/* Filtro de Período */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-2 block">Período</Label>
                <Select
                  value={periodFilter}
                  onValueChange={(v) => {
                    setPeriodFilter(v as PeriodFilter);
                    if (v === "custom") setShowCustomPeriod(true);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="current_month">Este Mês</SelectItem>
                    <SelectItem value="last_month">Mês Passado</SelectItem>
                    <SelectItem value="last_quarter">Último Trimestre</SelectItem>
                    <SelectItem value="year">Este Ano</SelectItem>
                    <SelectItem value="custom">Personalizado...</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodFilter === "custom" && (
                <>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">Data Início</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-2 block">Data Fim</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Grid - Responsivo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
        <KPICard
          title="Comissões"
          value={metrics?.commissionsReceived || 0}
          change={metrics?.commissionsChange || 0}
          icon={HandCoins}
          iconColor="text-green-500"
          valueColor="text-green-600"
          compact
        />
        <KPICard
          title="Receitas Aluguel"
          value={metrics?.rentalRevenue || 0}
          change={metrics?.rentalChange || 0}
          icon={Home}
          iconColor="text-blue-500"
          valueColor="text-blue-600"
          compact
        />
        <KPICard
          title="Repasses"
          value={metrics?.ownerTransfers || 0}
          change={metrics?.transfersChange || 0}
          icon={ArrowUpCircle}
          iconColor="text-orange-500"
          valueColor="text-orange-600"
          invertTrend
          compact
        />
        <KPICard
          title="Receitas Vendas"
          value={metrics?.saleRevenue || 0}
          change={metrics?.salesChange || 0}
          icon={Building}
          iconColor="text-purple-500"
          valueColor="text-purple-600"
          compact
        />
        <KPICard
          title="Despesas"
          value={metrics?.operationalExpenses || 0}
          change={metrics?.expensesChange || 0}
          icon={Receipt}
          iconColor="text-red-500"
          valueColor="text-red-600"
          invertTrend
          compact
        />
        <KPICard
          title="Saldo de Caixa"
          value={metrics?.cashBalance || 0}
          change={metrics?.balanceChange || 0}
          icon={Wallet}
          iconColor="text-muted-foreground"
          valueColor={(metrics?.cashBalance || 0) >= 0 ? "text-green-600" : "text-red-600"}
          compact
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
        {/* Gráfico Principal */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm sm:text-base">Receitas x Despesas</CardTitle>
                <CardDescription className="text-xs">
                  {chartViewMode === "month" ? "Últimos 6 meses" : chartViewMode === "category" ? "Por categoria" : "Por origem"}
                </CardDescription>
              </div>
              <Select value={chartViewMode} onValueChange={(v) => setChartViewMode(v as ChartViewMode)}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Por Mês
                    </div>
                  </SelectItem>
                  <SelectItem value="category">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      Por Categoria
                    </div>
                  </SelectItem>
                  <SelectItem value="origin">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Por Origem
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] sm:h-[300px]">
              {chartViewMode === "month" && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : chartViewMode === "category" && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        percent > 0.05 ? `${name.slice(0, 10)}... (${(percent * 100).toFixed(0)}%)` : ''
                      }
                      labelLine={false}
                    >
                      {chartData.map((entry: any, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ fontSize: 12 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : chartViewMode === "origin" && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
                    <RechartsTooltip
                      formatter={(value: number) => formatPrice(value)}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receitas" stackId="a" fill="#10b981" name="Receitas" />
                    <Bar dataKey="despesas" stackId="a" fill="#ef4444" name="Despesas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem dados para exibir</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Margem Operacional */}
        <Card>
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm sm:text-base">Margem Operacional</CardTitle>
              <CardDescription className="text-xs">
                Evolução do lucro nos últimos 6 meses
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[250px] sm:h-[300px]">
              {marginData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={marginData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip
                      formatter={(value: number, name: string) => [
                        formatPrice(value),
                        name === "margem" ? "Margem" : name === "receitas" ? "Receitas" : "Despesas"
                      ]}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="margem"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#marginGradient)"
                      name="Margem"
                    />
                    <Line
                      type="monotone"
                      dataKey="receitas"
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Receitas"
                    />
                    <Line
                      type="monotone"
                      dataKey="despesas"
                      stroke="#ef4444"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Despesas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <LineChartIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sem dados para exibir</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Lançamentos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg">Lançamentos Financeiros</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {sortedTransactions.length} lançamentos no período
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:flex-none sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar descrição, contrato..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <FiltersSheet
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  flowFilter={flowFilter}
                  setFlowFilter={setFlowFilter}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  categories={categories}
                  onClearFilters={clearFilters}
                />
              </div>
            </div>

            {/* Tabs de Origem */}
            <ScrollArea className="w-full">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TransactionTab)}>
                <TabsList className="inline-flex w-auto min-w-full sm:min-w-0">
                  <TabsTrigger value="all" className="text-xs sm:text-sm px-3">
                    Todos
                  </TabsTrigger>
                  <TabsTrigger value="sales" className="text-xs sm:text-sm px-3">
                    <Building className="h-3 w-3 mr-1 hidden sm:inline" />
                    Vendas
                  </TabsTrigger>
                  <TabsTrigger value="rentals" className="text-xs sm:text-sm px-3">
                    <Home className="h-3 w-3 mr-1 hidden sm:inline" />
                    Locação
                  </TabsTrigger>
                  <TabsTrigger value="transfers" className="text-xs sm:text-sm px-3">
                    <ArrowUpCircle className="h-3 w-3 mr-1 hidden sm:inline" />
                    Repasses
                  </TabsTrigger>
                  <TabsTrigger value="commissions" className="text-xs sm:text-sm px-3">
                    <HandCoins className="h-3 w-3 mr-1 hidden sm:inline" />
                    Comissões
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="text-xs sm:text-sm px-3">
                    <FileText className="h-3 w-3 mr-1 hidden sm:inline" />
                    Manual
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </CardHeader>

        <CardContent className="px-2 sm:px-4 pb-4">
          {sortedTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum lançamento encontrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || statusFilter !== "all" || flowFilter !== "all" || categoryFilter
                  ? "Tente ajustar os filtros"
                  : "Registre seu primeiro lançamento financeiro"}
              </p>
              <Button onClick={() => setIsTransactionModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </div>
          ) : (
            <>
              {/* Visualização em cards para mobile */}
              <div className="block lg:hidden space-y-3">
                {sortedTransactions.map((transaction) => (
                  <TransactionCard
                    key={transaction.id}
                    transaction={transaction}
                    onEdit={() => handleEditTransaction(transaction)}
                    onDuplicate={() => handleDuplicateTransaction(transaction)}
                    onMarkAsPaid={() => handleMarkAsPaid(transaction.id)}
                    onDelete={() => handleDeleteTransaction(transaction.id)}
                  />
                ))}
              </div>

              {/* Tabela para desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Data</th>
                      <th className="pb-3 font-medium">Descrição</th>
                      <th className="pb-3 font-medium">Tipo</th>
                      <th className="pb-3 font-medium">Categoria</th>
                      <th className="pb-3 font-medium text-right">Valor</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Origem</th>
                      <th className="pb-3 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sortedTransactions.map((transaction) => (
                      <tr key={transaction.id} className="text-sm hover:bg-muted/50 transition-colors">
                        <td className="py-3 whitespace-nowrap">
                          {formatDate(transaction.entryDate)}
                        </td>
                        <td className="py-3">
                          <div className="max-w-xs">
                            <div className="font-medium truncate">{transaction.description}</div>
                            {transaction.notes && (
                              <div className="text-xs text-muted-foreground truncate">
                                {transaction.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          {transaction.flow === "income" ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                              Receita
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                              Despesa
                            </Badge>
                          )}
                        </td>
                        <td className="py-3">
                          {transaction.category ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="max-w-[150px] truncate"
                                    style={{
                                      borderColor: transaction.category.color || "#6b7280",
                                      color: transaction.category.color || "#6b7280",
                                    }}
                                  >
                                    {transaction.category.name}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {transaction.category.name}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <span
                            className={cn(
                              "font-semibold",
                              transaction.flow === "income" ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {transaction.flow === "income" ? "+" : "-"} {formatPrice(transaction.amount)}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge variant={getStatusBadgeVariant(transaction.status)} className="gap-1">
                            {getStatusIcon(transaction.status)}
                            {getStatusLabel(transaction.status)}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge className={cn("gap-1", getOriginBadgeColor(transaction.originType))}>
                            {getOriginIcon(transaction.originType)}
                            {getOriginLabel(transaction.originType)}
                            {transaction.originId && (
                              <span className="ml-0.5 opacity-75">#{transaction.originId.slice(0, 4)}</span>
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {transaction.status === "pending" && (
                                <DropdownMenuItem onClick={() => handleMarkAsPaid(transaction.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Marcar como Realizado
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicateTransaction(transaction)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Novo/Editar Lançamento */}
      <Dialog
        open={isTransactionModalOpen}
        onOpenChange={(open) => {
          setIsTransactionModalOpen(open);
          if (!open) {
            setEditingTransaction(null);
            resetTransactionForm();
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
            <DialogDescription>
              {editingTransaction ? "Atualize as informações do lançamento" : "Registre uma receita ou despesa"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTransaction} className="space-y-4">
            {/* Tipo: Receita/Despesa */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={transactionForm.flow === "income" ? "default" : "outline"}
                className={cn(
                  "h-auto py-3",
                  transactionForm.flow === "income" && "bg-green-600 hover:bg-green-700"
                )}
                onClick={() => setTransactionForm({ ...transactionForm, flow: "income" })}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowUpCircle className="h-5 w-5" />
                  <span className="text-sm">Receita</span>
                </div>
              </Button>
              <Button
                type="button"
                variant={transactionForm.flow === "expense" ? "default" : "outline"}
                className={cn(
                  "h-auto py-3",
                  transactionForm.flow === "expense" && "bg-red-600 hover:bg-red-700"
                )}
                onClick={() => setTransactionForm({ ...transactionForm, flow: "expense" })}
              >
                <div className="flex flex-col items-center gap-1">
                  <ArrowDownCircle className="h-5 w-5" />
                  <span className="text-sm">Despesa</span>
                </div>
              </Button>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                placeholder="Ex: Comissão venda Apt 101"
                required
              />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                  placeholder="1500.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={transactionForm.entryDate}
                  onChange={(e) => setTransactionForm({ ...transactionForm, entryDate: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <div className="flex gap-2">
                <Select
                  value={transactionForm.categoryId}
                  onValueChange={(v) => setTransactionForm({ ...transactionForm, categoryId: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {categories
                      .filter((c) => c.type === transactionForm.flow || c.type === "both")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || "#6b7280" }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCategoryModalOpen(true)}
                  title="Criar categoria"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={transactionForm.status}
                onValueChange={(v) => setTransactionForm({ ...transactionForm, status: v as TransactionStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Previsto
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Realizado
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      Atrasado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={transactionForm.notes}
                onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                placeholder="Detalhes adicionais..."
                rows={3}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsTransactionModalOpen(false);
                  setEditingTransaction(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingTransaction ? "Atualizar" : "Criar"} Lançamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Categoria */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Crie uma categoria para organizar seus lançamentos</DialogDescription>
          </DialogHeader>

          {categories.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Você ainda não tem categorias. Deseja criar categorias padrão para imobiliárias?
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCreateDefaultCategories}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Categorias Padrão
              </Button>
            </div>
          )}

          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="Ex: Comissões, Aluguel, Marketing..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={categoryForm.type} onValueChange={(v) => setCategoryForm({ ...categoryForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">
                    <div className="flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-500" />
                      Receita
                    </div>
                  </SelectItem>
                  <SelectItem value="expense">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-500" />
                      Despesa
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-500" />
                      Ambos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      categoryForm.color === color && "ring-2 ring-offset-2 ring-primary"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setCategoryForm({ ...categoryForm, color })}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Categoria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
