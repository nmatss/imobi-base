import { useState } from "react";
import { Link } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Bath, Ruler, MapPin, Search, Filter, Plus } from "lucide-react";

function formatPrice(price: string) {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

export default function PropertiesList() {
  const { properties, tenant } = useImobi();
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(filter.toLowerCase()) || 
                          p.address.toLowerCase().includes(filter.toLowerCase());
    const matchesType = typeFilter === "all" || p.category === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-properties-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Imóveis</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie seu portfólio de imóveis</p>
        </div>
        <Button data-testid="button-new-property" className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Novo Imóvel
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-card p-3 sm:p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            data-testid="input-search-properties"
            placeholder="Buscar por título ou endereço..." 
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger data-testid="select-type-filter" className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2 opacity-50" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="sale">Venda</SelectItem>
            <SelectItem value="rent">Aluguel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredProperties.length === 0 ? (
        <div data-testid="empty-state-properties" className="text-center py-16 sm:py-20 bg-muted/20 rounded-xl border border-dashed">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
          <h3 className="text-lg font-medium">Nenhum imóvel encontrado</h3>
          <p className="text-muted-foreground mb-4 text-sm px-4">Tente ajustar os filtros ou cadastre um novo imóvel.</p>
          <Button variant="outline">Cadastrar Imóvel</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProperties.map((property) => (
            <Card key={property.id} data-testid={`card-property-${property.id}`} className="group overflow-hidden hover:shadow-lg transition-all duration-300 border-transparent hover:border-primary/20">
              <div className="aspect-[4/3] overflow-hidden relative">
                <img 
                  src={property.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"} 
                  alt={property.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 right-3 flex gap-2 flex-wrap justify-end">
                  <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black shadow-sm font-semibold text-xs">
                    {property.category === 'sale' ? 'Venda' : 'Aluguel'}
                  </Badge>
                  <Badge 
                    className={`text-xs ${
                      property.status === 'available' ? 'bg-green-500 hover:bg-green-600' :
                      property.status === 'sold' ? 'bg-red-500 hover:bg-red-600' :
                      'bg-gray-500 hover:bg-gray-600'
                    } text-white border-none shadow-sm`}
                  >
                    {property.status === 'available' ? 'Disponível' :
                     property.status === 'sold' ? 'Vendido' : 
                     property.status === 'rented' ? 'Alugado' : 'Pendente'}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <Link href={`/properties/${property.id}`} className="w-full">
                    <Button variant="secondary" size="sm" className="w-full font-medium">Ver Detalhes</Button>
                  </Link>
                </div>
              </div>
              
              <CardHeader className="p-3 sm:p-4 pb-2">
                <CardTitle className="text-base sm:text-lg font-heading line-clamp-1 group-hover:text-primary transition-colors">
                  {property.title}
                </CardTitle>
                <div className="flex items-center text-muted-foreground text-xs sm:text-sm mt-1">
                  <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                  <span className="truncate">{property.address}, {property.city}</span>
                </div>
              </CardHeader>
              
              <CardContent className="p-3 sm:p-4 pt-2">
                <div className="text-lg sm:text-xl font-bold text-foreground">
                  {formatPrice(property.price)}
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t text-xs sm:text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-1">
                    <BedDouble className="h-4 w-4 text-primary/70" />
                    <span>{property.bedrooms || 0} <span className="text-[10px] hidden sm:inline">quartos</span></span>
                  </div>
                  <div className="flex flex-col items-center gap-1 border-l border-r">
                    <Bath className="h-4 w-4 text-primary/70" />
                    <span>{property.bathrooms || 0} <span className="text-[10px] hidden sm:inline">banhos</span></span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Ruler className="h-4 w-4 text-primary/70" />
                    <span>{property.area || 0}<span className="text-[10px]">m²</span></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
