import { useState, useMemo, useCallback } from "react";
import type { Property } from "@/lib/imobi-context";

export type PropertyFilters = {
  search: string;
  category: string[];
  type: string[];
  status: string[];
  city: string[];
  minPrice: number;
  maxPrice: number;
  bedrooms: number[];
  bathrooms: number[];
  minArea: number;
  maxArea: number;
  featured: boolean | null;
};

const DEFAULT_FILTERS: PropertyFilters = {
  search: "",
  category: [],
  type: [],
  status: [],
  city: [],
  minPrice: 0,
  maxPrice: 10000000,
  bedrooms: [],
  bathrooms: [],
  minArea: 0,
  maxArea: 1000,
  featured: null,
};

export function usePropertyFilters(properties: Property[]) {
  const [filters, setFilters] = useState<PropertyFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback((key: keyof PropertyFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((newFilters: PropertyFilters) => {
    setFilters(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          property.title.toLowerCase().includes(searchLower) ||
          property.address.toLowerCase().includes(searchLower) ||
          property.city.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Category filter (multiple)
      if (filters.category.length > 0 && !filters.category.includes(property.category)) {
        return false;
      }

      // Type filter (multiple)
      if (filters.type.length > 0 && !filters.type.includes(property.type)) {
        return false;
      }

      // Status filter (multiple)
      if (filters.status.length > 0 && !filters.status.includes(property.status)) {
        return false;
      }

      // City filter (multiple)
      if (filters.city.length > 0 && !filters.city.includes(property.city)) {
        return false;
      }

      // Price filters
      const price = parseFloat(property.price);
      if (price < filters.minPrice || price > filters.maxPrice) {
        return false;
      }

      // Bedrooms filter (multiple - match any)
      if (filters.bedrooms.length > 0) {
        const propertyBedrooms = property.bedrooms || 0;
        const matchesBedrooms = filters.bedrooms.some(
          (beds) => propertyBedrooms >= beds
        );
        if (!matchesBedrooms) return false;
      }

      // Bathrooms filter (multiple - match any)
      if (filters.bathrooms.length > 0) {
        const propertyBathrooms = property.bathrooms || 0;
        const matchesBathrooms = filters.bathrooms.some(
          (baths) => propertyBathrooms >= baths
        );
        if (!matchesBathrooms) return false;
      }

      // Area filters
      const area = property.area || 0;
      if (area < filters.minArea || area > filters.maxArea) {
        return false;
      }

      // Featured filter
      if (filters.featured !== null && property.featured !== filters.featured) {
        return false;
      }

      return true;
    });
  }, [properties, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.category.length > 0) count++;
    if (filters.type.length > 0) count++;
    if (filters.status.length > 0) count++;
    if (filters.city.length > 0) count++;
    if (filters.bedrooms.length > 0) count++;
    if (filters.bathrooms.length > 0) count++;
    if (filters.minPrice > 0 || filters.maxPrice < 10000000) count++;
    if (filters.minArea > 0 || filters.maxArea < 1000) count++;
    if (filters.featured !== null) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredProperties,
    activeFilterCount,
    updateFilter,
    updateFilters,
    clearFilters,
  };
}
