import { SettingsCard } from "../components/SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Users, Building2, Headphones, TrendingUp, Calendar } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function PlansTab() {
  const usersUsage = (3 / 10) * 100;
  const propertiesUsage = (450 / 2000) * 100;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Current Plan Card */}
      <SettingsCard
        title="Plano Atual"
        description="Gerencie sua assinatura e veja informações de cobrança."
        showSaveButton={false}
        footerContent={
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="link" className="text-muted-foreground px-0 sm:px-4 order-2 sm:order-1">
              Cancelar assinatura
            </Button>
            <Button variant="outline" className="w-full sm:w-auto order-1 sm:order-2">
              Alterar Plano
            </Button>
          </div>
        }
      >
        {/* Plan Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 bg-primary/5 rounded-lg border border-primary/20 gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-lg sm:text-xl text-primary mb-1">Plano Profissional</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Até 10 usuários • 2.000 imóveis • Suporte prioritário
            </p>
          </div>
          <Badge className="bg-primary text-primary-foreground hover:bg-primary shrink-0">
            Ativo
          </Badge>
        </div>

        {/* Billing Details */}
        <div className="grid gap-3 sm:gap-2 text-sm mt-4">
          <div className="flex items-center justify-between py-2 sm:py-3 border-b">
            <span className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 hidden sm:inline" />
              Próxima cobrança
            </span>
            <span className="font-medium">13/01/2026</span>
          </div>
          <div className="flex items-center justify-between py-2 sm:py-3 border-b">
            <span className="text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 hidden sm:inline" />
              Valor
            </span>
            <span className="font-medium text-base sm:text-lg text-primary">R$ 109,90/mês</span>
          </div>
          <div className="flex items-center justify-between py-2 sm:py-3 border-b">
            <span className="text-muted-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 hidden sm:inline" />
              Forma de pagamento
            </span>
            <span className="font-medium">Cartão ****1234</span>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mt-6 space-y-4">
          <h4 className="font-semibold text-sm">Uso do Plano</h4>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Usuários
              </span>
              <span className="font-medium">3 de 10</span>
            </div>
            <Progress value={usersUsage} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Imóveis
              </span>
              <span className="font-medium">450 de 2.000</span>
            </div>
            <Progress value={propertiesUsage} className="h-2" />
          </div>
        </div>
      </SettingsCard>

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
