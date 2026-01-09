import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Circle,
  AlertCircle,
} from "lucide-react";
import { formatPrice, formatDate } from "../types";

export type PaymentStatus = {
  month: string; // "2024-01" format
  status: "paid" | "late" | "unpaid" | "upcoming";
  paidDate?: Date;
  dueDate?: Date;
  amount: number;
  method?: string;
  daysLate?: number;
};

interface PaymentTimelineProps {
  payments: PaymentStatus[];
  compact?: boolean; // versão compacta para card
  orientation?: "horizontal" | "vertical";
}

const STATUS_CONFIG = {
  paid: {
    icon: CheckCircle2,
    color: "text-green-600",
    bgColor: "bg-green-100",
    label: "Pago no prazo",
    dotColor: "bg-green-500",
  },
  late: {
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    label: "Pago com atraso",
    dotColor: "bg-yellow-500",
  },
  unpaid: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-100",
    label: "Não pago",
    dotColor: "bg-red-500",
  },
  upcoming: {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-100",
    label: "Futuro",
    dotColor: "bg-gray-300",
  },
};

export function PaymentTimeline({
  payments,
  compact = true,
  orientation = "horizontal",
}: PaymentTimelineProps) {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  // Sort payments by month (oldest first)
  const sortedPayments = [...payments].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  // Format month for display
  const formatMonth = (month: string) => {
    const [year, m] = month.split("-");
    const months = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    return compact ? months[parseInt(m) - 1] : `${months[parseInt(m) - 1]}/${year.slice(2)}`;
  };

  // Render compact version (for cards)
  if (compact) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Histórico de Pagamentos
        </p>
        <TooltipProvider>
          <div
            className={`flex ${
              orientation === "horizontal"
                ? "gap-2 overflow-x-auto pb-2 scrollbar-hide"
                : "flex-col gap-2"
            }`}
          >
            {sortedPayments.map((payment) => {
              const config = STATUS_CONFIG[payment.status];
              const Icon = config.icon;

              return (
                <Tooltip key={payment.month}>
                  <TooltipTrigger asChild>
                    <button
                      className={`flex-shrink-0 ${
                        orientation === "horizontal" ? "flex flex-col" : "flex flex-row"
                      } items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors`}
                      onMouseEnter={() => setHoveredMonth(payment.month)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      <div
                        className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center`}
                      >
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {formatMonth(payment.month)}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-semibold">{formatMonth(payment.month)}</p>
                      <p className="text-xs">
                        <span className={config.color}>{config.label}</span>
                      </p>
                      {payment.amount && (
                        <p className="text-xs">
                          Valor: <span className="font-medium">{formatPrice(payment.amount)}</span>
                        </p>
                      )}
                      {payment.paidDate && (
                        <p className="text-xs">
                          Pago em: {formatDate(payment.paidDate.toISOString())}
                        </p>
                      )}
                      {payment.daysLate && payment.daysLate > 0 && (
                        <p className="text-xs text-yellow-600">
                          Atraso: {payment.daysLate} dias
                        </p>
                      )}
                      {payment.method && (
                        <p className="text-xs">Método: {payment.method}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 pt-2 border-t">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const count = payments.filter((p) => p.status === key).length;
            if (count === 0) return null;

            return (
              <div key={key} className="flex items-center gap-1.5">
                <Icon className={`h-3 w-3 ${config.color}`} />
                <span className="text-[10px] text-muted-foreground">
                  {config.label} ({count})
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render full version (for modals/expanded view)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Histórico de Pagamentos</h4>
        <Badge variant="secondary" className="text-xs">
          {payments.length} meses
        </Badge>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {sortedPayments.map((payment, index) => {
          const config = STATUS_CONFIG[payment.status];
          const Icon = config.icon;
          const isLast = index === sortedPayments.length - 1;

          return (
            <div key={payment.month} className="flex gap-3">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div
                  className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>
                {!isLast && (
                  <div className="w-0.5 h-full min-h-[24px] bg-border mt-1" />
                )}
              </div>

              {/* Payment info */}
              <div className="flex-1 pb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <p className="font-medium text-sm">
                      {formatMonth(payment.month)}
                    </p>
                    <p className={`text-xs ${config.color}`}>{config.label}</p>
                  </div>
                  <p className="text-sm font-bold">
                    {formatPrice(payment.amount)}
                  </p>
                </div>

                {/* Additional details */}
                <div className="text-xs text-muted-foreground space-y-0.5 mt-2">
                  {payment.dueDate && (
                    <p>Vencimento: {formatDate(payment.dueDate.toISOString())}</p>
                  )}
                  {payment.paidDate && (
                    <p>Pago em: {formatDate(payment.paidDate.toISOString())}</p>
                  )}
                  {payment.daysLate && payment.daysLate > 0 && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <AlertCircle className="h-3 w-3" />
                      <span>Atraso de {payment.daysLate} dias</span>
                    </div>
                  )}
                  {payment.method && <p>Método: {payment.method}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => {
          const Icon = config.icon;
          const count = payments.filter((p) => p.status === key).length;
          const percentage = Math.round((count / payments.length) * 100);

          return (
            <div
              key={key}
              className={`p-2 rounded-lg ${config.bgColor} border border-${key === "paid" ? "green" : key === "late" ? "yellow" : key === "unpaid" ? "red" : "gray"}-200`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <p className={`text-lg font-bold ${config.color}`}>{count}</p>
              <p className="text-[10px] text-muted-foreground">
                {percentage}% do total
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
