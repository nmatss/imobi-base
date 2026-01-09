import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Award,
  Percent,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
}

interface SalesDashboardProps {
  kpis: {
    totalSales: number;
    totalSalesValue: number;
    totalCommissions: number;
    avgTicket: number;
    conversionRate: string;
    pendingProposals: number;
    acceptedProposals: number;
  };
  period: string;
  className?: string;
}

// Format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format number
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("pt-BR").format(value);
};

// Metric Card Component
function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  color = "bg-primary/10 text-primary",
  badge,
}: MetricCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              {badge && (
                <Badge variant={badge.variant || "secondary"} className="text-xs">
                  {badge.label}
                </Badge>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
            {trend && (
              <div className="flex items-center gap-1.5 text-sm">
                {trend.isPositive ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      +{trend.value}%
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">
                      {trend.value}%
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">vs período anterior</span>
              </div>
            )}
          </div>
          <div className={cn("flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center", color)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export function SalesDashboard({ kpis, period, className }: SalesDashboardProps) {
  // Calculate proposal win rate
  const totalProposals = kpis.pendingProposals + kpis.acceptedProposals;
  const proposalWinRate = totalProposals > 0
    ? Math.round((kpis.acceptedProposals / totalProposals) * 100)
    : 0;

  // Period label
  const periodLabel = {
    month: "este mês",
    quarter: "este trimestre",
    year: "este ano",
    all: "todo período",
  }[period] || period;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Vendas"
          value={formatNumber(kpis.totalSales)}
          description={`Vendas concluídas em ${periodLabel}`}
          icon={CheckCircle}
          color="bg-green-500/10 text-green-600"
        />

        <MetricCard
          title="Valor Total"
          value={formatCurrency(kpis.totalSalesValue)}
          description="Volume de vendas"
          icon={DollarSign}
          color="bg-blue-500/10 text-blue-600"
        />

        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(kpis.avgTicket)}
          description="Valor médio por venda"
          icon={Target}
          color="bg-purple-500/10 text-purple-600"
        />

        <MetricCard
          title="Taxa de Conversão"
          value={`${kpis.conversionRate}%`}
          description="Propostas aceitas / total"
          icon={Percent}
          color="bg-orange-500/10 text-orange-600"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Comissões Totais
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatCurrency(kpis.totalCommissions)}
                </p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Award className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  % do valor total
                </span>
                <span className="font-medium">
                  {kpis.totalSalesValue > 0
                    ? ((kpis.totalCommissions / kpis.totalSalesValue) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <Progress
                value={
                  kpis.totalSalesValue > 0
                    ? (kpis.totalCommissions / kpis.totalSalesValue) * 100
                    : 0
                }
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Propostas Pendentes
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {formatNumber(kpis.pendingProposals)}
                </p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando resposta do cliente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Taxa de Aceitação
                </p>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {proposalWinRate}%
                </p>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {kpis.acceptedProposals} de {totalProposals} propostas
                </span>
              </div>
              <Progress value={proposalWinRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Resumo de Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Aceitas</p>
                  <p className="text-lg font-bold">{kpis.acceptedProposals}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-lg font-bold">{kpis.pendingProposals}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vendas</p>
                  <p className="text-lg font-bold">{kpis.totalSales}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversão</p>
                  <p className="text-lg font-bold">{kpis.conversionRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
