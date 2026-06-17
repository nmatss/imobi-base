import { Link, useLocation } from "wouter";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Globe,
  LayoutDashboard,
  Plug,
  ShieldCheck,
  Smartphone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import {
  breadcrumbSchema,
  OrganizationSchema,
  SeoHead,
  siteUrl,
} from "@/components/seo/SeoHead";

type Solution = {
  slug: string;
  title: string;
  metaTitle: string;
  description: string;
  eyebrow: string;
  hero: string;
  bullets: string[];
  modules: Array<{
    icon: typeof Users;
    title: string;
    text: string;
  }>;
  faqs: Array<{ q: string; a: string }>;
};

const solutions: Record<string, Solution> = {
  "sistema-imobiliario-completo": {
    slug: "sistema-imobiliario-completo",
    metaTitle: "Sistema imobiliário completo | CRM, agenda, site e gestão",
    title: "Sistema imobiliário completo",
    eyebrow: "Plataforma all-in-one",
    hero: "Uma operação imobiliária inteira, do lead ao contrato",
    description:
      "O ImobiBase centraliza CRM imobiliário, agenda de visitas, site, imóveis, contratos, financeiro, locações, vistorias, WhatsApp, IA e relatórios para imobiliárias que querem crescer com controle.",
    bullets: [
      "CRM, imóveis, agenda e site conectados",
      "Gestão de vendas, locações, contratos e financeiro",
      "Dashboards para acompanhar leads, visitas, propostas e resultados",
    ],
    modules: [
      {
        icon: Users,
        title: "CRM imobiliário",
        text: "Funil de leads, origem, responsável, histórico, follow-ups e distribuição comercial.",
      },
      {
        icon: Clock,
        title: "Agenda de visitas",
        text: "Visitas, tarefas, retornos e compromissos em uma rotina centralizada.",
      },
      {
        icon: Globe,
        title: "Site imobiliário",
        text: "Vitrine pública responsiva, páginas de imóveis e captura de interessados.",
      },
      {
        icon: BarChart3,
        title: "Financeiro e BI",
        text: "Indicadores de conversão, receitas, comissões, repasses e performance.",
      },
    ],
    faqs: [
      {
        q: "O que é um sistema imobiliário completo?",
        a: "É uma plataforma que conecta atendimento, imóveis, visitas, propostas, contratos, locações, financeiro, site e relatórios sem depender de planilhas soltas.",
      },
      {
        q: "O ImobiBase atende imobiliárias pequenas e equipes maiores?",
        a: "Sim. A plataforma foi desenhada para corretores, imobiliárias em crescimento e operações com múltiplos usuários.",
      },
    ],
  },
  "crm-imobiliario": {
    slug: "crm-imobiliario",
    metaTitle: "CRM imobiliário | Leads, funil, visitas e WhatsApp",
    title: "CRM imobiliário",
    eyebrow: "Vendas e atendimento",
    hero: "Transforme cada lead em uma próxima ação clara",
    description:
      "Gerencie leads, funil comercial, atendimento por WhatsApp, follow-ups, visitas, propostas e histórico completo em um CRM feito para imobiliárias.",
    bullets: [
      "Funil por etapa, origem e responsável",
      "Histórico de atendimento e follow-ups",
      "Controle de visitas, propostas e conversão por corretor",
    ],
    modules: [
      {
        icon: LayoutDashboard,
        title: "Pipeline visual",
        text: "Veja em qual etapa cada oportunidade está e quais leads exigem ação.",
      },
      {
        icon: Users,
        title: "Distribuição de leads",
        text: "Organize responsáveis, prioridades e atendimento para reduzir tempo de resposta.",
      },
      {
        icon: Plug,
        title: "Canais integrados",
        text: "Conecte site, portais, WhatsApp e campanhas a uma base comercial única.",
      },
      {
        icon: BarChart3,
        title: "Gestão de performance",
        text: "Acompanhe visitas, propostas, conversão e gargalos da equipe.",
      },
    ],
    faqs: [
      {
        q: "Por que usar um CRM imobiliário em vez de uma planilha?",
        a: "Porque o CRM registra histórico, origem, responsável, próximas ações e indicadores de conversão sem depender de controle manual fragmentado.",
      },
      {
        q: "O CRM ajuda no primeiro atendimento?",
        a: "Sim. Ele centraliza dados do lead, origem, interesse e próximos passos para o corretor agir com contexto.",
      },
    ],
  },
  "software-de-agendamento-imobiliario": {
    slug: "software-de-agendamento-imobiliario",
    metaTitle: "Software de agendamento imobiliário | Visitas e follow-ups",
    title: "Software de agendamento imobiliário",
    eyebrow: "Agenda de visitas",
    hero: "Menos visitas perdidas, mais atendimento no horário certo",
    description:
      "Organize visitas, retornos, follow-ups e compromissos da equipe com uma agenda integrada ao CRM imobiliário e à jornada do cliente.",
    bullets: [
      "Visitas e tarefas ligadas ao lead e ao imóvel",
      "Rotina comercial com menos conflito de horário",
      "Histórico para acompanhar presença, feedback e próxima ação",
    ],
    modules: [
      {
        icon: Clock,
        title: "Agenda centralizada",
        text: "Controle compromissos de corretores, visitas e follow-ups em um só fluxo.",
      },
      {
        icon: Users,
        title: "Lead conectado à visita",
        text: "Cada agendamento mantém contexto do cliente, imóvel e responsável.",
      },
      {
        icon: Smartphone,
        title: "Rotina em campo",
        text: "Acesse a agenda em celular, tablet ou desktop durante o atendimento.",
      },
      {
        icon: BarChart3,
        title: "Indicadores de visita",
        text: "Acompanhe visitas marcadas, realizadas, canceladas e convertidas.",
      },
    ],
    faqs: [
      {
        q: "A agenda de visitas fica integrada ao CRM?",
        a: "Sim. A visita fica associada ao lead, ao imóvel e ao responsável, evitando controle paralelo.",
      },
      {
        q: "Por que agenda é importante para SEO e vendas?",
        a: "Porque usuários pesquisam soluções práticas para organizar visitas, e esse fluxo é uma das principais dores operacionais das imobiliárias.",
      },
    ],
  },
  "site-para-imobiliaria": {
    slug: "site-para-imobiliaria",
    metaTitle: "Site para imobiliária | Vitrine responsiva com CRM",
    title: "Site para imobiliária",
    eyebrow: "Vitrine, SEO e captura",
    hero: "Seu catálogo público conectado ao CRM",
    description:
      "Crie uma vitrine pública responsiva para imóveis, capture interessados, facilite contato por WhatsApp e mantenha páginas preparadas para SEO técnico.",
    bullets: [
      "Páginas públicas de imobiliária, catálogo e imóvel",
      "Captura de interessados conectada ao atendimento",
      "Estrutura responsiva para celular, tablet e desktop",
    ],
    modules: [
      {
        icon: Globe,
        title: "Vitrine pública",
        text: "Publique imóveis com fotos, preço, características, localização e contato.",
      },
      {
        icon: ShieldCheck,
        title: "SEO técnico",
        text: "Canonicals, sitemap, robots, metadados sociais e dados estruturados.",
      },
      {
        icon: Smartphone,
        title: "Responsivo",
        text: "Experiência adaptada para telas pequenas, médias e grandes.",
      },
      {
        icon: Users,
        title: "Lead no CRM",
        text: "Interessados entram no fluxo de atendimento da imobiliária.",
      },
    ],
    faqs: [
      {
        q: "O site para imobiliária substitui um site feito do zero?",
        a: "Para muitas imobiliárias, sim. Ele já nasce integrado aos imóveis e ao CRM, reduzindo manutenção manual.",
      },
      {
        q: "As páginas de imóveis podem aparecer no Google?",
        a: "Sim, desde que a imobiliária publique conteúdo útil, imagens, descrições completas e mantenha URLs públicas indexáveis.",
      },
    ],
  },
  "crm-imobiliario-com-ia": {
    slug: "crm-imobiliario-com-ia",
    metaTitle: "CRM imobiliário com IA | Atendimento, conteúdo e automação",
    title: "CRM imobiliário com IA",
    eyebrow: "Inteligência aplicada",
    hero: "IA que apoia a operação, não só escreve textos",
    description:
      "Use IA para acelerar descrições, avaliação, atendimento, automações, marketing e priorização de oportunidades dentro do CRM imobiliário.",
    bullets: [
      "IA para conteúdo e avaliação de imóveis",
      "Apoio em atendimento, follow-up e priorização",
      "Ações registradas no CRM para manter rastreabilidade",
    ],
    modules: [
      {
        icon: Brain,
        title: "Assistente inteligente",
        text: "Apoie atendimento, marketing, descrição de imóveis e tarefas repetitivas.",
      },
      {
        icon: Users,
        title: "Qualificação de lead",
        text: "Organize preferências, orçamento, urgência e próximos passos de cada contato.",
      },
      {
        icon: Globe,
        title: "Conteúdo para imóveis",
        text: "Melhore descrições, chamadas e materiais para anúncios e site.",
      },
      {
        icon: BarChart3,
        title: "Decisão com dados",
        text: "Combine IA com indicadores de conversão, visitas, propostas e imóveis parados.",
      },
    ],
    faqs: [
      {
        q: "O que diferencia IA aplicada de IA genérica?",
        a: "IA aplicada executa tarefas ligadas ao processo: qualificar, sugerir, registrar, priorizar, criar follow-up e apoiar decisões.",
      },
      {
        q: "A IA substitui o corretor?",
        a: "Não. Ela reduz tarefas repetitivas e melhora contexto para o corretor vender e atender melhor.",
      },
    ],
  },
};

function getCurrentSolution(pathname: string): Solution {
  const slug = pathname.replace(/^\//, "") || "sistema-imobiliario-completo";
  return solutions[slug] || solutions["sistema-imobiliario-completo"];
}

export default function SolutionPage() {
  const [pathname] = useLocation();
  const solution = getCurrentSolution(pathname);
  const path = `/${solution.slug}`;

  const structuredData = [
    OrganizationSchema,
    breadcrumbSchema([
      { name: "Inicio", path: "/" },
      { name: solution.title, path },
    ]),
    {
      "@type": "WebPage",
      name: solution.title,
      url: siteUrl(path),
      description: solution.description,
      inLanguage: "pt-BR",
      isPartOf: {
        "@type": "WebSite",
        name: "ImobiBase",
        url: siteUrl("/"),
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "ImobiBase",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: solution.description,
      offers: {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: "0",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: solution.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.a,
        },
      })),
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        title={`${solution.metaTitle} | ImobiBase`}
        description={solution.description}
        path={path}
        image="/opengraph.png"
        imageAlt={`ImobiBase - ${solution.title}`}
        structuredData={structuredData}
      />

      <header className="fixed top-0 z-50 w-full border-b bg-background/85 backdrop-blur-md">
        <div className="container mx-auto h-16 px-4 flex items-center justify-between">
          <Link href="/">
            <Logo wordmarkClassName="text-xl" iconClassName="h-9 w-9" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/crm-imobiliario" className="hover:text-primary">
              CRM
            </Link>
            <Link href="/software-de-agendamento-imobiliario" className="hover:text-primary">
              Agenda
            </Link>
            <Link href="/site-para-imobiliaria" className="hover:text-primary">
              Site
            </Link>
            <Link href="/pricing" className="hover:text-primary">
              Preços
            </Link>
          </nav>
          <Link href="/login">
            <Button size="sm">Começar</Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="relative min-h-[620px] flex items-center overflow-hidden pt-20">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=2200"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/70" />
          <div className="relative z-10 container mx-auto px-4 py-20 text-white">
            <div className="max-w-3xl">
              <Badge className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/10">
                {solution.eyebrow}
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6">
                {solution.hero}
              </h1>
              <p className="text-lg sm:text-xl text-white/80 leading-relaxed max-w-2xl mb-8">
                {solution.description}
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-10 max-w-3xl">
                {solution.bullets.map((bullet) => (
                  <div
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-white/90"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{bullet}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/login">
                  <Button size="lg" className="w-full sm:w-auto">
                    Testar ImobiBase
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/pricing">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    Ver planos
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mb-12">
              <Badge variant="outline" className="mb-4">
                Recursos
              </Badge>
              <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5">
                O que a plataforma entrega nessa frente
              </h2>
              <p className="text-lg text-muted-foreground">
                Cada página pública do ImobiBase foi criada para responder a
                uma intenção de busca específica e conectar essa demanda ao
                fluxo real da operação imobiliária.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {solution.modules.map((module) => (
                <article
                  key={module.title}
                  className="rounded-2xl border bg-card p-6 shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
                    <module.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{module.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {module.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30 border-y">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
              <div>
                <Badge variant="outline" className="mb-4">
                  Jornada
                </Badge>
                <h2 className="text-3xl md:text-4xl font-heading font-bold mb-5">
                  Fluxo pensado para vender, alugar e acompanhar melhor
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  A vantagem competitiva não está em ter mais uma tela. Está em
                  conectar etapas que normalmente ficam espalhadas entre
                  planilhas, WhatsApp, agenda, portais e sistemas isolados.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  "Captura do lead no site ou canal integrado",
                  "Registro automático de origem, interesse e responsável",
                  "Agendamento de visita ou follow-up no CRM",
                  "Proposta, contrato, comissão e relatório de resultado",
                ].map((step, index) => (
                  <div key={step} className="rounded-2xl border bg-background p-5">
                    <div className="text-sm font-bold text-primary mb-2">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <p className="font-medium leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-background">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-heading font-bold mb-8">
              Perguntas frequentes
            </h2>
            <div className="space-y-4">
              {solution.faqs.map((faq) => (
                <article key={faq.q} className="rounded-2xl border p-6 bg-card">
                  <h3 className="font-bold mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-foreground text-background">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-5xl font-heading font-bold mb-5">
              Leve essa operação para dentro do ImobiBase
            </h2>
            <p className="text-background/75 max-w-2xl mx-auto mb-8">
              Teste a plataforma e veja como CRM, agenda, site, contratos,
              financeiro, locações, vistorias, WhatsApp e IA trabalham juntos.
            </p>
            <Link href="/login">
              <Button size="lg">Criar conta grátis</Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
