import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
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
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Verifique seu email
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá
              instruções para redefinir sua senha.
            </p>
            <p className="mt-4 text-sm text-gray-600">
              Não recebeu o email? Verifique sua pasta de spam ou{" "}
              <button
                onClick={() => setSent(false)}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                tente novamente
              </button>
            </p>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              onClick={() => navigate("/auth/login")}
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Esqueceu sua senha?
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
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
              to="/auth/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
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
