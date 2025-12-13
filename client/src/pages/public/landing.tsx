import { useRoute, Link } from "wouter";
import { useImobi } from "@/lib/imobi-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, ArrowRight, BedDouble, Bath, Ruler, Check, Building } from "lucide-react";

export default function TenantLanding() {
  const [match, params] = useRoute("/e/:rest*");
  const { tenants, properties } = useImobi();

  // Fix for wouter wildcard params type
  const rest = (params as any)?.rest || (params as any)?.["rest*"] || "";
  const tenantSlug = rest.split("/")[0];
  
  const tenant = tenants.find(t => t.slug === tenantSlug);
  const tenantProperties = properties.filter(p => p.tenantId === tenant?.id);

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p>Imobiliária não encontrada.</p>
          <Link href="/">
             <Button variant="link" className="mt-4">Voltar para o App</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ 
      '--primary': tenant.colors.primary, 
      '--secondary': tenant.colors.secondary 
    } as any}>
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-2xl" style={{ color: tenant.colors.primary }}>
            <Building className="h-6 w-6" />
            {tenant.name}
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#" className="hover:text-primary transition-colors">Início</a>
            <a href="#imoveis" className="hover:text-primary transition-colors">Imóveis</a>
            <a href="#sobre" className="hover:text-primary transition-colors">Sobre</a>
            <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
               <Button variant="ghost" size="sm">Área do Corretor</Button>
            </Link>
            <Button style={{ backgroundColor: tenant.colors.primary }}>
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[500px] flex items-center justify-center bg-muted overflow-hidden">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <img 
            src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-20 container mx-auto px-4 text-center text-white">
            <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6 drop-shadow-lg">
              Encontre o imóvel dos seus sonhos
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto drop-shadow-md opacity-90">
              As melhores opções de compra e aluguel você encontra na {tenant.name}.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 h-14 bg-white text-black hover:bg-white/90 border-none">
                Ver Imóveis
              </Button>
              <Button size="lg" className="text-lg px-8 h-14" style={{ backgroundColor: tenant.colors.primary }}>
                Fale Conosco
              </Button>
            </div>
          </div>
        </section>

        {/* Properties Grid */}
        <section id="imoveis" className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
              <div>
                <h2 className="text-3xl font-heading font-bold mb-2">Imóveis em Destaque</h2>
                <p className="text-muted-foreground">Confira nossa seleção exclusiva</p>
              </div>
              <Button variant="outline">Ver todos os imóveis</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tenantProperties.map(property => (
                <div key={property.id} className="group rounded-xl overflow-hidden border bg-card hover:shadow-xl transition-all duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img 
                      src={property.image} 
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-4 right-4 flex gap-2">
                       <Badge className="bg-white/90 text-black backdrop-blur-sm shadow-sm hover:bg-white">
                        {property.type === 'sale' ? 'Venda' : 'Aluguel'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-heading font-bold mb-2 group-hover:text-primary transition-colors">
                      {property.title}
                    </h3>
                    <p className="text-muted-foreground flex items-center mb-4 text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.address}
                    </p>
                    <div className="flex items-center justify-between py-4 border-t border-b mb-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <BedDouble className="w-4 h-4" />
                        <span>{property.beds}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Bath className="w-4 h-4" />
                        <span>{property.baths}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Ruler className="w-4 h-4" />
                        <span>{property.sqm}m²</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary" style={{ color: tenant.colors.primary }}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                      </span>
                      <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-white transition-colors border-primary/20">
                        Detalhes <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features / Why Us */}
        <section className="py-20" style={{ backgroundColor: tenant.colors.secondary }}>
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
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.colors.primary}33` }}>
                        <Check className="w-4 h-4" style={{ color: tenant.colors.primary }} />
                      </div>
                      <span className="font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <Button className="mt-8" size="lg" style={{ backgroundColor: tenant.colors.primary }}>
                  Conheça nossa história
                </Button>
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
        <footer className="bg-slate-900 text-slate-300 py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-2 font-heading font-bold text-2xl text-white mb-4">
                  <Building className="h-6 w-6" />
                  {tenant.name}
                </div>
                <p className="text-sm opacity-70">
                  Sua parceira de confiança no mercado imobiliário.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">Links Rápidos</h4>
                <ul className="space-y-2 text-sm">
                  <li><a href="#" className="hover:text-white">Imóveis à Venda</a></li>
                  <li><a href="#" className="hover:text-white">Imóveis para Alugar</a></li>
                  <li><a href="#" className="hover:text-white">Anuncie seu Imóvel</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">Contato</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Phone className="w-4 h-4"/> (11) 99999-9999</li>
                  <li className="flex items-center gap-2"><Mail className="w-4 h-4"/> contato@{tenant.slug}.com.br</li>
                  <li className="flex items-center gap-2"><MapPin className="w-4 h-4"/> São Paulo, SP</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-white mb-4">Newsletter</h4>
                <div className="flex gap-2">
                  <input type="email" placeholder="Seu e-mail" className="bg-slate-800 border-none rounded px-3 py-2 text-sm w-full" />
                  <Button size="sm" style={{ backgroundColor: tenant.colors.primary }}>OK</Button>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-800 mt-12 pt-8 text-center text-xs opacity-50">
              <p>&copy; 2024 {tenant.name}. Todos os direitos reservados. Powered by ImobiBase.</p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
