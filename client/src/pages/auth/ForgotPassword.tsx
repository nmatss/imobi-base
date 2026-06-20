import { usePageTitle } from "@/hooks/use-page-title";
import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/brand/logo";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  usePageTitle("Recuperar Senha");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, informe seu email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao solicitar redefinição de senha");
      }

      setSent(true);
      toast({
        title: "Email enviado",
        description: "Se o email existir, você receberá instruções para redefinir sua senha",
      });

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md space-y-8 p-8">
          <div className="flex justify-center"><Logo wordmarkClassName="text-xl" iconClassName="h-9 w-9" /></div>
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
              Verifique seu email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá
              instruções para redefinir sua senha.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Não recebeu o email? Verifique sua pasta de spam ou{" "}
              <button
                onClick={() => setSent(false)}
                className="font-medium text-primary hover:text-primary/80"
              >
                tente novamente
              </button>
            </p>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              onClick={() => setLocation("/login")}
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="flex justify-center"><Logo wordmarkClassName="text-xl" iconClassName="h-9 w-9" /></div>
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Esqueceu sua senha?
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Não se preocupe, enviaremos instruções para redefinir sua senha.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="mt-1"
            />
          </div>

          <div>
            <Button type="submit" className="w-full" isLoading={loading}>
              Enviar instruções
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              <ArrowLeft className="mr-1 inline h-4 w-4" />
              Voltar para login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
