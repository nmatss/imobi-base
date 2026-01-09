import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Target,
  ArrowRight,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
export interface FunnelStage {
  id: string;
  name: string;
  count: number;
  value: number;
  averageDays?: number;
}

export interface SalesFunnelProps {
  stages: FunnelStage[];
  className?: string;
}

// Format currency
const formatPrice = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Format large numbers
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("pt-BR").format(value);
};

// Calculate conversion rate between stages
const calculateConversion = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return Math.round((current / previous) * 100);
};

// Get color based on conversion rate
const getConversionColor = (rate: number): string => {
  if (rate >= 70) return "text-green-600 bg-green-50 border-green-200";
  if (rate >= 50) return "text-yellow-600 bg-yellow-50 border-yellow-200";
  return "text-red-600 bg-red-50 border-red-200";
};

// Get stage color
const getStageColor = (index: number, total: number): string => {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-indigo-500 to-indigo-600",
    "from-purple-500 to-purple-600",
    "from-pink-500 to-pink-600",
    "from-green-500 to-green-600",
  ];
  return colors[index % colors.length];
};

export function SalesFunnel({ stages, className }: SalesFunnelProps) {
  // Calculate totals
  const totalLeads = stages[0]?.count || 0;
  const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0);
  const closedDeals = stages[stages.length - 1]?.count || 0;
  const overallConversion = calculateConversion(closedDeals, totalLeads);

  // Calculate average ticket
  const averageTicket = totalLeads > 0 ? totalValue / totalLeads : 0;

  // Calculate average time
  const averageTime = stages.reduce((sum, stage) => sum + (stage.averageDays || 0), 0) / stages.length;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Leads</p>
                <p className="text-xl font-bold">{formatNumber(totalLeads)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                <p className="text-xl font-bold">{overallConversion}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-lg font-bold">{formatPrice(averageTicket)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tempo Médio</p>
                <p className="text-xl font-bold">{Math.round(averageTime)}d</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {stages.map((stage, index) => {
            const previousStage = index > 0 ? stages[index - 1] : null;
            const conversion = previousStage
              ? calculateConversion(stage.count, previousStage.count)
              : 100;
            const percentage = totalLeads > 0 ? (stage.count / totalLeads) * 100 : 0;
            const isDecreasing = previousStage && stage.count < previousStage.count;

            return (
              <div key={stage.id} className="space-y-2">
                {/* Stage Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-foreground">
                      {stage.name}
                    </h4>
                    {index > 0 && (
                      <Badge
                        variant="outline"
                        className={cn("gap-1 text-xs", getConversionColor(conversion))}
                      >
                        {isDecreasing ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3" />
                        )}
                        {conversion}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-bold text-foreground">
                        {formatNumber(stage.count)}
                      </p>
                      <p className="text-xs text-muted-foreground">leads</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {formatPrice(stage.value)}
                      </p>
                      <p className="text-xs text-muted-foreground">valor</p>
                    </div>
                  </div>
                </div>

                {/* Visual Bar - ENHANCED */}
                <div className="relative">
                  <div className="h-14 bg-muted rounded-lg overflow-hidden relative shadow-inner">
                    {/* Progress bar with gradient and animation */}
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 bg-gradient-to-r transition-all duration-700 ease-out",
                        getStageColor(index, stages.length)
                      )}
                      style={{ width: `${percentage}%` }}
                    >
                      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
                      {/* Shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      {/* Pulse effect for active stages */}
                      {stage.count > 0 && (
                        <div className="absolute inset-0 bg-white/5 animate-pulse" />
                      )}
                    </div>

                    {/* Content overlay */}
                    <div className="absolute inset-0 flex items-center px-4 justify-between">
                      <div className="flex items-center gap-3">
                        {/* Progress indicator */}
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-3 h-3 rounded-full shadow-lg transition-all",
                            percentage > 0 ? "bg-white scale-110" : "bg-muted-foreground/30"
                          )} />
                          <span className={cn(
                            "text-sm font-bold drop-shadow-lg transition-colors",
                            percentage > 0 ? "text-white" : "text-muted-foreground"
                          )}>
                            {Math.round(percentage)}%
                          </span>
                        </div>

                        {/* Lead count badge */}
                        <Badge
                          variant="secondary"
                          className="bg-white/90 text-foreground font-semibold shadow-md"
                        >
                          {stage.count} leads
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Average days */}
                        {stage.averageDays && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/90 shadow-md">
                            <Clock className="h-3.5 w-3.5 text-orange-600" />
                            <span className="text-xs font-semibold text-foreground">
                              {stage.averageDays}d médio
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow between stages */}
                {index < stages.length - 1 && (
                  <div className="flex items-center justify-center py-1">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Conversion Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Análise de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stages.map((stage, index) => {
              if (index === 0) return null; // Skip first stage

              const previousStage = stages[index - 1];
              const conversion = calculateConversion(stage.count, previousStage.count);
              const dropped = previousStage.count - stage.count;
              const droppedPercentage = previousStage.count > 0
                ? Math.round((dropped / previousStage.count) * 100)
                : 0;

              return (
                <div
                  key={stage.id}
                  className="p-4 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      {previousStage.name} → {stage.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getConversionColor(conversion))}
                    >
                      {conversion}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Convertidos:</span>
                      <span className="font-semibold text-green-600">
                        {formatNumber(stage.count)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Perdidos:</span>
                      <span className="font-semibold text-red-600">
                        {formatNumber(dropped)} ({droppedPercentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
