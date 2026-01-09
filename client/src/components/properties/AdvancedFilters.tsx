import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { X, Save, Bookmark, ChevronDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

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

export type SavedFilter = {
  id: string;
  name: string;
  filters: PropertyFilters;
  createdAt: string;
};

type AdvancedFiltersProps = {
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  cities: string[];
  stats?: {
    totalProperties: number;
    filteredProperties: number;
  };
};

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Casa" },
  { value: "commercial", label: "Comercial" },
  { value: "land", label: "Terreno" },
  { value: "condo", label: "Condomínio" },
];

const PROPERTY_CATEGORIES = [
  { value: "sale", label: "Venda" },
  { value: "rent", label: "Aluguel" },
];

const PROPERTY_STATUS = [
  { value: "available", label: "Disponível" },
  { value: "reserved", label: "Reservado" },
  { value: "sold", label: "Vendido" },
  { value: "rented", label: "Alugado" },
  { value: "pending", label: "Pendente" },
];

const BEDROOMS_OPTIONS = [1, 2, 3, 4, 5];
const BATHROOMS_OPTIONS = [1, 2, 3, 4];

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

const STORAGE_KEY = "property-saved-filters";

export function AdvancedFilters({ filters, onFiltersChange, cities, stats }: AdvancedFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  };

  const saveCurrentFilters = () => {
    if (!newFilterName.trim()) return;

    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNewFilterName("");
    setSaveDialogOpen(false);
  };

  const applySavedFilter = (savedFilter: SavedFilter) => {
    onFiltersChange(savedFilter.filters);
  };

  const deleteSavedFilter = (filterId: string) => {
    const updated = savedFilters.filter((f) => f.id !== filterId);
    setSavedFilters(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAllFilters = () => {
    onFiltersChange(DEFAULT_FILTERS);
  };

  const hasActiveFilters = () => {
    return (
      filters.search !== "" ||
      filters.category.length > 0 ||
      filters.type.length > 0 ||
      filters.status.length > 0 ||
      filters.city.length > 0 ||
      filters.bedrooms.length > 0 ||
      filters.bathrooms.length > 0 ||
      filters.minPrice > 0 ||
      filters.maxPrice < 10000000 ||
      filters.minArea > 0 ||
      filters.maxArea < 1000 ||
      filters.featured !== null
    );
  };

  const activeFilterCount = () => {
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
  };

  const formatPrice = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
    return `R$ ${value}`;
  };

  const toggleArrayValue = <T,>(array: T[], value: T): T[] => {
    return array.includes(value) ? array.filter((v) => v !== value) : [...array, value];
  };

  return (
    <div className="space-y-4">
      {/* Header with stats and saved filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {stats && (
            <Badge variant="secondary" className="text-xs">
              {stats.filteredProperties} de {stats.totalProperties} imóveis
            </Badge>
          )}
          {hasActiveFilters() && (
            <Badge variant="outline" className="text-xs">
              {activeFilterCount()} filtros ativos
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Filters Dropdown */}
          {savedFilters.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Bookmark className="h-4 w-4" />
                  Filtros Salvos
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="space-y-1">
                  {savedFilters.map((savedFilter) => (
                    <div
                      key={savedFilter.id}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
                    >
                      <button
                        onClick={() => applySavedFilter(savedFilter)}
                        className="flex-1 text-left text-sm"
                      >
                        {savedFilter.name}
                      </button>
                      <button
                        onClick={() => deleteSavedFilter(savedFilter.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded"
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Save Current Filters */}
          {hasActiveFilters() && (
            <Popover open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Filtros
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Salvar filtros atuais</h4>
                    <p className="text-sm text-muted-foreground">
                      Dê um nome para este conjunto de filtros
                    </p>
                  </div>
                  <Input
                    placeholder="Nome do filtro..."
                    value={newFilterName}
                    onChange={(e) => setNewFilterName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveCurrentFilters();
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSaveDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button size="sm" className="flex-1" onClick={saveCurrentFilters}>
                      Salvar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Clear All */}
          {hasActiveFilters() && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros Avançados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Buscar</Label>
            <Input
              placeholder="Título, endereço, cidade..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>

          <Separator />

          {/* Category & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Categoria</Label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_CATEGORIES.map((cat) => (
                  <Badge
                    key={cat.value}
                    variant={filters.category.includes(cat.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        category: toggleArrayValue(filters.category, cat.value),
                      })
                    }
                  >
                    {cat.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <div className="flex flex-wrap gap-2">
                {PROPERTY_STATUS.map((status) => (
                  <Badge
                    key={status.value}
                    variant={filters.status.includes(status.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        status: toggleArrayValue(filters.status, status.value),
                      })
                    }
                  >
                    {status.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Property Type (Multiple) */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Tipo de Imóvel</Label>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((type) => (
                <Badge
                  key={type.value}
                  variant={filters.type.includes(type.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      type: toggleArrayValue(filters.type, type.value),
                    })
                  }
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Location (Multiple Cities) */}
          {cities.length > 0 && (
            <>
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localização
                </Label>
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => (
                    <Badge
                      key={city}
                      variant={filters.city.includes(city) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          city: toggleArrayValue(filters.city, city),
                        })
                      }
                    >
                      {city}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Price Range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Faixa de Preço</Label>
              <span className="text-sm text-muted-foreground">
                {formatPrice(filters.minPrice)} - {formatPrice(filters.maxPrice)}
              </span>
            </div>
            <Slider
              min={0}
              max={10000000}
              step={50000}
              value={[filters.minPrice, filters.maxPrice]}
              onValueChange={([min, max]) =>
                onFiltersChange({ ...filters, minPrice: min, maxPrice: max })
              }
              className="mt-2"
            />
            <div className="flex gap-4 mt-3">
              <Input
                type="number"
                placeholder="Mínimo"
                value={filters.minPrice || ""}
                onChange={(e) =>
                  onFiltersChange({ ...filters, minPrice: Number(e.target.value) })
                }
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Máximo"
                value={filters.maxPrice || ""}
                onChange={(e) =>
                  onFiltersChange({ ...filters, maxPrice: Number(e.target.value) })
                }
                className="text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Quartos</Label>
              <div className="flex flex-wrap gap-2">
                {BEDROOMS_OPTIONS.map((num) => (
                  <Badge
                    key={num}
                    variant={filters.bedrooms.includes(num) ? "default" : "outline"}
                    className="cursor-pointer w-10 justify-center"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        bedrooms: toggleArrayValue(filters.bedrooms, num),
                      })
                    }
                  >
                    {num}+
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Banheiros</Label>
              <div className="flex flex-wrap gap-2">
                {BATHROOMS_OPTIONS.map((num) => (
                  <Badge
                    key={num}
                    variant={filters.bathrooms.includes(num) ? "default" : "outline"}
                    className="cursor-pointer w-10 justify-center"
                    onClick={() =>
                      onFiltersChange({
                        ...filters,
                        bathrooms: toggleArrayValue(filters.bathrooms, num),
                      })
                    }
                  >
                    {num}+
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Area Range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Área (m²)</Label>
              <span className="text-sm text-muted-foreground">
                {filters.minArea}m² - {filters.maxArea}m²
              </span>
            </div>
            <Slider
              min={0}
              max={1000}
              step={10}
              value={[filters.minArea, filters.maxArea]}
              onValueChange={([min, max]) =>
                onFiltersChange({ ...filters, minArea: min, maxArea: max })
              }
              className="mt-2"
            />
            <div className="flex gap-4 mt-3">
              <Input
                type="number"
                placeholder="Mínimo"
                value={filters.minArea || ""}
                onChange={(e) =>
                  onFiltersChange({ ...filters, minArea: Number(e.target.value) })
                }
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Máximo"
                value={filters.maxArea || ""}
                onChange={(e) =>
                  onFiltersChange({ ...filters, maxArea: Number(e.target.value) })
                }
                className="text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Featured Only */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="featured"
              checked={filters.featured === true}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, featured: checked ? true : null })
              }
            />
            <label
              htmlFor="featured"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Apenas imóveis em destaque
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
