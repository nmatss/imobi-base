import { useState } from "react";
import { SettingsCard } from "@/pages/settings/components/SettingsCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Users,
  Home,
  FileText,
  DollarSign,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NotificationChannel {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
}

interface NotificationPreferences {
  newLeads: NotificationChannel;
  leadStatusChange: NotificationChannel;
  newVisit: NotificationChannel;
  visitReminder: NotificationChannel;
  newContract: NotificationChannel;
  contractSigned: NotificationChannel;
  paymentReceived: NotificationChannel;
  paymentOverdue: NotificationChannel;
  newProperty: NotificationChannel;
  propertyUpdated: NotificationChannel;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const defaultChannel: NotificationChannel = {
  email: true,
  whatsapp: false,
  push: true,
};

export function NotificationSettings() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    newLeads: { ...defaultChannel },
    leadStatusChange: { email: true, whatsapp: true, push: true },
    newVisit: { ...defaultChannel },
    visitReminder: { email: true, whatsapp: true, push: true },
    newContract: { email: true, whatsapp: true, push: true },
    contractSigned: { email: true, whatsapp: false, push: true },
    paymentReceived: { email: true, whatsapp: false, push: true },
    paymentOverdue: { email: true, whatsapp: true, push: true },
    newProperty: { email: false, whatsapp: false, push: true },
    propertyUpdated: { email: false, whatsapp: false, push: false },
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  });

  const { isSaving, lastSaved } = useAutoSave({
    data: preferences,
    onSave: async (data) => {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Saving notification preferences:", data);
    },
    delay: 1000,
    enabled: true,
    onSuccess: () => {
      toast({
        title: "Preferências salvas",
        description: "Suas configurações de notificação foram atualizadas.",
      });
    },
  });

  const updateNotification = (
    event: keyof Omit<NotificationPreferences, "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd">,
    channel: keyof NotificationChannel,
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [event]: {
        ...prev[event],
        [channel]: value,
      },
    }));
  };

  const updateQuietHours = (field: "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd", value: boolean | string) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const notificationEvents = [
    {
      category: "Leads",
      icon: Users,
      events: [
        {
          key: "newLeads" as const,
          label: "Novo Lead",
          description: "Quando um novo lead é capturado",
        },
        {
          key: "leadStatusChange" as const,
          label: "Mudança de Status",
          description: "Quando o status de um lead muda",
        },
      ],
    },
    {
      category: "Visitas",
      icon: Calendar,
      events: [
        {
          key: "newVisit" as const,
          label: "Nova Visita Agendada",
          description: "Quando uma visita é agendada",
        },
        {
          key: "visitReminder" as const,
          label: "Lembrete de Visita",
          description: "1 hora antes da visita agendada",
        },
      ],
    },
    {
      category: "Contratos",
      icon: FileText,
      events: [
        {
          key: "newContract" as const,
          label: "Novo Contrato",
          description: "Quando um contrato é criado",
        },
        {
          key: "contractSigned" as const,
          label: "Contrato Assinado",
          description: "Quando um contrato é assinado",
        },
      ],
    },
    {
      category: "Financeiro",
      icon: DollarSign,
      events: [
        {
          key: "paymentReceived" as const,
          label: "Pagamento Recebido",
          description: "Quando um pagamento é confirmado",
        },
        {
          key: "paymentOverdue" as const,
          label: "Pagamento em Atraso",
          description: "Quando um pagamento está vencido",
        },
      ],
    },
    {
      category: "Imóveis",
      icon: Home,
      events: [
        {
          key: "newProperty" as const,
          label: "Novo Imóvel",
          description: "Quando um imóvel é cadastrado",
        },
        {
          key: "propertyUpdated" as const,
          label: "Imóvel Atualizado",
          description: "Quando dados de um imóvel são alterados",
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Preferências de Notificação"
        description="Configure como e quando você deseja receber notificações"
        showSaveButton={false}
      >
        {isSaving && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Salvando preferências...</AlertDescription>
          </Alert>
        )}

        {lastSaved && !isSaving && (
          <div className="mb-4 text-xs text-muted-foreground flex items-center gap-1">
            <Badge variant="secondary" className="text-xs">
              Salvo automaticamente
            </Badge>
            às {lastSaved.toLocaleTimeString()}
          </div>
        )}

        <div className="space-y-6">
          {/* Header Row */}
          <div className="grid grid-cols-[1fr,auto,auto,auto] gap-4 items-center pb-2 border-b">
            <div className="text-sm font-medium text-muted-foreground">Evento</div>
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground w-16">
              <Mail className="h-3 w-3" />
              <span className="hidden sm:inline">Email</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground w-16">
              <MessageSquare className="h-3 w-3" />
              <span className="hidden sm:inline">WhatsApp</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-xs font-medium text-muted-foreground w-16">
              <Smartphone className="h-3 w-3" />
              <span className="hidden sm:inline">Push</span>
            </div>
          </div>

          {/* Notification Events by Category */}
          {notificationEvents.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <div key={category.category} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CategoryIcon className="h-4 w-4 text-primary" />
                  {category.category}
                </div>

                {category.events.map((event) => (
                  <div
                    key={event.key}
                    className="grid grid-cols-[1fr,auto,auto,auto] gap-4 items-center py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{event.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {event.description}
                      </div>
                    </div>

                    <div className="flex items-center justify-center w-16">
                      <Switch
                        checked={preferences[event.key].email}
                        onCheckedChange={(value) =>
                          updateNotification(event.key, "email", value)
                        }
                        aria-label={`Email para ${event.label}`}
                      />
                    </div>

                    <div className="flex items-center justify-center w-16">
                      <Switch
                        checked={preferences[event.key].whatsapp}
                        onCheckedChange={(value) =>
                          updateNotification(event.key, "whatsapp", value)
                        }
                        aria-label={`WhatsApp para ${event.label}`}
                      />
                    </div>

                    <div className="flex items-center justify-center w-16">
                      <Switch
                        checked={preferences[event.key].push}
                        onCheckedChange={(value) =>
                          updateNotification(event.key, "push", value)
                        }
                        aria-label={`Push para ${event.label}`}
                      />
                    </div>
                  </div>
                ))}

                {category !== notificationEvents[notificationEvents.length - 1] && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* Quiet Hours */}
      <SettingsCard
        title="Horário de Silêncio"
        description="Não receber notificações durante horários específicos"
        showSaveButton={false}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <Label htmlFor="quiet-hours" className="text-base font-medium">
                  Ativar Horário de Silêncio
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Pausar notificações push e WhatsApp durante o período configurado
              </p>
            </div>
            <Switch
              id="quiet-hours"
              checked={preferences.quietHoursEnabled}
              onCheckedChange={(value) => updateQuietHours("quietHoursEnabled", value)}
            />
          </div>

          {preferences.quietHoursEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">Início</Label>
                  <input
                    id="quiet-start"
                    type="time"
                    value={preferences.quietHoursStart}
                    onChange={(e) => updateQuietHours("quietHoursStart", e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quiet-end">Fim</Label>
                  <input
                    id="quiet-end"
                    type="time"
                    value={preferences.quietHoursEnd}
                    onChange={(e) => updateQuietHours("quietHoursEnd", e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  Durante o horário de silêncio ({preferences.quietHoursStart} às{" "}
                  {preferences.quietHoursEnd}), você não receberá notificações push nem
                  WhatsApp. Notificações por email não são afetadas.
                </AlertDescription>
              </Alert>
            </>
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
