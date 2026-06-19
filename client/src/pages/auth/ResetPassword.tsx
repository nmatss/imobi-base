import { usePageTitle } from "@/hooks/use-page-title";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  usePageTitle("Redefinir Senha");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // wouter não expõe a query string no hook de rota — lê direto da URL.
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token"));

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState<{
    valid: boolean;
    score: number;
    requirements: {
      minLength: boolean;
      hasUppercase: boolean;
      hasLowercase: boolean;
      hasNumber: boolean;
      hasSpecialChar: boolean;
    };
  }>({
    valid: false,
    score: 0,
    requirements: {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false,
    },
  });

  useEffect(() => {
    if (!token) {
      toast({
        title: "Token inválido",
        description: "Link de redefinição inválido ou expirado",
        variant: "destructive",
      });
      setLocation("/auth/forgot-password");
      return;
    }

    validateToken();
  }, [token]);

  useEffect(() => {
    if (!password) return;
    // Debounce: evita uma requisição a /validate-password por tecla (e race conditions na barra de força).
    const handle = setTimeout(() => {
      checkPasswordStrength();
    }, 300);
    return () => clearTimeout(handle);
  }, [password]);

  const validateToken = async () => {
    setValidating(true);
    try {
      const response = await fetch(`/api/auth/reset-token/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Token inválido");
      }

      setTokenValid(true);
      setEmail(data.email);
    } catch (error: any) {
      toast({
        title: "Token inválido",
        description: error.message,
        variant: "destructive",
      });
      setTimeout(() => setLocation("/auth/forgot-password"), 2000);
    } finally {
      setValidating(false);
    }
  };

  const checkPasswordStrength = async () => {
    try {
      const response = await fetch("/api/auth/security/validate-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const data = await response.json();
        setPasswordStrength(data);
      }
    } catch (error) {
      console.error("Error checking password strength:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordStrength.valid) {
      toast({
        title: "Senha fraca",
        description: "A senha não atende aos requisitos mínimos de segurança",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas não são iguais",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao redefinir senha");
      }

      setSuccess(true);
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi alterada com sucesso",
      });

      setTimeout(() => setLocation("/login"), 3000);

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

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Validando link...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md space-y-6 p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Link inválido ou expirado
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Solicite uma nova redefinição de senha para receber um link válido.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/auth/forgot-password">Solicitar novo link</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
              Senha redefinida!
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const getStrengthColor = (score: number) => {
    if (score >= 100) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div>
          <h1 className="text-center text-3xl font-bold tracking-tight text-foreground">
            Redefinir senha
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Para: <strong>{email}</strong>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative mt-1">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {password && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Força da senha:</span>
                  <span className="font-medium">{passwordStrength.score}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${getStrengthColor(passwordStrength.score)}`}
                    style={{ width: `${passwordStrength.score}%` }}
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <div className={`flex items-center gap-1 ${passwordStrength.requirements.minLength ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.requirements.minLength ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>Mínimo 8 caracteres</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasUppercase ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.requirements.hasUppercase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>Letra maiúscula</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasLowercase ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.requirements.hasLowercase ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>Letra minúscula</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasNumber ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.requirements.hasNumber ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>Número</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordStrength.requirements.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}`}>
                    {passwordStrength.requirements.hasSpecialChar ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>Caractere especial</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua nova senha"
              className="mt-1"
            />
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !passwordStrength.valid || password !== confirmPassword}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Redefinir senha
            </Button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm font-medium text-primary hover:text-primary/80"
            >
              Voltar para login
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
