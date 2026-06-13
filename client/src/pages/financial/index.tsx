import { usePageTitle } from "@/hooks/use-page-title";
import { apiRequest } from "@/lib/queryClient";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, startOfDay, endOfDay } from "date-fns";
import FinancialDashboard from "./components/FinancialDashboard";
import FinancialTabs from "./components/FinancialTabs";
import FinancialCharts from "./components/FinancialCharts";
import TransactionFormDialog from "./components/TransactionFormDialog";
import { FinancialChartsSkeleton } from "@/components/ui/skeleton-loaders";
import type {
  FinancialMetrics,
  FinanceTransaction,
  ChartData,
  PeriodOption,
} from "./types";

export default function FinanceiroPage() {
  usePageTitle("Financeiro");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<PeriodOption>('currentMonth');
  const [activeTab, setActiveTab] = useState('general');
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingCharts, setIsLoadingCharts] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);

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
    const abortController = new AbortController();

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
          signal: abortController.signal,
        });

        if (res.ok && !abortController.signal.aborted) {
          const data = await res.json();
          setMetrics(data);
        } else if (!abortController.signal.aborted) {
          throw new Error('Failed to fetch metrics');
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching metrics:', error);
          toast({
            title: "Erro ao carregar métricas",
            description: "Não foi possível carregar as métricas financeiras.",
            variant: "destructive",
          });
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingMetrics(false);
        }
      }
    };

    fetchMetrics();

    return () => {
      abortController.abort();
    };
  }, [dateRange, toast]);

  // Fetch transactions
  useEffect(() => {
    const abortController = new AbortController();

    const fetchTransactions = async () => {
      setIsLoadingTransactions(true);
      try {
        const params = new URLSearchParams({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        });

        const res = await fetch(`/api/financial/transactions?${params.toString()}`, {
          credentials: "include",
          signal: abortController.signal,
        });

        if (res.ok && !abortController.signal.aborted) {
          const data = await res.json();
          setTransactions(data);
        } else if (!abortController.signal.aborted) {
          throw new Error('Failed to fetch transactions');
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching transactions:', error);
          toast({
            title: "Erro ao carregar transações",
            description: "Não foi possível carregar as transações financeiras.",
            variant: "destructive",
          });
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingTransactions(false);
        }
      }
    };

    fetchTransactions();

    return () => {
      abortController.abort();
    };
  }, [dateRange, toast]);

  // Fetch chart data
  useEffect(() => {
    const abortController = new AbortController();

    const fetchChartData = async () => {
      setIsLoadingCharts(true);
      try {
        let chartPeriod: 'month' | 'quarter' | 'year' = 'month';
        if (period === 'year') chartPeriod = 'year';
        else if (period === 'lastMonth' || period === 'currentMonth') chartPeriod = 'month';

        const res = await fetch(`/api/financial/charts?period=${chartPeriod}`, {
          credentials: "include",
          signal: abortController.signal,
        });

        if (res.ok && !abortController.signal.aborted) {
          const data = await res.json();
          setChartData(data);
        } else if (!abortController.signal.aborted) {
          throw new Error('Failed to fetch chart data');
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error fetching chart data:', error);
          toast({
            title: "Erro ao carregar gráficos",
            description: "Não foi possível carregar os dados dos gráficos.",
            variant: "destructive",
          });
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingCharts(false);
        }
      }
    };

    fetchChartData();

    return () => {
      abortController.abort();
    };
  }, [period, toast]);

  const refreshTransactions = useCallback(async () => {
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
  }, [dateRange]);

  const handleMarkAsPaid = async (id: string) => {
    try {
      await apiRequest('PATCH', `/api/finance-entries/${id}`, { status: 'completed' });

      toast({
        title: "Transação atualizada",
        description: "A transação foi marcada como paga.",
      });
      await refreshTransactions();
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
    setEditingTransaction(transaction);
    setIsTransactionDialogOpen(true);
  };

  const handleDuplicate = async (transaction: FinanceTransaction) => {
    try {
      try {
        await apiRequest('POST', '/api/finance-entries', {
          description: `${transaction.description} (cópia)`,
          amount: transaction.amount,
          flow: transaction.flow,
          entryDate: transaction.entryDate,
          status: 'scheduled',
          categoryId: transaction.categoryId,
          notes: transaction.notes,
          originType: 'manual',
        });
      } catch (reqError) {
        // Preserva a mensagem específica de erro do servidor (campo `error` do corpo).
        // apiRequest lança com formato "<status>: <texto>"; extrai o JSON para recuperar body.error.
        const raw = reqError instanceof Error ? reqError.message.replace(/^\d+:\s*/, '') : '';
        let serverError: string | null = null;
        try {
          serverError = JSON.parse(raw)?.error ?? null;
        } catch {
          serverError = null;
        }
        throw new Error(serverError || 'Não foi possível duplicar a transação.');
      }

      toast({
        title: "Transação duplicada",
        description: "Uma cópia foi criada com status previsto.",
      });
      await refreshTransactions();
    } catch (error) {
      console.error('Error duplicating transaction:', error);
      toast({
        title: "Erro ao duplicar",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleViewOrigin = (transaction: FinanceTransaction) => {
    // Navega para a entidade vinculada quando houver referência direta
    if (transaction.relatedEntityType === 'property' && transaction.relatedEntityId) {
      navigate(`/properties/${transaction.relatedEntityId}`);
      return;
    }

    switch (transaction.originType) {
      case 'sale':
        navigate('/vendas');
        break;
      case 'rental':
      case 'transfer':
        navigate('/rentals');
        break;
      case 'commission':
        setActiveTab('broker-commissions');
        break;
      default:
        toast({
          title: "Transação manual",
          description: "Esta transação foi criada manualmente e não possui origem vinculada.",
        });
    }
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
    setEditingTransaction(null);
    setIsTransactionDialogOpen(true);
  };

  return (
    <section
      className="space-y-6 sm:space-y-8 pb-8"
      aria-label="Visão geral financeira"
    >
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
      {isLoadingCharts ? (
        <FinancialChartsSkeleton />
      ) : (
        <FinancialCharts chartData={chartData} isLoading={false} />
      )}

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

      {/* Create/Edit Transaction Dialog */}
      <TransactionFormDialog
        open={isTransactionDialogOpen}
        onOpenChange={(open) => {
          setIsTransactionDialogOpen(open);
          if (!open) setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        onSaved={async () => {
          await refreshTransactions();
        }}
      />
    </section>
  );
}
