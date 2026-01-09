import React, { useEffect, useState } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Globe, MessageSquare, Mail, FileText, BarChart3, Settings, Loader2, Check, AlertCircle, Plug } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface IntegrationConfig {
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'connected' | 'disconnected' | 'error';
  configurable: boolean;
  enabled?: boolean;
  config?: Record<string, any>;
}

const INTEGRATIONS_META = [
  {
    name: "portals",
    displayName: "Portais Imobiliários",
    description: "ZAP, OLX, VivaReal - Publique seus imóveis automaticamente",
    icon: <Globe className="w-6 h-6" />,
    configurable: true,
    fields: [
      { key: "zapApiKey", label: "API Key ZAP Imóveis", type: "text" },
      { key: "olxToken", label: "Token OLX", type: "text" },
      { key: "vivaRealKey", label: "Chave VivaReal", type: "text" },
    ],
  },
  {
    name: "whatsapp",
    displayName: "WhatsApp API",
    description: "Envie mensagens e notificações via WhatsApp",
    icon: <MessageSquare className="w-6 h-6" />,
    configurable: true,
    fields: [
      { key: "phoneNumberId", label: "Phone Number ID", type: "text" },
      { key: "accessToken", label: "Access Token", type: "password" },
    ],
  },
  {
    name: "email",
    displayName: "E-mail Transacional",
    description: "SendGrid, Mailgun - Envio de e-mails automáticos",
    icon: <Mail className="w-6 h-6" />,
    configurable: true,
    fields: [
      { key: "provider", label: "Provedor", type: "select", options: ["SendGrid", "Mailgun", "SMTP"] },
      { key: "apiKey", label: "API Key / Senha", type: "password" },
      { key: "fromEmail", label: "E-mail Remetente", type: "email" },
    ],
  },
  {
    name: "signature",
    displayName: "Assinatura Digital",
    description: "Clicksign, Docusign - Assine contratos digitalmente",
    icon: <FileText className="w-6 h-6" />,
    configurable: true,
    fields: [
      { key: "provider", label: "Provedor", type: "select", options: ["Clicksign", "Docusign"] },
      { key: "apiToken", label: "API Token", type: "password" },
    ],
  },
  {
    name: "bi",
    displayName: "BI / Power BI",
    description: "Integração com ferramentas de Business Intelligence",
    icon: <BarChart3 className="w-6 h-6" />,
    configurable: true,
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text" },
      { key: "apiKey", label: "API Key", type: "password" },
    ],
  },
];

export function IntegrationsTab() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<typeof INTEGRATIONS_META[0] | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/integrations", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        // Merge API data with metadata
        const mergedIntegrations: IntegrationConfig[] = INTEGRATIONS_META.map((meta) => {
          const apiData = data.find((d: any) => d.name === meta.name);
          return {
            name: meta.name,
            description: meta.description,
            icon: meta.icon,
            configurable: meta.configurable,
            status: (apiData?.enabled ? 'connected' : 'disconnected') as 'connected' | 'disconnected' | 'error',
            enabled: apiData?.enabled || false,
            config: apiData?.config || {},
          };
        });

        setIntegrations(mergedIntegrations);
      }
    } catch (error) {
      console.error("Error fetching integrations:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as integrações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openConfigDialog = (integrationName: string) => {
    const meta = INTEGRATIONS_META.find((i) => i.name === integrationName);
    const integration = integrations.find((i) => i.name === integrationName);

    if (meta) {
      setSelectedIntegration(meta);
      setConfigForm(integration?.config || {});
      setConfigDialogOpen(true);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedIntegration) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/integrations/${selectedIntegration.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          enabled: true,
          config: configForm,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao salvar configuração");
      }

      toast({
        title: "Integração configurada",
        description: `${selectedIntegration.displayName} foi configurada com sucesso.`,
      });

      setConfigDialogOpen(false);
      await fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar a configuração.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleIntegration = async (integrationName: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/integrations/${integrationName}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !currentStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao alterar status");
      }

      toast({
        title: currentStatus ? "Integração desconectada" : "Integração conectada",
        description: `A integração foi ${currentStatus ? 'desconectada' : 'conectada'} com sucesso.`,
      });

      await fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o status da integração.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-start gap-3">
          <Plug className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Integrações Disponíveis</h3>
            <p className="text-sm text-muted-foreground">
              Conecte o ImobiBase com seus serviços favoritos para automatizar processos
              e aumentar a produtividade da sua equipe.
            </p>
          </div>
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {integrations.map((integration) => {
          const meta = INTEGRATIONS_META.find((m) => m.name === integration.name);
          return (
            <Card key={integration.name} className="hover:shadow-md transition-all hover:border-primary/30">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 text-primary shrink-0">
                    {integration.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg mb-1 truncate flex items-center gap-2">
                      {meta?.displayName || integration.name}
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm line-clamp-2">
                      {integration.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={integration.status === "connected" ? "default" : "secondary"}
                      className={cn(
                        "text-xs",
                        integration.status === "connected" && "bg-green-500 text-white hover:bg-green-600",
                        integration.status === "error" && "bg-red-500 text-white hover:bg-red-600"
                      )}
                    >
                      {integration.status === "connected" && <Check className="w-3 h-3 mr-1" />}
                      {integration.status === "error" && <AlertCircle className="w-3 h-3 mr-1" />}
                      {integration.status === "connected" ? "Conectado" : integration.status === "error" ? "Erro" : "Desconectado"}
                    </Badge>
                  </div>
                  <div className="flex gap-2 w-full">
                    {integration.configurable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openConfigDialog(integration.name)}
                        className="flex-1 h-9 gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Configurar</span>
                      </Button>
                    )}
                    {integration.enabled && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleToggleIntegration(integration.name, integration.enabled!)}
                        className="flex-1 h-9"
                      >
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Configurar {selectedIntegration?.displayName}</DialogTitle>
            <DialogDescription className="text-sm">
              Configure os parâmetros de integração abaixo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedIntegration?.fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key} className="text-sm font-medium">{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={configForm[field.key] || ''}
                  onChange={(e) => setConfigForm({ ...configForm, [field.key]: e.target.value })}
                  placeholder={field.label}
                  className="h-11"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfigDialogOpen(false)}
              disabled={saving}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar e Conectar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
