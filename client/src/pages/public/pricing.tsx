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
} from "lucide-react";
import { plans, CONTACT_EMAIL } from "@/lib/plans-config";

const faqs = [
  {
    q: "Posso testar o ImobiBase antes de assinar?",
    a: "Sim! O plano Gratis permite que voce utilize o sistema sem custo, com ate 10 imoveis e 50 leads. Voce pode fazer upgrade a qualquer momento.",
  },
  {
    q: "Como funciona o pagamento?",
    a: "Aceitamos cartao de credito e boleto bancario. No plano anual, voce economiza 20% e paga em ate 12x sem juros no cartao.",
  },
  {
    q: "Consigo migrar meus dados de outro sistema?",
    a: "Sim! Oferecemos ferramentas de importacao via CSV e nossa equipe de suporte auxilia na migracao nos planos Basico, Profissional e Enterprise.",
  },
  {
    q: "Tem fidelidade ou multa de cancelamento?",
    a: "Nao. Voce pode cancelar a qualquer momento sem multas. Acreditamos na qualidade do nosso produto para manter voce conosco.",
  },
  {
    q: "O que acontece se eu ultrapassar o limite de imoveis?",
    a: "Voce recebera uma notificacao sugerindo o upgrade de plano. Seus imoveis existentes continuam funcionando, mas nao sera possivel cadastrar novos ate fazer o upgrade.",
  },
  {
    q: "A integracao com WhatsApp funciona automaticamente?",
    a: "Sim, nos planos Basico e superiores. Voce conecta seu numero e o sistema gerencia mensagens de leads automaticamente, incluindo respostas rapidas e notificacoes.",
  },
  {
    q: "Como funciona a IA do plano Profissional?",
    a: "A IA inclui geracao de descricoes de imoveis para marketing, avaliacao automatica de mercado (AVM) e um assistente inteligente para atendimento de leads (ISA).",
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/20 overflow-x-hidden">
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
              href="/#solucoes"
              className="hover:text-primary transition-colors"
            >
              Solucoes
            </Link>
            <Link href="/pricing" className="text-primary font-semibold">
              Precos
            </Link>
            <Link
              href="/#empresa"
              className="hover:text-primary transition-colors"
            >
              Empresa
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
                Comecar Gratis
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
              Inicio
            </Link>
            <Link
              href="/pricing"
              className="text-lg font-medium p-2 hover:bg-muted rounded-lg text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Precos
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
              Planos e Precos
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold mb-6 tracking-tight">
              Escolha o plano ideal <br className="hidden sm:block" />
              para sua imobiliaria
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Comece gratis e escale conforme seu negocio cresce. Sem surpresas,
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {plans.map((plan) => {
                const price =
                  billingCycle === "monthly"
                    ? plan.monthlyPrice
                    : plan.yearlyPrice;
                const isExternal = plan.ctaLink.startsWith("http");

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
                            {price === 0 ? "Gratis" : `R$ ${price}`}
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
                          {plan.isEnterprise
                            ? "Tudo do Pro, mais:"
                            : plan.id === "basico"
                              ? "Tudo do Gratis, mais:"
                              : "Tudo do Basico, mais:"}
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
                Tudo que voce precisa em um so lugar
              </h2>
              <p className="text-muted-foreground text-lg">
                Ferramentas poderosas para cada etapa do seu negocio
                imobiliario.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                {
                  icon: Home,
                  title: "Gestao de Imoveis",
                  desc: "Cadastro completo com fotos, videos e tour virtual.",
                },
                {
                  icon: Users,
                  title: "CRM de Leads",
                  desc: "Pipeline visual tipo Kanban para acompanhar cada lead.",
                },
                {
                  icon: Globe,
                  title: "Site Automatico",
                  desc: "Seu site no ar em minutos, otimizado para SEO.",
                },
                {
                  icon: MessageSquare,
                  title: "WhatsApp",
                  desc: "Atendimento integrado com respostas automaticas.",
                },
                {
                  icon: FileCheck,
                  title: "Contratos",
                  desc: "Geracao e gestao digital de contratos.",
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
                  desc: "Dados criptografados e backups automaticos diarios.",
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
              Ainda com duvidas?
            </h2>
            <p className="text-xl text-background/80 mb-10 max-w-2xl mx-auto">
              Nossa equipe esta pronta para ajudar voce a escolher o melhor
              plano e tirar todas as suas duvidas.
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
                  Comecar gratis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background border-t py-10">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2 font-heading font-bold text-lg mb-4 md:mb-0">
                <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs">
                  I
                </div>
                ImobiBase
              </div>
              <p>
                &copy; {new Date().getFullYear()} ImobiBase Tecnologia Ltda.
              </p>
              <div className="flex gap-6 mt-4 md:mt-0">
                <Link href="/termos" className="hover:text-foreground">
                  Termos
                </Link>
                <Link href="/privacidade" className="hover:text-foreground">
                  Privacidade
                </Link>
                <Link href="/" className="hover:text-foreground">
                  Início
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
