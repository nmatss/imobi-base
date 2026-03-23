/**
 * Canonical plan definitions shared between landing page and pricing page.
 * Single source of truth for plan names, prices, features, and CTAs.
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
    name: "Grátis",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Para começar sua jornada digital.",
    features: [
      "Até 10 imóveis",
      "Até 50 leads",
      "1 usuário",
      "Site público básico",
    ],
    cta: "Começar grátis",
    ctaLink: "/login",
    variant: "outline",
    popular: false,
  },
  {
    id: "basico",
    name: "Básico",
    monthlyPrice: 99,
    yearlyPrice: 79,
    description: "Para quem quer crescer com eficiência.",
    features: [
      "Até 100 imóveis",
      "Leads ilimitados",
      "5 usuários",
      "Integração WhatsApp",
      "Relatórios básicos",
      "Suporte por email",
    ],
    cta: "Assinar Básico",
    ctaLink: "/login?plan=basico",
    variant: "outline",
    popular: false,
  },
  {
    id: "pro",
    name: "Profissional",
    monthlyPrice: 199,
    yearlyPrice: 159,
    description: "Para quem quer escalar vendas.",
    features: [
      "Imóveis ilimitados",
      "Leads ilimitados",
      "Usuários ilimitados",
      "Todas as integrações",
      "IA (Marketing, AVM, ISA)",
      "Portal do cliente",
      "Vistorias digitais",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    ctaLink: "/login?plan=pro",
    variant: "default",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: -1,
    yearlyPrice: -1,
    description: "Para redes e franquias.",
    features: [
      "Tudo do Profissional",
      "API personalizada",
      "Suporte dedicado",
      "SLA garantido",
      "Multi-filiais",
      "Onboarding assistido",
      "Gerente de conta",
    ],
    cta: "Fale conosco",
    ctaLink: `mailto:${CONTACT_EMAIL}?subject=Interesse%20no%20plano%20Enterprise`,
    variant: "outline",
    popular: false,
    isEnterprise: true,
  },
];

/** Subset of plans shown on the main landing page (3 plans) */
export const landingPlans = plans.filter(
  (p) => p.id === "free" || p.id === "pro" || p.id === "enterprise"
);
