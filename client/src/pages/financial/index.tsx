import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from "date-fns";
import FinancialDashboard from "./components/FinancialDashboard";
import FinancialTabs from "./components/FinancialTabs";
import FinancialCharts from "./components/FinancialCharts";
import FinancialAI from "./components/FinancialAI";
import type {
  FinancialMetrics,
  FinanceTransaction,
  ChartData,
  PeriodOption,
} from "./types";

export default function FinanceiroPage() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodOption>('currentMonth');
  const [activeTab, setActiveTab] = useState('general');
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [metrics, setMetrics] = useState<FinancialMetrics>({
    commissionsReceived: 0,
    ownerTransfers: 0,
    rentalRevenue: 0,
    salesRevenue: 0,
    operationalExpenses: 0,
    cashBalance: 0,
    periodVariation: 0,
  });

  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    byMonth: [],
    byCategory: [],
    byOrigin: [],
  });

  // Calculate date ranges based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let previousPeriodStart: Date | undefined;
    let previousPeriodEnd: Date | undefined;

    switch (period) {
      case 'today':
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        break;
      case 'currentMonth':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        previousPeriodStart = startOfMonth(subMonths(now, 1));
        previousPeriodEnd = endOfMonth(subMonths(now, 1));
        break;
      case 'lastMonth':
        startDate = startOfMonth(subMonths(now, 1));
        endDate = endOfMonth(subMonths(now, 1));
        previousPeriodStart = startOfMonth(subMonths(now, 2));
        previousPeriodEnd = endOfMonth(subMonths(now, 2));
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    return { startDate, endDate, previousPeriodStart, previousPeriodEnd };
  }, [period]);

  // Fetch financial metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoadingMetrics(true);
      try {
        const params = new URLSearchParams({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        });

        if (dateRange.previousPeriodStart && dateRange.previousPeriodEnd) {
          params.append('previousPeriodStart', dateRange.previousPeriodStart.toISOString());
          params.append('previousPeriodEnd', dateRange.previousPeriodEnd.toISOString());
        }

        const res = await fetch(`/api/financial/metrics?${params.toString()}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        } else {
          throw new Error('Failed to fetch metrics');
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
        toast({
          title: "Erro ao carregar métricas",
          description: "Não foi possível carregar as métricas financeiras.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchMetrics();
  }, [dateRange, toast]);

  // Fetch transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoadingTransactions(true);
      try {
        const params = new URLSearchParams({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        });

        const res = await fetch(`/api/financial/transactions?${params.toString()}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        } else {
          throw new Error('Failed to fetch transactions');
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        toast({
          title: "Erro ao carregar transações",
          description: "Não foi possível carregar as transações financeiras.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [dateRange, toast]);

  // Fetch chart data
  useEffect(() => {
    const fetchChartData = async () => {
      setIsLoadingCharts(true);
      try {
        let chartPeriod: 'month' | 'quarter' | 'year' = 'month';
        if (period === 'year') chartPeriod = 'year';
        else if (period === 'lastMonth' || period === 'currentMonth') chartPeriod = 'month';

        const res = await fetch(`/api/financial/charts?period=${chartPeriod}`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setChartData(data);
        } else {
          throw new Error('Failed to fetch chart data');
        }
      } catch (error) {
        console.error('Error fetching chart data:', error);
        toast({
          title: "Erro ao carregar gráficos",
          description: "Não foi possível carregar os dados dos gráficos.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCharts(false);
      }
    };

    fetchChartData();
  }, [period, toast]);

  const handleMarkAsPaid = async (id: string) => {
    try {
      const res = await fetch(`/api/finance-entries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'completed' }),
      });

      if (res.ok) {
        toast({
          title: "Transação atualizada",
          description: "A transação foi marcada como paga.",
        });
        // Refresh transactions
        const params = new URLSearchParams({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        });
        const refreshRes = await fetch(`/api/financial/transactions?${params.toString()}`, {
          credentials: "include",
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTransactions(data);
        }
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a transação.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: FinanceTransaction) => {
    // TODO: Open edit modal
    console.log('Edit transaction:', transaction);
    toast({
      title: "Em desenvolvimento",
      description: "A edição de transações será implementada em breve.",
    });
  };

  const handleDuplicate = (transaction: FinanceTransaction) => {
    // TODO: Duplicate transaction
    console.log('Duplicate transaction:', transaction);
    toast({
      title: "Em desenvolvimento",
      description: "A duplicação de transações será implementada em breve.",
    });
  };

  const handleViewOrigin = (transaction: FinanceTransaction) => {
    // TODO: Navigate to origin
    console.log('View origin:', transaction);
    toast({
      title: "Em desenvolvimento",
      description: "A visualização da origem será implementada em breve.",
    });
  };

  const handleAIPrompt = (promptId: string) => {
    // TODO: Handle AI prompt
    console.log('AI Prompt:', promptId);
    toast({
      title: "Assistente AI",
      description: "A funcionalidade de AI será implementada em breve.",
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch all data
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
      });

      if (dateRange.previousPeriodStart && dateRange.previousPeriodEnd) {
        params.append('previousPeriodStart', dateRange.previousPeriodStart.toISOString());
        params.append('previousPeriodEnd', dateRange.previousPeriodEnd.toISOString());
      }

      const [metricsRes, transactionsRes] = await Promise.all([
        fetch(`/api/financial/metrics?${params.toString()}`, { credentials: "include" }),
        fetch(`/api/financial/transactions?${params.toString()}`, { credentials: "include" })
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        setTransactions(transactionsData);
      }

      toast({
        title: "Dados atualizados",
        description: "As informações financeiras foram recarregadas com sucesso.",
      });
    } catch (error) {
      console.error('Error refreshing:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível recarregar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddTransaction = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A criação de transações manuais será implementada em breve.",
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Financial Dashboard with KPIs */}
      <FinancialDashboard
        metrics={metrics}
        period={period}
        onPeriodChange={setPeriod}
        isLoading={isLoadingMetrics}
        onRefresh={handleRefresh}
        onAddTransaction={handleAddTransaction}
        isRefreshing={isRefreshing}
      />

      {/* Charts */}
      <FinancialCharts chartData={chartData} isLoading={isLoadingCharts} />

      {/* Transaction Tabs */}
      <FinancialTabs
        transactions={transactions}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onMarkAsPaid={handleMarkAsPaid}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onViewOrigin={handleViewOrigin}
        isLoading={isLoadingTransactions}
        period={period}
      />

      {/* AI Assistant */}
      <FinancialAI onPromptSelect={handleAIPrompt} />
    </div>
  );
}
