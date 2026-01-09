import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, DollarSign, Home, Award } from "lucide-react";
import type { BrokerPerformance } from "@/pages/financial/components/CommissionsTab";

type Props = {
  brokers: BrokerPerformance[];
  isLoading?: boolean;
};

export default function BrokerCommissionSummary({ brokers, isLoading }: Props) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Sort brokers by total commission
  const sortedBrokers = [...brokers].sort((a, b) => b.totalCommission - a.totalCommission);
  const maxCommission = sortedBrokers[0]?.totalCommission || 1;

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return { icon: Trophy, className: "bg-amber-700 text-white dark:bg-amber-950 dark:text-amber-200", label: "1º" }; // WCAG AA: 4.6:1
      case 1:
        return { icon: Award, className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400", label: "2º" };
      case 2:
        return { icon: Award, className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400", label: "3º" };
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (brokers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Award className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum corretor encontrado</h3>
          <p className="text-sm text-muted-foreground text-center">
            Não há dados de corretores para o período selecionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Performers Podium */}
      <div className="grid gap-4 md:grid-cols-3">
        {sortedBrokers.slice(0, 3).map((broker, index) => {
          const rankBadge = getRankBadge(index);
          const RankIcon = rankBadge?.icon || Trophy;

          return (
            <Card key={broker.brokerId} className={index === 0 ? "border-yellow-400 dark:border-yellow-600" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge className={rankBadge?.className || ""}>
                    <RankIcon className="h-3 w-3 mr-1" />
                    {rankBadge?.label}
                  </Badge>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={broker.brokerAvatar} alt={broker.brokerName} />
                    <AvatarFallback>{getInitials(broker.brokerName)}</AvatarFallback>
                  </Avatar>
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold mb-1">{broker.brokerName}</h3>
                <div className="text-2xl font-bold text-primary mb-3">
                  {formatCurrency(broker.totalCommission)}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Transações:</span>
                    <span className="font-medium">{broker.transactionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendas:</span>
                    <span className="font-medium">{broker.salesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Locações:</span>
                    <span className="font-medium">{broker.rentalsCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Full Ranking List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ranking Completo de Corretores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedBrokers.map((broker, index) => {
              const progressPercentage = (broker.totalCommission / maxCommission) * 100;
              const rankBadge = getRankBadge(index);

              return (
                <div key={broker.brokerId} className="space-y-2">
                  <div className="flex items-center gap-3">
                    {/* Rank Number */}
                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                      {rankBadge ? (
                        <Badge className={rankBadge.className} variant="outline">
                          {rankBadge.label}
                        </Badge>
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={broker.brokerAvatar} alt={broker.brokerName} />
                      <AvatarFallback className="text-sm">
                        {getInitials(broker.brokerName)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Broker Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium truncate">{broker.brokerName}</p>
                        <span className="font-bold text-primary ml-2 shrink-0">
                          {formatCurrency(broker.totalCommission)}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          {broker.transactionCount} transações
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {broker.salesCount} vendas
                        </span>
                        <span className="flex items-center gap-1">
                          <Home className="h-3 w-3" />
                          {broker.rentalsCount} locações
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Commission Status Breakdown */}
                  <div className="ml-14 grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 rounded-lg border bg-amber-50 dark:bg-amber-950/20">
                      <div className="text-amber-700 dark:text-amber-400 font-medium">
                        {formatCurrency(broker.pendingCommission)}
                      </div>
                      <div className="text-muted-foreground">Pendente</div>
                    </div>
                    <div className="p-2 rounded-lg border bg-green-50 dark:bg-green-950/20">
                      <div className="text-green-700 dark:text-green-400 font-medium">
                        {formatCurrency(broker.paidCommission)}
                      </div>
                      <div className="text-muted-foreground">Pago</div>
                    </div>
                    <div className="p-2 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
                      <div className="text-blue-700 dark:text-blue-400 font-medium">
                        {formatCurrency(broker.totalCommission - broker.pendingCommission - broker.paidCommission)}
                      </div>
                      <div className="text-muted-foreground">Aprovado</div>
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
