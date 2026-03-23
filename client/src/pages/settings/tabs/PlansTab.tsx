import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { SettingsCard } from "../components/SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CreditCard,
  Users,
  Building2,
  Headphones,
  TrendingUp,
  Calendar,
  Loader2,
  ExternalLink,
  FileText,
  AlertCircle,
  Check,
  ArrowUpRight,
  UserSearch,
  Plug,
  Infinity,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface UsageResource {
  current: number;
  max: number;
}

interface UsageData {
  plan: { name: string; slug: string };
  status: string;
  users: UsageResource;
  properties: UsageResource;
  leads: UsageResource;
  integrations: UsageResource;
  features: string[];
}

interface SubscriptionStatus {
  status: string;
  plan: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string;
  cancelledAt?: string;
}

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: number;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  stripePriceId: string | null;
}

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  trial: { label: "Teste", variant: "secondary" },
  trialing: { label: "Teste", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  canceled: { label: "Cancelado", variant: "destructive" },
  past_due: { label: "Pagamento pendente", variant: "destructive" },
  free: { label: "Grátis", variant: "outline" },
};

const invoiceStatusLabels: Record<string, string> = {
  paid: "Pago",
  open: "Aberto",
  draft: "Rascunho",
  void: "Anulado",
  uncollectible: "Inadimplente",
};

export function PlansTab() {
  const [, setLocation] = useLocation();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingSub, setLoadingSub] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchSubscription();
    fetchInvoices();
    fetchPlans();
    fetchUsage();
  }, []);

  async function fetchSubscription() {
    try {
      const res = await fetch("/api/payments/subscription-status", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
      }
    } catch {
      // Silently fail - show default state
    } finally {
      setLoadingSub(false);
    }
  }

  async function fetchInvoices() {
    try {
      const res = await fetch("/api/payments/invoices", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingInvoices(false);
    }
  }

  async function fetchPlans() {
    try {
      const res = await fetch("/api/plans");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
      }
    } catch {
      // Silently fail
    }
  }

  async function fetchUsage() {
    try {
      const res = await fetch("/api/subscription/usage", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingUsage(false);
    }
  }

  async function handleCancelSubscription() {
    setCancelling(true);
    try {
      const res = await fetch("/api/payments/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ immediate: false }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao cancelar assinatura");
      }

      toast.success("Assinatura cancelada. Ela permanecerá ativa até o final do período atual.");
      fetchSubscription();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao cancelar assinatura";
      toast.error(message);
    } finally {
      setCancelling(false);
    }
  }

  const formatDate = (dateStr?: string | number) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  };

  const currentPlan = subscription?.plan || "Grátis";
  const statusInfo = statusLabels[subscription?.status || "free"] || statusLabels.free;
  const isActive = subscription?.status === "active" || subscription?.status === "trialing";
  const isCancelled = subscription?.status === "cancelled" || subscription?.status === "canceled";

  // Find current plan details from plans list
  const currentPlanDetails = plans.find(
    (p) => p.name.toLowerCase() === currentPlan.toLowerCase() || p.id === currentPlan.toLowerCase()
  );

  // Determine upgrade options
  const upgradePlans = plans.filter((p) => {
    if (!currentPlanDetails) return p.price > 0;
    return p.price > currentPlanDetails.price;
  });

  const formatMax = (max: number) => (max === -1 ? "Ilimitado" : max.toLocaleString("pt-BR"));
  const formatUsageLabel = (current: number, max: number) =>
    max === -1 ? `${current.toLocaleString("pt-BR")}` : `${current.toLocaleString("pt-BR")} de ${max.toLocaleString("pt-BR")}`;
  const calcPercent = (current: number, max: number) => (max <= 0 ? 0 : Math.min((current / max) * 100, 100));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Current Plan Card */}
      <SettingsCard
        title="Plano Atual"
        description="Gerencie sua assinatura e veja informações de cobrança."
        showSaveButton={false}
        footerContent={
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            {isActive && !isCancelled && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link" className="text-muted-foreground px-0 sm:px-4 order-2 sm:order-1">
                    Cancelar assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Sua assinatura permanecerá ativa até o final do período atual
                      {subscription?.currentPeriodEnd && (
                        <> ({formatDate(subscription.currentPeriodEnd)})</>
                      )}
                      . Após isso, sua conta será rebaixada para o plano gratuito.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cancelando...
                        </>
                      ) : (
                        "Confirmar cancelamento"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            {upgradePlans.length > 0 && (
              <Button
                variant="outline"
                className="w-full sm:w-auto order-1 sm:order-2"
                onClick={() => setLocation(`/checkout/${upgradePlans[0].id}`)}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Upgrade
              </Button>
            )}
          </div>
        }
      >
        {loadingSub ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Plan Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 bg-primary/5 rounded-lg border border-primary/20 gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-lg sm:text-xl text-primary mb-1">
                  Plano {currentPlan}
                </h3>
                {currentPlanDetails && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {currentPlanDetails.features.slice(0, 3).join(" \u2022 ")}
                  </p>
                )}
              </div>
              <Badge
                variant={statusInfo.variant}
                className={
                  statusInfo.variant === "default"
                    ? "bg-primary text-primary-foreground hover:bg-primary shrink-0"
                    : "shrink-0"
                }
              >
                {statusInfo.label}
              </Badge>
            </div>

            {/* Billing Details */}
            <div className="grid gap-3 sm:gap-2 text-sm mt-4">
              {subscription?.currentPeriodEnd && (
                <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 hidden sm:inline" />
                    Próxima cobrança
                  </span>
                  <span className="font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
                </div>
              )}
              {subscription?.trialEndsAt && (
                <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 hidden sm:inline" />
                    Fim do período de teste
                  </span>
                  <span className="font-medium">{formatDate(subscription.trialEndsAt)}</span>
                </div>
              )}
              {currentPlanDetails && (
                <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 hidden sm:inline" />
                    Valor
                  </span>
                  <span className="font-medium text-base sm:text-lg text-primary">
                    {currentPlanDetails.price === 0
                      ? "Grátis"
                      : `${formatCurrency(currentPlanDetails.price / 100)}/mês`}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4 hidden sm:inline" />
                  Forma de pagamento
                </span>
                <span className="font-medium">
                  {isActive ? "Cartão via Stripe" : "Nenhuma"}
                </span>
              </div>
              {isCancelled && subscription?.cancelledAt && (
                <div className="flex items-center justify-between py-2 sm:py-3 border-b">
                  <span className="text-destructive flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 hidden sm:inline" />
                    Cancelado em
                  </span>
                  <span className="font-medium text-destructive">
                    {formatDate(subscription.cancelledAt)}
                  </span>
                </div>
              )}
            </div>

            {/* Usage Stats */}
            <div className="mt-6 space-y-4">
              <h4 className="font-semibold text-sm">Uso do Plano</h4>

              {loadingUsage ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : usage ? (
                <>
                  {/* Users */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Usuários
                      </span>
                      <span className="font-medium">
                        {usage.users.max === -1 ? (
                          <span className="flex items-center gap-1">{usage.users.current.toLocaleString("pt-BR")} <Infinity className="w-4 h-4 text-muted-foreground" /> Ilimitado</span>
                        ) : (
                          formatUsageLabel(usage.users.current, usage.users.max)
                        )}
                      </span>
                    </div>
                    {usage.users.max !== -1 && (
                      <Progress value={calcPercent(usage.users.current, usage.users.max)} className="h-2" />
                    )}
                  </div>

                  {/* Properties */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Imóveis
                      </span>
                      <span className="font-medium">
                        {usage.properties.max === -1 ? (
                          <span className="flex items-center gap-1">{usage.properties.current.toLocaleString("pt-BR")} <Infinity className="w-4 h-4 text-muted-foreground" /> Ilimitado</span>
                        ) : (
                          formatUsageLabel(usage.properties.current, usage.properties.max)
                        )}
                      </span>
                    </div>
                    {usage.properties.max !== -1 && (
                      <Progress value={calcPercent(usage.properties.current, usage.properties.max)} className="h-2" />
                    )}
                  </div>

                  {/* Leads */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <UserSearch className="w-4 h-4" />
                        Leads
                      </span>
                      <span className="font-medium">
                        {usage.leads.max === -1 ? (
                          <span className="flex items-center gap-1">{usage.leads.current.toLocaleString("pt-BR")} <Infinity className="w-4 h-4 text-muted-foreground" /> Ilimitado</span>
                        ) : (
                          formatUsageLabel(usage.leads.current, usage.leads.max)
                        )}
                      </span>
                    </div>
                    {usage.leads.max !== -1 && (
                      <Progress value={calcPercent(usage.leads.current, usage.leads.max)} className="h-2" />
                    )}
                  </div>

                  {/* Integrations */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Plug className="w-4 h-4" />
                        Integrações
                      </span>
                      <span className="font-medium">
                        {usage.integrations.max === -1 ? (
                          <span className="flex items-center gap-1">{usage.integrations.current.toLocaleString("pt-BR")} <Infinity className="w-4 h-4 text-muted-foreground" /> Ilimitado</span>
                        ) : (
                          formatUsageLabel(usage.integrations.current, usage.integrations.max)
                        )}
                      </span>
                    </div>
                    {usage.integrations.max !== -1 && (
                      <Progress value={calcPercent(usage.integrations.current, usage.integrations.max)} className="h-2" />
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Não foi possível carregar os dados de uso.</p>
              )}
            </div>
          </>
        )}
      </SettingsCard>

      {/* Available Plans */}
      {plans.length > 0 && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold text-base sm:text-lg mb-4">Planos Disponíveis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const isCurrent =
                  plan.name.toLowerCase() === currentPlan.toLowerCase() ||
                  plan.id === currentPlan.toLowerCase();
                return (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-4 space-y-3 ${
                      isCurrent
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 transition-colors"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{plan.name}</h4>
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          Atual
                        </Badge>
                      )}
                    </div>
                    <div>
                      <span className="text-2xl font-bold">
                        {plan.price === 0
                          ? "Grátis"
                          : formatCurrency(plan.price / 100)}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground text-sm">/mês</span>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && plan.price > (currentPlanDetails?.price || 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setLocation(`/checkout/${plan.id}`)}
                      >
                        Fazer Upgrade
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Faturas
          </h3>

          {loadingInvoices ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-sm">
                        {formatDate(invoice.date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={invoice.status === "paid" ? "default" : "secondary"}
                          className={
                            invoice.status === "paid"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : ""
                          }
                        >
                          {invoiceStatusLabels[invoice.status] || invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {invoice.pdfUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                                PDF
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                          {invoice.hostedUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a href={invoice.hostedUrl} target="_blank" rel="noopener noreferrer">
                                Ver
                                <ExternalLink className="w-3 h-3 ml-1" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <h3 className="font-semibold text-base sm:text-lg mb-4">Recursos Inclusos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Suporte Prioritário</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Atendimento em até 2h úteis</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Múltiplos Usuários</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Até 10 usuários simultâneos</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Imóveis Ilimitados</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Cadastre até 2.000 imóveis</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="p-2 rounded bg-primary/10 text-primary shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Sem Taxas Extras</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Valor fixo mensal</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
