import React, { useEffect, useState, useRef } from "react";
import { Link } from "wouter";
import {
  motion,
  AnimatePresence,
  useInView,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import {
  Building2,
  CheckCircle2,
  LayoutDashboard,
  Users,
  ArrowRight,
  Zap,
  ShieldCheck,
  BarChart3,
  Globe,
  Menu,
  X,
  Play,
  Star,
  Smartphone,
  Brain,
  Plug,
  UserPlus,
  Settings,
  TrendingUp,
  Lock,
  Server,
  Clock,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SeoHead, OrganizationSchema } from "@/components/seo/SeoHead";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { landingPlans } from "@/lib/plans-config";

// Images
import imgAbstract from "@assets/stock_images/abstract_blue_tech_g_c1dd56ff.jpg";
import imgOffice from "@assets/stock_images/professional_happy_b_8741d9c5.jpg";

// === Reusable Components ===

function ScrollReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay, ease: [0, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({
  target,
  suffix = "",
  prefix = "",
}: {
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, target, {
        duration: 1.5,
        ease: [0, 0, 0.2, 1],
      });
      return controls.stop;
    }
  }, [isInView, target, motionValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

// === Main Component ===

export default function ProductLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNewsletterSubmit = async (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
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
    } catch {
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
    transition: { duration: 0.5 },
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 overflow-x-hidden">
      <SeoHead
        title="ImobiBase | Gestão Imobiliária Inteligente com CRM e Site"
        description="Sistema completo para imobiliárias e corretores: CRM de leads, cadastro de imóveis, site automático, contratos, financeiro e inteligência artificial. Comece grátis."
        path="/"
        structuredData={[
          OrganizationSchema,
          {
            "@type": "SoftwareApplication",
            name: "ImobiBase",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "BRL",
              lowPrice: "0",
              highPrice: "799",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.9",
              ratingCount: "80",
            },
          },
        ]}
      />
      {/* ══════ Navbar ══════ */}
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
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              ImobiBase
            </span>
          </div>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            {[
              { label: "Recursos", id: "recursos" },
              { label: "Como Funciona", id: "como-funciona" },
              { label: "Depoimentos", id: "depoimentos" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="hover:text-primary transition-colors relative group"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
              </button>
            ))}
            <Link
              href="/pricing"
              className="hover:text-primary transition-colors relative group"
            >
              Preços
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-primary/5">
                Entrar
              </Button>
            </Link>
            <Link href="/login">
              <Button className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5">
                Começar Grátis
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
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
              {[
                { label: "Recursos", id: "recursos" },
                { label: "Como Funciona", id: "como-funciona" },
                { label: "Depoimentos", id: "depoimentos" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    scrollToSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className="text-lg font-medium p-2 hover:bg-muted rounded-lg text-left"
                >
                  {item.label}
                </button>
              ))}
              <Link
                href="/pricing"
                className="text-lg font-medium p-2 hover:bg-muted rounded-lg"
                onClick={() => setMobileMenuOpen(false)}
              >
                Preços
              </Link>
              <div className="h-px bg-border my-2" />
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full justify-start">
                  Entrar
                </Button>
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">Criar Conta</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main>
        {/* ══════ Hero Section ══════ */}
        <section className="pt-32 pb-20 md:pt-48 md:pb-32 relative overflow-hidden">
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
                <motion.div
                  variants={fadeInUp}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  Sistema Completo para Imobiliárias
                </motion.div>

                <motion.h1
                  variants={fadeInUp}
                  className="text-5xl md:text-6xl lg:text-7xl font-heading font-bold tracking-tight mb-6 leading-[1.1]"
                >
                  A inteligência <br />
                  que sua imobiliária <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
                    precisa.
                  </span>
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed"
                >
                  Centralize imóveis, leads e contratos em uma única plataforma.
                  Crie sites automáticos e gerencie seu funil de vendas com a
                  tecnologia que as grandes redes usam.
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                >
                  <Link href="/login">
                    <Button
                      size="lg"
                      className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/25 hover:scale-105 transition-all duration-300"
                    >
                      Começar Agora <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 text-lg rounded-full hover:bg-secondary/50 backdrop-blur-sm border-2"
                    onClick={() => scrollToSection("recursos")}
                  >
                    <Play className="mr-2 w-4 h-4 fill-current" /> Ver Demo
                  </Button>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground"
                >
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-medium">
                      Sistema disponível para testes
                    </span>
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
                    <div className="flex-1 text-center text-xs font-mono text-muted-foreground opacity-50">
                      dashboard.imobibase.com
                    </div>
                  </div>
                  <img
                    src="/dashboard-mockup.png"
                    alt="Dashboard ImobiBase"
                    className="w-full h-auto shadow-inner"
                    loading="eager"
                    // @ts-expect-error — HTML spec; tipado em React 19+
                    fetchpriority="high"
                    decoding="async"
                    width="1200"
                    height="750"
                  />

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
                        <p className="text-xs text-muted-foreground">
                          R$ 450.000,00
                        </p>
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
                        <p className="text-xs text-muted-foreground">
                          Via Instagram • Há 2min
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-50" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════ Social Proof Strip ══════ */}
        <section className="py-12 bg-muted/30 border-y">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center">
                {[
                  { value: 1500, suffix: "+", label: "Imóveis cadastrados" },
                  { value: 80, suffix: "+", label: "Imobiliárias ativas" },
                  { value: 5000, suffix: "+", label: "Leads gerenciados" },
                  { value: 99, suffix: "%", label: "Satisfação dos clientes" },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center">
                    <div className="text-3xl md:text-4xl font-bold text-primary">
                      <AnimatedCounter
                        target={stat.value}
                        suffix={stat.suffix}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════ How It Works ══════ */}
        <section id="como-funciona" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <Badge
                  variant="outline"
                  className="mb-4 bg-primary/5 text-primary border-primary/20"
                >
                  Simples e Rápido
                </Badge>
                <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">
                  Comece em 3 passos
                </h2>
                <p className="text-lg text-muted-foreground">
                  Do cadastro à primeira venda em minutos, não em semanas.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

              {[
                {
                  icon: UserPlus,
                  step: "1",
                  title: "Crie sua conta",
                  desc: "Cadastro gratuito em menos de 2 minutos. Sem cartão de crédito.",
                },
                {
                  icon: Settings,
                  step: "2",
                  title: "Configure seu sistema",
                  desc: "Importe imóveis, personalize seu site e conecte integrações.",
                },
                {
                  icon: TrendingUp,
                  step: "3",
                  title: "Comece a vender",
                  desc: "Gerencie leads, feche negócios e acompanhe resultados em tempo real.",
                },
              ].map((item, i) => (
                <ScrollReveal key={item.step} delay={i * 0.15}>
                  <div className="text-center relative">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6 relative z-10">
                      <item.icon className="w-7 h-7" />
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ Feature Tabs ══════ */}
        <section id="recursos" className="py-24 bg-muted/20 relative">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <Badge
                  variant="outline"
                  className="mb-4 bg-primary/5 text-primary border-primary/20"
                >
                  Plataforma All-in-One
                </Badge>
                <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">
                  Um sistema, infinitas possibilidades
                </h2>
                <p className="text-lg text-muted-foreground">
                  Simplificamos a complexidade do mercado imobiliário em uma
                  interface fluida e poderosa.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <Tabs defaultValue="crm" className="w-full max-w-5xl mx-auto">
                <TabsList className="grid w-full grid-cols-3 mb-12 h-auto p-1 bg-muted/50 rounded-full">
                  <TabsTrigger
                    value="crm"
                    className="rounded-full py-3 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all"
                  >
                    <Users className="w-4 h-4 mr-2" /> CRM & Leads
                  </TabsTrigger>
                  <TabsTrigger
                    value="site"
                    className="rounded-full py-3 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all"
                  >
                    <Globe className="w-4 h-4 mr-2" /> Site & Marketing
                  </TabsTrigger>
                  <TabsTrigger
                    value="management"
                    className="rounded-full py-3 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all"
                  >
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
                        <h3 className="text-2xl font-bold mb-4">
                          Pipeline de Vendas Visual
                        </h3>
                        <p className="text-muted-foreground mb-8">
                          Acompanhe cada lead desde o primeiro contato até a
                          assinatura do contrato. Nosso Kanban intuitivo garante
                          que nenhuma oportunidade seja perdida.
                        </p>
                        <ul className="space-y-4">
                          {[
                            "Automação de follow-up",
                            "Histórico completo de interações",
                            "Integração com Portais e WhatsApp",
                          ].map((f) => (
                            <li key={f} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <span className="font-medium">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-muted/30 relative overflow-hidden flex items-center justify-center p-8">
                        <img
                          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                          className="rounded-xl shadow-lg w-full max-w-md rotate-3 transition-transform hover:rotate-0 duration-500"
                          alt="CRM"
                          loading="lazy"
                          decoding="async"
                          width="1000"
                          height="667"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="site" className="m-0 h-full">
                    <div className="grid md:grid-cols-2 h-full">
                      <div className="p-8 md:p-12 flex flex-col justify-center">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                          <Globe className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">
                          Seu Site no Ar em Minutos
                        </h3>
                        <p className="text-muted-foreground mb-8">
                          Não dependa de desenvolvedores. O ImobiBase gera
                          automaticamente um site moderno, rápido e otimizado
                          para SEO com base no seu portfólio.
                        </p>
                        <ul className="space-y-4">
                          {[
                            "Templates Premium Responsivos",
                            "Domínio Personalizado",
                            "Captura de Leads Integrada",
                          ].map((f) => (
                            <li key={f} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <span className="font-medium">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-muted/30 relative overflow-hidden flex items-center justify-center p-8">
                        <img
                          src={imgAbstract}
                          className="rounded-xl shadow-lg w-full max-w-md -rotate-3 transition-transform hover:rotate-0 duration-500"
                          alt="Site Builder"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="management" className="m-0 h-full">
                    <div className="grid md:grid-cols-2 h-full">
                      <div className="p-8 md:p-12 flex flex-col justify-center">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
                          <BarChart3 className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold mb-4">
                          Gestão Baseada em Dados
                        </h3>
                        <p className="text-muted-foreground mb-8">
                          Tome decisões estratégicas com dashboards em tempo
                          real. Acompanhe a performance do time, conversão do
                          funil e previsibilidade de receita.
                        </p>
                        <ul className="space-y-4">
                          {[
                            "Relatórios de Performance",
                            "Gestão de Comissões",
                            "Controle Financeiro",
                          ].map((f) => (
                            <li key={f} className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                <CheckCircle2 className="w-4 h-4" />
                              </div>
                              <span className="font-medium">{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-muted/30 relative overflow-hidden flex items-center justify-center p-8">
                        <img
                          src={imgOffice}
                          className="rounded-xl shadow-lg w-full max-w-md scale-105 transition-transform hover:scale-100 duration-500"
                          alt="Management"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════ Bento Grid Stats (Expanded) ══════ */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">
                  Por que escolher o ImobiBase?
                </h2>
                <p className="text-lg text-muted-foreground">
                  Tecnologia de ponta pensada para o mercado imobiliário
                  brasileiro.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Speed - spans 2 cols */}
              <ScrollReveal className="col-span-1 md:col-span-2">
                <div className="bg-card p-8 rounded-3xl border shadow-sm h-full relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Zap className="w-32 h-32" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">
                    Velocidade Incrível
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-md">
                    Otimizado para performance máxima. Carregamento instantâneo
                    de imóveis e fotos para não perder a atenção do cliente.
                  </p>
                  <div className="flex gap-8">
                    <div>
                      <div className="text-4xl font-bold text-primary mb-1">
                        <AnimatedCounter target={99} suffix="%" />
                      </div>
                      <div className="text-sm font-medium">
                        Uptime Garantido
                      </div>
                    </div>
                    <div>
                      <div className="text-4xl font-bold text-primary mb-1">
                        &lt;1s
                      </div>
                      <div className="text-sm font-medium">Carregamento</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Security */}
              <ScrollReveal delay={0.1}>
                <div className="bg-gradient-to-br from-primary to-blue-600 p-8 rounded-3xl shadow-lg text-white h-full flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <ShieldCheck className="w-12 h-12 mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Segurança Total</h3>
                  <p className="opacity-90">
                    Seus dados criptografados e backups diários automáticos.
                    Dormimos tranquilos para você também dormir.
                  </p>
                </div>
              </ScrollReveal>

              {/* AI */}
              <ScrollReveal delay={0.05}>
                <div className="bg-card p-8 rounded-3xl border shadow-sm h-full relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Brain className="w-24 h-24" />
                  </div>
                  <Brain className="w-10 h-10 text-purple-600 mb-4" />
                  <h3 className="text-xl font-bold mb-2">IA Integrada</h3>
                  <p className="text-muted-foreground text-sm">
                    Marketing automático, avaliação de imóveis por IA e
                    assistente virtual para atendimento de leads 24/7.
                  </p>
                </div>
              </ScrollReveal>

              {/* Integrations */}
              <ScrollReveal delay={0.1}>
                <div className="bg-card p-8 rounded-3xl border shadow-sm h-full relative overflow-hidden group">
                  <Plug className="w-10 h-10 text-green-600 mb-4" />
                  <h3 className="text-xl font-bold mb-2">Integrações</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Conecte com as ferramentas que você já usa no dia a dia.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "WhatsApp",
                      "OLX",
                      "ZAP Imóveis",
                      "VivaReal",
                      "Instagram",
                    ].map((name) => (
                      <span
                        key={name}
                        className="text-xs px-3 py-1 rounded-full bg-muted font-medium"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* Mobile/PWA */}
              <ScrollReveal delay={0.15}>
                <div className="bg-card p-8 rounded-3xl border shadow-sm h-full relative overflow-hidden group">
                  <Smartphone className="w-10 h-10 text-blue-600 mb-4" />
                  <h3 className="text-xl font-bold mb-2">
                    Acesse de Qualquer Lugar
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Instale como app no seu celular. Funciona em qualquer
                    dispositivo, a qualquer hora, sem precisar baixar nada.
                  </p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>

        {/* ══════ Testimonials ══════ */}
        <section id="depoimentos" className="py-24 bg-muted/20">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-16">
                <Badge
                  variant="outline"
                  className="mb-4 bg-primary/5 text-primary border-primary/20"
                >
                  Depoimentos
                </Badge>
                <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">
                  Quem usa, recomenda
                </h2>
                <p className="text-lg text-muted-foreground">
                  Veja o que nossos clientes dizem sobre o ImobiBase.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Carla Mendes",
                  role: "Diretora",
                  company: "Mendes Imóveis",
                  text: "O ImobiBase transformou nossa operação. Antes usávamos planilhas e perdíamos leads. Hoje temos controle total do funil e o site gerou 3x mais contatos.",
                  initials: "CM",
                  color: "bg-blue-100 text-blue-700",
                },
                {
                  name: "Ricardo Alves",
                  role: "Corretor Autônomo",
                  company: "",
                  text: "Como corretor autônomo, precisava de algo simples e profissional. O plano gratuito já me atende muito bem e o site ficou incrível.",
                  initials: "RA",
                  color: "bg-green-100 text-green-700",
                },
                {
                  name: "Patrícia Duarte",
                  role: "Gerente Comercial",
                  company: "Rede Habitar",
                  text: "A inteligência artificial para descrições de imóveis economiza horas do nosso time. E o dashboard de comissões resolveu um problema que tínhamos há anos.",
                  initials: "PD",
                  color: "bg-purple-100 text-purple-700",
                },
              ].map((testimonial, i) => (
                <ScrollReveal key={testimonial.name} delay={i * 0.1}>
                  <div className="bg-card p-8 rounded-2xl border shadow-sm h-full flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, j) => (
                        <Star
                          key={j}
                          className="w-4 h-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed mb-6 flex-1">
                      "{testimonial.text}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-sm font-bold`}
                      >
                        {testimonial.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {testimonial.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {testimonial.role}
                          {testimonial.company && ` — ${testimonial.company}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ Pricing ══════ */}
        <section id="precos" className="py-24 bg-background">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="text-center max-w-3xl mx-auto mb-12">
                <h2 className="text-3xl md:text-5xl font-heading font-bold mb-6">
                  Investimento Transparente
                </h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Escolha o plano ideal para o momento do seu negócio.
                </p>

                <div className="flex items-center justify-center gap-4">
                  <span
                    className={`text-sm font-medium ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Mensal
                  </span>
                  <Switch
                    checked={billingCycle === "yearly"}
                    onCheckedChange={(c) =>
                      setBillingCycle(c ? "yearly" : "monthly")
                    }
                  />
                  <span
                    className={`text-sm font-medium ${billingCycle === "yearly" ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    Anual{" "}
                    <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full ml-1">
                      -20%
                    </span>
                  </span>
                </div>
              </div>
            </ScrollReveal>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {landingPlans.map((plan, i) => {
                const price =
                  billingCycle === "monthly"
                    ? plan.monthlyPrice
                    : plan.yearlyPrice;
                const isExternal =
                  plan.ctaLink.startsWith("http") ||
                  plan.ctaLink.startsWith("mailto:");

                return (
                  <ScrollReveal key={plan.id} delay={i * 0.1}>
                    <div
                      className={`bg-card rounded-2xl border p-8 flex flex-col h-full transition-all hover:shadow-lg relative ${
                        plan.popular
                          ? "border-2 border-primary shadow-2xl z-10"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                          RECOMENDADO
                        </div>
                      )}
                      <div className="mb-6">
                        <h3
                          className={`font-bold text-xl mb-2 ${plan.popular ? "text-primary" : ""}`}
                        >
                          {plan.name}
                        </h3>
                        {plan.isEnterprise ? (
                          <div className="text-3xl font-bold mb-2">
                            Sob consulta
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold">
                              {price === 0 ? "Grátis" : `R$ ${price}`}
                            </span>
                            {price > 0 && (
                              <span className="text-muted-foreground">
                                /mês
                              </span>
                            )}
                          </div>
                        )}
                        <p className="text-muted-foreground text-sm mt-2">
                          {plan.description}
                        </p>
                        {billingCycle === "yearly" &&
                          plan.monthlyPrice > 0 &&
                          !plan.isEnterprise && (
                            <p className="text-xs text-green-600 mt-1">
                              Economia de R${" "}
                              {(plan.monthlyPrice - plan.yearlyPrice) * 12}/ano
                            </p>
                          )}
                      </div>

                      {isExternal ? (
                        <a
                          href={plan.ctaLink}
                          target={
                            plan.ctaLink.startsWith("mailto:")
                              ? undefined
                              : "_blank"
                          }
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant={plan.variant}
                            className={`w-full mb-8 ${plan.popular ? "shadow-lg shadow-primary/20" : ""}`}
                          >
                            {plan.cta}
                          </Button>
                        </a>
                      ) : (
                        <Link href={plan.ctaLink}>
                          <Button
                            variant={plan.variant}
                            className={`w-full mb-8 ${plan.popular ? "shadow-lg shadow-primary/20" : ""}`}
                          >
                            {plan.cta}
                          </Button>
                        </Link>
                      )}

                      <div className="space-y-3 text-sm flex-1">
                        {plan.id !== "free" && (
                          <p className="font-medium text-foreground text-xs uppercase tracking-wider">
                            {plan.id === "starter"
                              ? "Tudo do Gratuito, mais:"
                              : plan.id === "pro"
                                ? "Tudo do Starter, mais:"
                                : plan.id === "business"
                                  ? "Tudo do Pro, mais:"
                                  : "Tudo do Business, mais:"}
                          </p>
                        )}
                        <ul className="space-y-3">
                          {plan.features.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>

            <ScrollReveal>
              <p className="text-center text-sm text-muted-foreground mt-8">
                Precisa de mais?{" "}
                <Link
                  href="/pricing"
                  className="text-primary hover:underline font-medium"
                >
                  Veja todos os planos e compare
                </Link>
              </p>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════ Trust Badges ══════ */}
        <section className="py-12 bg-muted/30 border-y">
          <div className="container mx-auto px-4">
            <ScrollReveal>
              <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
                {[
                  { icon: ShieldCheck, label: "LGPD Compliant" },
                  { icon: Lock, label: "Criptografia SSL" },
                  { icon: Server, label: "Dados no Brasil" },
                  { icon: Clock, label: "99.9% Uptime" },
                ].map((badge) => (
                  <div
                    key={badge.label}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <badge.icon className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium">{badge.label}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════ FAQ ══════ */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <ScrollReveal>
              <h2 className="text-3xl font-heading font-bold mb-12 text-center">
                Perguntas Frequentes
              </h2>
            </ScrollReveal>

            <ScrollReveal>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {[
                  {
                    q: "Consigo migrar meus dados de outro sistema?",
                    a: "Sim! Oferecemos ferramentas de importação via CSV e nossa equipe de suporte auxilia na migração no plano Profissional e Enterprise.",
                  },
                  {
                    q: "O site gerado é responsivo para celular?",
                    a: "Totalmente. Utilizamos tecnologia de ponta para garantir que seu site carregue rápido e funcione perfeitamente em qualquer dispositivo.",
                  },
                  {
                    q: "Tem fidelidade ou multa de cancelamento?",
                    a: "Não. Você pode cancelar a qualquer momento sem multas. Acreditamos na qualidade do nosso produto para manter você conosco.",
                  },
                  {
                    q: "Como funciona o suporte?",
                    a: "Oferecemos suporte via chat e e-mail para todos os planos. Clientes Enterprise possuem um gerente de conta dedicado e atendimento prioritário.",
                  },
                ].map((faq, i) => (
                  <AccordionItem
                    key={i}
                    value={`item-${i}`}
                    className="bg-card border px-6 rounded-xl"
                  >
                    <AccordionTrigger className="hover:no-underline py-6 font-medium text-lg">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════ Final CTA ══════ */}
        <section className="py-32 bg-foreground text-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="container mx-auto px-4 text-center relative z-10">
            <ScrollReveal>
              <h2 className="text-4xl md:text-5xl font-heading font-bold mb-8 tracking-tight">
                O futuro da sua imobiliária começa hoje.
              </h2>
              <p className="text-xl text-background/80 mb-12 max-w-2xl mx-auto">
                Não perca mais tempo com ferramentas ultrapassadas. Junte-se à
                revolução digital do mercado imobiliário.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/login">
                  <Button
                    size="lg"
                    className="h-16 px-12 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xl shadow-primary/30"
                  >
                    Criar Conta Grátis
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ══════ Footer ══════ */}
        <footer className="bg-background border-t pt-20 pb-10">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-12 mb-16">
              <div>
                <div className="flex items-center gap-2 font-heading font-bold text-2xl mb-6">
                  <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                    <Building2 className="w-4 h-4" />
                  </div>
                  ImobiBase
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Transformando a maneira como imobiliárias e corretores fazem
                  negócios no Brasil.
                </p>
                <div className="flex gap-4">
                  <a
                    href="https://instagram.com/imobibase"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                  <a
                    href="https://linkedin.com/company/imobibase"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                  <a
                    href="https://youtube.com/@imobibase"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                    aria-label="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-6">Produto</h4>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li>
                    <Link
                      href="/pricing"
                      className="hover:text-primary transition-colors"
                    >
                      Preços
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login"
                      className="hover:text-primary transition-colors"
                    >
                      Entrar
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/login"
                      className="hover:text-primary transition-colors"
                    >
                      Criar Conta
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/termos"
                      className="hover:text-primary transition-colors"
                    >
                      Termos de Uso
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/privacidade"
                      className="hover:text-primary transition-colors"
                    >
                      Privacidade
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-foreground mb-6">
                  Fique por dentro
                </h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Receba dicas de vendas e novidades da plataforma.
                </p>
                <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                  <Input
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="bg-muted border-transparent focus:bg-background"
                    required
                  />
                  <Button type="submit" size="icon" className="shrink-0">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </div>

            <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
              <p>
                &copy; {new Date().getFullYear()} ImobiBase Tecnologia Ltda.
              </p>
              <div className="flex gap-8 mt-4 md:mt-0">
                <Link href="/termos" className="hover:text-foreground">
                  Termos
                </Link>
                <Link href="/privacidade" className="hover:text-foreground">
                  Privacidade
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
