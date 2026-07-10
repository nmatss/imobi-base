// Financial Types for ImobiBase

export type FinancialMetrics = {
  commissionsReceived: number;
  ownerTransfers: number;
  rentalRevenue: number;
  salesRevenue: number;
  operationalExpenses: number;
  cashBalance: number;
  periodVariation: number;
  // Extended metrics for new KPIs (calculated on frontend or backend)
  totalRevenue?: number;
  accountsReceivable?: number;
  accountsPayable?: number;
  overdueAmount?: number;
  overduePercentage?: number;
  pendingInvoicesCount?: number;
  overdueContractsCount?: number;
};

export type FinanceTransaction = {
  id: string;
  tenantId: string;
  categoryId: string | null;
  sourceType: string | null;
  sourceId: string | null;
  description: string;
  amount: string;
  flow: 'income' | 'expense';
  entryDate: string;
  notes: string | null;
  originType: string | null;
  originId: string | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  status: 'scheduled' | 'completed' | 'overdue';
  createdAt: string;
  category?: {
    id: string;
    name: string;
    type: string;
    color: string;
  } | null;
  type?: 'receita' | 'despesa';
};

export type FinanceCategory = {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  color: string;
  isSystemGenerated: boolean;
  createdAt: string;
};

export type ChartData = {
  byMonth: { month: string; revenue: number; expenses: number }[];
  byCategory: { category: string; amount: number; type: string }[];
  byOrigin: { origin: string; amount: number }[];
};

export type PeriodOption = 'today' | 'currentMonth' | 'lastMonth' | 'year' | 'custom';

export type TransactionFilters = {
  type?: string;
  category?: string;
  status?: string;
  origin?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
};

// Fluxo canônico 'income'/'expense' (alinhado ao seeder do server e ao TransactionFormDialog).
export const FINANCE_CATEGORIES = [
  { name: 'Comissões de Venda', type: 'income', color: '#22c55e' },
  { name: 'Comissões de Locação', type: 'income', color: '#3b82f6' },
  { name: 'Taxa de Administração', type: 'income', color: '#8b5cf6' },
  { name: 'Taxas de Cartório', type: 'expense', color: '#ef4444' },
  { name: 'Manutenção de Imóveis', type: 'expense', color: '#f59e0b' },
  { name: 'Publicidade', type: 'expense', color: '#ec4899' },
  { name: 'Honorários', type: 'expense', color: '#6366f1' },
  { name: 'Impostos', type: 'expense', color: '#dc2626' },
  { name: 'Repasses a Proprietários', type: 'expense', color: '#f97316' },
  { name: 'Despesas Administrativas', type: 'expense', color: '#64748b' },
  { name: 'Despesas com Pessoal', type: 'expense', color: '#475569' },
];

export const TRANSACTION_STATUS_CONFIG = {
  scheduled: { label: 'Previsto', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  completed: { label: 'Realizado', color: 'bg-green-100 text-green-700 border-green-300' },
  overdue: { label: 'Atrasado', color: 'bg-red-100 text-red-700 border-red-300' },
};

export const ORIGIN_TYPE_LABELS: Record<string, string> = {
  sale: 'Venda',
  rental: 'Aluguel',
  transfer: 'Repasse',
  commission: 'Comissão',
  manual: 'Manual',
};
