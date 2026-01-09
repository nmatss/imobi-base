/**
 * EXEMPLO DE IMPLEMENTAÇÃO DE FEEDBACK VISUAL NO DASHBOARD
 *
 * Este arquivo demonstra como integrar:
 * - Loading states com skeletons
 * - Toast notifications para ações
 * - Estados vazios com mensagens
 * - Feedback visual em operações assíncronas
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback } from "@/hooks/useToastFeedback";
import { PageLoader } from "@/components/ui/page-loader";
import { DashboardSkeleton } from "@/components/ui/skeleton-loaders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RefreshCw, TrendingUp, Users, Home, DollarSign } from "lucide-react";

// Exemplo de tipo de dados do dashboard
interface DashboardStats {
  totalLeads: number;
  totalProperties: number;
  totalRevenue: number;
  activeUsers: number;
}

export function DashboardWithFeedback() {
  const toast = useToastFeedback();
  const queryClient = useQueryClient();

  // Query para buscar dados do dashboard
  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Mutation para atualizar dados
  const updateStatsMutation = useMutation({
    mutationFn: async () => {
      // Simular chamada API
      const response = await fetch("/api/dashboard/refresh", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Erro ao atualizar");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Dados atualizados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar dados", error.message);
    },
  });

  // Mostrar toast de erro ao carregar
  useEffect(() => {
    if (isError) {
      toast.error(
        "Erro ao carregar dashboard",
        error instanceof Error ? error.message : "Tente novamente"
      );
    }
  }, [isError, error]);

  // Loading inicial - Full screen loader
  if (isLoading) {
    return (
      <PageLoader
        text="Carregando dashboard"
        description="Buscando suas estatísticas..."
      />
    );
  }

  // Skeleton para re-loading (após primeiro load)
  if (isLoading && stats) {
    return <DashboardSkeleton />;
  }

  // Estado de erro
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-destructive text-sm">
              Erro ao carregar os dados do dashboard
            </div>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Estado vazio
  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="text-muted-foreground text-sm">
              Nenhum dado disponível no momento
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <Button
          onClick={() => updateStatsMutation.mutate()}
          disabled={updateStatsMutation.isPending}
          isLoading={updateStatsMutation.isPending}
          variant="outline"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Leads"
          value={stats.totalLeads}
          icon={Users}
          trend="+12%"
          trendUp
        />
        <StatCard
          title="Imóveis Ativos"
          value={stats.totalProperties}
          icon={Home}
          trend="+5%"
          trendUp
        />
        <StatCard
          title="Receita Total"
          value={`R$ ${stats.totalRevenue.toLocaleString("pt-BR")}`}
          icon={DollarSign}
          trend="+23%"
          trendUp
        />
        <StatCard
          title="Usuários Ativos"
          value={stats.activeUsers}
          icon={TrendingUp}
          trend="-2%"
          trendUp={false}
        />
      </div>

      {/* Outros componentes do dashboard... */}
    </div>
  );
}

// Componente de card de estatística
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, icon: Icon, trend, trendUp }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p
            className={`text-xs ${
              trendUp ? "text-green-600" : "text-red-600"
            }`}
          >
            {trend} em relação ao mês anterior
          </p>
        )}
      </CardContent>
    </Card>
  );
}
