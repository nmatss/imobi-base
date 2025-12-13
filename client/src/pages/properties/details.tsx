import { useRoute, Link } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, MapPin, BedDouble, Bath, Ruler, Edit, Share2, MoreVertical, Calendar } from "lucide-react";

export default function PropertyDetailsPage() {
  const [match, params] = useRoute("/properties/:id");
  const { properties, leads } = useImobi();
  
  const propertyId = params?.id;
  const property = properties.find(p => p.id === propertyId);
  const interestedLeads = leads.filter(l => l.interest === propertyId || l.budget && Math.abs(l.budget - (property?.price || 0)) < 100000);

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h2 className="text-2xl font-bold mb-2">Imóvel não encontrado</h2>
        <Link href="/properties">
          <Button variant="link">Voltar para a lista</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3">
            {property.title}
            <Badge variant="secondary" className="font-normal text-sm">
              {property.status === 'active' ? 'Ativo' : property.status}
            </Badge>
          </h1>
          <p className="text-muted-foreground flex items-center text-sm">
            <MapPin className="w-3 h-3 mr-1" />
            {property.address}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" /> Compartilhar
          </Button>
          <Button className="gap-2">
            <Edit className="w-4 h-4" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video rounded-xl overflow-hidden shadow-sm border bg-muted">
            <img 
              src={property.image} 
              alt={property.title} 
              className="w-full h-full object-cover"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Imóvel</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1 p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Valor</span>
                <span className="text-lg font-bold text-primary">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                </span>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Área Útil</span>
                <div className="flex items-center gap-1 font-medium">
                  <Ruler className="w-4 h-4 text-muted-foreground" />
                  {property.sqm} m²
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Dormitórios</span>
                <div className="flex items-center gap-1 font-medium">
                  <BedDouble className="w-4 h-4 text-muted-foreground" />
                  {property.beds}
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3 bg-secondary/30 rounded-lg">
                <span className="text-xs text-muted-foreground">Banheiros</span>
                <div className="flex items-center gap-1 font-medium">
                  <Bath className="w-4 h-4 text-muted-foreground" />
                  {property.baths}
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">Descrição</TabsTrigger>
              <TabsTrigger value="features">Características</TabsTrigger>
              <TabsTrigger value="documents">Documentos</TabsTrigger>
            </TabsList>
            <TabsContent value="description" className="mt-4 p-4 border rounded-lg bg-card">
              <p className="text-muted-foreground leading-relaxed">
                {property.description}
                <br /><br />
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
            </TabsContent>
            <TabsContent value="features" className="mt-4 p-4 border rounded-lg bg-card">
              <div className="grid grid-cols-2 gap-2">
                {['Piscina', 'Churrasqueira', 'Portaria 24h', 'Academia', 'Salão de Festas', 'Varanda Gourmet'].map(feat => (
                  <div key={feat} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {feat}
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                <p>Nenhum documento anexado</p>
                <Button variant="link">Fazer upload</Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads Interessados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {interestedLeads.length > 0 ? (
                interestedLeads.map(lead => (
                  <div key={lead.id} className="flex items-center justify-between group">
                    <div>
                      <p className="font-medium text-sm">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.status}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum lead vinculado diretamente.</p>
              )}
              <Button variant="outline" className="w-full text-xs" size="sm">
                Ver todos os leads
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de Visitas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-l-2 border-muted pl-4 space-y-4">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary" />
                  <p className="text-xs text-muted-foreground mb-0.5">Hoje, 14:00</p>
                  <p className="text-sm font-medium">Visita agendada com João Silva</p>
                </div>
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground mb-0.5">Ontem, 10:00</p>
                  <p className="text-sm font-medium">Fotos profissionais realizadas</p>
                </div>
              </div>
              <Button className="w-full mt-4 gap-2" variant="secondary">
                <Calendar className="w-4 h-4" /> Agendar Visita
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
