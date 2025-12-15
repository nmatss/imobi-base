import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Pie, PieChart, Legend, Area, AreaChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import type { ChartData } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  chartData: ChartData;
  isLoading?: boolean;
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

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#06b6d4', '#84cc16'];

export default function FinancialCharts({ chartData, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 bg-muted animate-pulse rounded w-32" />
            <div className="h-4 bg-muted animate-pulse rounded w-48 mt-1" />
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-48 sm:h-64 lg:h-80 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="h-5 bg-muted animate-pulse rounded w-32" />
            <div className="h-4 bg-muted animate-pulse rounded w-48 mt-1" />
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-48 sm:h-64 lg:h-80 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthlyData = chartData.byMonth.map(item => ({
    ...item,
    margin: item.revenue - item.expenses,
  }));

  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
      {/* Cash Flow Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Fluxo de Caixa
              </CardTitle>
              <CardDescription className="text-xs">
                Receitas vs Despesas - Últimos 6 meses
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-48 sm:h-64 lg:h-80">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => formatCurrencyCompact(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => {
                      const [year, month] = label.split('-');
                      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Receitas" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
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

      {/* Margin Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div>
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Margem Operacional
            </CardTitle>
            <CardDescription className="text-xs">
              Evolução do lucro nos últimos 6 meses
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-48 sm:h-64 lg:h-80">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-800" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => formatCurrencyCompact(value)}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "margin" ? "Margem" : name === "revenue" ? "Receitas" : "Despesas"
                    ]}
                    labelFormatter={(label) => {
                      const [year, month] = label.split('-');
                      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="margin"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#marginGradient)"
                    name="Margem"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#22c55e"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Receitas"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
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
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem dados para exibir</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Category Distribution Chart */}
      {chartData.byCategory.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <PieChartIcon className="h-4 w-4" />
                Distribuição por Categoria
              </CardTitle>
              <CardDescription className="text-xs">
                Principais categorias de movimentação financeira
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.byCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ category, percent }) =>
                      percent > 0.05 ? `${category.slice(0, 12)}... (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    labelLine={false}
                  >
                    {chartData.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
