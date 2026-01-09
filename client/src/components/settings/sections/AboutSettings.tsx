import { SettingsCard } from "@/pages/settings/components/SettingsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Info,
  Code,
  Heart,
  ExternalLink,
  Shield,
  Zap,
  Users,
  CheckCircle2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AboutSettings() {
  const systemInfo = {
    version: "2.0.0",
    buildDate: new Date().toLocaleDateString("pt-BR"),
    environment: "production",
    plan: "Professional",
  };

  const features = [
    "Gestão completa de imóveis",
    "CRM para leads e clientes",
    "Contratos digitais",
    "Gestão financeira",
    "Portal do cliente",
    "Integrações com portais",
    "WhatsApp Business",
    "Assinatura eletrônica",
  ];

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Sobre o ImobiBase"
        description="Informações sobre o sistema e versão atual"
        showSaveButton={false}
      >
        <div className="space-y-6">
          {/* Version Info */}
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Info className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold mb-1">ImobiBase</h4>
              <p className="text-sm text-muted-foreground">
                Sistema completo de gestão imobiliária
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary">v{systemInfo.version}</Badge>
                <Badge variant="outline">{systemInfo.plan}</Badge>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  Atualizado
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* System Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Versão</Label>
              <p className="text-sm font-medium">{systemInfo.version}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Última Atualização</Label>
              <p className="text-sm font-medium">{systemInfo.buildDate}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ambiente</Label>
              <p className="text-sm font-medium capitalize">{systemInfo.environment}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Plano Atual</Label>
              <p className="text-sm font-medium">{systemInfo.plan}</p>
            </div>
          </div>

          <Separator />

          {/* Features */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Recursos Incluídos
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Support & Resources */}
      <SettingsCard
        title="Suporte e Recursos"
        description="Obtenha ajuda e acesse recursos úteis"
        showSaveButton={false}
      >
        <div className="space-y-4">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertTitle>Precisa de Ajuda?</AlertTitle>
            <AlertDescription>
              Nossa equipe de suporte está disponível de segunda a sexta, das 9h às 18h.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a
                href="https://docs.imobibase.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Code className="h-4 w-4" />
                Documentação
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </Button>

            <Button variant="outline" className="justify-start gap-2" asChild>
              <a
                href="https://help.imobibase.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Info className="h-4 w-4" />
                Central de Ajuda
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </Button>

            <Button variant="outline" className="justify-start gap-2" asChild>
              <a
                href="https://status.imobibase.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Zap className="h-4 w-4" />
                Status do Sistema
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </Button>

            <Button variant="outline" className="justify-start gap-2" asChild>
              <a
                href="https://imobibase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Shield className="h-4 w-4" />
                Privacidade
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* Credits */}
      <SettingsCard
        title="Créditos"
        description="Desenvolvido com dedicação"
        showSaveButton={false}
      >
        <div className="text-center py-6">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <span>Feito com</span>
            <Heart className="h-4 w-4 text-red-500 fill-current" />
            <span>pela equipe ImobiBase</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            © 2025 ImobiBase. Todos os direitos reservados.
          </p>
        </div>
      </SettingsCard>
    </div>
  );
}
