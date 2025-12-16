import { useState, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  Ruler,
  Edit,
  Share2,
  MoreVertical,
  Calendar,
  Home,
  User,
  Phone,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  Image as ImageIcon,
  Star,
  StarOff,
  Copy,
  Check,
  Camera,
  Heart,
  ExternalLink,
  Clock,
  DollarSign,
  Building2,
  CarFront,
  Maximize,
  Sparkles,
  TrendingUp,
  Eye,
  Video
} from "lucide-react";
import { PropertyLocationMap } from "@/components/maps/PropertyMap";
import { VirtualTourPlayer } from "@/components/properties/VirtualTourPlayer";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==================== HELPER FUNCTIONS ====================

function formatCurrency(value: string | number | null | undefined): string {
  if (!value) return "R$ -";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "R$ -";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(num);
}

function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    available: { label: "Disponível", variant: "default" },
    active: { label: "Ativo", variant: "default" },
    sold: { label: "Vendido", variant: "secondary" },
    rented: { label: "Alugado", variant: "secondary" },
    reserved: { label: "Reservado", variant: "outline" },
    inactive: { label: "Inativo", variant: "destructive" },
  };
  return configs[status] || { label: status, variant: "outline" };
}

// ==================== MAIN COMPONENT ====================

export default function PropertyDetailsPage() {
  const [match, params] = useRoute("/properties/:id");
  const [, setLocation] = useLocation();
  const { properties, leads, visits } = useImobi();
  const { toast } = useToast();

  const propertyId = params?.id;
  const property = properties.find((p) => p.id === propertyId);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Share state
  const [copied, setCopied] = useState(false);

  // WhatsApp message state
  const [showWhatsAppSheet, setShowWhatsAppSheet] = useState(false);

  // Get property images or placeholder
  const images = property?.images && property.images.length > 0
    ? property.images
    : ["/placeholder.jpg"];

  // Related leads
  const propertyPrice = property?.price ? parseFloat(property.price) : 0;
  const interestedLeads = leads.filter((l) => {
    if (l.interests && Array.isArray(l.interests) && l.interests.includes(propertyId || "")) return true;
    if (l.budget) {
      const budget = parseFloat(l.budget);
      if (!isNaN(budget) && Math.abs(budget - propertyPrice) < 100000) return true;
    }
    if (l.preferredType && property?.type && l.preferredType === property.type) return true;
    if (l.preferredCity && property?.city && l.preferredCity === property.city) return true;
    return false;
  });

  // Related visits
  const propertyVisits = visits.filter((v) => v.propertyId === propertyId);
  const upcomingVisits = propertyVisits.filter((v) => v.status === "scheduled");
  const completedVisits = propertyVisits.filter((v) => v.status === "completed");

  // Open lightbox
  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  // Share property
  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Link copiado!", description: "O link do imóvel foi copiado para a área de transferência." });
    setTimeout(() => setCopied(false), 2000);
  }, [toast]);

  // Open WhatsApp with property info
  const openWhatsApp = useCallback((lead?: typeof leads[0], customMessage?: string) => {
    if (!property) return;

    const message = customMessage || `Olá! Gostaria de mais informações sobre o imóvel:\n\n*${property.title}*\n📍 ${property.address}, ${property.city}\n💰 ${formatCurrency(property.price)}\n🛏️ ${property.bedrooms || "-"} quartos | 🚿 ${property.bathrooms || "-"} banheiros | 📐 ${property.area || "-"}m²`;

    const phone = lead?.phone?.replace(/\D/g, "") || "";
    const formattedPhone = phone.startsWith("55") ? phone : `55${phone}`;
    const url = phone
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }, [property]);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] p-4">
        <Home className="w-12 h-12 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl sm:text-2xl font-bold mb-2">Imóvel não encontrado</h2>
        <p className="text-muted-foreground text-sm mb-4">O imóvel que você procura não existe ou foi removido.</p>
        <Link href="/properties">
          <Button variant="outline">Voltar para a lista</Button>
        </Link>
      </div>
    );
  }

  const statusConfig = getStatusConfig(property.status);

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/properties">
            <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-heading font-bold text-foreground truncate">
                {property.title}
              </h1>
              <Badge variant={statusConfig.variant} className="shrink-0">
                {statusConfig.label}
              </Badge>
              {property.featured && (
                <Badge className="bg-amber-500 shrink-0 gap-1">
                  <Star className="w-3 h-3" /> Destaque
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center text-xs sm:text-sm mt-1">
              <MapPin className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate">{property.address}, {property.city} - {property.state}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0 ml-12 sm:ml-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            onClick={handleShare}
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{copied ? "Copiado" : "Compartilhar"}</span>
          </Button>
          <Button size="sm" className="gap-1.5 h-9">
            <Edit className="w-4 h-4" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Gallery & Details */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Image Gallery */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Main Image */}
              <div
                className="relative aspect-[16/10] sm:aspect-video cursor-pointer group"
                onClick={() => openLightbox(0)}
              >
                <img
                  src={images[0]}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-3">
                    <Maximize className="w-6 h-6 text-foreground" />
                  </div>
                </div>

                {/* Image counter badge */}
                <Badge
                  variant="secondary"
                  className="absolute bottom-3 right-3 gap-1.5 bg-black/60 text-white border-0"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {images.length} {images.length === 1 ? "foto" : "fotos"}
                </Badge>

                {/* Cover badge */}
                {images.length > 0 && (
                  <Badge className="absolute top-3 left-3 bg-primary/90 gap-1">
                    <Star className="w-3 h-3" /> Capa
                  </Badge>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="p-2 sm:p-3 border-t">
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2">
                      {images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => openLightbox(idx)}
                          className={`
                            relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden
                            border-2 transition-all hover:opacity-100
                            ${idx === 0 ? "border-primary" : "border-transparent opacity-70 hover:border-primary/50"}
                          `}
                        >
                          <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                              <Star className="w-4 h-4 text-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Valor</span>
                </div>
                <span className="text-sm sm:text-lg font-bold text-primary block truncate">
                  {formatCurrency(property.price)}
                </span>
                {property.category && (
                  <span className="text-[10px] text-muted-foreground">{property.category}</span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Área</span>
                </div>
                <span className="text-sm sm:text-lg font-bold">
                  {property.area || "-"} m²
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <BedDouble className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Quartos</span>
                </div>
                <span className="text-sm sm:text-lg font-bold">
                  {property.bedrooms || "-"}
                </span>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bath className="w-4 h-4 text-muted-foreground" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">Banheiros</span>
                </div>
                <span className="text-sm sm:text-lg font-bold">
                  {property.bathrooms || "-"}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start bg-muted/50 h-auto p-1 flex-wrap">
              <TabsTrigger value="description" className="text-xs sm:text-sm">
                Descrição
              </TabsTrigger>
              <TabsTrigger value="features" className="text-xs sm:text-sm">
                Características
              </TabsTrigger>
              <TabsTrigger value="location" className="text-xs sm:text-sm">
                Localização
              </TabsTrigger>
              <TabsTrigger value="tour" className="text-xs sm:text-sm">
                <Video className="w-3 h-3 mr-1" />
                Tour 360°
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs sm:text-sm">
                Documentos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-semibold mb-3">Sobre o Imóvel</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
                    {property.description || "Sem descrição disponível."}
                  </p>

                  <Separator className="my-4" />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs">Tipo</span>
                      <p className="font-medium">{property.type || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Categoria</span>
                      <p className="font-medium">{property.category || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Cidade</span>
                      <p className="font-medium">{property.city || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Estado</span>
                      <p className="font-medium">{property.state || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="mt-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-semibold mb-3">Características</h3>
                  {property.features && property.features.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {property.features.map((feat, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/30 rounded-lg"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma característica cadastrada.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="location" className="mt-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-semibold mb-3">Localização</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{property.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {property.city} - {property.state}
                          {property.zipCode && `, CEP: ${property.zipCode}`}
                        </p>
                      </div>
                    </div>

                    {property.latitude && property.longitude ? (
                      <PropertyLocationMap
                        latitude={property.latitude}
                        longitude={property.longitude}
                        title={property.title}
                        height="300px"
                      />
                    ) : (
                      <div className="aspect-video rounded-lg bg-muted/50 flex items-center justify-center border border-dashed">
                        <div className="text-center p-4">
                          <MapPin className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Coordenadas não cadastradas
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tour" className="mt-4">
              <VirtualTourPlayer propertyId={property.id} editable={false} />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                    <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum documento anexado</p>
                    <Button variant="link" size="sm" className="mt-2">
                      Fazer upload
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Actions Card */}
          <Card className="bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => openWhatsApp()}
              >
                <MessageSquare className="w-4 h-4" />
                Compartilhar via WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setLocation("/calendar")}
              >
                <Calendar className="w-4 h-4" />
                Agendar Visita
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => setLocation("/contracts")}
              >
                <DollarSign className="w-4 h-4" />
                Criar Proposta
              </Button>
            </CardContent>
          </Card>

          {/* Interested Leads */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Leads Interessados
                </span>
                <Badge variant="secondary">{interestedLeads.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interestedLeads.length > 0 ? (
                <div className="space-y-3">
                  {interestedLeads.slice(0, 5).map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between group p-2 -mx-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {lead.budget ? formatCurrency(lead.budget) : "Orçamento não informado"}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openWhatsApp(lead)}
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setLocation("/leads")}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {interestedLeads.length > 5 && (
                    <Button
                      variant="ghost"
                      className="w-full text-xs"
                      onClick={() => setLocation("/leads")}
                    >
                      Ver todos ({interestedLeads.length})
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum lead compatível encontrado
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-1"
                    onClick={() => setLocation("/leads")}
                  >
                    Ver todos os leads
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visit History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Visitas
                </span>
                <div className="flex gap-1.5">
                  {upcomingVisits.length > 0 && (
                    <Badge variant="default" className="text-[10px]">
                      {upcomingVisits.length} agendada{upcomingVisits.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                  {completedVisits.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {completedVisits.length} realizada{completedVisits.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {propertyVisits.length > 0 ? (
                <div className="space-y-3">
                  <div className="border-l-2 border-muted pl-4 space-y-4">
                    {propertyVisits.slice(0, 5).map((visit) => {
                      const lead = leads.find((l) => l.id === visit.leadId);
                      const isUpcoming = visit.status === "scheduled";

                      return (
                        <div key={visit.id} className="relative">
                          <div
                            className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                              isUpcoming ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                            }`}
                          />
                          <p className="text-xs text-muted-foreground mb-0.5">
                            {format(new Date(visit.scheduledFor), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </p>
                          <p className="text-sm font-medium">
                            {isUpcoming ? "Visita agendada" : "Visita realizada"} com{" "}
                            {lead?.name || "Cliente"}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <Button
                    className="w-full gap-2"
                    variant="secondary"
                    onClick={() => setLocation("/calendar")}
                  >
                    <Calendar className="w-4 h-4" />
                    Agendar Nova Visita
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma visita registrada
                  </p>
                  <Button
                    className="w-full mt-3 gap-2"
                    variant="secondary"
                    onClick={() => setLocation("/calendar")}
                  >
                    <Calendar className="w-4 h-4" />
                    Agendar Visita
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Estatísticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Visualizações</span>
                  </div>
                  <span className="font-medium">-</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total de Visitas</span>
                  </div>
                  <span className="font-medium">{propertyVisits.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Leads Interessados</span>
                  </div>
                  <span className="font-medium">{interestedLeads.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">No mercado há</span>
                  </div>
                  <span className="font-medium">
                    {property.createdAt ? formatDistanceToNow(new Date(property.createdAt), {
                      locale: ptBR,
                    }) : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={images}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
