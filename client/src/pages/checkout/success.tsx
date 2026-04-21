import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ArrowRight, Home } from "lucide-react";
import { SeoHead } from "@/components/seo/SeoHead";

export default function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    "loading" | "active" | "trial" | "pending" | "error"
  >("loading");

  useEffect(() => {
    // Polling curto — o webhook leva 1-5s para atualizar o DB.
    let attempts = 0;
    const maxAttempts = 12; // 12 × 1s = 12s max
    const poll = async () => {
      attempts++;
      try {
        const res = await fetch("/api/payments/subscription-status", {
          credentials: "include",
        });
        if (!res.ok) throw new Error("fetch falhou");
        const data = await res.json();
        if (data.status === "active") {
          setSubscriptionStatus("active");
          return;
        }
        if (data.status === "trial" || data.status === "trialing") {
          setSubscriptionStatus("trial");
          return;
        }
      } catch {
        /* continua polling */
      }
      if (attempts >= maxAttempts) {
        setSubscriptionStatus("pending");
        return;
      }
      setTimeout(poll, 1000);
    };
    const t = setTimeout(poll, 1500);
    return () => clearTimeout(t);
  }, []);

  const messages = {
    loading: {
      title: "Processando seu pagamento...",
      desc: "Estamos confirmando a assinatura com o Stripe. Isso leva alguns segundos.",
    },
    active: {
      title: "Assinatura ativa!",
      desc: "Pagamento confirmado. Seu plano já está ativo e todas as funcionalidades liberadas.",
    },
    trial: {
      title: "Período de teste iniciado!",
      desc: "Seu trial foi ativado. Aproveite todos os recursos do plano sem cobrança inicial.",
    },
    pending: {
      title: "Quase lá...",
      desc: "O pagamento foi recebido pelo Stripe, mas nosso sistema ainda está sincronizando. Atualize em alguns minutos ou acesse o dashboard.",
    },
    error: {
      title: "Erro ao confirmar",
      desc: "Houve um problema ao verificar sua assinatura. Consulte /settings/billing ou entre em contato com o suporte.",
    },
  };

  const msg = messages[subscriptionStatus];

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <SeoHead
        title="Assinatura confirmada | ImobiBase"
        description="Sua assinatura foi processada com sucesso."
        path="/checkout/success"
        noindex
      />
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6">
          <div className="flex flex-col items-center text-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              {subscriptionStatus === "loading" ? (
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">{msg.title}</h1>
              <p className="text-sm text-muted-foreground mt-2">{msg.desc}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="default"
              className="flex-1"
              onClick={() => setLocation("/dashboard")}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Ir para o dashboard
            </Button>
            <Link href="/settings/billing" className="flex-1">
              <Button variant="outline" className="w-full">
                Ver assinatura
              </Button>
            </Link>
          </div>

          {subscriptionStatus === "pending" && (
            <p className="mt-4 text-xs text-muted-foreground text-center">
              Se o plano não ativar em 5 minutos, envie um email para{" "}
              <a
                href="mailto:suporte@imobibase.com"
                className="text-primary hover:underline"
              >
                suporte@imobibase.com
              </a>{" "}
              com o ID da transação.
            </p>
          )}

          <div className="mt-6 pt-4 border-t text-center">
            <Link
              href="/"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Home className="w-3 h-3" /> Voltar à página inicial
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
