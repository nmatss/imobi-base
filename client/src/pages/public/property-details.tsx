import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import InterestForm from "@/components/public/InterestForm";
import {
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Car,
  ArrowLeft,
  Phone,
  Mail,
  Building,
  Loader2,
  Share2,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Home,
  ChevronDown,
  ChevronUp,
  Shield,
  Wifi,
  Dumbbell,
  TreePine,
  Calculator,
} from "lucide-react";

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
  zipCode: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  parkingSpots?: number | null;
  condoFee?: string | null;
  iptu?: string | null;
  features: string[] | null;
  images: string[] | null;
  status: string;
  featured: boolean;
};

export default function PropertyDetails() {
  const [match, params] = useRoute("/e/:slug/imovel/:propertyId");
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);

  const slug = (params as any)?.slug || "";
  const propertyId = (params as any)?.propertyId || "";

  useEffect(() => {
    if (!slug || !propertyId) return;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch tenant by slug
        const tenantRes = await fetch(`/api/tenants/slug/${slug}`);
        if (!tenantRes.ok) {
          setError("Imobiliária não encontrada");
          setLoading(false);
          return;
        }
        const tenantData = await tenantRes.json();
        setTenant(tenantData);

        // Fetch property details
        const propertyRes = await fetch(`/api/properties/public/${tenantData.id}/${propertyId}`);
        if (!propertyRes.ok) {
          setError("Imóvel não encontrado");
          setLoading(false);
          return;
        }
        const propertyData = await propertyRes.json();
        setProperty(propertyData);

        // Set page title and meta tags for SEO
        document.title = `${propertyData.title} - ${tenantData.name}`;

        // Set meta description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
          metaDescription.setAttribute('content',
            `${propertyData.title} - ${categoryLabels[propertyData.category]} por ${formatPrice(propertyData.price)}. ${propertyData.city}, ${propertyData.state}. ${tenantData.name}`
          );
        }

        // Set Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', `${propertyData.title} - ${tenantData.name}`);

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) ogDescription.setAttribute('content', propertyData.description || `${propertyData.title} em ${propertyData.city}`);

        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage && propertyData.images?.[0]) ogImage.setAttribute('content', propertyData.images[0]);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', window.location.href);

        // Fetch similar properties
        const similarRes = await fetch(
          `/api/properties/public/${tenantData.id}?limit=3&type=${propertyData.type}&category=${propertyData.category}&exclude=${propertyId}`
        );
        if (similarRes.ok) {
          const similarData = await similarRes.json();
          setSimilarProperties(similarData.slice(0, 3));
        }
      } catch (err) {
        setError("Erro ao carregar dados");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug, propertyId]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: property?.title,
          text: `Confira este imóvel: ${property?.title}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Erro ao compartilhar:", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado para a área de transferência!");
    }
  };

  const handleWhatsApp = () => {
    if (!tenant?.phone || !property) return;
    const message = `Olá! Tenho interesse no imóvel: ${property.title} - ${window.location.href}`;
    const url = `https://wa.me/${tenant.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
  };

  const typeLabels: Record<string, string> = {
    house: "Casa",
    apartment: "Apartamento",
    land: "Terreno",
    commercial: "Comercial",
  };

  const categoryLabels: Record<string, string> = {
    sale: "Venda",
    rent: "Aluguel",
  };

  // Feature categorization
  const categorizeFeatures = (features: string[]) => {
    const categories = {
      estrutura: [] as string[],
      lazer: [] as string[],
      seguranca: [] as string[],
      outros: [] as string[],
    };

    const estruturaKeywords = ['cozinha', 'banheiro', 'quarto', 'sala', 'closet', 'varanda', 'sacada', 'churrasqueira', 'despensa', 'lavabo'];
    const lazerKeywords = ['piscina', 'academia', 'quadra', 'playground', 'salão', 'festa', 'jardim', 'sauna', 'cinema', 'jogos', 'espaço gourmet'];
    const segurancaKeywords = ['portaria', 'segurança', 'portão', 'eletrônico', 'câmera', 'alarme', 'cerca', 'vigilância'];

    features.forEach(feature => {
      const lowerFeature = feature.toLowerCase();
      if (estruturaKeywords.some(kw => lowerFeature.includes(kw))) {
        categories.estrutura.push(feature);
      } else if (lazerKeywords.some(kw => lowerFeature.includes(kw))) {
        categories.lazer.push(feature);
      } else if (segurancaKeywords.some(kw => lowerFeature.includes(kw))) {
        categories.seguranca.push(feature);
      } else {
        categories.outros.push(feature);
      }
    });

    return categories;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tenant || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground mb-4">{error || "Imóvel não encontrado."}</p>
          <Link href={`/e/${slug}`}>
            <Button variant="link">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para o catálogo
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const images = property.images && property.images.length > 0
    ? property.images
    : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200"];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href={`/e/${slug}`}>
            <div className="flex items-center gap-2 font-heading font-bold text-lg cursor-pointer hover:opacity-80 transition-opacity" style={{ color: tenant.primaryColor }}>
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-8 w-8 object-contain" />
              ) : (
                <Building className="h-5 w-5" />
              )}
              <span>{tenant.name}</span>
            </div>
          </Link>

          <Link href={`/e/${slug}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 pb-20 sm:pb-0">
        {/* Breadcrumb */}
        <div className="bg-muted/30 border-b">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground overflow-x-auto">
              <Link href={`/e/${slug}`}>
                <a className="hover:text-foreground transition-colors flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Início
                </a>
              </Link>
              <span>/</span>
              <span>Imóveis</span>
              <span>/</span>
              <span className="text-foreground font-medium truncate">{typeLabels[property?.type || ''] || 'Imóvel'}</span>
              <span className="hidden sm:inline">/</span>
              <span className="text-foreground font-medium truncate hidden sm:inline">{property?.title}</span>
            </nav>
          </div>
        </div>

        {/* Image Gallery */}
        <section className="relative">
          <div className="relative aspect-[4/3] sm:aspect-[16/9] h-auto md:h-[500px] lg:h-[600px] bg-muted overflow-hidden">
            <img
              src={images[currentImageIndex]}
              alt={property.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setLightboxOpen(true)}
              loading="eager"
            />

            {images.length > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={prevImage}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={nextImage}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
                  {currentImageIndex + 1} / {images.length}
                </div>
              </>
            )}
          </div>

          {/* Image Thumbnails */}
          {images.length > 1 && (
            <div className="container mx-auto px-4 py-4">
              <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                      idx === currentImageIndex ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Imagem ${idx + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Property Details */}
        <section className="container mx-auto px-4 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge className="bg-white text-black border">
                    {categoryLabels[property.category] || property.category}
                  </Badge>
                  <Badge variant="secondary">
                    {typeLabels[property.type] || property.type}
                  </Badge>
                  {property.featured && (
                    <Badge style={{ backgroundColor: tenant.primaryColor }}>Destaque</Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3">
                  {property.title}
                </h1>

                <p className="text-muted-foreground flex items-center gap-1 mb-4">
                  <MapPin className="w-5 h-5 flex-shrink-0" />
                  {property.address}, {property.city} - {property.state}
                  {property.zipCode && ` - CEP: ${property.zipCode}`}
                </p>

                <div className="space-y-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-4xl font-bold" style={{ color: tenant.primaryColor }}>
                      {formatPrice(property.price)}
                    </span>
                    {property.category === "rent" && (
                      <span className="text-lg text-muted-foreground">/mês</span>
                    )}
                  </div>

                  {/* Additional Fees */}
                  {(property.condoFee || property.iptu) && (
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {property.condoFee && (
                        <span>Condomínio: {formatPrice(property.condoFee)}</span>
                      )}
                      {property.iptu && (
                        <span>IPTU: {formatPrice(property.iptu)}</span>
                      )}
                    </div>
                  )}

                  {/* Financing Calculator Link */}
                  {property.category === "sale" && (
                    <Button variant="link" className="h-auto p-0 text-primary" asChild>
                      <a href="#" onClick={(e) => { e.preventDefault(); alert('Calculadora de financiamento em breve!'); }}>
                        <Calculator className="h-4 w-4 mr-1" />
                        Simular financiamento
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              {/* Characteristics - Key Specs Bar */}
              <div>
                <h2 className="text-xl font-heading font-bold mb-4">Características</h2>
                <div className="flex overflow-x-auto gap-3 pb-2 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible">
                  {property.bedrooms !== null && (
                    <div className="flex flex-col items-center p-3 min-w-[80px] sm:min-w-0 sm:flex-row sm:items-start gap-3 sm:p-4 rounded-lg bg-muted/50 flex-shrink-0">
                      <BedDouble className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-muted-foreground">Quartos</p>
                        <p className="font-semibold">{property.bedrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.bathrooms !== null && (
                    <div className="flex flex-col items-center p-3 min-w-[80px] sm:min-w-0 sm:flex-row sm:items-start gap-3 sm:p-4 rounded-lg bg-muted/50 flex-shrink-0">
                      <Bath className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-muted-foreground">Banheiros</p>
                        <p className="font-semibold">{property.bathrooms}</p>
                      </div>
                    </div>
                  )}
                  {property.area !== null && (
                    <div className="flex flex-col items-center p-3 min-w-[80px] sm:min-w-0 sm:flex-row sm:items-start gap-3 sm:p-4 rounded-lg bg-muted/50 flex-shrink-0">
                      <Ruler className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-muted-foreground">Área</p>
                        <p className="font-semibold">{property.area}m²</p>
                      </div>
                    </div>
                  )}
                  {property.parkingSpots !== null && property.parkingSpots !== undefined && (
                    <div className="flex flex-col items-center p-3 min-w-[80px] sm:min-w-0 sm:flex-row sm:items-start gap-3 sm:p-4 rounded-lg bg-muted/50 flex-shrink-0">
                      <Car className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                      <div className="text-center sm:text-left">
                        <p className="text-sm text-muted-foreground">Vagas</p>
                        <p className="font-semibold">{property.parkingSpots}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Description with Expand/Collapse */}
              {property.description && (
                <>
                  <div>
                    <h2 className="text-xl font-heading font-bold mb-4">Descrição</h2>
                    <div className="relative">
                      <p className={`text-muted-foreground whitespace-pre-wrap leading-relaxed ${!descriptionExpanded && property.description.length > 300 ? 'line-clamp-4' : ''}`}>
                        {property.description}
                      </p>
                      {property.description.length > 300 && (
                        <Button
                          variant="link"
                          className="h-auto p-0 mt-2"
                          onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        >
                          {descriptionExpanded ? (
                            <>
                              Ver menos <ChevronUp className="ml-1 h-4 w-4" />
                            </>
                          ) : (
                            <>
                              Ver mais <ChevronDown className="ml-1 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Features - Categorized */}
              {property.features && property.features.length > 0 && (() => {
                const categorizedFeatures = categorizeFeatures(property.features);
                return (
                  <>
                    <div>
                      <h2 className="text-xl font-heading font-bold mb-4">Comodidades</h2>
                      <div className="space-y-6">
                        {categorizedFeatures.estrutura.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Building className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">Estrutura</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {categorizedFeatures.estrutura.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tenant.primaryColor }} />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {categorizedFeatures.lazer.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Dumbbell className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">Lazer</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {categorizedFeatures.lazer.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tenant.primaryColor }} />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {categorizedFeatures.seguranca.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <Shield className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">Segurança</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {categorizedFeatures.seguranca.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tenant.primaryColor }} />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {categorizedFeatures.outros.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <TreePine className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold text-lg">Outros</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {categorizedFeatures.outros.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tenant.primaryColor }} />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <Separator />
                  </>
                );
              })()}

              {/* Location Section */}
              <div>
                <h2 className="text-xl font-heading font-bold mb-4">Localização</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{property.address}</p>
                      <p className="text-sm">{property.city} - {property.state}</p>
                      {property.zipCode && <p className="text-sm">CEP: {property.zipCode}</p>}
                    </div>
                  </div>

                  {/* Embedded Map */}
                  <div className="aspect-video w-full rounded-lg overflow-hidden border bg-muted">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(`${property.address}, ${property.city}, ${property.state}`)}`}
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    * A localização exata será informada após o agendamento da visita
                  </p>
                </div>
              </div>

              <Separator />

              {/* Share Buttons */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleShare} className="flex-1">
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartilhar
                </Button>
                {tenant.phone && (
                  <Button
                    onClick={handleWhatsApp}
                    className="flex-1"
                    style={{ backgroundColor: "#25D366" }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                )}
              </div>
            </div>

            {/* Sidebar - Sticky on Desktop */}
            <div className="space-y-6">
              <div className="hidden sm:block sticky top-24 space-y-4">
                {/* Interest Form */}
                <div className="p-4 sm:p-6 rounded-xl border bg-card">
                  <InterestForm
                    propertyId={property.id}
                    tenantId={tenant.id}
                    propertyTitle={property.title}
                  />
                </div>

                {/* Contact Info */}
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h3 className="font-heading font-bold text-lg mb-4">Informações de Contato</h3>
                    {tenant.phone && (
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        asChild
                      >
                        <a href={`tel:${tenant.phone}`}>
                          <Phone className="mr-2 h-4 w-4" />
                          {tenant.phone}
                        </a>
                      </Button>
                    )}
                    {tenant.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${tenant.email}`} className="hover:underline">
                          {tenant.email}
                        </a>
                      </div>
                    )}
                    {tenant.address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                        <span>{tenant.address}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Similar Properties - Horizontal Scroll Carousel */}
        {similarProperties.length > 0 && (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl md:text-3xl font-heading font-bold mb-8">Imóveis Similares</h2>
              <div className="flex overflow-x-auto gap-6 pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                {similarProperties.map((prop) => (
                  <Link key={prop.id} href={`/e/${slug}/imovel/${prop.id}`}>
                    <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 w-[280px] md:w-auto flex-shrink-0 snap-start">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-t-xl">
                        <img
                          src={prop.images?.[0] || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"}
                          alt={prop.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                        <Badge className="absolute top-3 left-3 bg-white/90 text-black">
                          {categoryLabels[prop.category]}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-heading font-bold mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                          {prop.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                          <MapPin className="w-3 h-3 inline mr-1" />
                          {prop.city} - {prop.state}
                        </p>
                        <p className="text-xl font-bold" style={{ color: tenant.primaryColor }}>
                          {formatPrice(prop.price)}
                          {prop.category === "rent" && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
            onClick={prevImage}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <img
            src={images[currentImageIndex]}
            alt={property.title}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
            onClick={nextImage}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
            {currentImageIndex + 1} / {images.length}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom CTA Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:hidden z-40 shadow-lg">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowContactForm(!showContactForm)}
          >
            <Mail className="mr-2 h-4 w-4" />
            Contato
          </Button>
          {tenant.phone && (
            <Button
              onClick={handleWhatsApp}
              className="flex-1"
              style={{ backgroundColor: "#25D366", color: "white" }}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          )}
          {tenant.phone && (
            <Button
              variant="outline"
              size="icon"
              asChild
            >
              <a href={`tel:${tenant.phone}`}>
                <Phone className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 z-50 bg-black/50 sm:hidden" onClick={() => setShowContactForm(false)}>
          <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold">Entre em contato</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowContactForm(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <InterestForm
              propertyId={property.id}
              tenantId={tenant.id}
              propertyTitle={property.title}
            />
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button - Desktop Only */}
      {tenant.phone && (
        <button
          onClick={handleWhatsApp}
          className="hidden sm:flex fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg items-center justify-center text-white hover:scale-110 transition-transform z-40"
          style={{ backgroundColor: "#25D366" }}
          aria-label="Falar no WhatsApp"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
