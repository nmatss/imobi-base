import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { TwoFactorRequiredError, useImobi } from "@/lib/imobi-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo, LogoIcon } from "@/components/brand/logo";
import { SeoHead } from "@/components/seo/SeoHead";
import { OAuthButtons } from "@/components/auth/OAuthButtons";

// Mensagens amigáveis para os códigos de erro que os callbacks OAuth
// (server/auth/oauth-google.ts, oauth-microsoft.ts) anexam a `/login?error=`.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  email_in_use_other_provider:
    "Este email já tem uma conta com senha (ou outro provedor). Entre com email e senha para continuar.",
  oauth_failed: "Não foi possível entrar com o provedor. Tente novamente.",
  oauth_account_not_found: "Nenhuma conta encontrada para este login social.",
  oauth_not_configured: "Login social indisponível no momento.",
  oauth_callback_failed: "Falha ao concluir o login social. Tente novamente.",
  no_email_from_provider:
    "O provedor não retornou um email. Use outro método de login.",
  session_error: "Não foi possível iniciar a sessão. Tente novamente.",
  login_failed: "Não foi possível completar o login. Tente novamente.",
  session_unavailable:
    "Serviço de sessão indisponível. Tente novamente em instantes.",
  missing_code: "Login social incompleto. Tente novamente.",
  invalid_state: "Sessão de login expirada. Tente novamente.",
};

export default function LoginPage() {
  const { login, user, loading } = useImobi();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (!code) return "";
    return OAUTH_ERROR_MESSAGES[code] || "Não foi possível entrar. Tente novamente.";
  });
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  // Preserva a intencao de compra vinda da pricing (`/login?plan=pro`): apos o
  // login, leva o usuario direto ao checkout do plano escolhido (planos pagos).
  const intendedPlan = React.useMemo(() => {
    const p = new URLSearchParams(window.location.search).get("plan");
    return p && p !== "free" ? p : null;
  }, []);
  const postLoginTarget = intendedPlan ? `/checkout/${intendedPlan}` : "/dashboard";

  useEffect(() => {
    if (user) setLocation(postLoginTarget);
  }, [user, setLocation, postLoginTarget]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const twoFactorToken = formData.get("twoFactorToken") as string | null;

    try {
      await login(
        email,
        password,
        twoFactorRequired ? { twoFactorToken: twoFactorToken || "" } : undefined,
      );
    } catch (error: unknown) {
      if (error instanceof TwoFactorRequiredError) {
        setTwoFactorRequired(true);
        setError("");
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Email ou senha incorretos";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <SeoHead
        title="Entrar | ImobiBase"
        description="Acesse sua conta ImobiBase. Gestão completa da sua imobiliária: CRM, imóveis, contratos, financeiro e site."
        path="/login"
        noindex
      />
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 rounded-xl bg-white/95 shadow-lg flex items-center justify-center">
              <LogoIcon className="h-8 w-8" />
            </div>
            <span className="font-heading font-extrabold text-2xl tracking-tight">
              ImobiBase
            </span>
          </div>
        </div>

        <div className="relative z-10 text-white space-y-6">
          <h1 className="text-4xl font-heading font-bold leading-tight">
            Gerencie sua imobiliária com inteligência
          </h1>
          <p className="text-lg text-white/80 max-w-md">
            Centralize imóveis, leads e contratos em uma única plataforma.
            Do primeiro contato à assinatura do contrato.
          </p>
          <ul className="space-y-3 pt-4">
            {[
              "CRM de leads com funil e distribuição automática",
              "Site próprio com SEO e portal do cliente",
              "Agenda de visitas, contratos e financeiro integrados",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-white/80">
                <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 20 20" className="w-3 h-3 fill-white" aria-hidden="true">
                    <path d="M7.5 13.5 4 10l1.4-1.4 2.1 2.1 5.1-5.1L14 7z" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-white/60 text-sm">
          © {new Date().getFullYear()} ImobiBase. Todos os direitos reservados.
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center justify-center mb-8">
            <Logo wordmarkClassName="text-xl" iconClassName="h-10 w-10" />
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-heading font-bold tracking-tight">
              Bem-vindo de volta
            </h2>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais para acessar o painel
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                defaultValue=""
                required
                className="h-12"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                defaultValue=""
                required
                className="h-12"
                data-testid="input-password"
              />
            </div>

            {twoFactorRequired && (
              <div className="space-y-2">
                <Label htmlFor="twoFactorToken" className="text-sm font-medium">
                  Código de autenticação
                </Label>
                <Input
                  id="twoFactorToken"
                  name="twoFactorToken"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  className="h-12"
                  data-testid="input-two-factor-token"
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Entrando..." : twoFactorRequired ? "Verificar" : "Entrar"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <OAuthButtons action="login" />

          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link
              href={intendedPlan ? `/signup?plan=${intendedPlan}` : "/signup"}
              className="text-primary font-medium hover:underline"
            >
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
