/**
 * Canonical plan definitions shared between landing page and pricing page.
 * Single source of truth for plan names, prices, features, and CTAs.
 *
 * Pricing strategy based on competitive analysis (March 2026):
 *   - Jetimob: R$199 / R$367 / R$749
 *   - Cim Imob: R$199 / R$349 / R$599 / R$999
 *   - Praedium: R$57-77/user + R$59 site
 *   - ImobiBrasil: R$74,99 pacote único
 *
 * Positioning: best value in market — free tier as differentiator,
 * aggressive mid-tier pricing to capture market share, clear upgrade
 * path to capture value from larger agencies.
 */

export interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  variant: "default" | "outline";
  popular: boolean;
  isEnterprise?: boolean;
}

export const CONTACT_EMAIL = "contato@imobibase.com.br";

export const plans: Plan[] = [
  {
    id: "free",
    name: "Gratuito",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Para corretores autônomos começarem.",
    features: [
      "Até 15 imóveis",
      "Até 30 leads/mês",
      "1 usuário",
      "Site público básico",
      "Suporte por email",
    ],
    cta: "Começar grátis",
    ctaLink: "/login",
    variant: "outline",
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: 89,
    yearlyPrice: 69,
    description: "Para corretores e pequenas imobiliárias.",
    features: [
      "Até 100 imóveis",
      "Leads ilimitados",
      "3 usuários",
      "Site profissional com SEO",
      "Integração WhatsApp",
      "Relatórios básicos",
      "Suporte por email",
    ],
    cta: "Começar teste grátis",
    ctaLink: "/login?plan=starter",
    variant: "outline",
    popular: false,
  },
  {
    id: "pro",
    name: "Profissional",
    monthlyPrice: 199,
    yearlyPrice: 159,
    description: "Para imobiliárias que querem escalar.",
    features: [
      "Até 500 imóveis",
      "Leads ilimitados",
      "10 usuários",
      "Todas as integrações",
      "IA (Marketing, AVM, ISA)",
      "Portal do cliente",
      "Contratos digitais",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    cta: "Começar teste grátis",
    ctaLink: "/login?plan=pro",
    variant: "default",
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    monthlyPrice: 399,
    yearlyPrice: 319,
    description: "Para imobiliárias de alto volume.",
    features: [
      "Imóveis ilimitados",
      "Usuários ilimitados",
      "Multi-filiais",
      "API & Webhooks",
      "Vistorias digitais",
      "Gestão de comissões",
      "Relatórios personalizados",
      "Suporte por WhatsApp",
    ],
    cta: "Começar teste grátis",
    ctaLink: "/login?plan=business",
    variant: "outline",
    popular: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 799,
    yearlyPrice: 639,
    description: "Para redes, franquias e incorporadoras.",
    features: [
      "Tudo do Business",
      "SLA 99.9% garantido",
      "Onboarding assistido",
      "Gerente de conta dedicado",
      "Integrações personalizadas",
      "Treinamento da equipe",
    ],
    cta: "Falar com especialista",
    ctaLink: `mailto:${CONTACT_EMAIL}?subject=Interesse%20no%20plano%20Enterprise`,
    variant: "outline",
    popular: false,
    isEnterprise: true,
  },
];

/** Subset of plans shown on the main landing page (4 plans, excluding Enterprise) */
export const landingPlans = plans.filter((p) => p.id !== "enterprise");
