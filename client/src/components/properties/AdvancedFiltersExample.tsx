import React from "react";
import { useState } from "react";
import { useImobi } from "@/lib/imobi-context";
import { usePropertyFilters } from "@/hooks/usePropertyFilters";
import { AdvancedFilters } from "./AdvancedFilters";
import { PropertyCard } from "./PropertyCard";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * EXEMPLO DE INTEGRAÇÃO: Filtros Avançados de Properties
 *
 * Este componente demonstra como integrar o sistema de filtros avançados
 * em uma página de listagem de imóveis.
 *
 * Características:
 * - Filtros múltiplos (categoria, tipo, status, cidade)
 * - Slider de preço e área
 * - Filtros de quartos/banheiros
 * - Salvamento de filtros favoritos
 * - Contador de filtros ativos
 * - UI responsiva (Sheet em mobile, Sidebar em desktop)
 */
export function AdvancedFiltersExample() {
  const { properties } = useImobi();
  const { filters, filteredProperties, activeFilterCount, updateFilters, clearFilters } =
    usePropertyFilters(properties);

  const [filtersOpen, setFiltersOpen] = useState(false);

  // Extract unique cities from properties
  const cities = Array.from(new Set(properties.map((p) => p.city))).filter(Boolean).sort();

  const stats = {
    totalProperties: properties.length,
    filteredProperties: filteredProperties.length,
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with Filter Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Imóveis</h1>
          <p className="text-muted-foreground">
            {filteredProperties.length} de {properties.length} imóveis
          </p>
        </div>

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
            <AdvancedFilters
              filters={filters}
              onFiltersChange={updateFilters}
              cities={cities}
              stats={stats}
            />
          </SheetContent>
        </Sheet>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-4">
            <AdvancedFilters
              filters={filters}
              onFiltersChange={updateFilters}
              cities={cities}
              stats={stats}
            />
          </div>
        </div>

        {/* Properties Grid */}
        <div className="lg:col-span-3">
          {filteredProperties.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
              <p className="text-muted-foreground mb-4">Nenhum imóvel encontrado</p>
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  id={property.id}
                  title={property.title}
                  city={property.city}
                  price={parseFloat(property.price)}
                  bedrooms={property.bedrooms}
                  bathrooms={property.bathrooms}
                  area={property.area}
                  status={property.status as any}
                  type={property.category as "sale" | "rent"}
                  featured={property.featured}
                  imageUrl={property.images?.[0]}
                  imageCount={property.images?.length || 0}
                  onView={(id) => console.log("View:", id)}
                  onEdit={(id) => console.log("Edit:", id)}
                  onDelete={(id) => console.log("Delete:", id)}
                  onShare={(id) => console.log("Share:", id)}
                  onToggleFeatured={(id) => console.log("Toggle Featured:", id)}
                  onCopyLink={(id) => console.log("Copy Link:", id)}
                  onScheduleVisit={(id) => console.log("Schedule Visit:", id)}
                  onImageClick={(id) => console.log("Image Click:", id)}
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
 * COMO USAR EM SUA PÁGINA:
 *
 * import { useImobi } from "@/lib/imobi-context";
 * import { usePropertyFilters } from "@/hooks/usePropertyFilters";
 * import { AdvancedFilters } from "@/components/properties/AdvancedFilters";
 *
 * export default function PropertiesPage() {
 *   const { properties } = useImobi();
 *   const { filters, filteredProperties, updateFilters } = usePropertyFilters(properties);
 *
 *   const cities = Array.from(new Set(properties.map((p) => p.city))).filter(Boolean);
 *
 *   return (
 *     <div>
 *       <AdvancedFilters
 *         filters={filters}
 *         onFiltersChange={updateFilters}
 *         cities={cities}
 *         stats={{
 *           totalProperties: properties.length,
 *           filteredProperties: filteredProperties.length,
 *         }}
 *       />
 *
 *       {filteredProperties.map(property => (
 *         <PropertyCard key={property.id} {...property} />
 *       ))}
 *     </div>
 *   );
 * }
 */
