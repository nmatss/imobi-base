// Shared types for the comprehensive Reports module

export interface ReportFilters {
  startDate: string;
  endDate: string;
  brokerId?: string;
  origin?: string;
  propertyType?: string;
  city?: string;
}

export interface KPICard {
  title: string;
  value: string | number;
  icon: any;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  description?: string;
}

// Sales Report Types
export interface SalesReportData {
  kpis: {
    totalSales: number;
    totalValue: number;
    averageTicket: number;
    conversionRate: number;
    topBroker: string;
  };
  salesByMonth: { month: string; count: number; value: number }[];
  salesByType: { type: string; count: number; value: number }[];
  salesByCity: { city: string; count: number; value: number }[];
  sales: any[];
}

// Rentals Report Types
export interface RentalsReportData {
  kpis: {
    activeContracts: number;
    recurringRevenue: number;
    delinquencyRate: number;
    vacancyRate: number;
    expiringContracts: number;
  };
  revenueByMonth: { month: string; revenue: number }[];
  delinquencyTrend: { month: string; rate: number }[];
  vacancyByType: { type: string; vacant: number; total: number }[];
  contracts: any[];
  riskAlerts: {
    recurringDelays: any[];
    highTurnover: any[];
  };
}

// Leads Funnel Report Types
export interface LeadsFunnelReportData {
  funnel: {
    stage: string;
    count: number;
    avgDays: number;
  }[];
  conversionRates: {
    from: string;
    to: string;
    rate: number;
  }[];
  sourceAnalysis: {
    source: string;
    count: number;
  }[];
  lostLeads: number;
  wonLeads: number;
}

// Broker Performance Report Types
export interface BrokerPerformanceData {
  ranking: {
    name: string;
    leadsWorked: number;
    visits: number;
    proposals: number;
    contractsClosed: number;
    totalValue: number;
    averageTicket: number;
    conversionRate: number;
  }[];
}

// Properties Report Types
export interface PropertiesReportData {
  mostVisited: {
    property: any;
    visits: number;
  }[];
  stagnant: any[];
  timeToSellByType: {
    type: string;
    avgDays: number;
  }[];
  inventoryByStatus: {
    status: string;
    count: number;
  }[];
  ownerReports: {
    owner: any;
    activeProperties: number;
    activeContracts: number;
    vacancyRate: number;
  }[];
}

// Financial Report Types
export interface FinancialReportData {
  dre: {
    salesRevenue: number;
    rentalRevenue: number;
    otherIncome: number;
    totalRevenue: number;
    operationalExpenses: number;
    netProfit: number;
    profitMargin: number;
  };
  marginByChannel: {
    channel: string;
    margin: number;
  }[];
  marginByBroker: {
    broker: string;
    margin: number;
  }[];
}

// Period options for filters
export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mês' },
  { value: 'quarter', label: 'Este trimestre' },
  { value: 'year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
] as const;

export type PeriodOption = typeof PERIOD_OPTIONS[number]['value'];
