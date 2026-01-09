import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FileText,
  Phone,
  MessageCircle,
  RotateCcw,
  XCircle,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
  Home,
  User,
} from "lucide-react";
import { PaymentTimeline, PaymentStatus } from "./PaymentTimeline";
import type { RentalContract, Property, Renter } from "../types";
import { formatPrice, formatDate, getStatusColor, getStatusLabel } from "../types";

export interface RentalContractCardProps {
  id: string;
  contract: RentalContract;
  property: Property;
  tenant: Renter;
  nextDueDate?: Date;
  paymentHistory: PaymentStatus[];
  onViewDetails?: (id: string) => void;
  onCharge?: (id: string) => void;
  onRenew?: (id: string) => void;
  onTerminate?: (id: string) => void;
  onContactTenant?: (phone: string) => void;
}

export function RentalContractCard({
  id,
  contract,
  property,
  tenant,
  nextDueDate,
  paymentHistory,
  onViewDetails,
  onCharge,
  onRenew,
  onTerminate,
  onContactTenant,
}: RentalContractCardProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Calculate contract duration
  const getDuration = () => {
    const start = new Date(contract.startDate);
    const end = new Date(contract.endDate);
    const months = Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    return `${months} meses`;
  };

  // Get next due date badge
  const getNextDueBadge = () => {
    if (!nextDueDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(nextDueDate);
    due.setHours(0, 0, 0, 0);

    const diff = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          {Math.abs(diff)}d atrasado
        </Badge>
      );
    } else if (diff === 0) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
          Vence hoje
        </Badge>
      );
    } else if (diff <= 3) {
      return (
        <Badge className="bg-orange-100 text-orange-700 border-orange-200">
          Vence em {diff}d
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200">
        Em dia
      </Badge>
    );
  };

  return (
    <Card className="rounded-xl border-2 hover:shadow-md transition-all">
      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Header: Property + Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Home className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{property.title}</h3>
              <p className="text-xs text-muted-foreground truncate">
                {property.address}
              </p>
              <p className="text-xs text-muted-foreground">
                {property.city}, {property.state}
              </p>
            </div>
          </div>
          <Badge className={`${getStatusColor(contract.status)} shrink-0`}>
            {getStatusLabel(contract.status)}
          </Badge>
        </div>

        {/* Tenant Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {getInitials(tenant.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{tenant.name}</p>
            <p className="text-xs text-muted-foreground truncate">{tenant.phone}</p>
          </div>
          {tenant.phone && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onContactTenant?.(tenant.phone)}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Rent Value - Highlighted */}
        <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm text-muted-foreground">Valor do Aluguel</span>
          </div>
          <span className="text-2xl font-bold text-green-700">
            {formatPrice(contract.rentValue)}
          </span>
        </div>

        {/* Contract Details Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Vencimento</p>
            <p className="font-semibold text-sm">Dia {contract.dueDay}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Duração</p>
            <p className="font-semibold text-sm">{getDuration()}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Reajuste</p>
            <p className="font-semibold text-sm">{contract.adjustmentIndex || "-"}</p>
          </div>
        </div>

        {/* Contract Period */}
        <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Início</p>
              <p className="text-sm font-medium">{formatDate(contract.startDate)}</p>
            </div>
          </div>
          <div className="h-px flex-1 mx-3 bg-border" />
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Término</p>
            <p className="text-sm font-medium">{formatDate(contract.endDate)}</p>
          </div>
        </div>

        {/* Next Due Date */}
        {nextDueDate && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-medium text-blue-900">Próximo vencimento</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-blue-900">
                {formatDate(nextDueDate.toISOString())}
              </span>
              {getNextDueBadge()}
            </div>
          </div>
        )}

        {/* Payment Timeline Toggle */}
        {paymentHistory.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowTimeline(!showTimeline)}
          >
            {showTimeline ? (
              <ChevronUp className="h-4 w-4 mr-2" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-2" />
            )}
            {showTimeline ? "Ocultar" : "Ver"} Histórico de Pagamentos
          </Button>
        )}

        {/* Payment Timeline (Expandable) */}
        {showTimeline && paymentHistory.length > 0 && (
          <div className="pt-2 border-t">
            <PaymentTimeline payments={paymentHistory} compact={false} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px]"
            onClick={() => onViewDetails?.(id)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Ver Detalhes
          </Button>
          {contract.status === "active" && onCharge && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => onCharge(id)}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Cobrar
            </Button>
          )}
          {contract.status === "active" && onRenew && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px]"
              onClick={() => onRenew(id)}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Renovar
            </Button>
          )}
          {contract.status === "active" && onTerminate && (
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onTerminate(id)}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rescindir
            </Button>
          )}
        </div>

        {/* Additional Info (if needed) */}
        {(contract.condoFee || contract.iptuValue) && (
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            {contract.condoFee && (
              <div className="flex justify-between">
                <span>Condomínio:</span>
                <span className="font-medium">{formatPrice(contract.condoFee)}</span>
              </div>
            )}
            {contract.iptuValue && (
              <div className="flex justify-between">
                <span>IPTU:</span>
                <span className="font-medium">{formatPrice(contract.iptuValue)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t">
              <span className="font-medium">Total:</span>
              <span className="font-bold">
                {formatPrice(
                  Number(contract.rentValue) +
                    Number(contract.condoFee || 0) +
                    Number(contract.iptuValue || 0)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
