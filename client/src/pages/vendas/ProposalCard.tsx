import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  User,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  MessageCircle,
  Eye,
  MoreVertical,
  Clock,
  PiggyBank,
  Banknote,
  Percent,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

// Types
export type ProposalStatus = "pending" | "accepted" | "rejected" | "negotiating";

export interface ProposalCardProps {
  id: string;
  property: {
    address: string;
    askingPrice: number;
    imageUrl?: string;
  };
  buyer: {
    name: string;
    contact: string;
    avatar?: string;
  };
  proposedValue: number;
  downPayment?: number;
  financing?: boolean;
  deadline?: Date;
  status: ProposalStatus;
  createdAt: Date;
  onAccept?: (id: string) => void;
  onCounterOffer?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  notes?: string;
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

// Calculate percentage of asking price
const calculatePricePercentage = (proposed: number, asking: number): number => {
  return Math.round((proposed / asking) * 100);
};

// Get status configuration
const getStatusConfig = (
  status: ProposalStatus
): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  icon: React.ComponentType<{ className?: string }>;
  color: string;
} => {
  switch (status) {
    case "pending":
      return {
        label: "Pendente",
        variant: "secondary",
        icon: Clock,
        color: "text-yellow-600 bg-yellow-50 border-yellow-200",
      };
    case "negotiating":
      return {
        label: "Em Negociação",
        variant: "default",
        icon: MessageCircle,
        color: "text-blue-600 bg-blue-50 border-blue-200",
      };
    case "accepted":
      return {
        label: "Aceita",
        variant: "default",
        icon: CheckCircle,
        color: "text-green-600 bg-green-50 border-green-200",
      };
    case "rejected":
      return {
        label: "Recusada",
        variant: "destructive",
        icon: XCircle,
        color: "text-red-600 bg-red-50 border-red-200",
      };
    default:
      return {
        label: status,
        variant: "outline",
        icon: Clock,
        color: "text-gray-600 bg-gray-50 border-gray-200",
      };
  }
};

// Get price difference badge variant
const getPriceBadgeVariant = (percentage: number): "default" | "secondary" | "destructive" => {
  if (percentage >= 90) return "default";
  if (percentage >= 80) return "secondary";
  return "destructive";
};

export function ProposalCard({
  id,
  property,
  buyer,
  proposedValue,
  downPayment,
  financing,
  deadline,
  status,
  createdAt,
  onAccept,
  onCounterOffer,
  onReject,
  onViewDetails,
  notes,
}: ProposalCardProps) {
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const percentage = calculatePricePercentage(proposedValue, property.askingPrice);
  const priceBadgeVariant = getPriceBadgeVariant(percentage);
  const difference = proposedValue - property.askingPrice;
  const daysOld = differenceInDays(new Date(), createdAt);

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <CardHeader className="p-4 pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          {/* Property Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted">
              {property.imageUrl ? (
                <img
                  src={property.imageUrl}
                  alt={property.address}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                {property.address}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Valor pedido: {formatPrice(property.askingPrice)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <Badge
            variant={statusConfig.variant}
            className={cn("gap-1.5 flex-shrink-0", statusConfig.color)}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Buyer Info */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{buyer.name}</p>
            <p className="text-xs text-muted-foreground truncate">{buyer.contact}</p>
          </div>
          <div className="text-xs text-muted-foreground flex-shrink-0">
            {daysOld === 0
              ? "Hoje"
              : daysOld === 1
              ? "1 dia atrás"
              : `${daysOld} dias atrás`}
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Values Section */}
      <CardContent className="p-4 space-y-4">
        {/* Proposed Value - HIGHLIGHT */}
        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Valor Proposto</p>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(proposedValue)}
              </p>
            </div>
            <div className="text-right">
              <Badge variant={priceBadgeVariant} className="gap-1 mb-1">
                {percentage >= 100 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {percentage}%
              </Badge>
              <p className="text-xs text-muted-foreground">
                {difference >= 0 ? "+" : ""}
                {formatPrice(difference)}
              </p>
            </div>
          </div>

          {/* Price Difference Bar */}
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
                percentage >= 90
                  ? "bg-green-500"
                  : percentage >= 80
                  ? "bg-yellow-500"
                  : "bg-red-500"
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Conditions */}
        {(downPayment || financing || deadline) && (
          <div className="grid grid-cols-2 gap-3">
            {downPayment && (
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <PiggyBank className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Entrada</p>
                  <p className="text-sm font-semibold">
                    {formatPrice(downPayment)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((downPayment / proposedValue) * 100)}%
                  </p>
                </div>
              </div>
            )}

            {financing !== undefined && (
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Banknote className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Financiamento</p>
                  <p className="text-sm font-semibold">
                    {financing ? "Sim" : "Não"}
                  </p>
                  {financing && downPayment && (
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(proposedValue - downPayment)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {deadline && (
              <div className="flex items-start gap-2 col-span-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Prazo para resposta</p>
                  <p className="text-sm font-semibold">
                    {format(deadline, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <p className="font-medium mb-1">Observações:</p>
            <p className="line-clamp-2">{notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {status === "pending" && (
            <>
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-9 gap-1.5"
                onClick={() => onAccept?.(id)}
              >
                <CheckCircle className="h-4 w-4" />
                Aceitar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 gap-1.5"
                onClick={() => onCounterOffer?.(id)}
              >
                <MessageCircle className="h-4 w-4" />
                Contra-propor
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onReject?.(id)}
                    className="text-destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Recusar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {status === "negotiating" && (
            <>
              <Button
                variant="default"
                size="sm"
                className="flex-1 h-9 gap-1.5"
                onClick={() => onViewDetails?.(id)}
              >
                <MessageCircle className="h-4 w-4" />
                Continuar negociação
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-9 gap-1.5"
                onClick={() => onAccept?.(id)}
              >
                <CheckCircle className="h-4 w-4" />
                Aceitar
              </Button>
            </>
          )}

          {(status === "accepted" || status === "rejected") && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 gap-1.5"
              onClick={() => onViewDetails?.(id)}
            >
              <Eye className="h-4 w-4" />
              Ver detalhes
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
