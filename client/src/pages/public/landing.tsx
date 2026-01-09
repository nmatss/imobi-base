import React, { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, Mail, ArrowRight, BedDouble, Bath, Ruler, Check, Building, Loader2, Search, Filter, Menu, X, MessageCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export default function TenantLanding() {
  const [match, params] = useRoute("/e/:rest*");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterSuccess, setNewsletterSuccess] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail || !tenant) return;

    setNewsletterLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail, tenantId: tenant.id }),
      });
      if (res.ok) {
        setNewsletterSuccess(true);
        setNewsletterEmail("");
        setTimeout(() => setNewsletterSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Newsletter subscription failed:", err);
    } finally {
      setNewsletterLoading(false);
    }
  };

  // Filter properties
  const filteredProperties = properties.filter(property => {
    if (categoryFilter !== "all" && property.category !== categoryFilter) return false;
    if (typeFilter !== "all" && property.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        property.title.toLowerCase().includes(query) ||
        property.address.toLowerCase().includes(query) ||
        property.city.toLowerCase().includes(query)
      );
    }
    return true;
  });

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

  function formatPrice(price: string) {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  }

  const typeLabels: Record<string, string> = {
    house: "Casa",
    apartment: "Apartamento",
    land: "Terreno",
    commercial: "Comercial",
  };

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{
      '--primary': tenant.primaryColor,
      '--secondary': tenant.secondaryColor
    } as any}>
      {/* SEO Meta Tags */}
      <Helmet>
        <title>{tenant.name} - Imóveis de qualidade</title>
        <meta name="description" content={`Encontre o imóvel perfeito com ${tenant.name}. Apartamentos, casas, terrenos e imóveis comerciais.`} />
        <meta property="og:title" content={`${tenant.name} - Imóveis de qualidade`} />
        <meta property="og:description" content={`Encontre o imóvel perfeito com ${tenant.name}.`} />
        <meta property="og:type" content="website" />
        {tenant.logo && <meta property="og:image" content={tenant.logo} />}
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-lg sm:text-2xl" style={{ color: tenant.primaryColor }}>
            {tenant.logo ? (
              <img src={tenant.logo} alt={tenant.name} className="h-8 w-8 sm:h-10 sm:w-10 object-contain" />
            ) : (
              <Building className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
            <span className="truncate max-w-[150px] sm:max-w-none">{tenant.name}</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#" className="hover:text-primary transition-colors">Início</a>
            <Link href={`/e/${tenantSlug}/imoveis`}>
              <a className="hover:text-primary transition-colors">Imóveis</a>
            </Link>
            <a href="#sobre" className="hover:text-primary transition-colors">Sobre</a>
            <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Área do Corretor</Button>
            </Link>
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
              <a
                href="#"
                className="py-2 px-3 rounded-md hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Início
              </a>
              <Link href={`/e/${tenantSlug}/imoveis`}>
                <a
                  className="py-2 px-3 rounded-md hover:bg-muted transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Imóveis
                </a>
              </Link>
              <a
                href="#sobre"
                className="py-2 px-3 rounded-md hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sobre
              </a>
              <a
                href="#contato"
                className="py-2 px-3 rounded-md hover:bg-muted transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contato
              </a>
              <div className="border-t pt-3 mt-1 flex flex-col gap-2">
                <Link href="/login">
                  <Button variant="outline" size="sm" className="w-full">Área do Corretor</Button>
                </Link>
                {tenant.phone && (
                  <a href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className="w-full" style={{ backgroundColor: tenant.primaryColor }}>
                      <Phone className="h-4 w-4 mr-2" />
                      Falar no WhatsApp
                    </Button>
                  </a>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[400px] sm:min-h-[450px] md:h-[500px] flex items-center justify-center bg-muted overflow-hidden py-12 sm:py-16">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=2000"
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-20 container mx-auto px-4 text-center text-white">
            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-4 sm:mb-6 drop-shadow-lg leading-tight">
              Encontre o imóvel dos seus sonhos
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 max-w-2xl mx-auto drop-shadow-md opacity-90 px-2">
              As melhores opções de compra e aluguel você encontra na {tenant.name}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
              <Link href={`/e/${tenantSlug}/imoveis`}>
                <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 bg-white text-black hover:bg-white/90 border-none w-full sm:w-auto">
                  Ver Imóveis
                </Button>
              </Link>
              <a href="#contato" className="w-full sm:w-auto">
                <Button size="lg" className="text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 w-full sm:w-auto" style={{ backgroundColor: tenant.primaryColor }}>
                  Fale Conosco
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* Properties Grid */}
        <section id="imoveis" className="py-12 sm:py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 sm:mb-8 gap-3 sm:gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold mb-1 sm:mb-2">Imóveis Disponíveis</h2>
                <p className="text-sm sm:text-base text-muted-foreground">{filteredProperties.length} imóveis encontrados</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 p-3 sm:p-4 bg-muted/50 rounded-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, endereço ou cidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  <SelectItem value="sale">Venda</SelectItem>
                  <SelectItem value="rent">Aluguel</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos tipos</SelectItem>
                  <SelectItem value="house">Casa</SelectItem>
                  <SelectItem value="apartment">Apartamento</SelectItem>
                  <SelectItem value="land">Terreno</SelectItem>
                  <SelectItem value="commercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {filteredProperties.map(property => (
                  <div key={property.id} data-testid={`card-property-${property.id}`} className="group rounded-xl overflow-hidden border bg-card hover:shadow-xl transition-all duration-300">
                    <Link href={`/e/${tenantSlug}/imovel/${property.id}`}>
                      <div className="relative aspect-[4/3] overflow-hidden cursor-pointer">
                        <img
                          src={property.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                          alt={property.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 flex gap-1.5 sm:gap-2 flex-wrap">
                          <Badge className="bg-white/90 text-black backdrop-blur-sm shadow-sm hover:bg-white text-xs sm:text-sm">
                            {property.category === 'sale' ? 'Venda' : 'Aluguel'}
                          </Badge>
                          <Badge variant="secondary" className="backdrop-blur-sm text-xs sm:text-sm">
                            {typeLabels[property.type] || property.type}
                          </Badge>
                        </div>
                        {property.featured && (
                          <Badge className="absolute top-2 sm:top-4 right-2 sm:right-4 text-xs sm:text-sm" style={{ backgroundColor: tenant.primaryColor }}>
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </Link>
                    <div className="p-4 sm:p-6">
                      <Link href={`/e/${tenantSlug}/imovel/${property.id}`}>
                        <h3 className="text-lg sm:text-xl font-heading font-bold mb-1 sm:mb-2 group-hover:text-primary transition-colors line-clamp-1 cursor-pointer">
                          {property.title}
                        </h3>
                      </Link>
                      <p className="text-muted-foreground flex items-center mb-3 sm:mb-4 text-xs sm:text-sm">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 flex-shrink-0" />
                        <span className="line-clamp-1">{property.address}, {property.city}</span>
                      </p>
                      <div className="flex items-center justify-between py-3 sm:py-4 border-t border-b mb-3 sm:mb-4">
                        {property.bedrooms !== null && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                            <BedDouble className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>{property.bedrooms}</span>
                          </div>
                        )}
                        {property.bathrooms !== null && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                            <Bath className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>{property.bathrooms}</span>
                          </div>
                        )}
                        {property.area !== null && (
                          <div className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground">
                            <Ruler className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>{property.area}m²</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-lg sm:text-2xl font-bold truncate" style={{ color: tenant.primaryColor }}>
                          {formatPrice(property.price)}
                          {property.category === 'rent' && <span className="text-xs sm:text-sm font-normal text-muted-foreground">/mês</span>}
                        </span>
                        <Link href={`/e/${tenantSlug}/imovel/${property.id}`}>
                          <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors border-primary/20 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3 shrink-0">
                            <span className="hidden sm:inline">Detalhes</span>
                            <ArrowRight className="w-4 h-4 sm:ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Building className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">Nenhum imóvel encontrado</h3>
                <p className="text-muted-foreground">Tente ajustar os filtros de busca</p>
              </div>
            )}
          </div>
        </section>

        {/* Features / Why Us */}
        <section id="sobre" className="py-20" style={{ backgroundColor: `${tenant.secondaryColor}10` }}>
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-heading font-bold mb-6">Por que escolher a {tenant.name}?</h2>
                <div className="space-y-4">
                  {[
                    "Atendimento personalizado e exclusivo",
                    "Ampla carteira de imóveis selecionados",
                    "Assessoria jurídica completa",
                    "Transparência e segurança no negócio"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.primaryColor}20` }}>
                        <Check className="w-4 h-4" style={{ color: tenant.primaryColor }} />
                      </div>
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <a href="#contato">
                  <Button className="mt-8" size="lg" style={{ backgroundColor: tenant.primaryColor }}>
                    Entre em contato
                  </Button>
                </a>
              </div>
              <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1000"
                  alt="Office"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="contato" className="bg-slate-900 text-slate-300 py-10 sm:py-12">
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
                    <Link href={`/e/${tenantSlug}/imoveis`}>
                      <a className="hover:text-white transition-colors">Todos os Imóveis</a>
                    </Link>
                  </li>
                  <li><a href="#imoveis" className="hover:text-white transition-colors">Imóveis em Destaque</a></li>
                  <li><a href="#contato" className="hover:text-white transition-colors">Anuncie seu Imóvel</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Contato</h4>
                <ul className="space-y-2 text-sm">
                  {tenant.phone && (
                    <li className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0"/>
                      <a href={`tel:${tenant.phone}`} className="hover:text-white transition-colors">{tenant.phone}</a>
                    </li>
                  )}
                  {tenant.email && (
                    <li className="flex items-center gap-2">
                      <Mail className="w-4 h-4 shrink-0"/>
                      <a href={`mailto:${tenant.email}`} className="hover:text-white transition-colors truncate">{tenant.email}</a>
                    </li>
                  )}
                  {tenant.address && (
                    <li className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5"/>
                      <span className="break-words">{tenant.address}</span>
                    </li>
                  )}
                </ul>
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <h4 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base">Newsletter</h4>
                <p className="text-sm opacity-70 mb-3">Receba novidades de imóveis no seu e-mail</p>
                <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="email"
                    placeholder="Seu e-mail"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 h-10"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={newsletterLoading}
                    className="h-10 px-6 sm:px-4 shrink-0"
                    style={{ backgroundColor: tenant.primaryColor }}
                  >
                    {newsletterLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Inscrever"}
                  </Button>
                </form>
                {newsletterSuccess && (
                  <p className="text-green-400 text-sm mt-2">Inscrito com sucesso!</p>
                )}
              </div>
            </div>
            <div className="border-t border-slate-800 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center text-xs opacity-50">
              <p>&copy; {new Date().getFullYear()} {tenant.name}. Todos os direitos reservados.</p>
              <p className="mt-1">Powered by <a href="/" className="hover:text-white">ImobiBase</a></p>
            </div>
          </div>
        </footer>
      </main>

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
