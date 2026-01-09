import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  Plus,
  RefreshCw,
} from "lucide-react";
import type { FinancialMetrics, PeriodOption } from "../types";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import FinancialSummaryCard from "./FinancialSummaryCard";

type Props = {
  metrics: FinancialMetrics;
  period: PeriodOption;
  onPeriodChange: (period: PeriodOption) => void;
  isLoading?: boolean;
  onRefresh?: () => void;
  onAddTransaction?: () => void;
  isRefreshing?: boolean;
};

// Helper to calculate accounts receivable (contas a receber)
function calculateAccountsReceivable(metrics: FinancialMetrics): number {
  // This would normally come from the API, but for now we'll use a portion of revenue
  // In a real implementation, this should be fetched from scheduled transactions
  return metrics.rentalRevenue * 0.3; // Example: 30% of rental revenue is pending
}

// Helper to calculate accounts payable (contas a pagar)
function calculateAccountsPayable(metrics: FinancialMetrics): number {
  // This would normally come from the API
  return metrics.ownerTransfers * 0.2; // Example: 20% of transfers are pending
}

// Helper to calculate overdue amount (inadimplência)
function calculateOverdueAmount(metrics: FinancialMetrics): number {
  // This would normally come from the API
  return metrics.rentalRevenue * 0.05; // Example: 5% is overdue
}

const iconA11yProps = { "aria-hidden": true, focusable: false } as const;

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

  // Calculate derived metrics
  const totalRevenue = metrics.commissionsReceived + metrics.rentalRevenue + metrics.salesRevenue;
  const accountsReceivable = calculateAccountsReceivable(metrics);
  const accountsPayable = calculateAccountsPayable(metrics);
  const overdueAmount = calculateOverdueAmount(metrics);
  const overduePercentage = totalRevenue > 0 ? (overdueAmount / totalRevenue) * 100 : 0;

  // Count of pending invoices (example data - should come from API)
  const pendingInvoicesCount = 12;
  const overdueContractsCount = 3;

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Carregando dados financeiros">
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
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="relative overflow-hidden rounded-xl">
              <div className="h-32 sm:h-36 bg-muted animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
            </div>
          ))}
        </div>
        <span className="sr-only">Carregando dados financeiros...</span>
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
                <RefreshCw
                  {...iconA11yProps}
                  className={cn("h-4 w-4", isRefreshing && "animate-spin")}
                />
                <span className="hidden sm:inline">Atualizar</span>
              </Button>
            )}
            {onAddTransaction && (
              <Button onClick={onAddTransaction} size="sm" className="gap-2">
                <Plus {...iconA11yProps} className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Lançamento</span>
              </Button>
            )}
          </div>
        </div>

        {/* Period Selector */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Calendar {...iconA11yProps} className="h-4 w-4 text-muted-foreground shrink-0" />
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

      {/* Main KPI Cards - 4 Primary Metrics - Grid responsivo: 1 col mobile → 2 tablet → 4 desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <FinancialSummaryCard
          icon={DollarSign}
          label="Receita Total do Mês"
          value={totalRevenue}
          currency={true}
          trend={{
            value: metrics.periodVariation,
            direction: metrics.periodVariation >= 0 ? 'up' : 'down',
            isPositive: metrics.periodVariation >= 0,
          }}
          subLabel="Aluguéis + Vendas"
          bgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600"
        />

        <FinancialSummaryCard
          icon={TrendingUp}
          label="Contas a Receber"
          value={accountsReceivable}
          currency={true}
          badge={{
            label: `${pendingInvoicesCount} faturas`,
            variant: 'info',
          }}
          subLabel="Vencimento até 30 dias"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600"
        />

        <FinancialSummaryCard
          icon={TrendingDown}
          label="Contas a Pagar"
          value={accountsPayable}
          currency={true}
          badge={
            accountsPayable > metrics.ownerTransfers * 0.5
              ? { label: 'Urgente', variant: 'warning' }
              : undefined
          }
          subLabel="Próximos vencimentos"
          bgColor="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-600"
        />

        <FinancialSummaryCard
          icon={AlertTriangle}
          label="Inadimplência"
          value={overdueAmount}
          currency={true}
          badge={{
            label: `${overduePercentage.toFixed(1)}%`,
            variant: overdueAmount > 0 ? 'error' : 'success',
          }}
          subLabel={overdueContractsCount > 0 ? `${overdueContractsCount} contratos em atraso` : 'Nenhum atraso'}
          bgColor={overdueAmount > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"}
          iconColor={overdueAmount > 0 ? "text-red-600" : "text-green-600"}
        />
      </div>
    </div>
  );
}
