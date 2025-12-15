import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Users, DollarSign, Award, Filter } from "lucide-react";
import CommissionCard from "@/components/commissions/CommissionCard";
import BrokerCommissionSummary from "@/components/commissions/BrokerCommissionSummary";
import CommissionCalculator from "@/components/commissions/CommissionCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Commission = {
  id: string;
  saleId?: string;
  rentalContractId?: string;
  brokerId: string;
  brokerName: string;
  brokerAvatar?: string;
  transactionType: 'sale' | 'rental';
  transactionValue: number;
  propertyTitle: string;
  clientName: string;
  commissionRate: number;
  grossCommission: number;
  agencySplit: number;
  brokerCommission: number;
  status: 'pending' | 'approved' | 'paid';
  approvedAt?: string;
  paidAt?: string;
  notes?: string;
  createdAt: string;
};

export type BrokerPerformance = {
  brokerId: string;
  brokerName: string;
  brokerAvatar?: string;
  totalCommission: number;
  pendingCommission: number;
  paidCommission: number;
  transactionCount: number;
  salesCount: number;
  rentalsCount: number;
};

type Props = {
  period?: string;
};

export default function CommissionsTab({ period = 'currentMonth' }: Props) {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [brokerPerformance, setBrokerPerformance] = useState<BrokerPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedBroker, setSelectedBroker] = useState<string>('all');
  const [activeView, setActiveView] = useState<string>('list');

  // Fetch commissions data
  useEffect(() => {
    const fetchCommissions = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (period) params.append('period', period);
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (typeFilter !== 'all') params.append('type', typeFilter);
        if (selectedBroker !== 'all') params.append('brokerId', selectedBroker);

        const res = await fetch(`/api/commissions?${params.toString()}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setCommissions(data.commissions || []);
          setBrokerPerformance(data.brokerPerformance || []);
        } else {
          throw new Error('Failed to fetch commissions');
        }
      } catch (error) {
        console.error('Error fetching commissions:', error);
        toast({
          title: "Erro ao carregar comissões",
          description: "Não foi possível carregar os dados de comissões.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommissions();
  }, [period, statusFilter, typeFilter, selectedBroker, toast]);

  // Calculate summary metrics
  const summaryMetrics = {
    totalCommissions: commissions.reduce((sum, c) => sum + c.brokerCommission, 0),
    pendingCommissions: commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.brokerCommission, 0),
    approvedCommissions: commissions.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.brokerCommission, 0),
    paidCommissions: commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.brokerCommission, 0),
    totalTransactions: commissions.length,
  };

  const handleStatusChange = async (commissionId: string, newStatus: 'pending' | 'approved' | 'paid') => {
    try {
      const res = await fetch(`/api/commissions/${commissionId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast({
          title: "Status atualizado",
          description: `Comissão marcada como ${newStatus === 'paid' ? 'paga' : newStatus === 'approved' ? 'aprovada' : 'pendente'}.`,
        });

        // Refresh data
        setCommissions(prev =>
          prev.map(c => c.id === commissionId ? { ...c, status: newStatus } : c)
        );
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating commission status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da comissão.",
        variant: "destructive",
      });
    }
  };

  const filteredCommissions = commissions;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryMetrics.totalCommissions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summaryMetrics.totalTransactions} transações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Award className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryMetrics.pendingCommissions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryMetrics.approvedCommissions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prontas para pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summaryMetrics.paidCommissions)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Já quitadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list">Listagem</TabsTrigger>
          <TabsTrigger value="brokers">Por Corretor</TabsTrigger>
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="approved">Aprovadas</SelectItem>
                      <SelectItem value="paid">Pagas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os tipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sale">Vendas</SelectItem>
                      <SelectItem value="rental">Aluguéis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Corretor</label>
                  <Select value={selectedBroker} onValueChange={setSelectedBroker}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os corretores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {brokerPerformance.map(broker => (
                        <SelectItem key={broker.brokerId} value={broker.brokerId}>
                          {broker.brokerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-8 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredCommissions.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Award className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma comissão encontrada</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Não há comissões para os filtros selecionados.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCommissions.map((commission) => (
                <CommissionCard
                  key={commission.id}
                  commission={commission}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="brokers" className="mt-6">
          <BrokerCommissionSummary
            brokers={brokerPerformance}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="calculator" className="mt-6">
          <CommissionCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
