/**
 * Storage Types
 *
 * Type definitions for storage layer operations
 */

// Report data types
export type RentalReportData = {
  totalReceived: number;
  totalPending: number;
  totalOverdue: number;
  overdueCount: number;
  payments: Array<{
    id: string;
    dueDate: string;
    totalValue: string;
    paidValue?: string;
    status: string;
  }>;
};

export type OwnerReportData = {
  totalProperties: number;
  activeContracts: number;
  totalRevenue: number;
  properties: Array<{
    id: string;
    address: string;
    contractCount: number;
    revenue: number;
  }>;
};

export type RenterReportData = {
  totalContracts: number;
  totalPaid: number;
  totalPending: number;
  contracts: Array<{
    id: string;
    propertyAddress: string;
    monthlyRent: string;
    status: string;
  }>;
};

export type PaymentDetailedReportData = {
  payments: Array<{
    id: string;
    propertyAddress: string;
    renterName: string;
    ownerName: string;
    dueDate: string;
    paidDate?: string;
    totalValue: string;
    paidValue?: string;
    status: string;
  }>;
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
};

export type OverdueReportData = {
  totalOverdue: number;
  overdueCount: number;
  payments: Array<{
    id: string;
    renterName: string;
    propertyAddress: string;
    totalValue: string;
    dueDate: string;
    daysOverdue: number;
  }>;
};

export type SalesReportData = {
  totalSales: number;
  totalValue: number;
  totalCommissions: number;
  averageSaleValue: number;
  salesByStatus: Record<string, number>;
  salesByBroker: Record<string, number>;
  salesList: Array<{
    sale: {
      id: string;
      propertyId: string;
      saleValue: string;
      commissionValue: string;
      saleDate: string;
      status: string;
    };
    property: {
      address: string;
      title: string;
    };
    buyer: {
      name: string;
      email?: string;
    };
  }>;
};

export type LeadsFunnelReportData = {
  totalLeads: number;
  conversionRate: number;
  byStage: Record<string, number>;
  bySource: Record<string, number>;
};

export type BrokerPerformanceReportData = {
  brokers: Array<{
    id: string;
    name: string;
    totalLeads: number;
    convertedLeads: number;
    conversionRate: number;
    totalSales: number;
    totalCommissions: number;
  }>;
};

export type PropertiesReportData = {
  totalProperties: number;
  availableProperties: number;
  soldProperties: number;
  rentedProperties: number;
  averagePrice: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
};

export type FinancialSummaryReportData = {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  rentalsRevenue: number;
  salesRevenue: number;
  commissionsRevenue: number;
  byMonth: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
};

// Brand settings types
export type BrandSettings = {
  id: string;
  tenantId: string;
  primaryColor: string;
  secondaryColor: string;
  logo?: string;
  favicon?: string;
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
  createdAt: string;
  updatedAt: string;
};

// Owner statement
export type OwnerStatement = {
  owner: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  period: {
    start: string;
    end: string;
  };
  properties: Array<{
    id: string;
    address: string;
    monthlyRent: string;
    payments: Array<{
      id: string;
      dueDate: string;
      paidDate?: string;
      amount: string;
      status: string;
    }>;
  }>;
  summary: {
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
  };
};

// Renter payment history
export type RenterPaymentHistory = {
  renter: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  contracts: Array<{
    id: string;
    propertyAddress: string;
    monthlyRent: string;
    startDate: string;
    endDate?: string;
  }>;
  payments: Array<{
    id: string;
    dueDate: string;
    paidDate?: string;
    amount: string;
    status: string;
  }>;
  summary: {
    totalPaid: number;
    totalPending: number;
    onTimePayments: number;
    latePayments: number;
  };
};

// Financial entries
export type FinancialEntryData = Array<{
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: string;
  description?: string;
  date: string;
  status: string;
}>;

// Commission data
export type CommissionData = {
  id: string;
  userId: string;
  saleId: string;
  amount: string;
  percentage: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string;
  updatedAt: string;
};

// Tenant with stats
export type TenantWithStats = {
  id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  status: string;
  createdAt: string;
  stats: {
    totalUsers: number;
    totalProperties: number;
    totalLeads: number;
    totalContracts: number;
  };
};

// Subscription data
export type SubscriptionData = {
  id: string;
  tenantId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate?: string;
  billingCycle: 'monthly' | 'yearly';
  amount: string;
};

// Plan data
export type PlanData = {
  id: string;
  name: string;
  description?: string;
  price: string;
  features: string[];
  maxUsers: number;
  maxProperties: number;
  status: 'active' | 'inactive';
  createdAt: string;
};

// Audit log data
export type AuditLogData = {
  logs: Array<{
    id: string;
    tenantId: string;
    userId: string;
    action: string;
    entity: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
  }>;
  total: number;
};

// File data
export type FileData = {
  id: string;
  tenantId: string;
  userId: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  status: string;
  createdAt: string;
};
