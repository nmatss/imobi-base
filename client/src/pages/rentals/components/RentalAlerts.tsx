import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronUp,
  Bell,
  AlertTriangle,
  Clock,
  CalendarClock,
  Home,
  AlertCircle,
} from "lucide-react";
import type { RentalAlerts as RentalAlertsType, RentalPayment, RentalContract, Property } from "../types";
import { formatPrice, formatDate } from "../types";

interface RentalAlertsProps {
  alerts: RentalAlertsType | null;
  loading?: boolean;
  onPaymentClick?: (payment: RentalPayment) => void;
  onContractClick?: (contract: RentalContract) => void;
  onPropertyClick?: (property: Property) => void;
}

type AlertCategory = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  count: number;
  items: React.ReactNode;
};

export function RentalAlerts({
  alerts,
  loading,
  onPaymentClick,
  onContractClick,
  onPropertyClick,
}: RentalAlertsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalAlerts =
    (alerts?.paymentsDueToday?.length || 0) +
    (alerts?.paymentsDueTomorrow?.length || 0) +
    (alerts?.overduePayments?.length || 0) +
    (alerts?.contractsExpiring?.length || 0) +
    (alerts?.contractsAdjusting?.length || 0) +
    (alerts?.vacantProperties?.length || 0);

  if (totalAlerts === 0) {
    return null;
  }

  const categories: AlertCategory[] = [
    {
      id: "dueToday",
      title: "Vencendo Hoje",
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      count: alerts?.paymentsDueToday?.length || 0,
      items: (
        <div className="space-y-1">
          {alerts?.paymentsDueToday?.slice(0, 3).map((payment) => (
            <button
              key={payment.id}
              onClick={() => onPaymentClick?.(payment)}
              className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="font-medium">{payment.referenceMonth}</span>
              <span className="text-muted-foreground ml-2">{formatPrice(payment.totalValue)}</span>
            </button>
          ))}
          {(alerts?.paymentsDueToday?.length || 0) > 3 && (
            <p className="text-xs text-muted-foreground px-2">
              +{(alerts?.paymentsDueToday?.length || 0) - 3} mais
            </p>
          )}
        </div>
      ),
    },
    {
      id: "dueTomorrow",
      title: "Vencendo Amanhã",
      icon: CalendarClock,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      count: alerts?.paymentsDueTomorrow?.length || 0,
      items: (
        <div className="space-y-1">
          {alerts?.paymentsDueTomorrow?.slice(0, 3).map((payment) => (
            <button
              key={payment.id}
              onClick={() => onPaymentClick?.(payment)}
              className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="font-medium">{payment.referenceMonth}</span>
              <span className="text-muted-foreground ml-2">{formatPrice(payment.totalValue)}</span>
            </button>
          ))}
          {(alerts?.paymentsDueTomorrow?.length || 0) > 3 && (
            <p className="text-xs text-muted-foreground px-2">
              +{(alerts?.paymentsDueTomorrow?.length || 0) - 3} mais
            </p>
          )}
        </div>
      ),
    },
    {
      id: "overdue",
      title: "Em Atraso",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-100",
      count: alerts?.overduePayments?.length || 0,
      items: (
        <div className="space-y-1">
          {alerts?.overduePayments?.slice(0, 3).map(({ payment, daysOverdue }) => (
            <button
              key={payment.id}
              onClick={() => onPaymentClick?.(payment)}
              className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="font-medium">{payment.referenceMonth}</span>
              <span className="text-muted-foreground ml-2">{formatPrice(payment.totalValue)}</span>
              <Badge variant="destructive" className="ml-2 text-[10px] px-1">
                {daysOverdue}d
              </Badge>
            </button>
          ))}
          {(alerts?.overduePayments?.length || 0) > 3 && (
            <p className="text-xs text-muted-foreground px-2">
              +{(alerts?.overduePayments?.length || 0) - 3} mais
            </p>
          )}
        </div>
      ),
    },
    {
      id: "expiring",
      title: "Contratos Vencendo",
      icon: AlertCircle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      count: alerts?.contractsExpiring?.length || 0,
      items: (
        <div className="space-y-1">
          {alerts?.contractsExpiring?.slice(0, 3).map((contract) => (
            <button
              key={contract.id}
              onClick={() => onContractClick?.(contract)}
              className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="font-medium">{formatPrice(contract.rentValue)}/mês</span>
              <span className="text-muted-foreground ml-2">até {formatDate(contract.endDate)}</span>
            </button>
          ))}
          {(alerts?.contractsExpiring?.length || 0) > 3 && (
            <p className="text-xs text-muted-foreground px-2">
              +{(alerts?.contractsExpiring?.length || 0) - 3} mais
            </p>
          )}
        </div>
      ),
    },
    {
      id: "adjusting",
      title: "Reajustes Próximos",
      icon: CalendarClock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      count: alerts?.contractsAdjusting?.length || 0,
      items: (
        <div className="space-y-1">
          {alerts?.contractsAdjusting?.slice(0, 3).map((contract) => (
            <button
              key={contract.id}
              onClick={() => onContractClick?.(contract)}
              className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="font-medium">{formatPrice(contract.rentValue)}/mês</span>
              <span className="text-muted-foreground ml-2">{contract.adjustmentIndex}</span>
            </button>
          ))}
          {(alerts?.contractsAdjusting?.length || 0) > 3 && (
            <p className="text-xs text-muted-foreground px-2">
              +{(alerts?.contractsAdjusting?.length || 0) - 3} mais
            </p>
          )}
        </div>
      ),
    },
    {
      id: "vacant",
      title: "Imóveis Vagos",
      icon: Home,
      color: "text-gray-600",
      bgColor: "bg-gray-100",
      count: alerts?.vacantProperties?.length || 0,
      items: (
        <div className="space-y-1">
          {alerts?.vacantProperties?.slice(0, 3).map((property) => (
            <button
              key={property.id}
              onClick={() => onPropertyClick?.(property)}
              className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="font-medium truncate block">{property.title}</span>
              <span className="text-muted-foreground">{property.city}</span>
            </button>
          ))}
          {(alerts?.vacantProperties?.length || 0) > 3 && (
            <p className="text-xs text-muted-foreground px-2">
              +{(alerts?.vacantProperties?.length || 0) - 3} mais
            </p>
          )}
        </div>
      ),
    },
  ].filter((cat) => cat.count > 0);

  return (
    <Card className="border-yellow-200 bg-yellow-50/30">
      <CardContent className="p-3 sm:p-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Bell className="h-4 w-4 text-yellow-600" />
            </div>
            <span className="font-medium text-sm">Alertas de Locação</span>
            <Badge variant="secondary" className="text-xs">
              {totalAlerts}
            </Badge>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.id}
                className="rounded-lg border bg-background p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`h-6 w-6 rounded flex items-center justify-center ${category.bgColor}`}>
                    <category.icon className={`h-3.5 w-3.5 ${category.color}`} />
                  </div>
                  <span className="text-xs font-medium">{category.title}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px]">
                    {category.count}
                  </Badge>
                </div>
                {category.items}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
