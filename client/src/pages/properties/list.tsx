import { useState } from "react";
import { useImobi, Property } from "@/lib/imobi-context";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Bath, Ruler, MapPin, Search, Filter, Plus } from "lucide-react";

export default function PropertiesList() {
  const { properties, tenant } = useImobi();
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(filter.toLowerCase()) || 
                          p.address.toLowerCase().includes(filter.toLowerCase());
    const matchesType = typeFilter === "all" || p.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Imóveis</h1>
          <p className="text-muted-foreground">Gerencie seu portfólio de imóveis</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Novo Imóvel
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por título ou endereço..." 
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProperties.map((property) => (
          <Card key={property.id} className="group overflow-hidden hover-elevate-2 transition-all duration-300 border-transparent hover:border-primary/20">
            <div className="aspect-[4/3] overflow-hidden relative">
              <img 
                src={property.image} 
                alt={property.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute top-3 right-3 flex gap-2">
                 <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-black shadow-sm font-semibold">
                  {property.type === 'sale' ? 'Venda' : 'Aluguel'}
                </Badge>
                <Badge 
                  className={`${
                    property.status === 'active' ? 'bg-green-500 hover:bg-green-600' :
                    property.status === 'sold' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-gray-500 hover:bg-gray-600'
                  } text-white border-none shadow-sm`}
                >
                  {property.status === 'active' ? 'Ativo' :
                   property.status === 'sold' ? 'Vendido' : 
                   property.status === 'rented' ? 'Alugado' : 'Pendente'}
                </Badge>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                <Button variant="secondary" size="sm" className="w-full font-medium">Ver Detalhes</Button>
              </div>
            </div>
            
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-lg font-heading line-clamp-1 group-hover:text-primary transition-colors">
                {property.title}
              </CardTitle>
              <div className="flex items-center text-muted-foreground text-sm mt-1">
                <MapPin className="h-3.5 w-3.5 mr-1 shrink-0" />
                <span className="truncate">{property.address}</span>
              </div>
            </CardHeader>
            
            <CardContent className="p-4 pt-2">
              <div className="text-xl font-bold text-foreground">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t text-sm text-muted-foreground">
                <div className="flex flex-col items-center gap-1">
                  <BedDouble className="h-4 w-4 text-primary/70" />
                  <span>{property.beds} <span className="text-[10px]">quartos</span></span>
                </div>
                <div className="flex flex-col items-center gap-1 border-l border-r">
                  <Bath className="h-4 w-4 text-primary/70" />
                  <span>{property.baths} <span className="text-[10px]">banhos</span></span>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Ruler className="h-4 w-4 text-primary/70" />
                  <span>{property.sqm} <span className="text-[10px]">m²</span></span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
