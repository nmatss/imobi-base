import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

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

      setTimeout(() => navigate("/dashboard"), 3000);

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

  if (verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-2 text-sm text-gray-600">Verificando seu email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          {success ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                Email verificado!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Seu email foi verificado com sucesso. Redirecionando...
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                Erro na verificação
              </h2>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <p className="mt-4 text-sm text-gray-600">
                O link pode ter expirado ou já foi usado.
              </p>
            </>
          )}
        </div>

        {!success && (
          <div className="mt-6 space-y-3">
            <Button
              type="button"
              onClick={() => navigate("/auth/login")}
              className="w-full"
            >
              Ir para login
            </Button>
            <Link
              to="/auth/resend-verification"
              className="block text-center text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Reenviar email de verificação
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
