import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Check, CreditCard, Lock, Shield, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  stripePriceId: string | null;
}

export default function CheckoutPage() {
  const params = useParams<{ planId: string }>();
  const [, setLocation] = useLocation();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans");
        if (!res.ok) throw new Error("Erro ao carregar planos");
        const data: Plan[] = await res.json();
        setPlans(data);
        const found = data.find((p) => p.id === params.planId);
        if (found) {
          setPlan(found);
        } else {
          setError("Plano não encontrado");
        }
      } catch {
        setError("Erro ao carregar detalhes do plano");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, [params.planId]);

  const handleSubscribe = async () => {
    if (!plan) return;

    if (plan.id === "free") {
      toast.success("Plano gratuito ativado com sucesso!");
      setLocation("/dashboard");
      return;
    }

    if (!plan.stripePriceId) {
      toast.error("Este plano ainda não está disponível para assinatura. Configure as chaves do Stripe.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/payments/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          priceId: plan.stripePriceId,
          trialDays: 7,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao criar assinatura");
      }

      toast.success("Assinatura criada com sucesso!");
      setLocation("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar pagamento";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(priceInCents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando plano...</p>
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Erro</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => setLocation("/")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <Building2 className="h-5 w-5" />
            </div>
            <span className="font-heading font-bold text-lg">ImobiBase</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Confirmar Assinatura</h1>
            <p className="text-muted-foreground mt-2">
              Revise os detalhes do seu plano antes de confirmar
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 md:gap-8">
            {/* Plan Summary - Left Side */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant="secondary">Mensal</Badge>
                  </div>
                  <CardDescription>Plano selecionado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold text-primary">
                      {plan.price === 0 ? "Grátis" : formatPrice(plan.price)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-muted-foreground text-sm">/mês</span>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Recursos inclusos:</p>
                    <ul className="space-y-2">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.price > 0 && (
                    <>
                      <Separator />
                      <div className="bg-primary/5 rounded-lg p-3 text-sm">
                        <p className="font-medium text-primary">7 dias grátis</p>
                        <p className="text-muted-foreground text-xs mt-1">
                          Teste sem compromisso. Cancele a qualquer momento.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Payment Form - Right Side */}
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Pagamento
                  </CardTitle>
                  <CardDescription>
                    {plan.price === 0
                      ? "Nenhum pagamento necessário para o plano gratuito"
                      : "Insira os dados do cartão para iniciar sua assinatura"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {plan.price > 0 ? (
                    <>
                      {/* Stripe Elements placeholder */}
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center space-y-3">
                        <CreditCard className="w-10 h-10 text-muted-foreground/50 mx-auto" />
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Formulário de Pagamento Stripe
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            O formulário de cartão de crédito será exibido aqui quando as chaves do Stripe estiverem configuradas.
                          </p>
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Plano {plan.name}</span>
                          <span>{formatPrice(plan.price)}/mês</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Período de teste (7 dias)</span>
                          <span>-{formatPrice(plan.price)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total hoje</span>
                          <span className="text-primary">R$ 0,00</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Após o período de teste, a cobrança de {formatPrice(plan.price)} será feita mensalmente.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center space-y-2">
                      <Check className="w-10 h-10 text-green-500 mx-auto" />
                      <p className="font-medium">Plano Gratuito</p>
                      <p className="text-sm text-muted-foreground">
                        Comece a usar o ImobiBase agora mesmo, sem custo.
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button
                    className="w-full h-12 text-base font-semibold"
                    onClick={handleSubscribe}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : plan.price === 0 ? (
                      "Ativar Plano Gratuito"
                    ) : (
                      "Confirmar Assinatura"
                    )}
                  </Button>

                  {/* Security Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Conexão segura SSL
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Pagamento seguro via Stripe
                    </span>
                    <span className="flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      Cancele a qualquer momento
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
