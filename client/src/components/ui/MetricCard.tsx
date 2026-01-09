import React from "react";
import { memo } from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TrendBadgeProps {
  value: string;
  direction: 'up' | 'down' | 'neutral';
}

function TrendBadge({ value, direction }: TrendBadgeProps) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

  const ariaLabel = direction === 'up'
    ? `Aumento de ${value}`
    : direction === 'down'
    ? `Diminuição de ${value}`
    : `Neutro ${value}`;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md",
        direction === 'up' && "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400",
        direction === 'down' && "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400",
        direction === 'neutral' && "text-slate-700 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400"
      )}
      role="status"
      aria-label={ariaLabel}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span>{value}</span>
    </div>
  );
}

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

const MetricCardComponent = ({
  icon: Icon,
  label,
  value,
  trend,
  onClick,
  className
}: MetricCardProps) => {
  const ariaLabel = `${label}: ${value}${trend ? `, ${trend.direction === 'up' ? 'aumento' : trend.direction === 'down' ? 'diminuição' : 'neutro'} de ${trend.value}` : ''}`;

  return (
    <Card
      className={cn(
        "transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        onClick && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : "article"}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <CardContent className="p-6">
        {/* Icon + Trend */}
        <div className="flex items-center justify-between mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center" aria-hidden="true">
            <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          {trend && (
            <TrendBadge
              value={trend.value}
              direction={trend.direction}
            />
          )}
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-foreground" aria-label={`Valor: ${value}`}>
          {value}
        </p>

        {/* Label */}
        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">
          {label}
        </p>

        {/* Trend Label */}
        {trend?.label && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Memoized MetricCard with intelligent prop comparison
export const MetricCard = memo(MetricCardComponent, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.label === nextProps.label &&
    prevProps.value === nextProps.value &&
    prevProps.icon === nextProps.icon &&
    prevProps.className === nextProps.className &&
    prevProps.trend?.value === nextProps.trend?.value &&
    prevProps.trend?.direction === nextProps.trend?.direction &&
    prevProps.trend?.label === nextProps.trend?.label
    // onClick is a stable reference, no need to compare
  );
});
