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
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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

  return (
    <div className="space-y-4">
      {/* KPI Cards - Mobile-First */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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

          {/* Chart */}
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatPrice(value)}
                  labelFormatter={formatMonth}
                  contentStyle={{
                    borderRadius: '8px',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Bar
                  dataKey="revenue"
                  name="Receita"
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="delinquency"
                  name="Inadimplência"
                  fill="#ef4444"
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
