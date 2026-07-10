export type PublicSeoRoute = {
  path: string;
  title: string;
  description: string;
  changefreq: "weekly" | "monthly";
  priority: number;
  image?: string;
  imageAlt?: string;
  structuredData?: Array<Record<string, unknown>>;
  preloadHero?: boolean;
};

export const SITE_URL = (
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  "https://imobibase.com.br"
).replace(/\/$/, "");

const organizationSchema = {
  "@type": "Organization",
  name: "ImobiBase",
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  contactPoint: {
    "@type": "ContactPoint",
    email: "contato@imobibase.com.br",
    contactType: "customer support",
    areaServed: "BR",
    availableLanguage: ["Portuguese"],
  },
};

function softwareSchema(description: string): Record<string, unknown> {
  return {
    "@type": "SoftwareApplication",
    name: "ImobiBase",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description,
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: "0",
    },
  };
}

export const PUBLIC_SEO_ROUTES: PublicSeoRoute[] = [
  {
    path: "/",
    title: "ImobiBase | Sistema imobiliário completo com CRM, site e agenda",
    description:
      "Sistema completo para imobiliárias: CRM de leads, agenda de visitas, site imobiliário, imóveis, contratos, financeiro, locações, vistorias, WhatsApp e IA.",
    changefreq: "weekly",
    priority: 1,
    imageAlt: "Dashboard do sistema imobiliário ImobiBase",
    preloadHero: true,
    structuredData: [
      organizationSchema,
      softwareSchema(
        "Sistema completo para imobiliárias com CRM, agenda de visitas, site, contratos, financeiro, locações, vistorias, WhatsApp e IA.",
      ),
      {
        "@type": "WebSite",
        name: "ImobiBase",
        url: SITE_URL,
        inLanguage: "pt-BR",
      },
    ],
  },
  {
    path: "/sistema-imobiliario-completo",
    title: "Sistema imobiliário completo | CRM, agenda, site e gestão | ImobiBase",
    description:
      "O ImobiBase centraliza CRM imobiliário, agenda de visitas, site, imóveis, contratos, financeiro, locações, vistorias, WhatsApp, IA e relatórios para imobiliárias que querem crescer com controle.",
    changefreq: "weekly",
    priority: 0.95,
    structuredData: [organizationSchema, softwareSchema("Sistema imobiliário completo para operação imobiliária de ponta a ponta.")],
  },
  {
    path: "/crm-imobiliario",
    title: "CRM imobiliário | Leads, funil, visitas e WhatsApp | ImobiBase",
    description:
      "Gerencie leads, funil comercial, atendimento por WhatsApp, follow-ups, visitas, propostas e histórico completo em um CRM feito para imobiliárias.",
    changefreq: "weekly",
    priority: 0.95,
    structuredData: [organizationSchema, softwareSchema("CRM imobiliário para leads, funil, visitas, WhatsApp e propostas.")],
  },
  {
    path: "/software-de-agendamento-imobiliario",
    title: "Software de agendamento imobiliário | Visitas e follow-ups | ImobiBase",
    description:
      "Organize visitas, retornos, follow-ups e compromissos da equipe com uma agenda integrada ao CRM imobiliário e à jornada do cliente.",
    changefreq: "weekly",
    priority: 0.95,
    structuredData: [organizationSchema, softwareSchema("Software de agendamento imobiliário integrado ao CRM e ao funil comercial.")],
  },
  {
    path: "/site-para-imobiliaria",
    title: "Site para imobiliária | Vitrine responsiva com CRM | ImobiBase",
    description:
      "Crie uma vitrine pública responsiva para imóveis, capture interessados, facilite contato por WhatsApp e mantenha páginas preparadas para SEO técnico.",
    changefreq: "weekly",
    priority: 0.9,
    structuredData: [organizationSchema, softwareSchema("Site para imobiliária com vitrine pública, captura de leads e SEO técnico.")],
  },
  {
    path: "/crm-imobiliario-com-ia",
    title: "CRM imobiliário com IA | Atendimento, conteúdo e automação | ImobiBase",
    description:
      "Use IA para acelerar descrições, avaliação, atendimento, automações, marketing e priorização de oportunidades dentro do CRM imobiliário.",
    changefreq: "weekly",
    priority: 0.9,
    structuredData: [organizationSchema, softwareSchema("CRM imobiliário com IA para atendimento, conteúdo, automação e priorização de oportunidades.")],
  },
  {
    path: "/pricing",
    title: "Planos e Preços | ImobiBase",
    description:
      "Conheça os planos do ImobiBase: Gratuito, Starter, Profissional, Business e Enterprise. Escolha o plano ideal para sua imobiliária com 20% de desconto no pagamento anual.",
    changefreq: "weekly",
    priority: 0.9,
  },
  {
    path: "/contato",
    title: "Fale Conosco | ImobiBase",
    description:
      "Entre em contato com o time do ImobiBase. Tire dúvidas sobre planos, recursos e migração da sua imobiliária.",
    changefreq: "monthly",
    priority: 0.6,
  },
  {
    path: "/novidades",
    title: "Novidades | ImobiBase",
    description:
      "Acompanhe as novidades, melhorias e atualizações de segurança da plataforma ImobiBase.",
    changefreq: "weekly",
    priority: 0.5,
  },
  {
    path: "/termos",
    title: "Termos de Uso | ImobiBase",
    description:
      "Leia os termos de uso da plataforma ImobiBase para imobiliárias, corretores, proprietários, inquilinos e clientes.",
    changefreq: "monthly",
    priority: 0.3,
  },
  {
    path: "/privacidade",
    title: "Política de Privacidade | ImobiBase",
    description:
      "Entenda como o ImobiBase trata dados pessoais, privacidade, segurança, cookies e direitos previstos na LGPD.",
    changefreq: "monthly",
    priority: 0.3,
  },
];

export function routeCanonical(path: string): string {
  return path === "/" ? SITE_URL : `${SITE_URL}${path}`;
}
