import { useState } from "react";
import { Link } from "wouter";
import { useImobi, Property } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { BedDouble, Bath, Ruler, MapPin, Search, Filter, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatPrice(price: string) {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

type PropertyFormData = {
  title: string;
  description: string;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  bedrooms: string;
  bathrooms: string;
  area: string;
  status: string;
  featured: boolean;
  images: string[];
};

const initialFormData: PropertyFormData = {
  title: "",
  description: "",
  type: "apartment",
  category: "sale",
  price: "",
  address: "",
  city: "",
  state: "SP",
  zipCode: "",
  bedrooms: "",
  bathrooms: "",
  area: "",
  status: "available",
  featured: false,
  images: [],
};

export default function PropertiesList() {
  const { properties, tenant, refetchProperties } = useImobi();
  const { toast } = useToast();
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredProperties = properties.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(filter.toLowerCase()) || 
                          p.address.toLowerCase().includes(filter.toLowerCase());
    const matchesType = typeFilter === "all" || p.category === typeFilter;
    return matchesSearch && matchesType;
  });

  const openCreateModal = () => {
    setEditingProperty(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      title: property.title,
      description: property.description || "",
      type: property.type,
      category: property.category,
      price: property.price,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode || "",
      bedrooms: property.bedrooms?.toString() || "",
      bathrooms: property.bathrooms?.toString() || "",
      area: property.area?.toString() || "",
      status: property.status,
      featured: property.featured,
      images: property.images || [],
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        type: formData.type,
        category: formData.category,
        price: formData.price,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode || null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        area: formData.area ? parseInt(formData.area) : null,
        status: formData.status,
        featured: formData.featured,
        images: formData.images.length > 0 ? formData.images : null,
      };

      const url = editingProperty 
        ? `/api/properties/${editingProperty.id}` 
        : "/api/properties";
      
      const method = editingProperty ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar imóvel");
      }

      toast({
        title: editingProperty ? "Imóvel atualizado" : "Imóvel criado",
        description: editingProperty 
          ? "O imóvel foi atualizado com sucesso."
          : "O imóvel foi cadastrado com sucesso.",
      });

      setIsModalOpen(false);
      setFormData(initialFormData);
      setEditingProperty(null);
      await refetchProperties();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/properties/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao excluir imóvel");
      }

      toast({
        title: "Imóvel excluído",
        description: "O imóvel foi removido com sucesso.",
      });

      setDeleteConfirmId(null);
      await refetchProperties();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImageAdd = () => {
    const url = prompt("Cole a URL da imagem:");
    if (url && url.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, url.trim()]
      }));
    }
  };

  const handleImageRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-properties-title" className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Imóveis</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Gerencie seu portfólio de imóveis</p>
        </div>
        <Button data-testid="button-new-property" className="gap-2 w-full sm:w-auto" onClick={openCreateModal}>
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
          <Button variant="outline" onClick={openCreateModal}>Cadastrar Imóvel</Button>
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
                <div className="absolute top-3 left-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    data-testid={`button-edit-property-${property.id}`}
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 backdrop-blur-md bg-white/90 hover:bg-white"
                    onClick={(e) => {
                      e.preventDefault();
                      openEditModal(property);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button 
                    data-testid={`button-delete-property-${property.id}`}
                    variant="secondary" 
                    size="icon" 
                    className="h-8 w-8 backdrop-blur-md bg-white/90 hover:bg-red-100"
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteConfirmId(property.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle data-testid="dialog-title-property">
              {editingProperty ? "Editar Imóvel" : "Novo Imóvel"}
            </DialogTitle>
            <DialogDescription>
              {editingProperty 
                ? "Atualize as informações do imóvel abaixo."
                : "Preencha as informações do novo imóvel."}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] px-6">
            <form id="property-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    data-testid="input-property-title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Apartamento 3 quartos na Vila Madalena"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    data-testid="input-property-description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva o imóvel..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="type">Tipo de Imóvel *</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger data-testid="select-property-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="land">Terreno</SelectItem>
                      <SelectItem value="condo">Condomínio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Categoria *</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger data-testid="select-property-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rent">Aluguel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="price">Preço (R$) *</Label>
                  <Input
                    id="price"
                    data-testid="input-property-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="450000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger data-testid="select-property-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="sold">Vendido</SelectItem>
                      <SelectItem value="rented">Alugado</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="address">Endereço *</Label>
                  <Input
                    id="address"
                    data-testid="input-property-address"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Rua das Flores, 123"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    data-testid="input-property-city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="São Paulo"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="state">Estado *</Label>
                  <Select value={formData.state} onValueChange={(v) => setFormData(prev => ({ ...prev, state: v }))}>
                    <SelectTrigger data-testid="select-property-state">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">Acre</SelectItem>
                      <SelectItem value="AL">Alagoas</SelectItem>
                      <SelectItem value="AP">Amapá</SelectItem>
                      <SelectItem value="AM">Amazonas</SelectItem>
                      <SelectItem value="BA">Bahia</SelectItem>
                      <SelectItem value="CE">Ceará</SelectItem>
                      <SelectItem value="DF">Distrito Federal</SelectItem>
                      <SelectItem value="ES">Espírito Santo</SelectItem>
                      <SelectItem value="GO">Goiás</SelectItem>
                      <SelectItem value="MA">Maranhão</SelectItem>
                      <SelectItem value="MT">Mato Grosso</SelectItem>
                      <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                      <SelectItem value="MG">Minas Gerais</SelectItem>
                      <SelectItem value="PA">Pará</SelectItem>
                      <SelectItem value="PB">Paraíba</SelectItem>
                      <SelectItem value="PR">Paraná</SelectItem>
                      <SelectItem value="PE">Pernambuco</SelectItem>
                      <SelectItem value="PI">Piauí</SelectItem>
                      <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                      <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                      <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                      <SelectItem value="RO">Rondônia</SelectItem>
                      <SelectItem value="RR">Roraima</SelectItem>
                      <SelectItem value="SC">Santa Catarina</SelectItem>
                      <SelectItem value="SP">São Paulo</SelectItem>
                      <SelectItem value="SE">Sergipe</SelectItem>
                      <SelectItem value="TO">Tocantins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="zipCode">CEP</Label>
                  <Input
                    id="zipCode"
                    data-testid="input-property-zipcode"
                    value={formData.zipCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                    placeholder="01310-100"
                  />
                </div>

                <div>
                  <Label htmlFor="bedrooms">Quartos</Label>
                  <Input
                    id="bedrooms"
                    data-testid="input-property-bedrooms"
                    type="number"
                    min="0"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                    placeholder="3"
                  />
                </div>

                <div>
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    data-testid="input-property-bathrooms"
                    type="number"
                    min="0"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                    placeholder="2"
                  />
                </div>

                <div>
                  <Label htmlFor="area">Área (m²)</Label>
                  <Input
                    id="area"
                    data-testid="input-property-area"
                    type="number"
                    min="0"
                    value={formData.area}
                    onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                    placeholder="120"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="featured"
                    data-testid="switch-property-featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                  />
                  <Label htmlFor="featured" className="cursor-pointer">Imóvel em destaque</Label>
                </div>

                <div className="sm:col-span-2">
                  <Label>Imagens</Label>
                  <div className="mt-2 space-y-2">
                    {formData.images.map((img, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <img src={img} alt={`Imagem ${index + 1}`} className="w-12 h-12 object-cover rounded" />
                        <span className="flex-1 text-sm truncate">{img}</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleImageRemove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={handleImageAdd}
                      data-testid="button-add-image"
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Imagem (URL)
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </ScrollArea>

          <DialogFooter className="p-6 pt-0 border-t mt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="property-form" 
              disabled={isSubmitting}
              data-testid="button-submit-property"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProperty ? "Salvar Alterações" : "Cadastrar Imóvel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              data-testid="button-confirm-delete"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
