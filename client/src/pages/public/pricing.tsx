import React, { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Globe,
  Menu,
  X,
  MessageSquare,
  Users,
  Home,
  BarChart3,
  Brain,
  Shield,
  FileCheck,
  Lock,
  Star,
  Award,
  Quote,
} from "lucide-react";
import { plans, CONTACT_EMAIL } from "@/lib/plans-config";
import { SeoHead, breadcrumbSchema } from "@/components/seo/SeoHead";
import { PublicFooter } from "@/components/public/PublicFooter";

const faqs = [
  {
    q: "Posso testar o ImobiBase antes de assinar?",
    a: "Sim! O plano Gratuito permite que você utilize o sistema sem custo, com até 15 imóveis e 30 leads/mês. Você pode fazer upgrade a qualquer momento.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Aceitamos cartão de crédito e boleto bancário. No plano anual, você economiza 20% e paga em até 12x sem juros no cartão.",
  },
  {
    q: "Consigo migrar meus dados de outro sistema?",
    a: "Sim! Oferecemos ferramentas de importação via CSV e nossa equipe de suporte auxilia na migração nos planos Starter, Profissional e superiores.",
  },
  {
    q: "Tem fidelidade ou multa de cancelamento?",
    a: "Não. Você pode cancelar a qualquer momento sem multas. Acreditamos na qualidade do nosso produto para manter você conosco.",
  },
  {
    q: "O que acontece se eu ultrapassar o limite de imóveis?",
    a: "Você receberá uma notificação sugerindo o upgrade de plano. Seus imóveis existentes continuam funcionando, mas não será possível cadastrar novos até fazer o upgrade.",
  },
  {
    q: "A integração com WhatsApp funciona automaticamente?",
    a: "Sim, nos planos Starter e superiores. Você conecta seu número e o sistema gerencia mensagens de leads automaticamente, incluindo respostas rápidas e notificações.",
  },
  {
    q: "Como funciona a IA do plano Profissional?",
    a: "A IA inclui geração de descrições de imóveis para marketing, avaliação automática de mercado (AVM) e um assistente inteligente para atendimento de leads (ISA).",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 overflow-x-hidden">
      <SeoHead
        title="Planos e Preços | ImobiBase"
        description="Conheça os planos do ImobiBase: Gratuito, Starter, Profissional, Business e Enterprise. Escolha o plano ideal para sua imobiliária com 20% de desconto no pagamento anual."
        path="/pricing"
        structuredData={[
          breadcrumbSchema([
            { name: "Início", path: "/" },
            { name: "Preços", path: "/pricing" },
          ]),
          {
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b py-3 shadow-sm">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 font-heading font-bold text-xl tracking-tight cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                ImobiBase
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <Link
              href="/#recursos"
              className="hover:text-primary transition-colors"
            >
              Recursos
            </Link>
            <Link
              href="/#como-funciona"
              className="hover:text-primary transition-colors"
            >
              Como Funciona
            </Link>
            <Link href="/pricing" className="text-primary font-semibold">
              Preços
            </Link>
            <Link
              href="/#depoimentos"
              className="hover:text-primary transition-colors"
            >
              Depoimentos
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="hover:bg-primary/5">
                Entrar
              </Button>
            </Link>
            <Link href="/login">
              <Button className="rounded-full px-6 shadow-lg shadow-primary/20">
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
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed top-14 left-0 w-full bg-background border-b z-40 md:hidden">
          <div className="p-4 flex flex-col gap-4">
            <Link
              href="/"
              className="text-lg font-medium p-2 hover:bg-muted rounded-lg"
              onClick={() => setMobileMenuOpen(false)}
            >
              Início
            </Link>
            <Link
              href="/pricing"
              className="text-lg font-medium p-2 hover:bg-muted rounded-lg text-primary"
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
        </div>
      )}

      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 md:pt-40 md:pb-20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/4" />
          <div className="container mx-auto px-4 text-center">
            <Badge
              variant="outline"
              className="mb-4 bg-primary/5 text-primary border-primary/20"
            >
              Planos e Preços
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 tracking-tight">
              Escolha o plano ideal <br className="hidden sm:block" />
              para sua imobiliária
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Comece grátis e escale conforme seu negócio cresce. Sem surpresas,
              sem taxas escondidas.
            </p>

            <div className="flex items-center justify-center gap-4">
              <span
                className={`text-sm font-medium ${
                  billingCycle === "monthly"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
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
                className={`text-sm font-medium ${
                  billingCycle === "yearly"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Anual{" "}
                <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full ml-1">
                  -20%
                </span>
              </span>
            </div>
          </div>
        </section>

        {/* Plans Grid */}
        <section className="pb-24">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
              {plans.map((plan) => {
                const price =
                  billingCycle === "monthly"
                    ? plan.monthlyPrice
                    : plan.yearlyPrice;
                const isExternal =
                  plan.ctaLink.startsWith("http") ||
                  plan.ctaLink.startsWith("mailto:");

                return (
                  <div
                    key={plan.id}
                    className={`bg-card rounded-2xl border p-6 lg:p-8 flex flex-col transition-all hover:shadow-lg relative ${
                      plan.popular
                        ? "border-2 border-primary shadow-2xl lg:scale-105 z-10"
                        : "hover:border-primary/50"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-sm px-3 py-1">
                          Recomendado
                        </Badge>
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
                            <span className="text-muted-foreground">/mes</span>
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
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant={plan.variant} className="w-full mb-6">
                          {plan.cta}
                        </Button>
                      </a>
                    ) : (
                      <Link href={plan.ctaLink}>
                        <Button
                          variant={plan.variant}
                          className={`w-full mb-6 ${
                            plan.popular ? "shadow-lg shadow-primary/20" : ""
                          }`}
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
                );
              })}
            </div>
          </div>
        </section>

        {/* Feature Comparison highlights */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-heading font-bold mb-4">
                Tudo que você precisa em um só lugar
              </h2>
              <p className="text-muted-foreground text-lg">
                Ferramentas poderosas para cada etapa do seu negócio
                imobiliário.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: Home,
                  title: "Gestão de Imóveis",
                  desc: "Cadastro completo com fotos, vídeos e tour virtual.",
                },
                {
                  icon: Users,
                  title: "CRM de Leads",
                  desc: "Pipeline visual tipo Kanban para acompanhar cada lead.",
                },
                {
                  icon: Globe,
                  title: "Site Automático",
                  desc: "Seu site no ar em minutos, otimizado para SEO.",
                },
                {
                  icon: MessageSquare,
                  title: "WhatsApp",
                  desc: "Atendimento integrado com respostas automáticas.",
                },
                {
                  icon: FileCheck,
                  title: "Contratos",
                  desc: "Geração e gestão digital de contratos.",
                },
                {
                  icon: BarChart3,
                  title: "Relatorios",
                  desc: "Dashboards em tempo real e analytics avancados.",
                },
                {
                  icon: Brain,
                  title: "Inteligencia Artificial",
                  desc: "Descricoes, avaliacao de mercado e atendimento IA.",
                },
                {
                  icon: Shield,
                  title: "Seguranca",
                  desc: "Dados criptografados e backups automáticos diários.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-card p-6 rounded-xl border hover:shadow-md transition-shadow"
                >
                  <item.icon className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof — stats + testemunhos + selos */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            {/* Stats strip */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16 text-center mb-16">
              {[
                { value: "1.500+", label: "Imóveis cadastrados" },
                { value: "80+", label: "Imobiliárias ativas" },
                { value: "5.000+", label: "Leads gerenciados" },
                { value: "99%", label: "Satisfação dos clientes" },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.value}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Testemunhos */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-heading font-bold mb-4">
                Quem já usa, recomenda
              </h2>
              <p className="text-muted-foreground text-lg">
                Corretores e imobiliárias que cresceram com o ImobiBase.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
              {[
                {
                  text: "Reduzi em 60% o tempo para cadastrar imóveis e fechar contratos. O CRM integrado virou o cérebro da operação.",
                  name: "Mariana Souza",
                  role: "Diretora — Souza Imóveis",
                  initials: "MS",
                  color: "bg-primary/15 text-primary",
                },
                {
                  text: "Como corretor autônomo, o plano Gratuito já me atendeu muito bem. Subi para o Pro quando o volume de leads começou a crescer e não me arrependo.",
                  name: "Rafael Lima",
                  role: "Corretor autônomo — Campinas/SP",
                  initials: "RL",
                  color: "bg-emerald-500/15 text-emerald-600",
                },
                {
                  text: "A automação de marketing e os relatórios avançados fizeram diferença real no fechamento de vendas. Suporte nota 10.",
                  name: "Patrícia Alves",
                  role: "Gerente Comercial — Alves Negócios",
                  initials: "PA",
                  color: "bg-orange-500/15 text-orange-600",
                },
              ].map((t) => (
                <div
                  key={t.name}
                  className="bg-card p-6 rounded-2xl border hover:shadow-md transition-shadow flex flex-col"
                >
                  <Quote className="w-6 h-6 text-primary/40 mb-3" />
                  <p className="text-sm text-foreground leading-relaxed mb-5">
                    "{t.text}"
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div
                      className={`w-10 h-10 rounded-full ${t.color} flex items-center justify-center text-sm font-bold`}
                    >
                      {t.initials}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Selos de confiança */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-muted-foreground">
              {[
                { icon: Lock, label: "SSL / TLS 1.3" },
                { icon: Shield, label: "LGPD-compliant" },
                { icon: Award, label: "Hospedado no Brasil" },
                { icon: Star, label: "Uptime 99% SLA" },
              ].map((badge) => (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 text-sm"
                >
                  <badge.icon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-heading font-bold mb-12 text-center">
              Perguntas Frequentes
            </h2>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-card border px-6 rounded-xl"
                >
                  <AccordionTrigger className="hover:no-underline py-6 font-medium text-lg text-left">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-foreground text-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="container mx-auto px-4 text-center relative z-10">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6 tracking-tight">
              Ainda com dúvidas?
            </h2>
            <p className="text-xl text-background/80 mb-10 max-w-2xl mx-auto">
              Nossa equipe está pronta para ajudar você a escolher o melhor
              plano e tirar todas as suas dúvidas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`mailto:${CONTACT_EMAIL}?subject=Dúvidas sobre os planos do ImobiBase`}
              >
                <Button
                  size="lg"
                  className="h-14 px-10 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-2xl shadow-primary/30"
                >
                  <MessageSquare className="mr-2 w-5 h-5" /> Falar com um
                  consultor
                </Button>
              </a>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-10 text-lg rounded-full border-background/30 text-background hover:bg-background/10"
                >
                  Começar grátis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <PublicFooter variant="compact" />
      </main>
    </div>
  );
}
