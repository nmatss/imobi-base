import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useImobi, Property } from "@/lib/imobi-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  BedDouble, Bath, Ruler, MapPin, Search, Filter, Plus, Pencil, Trash2, Loader2,
  Share2, Images, Building2, Home, CheckCircle2, AlertTriangle, XCircle, Eye,
  Calendar, FileText, MessageSquare, Phone, ExternalLink, Star, StarOff,
  ChevronRight, LayoutGrid, List, SlidersHorizontal, X, Clock, TrendingUp,
  Camera, FileCheck, Sparkles, Send, MoreVertical, Copy, CalendarPlus, ChevronDown,
  Bed, Maximize2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/PermissionGate";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { QuickSendModal } from "@/components/whatsapp/QuickSendModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PropertyCard, PropertyCardSkeleton } from "@/components/properties";
import { Spinner } from "@/components/ui/spinner";

function formatPrice(price: string) {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(num);
}

function formatPriceShort(price: string) {
  const num = parseFloat(price);
  if (isNaN(num)) return price;
  if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `R$ ${(num / 1000).toFixed(0)}K`;
  return formatPrice(price);
}

// Calculate property completeness score
function calculateScore(property: Property): { score: number; missing: string[] } {
  const missing: string[] = [];
  let score = 0;
  const total = 10;

  if (property.title && property.title.length > 10) score += 1; else missing.push("Título completo");
  if (property.description && property.description.length > 50) score += 2; else missing.push("Descrição detalhada");
  if (property.images && property.images.length >= 3) score += 2; else if (property.images && property.images.length > 0) { score += 1; missing.push("Mais fotos (mín. 3)"); } else missing.push("Fotos do imóvel");
  if (property.bedrooms && property.bedrooms > 0) score += 1; else missing.push("Quartos");
  if (property.bathrooms && property.bathrooms > 0) score += 1; else missing.push("Banheiros");
  if (property.area && property.area > 0) score += 1; else missing.push("Área");
  if (property.features && property.features.length > 0) score += 1; else missing.push("Características");
  if (property.zipCode) score += 1; else missing.push("CEP");

  return { score: Math.round((score / total) * 100), missing };
}

// Property Card Skeleton Component - moved to PropertyCard.tsx

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
  features: string[];
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
  features: [],
};

const PROPERTY_TYPES: Record<string, string> = {
  apartment: "Apartamento",
  house: "Casa",
  commercial: "Comercial",
  land: "Terreno",
  condo: "Condomínio",
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: "Disponível", color: "text-green-700", bg: "bg-green-100" },
  reserved: { label: "Reservado", color: "text-yellow-700", bg: "bg-yellow-100" },
  sold: { label: "Vendido", color: "text-blue-700", bg: "bg-blue-100" },
  rented: { label: "Alugado", color: "text-purple-700", bg: "bg-purple-100" },
  pending: { label: "Pendente", color: "text-gray-700", bg: "bg-gray-100" },
};

export default function PropertiesList() {
  const { properties, tenant, visits, leads, refetchProperties, loading } = useImobi();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // View & Filter State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCity, setFilterCity] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"price-asc" | "price-desc" | "recent" | "name-asc">("recent");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [formStep, setFormStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Pagination
  const [itemsPerPage] = useState(12);
  const [displayedItems, setDisplayedItems] = useState(12);

  // WhatsApp Modal State
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppProperty, setWhatsAppProperty] = useState<Property | null>(null);

  // Loading states for individual actions
  const [togglingFeatured, setTogglingFeatured] = useState<string | null>(null);

  // ==================== PORTFOLIO STATS ====================
  const portfolioStats = useMemo(() => {
    const total = properties.length;
    const available = properties.filter(p => p.status === "available").length;
    const rented = properties.filter(p => p.status === "rented").length;
    const sold = properties.filter(p => p.status === "sold").length;
    const reserved = properties.filter(p => p.status === "reserved").length;
    const featured = properties.filter(p => p.featured).length;

    // Quality issues
    const withoutImages = properties.filter(p => !p.images || p.images.length === 0).length;
    const withoutDescription = properties.filter(p => !p.description || p.description.length < 50).length;
    const incomplete = properties.filter(p => calculateScore(p).score < 70).length;

    // Cities for filter
    const cities = Array.from(new Set(properties.map(p => p.city))).filter(Boolean).sort();

    return {
      total, available, rented, sold, reserved, featured,
      withoutImages, withoutDescription, incomplete, cities
    };
  }, [properties]);

  // ==================== FILTERED PROPERTIES ====================
  const filteredProperties = useMemo(() => {
    let filtered = properties.filter(p => {
      const matchesSearch = searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = filterCategory === "all" || p.category === filterCategory;
      const matchesStatus = filterStatus === "all" || p.status === filterStatus;
      const matchesType = filterType === "all" || p.type === filterType;
      const matchesCity = filterCity === "all" || p.city === filterCity;

      return matchesSearch && matchesCategory && matchesStatus && matchesType && matchesCity;
    });

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price-desc":
          return parseFloat(b.price) - parseFloat(a.price);
        case "recent":
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "name-asc":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return sorted;
  }, [properties, searchQuery, filterCategory, filterStatus, filterType, filterCity, sortBy]);

  // ==================== PROPERTY ENRICHMENT ====================
  const enrichedProperties = useMemo(() => {
    return filteredProperties.map(property => {
      const { score, missing } = calculateScore(property);
      const propertyVisits = visits.filter(v => v.propertyId === property.id);
      const lastVisit = propertyVisits.length > 0
        ? propertyVisits.sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime())[0]
        : null;
      const daysSinceLastVisit = lastVisit
        ? differenceInDays(new Date(), new Date(lastVisit.scheduledFor))
        : null;
      const interestedLeads = leads.filter(l =>
        l.interests && Array.isArray(l.interests) && l.interests.includes(property.type)
      ).length;

      return {
        ...property,
        score,
        missing,
        visitCount: propertyVisits.length,
        daysSinceLastVisit,
        interestedLeads,
        hasQualityIssues: score < 70,
      };
    });
  }, [filteredProperties, visits, leads]);

  // ==================== HANDLERS ====================
  const handleImageLoad = (imageUrl: string) => {
    setLoadedImages(prev => new Set(prev).add(imageUrl));
  };

  const openLightbox = (images: string[]) => {
    if (images && images.length > 0) {
      setLightboxImages(images);
      setLightboxOpen(true);
    }
  };

  const openCreateModal = () => {
    setEditingProperty(null);
    setFormData(initialFormData);
    setFormStep(1);
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
      features: property.features || [],
    });
    setFormStep(1);
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
        features: formData.features.length > 0 ? formData.features : null,
      };

      const url = editingProperty ? `/api/properties/${editingProperty.id}` : "/api/properties";
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

      if (editingProperty) {
        toast.crud.updated("Imóvel");
      } else {
        toast.crud.created("Imóvel");
      }

      setIsModalOpen(false);
      setFormData(initialFormData);
      setEditingProperty(null);
      await refetchProperties();
    } catch (error: any) {
      toast.errors.operation("salvar o imóvel");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/properties/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao excluir imóvel");
      }
      toast.crud.deleted("Imóvel");
      setDeleteConfirmId(null);
      await refetchProperties();
    } catch (error: any) {
      toast.errors.operation("excluir o imóvel");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleFeatured = async (property: Property) => {
    setTogglingFeatured(property.id);
    try {
      const res = await fetch(`/api/properties/${property.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ featured: !property.featured }),
      });
      if (res.ok) {
        if (property.featured) {
          toast.success("Removido dos destaques", "O imóvel não aparece mais em destaque.");
        } else {
          toast.action.favorited("Imóvel");
        }
        await refetchProperties();
      }
    } catch (error) {
      toast.errors.operation("alterar o destaque");
    } finally {
      setTogglingFeatured(null);
    }
  };

  const shareWhatsApp = (property: Property) => {
    setWhatsAppProperty(property);
    setIsWhatsAppModalOpen(true);
  };

  const copyLink = (property: Property) => {
    const url = `${window.location.origin}/e/${tenant?.slug}/imovel/${property.id}`;
    navigator.clipboard.writeText(url);
    toast.action.linkCopied();
  };

  const handleImageAdd = () => {
    const url = prompt("Cole a URL da imagem:");
    if (url && url.trim()) {
      setFormData(prev => ({ ...prev, images: [...prev.images, url.trim()] }));
    }
  };

  const handleImageRemove = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleFeatureAdd = () => {
    const feature = prompt("Digite a característica:");
    if (feature && feature.trim()) {
      setFormData(prev => ({ ...prev, features: [...prev.features, feature.trim()] }));
    }
  };

  const handleFeatureRemove = (index: number) => {
    setFormData(prev => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setFilterCategory("all");
    setFilterStatus("all");
    setFilterType("all");
    setFilterCity("all");
  };

  const handleStatClick = (status: string) => {
    if (status === "all") {
      setFilterStatus("all");
    } else if (status === "incomplete") {
      // For incomplete, we'll need to filter by enriched properties
      // This is just setting a marker, the actual filtering happens in enrichedProperties
      setFilterStatus("all");
    } else {
      setFilterStatus(status);
    }
  };

  const hasActiveFilters = filterCategory !== "all" || filterStatus !== "all" || filterType !== "all" || filterCity !== "all";

  // ==================== RENDER ====================
  return (
    <div className="container-responsive space-responsive">
      {/* ==================== HEADER COM STATS ==================== */}
      <div className="space-responsive">
        <div className="action-bar">
          <div className="min-w-0">
            <h1 className="text-responsive-xl font-heading font-bold text-foreground truncate">Imóveis</h1>
            <p className="text-responsive-xs text-muted-foreground">
              <span className="hide-mobile">Gerencie seu portfólio de </span>
              <span className="font-medium">{portfolioStats.total}</span> imóveis
            </p>
          </div>
          <PermissionGate permission="properties.create">
            <Button className="gap-1.5 sm:gap-2 w-full xs:w-auto h-10 sm:h-10 text-sm active:scale-95 transition-transform duration-150" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Novo Imóvel</span>
              <span className="xs:hidden">Novo</span>
            </Button>
          </PermissionGate>
        </div>

        {/* Stats Cards - 4 CARDS PRINCIPAIS - Grid responsivo: 1 col mobile → 2 tablet → 4 desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-l-4 border-l-blue-500 card-hover-subtle">
            <CardContent className="card-stats">
              <div className="flex items-center gap-responsive-sm">
                <Building2 className="icon-responsive text-blue-500 shrink-0" />
                <span className="text-responsive-xs text-muted-foreground truncate">Total</span>
              </div>
              <p className="text-responsive-lg font-bold">{portfolioStats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Disponíveis</span>
              </div>
              <p className="text-lg sm:text-xl font-bold mt-0.5 sm:mt-1">{portfolioStats.available}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500 shrink-0" />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Alugados</span>
              </div>
              <p className="text-lg sm:text-xl font-bold mt-0.5 sm:mt-1">{portfolioStats.rented}</p>
            </CardContent>
          </Card>
          <Card className={`border-l-4 ${portfolioStats.incomplete > 0 ? "border-l-red-500" : "border-l-gray-300"}`}>
            <CardContent className="p-2 sm:p-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 ${portfolioStats.incomplete > 0 ? "text-red-500" : "text-gray-400"}`} />
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">Incompletos</span>
              </div>
              <p className="text-lg sm:text-xl font-bold mt-0.5 sm:mt-1">{portfolioStats.incomplete}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ==================== SEARCH & FILTERS ==================== */}
      <div className="space-y-2 sm:space-y-3">
        {/* Search Bar + Filter Toggle + View Toggle */}
        <div className="flex gap-1.5 sm:gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar imóvel..."
              className="pl-8 sm:pl-9 pr-8 h-9 sm:h-10 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0.5 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setSearchQuery("")}
                      aria-label="Limpar busca"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Limpar busca</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Mobile: Filter Sheet */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 lg:hidden relative" aria-label="Abrir filtros">
                      <SlidersHorizontal className="h-4 w-4" />
                      {hasActiveFilters && (
                        <span className="absolute -top-1 -right-1 h-2.5 w-2.5 sm:h-3 sm:w-3 bg-primary rounded-full border-2 border-background" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Abrir filtros</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </SheetTrigger>
            <SheetContent side="right" className="w-full xs:w-[320px] sm:w-[360px] p-4 sm:p-6">
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="flex items-center justify-between">
                  <span>Filtros</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="text-xs">{
                      [filterCategory !== "all", filterStatus !== "all", filterType !== "all", filterCity !== "all"].filter(Boolean).length
                    } ativos</Badge>
                  )}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Situação</Label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as situações</SelectItem>
                      <SelectItem value="sale">Venda</SelectItem>
                      <SelectItem value="rent">Aluguel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="reserved">Reservado</SelectItem>
                      <SelectItem value="sold">Vendido</SelectItem>
                      <SelectItem value="rented">Alugado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo de Imóvel</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="apartment">Apartamento</SelectItem>
                      <SelectItem value="house">Casa</SelectItem>
                      <SelectItem value="commercial">Comercial</SelectItem>
                      <SelectItem value="land">Terreno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cidade</Label>
                  <Select value={filterCity} onValueChange={setFilterCity}>
                    <SelectTrigger className="mt-1.5 h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as cidades</SelectItem>
                      {portfolioStats.cities.map(city => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="my-4" />

                <div className="flex flex-col gap-2">
                  {hasActiveFilters && (
                    <Button variant="outline" className="w-full h-10" onClick={() => { clearFilters(); setShowFilters(false); }}>
                      <X className="h-4 w-4 mr-2" /> Limpar Filtros
                    </Button>
                  )}
                  <Button className="w-full h-10" onClick={() => setShowFilters(false)}>
                    Ver {filteredProperties.length} imóveis
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* View Toggle - visible on sm+ */}
          <div className="hidden sm:flex border rounded-lg shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-r-none"
                    onClick={() => setViewMode("grid")}
                    aria-label="Visualização em grade"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visualização em grade</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-l-none"
                    onClick={() => setViewMode("list")}
                    aria-label="Visualização em lista"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Visualização em lista</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Mobile results count */}
        <div className="flex items-center justify-between lg:hidden text-xs sm:text-sm text-muted-foreground">
          <span>{filteredProperties.length} imóveis encontrados</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs px-2">
              <X className="h-3 w-3 mr-1" /> Limpar
            </Button>
          )}
        </div>

        {/* Desktop Filters - visible on lg+ */}
        <div className="hidden lg:flex flex-wrap gap-2 items-center">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="sale">Venda</SelectItem>
              <SelectItem value="rent">Aluguel</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="available">Disponível</SelectItem>
              <SelectItem value="reserved">Reservado</SelectItem>
              <SelectItem value="sold">Vendido</SelectItem>
              <SelectItem value="rented">Alugado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              <SelectItem value="apartment">Apartamento</SelectItem>
              <SelectItem value="house">Casa</SelectItem>
              <SelectItem value="commercial">Comercial</SelectItem>
              <SelectItem value="land">Terreno</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[130px] h-9 text-sm">
              <SelectValue placeholder="Cidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {portfolioStats.cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs">
              <X className="h-3.5 w-3.5 mr-1" /> Limpar
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            {filteredProperties.length} de {properties.length} imóveis
          </div>
        </div>
      </div>

      {/* ==================== PROPERTY LIST ==================== */}
      {loading ? (
        /* LOADING SKELETONS - Grid responsivo: 1 col mobile → 2 tablet → 3 desktop, com gaps adaptativos */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in duration-200">
          {Array.from({ length: 6 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="text-center py-12 sm:py-16 md:py-20 bg-muted/20 rounded-xl border border-dashed px-4">
          <Building2 className="w-12 h-12 mx-auto text-muted-foreground opacity-20 mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">Nenhum imóvel encontrado</h3>
          <p className="text-muted-foreground mb-6 text-sm sm:text-base max-w-md mx-auto">
            {hasActiveFilters
              ? "Tente ajustar os filtros para encontrar imóveis."
              : "Adicione seu primeiro imóvel para começar."}
          </p>
          <PermissionGate permission="properties.create">
            <Button className="h-10 gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Novo Imóvel
            </Button>
          </PermissionGate>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW WITH VIRTUALIZATION - Grid responsivo: 1 col mobile → 2 tablet → 3 desktop */
        (() => {
          const parentRef = useRef<HTMLDivElement>(null);

          // Calculate columns based on viewport
          const getColumnCount = () => {
            if (typeof window === 'undefined') return 3;
            const width = window.innerWidth;
            if (width < 640) return 1;  // mobile (<640px)
            if (width < 1024) return 2; // tablet (640-1024px)
            return 3;                    // desktop (1024+)
          };

          const [columnCount, setColumnCount] = useState(getColumnCount);

          // Update column count on resize
          useEffect(() => {
            const handleResize = () => setColumnCount(getColumnCount());
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
          }, []);

          const rowCount = Math.ceil(enrichedProperties.length / columnCount);

          const rowVirtualizer = useVirtualizer({
            count: rowCount,
            getScrollElement: () => parentRef.current,
            estimateSize: () => 280, // PropertyCard estimated height
            overscan: 5,
          });

          return (
            <div ref={parentRef} className="h-[calc(100vh-24rem)] overflow-auto">
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const startIndex = virtualRow.index * columnCount;
                  const rowProperties = enrichedProperties.slice(startIndex, startIndex + columnCount);

                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {/* Grid responsivo: 1 col mobile → 2 tablet → 3 desktop, com gaps adaptativos */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-1">
                        {rowProperties.map((property) => (
                          <PropertyCard
                            key={property.id}
                            id={property.id}
                            title={property.title}
                            city={property.city}
                            price={parseFloat(property.price)}
                            bedrooms={property.bedrooms}
                            bathrooms={property.bathrooms}
                            area={property.area}
                            status={property.status as "available" | "sold" | "rented" | "pending" | "reserved"}
                            type={property.category as 'sale' | 'rent'}
                            featured={property.featured}
                            imageUrl={property.images?.[0]}
                            imageCount={property.images?.length || 0}
                            isTogglingFeatured={togglingFeatured === property.id}
                            onView={(id) => setLocation(`/properties/${id}`)}
                            onEdit={(id) => openEditModal(property)}
                            onDelete={(id) => setDeleteConfirmId(id)}
                            onShare={(id) => shareWhatsApp(property)}
                            onToggleFeatured={(id) => handleToggleFeatured(property)}
                            onCopyLink={(id) => copyLink(property)}
                            onScheduleVisit={(id) => setLocation("/calendar")}
                            onImageClick={(id) => openLightbox(property.images || [])}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        /* LIST VIEW - Responsive: stacks on very small screens, horizontal on larger */
        <div className="space-y-2 sm:space-y-2.5">
          {enrichedProperties.map((property) => (
            <Card key={property.id} className="hover:shadow-md transition-shadow touch-manipulation">
              <CardContent className="p-2.5 sm:p-3 md:p-4">
                {/* Flex row that becomes more spacious on larger screens */}
                <div className="flex gap-2.5 sm:gap-3 md:gap-4">
                  {/* Thumbnail - Responsive sizing */}
                  <div
                    className="w-16 h-16 xs:w-20 xs:h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-lg overflow-hidden shrink-0 cursor-pointer relative"
                    onClick={() => openLightbox(property.images || [])}
                  >
                    <img
                      src={property.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400"}
                      alt={property.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {property.images && property.images.length > 1 && (
                      <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 bg-black/70 text-white text-[9px] sm:text-[10px] px-1 rounded">
                        +{property.images.length - 1}
                      </div>
                    )}
                    {property.featured && (
                      <div className="absolute top-0.5 left-0.5 sm:top-1 sm:left-1">
                        <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-400 fill-yellow-400 drop-shadow" />
                      </div>
                    )}
                  </div>

                  {/* Info - Flexible content area */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    {/* Header Row: Title + Actions */}
                    <div className="flex items-start justify-between gap-1.5 sm:gap-2">
                      <div className="min-w-0 flex-1" onClick={() => setLocation(`/properties/${property.id}`)} role="button">
                        <h3 className="font-semibold text-xs sm:text-sm md:text-base line-clamp-1 hover:text-primary transition-colors cursor-pointer">
                          {property.title}
                        </h3>
                        <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center mt-0.5">
                          <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
                          <span className="truncate">{property.city}</span>
                          <span className="hidden xs:inline truncate">, {property.address}</span>
                        </p>
                      </div>

                      {/* Actions Dropdown - Touch-friendly (min 44px) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 shrink-0 -mr-1 -mt-0.5 touch-manipulation" aria-label="Mais opções">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mais opções</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 sm:w-48">
                          <DropdownMenuItem onClick={() => setLocation(`/properties/${property.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(property)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFeatured(property)}>
                            {property.featured ? <StarOff className="h-4 w-4 mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                            {property.featured ? "Remover destaque" : "Destacar"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => shareWhatsApp(property)}>
                            <Send className="h-4 w-4 mr-2" /> WhatsApp
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(property)}>
                            <Copy className="h-4 w-4 mr-2" /> Copiar link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLocation("/calendar")}>
                            <CalendarPlus className="h-4 w-4 mr-2" /> Agendar visita
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteConfirmId(property.id)}>
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Price - Prominent */}
                    <p className="text-sm sm:text-base md:text-lg font-bold text-foreground mt-0.5 sm:mt-1">
                      {formatPrice(property.price)}
                    </p>

                    {/* Badges - Simplificados: categoria + tipo + status */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1 sm:mt-1.5">
                      <Badge className={`text-[9px] sm:text-[10px] px-1.5 py-0 h-4 sm:h-5 ${property.category === 'sale' ? 'bg-blue-500' : 'bg-green-500'}`}>
                        {property.category === 'sale' ? 'Venda' : 'Aluguel'}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4 sm:h-5">
                        {PROPERTY_TYPES[property.type] || property.type}
                      </Badge>
                      <Badge className={`text-[9px] sm:text-[10px] px-1.5 py-0 h-4 sm:h-5 ${STATUS_CONFIG[property.status]?.bg} ${STATUS_CONFIG[property.status]?.color}`}>
                        {STATUS_CONFIG[property.status]?.label}
                      </Badge>
                    </div>

                    {/* Stats Row - Responsive, wraps nicely */}
                    <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 md:gap-x-4 gap-y-0.5 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
                      {property.bedrooms && (
                        <span className="flex items-center gap-0.5">
                          <BedDouble className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>{property.bedrooms}</span>
                          <span className="hidden sm:inline"> quartos</span>
                        </span>
                      )}
                      {property.bathrooms && (
                        <span className="flex items-center gap-0.5">
                          <Bath className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          <span>{property.bathrooms}</span>
                          <span className="hidden sm:inline"> ban.</span>
                        </span>
                      )}
                      {property.area && (
                        <span className="flex items-center gap-0.5">
                          <Ruler className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> {property.area}m²
                        </span>
                      )}
                      <span className="flex items-center gap-0.5">
                        <TrendingUp className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${property.score >= 70 ? 'text-green-500' : 'text-amber-500'}`} />
                        {property.score}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ==================== CREATE/EDIT MODAL ==================== */}
      {/* Full-screen on mobile, centered modal on larger screens */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-xl md:max-w-2xl sm:h-auto sm:max-h-[90vh] p-0 gap-0 rounded-none sm:rounded-lg">
          {/* Header - Fixed at top */}
          <DialogHeader className="p-3 sm:p-4 md:p-6 pb-2 sm:pb-3 border-b shrink-0">
            <DialogTitle className="text-base sm:text-lg">{editingProperty ? "Editar Imóvel" : "Novo Imóvel"}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingProperty ? "Atualize as informações do imóvel." : "Preencha as informações do novo imóvel."}
            </DialogDescription>
          </DialogHeader>

          {/* Form Steps Indicator */}
          <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 border-b bg-muted/30 shrink-0">
            <div className="flex gap-1.5 sm:gap-2">
              {[1, 2, 3].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setFormStep(step)}
                  className={`flex-1 h-1.5 sm:h-2 rounded-full transition-colors ${
                    formStep >= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
              <span className={formStep === 1 ? "text-primary font-medium" : ""}>Dados Básicos</span>
              <span className={formStep === 2 ? "text-primary font-medium" : ""}>Características</span>
              <span className={formStep === 3 ? "text-primary font-medium" : ""}>Mídia</span>
            </div>
          </div>

          {/* Scrollable Form Area - Takes remaining space */}
          <ScrollArea className="flex-1 min-h-0 px-3 sm:px-4 md:px-6">
            <form id="property-form" onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 py-3 sm:py-4">
              {formStep === 1 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="sm:col-span-2">
                      <Label htmlFor="title" className="text-xs sm:text-sm">Título *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Ex: Apartamento 3 quartos na Vila Madalena"
                        className="h-9 sm:h-10 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-xs sm:text-sm">Tipo de Imóvel *</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue /></SelectTrigger>
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
                      <Label className="text-xs sm:text-sm">Categoria *</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sale">Venda</SelectItem>
                          <SelectItem value="rent">Aluguel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="price" className="text-xs sm:text-sm">Preço (R$) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="450000"
                        className="h-9 sm:h-10 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-xs sm:text-sm">Status *</Label>
                      <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Disponível</SelectItem>
                          <SelectItem value="reserved">Reservado</SelectItem>
                          <SelectItem value="sold">Vendido</SelectItem>
                          <SelectItem value="rented">Alugado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-2">
                      <Label htmlFor="address" className="text-xs sm:text-sm">Endereço *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="Rua das Flores, 123"
                        className="h-9 sm:h-10 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="city" className="text-xs sm:text-sm">Cidade *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="São Paulo"
                        className="h-9 sm:h-10 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label className="text-xs sm:text-sm">Estado *</Label>
                      <Select value={formData.state} onValueChange={(v) => setFormData(prev => ({ ...prev, state: v }))}>
                        <SelectTrigger className="h-9 sm:h-10 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="zipCode" className="text-xs sm:text-sm">CEP</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="01310-100"
                        inputMode="numeric"
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2 h-9 sm:h-10">
                      <Switch
                        id="featured"
                        checked={formData.featured}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                      />
                      <Label htmlFor="featured" className="cursor-pointer text-xs sm:text-sm">Imóvel em destaque</Label>
                    </div>
                  </div>
                </>
              )}

              {formStep === 2 && (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div>
                      <Label htmlFor="bedrooms" className="text-xs sm:text-sm">Quartos</Label>
                      <Input
                        id="bedrooms"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={formData.bedrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bedrooms: e.target.value }))}
                        placeholder="3"
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bathrooms" className="text-xs sm:text-sm">Banheiros</Label>
                      <Input
                        id="bathrooms"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={formData.bathrooms}
                        onChange={(e) => setFormData(prev => ({ ...prev, bathrooms: e.target.value }))}
                        placeholder="2"
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="area" className="text-xs sm:text-sm">Área (m²)</Label>
                      <Input
                        id="area"
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={formData.area}
                        onChange={(e) => setFormData(prev => ({ ...prev, area: e.target.value }))}
                        placeholder="120"
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm">Descrição</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descreva o imóvel em detalhes..."
                      rows={3}
                      className="text-sm min-h-[80px] sm:min-h-[100px]"
                    />
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      {formData.description.length}/50 caracteres (mínimo recomendado)
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs sm:text-sm">Características</Label>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                      {formData.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="gap-1 text-xs h-7 sm:h-8 px-2">
                          {feature}
                          <button type="button" onClick={() => handleFeatureRemove(index)} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={handleFeatureAdd} className="h-7 sm:h-8 text-xs">
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {formStep === 3 && (
                <>
                  <div>
                    <Label className="text-xs sm:text-sm">Imagens</Label>
                    <div className="grid grid-cols-2 xs:grid-cols-3 gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                      {formData.images.map((img, index) => (
                        <div key={index} className="relative aspect-video rounded-lg overflow-hidden group">
                          <img src={img} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            onClick={() => handleImageRemove(index)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[60px]"
                        onClick={handleImageAdd}
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="text-[10px] sm:text-xs">Adicionar</span>
                      </button>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                      {formData.images.length}/3 imagens (mínimo recomendado)
                    </p>
                  </div>

                  {/* Score Preview */}
                  <Card className="bg-muted/50">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-xs sm:text-sm font-medium">Score de Completude</span>
                        <span className="text-base sm:text-lg font-bold">
                          {calculateScore({
                            ...formData,
                            id: "", tenantId: "", createdAt: "", updatedAt: "",
                            price: formData.price,
                            bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
                            bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
                            area: formData.area ? parseInt(formData.area) : null,
                          } as any).score}%
                        </span>
                      </div>
                      <Progress
                        value={calculateScore({
                          ...formData,
                          id: "", tenantId: "", createdAt: "", updatedAt: "",
                          price: formData.price,
                          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
                          bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
                          area: formData.area ? parseInt(formData.area) : null,
                        } as any).score}
                        className="h-1.5 sm:h-2"
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </form>
          </ScrollArea>

          {/* Footer - Fixed at bottom with safe area support */}
          <div className="p-3 sm:p-4 md:p-6 pt-2 sm:pt-3 border-t shrink-0 bg-background safe-area-inset-bottom">
            <div className="flex flex-col-reverse xs:flex-row gap-2 xs:justify-between">
              <div className="flex gap-2">
                {formStep > 1 && (
                  <Button type="button" variant="outline" onClick={() => setFormStep(formStep - 1)} className="h-9 sm:h-10 text-sm flex-1 xs:flex-none">
                    Voltar
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="h-9 sm:h-10 text-sm flex-1 xs:flex-none">
                  Cancelar
                </Button>
                {formStep < 3 ? (
                  <Button type="button" onClick={() => setFormStep(formStep + 1)} className="h-9 sm:h-10 text-sm flex-1 xs:flex-none">
                    Próximo
                  </Button>
                ) : (
                  <Button type="submit" form="property-form" isLoading={isSubmitting} className="h-9 sm:h-10 text-sm flex-1 xs:flex-none">
                    {editingProperty ? "Salvar" : "Cadastrar"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation - Responsive dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse xs:flex-row gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting} className="w-full xs:w-auto h-9 sm:h-10 text-sm">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} isLoading={isDeleting} className="w-full xs:w-auto h-9 sm:h-10 text-sm">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        images={lightboxImages}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* WhatsApp Quick Send Modal */}
      {whatsAppProperty && (
        <QuickSendModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          recipientName="Contato"
          recipientPhone=""
          context={{
            property_title: whatsAppProperty.title,
            price: formatPrice(whatsAppProperty.price),
            location: `${whatsAppProperty.address}, ${whatsAppProperty.city}`,
            address: whatsAppProperty.address,
            bedrooms: whatsAppProperty.bedrooms?.toString() || '',
            area: whatsAppProperty.area?.toString() || '',
            link: `${window.location.origin}/e/${tenant?.slug}/imovel/${whatsAppProperty.id}`,
          }}
          defaultTemplate={`*${whatsAppProperty.title}*\n${formatPrice(whatsAppProperty.price)}\n${whatsAppProperty.address}, ${whatsAppProperty.city}\n\n${window.location.origin}/e/${tenant?.slug}/imovel/${whatsAppProperty.id}`}
        />
      )}
    </div>
  );
}
