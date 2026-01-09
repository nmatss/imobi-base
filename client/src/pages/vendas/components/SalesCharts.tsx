import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent, Users, Target } from "lucide-react";

// Types
interface SalesChartsProps {
  salesByMonth: Array<{ month: string; value: number; count: number }>;
  conversionFunnel: Array<{ stage: string; count: number; value: number }>;
  sourcePerformance: Array<{ source: string; count: number; value: number }>;
  brokerPerformance: Array<{ name: string; count: number; value: number; commission: number }>;
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

// Format compact currency (for tooltips)
const formatCompactCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `R$ ${(value / 1000).toFixed(0)}K`;
  }
  return formatCurrency(value);
};

// Colors
const COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // green
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#f97316", // orange
];

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 space-y-1">
        <p className="font-semibold text-sm text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              {entry.name.toLowerCase().includes("valor") || entry.name.toLowerCase().includes("comissão")
                ? formatCurrency(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function SalesCharts({
  salesByMonth,
  conversionFunnel,
  sourcePerformance,
  brokerPerformance,
}: SalesChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Sales Trend - Area Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Evolução de Vendas
          </CardTitle>
          <CardDescription>
            Volume de vendas e valor total por mês
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={salesByMonth}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#3b82f6"
                fontSize={12}
                tickLine={false}
                tickFormatter={formatCompactCurrency}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                fontSize={12}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="value"
                name="Valor Total"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="count"
                name="Nº de Vendas"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCount)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel - Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Funil de Conversão
          </CardTitle>
          <CardDescription>
            Performance por etapa do processo de vendas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={conversionFunnel} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#6b7280" fontSize={12} tickLine={false} />
              <YAxis
                type="category"
                dataKey="stage"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Quantidade" radius={[0, 8, 8, 0]}>
                {conversionFunnel.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Source Performance - Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Performance por Origem
          </CardTitle>
          <CardDescription>
            Vendas por canal de aquisição de leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourcePerformance}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ source, percent }: any) =>
                  `${source}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sourcePerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Broker Performance - Bar Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Performance por Corretor
          </CardTitle>
          <CardDescription>
            Vendas e comissões por corretor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={brokerPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                tickFormatter={formatCompactCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="value"
                name="Valor Vendas"
                fill="#3b82f6"
                radius={[8, 8, 0, 0]}
              />
              <Bar
                dataKey="commission"
                name="Comissão"
                fill="#10b981"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
