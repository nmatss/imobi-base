import { Link } from "wouter";
import { Instagram, Linkedin, Youtube } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export interface PublicFooterProps {
  variant?: "full" | "compact";
}

export function PublicFooter({ variant = "compact" }: PublicFooterProps) {
  const year = new Date().getFullYear();

  if (variant === "compact") {
    return (
      <footer className="bg-background border-t py-10 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
            <Link href="/">
              <Logo className="cursor-pointer" wordmarkClassName="text-lg" iconClassName="h-7 w-7" />
            </Link>

            <div className="flex gap-3">
              <a
                href="https://instagram.com/imobibase"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com/company/imobibase"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="https://youtube.com/@imobibase"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-primary hover:text-white transition-all"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-center">
              <Link href="/contato" className="hover:text-foreground">
                Contato
              </Link>
              <Link href="/novidades" className="hover:text-foreground">
                Novidades
              </Link>
              <Link href="/termos" className="hover:text-foreground">
                Termos
              </Link>
              <Link href="/privacidade" className="hover:text-foreground">
                Privacidade
              </Link>
              <span className="w-full sm:w-auto text-muted-foreground/70">
                &copy; {year} ImobiBase
              </span>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  // Full variant (usado pela landing principal — mantido aqui para reuso futuro)
  return (
    <footer className="bg-background border-t pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 mb-16">
          <div>
            <Logo className="mb-6" wordmarkClassName="text-2xl" iconClassName="h-9 w-9" />
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
                <Link href="/pricing" className="hover:text-primary transition-colors">
                  Preços
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-primary transition-colors">
                  Entrar
                </Link>
              </li>
              <li>
                <Link href="/signup" className="hover:text-primary transition-colors">
                  Criar conta
                </Link>
              </li>
              <li>
                <Link href="/termos" className="hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-primary transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/novidades" className="hover:text-primary transition-colors">
                  Novidades
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">Contato</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li>
                <Link href="/contato" className="hover:text-primary transition-colors">
                  Fale conosco
                </Link>
              </li>
              <li>
                <a
                  href="mailto:contato@imobibase.com"
                  className="hover:text-primary transition-colors"
                >
                  contato@imobibase.com
                </a>
              </li>
              <li>
                <a
                  href="mailto:suporte@imobibase.com"
                  className="hover:text-primary transition-colors"
                >
                  suporte@imobibase.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>&copy; {year} ImobiBase Tecnologia Ltda.</p>
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
  );
}
