// Types for the Rentals module

import React from "react";
export type Owner = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  cpfCnpj: string | null;
  address: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  pixKey: string | null;
  notes: string | null;
  createdAt: string;
};

export type Renter = {
  id: string;
  tenantId: string;
  name: string;
  email: string | null;
  phone: string;
  cpfCnpj: string | null;
  rg: string | null;
  profession: string | null;
  income: string | null;
  address: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  createdAt: string;
};

export type RentalContract = {
  id: string;
  tenantId: string;
  propertyId: string;
  ownerId: string;
  renterId: string;
  rentValue: string;
  condoFee: string | null;
  iptuValue: string | null;
  dueDay: number;
  startDate: string;
  endDate: string;
  adjustmentIndex: string | null;
  depositValue: string | null;
  administrationFee: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type RentalPayment = {
  id: string;
  tenantId: string;
  rentalContractId: string;
  referenceMonth: string;
  dueDate: string;
  rentValue: string;
  condoFee: string | null;
  iptuValue: string | null;
  extraCharges: string | null;
  discounts: string | null;
  totalValue: string;
  paidValue: string | null;
  paidDate: string | null;
  status: string;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
};

export type RentalTransfer = {
  id: string;
  tenantId: string;
  ownerId: string;
  referenceMonth: string;
  grossAmount: string;
  administrationFee: string | null;
  maintenanceDeductions: string | null;
  otherDeductions: string | null;
  netAmount: string;
  status: string;
  paidDate: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string;
};

export type Property = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  zipCode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  features: string[] | null;
  images: string[] | null;
  status: string;
  featured: boolean;
  createdAt?: string;
};

// Metrics types
export type RentalMetrics = {
  activeContracts: number;
  vacantProperties: number;
  delinquencyValue: number;
  delinquencyPercentage: number;
  pendingTransfers: number;
  contractsExpiringThisMonth: number;
  contractsAdjustingThisMonth: number;
  monthlyRecurringRevenue: number;
};

export type ChartDataPoint = {
  month: string;
  revenue: number;
  delinquency: number;
};

export type RentalAlerts = {
  paymentsDueToday: RentalPayment[];
  paymentsDueTomorrow: RentalPayment[];
  overduePayments: { payment: RentalPayment; daysOverdue: number }[];
  contractsExpiring: RentalContract[];
  contractsAdjusting: RentalContract[];
  vacantProperties: Property[];
};

// Form types
export type OwnerForm = {
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  address: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  pixKey: string;
  notes: string;
};

export type RenterForm = {
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  rg: string;
  profession: string;
  income: string;
  address: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes: string;
};

export type ContractForm = {
  propertyId: string;
  ownerId: string;
  renterId: string;
  rentValue: string;
  condoFee: string;
  iptuValue: string;
  dueDay: string;
  startDate: string;
  endDate: string;
  adjustmentIndex: string;
  depositValue: string;
  administrationFee: string;
  notes: string;
};

export type PaymentForm = {
  rentalContractId: string;
  referenceMonth: string;
  dueDate: string;
  rentValue: string;
  condoFee: string;
  iptuValue: string;
  extraCharges: string;
  discounts: string;
  totalValue: string;
  notes: string;
};

export type TransferForm = {
  ownerId: string;
  referenceMonth: string;
  grossAmount: string;
  administrationFee: string;
  maintenanceDeductions: string;
  otherDeductions: string;
  netAmount: string;
  notes: string;
};

// Filter types
export type ContractFilters = {
  ownerId: string;
  renterId: string;
  propertyId: string;
  status: string;
  searchText: string;
};

export type PaymentFilters = {
  status: string;
  contractId: string;
  periodPreset: string;
  startDate: string;
  endDate: string;
  onlyOverdue: boolean;
};

export type TransferFilters = {
  ownerId: string;
  status: string;
  referenceMonth: string;
};

export type ReportFilters = {
  ownerId: string;
  renterId: string;
  status: string;
  startDate: string;
  endDate: string;
  propertyId: string;
  minValue: string;
  maxValue: string;
  onlyOverdue: boolean;
  periodPreset: string;
};

// Enriched types for display
export type EnrichedContract = RentalContract & {
  property?: Property;
  owner?: Owner;
  renter?: Renter;
};

export type EnrichedPayment = RentalPayment & {
  contract?: RentalContract;
  property?: Property;
  owner?: Owner;
  renter?: Renter;
  daysOverdue?: number;
  daysLate?: number;
};

export type EnrichedTransfer = RentalTransfer & {
  owner?: Owner;
};

// Owner/Renter with computed fields
export type OwnerWithStats = Owner & {
  propertyCount: number;
  pendingTransfer: number;
  activeContracts: number;
};

export type RenterWithStats = Renter & {
  contracts: RentalContract[];
  isDelinquent: boolean;
  totalMonthlyValue: number;
  avgDaysLate: number;
};

// AI Templates
export type AIPrompt = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  template: (data: any) => string;
};

// Helper functions
export function formatPrice(price: string | number | null): string {
  if (!price) return "-";
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return String(price);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export function formatDate(date: string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatMonth(month: string): string {
  const [year, m] = month.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m) - 1]}/${year}`;
}

export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    inactive: 'bg-gray-100 text-gray-700 border-gray-200',
    ended: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
    overdue: 'bg-red-100 text-red-700 border-red-200',
    partial: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    ended: 'Encerrado',
    cancelled: 'Cancelado',
    pending: 'Pendente',
    paid: 'Pago',
    overdue: 'Atrasado',
    partial: 'Parcial',
  };
  return labels[status] || status;
}
