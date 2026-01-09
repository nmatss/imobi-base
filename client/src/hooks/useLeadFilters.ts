import { useState, useMemo, useCallback } from "react";
import { differenceInDays } from "date-fns";
import type { Lead } from "@/lib/imobi-context";

export type LeadFilters = {
  search: string;
  source: string[];
  status: string[];
  budgetMin: number;
  budgetMax: number;
  createdAfter: Date | null;
  createdBefore: Date | null;
  assignedTo: string | null;
  hasFollowUp: boolean | null;
  daysWithoutContact: number | null;
};

const DEFAULT_FILTERS: LeadFilters = {
  search: "",
  source: [],
  status: [],
  budgetMin: 0,
  budgetMax: 10000000,
  createdAfter: null,
  createdBefore: null,
  assignedTo: null,
  hasFollowUp: null,
  daysWithoutContact: null,
};

export function useLeadFilters(leads: Lead[]) {
  const [filters, setFilters] = useState<LeadFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback((key: keyof LeadFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((newFilters: LeadFilters) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          lead.name.toLowerCase().includes(searchLower) ||
          lead.email.toLowerCase().includes(searchLower) ||
          lead.phone.includes(filters.search);
        if (!matchesSearch) return false;
      }

      // Source filter (multiple)
      if (filters.source.length > 0 && !filters.source.includes(lead.source)) {
        return false;
      }

      // Status filter (multiple)
      if (filters.status.length > 0 && !filters.status.includes(lead.status)) {
        return false;
      }

      // Budget filters
      const budget = parseFloat(lead.budget || "0");
      if (budget < filters.budgetMin || budget > filters.budgetMax) {
        return false;
      }

      // Date filters
      if (filters.createdAfter) {
        const createdDate = new Date(lead.createdAt);
        if (createdDate < filters.createdAfter) return false;
      }

      if (filters.createdBefore) {
        const createdDate = new Date(lead.createdAt);
        if (createdDate > filters.createdBefore) return false;
      }

      // Assigned to filter
      if (filters.assignedTo && lead.assignedTo !== filters.assignedTo) {
        return false;
      }

      // Days without contact filter
      if (filters.daysWithoutContact !== null) {
        const lastUpdate = new Date(lead.updatedAt);
        const daysSinceUpdate = differenceInDays(new Date(), lastUpdate);
        if (daysSinceUpdate < filters.daysWithoutContact) return false;
      }

      return true;
    });
  }, [leads, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.source.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.budgetMin > 0 || filters.budgetMax < 10000000) count++;
    if (filters.createdAfter || filters.createdBefore) count++;
    if (filters.assignedTo) count++;
    if (filters.hasFollowUp !== null) count++;
    if (filters.daysWithoutContact !== null) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredLeads,
    activeFilterCount,
    updateFilter,
    updateFilters,
    clearFilters,
  };
}
