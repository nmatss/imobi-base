import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  BedDouble,
  Bath,
  Ruler,
  Building,
  Loader2,
  Search,
  Filter,
  Menu,
  X,
  MessageCircle,
  SlidersHorizontal,
  Grid3x3,
  List,
  ChevronDown,
  Home,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

type Property = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  type: string;
  category: string;
  price: string;
  address: string;
  city: string;
  state: string;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  images: string[] | null;
  status: string;
  featured: boolean;
};

export default function PublicProperties() {
  const [match, params] = useRoute("/e/:rest*");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [bedroomsFilter, setBedroomsFilter] = useState<string>("all");
  const [bathroomsFilter, setBathroomsFilter] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000000]);
  const [areaRange, setAreaRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("recent");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const rest = (params as any)?.rest || (params as any)?.["rest*"] || "";
  const tenantSlug = rest.split("/")[0];

  useEffect(() => {
    if (!tenantSlug) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch tenant by slug
        const tenantRes = await fetch(`/api/tenants/slug/${tenantSlug}`);
        if (!tenantRes.ok) {
          setError("Imobiliária não encontrada");
          setLoading(false);
          return;
        }
        const tenantData = await tenantRes.json();
        setTenant(tenantData);

        // Fetch public properties for this tenant
        const propertiesRes = await fetch(`/api/properties/public/${tenantData.id}`);
        if (propertiesRes.ok) {
          const propertiesData = await propertiesRes.json();
          setProperties(propertiesData);

          // Set initial price range based on actual data
          if (propertiesData.length > 0) {
            const prices = propertiesData.map((p: Property) => parseFloat(p.price));
            const maxPrice = Math.max(...prices);
            setPriceRange([0, Math.ceil(maxPrice / 100000) * 100000]);
          }
        }
      } catch (err) {
        setError("Erro ao carregar dados");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tenantSlug]);

  // Get unique cities for filter
  const availableCities = useMemo(() => {
    const cities = Array.from(new Set(properties.map(p => p.city))).sort();
    return cities;
  }, [properties]);

  // Filter and sort properties
  const filteredAndSortedProperties = useMemo(() => {
    let filtered = properties.filter(property => {
      // Category filter
      if (categoryFilter !== "all" && property.category !== categoryFilter) return false;

      // Type filter
      if (typeFilter !== "all" && property.type !== typeFilter) return false;

      // City filter
      if (cityFilter !== "all" && property.city !== cityFilter) return false;

      // Bedrooms filter
      if (bedroomsFilter !== "all") {
        const bedrooms = parseInt(bedroomsFilter);
        if (bedrooms === 4) {
          if (!property.bedrooms || property.bedrooms < 4) return false;
        } else {
          if (property.bedrooms !== bedrooms) return false;
        }
      }

      // Bathrooms filter
      if (bathroomsFilter !== "all") {
        const bathrooms = parseInt(bathroomsFilter);
        if (bathrooms === 4) {
          if (!property.bathrooms || property.bathrooms < 4) return false;
        } else {
          if (property.bathrooms !== bathrooms) return false;
        }
      }

      // Price range filter
      const price = parseFloat(property.price);
      if (price < priceRange[0] || price > priceRange[1]) return false;

      // Area range filter
      if (property.area) {
        if (property.area < areaRange[0] || property.area > areaRange[1]) return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          property.title.toLowerCase().includes(query) ||
          property.address.toLowerCase().includes(query) ||
          property.city.toLowerCase().includes(query) ||
          property.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return parseFloat(a.price) - parseFloat(b.price);
        case "price_desc":
          return parseFloat(b.price) - parseFloat(a.price);
        case "area_desc":
          return (b.area || 0) - (a.area || 0);
        case "recent":
        default:
          // Featured first, then by ID (newest)
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return b.id.localeCompare(a.id);
      }
    });

    return filtered;
  }, [properties, categoryFilter, typeFilter, cityFilter, bedroomsFilter, bathroomsFilter, priceRange, areaRange, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedProperties.length / itemsPerPage);
  const paginatedProperties = filteredAndSortedProperties.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, typeFilter, cityFilter, bedroomsFilter, bathroomsFilter, priceRange, areaRange, searchQuery, sortBy]);

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const typeLabels: Record<string, string> = {
    house: "Casa",
    apartment: "Apartamento",
    land: "Terreno",
    commercial: "Comercial",
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== "all") count++;
    if (typeFilter !== "all") count++;
    if (cityFilter !== "all") count++;
    if (bedroomsFilter !== "all") count++;
    if (bathroomsFilter !== "all") count++;
    if (priceRange[0] > 0 || priceRange[1] < 5000000) count++;
    if (areaRange[0] > 0 || areaRange[1] < 1000) count++;
    return count;
  }, [categoryFilter, typeFilter, cityFilter, bedroomsFilter, bathroomsFilter, priceRange, areaRange]);

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setTypeFilter("all");
    setCityFilter("all");
    setBedroomsFilter("all");
    setBathroomsFilter("all");
    setPriceRange([0, 5000000]);
    setAreaRange([0, 1000]);
    setSearchQuery("");
  };

  const FiltersContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Finalidade</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
            className="w-full"
          >
            Todos
          </Button>
          <Button
            variant={categoryFilter === "sale" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("sale")}
            className="w-full"
          >
            Venda
          </Button>
          <Button
            variant={categoryFilter === "rent" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("rent")}
            className="w-full col-span-2"
          >
            Aluguel
          </Button>
        </div>
      </div>

      {/* Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Tipo de Imóvel</Label>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="house">Casa</SelectItem>
            <SelectItem value="apartment">Apartamento</SelectItem>
            <SelectItem value="land">Terreno</SelectItem>
            <SelectItem value="commercial">Comercial</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* City */}
      {availableCities.length > 1 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Cidade</Label>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {availableCities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Bedrooms */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Quartos</Label>
        <div className="grid grid-cols-5 gap-2">
          {["all", "1", "2", "3", "4"].map(value => (
            <Button
              key={value}
              variant={bedroomsFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setBedroomsFilter(value)}
              className="w-full"
            >
              {value === "all" ? "Todos" : value === "4" ? "4+" : value}
            </Button>
          ))}
        </div>
      </div>

      {/* Bathrooms */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Banheiros</Label>
        <div className="grid grid-cols-5 gap-2">
          {["all", "1", "2", "3", "4"].map(value => (
            <Button
              key={value}
              variant={bathroomsFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => setBathroomsFilter(value)}
              className="w-full"
            >
              {value === "all" ? "Todos" : value === "4" ? "4+" : value}
            </Button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Preço: {formatPrice(priceRange[0].toString())} - {formatPrice(priceRange[1].toString())}
        </Label>
        <Slider
          min={0}
          max={5000000}
          step={50000}
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          className="w-full"
        />
      </div>

      {/* Area Range */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">
          Área: {areaRange[0]}m² - {areaRange[1]}m²
        </Label>
        <Slider
          min={0}
          max={1000}
          step={10}
          value={areaRange}
          onValueChange={(value) => setAreaRange(value as [number, number])}
          className="w-full"
        />
      </div>

      {/* Clear filters */}
      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={clearAllFilters}
          className="w-full"
        >
          Limpar filtros ({activeFiltersCount})
        </Button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground mb-4">{error || "Imobiliária não encontrada."}</p>
          <Link href="/">
            <Button variant="link">Voltar para o início</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans" style={{
      '--primary': tenant.primaryColor,
      '--secondary': tenant.secondaryColor
    } as any}>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{tenant.name} - Imóveis para Venda e Aluguel</title>
        <meta name="description" content={`Navegue por todos os imóveis disponíveis na ${tenant.name}. Apartamentos, casas, terrenos e imóveis comerciais.`} />
        <meta property="og:title" content={`${tenant.name} - Catálogo de Imóveis`} />
        <meta property="og:description" content={`Encontre o imóvel perfeito entre ${properties.length} opções disponíveis.`} />
        <meta property="og:type" content="website" />
        {tenant.logo && <meta property="og:image" content={tenant.logo} />}
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <Link href={`/e/${tenantSlug}`}>
            <div className="flex items-center gap-2 font-heading font-bold text-lg sm:text-2xl cursor-pointer hover:opacity-80 transition-opacity" style={{ color: tenant.primaryColor }}>
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
              ) : (
                <Building className="h-5 w-5 sm:h-6 sm:w-6" />
              )}
              <span className="truncate max-w-[150px] sm:max-w-none">{tenant.name}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link href={`/e/${tenantSlug}`}>
              <a className="hover:text-primary transition-colors">Início</a>
            </Link>
            <Link href={`/e/${tenantSlug}/imoveis`}>
              <a className="text-primary font-semibold">Imóveis</a>
            </Link>
            <a href={`/e/${tenantSlug}#sobre`} className="hover:text-primary transition-colors">Sobre</a>
            <a href={`/e/${tenantSlug}#contato`} className="hover:text-primary transition-colors">Contato</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            {tenant.phone && (
              <a href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" style={{ backgroundColor: tenant.primaryColor }}>
                  Falar no WhatsApp
                </Button>
              </a>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
              <Link href={`/e/${tenantSlug}`}>
                <a
                  className="py-2 px-3 rounded-md hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Início
                </a>
              </Link>
              <Link href={`/e/${tenantSlug}/imoveis`}>
                <a
                  className="py-2 px-3 rounded-md bg-muted font-semibold"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Imóveis
                </a>
              </Link>
              <a
                href={`/e/${tenantSlug}#sobre`}
                className="py-2 px-3 rounded-md hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sobre
              </a>
              <a
                href={`/e/${tenantSlug}#contato`}
                className="py-2 px-3 rounded-md hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contato
              </a>
              {tenant.phone && (
                <div className="border-t pt-3 mt-1">
                  <a href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="w-full" style={{ backgroundColor: tenant.primaryColor }}>
                      <Phone className="h-4 w-4 mr-2" />
                      Falar no WhatsApp
                    </Button>
                  </a>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Search Section */}
        <section className="bg-gradient-to-b from-muted/50 to-background py-8 sm:py-12 border-b">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-6 sm:mb-8">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold mb-3 sm:mb-4">
                Encontre seu Imóvel
              </h1>
              <p className="text-muted-foreground text-base sm:text-lg">
                {properties.length} imóveis disponíveis
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, endereço, cidade ou descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-4 h-14 text-base shadow-lg"
                />
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  variant={categoryFilter === "sale" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(categoryFilter === "sale" ? "all" : "sale")}
                >
                  Comprar
                </Button>
                <Button
                  variant={categoryFilter === "rent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(categoryFilter === "rent" ? "all" : "rent")}
                >
                  Alugar
                </Button>
                <Button
                  variant={typeFilter === "house" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(typeFilter === "house" ? "all" : "house")}
                >
                  Casa
                </Button>
                <Button
                  variant={typeFilter === "apartment" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(typeFilter === "apartment" ? "all" : "apartment")}
                >
                  Apartamento
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-8 sm:py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Sidebar Filters - Desktop */}
              <aside className="hidden lg:block w-80 shrink-0">
                <div className="sticky top-24 bg-card border rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5" />
                      Filtros
                    </h2>
                    {activeFiltersCount > 0 && (
                      <Badge variant="secondary">{activeFiltersCount}</Badge>
                    )}
                  </div>
                  <FiltersContent />
                </div>
              </aside>

              {/* Properties Grid */}
              <div className="flex-1 min-w-0">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-6">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Mobile Filter Button */}
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="lg:hidden relative">
                          <Filter className="h-4 w-4 mr-2" />
                          Filtros
                          {activeFiltersCount > 0 && (
                            <Badge variant="default" className="ml-2 px-1.5 py-0 h-5 text-xs">
                              {activeFiltersCount}
                            </Badge>
                          )}
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-80 overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5" />
                            Filtros
                          </SheetTitle>
                        </SheetHeader>
                        <div className="mt-6">
                          <FiltersContent />
                        </div>
                      </SheetContent>
                    </Sheet>

                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">{filteredAndSortedProperties.length}</span> imóveis encontrados
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Sort */}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Mais recentes</SelectItem>
                        <SelectItem value="price_asc">Menor preço</SelectItem>
                        <SelectItem value="price_desc">Maior preço</SelectItem>
                        <SelectItem value="area_desc">Maior área</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Mode */}
                    <div className="hidden sm:flex border rounded-md">
                      <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-r-none"
                      >
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Active Filter Chips */}
                {activeFiltersCount > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {categoryFilter !== "all" && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => setCategoryFilter("all")}>
                        {categoryFilter === "sale" ? "Venda" : "Aluguel"}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    )}
                    {typeFilter !== "all" && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => setTypeFilter("all")}>
                        {typeLabels[typeFilter]}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    )}
                    {cityFilter !== "all" && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => setCityFilter("all")}>
                        {cityFilter}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    )}
                    {bedroomsFilter !== "all" && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => setBedroomsFilter("all")}>
                        {bedroomsFilter === "4" ? "4+" : bedroomsFilter} quartos
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    )}
                    {bathroomsFilter !== "all" && (
                      <Badge variant="secondary" className="cursor-pointer" onClick={() => setBathroomsFilter("all")}>
                        {bathroomsFilter === "4" ? "4+" : bathroomsFilter} banheiros
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                )}

                {/* Properties Grid/List */}
                {paginatedProperties.length > 0 ? (
                  <>
                    <div className={
                      viewMode === "grid"
                        ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6"
                        : "flex flex-col gap-4"
                    }>
                      {paginatedProperties.map(property => (
                        <Link key={property.id} href={`/e/${tenantSlug}/imovel/${property.id}`}>
                          <div className={`group overflow-hidden rounded-xl border bg-card hover:shadow-lg transition-all duration-300 cursor-pointer h-full ${
                            viewMode === "list" ? "flex flex-col sm:flex-row" : ""
                          }`}>
                            <div className={`relative overflow-hidden ${
                              viewMode === "list"
                                ? "aspect-[16/10] sm:aspect-[4/3] sm:w-80 shrink-0"
                                : "aspect-[4/3]"
                            }`}>
                              <img
                                src={property.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                                alt={property.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                loading="lazy"
                              />
                              <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                                <Badge className="bg-white/90 text-black backdrop-blur-sm shadow-sm hover:bg-white text-xs">
                                  {property.category === 'sale' ? 'Venda' : 'Aluguel'}
                                </Badge>
                                <Badge variant="secondary" className="backdrop-blur-sm text-xs">
                                  {typeLabels[property.type] || property.type}
                                </Badge>
                              </div>
                              {property.featured && (
                                <Badge className="absolute top-3 right-3 text-xs" style={{ backgroundColor: tenant.primaryColor }}>
                                  Destaque
                                </Badge>
                              )}
                            </div>
                            <div className={`p-4 sm:p-5 flex flex-col ${viewMode === "list" ? "flex-1 justify-between" : ""}`}>
                              <div>
                                <h3 className="text-lg sm:text-xl font-heading font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                  {property.title}
                                </h3>
                                <p className="text-muted-foreground flex items-start mb-3 text-sm">
                                  <MapPin className="w-4 h-4 mr-1 flex-shrink-0 mt-0.5" />
                                  <span className="line-clamp-1">{property.address}, {property.city}</span>
                                </p>
                                {viewMode === "list" && property.description && (
                                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {property.description}
                                  </p>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-4 py-3 border-t mb-3">
                                  {property.bedrooms !== null && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <BedDouble className="w-4 h-4" />
                                      <span>{property.bedrooms}</span>
                                    </div>
                                  )}
                                  {property.bathrooms !== null && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Bath className="w-4 h-4" />
                                      <span>{property.bathrooms}</span>
                                    </div>
                                  )}
                                  {property.area !== null && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Ruler className="w-4 h-4" />
                                      <span>{property.area}m²</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <span className="text-xl sm:text-2xl font-bold" style={{ color: tenant.primaryColor }}>
                                      {formatPrice(property.price)}
                                    </span>
                                    {property.category === 'rent' && (
                                      <span className="text-xs sm:text-sm text-muted-foreground">/mês</span>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="group-hover:bg-primary group-hover:text-white transition-colors shrink-0"
                                  >
                                    Ver mais
                                    <ArrowRight className="w-4 h-4 ml-1" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-10"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Próxima
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 bg-muted/30 rounded-lg">
                    <Home className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Nenhum imóvel encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Tente ajustar os filtros de busca para encontrar mais opções
                    </p>
                    {activeFiltersCount > 0 && (
                      <Button variant="outline" onClick={clearAllFilters}>
                        Limpar todos os filtros
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-10 sm:py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 font-heading font-bold text-xl sm:text-2xl text-white mb-3 sm:mb-4">
                {tenant.logo ? (
                  <img src={tenant.logo} alt={tenant.name} className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
                ) : (
                  <Building className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
                <span className="truncate">{tenant.name}</span>
              </div>
              <p className="text-sm opacity-70">
                Sua parceira de confiança no mercado imobiliário.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Links Rápidos</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href={`/e/${tenantSlug}`}>
                    <a className="hover:text-white transition-colors">Início</a>
                  </Link>
                </li>
                <li>
                  <Link href={`/e/${tenantSlug}/imoveis`}>
                    <a className="hover:text-white transition-colors">Todos os Imóveis</a>
                  </Link>
                </li>
                <li>
                  <a href={`/e/${tenantSlug}#sobre`} className="hover:text-white transition-colors">Sobre Nós</a>
                </li>
                <li>
                  <a href={`/e/${tenantSlug}#contato`} className="hover:text-white transition-colors">Contato</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Contato</h4>
              <ul className="space-y-2 text-sm">
                {tenant.phone && (
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0" />
                    <a href={`tel:${tenant.phone}`} className="hover:text-white transition-colors">{tenant.phone}</a>
                  </li>
                )}
                {tenant.email && (
                  <li className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a href={`mailto:${tenant.email}`} className="hover:text-white transition-colors truncate">{tenant.email}</a>
                  </li>
                )}
                {tenant.address && (
                  <li className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="break-words">{tenant.address}</span>
                  </li>
                )}
              </ul>
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Categorias</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => {setCategoryFilter("sale"); window.scrollTo(0, 0);}}
                    className="hover:text-white transition-colors text-left"
                  >
                    Imóveis à Venda
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {setCategoryFilter("rent"); window.scrollTo(0, 0);}}
                    className="hover:text-white transition-colors text-left"
                  >
                    Imóveis para Alugar
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-xs opacity-50">
            <p>&copy; {new Date().getFullYear()} {tenant.name}. Todos os direitos reservados.</p>
            <p className="mt-1">Powered by <a href="/" className="hover:text-white">ImobiBase</a></p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      {tenant.phone && (
        <a
          href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform z-50"
          style={{ backgroundColor: "#25D366" }}
          aria-label="Falar no WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
