import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  Home,
  Wallet,
  Receipt,
  Building2,
  Calendar,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { FinancialMetrics, PeriodOption } from "../types";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type Props = {
  metrics: FinancialMetrics;
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onAddTransaction?: () => void;
  isRefreshing?: boolean;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyCompact(value: number) {
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
}

function KPICard({
  title,
  value,
  variation,
  icon: Icon,
  bgColor,
  iconColor,
  isExpense = false,
  onClick,
}: {
  title: string;
  value: number;
  variation: number;
  icon: React.ElementType;
  bgColor: string;
  iconColor: string;
  isExpense?: boolean;
  onClick?: () => void;
}) {
  const isPositiveVariation = isExpense ? variation < 0 : variation > 0;
  const showVariation = !isNaN(variation) && isFinite(variation);

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all duration-200 overflow-hidden",
        onClick && "cursor-pointer hover:scale-105"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={cn(
            "rounded-full p-2.5 shrink-0 shadow-sm",
            bgColor
          )}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
          {showVariation && (
            <Badge
              variant={isPositiveVariation ? "default" : "destructive"}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5"
            >
              {isPositiveVariation ? (
                <TrendingUp className="h-2.5 w-2.5" />
              ) : (
                <TrendingDown className="h-2.5 w-2.5" />
              )}
              {Math.abs(variation).toFixed(1)}%
            </Badge>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground truncate mb-1">
            {title}
          </p>
          <p className={cn(
            "text-2xl sm:text-3xl font-bold truncate",
            value >= 0 ? "text-foreground" : "text-red-600"
          )}>
            {formatCurrencyCompact(value)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinancialDashboard({
  metrics,
  period,
  onPeriodChange,
  isLoading,
  onRefresh,
  onAddTransaction,
  isRefreshing = false,
}: Props) {
  const getPeriodLabel = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        return format(now, "dd 'de' MMMM", { locale: ptBR });
      case 'currentMonth':
        return format(now, "MMMM 'de' yyyy", { locale: ptBR });
      case 'lastMonth':
        return format(subMonths(now, 1), "MMMM 'de' yyyy", { locale: ptBR });
      case 'year':
        return format(now, "yyyy", { locale: ptBR });
      default:
        return 'Período personalizado';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-2 flex-1">
            <div className="h-7 bg-muted animate-pulse rounded w-64" />
            <div className="h-4 bg-muted animate-pulse rounded w-48" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="h-10 bg-muted animate-pulse rounded flex-1 sm:w-32" />
            <div className="h-10 bg-muted animate-pulse rounded flex-1 sm:w-40" />
          </div>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Period Selector and Actions */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Controle Financeiro
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Comissões, aluguéis, repasses e despesas
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            )}
            {onAddTransaction && (
              <Button onClick={onAddTransaction} size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Lançamento</span>
              </Button>
            )}
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={period} onValueChange={(value) => onPeriodChange(value as PeriodOption)}>
                <SelectTrigger className="w-full sm:w-[200px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="currentMonth">Mês Atual</SelectItem>
                  <SelectItem value="lastMonth">Mês Anterior</SelectItem>
                  <SelectItem value="year">Ano Atual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground hidden md:inline">
                {getPeriodLabel()}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - 2x3 Grid on Mobile, Full Grid on Desktop */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <KPICard
          title="Comissões"
          value={metrics.commissionsReceived}
          variation={metrics.periodVariation}
          icon={DollarSign}
          bgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600"
        />
        <KPICard
          title="Repasses"
          value={metrics.ownerTransfers}
          variation={0}
          icon={Receipt}
          bgColor="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600"
          isExpense
        />
        <KPICard
          title="Receita Aluguel"
          value={metrics.rentalRevenue}
          variation={0}
          icon={Home}
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600"
        />
        <KPICard
          title="Receita Venda"
          value={metrics.salesRevenue}
          variation={0}
          icon={Building2}
          bgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600"
        />
        <KPICard
          title="Despesas"
          value={metrics.operationalExpenses}
          variation={0}
          icon={Banknote}
          bgColor="bg-red-100 dark:bg-red-900/30"
          iconColor="text-red-600"
          isExpense
        />
        <KPICard
          title="Saldo"
          value={metrics.cashBalance}
          variation={metrics.periodVariation}
          icon={Wallet}
          bgColor={metrics.cashBalance >= 0 ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"}
          iconColor={metrics.cashBalance >= 0 ? "text-emerald-600" : "text-red-600"}
        />
      </div>
    </div>
  );
}
