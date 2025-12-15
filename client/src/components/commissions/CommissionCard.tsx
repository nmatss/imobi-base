import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Home, DollarSign, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Commission } from "@/pages/financial/components/CommissionsTab";

type Props = {
  commission: Commission;
  onStatusChange: (commissionId: string, newStatus: 'pending' | 'approved' | 'paid') => void;
};

export default function CommissionCard({ commission, onStatusChange }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusConfig = (status: 'pending' | 'approved' | 'paid') => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendente',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-400',
        };
      case 'approved':
        return {
          label: 'Aprovada',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-950 dark:text-blue-400',
        };
      case 'paid':
        return {
          label: 'Paga',
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-950 dark:text-green-400',
        };
    }
  };

  const statusConfig = getStatusConfig(commission.status);
  const StatusIcon = statusConfig.icon;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {commission.transactionType === 'sale' ? (
                  <>
                    <DollarSign className="h-3 w-3 mr-1" />
                    Venda
                  </>
                ) : (
                  <>
                    <Home className="h-3 w-3 mr-1" />
                    Locação
                  </>
                )}
              </Badge>
              <Badge className={statusConfig.className}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <h4 className="font-semibold text-base truncate">{commission.propertyTitle}</h4>
            <p className="text-sm text-muted-foreground truncate">{commission.clientName}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {commission.status === 'pending' && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(commission.id, 'approved')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Comissão
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {commission.status === 'approved' && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(commission.id, 'paid')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Marcar como Paga
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(commission.id, 'pending')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Voltar para Pendente
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {commission.status === 'paid' && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(commission.id, 'approved')}>
                    <Clock className="h-4 w-4 mr-2" />
                    Voltar para Aprovada
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem>
                Ver Detalhes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Broker Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={commission.brokerAvatar} alt={commission.brokerName} />
            <AvatarFallback className="text-xs">{getInitials(commission.brokerName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{commission.brokerName}</p>
            <p className="text-xs text-muted-foreground">Corretor</p>
          </div>
        </div>

        {/* Commission Values */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Valor da Transação:</span>
            <span className="text-sm font-medium">{formatCurrency(commission.transactionValue)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Taxa ({commission.commissionRate}%):</span>
            <span className="text-sm font-medium">{formatCurrency(commission.grossCommission)}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Parte Imobiliária:</span>
            <span className="text-sm font-medium">
              {formatCurrency(commission.grossCommission - commission.brokerCommission)}
            </span>
          </div>
        </div>

        {/* Broker Commission - Highlighted */}
        <div className="p-3 rounded-xl border bg-primary/5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Comissão do Corretor:</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(commission.brokerCommission)}
            </span>
          </div>
        </div>

        {/* Date Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <Calendar className="h-3 w-3" />
          <span>
            {format(new Date(commission.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Payment Dates */}
        {commission.approvedAt && (
          <div className="text-xs text-muted-foreground">
            Aprovada em: {format(new Date(commission.approvedAt), "dd/MM/yyyy", { locale: ptBR })}
          </div>
        )}
        {commission.paidAt && (
          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
            Paga em: {format(new Date(commission.paidAt), "dd/MM/yyyy", { locale: ptBR })}
          </div>
        )}

        {/* Notes */}
        {commission.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground line-clamp-2">{commission.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
