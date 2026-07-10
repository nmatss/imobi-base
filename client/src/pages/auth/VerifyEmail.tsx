import { usePageTitle } from "@/hooks/use-page-title";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmail() {
  usePageTitle("Verificação de E-mail");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // wouter não expõe a query string no hook de rota — lê direto da URL.
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de verificação não encontrado");
      setVerifying(false);
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    setVerifying(true);
    try {
      const response = await fetch(`/api/auth/verify-email/${token}`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao verificar email");
      }

      setSuccess(true);
      toast({
        title: "Email verificado",
        description: "Seu email foi verificado com sucesso!",
      });

      // Redireciona para /login (não /dashboard): o link de verificação costuma ser
      // aberto em outro navegador/dispositivo sem sessão ativa, e /dashboard é protegido —
      // iria saltar /verify-email -> /dashboard -> /login de forma confusa.
      setTimeout(() => setLocation("/login"), 3000);

    } catch (error: any) {
      setError(error.message);
      toast({
        title: "Erro na verificação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResending(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao reenviar email de verificação");
      }

      toast({
        title: "Email enviado",
        description: data.message || "Se o email existir e não estiver verificado, você receberá um novo link",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Verificando seu email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          {success ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                Email verificado!
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Seu email foi verificado com sucesso. Redirecionando para o login...
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                Erro na verificação
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                O link pode ter expirado ou já foi usado.
              </p>
            </>
          )}
        </div>

        {!success && (
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              onClick={() => setLocation("/login")}
              className="w-full"
            >
              Ir para login
            </Button>

            {/* Reenvio inline — o endpoint POST /api/auth/resend-verification
                recebe o email e responde sempre sucesso (anti-enumeração). */}
            <form onSubmit={handleResend} className="space-y-2 border-t pt-4">
              <Label htmlFor="resend-email">Reenviar email de verificação</Label>
              <Input
                id="resend-email"
                type="email"
                autoComplete="email"
                required
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <Button type="submit" variant="outline" className="w-full" isLoading={resending}>
                Reenviar email de verificação
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}
