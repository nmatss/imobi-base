import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, Pie, PieChart, Legend, Area, AreaChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Info } from "lucide-react";
import type { ChartData } from "../types";
import { cn } from "@/lib/utils";

type Props = {
  chartData: ChartData;
  isLoading?: boolean;
};

const iconA11yProps = { "aria-hidden": true, focusable: false } as const;

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

// Consistent color palette for financial data
const COLORS = {
  revenue: '#10B981',  // Green
  expense: '#DC2626',  // Red
  profit: '#1E7BE8',   // Blue
  categories: ['#10B981', '#1E7BE8', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#06B6D4', '#84CC16'],
};

// Demo data for empty state
const DEMO_DATA = {
  byMonth: [
    { month: '2024-07', revenue: 15000, expenses: 8000 },
    { month: '2024-08', revenue: 18000, expenses: 9500 },
    { month: '2024-09', revenue: 22000, expenses: 10000 },
    { month: '2024-10', revenue: 20000, expenses: 11000 },
    { month: '2024-11', revenue: 25000, expenses: 12000 },
    { month: '2024-12', revenue: 30000, expenses: 13000 },
  ],
  byCategory: [
    { name: 'Comissões', value: 45000 },
    { name: 'Aluguéis', value: 30000 },
    { name: 'Vendas', value: 25000 },
  ],
  byOrigin: [
    { name: 'Imóveis Próprios', value: 40000 },
    { name: 'Parcerias', value: 35000 },
    { name: 'Indicações', value: 25000 },
  ],
};

export default function FinancialCharts({ chartData, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid gap-4 lg:gap-6 lg:grid-cols-2" role="status" aria-label="Carregando gráficos financeiros">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-5 bg-muted animate-pulse rounded w-32" />
              <div className="h-4 bg-muted animate-pulse rounded w-48 mt-1" />
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="h-[300px] sm:h-[350px] lg:h-[400px] relative overflow-hidden rounded">
                <div className="absolute inset-0 bg-muted animate-pulse" />
                {/* Simulated chart elements for better UX */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                  {[40, 65, 55, 80, 60, 75].map((height, j) => (
                    <div key={j} className="flex-1 bg-primary/20 animate-pulse rounded-t" style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <span className="sr-only">Carregando gráficos financeiros...</span>
      </div>
    );
  }

  // Use demo data if no real data available
  const hasData = chartData.byMonth.length > 0 || chartData.byCategory.length > 0;
  const displayData = hasData ? chartData : DEMO_DATA;
  const isDemoMode = !hasData;

  const monthlyData = displayData.byMonth.map(item => ({
    ...item,
    margin: item.revenue - item.expenses,
  }));

  return (
    <div className="space-y-4">
      {isDemoMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <Info {...iconA11yProps} className="h-4 w-4 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-900">
            <span className="font-medium">Dados de demonstração</span> - Os gráficos mostram exemplos de visualização
          </p>
        </div>
      )}

      {/* Grid de Charts - 1 col mobile → 2 desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex-1">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <BarChart3 {...iconA11yProps} className="h-4 w-4" />
                  Fluxo de Caixa
                  {isDemoMode && <Badge variant="outline" className="text-xs">Demo</Badge>}
                </CardTitle>
                <CardDescription className="text-xs">
                  Receitas vs Despesas - Últimos 6 meses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[300px] sm:h-[350px] lg:h-[400px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-800" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '14px',
                      padding: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      const label = name === 'revenue' ? 'Receitas' : name === 'expenses' ? 'Despesas' : name;
                      return [formatCurrency(value), label];
                    }}
                    labelFormatter={(label) => {
                      const [year, month] = label.split('-');
                      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
                  <Bar dataKey="revenue" fill={COLORS.revenue} radius={[4, 4, 0, 0]} name="Receitas (R$)" />
                  <Bar dataKey="expenses" fill={COLORS.expense} radius={[4, 4, 0, 0]} name="Despesas (R$)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <BarChart3 {...iconA11yProps} className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
              <TrendingUp {...iconA11yProps} className="h-4 w-4" />
              Margem Operacional
              {isDemoMode && <Badge variant="outline" className="text-xs">Demo</Badge>}
            </CardTitle>
            <CardDescription className="text-xs">
              Evolução do lucro nos últimos 6 meses
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[300px] sm:h-[350px] lg:h-[400px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.profit} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.profit} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-800" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => {
                      const [year, month] = value.split('-');
                      return `${month}/${year.slice(2)}`;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '14px',
                      padding: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      const label = name === "margin" ? "Margem (R$)" : name === "revenue" ? "Receitas (R$)" : "Despesas (R$)";
                      return [formatCurrency(value), label];
                    }}
                    labelFormatter={(label) => {
                      const [year, month] = label.split('-');
                      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 16 }} />
                  <Area
                    type="monotone"
                    dataKey="margin"
                    stroke={COLORS.profit}
                    strokeWidth={2}
                    fill="url(#marginGradient)"
                    name="Margem (R$)"
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={COLORS.revenue}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Receitas (R$)"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke={COLORS.expense}
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="Despesas (R$)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <TrendingUp {...iconA11yProps} className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem dados para exibir</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Category Distribution Chart */}
      {chartData.byCategory.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <PieChartIcon {...iconA11yProps} className="h-4 w-4" />
                Distribuição por Categoria
                {isDemoMode && <Badge variant="outline" className="text-xs">Demo</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">
                Principais categorias de movimentação financeira
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[300px] sm:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.byCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    label={({ category, percent }) =>
                      percent > 0.05 ? `${category.slice(0, 12)}... (${(percent * 100).toFixed(0)}%)` : ''
                    }
                    labelLine={false}
                  >
                    {chartData.byCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS.categories[index % COLORS.categories.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                      padding: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
