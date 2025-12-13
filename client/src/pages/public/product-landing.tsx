import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  CheckCircle2, 
  LayoutDashboard, 
  Users, 
  FileCheck, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  BarChart3,
  Globe
} from "lucide-react";

export default function ProductLanding() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-xl">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
              I
            </div>
            ImobiBase
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#recursos" className="hover:text-primary transition-colors">Recursos</a>
            <a href="#precos" className="hover:text-primary transition-colors">Planos</a>
            <a href="#seguranca" className="hover:text-primary transition-colors">Segurança</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/10 rounded-full blur-3xl -z-10" />
          
          <div className="container mx-auto px-4 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 border-primary/20 bg-primary/5 text-primary rounded-full">
              🚀 A plataforma completa para imobiliárias modernas
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
              Captação, Leads e Contratos <br className="hidden md:block" />
              <span className="text-primary">Num Só Lugar.</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Transforme sua imobiliária com o sistema que une CRM, gestão de imóveis e site próprio. 
              Sem planilhas, sem complexidade.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                  Criar Conta Grátis
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full">
                Ver Demonstração
              </Button>
            </div>
            
            <div className="mt-20 relative mx-auto max-w-5xl rounded-xl border bg-card/50 shadow-2xl backdrop-blur-sm p-2 md:p-4">
              <div className="absolute -top-12 -left-12 w-24 h-24 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse" />
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse" />
              
              <img 
                src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop" 
                alt="Dashboard Preview" 
                className="rounded-lg border shadow-sm w-full"
              />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        <section className="py-12 border-y bg-muted/30">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-8">
              Utilizado por mais de 500 imobiliárias inovadoras
            </p>
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
               {/* Mock Logos */}
               {["Nexus", "Urban", "Horizon", "Terra", "Vanguard"].map(name => (
                 <div key={name} className="flex items-center gap-2 font-bold text-xl">
                    <Building2 className="w-6 h-6" /> {name}
                 </div>
               ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="recursos" className="py-24 bg-background relative">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">Tudo que você precisa para vender mais</h2>
              <p className="text-lg text-muted-foreground">
                Substitua ferramentas caras e desconexas por uma plataforma unificada pensada para o mercado imobiliário brasileiro.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="col-span-1 md:col-span-2 bg-card rounded-2xl border p-8 hover:border-primary/50 transition-colors group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-3">CRM & Funil de Vendas</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Organize seus leads em um quadro Kanban intuitivo. Nunca mais perca um negócio por falta de acompanhamento.
                  </p>
                  <ul className="space-y-2 mb-8">
                    <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Pipeline visual arrasta-e-solta</li>
                    <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Histórico completo do cliente</li>
                    <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Automação de tarefas</li>
                  </ul>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="col-span-1 bg-card rounded-2xl border p-8 hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Site Pronto</h3>
                <p className="text-muted-foreground mb-6">
                  Sua imobiliária ganha um site profissional automaticamente, integrado ao seu estoque de imóveis.
                </p>
                <div className="bg-muted rounded-lg p-4 border text-xs font-mono text-muted-foreground">
                  imobibase.com.br/e/<span className="text-primary">sua-empresa</span>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="col-span-1 bg-card rounded-2xl border p-8 hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Propostas Digitais</h3>
                <p className="text-muted-foreground mb-6">
                  Gere propostas profissionais em PDF com um clique e envie para seus clientes.
                </p>
                <Button variant="link" className="px-0">Ver modelo <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </div>

              {/* Feature 4 */}
              <div className="col-span-1 md:col-span-2 bg-card rounded-2xl border p-8 hover:border-primary/50 transition-colors group">
                <div className="w-12 h-12 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Gestão Multi-Empresa</h3>
                <p className="text-muted-foreground mb-6">
                  Ideal para redes, franquias ou corretores com múltiplas marcas. Gerencie tudo em um único login.
                </p>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="text-sm font-semibold mb-1">Filial Jardins</div>
                      <div className="text-2xl font-bold text-primary">R$ 4.2M</div>
                   </div>
                   <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="text-sm font-semibold mb-1">Filial Centro</div>
                      <div className="text-2xl font-bold text-primary">R$ 1.8M</div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="precos" className="py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">Planos que crescem com você</h2>
              <p className="text-lg text-muted-foreground">
                Comece grátis e faça upgrade quando precisar de mais poder.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Free */}
              <div className="bg-card rounded-2xl border p-8 flex flex-col hover:shadow-lg transition-all">
                <div className="mb-8">
                  <h3 className="font-bold text-xl mb-2">Inicial</h3>
                  <div className="text-4xl font-bold mb-2">Grátis</div>
                  <p className="text-muted-foreground text-sm">Para corretores independentes começando agora.</p>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> 1 Usuário</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Até 50 imóveis</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Até 100 leads</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Site básico</li>
                </ul>
                <Button variant="outline" className="w-full">Começar Grátis</Button>
              </div>

              {/* Pro */}
              <div className="bg-card rounded-2xl border-2 border-primary p-8 flex flex-col shadow-xl relative scale-105">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  MAIS POPULAR
                </div>
                <div className="mb-8">
                  <h3 className="font-bold text-xl mb-2 text-primary">Profissional</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">R$ 109</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Para imobiliárias em crescimento.</p>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Até 10 Usuários</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> 2.000 imóveis</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Leads ilimitados</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Site personalizado</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Gestão de Contratos</li>
                </ul>
                <Button className="w-full">Assinar Agora</Button>
              </div>

              {/* Enterprise */}
              <div className="bg-card rounded-2xl border p-8 flex flex-col hover:shadow-lg transition-all">
                <div className="mb-8">
                  <h3 className="font-bold text-xl mb-2">Empresa</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">R$ 389</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Para redes e grandes operações.</p>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Usuários ilimitados</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Multi-filiais</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> API & Webhooks</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-green-500" /> Suporte Prioritário</li>
                </ul>
                <Button variant="outline" className="w-full">Falar com Vendas</Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">Pronto para revolucionar sua imobiliária?</h2>
            <p className="text-xl opacity-90 mb-10 max-w-2xl mx-auto">
              Junte-se a centenas de corretores que já automatizaram suas rotinas com o ImobiBase.
            </p>
            <Link href="/login">
              <Button size="lg" variant="secondary" className="h-14 px-10 text-lg rounded-full shadow-2xl text-primary font-bold">
                Começar Gratuitamente
              </Button>
            </Link>
            <p className="mt-4 text-sm opacity-70">Não requer cartão de crédito • Cancela quando quiser</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-slate-300 py-16">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-12 mb-12">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2 font-heading font-bold text-2xl text-white mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">I</div>
                  ImobiBase
                </div>
                <p className="max-w-xs opacity-70 mb-6">
                  O sistema operacional completo para o mercado imobiliário moderno. Simples, rápido e eficiente.
                </p>
                <div className="flex gap-4">
                  {/* Social icons placeholders */}
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">IG</div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">LI</div>
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors cursor-pointer">YT</div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-white mb-6">Produto</h4>
                <ul className="space-y-3 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Recursos</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Novidades</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-6">Empresa</h4>
                <ul className="space-y-3 text-sm">
                  <li><a href="#" className="hover:text-white transition-colors">Sobre Nós</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Política de Privacidade</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs opacity-50">
              <p>&copy; 2024 ImobiBase SaaS. Todos os direitos reservados.</p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <a href="#">Termos de Uso</a>
                <a href="#">Privacidade</a>
                <a href="#">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
