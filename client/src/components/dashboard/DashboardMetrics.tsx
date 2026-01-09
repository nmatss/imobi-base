import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLocation } from "wouter";
import { LucideIcon } from "lucide-react";
import { DashboardMetricsSkeleton } from "@/components/ui/skeleton-loaders";

interface TrendData {
  value: number;
  direction: "up" | "down" | "neutral";
}

interface MetricData {
  value: number;
  trend?: number;
}

export interface DashboardMetricsProps {
  metrics: {
    properties: MetricData;
    leads: MetricData;
    visits: { value: number };
    contracts: MetricData;
  };
  isLoading?: boolean;
}

export interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  trend?: TrendData;
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  onClick?: () => void;
  iconBgColor: string;
  iconColor: string;
}

const MetricCard = memo(function MetricCard({
  icon: Icon,
  label,
  value,
  trend,
  badgeText,
  badgeVariant = "secondary",
  onClick,
  iconBgColor,
  iconColor,
}: MetricCardProps) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  const trendColor = trend?.direction === "up" ? "text-green-600" : trend?.direction === "down" ? "text-red-600" : "text-gray-500";

  return (
    <Card
      className={`transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
        onClick ? "cursor-pointer active:scale-95 touch-manipulation" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      aria-label={onClick ? `Ver ${label.toLowerCase()}` : undefined}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <h3 className="text-3xl font-bold text-foreground mt-1">{value}</h3>
            {trend && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span className="font-medium">
                  {trend.value > 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-muted-foreground ml-1">vs mês anterior</span>
              </div>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-lg ${iconBgColor} flex items-center justify-center shrink-0`}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const DashboardMetrics = memo(function DashboardMetrics({ metrics, isLoading }: DashboardMetricsProps) {
  const [, setLocation] = useLocation();

  // Calcular trend direction automaticamente
  const getTrendData = (trendValue?: number): TrendData | undefined => {
    if (trendValue === undefined) return undefined;

    return {
      value: trendValue,
      direction: trendValue > 0 ? "up" : trendValue < 0 ? "down" : "neutral",
    };
  };

  if (isLoading) {
    return <DashboardMetricsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {/* Imóveis Ativos */}
      <MetricCard
        icon={Building2}
        label="Imóveis Ativos"
        value={metrics.properties.value}
        trend={getTrendData(metrics.properties.trend)}
        onClick={() => setLocation("/properties")}
        iconBgColor="bg-blue-100"
        iconColor="text-blue-600"
      />

      {/* Leads do Mês */}
      <MetricCard
        icon={Users}
        label="Leads do Mês"
        value={metrics.leads.value}
        trend={getTrendData(metrics.leads.trend)}
        onClick={() => setLocation("/leads")}
        iconBgColor="bg-green-100"
        iconColor="text-green-600"
      />

      {/* Visitas Agendadas */}
      <MetricCard
        icon={Calendar}
        label="Visitas Agendadas"
        value={metrics.visits.value}
        onClick={() => setLocation("/calendar")}
        iconBgColor="bg-orange-100"
        iconColor="text-orange-600"
      />

      {/* Contratos Ativos */}
      <MetricCard
        icon={FileText}
        label="Contratos Ativos"
        value={metrics.contracts.value}
        trend={getTrendData(metrics.contracts.trend)}
        onClick={() => setLocation("/rentals")}
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-600"
      />
    </div>
  );
});
