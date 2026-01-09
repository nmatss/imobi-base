import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { X, Save, Bookmark, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { LeadStatus } from "@/lib/imobi-context";

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

export type SavedLeadFilter = {
  id: string;
  name: string;
  filters: LeadFilters;
  createdAt: string;
};

type AdvancedLeadFiltersProps = {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  sources: string[];
  users?: Array<{ id: string; name: string }>;
  stats?: {
    totalLeads: number;
    filteredLeads: number;
  };
};

const LEAD_STATUS: Array<{ value: LeadStatus; label: string; color: string }> = [
  { value: "new", label: "Novo", color: "bg-blue-500" },
  { value: "qualification", label: "Em Contato", color: "bg-purple-500" },
  { value: "visit", label: "Visita", color: "bg-orange-500" },
  { value: "proposal", label: "Proposta", color: "bg-cyan-500" },
  { value: "contract", label: "Fechado", color: "bg-green-500" },
];

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

const STORAGE_KEY = "lead-saved-filters";

export function AdvancedLeadFilters({
  filters,
  onFiltersChange,
  sources,
  users,
  stats,
}: AdvancedLeadFiltersProps) {
  const [savedFilters, setSavedFilters] = useState<SavedLeadFilter[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState<"after" | "before" | null>(null);

  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const withDates = parsed.map((f: SavedLeadFilter) => ({
          ...f,
          filters: {
            ...f.filters,
            createdAfter: f.filters.createdAfter ? new Date(f.filters.createdAfter) : null,
            createdBefore: f.filters.createdBefore ? new Date(f.filters.createdBefore) : null,
          },
        }));
        setSavedFilters(withDates);
      }
    } catch (error) {
      console.error("Error loading saved filters:", error);
    }
  };

  const saveCurrentFilters = () => {
    if (!newFilterName.trim()) return;

    const newFilter: SavedLeadFilter = {
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

  const applySavedFilter = (savedFilter: SavedLeadFilter) => {
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
      filters.source.length > 0 ||
      filters.status.length > 0 ||
      filters.budgetMin > 0 ||
      filters.budgetMax < 10000000 ||
      filters.createdAfter !== null ||
      filters.createdBefore !== null ||
      filters.assignedTo !== null ||
      filters.hasFollowUp !== null ||
      filters.daysWithoutContact !== null
    );
  };

  const activeFilterCount = () => {
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
              {stats.filteredLeads} de {stats.totalLeads} leads
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
              placeholder="Nome, email, telefone..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            />
          </div>

          <Separator />

          {/* Status (Kanban Stages) */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Status no Funil</Label>
            <div className="flex flex-wrap gap-2">
              {LEAD_STATUS.map((status) => (
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

          <Separator />

          {/* Source */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Origem</Label>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <Badge
                  key={source}
                  variant={filters.source.includes(source) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() =>
                    onFiltersChange({
                      ...filters,
                      source: toggleArrayValue(filters.source, source),
                    })
                  }
                >
                  {source}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Budget Range */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Orçamento</Label>
              <span className="text-sm text-muted-foreground">
                {formatPrice(filters.budgetMin)} - {formatPrice(filters.budgetMax)}
              </span>
            </div>
            <Slider
              min={0}
              max={10000000}
              step={50000}
              value={[filters.budgetMin, filters.budgetMax]}
              onValueChange={([min, max]) =>
                onFiltersChange({ ...filters, budgetMin: min, budgetMax: max })
              }
              className="mt-2"
            />
            <div className="flex gap-4 mt-3">
              <Input
                type="number"
                placeholder="Mínimo"
                value={filters.budgetMin || ""}
                onChange={(e) =>
                  onFiltersChange({ ...filters, budgetMin: Number(e.target.value) })
                }
                className="text-sm"
              />
              <Input
                type="number"
                placeholder="Máximo"
                value={filters.budgetMax || ""}
                onChange={(e) =>
                  onFiltersChange({ ...filters, budgetMax: Number(e.target.value) })
                }
                className="text-sm"
              />
            </div>
          </div>

          <Separator />

          {/* Date Range */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Data de Criação</Label>
            <div className="grid grid-cols-2 gap-2">
              <Popover open={datePickerOpen === "after"} onOpenChange={(open) => setDatePickerOpen(open ? "after" : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.createdAfter ? (
                      format(filters.createdAfter, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span className="text-muted-foreground">Após...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.createdAfter || undefined}
                    onSelect={(date) => {
                      onFiltersChange({ ...filters, createdAfter: date || null });
                      setDatePickerOpen(null);
                    }}
                    initialFocus
                  />
                  {filters.createdAfter && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onFiltersChange({ ...filters, createdAfter: null });
                          setDatePickerOpen(null);
                        }}
                      >
                        Limpar
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Popover open={datePickerOpen === "before"} onOpenChange={(open) => setDatePickerOpen(open ? "before" : null)}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.createdBefore ? (
                      format(filters.createdBefore, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span className="text-muted-foreground">Antes...</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filters.createdBefore || undefined}
                    onSelect={(date) => {
                      onFiltersChange({ ...filters, createdBefore: date || null });
                      setDatePickerOpen(null);
                    }}
                    initialFocus
                  />
                  {filters.createdBefore && (
                    <div className="p-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          onFiltersChange({ ...filters, createdBefore: null });
                          setDatePickerOpen(null);
                        }}
                      >
                        Limpar
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Days Without Contact */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Dias sem contato</Label>
              {filters.daysWithoutContact !== null && (
                <span className="text-sm text-muted-foreground">
                  {filters.daysWithoutContact}+ dias
                </span>
              )}
            </div>
            <Slider
              min={0}
              max={30}
              step={1}
              value={[filters.daysWithoutContact || 0]}
              onValueChange={([days]) =>
                onFiltersChange({ ...filters, daysWithoutContact: days > 0 ? days : null })
              }
              className="mt-2"
            />
            {filters.daysWithoutContact !== null && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 w-full"
                onClick={() => onFiltersChange({ ...filters, daysWithoutContact: null })}
              >
                Limpar filtro
              </Button>
            )}
          </div>

          {/* Assigned User Filter */}
          {users && users.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium mb-2 block">Responsável</Label>
                <div className="flex flex-wrap gap-2">
                  {users.map((user) => (
                    <Badge
                      key={user.id}
                      variant={filters.assignedTo === user.id ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          assignedTo: filters.assignedTo === user.id ? null : user.id,
                        })
                      }
                    >
                      {user.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
