import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Bed, Bath, Maximize, MapPin, DollarSign, Plus, X, ArrowUpDown, Check, Scale, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: string;
  title: string;
  price: string;
  type: string;
  category: string;
  city: string;
  neighborhood: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  images: string | null;
}

interface Comparison {
  id: string;
  name: string;
  propertyIds: string[];
  properties: Property[];
  createdAt: string;
}

interface PropertyComparisonProps {
  tenantId: string;
  userId: string;
}

interface ComparisonField {
  key: string;
  label: string;
  format?: (value: unknown, category?: string) => string;
  calculate?: (property: Property) => string;
}

const comparisonFields: ComparisonField[] = [
  { key: 'price', label: 'Preço', format: (v, cat) => {
    const num = parseFloat(String(v));
    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num);
    return cat === 'rent' ? `${formatted}/mês` : formatted;
  }},
  { key: 'type', label: 'Tipo', format: (v) => ({
    apartment: 'Apartamento',
    house: 'Casa',
    land: 'Terreno',
    commercial: 'Comercial',
  }[String(v)] || String(v)) },
  { key: 'bedrooms', label: 'Quartos', format: (v) => v ? `${v} quartos` : '-' },
  { key: 'bathrooms', label: 'Banheiros', format: (v) => v ? `${v} banheiros` : '-' },
  { key: 'area', label: 'Área', format: (v) => v ? `${v} m²` : '-' },
  { key: 'pricePerM2', label: 'Preço/m²', calculate: (p: Property) => {
    const price = parseFloat(p.price);
    if (!p.area || isNaN(price)) return '-';
    const perM2 = price / p.area;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(perM2);
  }},
  { key: 'city', label: 'Cidade', format: (v) => String(v) },
  { key: 'neighborhood', label: 'Bairro', format: (v) => v ? String(v) : '-' },
];

export function PropertyComparison({ tenantId, userId }: PropertyComparisonProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedComparison, setSelectedComparison] = useState<Comparison | null>(null);
  const [newComparisonName, setNewComparisonName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comparisons, isLoading: comparisonsLoading } = useQuery<Comparison[]>({
    queryKey: ['comparisons', userId],
    queryFn: async () => {
      const res = await fetch(`/api/comparisons?userId=${userId}`);
      if (!res.ok) throw new Error('Erro ao carregar comparações');
      return res.json();
    },
  });

  const { data: availableProperties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['properties-for-comparison', tenantId, searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/properties?tenantId=${tenantId}&search=${searchQuery}&limit=20`);
      if (!res.ok) throw new Error('Erro ao carregar imóveis');
      const data = await res.json();
      return data.properties || data;
    },
    enabled: showAddDialog,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; propertyIds: string[] }) => {
      const res = await fetch('/api/comparisons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId }),
      });
      if (!res.ok) throw new Error('Erro ao criar comparação');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Comparação criada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['comparisons', userId] });
      setShowAddDialog(false);
      setNewComparisonName('');
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const addPropertyMutation = useMutation({
    mutationFn: async ({ comparisonId, propertyId }: { comparisonId: string; propertyId: string }) => {
      const res = await fetch(`/api/comparisons/${comparisonId}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) throw new Error('Erro ao adicionar imóvel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons', userId] });
    },
  });

  const removePropertyMutation = useMutation({
    mutationFn: async ({ comparisonId, propertyId }: { comparisonId: string; propertyId: string }) => {
      const res = await fetch(`/api/comparisons/${comparisonId}/properties/${propertyId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao remover imóvel');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons', userId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (comparisonId: string) => {
      const res = await fetch(`/api/comparisons/${comparisonId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir comparação');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Comparação excluída.' });
      queryClient.invalidateQueries({ queryKey: ['comparisons', userId] });
      setSelectedComparison(null);
    },
  });

  const getFirstImage = (images: string | null) => {
    if (!images) return null;
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return null;
    }
  };

  const getBestValue = (properties: Property[], field: string) => {
    if (field === 'price' || field === 'pricePerM2') {
      let minValue = Infinity;
      let minId = '';
      properties.forEach(p => {
        const price = parseFloat(p.price);
        const value = field === 'pricePerM2' && p.area ? price / p.area : price;
        if (value < minValue) {
          minValue = value;
          minId = p.id;
        }
      });
      return minId;
    }
    if (field === 'area' || field === 'bedrooms' || field === 'bathrooms') {
      let maxValue = -Infinity;
      let maxId = '';
      properties.forEach(p => {
        const value = p[field as keyof Property] as number;
        if (value && value > maxValue) {
          maxValue = value;
          maxId = p.id;
        }
      });
      return maxId;
    }
    return '';
  };

  if (comparisonsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="h-6 w-6" />
            Comparador de Imóveis
          </h2>
          <p className="text-muted-foreground">Compare imóveis lado a lado</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Comparação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Comparação</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da comparação</label>
                <Input
                  placeholder="Ex: Apartamentos Centro"
                  value={newComparisonName}
                  onChange={(e) => setNewComparisonName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar imóveis</label>
                <Input
                  placeholder="Buscar por título, cidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {propertiesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {availableProperties?.map((property) => {
                    const image = getFirstImage(property.images);
                    return (
                      <div
                        key={property.id}
                        className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          createMutation.mutate({
                            name: newComparisonName || 'Comparação',
                            propertyIds: [property.id],
                          });
                        }}
                      >
                        {image ? (
                          <img src={image} alt="" className="w-16 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{property.title}</p>
                          <p className="text-sm text-muted-foreground">{property.city}</p>
                        </div>
                        <Plus className="h-5 w-5 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* List of Comparisons */}
      {(!comparisons || comparisons.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Scale className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
            <h3 className="font-semibold mb-1">Nenhuma comparação criada</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie uma comparação para analisar imóveis lado a lado
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {comparisons.map((comparison) => (
            <Card
              key={comparison.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelectedComparison(comparison)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{comparison.name}</CardTitle>
                  <Badge variant="secondary">{comparison.propertyIds.length} imóveis</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex -space-x-2">
                  {comparison.properties?.slice(0, 4).map((prop) => {
                    const image = getFirstImage(prop.images);
                    return (
                      <div
                        key={prop.id}
                        className="w-10 h-10 rounded-full border-2 border-background overflow-hidden bg-muted"
                      >
                        {image ? (
                          <img src={image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {comparison.propertyIds.length > 4 && (
                    <div className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium">
                      +{comparison.propertyIds.length - 4}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Criada em {new Date(comparison.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Comparison Detail Dialog */}
      <Dialog open={!!selectedComparison} onOpenChange={(open) => !open && setSelectedComparison(null)}>
        <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selectedComparison?.name}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => selectedComparison && deleteMutation.mutate(selectedComparison.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {selectedComparison && selectedComparison.properties?.length > 0 && (
            <ScrollArea className="w-full">
              <div className="min-w-max">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left p-3 bg-muted/50 sticky left-0 z-10 min-w-[120px]">
                        Característica
                      </th>
                      {selectedComparison.properties.map((property) => {
                        const image = getFirstImage(property.images);
                        return (
                          <th key={property.id} className="p-3 min-w-[200px] text-center">
                            <div className="space-y-2">
                              {image ? (
                                <img src={image} alt="" className="w-full h-32 object-cover rounded-lg" />
                              ) : (
                                <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                                  <MapPin className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <p className="font-medium text-sm line-clamp-2">{property.title}</p>
                              <Badge>{property.category === 'rent' ? 'Aluguel' : 'Venda'}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => removePropertyMutation.mutate({
                                  comparisonId: selectedComparison.id,
                                  propertyId: property.id,
                                })}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Remover
                              </Button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFields.map((field) => {
                      const bestId = getBestValue(selectedComparison.properties, field.key);
                      return (
                        <tr key={field.key} className="border-t">
                          <td className="p-3 font-medium bg-muted/50 sticky left-0">
                            {field.label}
                          </td>
                          {selectedComparison.properties.map((property) => {
                            let value: string;
                            if (field.calculate) {
                              value = field.calculate(property);
                            } else {
                              const rawValue = property[field.key as keyof Property];
                              value = field.format
                                ? field.format(rawValue as any, property.category)
                                : String(rawValue || '-');
                            }
                            const isBest = property.id === bestId;
                            return (
                              <td
                                key={property.id}
                                className={`p-3 text-center ${isBest ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {isBest && <Check className="h-4 w-4 text-green-600" />}
                                  <span className={isBest ? 'font-medium text-green-600' : ''}>
                                    {value}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}

          {selectedComparison && (!selectedComparison.properties || selectedComparison.properties.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              Adicione imóveis para comparar
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
