import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Home,
  AlertCircle,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { RentalMetrics, ChartDataPoint } from "../types";
import { formatPrice, formatMonth } from "../types";

type Period = "currentMonth" | "lastMonth" | "year";

interface RentalDashboardProps {
  metrics: RentalMetrics | null;
  chartData: ChartDataPoint[];
  period: Period;
  onPeriodChange: (period: Period) => void;
  loading?: boolean;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "currentMonth", label: "Mês Atual" },
  { value: "lastMonth", label: "Último Mês" },
  { value: "year", label: "Ano" },
];

export function RentalDashboard({
  metrics,
  chartData,
  period,
  onPeriodChange,
  loading,
}: RentalDashboardProps) {
  if (loading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="min-w-[160px] flex-shrink-0 sm:min-w-0">
              <CardContent className="p-3 sm:p-4">
                <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                <Skeleton className="h-6 w-16 mb-1" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const kpis = [
    {
      id: "activeContracts",
      label: "Contratos Ativos",
      value: metrics?.activeContracts || 0,
      icon: FileText,
      color: "bg-blue-100 text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      id: "vacantProperties",
      label: "Imóveis Vagos",
      value: metrics?.vacantProperties || 0,
      icon: Home,
      color: "bg-gray-100 text-gray-600",
      iconBg: "bg-gray-100",
    },
    {
      id: "delinquency",
      label: "Inadimplência",
      value: formatPrice(metrics?.delinquencyValue || 0),
      badge: `${metrics?.delinquencyPercentage || 0}%`,
      badgeColor: (metrics?.delinquencyPercentage || 0) > 10 ? "destructive" : "secondary",
      icon: AlertCircle,
      color: "bg-red-100 text-red-600",
      iconBg: "bg-red-100",
    },
    {
      id: "pendingTransfers",
      label: "Repasses Pendentes",
      value: metrics?.pendingTransfers || 0,
      icon: DollarSign,
      color: "bg-orange-100 text-orange-600",
      iconBg: "bg-orange-100",
    },
    {
      id: "contractsExpiring",
      label: "Vencendo/Reajustando",
      value: (metrics?.contractsExpiringThisMonth || 0) + (metrics?.contractsAdjustingThisMonth || 0),
      badge: metrics?.contractsExpiringThisMonth ? `${metrics.contractsExpiringThisMonth} venc.` : undefined,
      icon: Calendar,
      color: "bg-yellow-100 text-yellow-600",
      iconBg: "bg-yellow-100",
    },
  ];

  // Calculate occupancy data for donut chart
  const totalProperties = (metrics?.activeContracts || 0) + (metrics?.vacantProperties || 0);
  const occupancyRate = totalProperties > 0
    ? Math.round(((metrics?.activeContracts || 0) / totalProperties) * 100)
    : 0;

  const occupancyData = [
    { name: "Ocupados", value: metrics?.activeContracts || 0, color: "#22c55e" },
    { name: "Vagos", value: metrics?.vacantProperties || 0, color: "#94a3b8" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* KPI Cards - Mobile-First */}
      <div className="flex gap-6 sm:gap-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.id} className="min-w-[180px] flex-shrink-0 sm:min-w-0 rounded-xl border-2 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${kpi.iconBg}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color.split(" ")[1]}`} />
                </div>
                {kpi.badge && (
                  <Badge variant={kpi.badgeColor as any} className="text-[10px] px-2 py-0.5">
                    {kpi.badge}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold leading-none mb-1">{kpi.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Occupancy Dashboard - New Section */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Occupancy Gauge - Modern RadialBarChart Style */}
        <Card className="rounded-xl border-2">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-sm font-semibold mb-4">Taxa de Ocupação</h3>
            <div className="flex flex-col items-center justify-center">
              {/* Circular Gauge (Modern Design) */}
              <div className="relative w-48 h-48 mb-4">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  {/* Background arc */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="16"
                    strokeLinecap="round"
                  />
                  {/* Foreground arc (progress) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${(occupancyRate / 100) * 502.4} 502.4`}
                    transform="rotate(-90 100 100)"
                    className="transition-all duration-700 ease-out"
                  />
                  {/* Center text */}
                  <text
                    x="100"
                    y="95"
                    textAnchor="middle"
                    className="fill-foreground text-4xl font-bold"
                    style={{ fontSize: '36px', fontWeight: 'bold' }}
                  >
                    {occupancyRate}%
                  </text>
                  <text
                    x="100"
                    y="115"
                    textAnchor="middle"
                    className="fill-muted-foreground text-xs"
                    style={{ fontSize: '12px' }}
                  >
                    Ocupação
                  </text>
                </svg>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {metrics?.activeContracts || 0} de {totalProperties} imóveis
                </p>
                <p className="text-xs text-muted-foreground">
                  {metrics?.vacantProperties || 0} disponíveis para locação
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Summary */}
        <Card className="rounded-xl border-2">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-sm font-semibold mb-4">Receita Recorrente</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Mensal (MRR)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(metrics?.monthlyRecurringRevenue || 0)}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Projeção Anual</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatPrice((metrics?.monthlyRecurringRevenue || 0) * 12)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>

              <div className="pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-2">Valor médio por contrato</p>
                <p className="text-lg font-semibold">
                  {formatPrice(
                    (metrics?.activeContracts || 0) > 0
                      ? (metrics?.monthlyRecurringRevenue || 0) / (metrics?.activeContracts || 1)
                      : 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delinquency & Alerts */}
        <Card className="rounded-xl border-2">
          <CardContent className="p-4 sm:p-6">
            <h3 className="text-sm font-semibold mb-4">Indicadores Críticos</h3>
            <div className="space-y-3">
              {/* Delinquency - Critical Indicator */}
              <div className={`p-4 rounded-lg border-2 ${
                (metrics?.delinquencyPercentage || 0) > 10
                  ? 'bg-red-50 border-red-500'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className={`h-5 w-5 ${
                      (metrics?.delinquencyPercentage || 0) > 10 ? 'text-red-600' : 'text-red-500'
                    }`} />
                    <span className="text-xs font-semibold text-red-900">
                      {(metrics?.delinquencyPercentage || 0) > 10 ? 'INADIMPLÊNCIA ALTA' : 'Inadimplência'}
                    </span>
                  </div>
                  <Badge variant="destructive" className="text-[10px] font-bold">
                    {metrics?.delinquencyPercentage || 0}%
                  </Badge>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {formatPrice(metrics?.delinquencyValue || 0)}
                </p>
              </div>

              {/* Pending Transfers */}
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  <span className="text-xs font-medium text-orange-900">Repasses Pendentes</span>
                </div>
                <p className="text-lg font-bold text-orange-600">
                  {metrics?.pendingTransfers || 0} repasses
                </p>
              </div>

              {/* Contracts Expiring */}
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-900">Próximos Vencimentos</span>
                </div>
                <p className="text-lg font-bold text-yellow-600">
                  {(metrics?.contractsExpiringThisMonth || 0) + (metrics?.contractsAdjustingThisMonth || 0)} contratos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Recurring Revenue Card - Enhanced */}
      <Card className="rounded-xl border-2">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Receita Recorrente Mensal</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">
                  {formatPrice(metrics?.monthlyRecurringRevenue || 0)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <Button
                  key={p.value}
                  variant={period === p.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPeriodChange(p.value)}
                  className="text-xs min-h-[44px] px-3"
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Chart - Enhanced with Better Contrast and Labels */}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const label = name === 'revenue' ? 'Receita' : 'Inadimplência';
                    return [formatPrice(value), label];
                  }}
                  labelFormatter={formatMonth}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '14px',
                    padding: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '13px', paddingTop: 16 }}
                />
                <Bar
                  dataKey="revenue"
                  name="Receita (R$)"
                  fill="#10B981"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="delinquency"
                  name="Inadimplência (R$)"
                  fill="#DC2626"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sem dados para o período selecionado</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
