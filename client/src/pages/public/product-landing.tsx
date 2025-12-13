import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
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
  Globe,
  Menu,
  X,
  ChevronDown,
  Play,
  Star,
  Smartphone,
  MousePointerClick
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Images
import imgAbstract from "@assets/stock_images/abstract_blue_tech_g_c1dd56ff.jpg";
import imgOffice from "@assets/stock_images/professional_happy_b_8741d9c5.jpg";
import imgBuilding from "@assets/stock_images/modern_architectural_bf19dee3.jpg";

export default function ProductLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, active: true }),
      });

      if (res.ok) {
        toast({
          title: "Inscrição confirmada!",
          description: "Você receberá nossas novidades em breve.",
        });
        e.currentTarget.reset();
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível completar a inscrição.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível completar a inscrição.",
        variant: "destructive",
      });
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 overflow-x-hidden">
      
      {/* Navbar */}
      <motion.header 
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-background/80 backdrop-blur-md border-b py-3 shadow-sm" : "bg-transparent py-6"}`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">ImobiBase</span>
          </div>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            {["Recursos", "Soluções", "Preços", "Empresa"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-primary transition-colors relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-primary/5">Entrar</Button>
            </Link>
            <Link href="/login">
              <Button className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                Começar Grátis
              </Button>
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed top-16 left-0 w-full bg-background border-b z-40 md:hidden overflow-hidden"
          >
            <div className="p-4 flex flex-col gap-4">
              {["Recursos", "Soluções", "Preços", "Empresa"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-lg font-medium p-2 hover:bg-muted rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                  {item}
                </a>
              ))}
              <div className="h-px bg-border my-2" />
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">Entrar</Button>
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Criar Conta</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-400/10 to-transparent rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/4" />
          
          <div className="container mx-auto px-4">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <motion.div 
                className="lg:w-1/2 text-center lg:text-left"
                initial="initial"
                animate="animate"
                variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
              >
                <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  Novidade: Integração com WhatsApp Business
                </motion.div>
                
                <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold tracking-tight mb-6 leading-[1.1]">
                  A inteligência <br />
                  que sua imobiliária <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">precisa.</span>
                </motion.h1>
                
                <motion.p variants={fadeInUp} className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  Centralize imóveis, leads e contratos em uma única plataforma. 
                  Crie sites automáticos e gerencie seu funil de vendas com a tecnologia que as grandes redes usam.
                </motion.p>
                
                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Link href="/login">
                    <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300">
                      Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full hover:bg-secondary/50 backdrop-blur-sm border-2">
                    <Play className="mr-2 w-4 h-4 fill-current" /> Ver Demo
                  </Button>
                </motion.div>
                
                <motion.div variants={fadeInUp} className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">Sistema disponível para testes</span>
                  </div>
                </motion.div>
              </motion.div>

              <motion.div 
                className="lg:w-1/2 relative"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <div className="relative z-10 rounded-2xl border bg-background/50 backdrop-blur-xl shadow-2xl overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5 z-0" />
                  <div className="p-2 border-b flex items-center gap-2 bg-background/80">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 text-center text-xs font-mono text-muted-foreground opacity-50">dashboard.imobibase.com</div>
                  </div>
                  <img 
                    src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop" 
                    alt="Dashboard" 
                    className="w-full h-auto shadow-inner"
                  />
                  
                  {/* Floating Elements */}
                  <motion.div 
                    className="absolute -left-6 top-20 bg-card p-4 rounded-xl shadow-xl border animate-float-slow hidden md:block"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Venda Concluída!</p>
                        <p className="text-xs text-muted-foreground">R$ 450.000,00</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    className="absolute -right-6 bottom-20 bg-card p-4 rounded-xl shadow-xl border animate-float-delayed hidden md:block"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1.2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Novo Lead</p>
                        <p className="text-xs text-muted-foreground">Via Instagram • Há 2min</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Decorative Blob */}
                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-50" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Marquee Section Removed as per request for honesty */}


        {/* Feature Tabs Section */}
        <section id="recursos" className="py-24 bg-background relative">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="mb-4 bg-primary/5 text-primary border-primary/20">Plataforma All-in-One</Badge>
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">Um sistema, infinitas possibilidades</h2>
              <p className="text-lg text-muted-foreground">
                Simplificamos a complexidade do mercado imobiliário em uma interface fluida e poderosa.
              </p>
            </div>

            <Tabs defaultValue="crm" className="w-full max-w-5xl mx-auto">
              <TabsList className="grid w-full grid-cols-3 mb-12 h-auto p-1 bg-muted/50 rounded-full">
                <TabsTrigger value="crm" className="rounded-full py-3 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                  <Users className="w-4 h-4 mr-2" /> CRM & Leads
                </TabsTrigger>
                <TabsTrigger value="site" className="rounded-full py-3 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                  <Globe className="w-4 h-4 mr-2" /> Site & Marketing
                </TabsTrigger>
                <TabsTrigger value="management" className="rounded-full py-3 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                  <BarChart3 className="w-4 h-4 mr-2" /> Gestão & Analytics
                </TabsTrigger>
              </TabsList>
              
              <div className="relative min-h-[500px] bg-card border rounded-3xl overflow-hidden shadow-2xl">
                <TabsContent value="crm" className="m-0 h-full">
                   <div className="grid md:grid-cols-2 h-full">
                     <div className="p-8 md:p-12 flex flex-col justify-center">
                       <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6">
                         <LayoutDashboard className="w-6 h-6" />
                       </div>
                       <h3 className="text-2xl font-bold mb-4">Pipeline de Vendas Visual</h3>
                       <p className="text-muted-foreground mb-8">
                         Acompanhe cada lead desde o primeiro contato até a assinatura do contrato. 
                         Nosso Kanban intuitivo garante que nenhuma oportunidade seja perdida.
                       </p>
                       <ul className="space-y-4">
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Automação de follow-up</span>
                         </li>
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Histórico completo de interações</span>
                         </li>
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Integração com Portais e WhatsApp</span>
                         </li>
                       </ul>
                     </div>
                     <div className="bg-muted/30 relative overflow-hidden flex items-center justify-center p-8">
                        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop" className="rounded-xl shadow-lg w-full max-w-md rotate-3 transition-transform hover:rotate-0 duration-500" alt="CRM" />
                     </div>
                   </div>
                </TabsContent>

                <TabsContent value="site" className="m-0 h-full">
                  <div className="grid md:grid-cols-2 h-full">
                     <div className="p-8 md:p-12 flex flex-col justify-center">
                       <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                         <Globe className="w-6 h-6" />
                       </div>
                       <h3 className="text-2xl font-bold mb-4">Seu Site no Ar em Minutos</h3>
                       <p className="text-muted-foreground mb-8">
                         Não dependa de desenvolvedores. O ImobiBase gera automaticamente um site moderno, rápido e otimizado para SEO com base no seu portfólio.
                       </p>
                       <ul className="space-y-4">
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Templates Premium Responsivos</span>
                         </li>
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Domínio Personalizado</span>
                         </li>
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Captura de Leads Integrada</span>
                         </li>
                       </ul>
                     </div>
                     <div className="bg-muted/30 relative overflow-hidden flex items-center justify-center p-8">
                        <img src={imgAbstract} className="rounded-xl shadow-lg w-full max-w-md -rotate-3 transition-transform hover:rotate-0 duration-500" alt="Site Builder" />
                     </div>
                   </div>
                </TabsContent>

                <TabsContent value="management" className="m-0 h-full">
                  <div className="grid md:grid-cols-2 h-full">
                     <div className="p-8 md:p-12 flex flex-col justify-center">
                       <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                         <BarChart3 className="w-6 h-6" />
                       </div>
                       <h3 className="text-2xl font-bold mb-4">Gestão Baseada em Dados</h3>
                       <p className="text-muted-foreground mb-8">
                         Tome decisões estratégicas com dashboards em tempo real. Acompanhe a performance do time, conversão do funil e previsibilidade de receita.
                       </p>
                       <ul className="space-y-4">
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Relatórios de Performance</span>
                         </li>
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Gestão de Comissões</span>
                         </li>
                         <li className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600"><CheckCircle2 className="w-4 h-4" /></div>
                           <span className="font-medium">Controle Financeiro</span>
                         </li>
                       </ul>
                     </div>
                     <div className="bg-muted/30 relative overflow-hidden flex items-center justify-center p-8">
                        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop" className="rounded-xl shadow-lg w-full max-w-md scale-105 transition-transform hover:scale-100 duration-500" alt="Management" />
                     </div>
                   </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </section>

        {/* Bento Grid Stats */}
        <section className="py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card p-8 rounded-3xl border shadow-sm col-span-1 md:col-span-2 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Zap className="w-32 h-32" />
                 </div>
                 <h3 className="text-2xl font-bold mb-2">Velocidade Incrível</h3>
                 <p className="text-muted-foreground mb-8 max-w-md">Otimizado para performance máxima. Carregamento instantâneo de imóveis e fotos para não perder a atenção do cliente.</p>
                 <div className="flex gap-8">
                   <div>
                     <div className="text-4xl font-bold text-primary mb-1">99%</div>
                     <div className="text-sm font-medium">Uptime Garantido</div>
                   </div>
                   <div>
                     <div className="text-4xl font-bold text-primary mb-1">&lt;1s</div>
                     <div className="text-sm font-medium">Carregamento</div>
                   </div>
                 </div>
              </div>
              
              <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-3xl shadow-lg text-white col-span-1 flex flex-col justify-center relative overflow-hidden">
                 <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                 <ShieldCheck className="w-12 h-12 mb-4" />
                 <h3 className="text-2xl font-bold mb-2">Segurança Total</h3>
                 <p className="opacity-90">Seus dados criptografados e backups diários automáticos. Dormimos tranquilos para você também dormir.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="precos" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">Investimento Transparente</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Escolha o plano ideal para o momento do seu negócio.
              </p>
              
              <div className="flex items-center justify-center gap-4">
                <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Mensal</span>
                <Switch 
                  checked={billingCycle === 'yearly'} 
                  onCheckedChange={(c) => setBillingCycle(c ? 'yearly' : 'monthly')} 
                />
                <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  Anual <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full ml-1">-20%</span>
                </span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {/* Free */}
              <div className="bg-card rounded-2xl border p-8 flex flex-col hover:border-primary/50 transition-all hover:shadow-lg">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Inicial</h3>
                  <div className="text-4xl font-bold mb-2">Grátis</div>
                  <p className="text-muted-foreground text-sm">Para começar sua jornada digital.</p>
                </div>
                <Button variant="outline" className="w-full mb-8">Começar Agora</Button>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-foreground">Inclui:</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 1 Usuário</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Até 50 imóveis</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Site básico</li>
                  </ul>
                </div>
              </div>

              {/* Pro */}
              <div className="bg-card rounded-2xl border-2 border-primary p-8 flex flex-col shadow-2xl relative scale-105 z-10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  RECOMENDADO
                </div>
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2 text-primary">Profissional</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">R$ {billingCycle === 'monthly' ? '109' : '87'}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Para quem quer escalar vendas.</p>
                </div>
                <Button className="w-full mb-8 shadow-lg shadow-primary/20">Assinar Pro</Button>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-foreground">Tudo do Inicial, mais:</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Até 10 Usuários</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> 2.000 imóveis</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Site personalizado (SEO)</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Gestão de Contratos</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Integração WhatsApp</li>
                  </ul>
                </div>
              </div>

              {/* Enterprise */}
              <div className="bg-card rounded-2xl border p-8 flex flex-col hover:border-primary/50 transition-all hover:shadow-lg">
                <div className="mb-6">
                  <h3 className="font-bold text-xl mb-2">Empresa</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">R$ {billingCycle === 'monthly' ? '389' : '311'}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-muted-foreground text-sm mt-2">Para redes e franquias.</p>
                </div>
                <Button variant="outline" className="w-full mb-8">Falar com Vendas</Button>
                <div className="space-y-3 text-sm">
                  <p className="font-medium text-foreground">Tudo do Profissional, mais:</p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Usuários Ilimitados</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Multi-filiais</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> API & Webhooks</li>
                    <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Gerente de Conta</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-heading font-bold mb-12 text-center">Perguntas Frequentes</h2>
            
            <Accordion type="single" collapsible className="w-full space-y-4">
              {[
                { q: "Consigo migrar meus dados de outro sistema?", a: "Sim! Oferecemos ferramentas de importação via CSV e nossa equipe de suporte auxilia na migração no plano Profissional e Empresa." },
                { q: "O site gerado é responsivo para celular?", a: "Totalmente. Utilizamos tecnologia de ponta para garantir que seu site carregue rápido e funcione perfeitamente em qualquer dispositivo." },
                { q: "Tem fidelidade ou multa de cancelamento?", a: "Não. Você pode cancelar a qualquer momento sem multas. Acreditamos na qualidade do nosso produto para manter você conosco." },
                { q: "Como funciona o suporte?", a: "Oferecemos suporte via chat e e-mail para todos os planos. Clientes Enterprise possuem um gerente de conta dedicado e atendimento prioritário." }
              ].map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-card border px-6 rounded-xl">
                  <AccordionTrigger className="hover:no-underline py-6 font-medium text-lg">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 bg-foreground text-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-8 tracking-tight">
              O futuro da sua imobiliária começa hoje.
            </h2>
            <p className="text-xl text-background/80 mb-12 max-w-2xl mx-auto">
              Não perca mais tempo com ferramentas ultrapassadas. Junte-se à revolução digital do mercado imobiliário.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="h-16 px-12 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xl shadow-primary/30">
                  Criar Conta Grátis
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background border-t pt-20 pb-10">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-12 mb-16">
              <div className="col-span-1 md:col-span-1">
                <div className="flex items-center gap-2 font-heading font-bold text-2xl mb-6">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">I</div>
                  ImobiBase
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Transformando a maneira como imobiliárias e corretores fazem negócios no Brasil.
                </p>
                <div className="flex gap-4">
                  {/* Social Icons */}
                  {[1,2,3].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-all cursor-pointer">
                      <Globe className="w-5 h-5" />
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-foreground mb-6">Produto</h4>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">CRM de Vendas</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Criador de Sites</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Gestão de Contratos</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Integrações</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Preços</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-6">Recursos</h4>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Academia Imobi</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">API Docs</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-6">Fique por dentro</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Receba dicas de vendas e novidades da plataforma.
                </p>
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <Input name="email" type="email" placeholder="seu@email.com" className="bg-muted border-transparent focus:bg-background" required />
                  <Button type="submit" size="icon" className="shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>
            
            <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
              <p>&copy; 2024 ImobiBase Tecnologia Ltda. CNPJ 00.000.000/0001-00.</p>
              <div className="flex gap-8 mt-4 md:mt-0">
                <a href="#" className="hover:text-foreground">Termos</a>
                <a href="#" className="hover:text-foreground">Privacidade</a>
                <a href="#" className="hover:text-foreground">Cookies</a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
