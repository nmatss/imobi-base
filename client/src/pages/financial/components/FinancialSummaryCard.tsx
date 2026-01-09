import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FinancialSummaryCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  currency?: boolean;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    isPositive: boolean; // up é bom ou ruim?
  };
  badge?: {
    label: string;
    variant?: 'success' | 'warning' | 'error' | 'info';
  };
  subLabel?: string;
  onClick?: () => void;
  bgColor?: string;
  iconColor?: string;
}

const badgeVariantStyles = {
  success: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400",
  error: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400",
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

export default function FinancialSummaryCard({
  icon: Icon,
  label,
  value,
  currency = true,
  trend,
  badge,
  subLabel,
  onClick,
  bgColor = "bg-primary/10",
  iconColor = "text-primary",
}: FinancialSummaryCardProps) {
  const displayValue = currency ? formatCurrencyCompact(value) : value.toLocaleString('pt-BR');

  return (
    <Card
      className={cn(
        "hover:shadow-lg transition-all duration-200 overflow-hidden",
        onClick && "cursor-pointer hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        {/* Header: Icon and Trend/Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div
            className={cn(
              "rounded-full p-2.5 shrink-0 shadow-sm",
              bgColor
            )}
          >
            <Icon {...iconA11yProps} className={cn("h-4 w-4 sm:h-5 sm:w-5", iconColor)} />
          </div>

          {/* Trend Badge */}
          {trend && (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1 text-[10px] sm:text-xs px-2 py-0.5",
                trend.isPositive
                  ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {trend.isPositive ? (
                <TrendingUp {...iconA11yProps} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              ) : (
                <TrendingDown {...iconA11yProps} className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              )}
              {Math.abs(trend.value).toFixed(1)}%
            </Badge>
          )}

          {/* Custom Badge */}
          {badge && !trend && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] sm:text-xs px-2 py-0.5",
                badge.variant ? badgeVariantStyles[badge.variant] : ""
              )}
            >
              {badge.label}
            </Badge>
          )}
        </div>

        {/* Content: Label and Value */}
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {label}
          </p>
          <p className={cn(
            "text-xl sm:text-2xl lg:text-3xl font-bold truncate",
            value >= 0 ? "text-foreground" : "text-red-600 dark:text-red-500"
          )}>
            {displayValue}
          </p>
          {subLabel && (
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-1">
              {subLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
