import React from "react";
import { useState } from "react";
import { useImobi } from "@/lib/imobi-context";
import { useLeadFilters } from "@/hooks/useLeadFilters";
import { AdvancedLeadFilters } from "./AdvancedFilters";
import { LeadCard } from "./LeadCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * EXEMPLO DE INTEGRAÇÃO: Filtros Avançados de Leads
 *
 * Este componente demonstra como integrar o sistema de filtros avançados
 * em uma página de gerenciamento de leads.
 *
 * Características:
 * - Filtros de status (funil de vendas)
 * - Filtros de origem (source)
 * - Slider de orçamento
 * - Filtro de data de criação
 * - Filtro de dias sem contato
 * - Salvamento de filtros favoritos
 * - UI responsiva
 */
export function AdvancedLeadFiltersExample() {
  const { leads, user } = useImobi();
  const { filters, filteredLeads, activeFilterCount, updateFilters, clearFilters } =
    useLeadFilters(leads);

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Extract unique sources from leads
  const sources = Array.from(new Set(leads.map((l) => l.source))).filter(Boolean).sort();

  const stats = {
    totalLeads: leads.length,
    filteredLeads: filteredLeads.length,
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            {filteredLeads.length} de {leads.length} leads
          </p>
        </div>

        <div className="flex gap-2">
          {/* Mobile Filter Button */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader className="mb-4">
                <SheetTitle>Filtros Avançados</SheetTitle>
              </SheetHeader>
              <AdvancedLeadFilters
                filters={filters}
                onFiltersChange={updateFilters}
                sources={sources}
                stats={stats}
              />
            </SheetContent>
          </Sheet>

          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-4">
            <AdvancedLeadFilters
              filters={filters}
              onFiltersChange={updateFilters}
              sources={sources}
              stats={stats}
            />
          </div>
        </div>

        {/* Leads List */}
        <div className="lg:col-span-3">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
              <p className="text-muted-foreground mb-4">Nenhum lead encontrado</p>
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  id={lead.id}
                  name={lead.name}
                  email={lead.email}
                  phone={lead.phone}
                  source={lead.source as any}
                  status={lead.status}
                  budget={lead.budget}
                  interests={lead.interests}
                  createdAt={lead.createdAt}
                  onView={(id) => console.log("View:", id)}
                  onEdit={(id) => console.log("Edit:", id)}
                  onDelete={(id) => console.log("Delete:", id)}
                  onStatusChange={(id, status) => console.log("Status:", id, status)}
                  onCall={(id) => console.log("Call:", id)}
                  onWhatsApp={(id) => console.log("WhatsApp:", id)}
                  onEmail={(id) => console.log("Email:", id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * COMO USAR EM SUA PÁGINA DE LEADS:
 *
 * import { useImobi } from "@/lib/imobi-context";
 * import { useLeadFilters } from "@/hooks/useLeadFilters";
 * import { AdvancedLeadFilters } from "@/components/leads/AdvancedFilters";
 *
 * export default function LeadsPage() {
 *   const { leads } = useImobi();
 *   const { filters, filteredLeads, updateFilters } = useLeadFilters(leads);
 *
 *   const sources = Array.from(new Set(leads.map((l) => l.source))).filter(Boolean);
 *
 *   return (
 *     <div className="grid grid-cols-4 gap-6">
 *       <div className="col-span-1">
 *         <AdvancedLeadFilters
 *           filters={filters}
 *           onFiltersChange={updateFilters}
 *           sources={sources}
 *           stats={{
 *             totalLeads: leads.length,
 *             filteredLeads: filteredLeads.length,
 *           }}
 *         />
 *       </div>
 *
 *       <div className="col-span-3">
 *         {filteredLeads.map(lead => (
 *           <LeadCard key={lead.id} {...lead} />
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 *
 * INTEGRAÇÃO COM KANBAN EXISTENTE:
 *
 * Você pode usar os filtros junto com o Kanban existente:
 *
 * const { filters, filteredLeads, updateFilters } = useLeadFilters(leads);
 *
 * // Agrupar leads filtrados por status
 * const leadsByStatus = COLUMNS.map(column => ({
 *   ...column,
 *   leads: filteredLeads.filter(lead => lead.status === column.id)
 * }));
 *
 * // Renderizar colunas do Kanban com leads filtrados
 * {leadsByStatus.map(column => (
 *   <KanbanColumn key={column.id} {...column} />
 * ))}
 */
