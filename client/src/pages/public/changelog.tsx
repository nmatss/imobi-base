import { Link } from "wouter";
import { ArrowLeft, Sparkles, Wrench, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeoHead, breadcrumbSchema } from "@/components/seo/SeoHead";
import { PublicFooter } from "@/components/public/PublicFooter";
import { Logo } from "@/components/brand/logo";

type ReleaseSection = {
  icon: "new" | "improved" | "security";
  title: string;
  items: string[];
};

type Release = {
  version: string;
  date: string;
  title: string;
  sections: ReleaseSection[];
};

// Changelog público curado (linguagem de usuário, não técnico).
// O detalhamento técnico completo fica no CHANGELOG.md do repositório.
const RELEASES: Release[] = [
  {
    version: "2.3",
    date: "Junho de 2026",
    title: "Identidade nova e mais polimento",
    sections: [
      {
        icon: "new",
        title: "Novidades",
        items: [
          "Nova identidade visual do ImobiBase, com logo e ícones redesenhados.",
          "Página de contato para falar direto com nosso time.",
          "Esta página de novidades, para você acompanhar a evolução do produto.",
        ],
      },
      {
        icon: "improved",
        title: "Melhorias",
        items: [
          "Confirmações de exclusão redesenhadas, mais claras e seguras.",
          "Títulos de página em todas as telas para facilitar a navegação entre abas.",
        ],
      },
    ],
  },
  {
    version: "2.2",
    date: "Abril de 2026",
    title: "Pagamentos mais simples e seguros",
    sections: [
      {
        icon: "new",
        title: "Novidades",
        items: [
          "Checkout de assinatura hospedado pelo Stripe, com cartão salvo em ambiente certificado PCI.",
          "Portal do assinante: upgrade, downgrade, cancelamento e faturas em um só lugar.",
          "Página de status de saúde do sistema para acompanhamento de disponibilidade.",
        ],
      },
      {
        icon: "security",
        title: "Segurança",
        items: [
          "Proteção reforçada de dados entre imobiliárias (isolamento por conta).",
          "Webhooks de pagamento com verificação criptográfica.",
        ],
      },
    ],
  },
  {
    version: "2.1",
    date: "Março de 2026",
    title: "Planos para todo tamanho de imobiliária",
    sections: [
      {
        icon: "new",
        title: "Novidades",
        items: [
          "Cinco planos: Gratuito, Starter, Profissional, Business e Enterprise.",
          "Vistorias digitais com checklist por cômodo, fotos e laudo assinado.",
          "Avaliação automática de imóveis (AVM) com dados de mercado.",
          "Assistente ISA com inteligência artificial para atendimento de leads.",
        ],
      },
      {
        icon: "improved",
        title: "Melhorias",
        items: [
          "Funil de leads em kanban com arrastar e soltar.",
          "Site público da imobiliária com cores e logo personalizados.",
        ],
      },
    ],
  },
];

const SECTION_META = {
  new: { label: "Novidades", icon: Sparkles, badge: "bg-primary/10 text-primary" },
  improved: { label: "Melhorias", icon: Wrench, badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  security: { label: "Segurança", icon: ShieldCheck, badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
} as const;

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SeoHead
        title="Novidades | ImobiBase"
        description="Acompanhe as novidades, melhorias e atualizações de segurança da plataforma ImobiBase."
        path="/novidades"
        structuredData={breadcrumbSchema([
          { name: "Início", path: "/" },
          { name: "Novidades", path: "/novidades" },
        ])}
      />
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Logo className="cursor-pointer" wordmarkClassName="text-xl" iconClassName="h-9 w-9" />
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl flex-1">
        <h1 className="text-4xl font-heading font-bold mb-2">Novidades</h1>
        <p className="text-muted-foreground mb-12">
          O que mudou no ImobiBase, versão a versão.
        </p>

        <div className="space-y-12">
          {RELEASES.map((release) => (
            <article key={release.version} className="relative pl-8 border-l-2 border-border">
              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-primary" />
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <Badge variant="outline" className="font-mono">v{release.version}</Badge>
                <span className="text-sm text-muted-foreground">{release.date}</span>
              </div>
              <h2 className="text-2xl font-heading font-bold mb-4">{release.title}</h2>
              <div className="space-y-5">
                {release.sections.map((section) => {
                  const meta = SECTION_META[section.icon];
                  const Icon = meta.icon;
                  return (
                    <div key={section.title}>
                      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-2 ${meta.badge}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </div>
                      <ul className="space-y-1.5 text-muted-foreground leading-relaxed list-disc pl-5">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
