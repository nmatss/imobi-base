import React, { useEffect, useState } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Settings,
  UserPlus,
  Calendar,
  AlertTriangle,
  FileText,
  DollarSign,
  CheckCircle,
  Users,
  ChevronRight,
} from "lucide-react";

interface NotificationPreference {
  eventType: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  email: boolean;
  whatsapp: boolean;
  appPush: boolean;
  recipients: string[];
}

const DEFAULT_EVENTS: Array<{
  type: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
}> = [
  {
    type: "lead_created",
    label: "Novo Lead",
    description: "Quando um novo lead é cadastrado no sistema",
    icon: <UserPlus className="w-4 h-4" />,
    category: "Leads",
  },
  {
    type: "visit_scheduled",
    label: "Visita Agendada",
    description: "Quando uma visita é agendada para um imóvel",
    icon: <Calendar className="w-4 h-4" />,
    category: "Agenda",
  },
  {
    type: "payment_overdue",
    label: "Boleto Vencido",
    description: "Quando um pagamento de aluguel vence",
    icon: <AlertTriangle className="w-4 h-4" />,
    category: "Financeiro",
  },
  {
    type: "contract_expiring",
    label: "Contrato a Vencer",
    description: "30 dias antes do contrato expirar",
    icon: <FileText className="w-4 h-4" />,
    category: "Contratos",
  },
  {
    type: "proposal_received",
    label: "Proposta Recebida",
    description: "Quando uma nova proposta é recebida",
    icon: <DollarSign className="w-4 h-4" />,
    category: "Vendas",
  },
  {
    type: "contract_signed",
    label: "Contrato Assinado",
    description: "Quando um contrato é assinado digitalmente",
    icon: <CheckCircle className="w-4 h-4" />,
    category: "Contratos",
  },
  {
    type: "payment_received",
    label: "Pagamento Recebido",
    description: "Quando um pagamento é confirmado",
    icon: <DollarSign className="w-4 h-4" />,
    category: "Financeiro",
  },
];

const AVAILABLE_RECIPIENTS = [
  { id: "broker", label: "Corretor responsável" },
  { id: "manager", label: "Gestor" },
  { id: "admin", label: "Administrador" },
  { id: "financial", label: "Financeiro" },
  { id: "all_brokers", label: "Todos os corretores" },
];

const CATEGORY_COLORS: Record<string, string> = {
  Leads: "bg-blue-100 text-blue-700",
  Agenda: "bg-purple-100 text-purple-700",
  Financeiro: "bg-green-100 text-green-700",
  Contratos: "bg-orange-100 text-orange-700",
  Vendas: "bg-pink-100 text-pink-700",
};

export function NotificationsTab() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationPreference[]>([]);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationPreference | null>(null);
  const [tempRecipients, setTempRecipients] = useState<string[]>([]);

  useEffect(() => {
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notification-preferences", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();

        // Merge with default events to ensure all types are present
        const mergedPreferences = DEFAULT_EVENTS.map((event) => {
          const existing = data.find((d: any) => d.eventType === event.type);
          return {
            eventType: event.type,
            label: event.label,
            description: event.description,
            icon: event.icon,
            category: event.category,
            email: existing?.email ?? true,
            whatsapp: existing?.whatsapp ?? false,
            appPush: existing?.appPush ?? true,
            recipients: existing?.recipients || ["admin"],
          };
        });

        setNotifications(mergedPreferences);
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as preferências de notificação.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (index: number, channel: "email" | "whatsapp" | "appPush") => {
    setNotifications((prev) =>
      prev.map((notif, i) =>
        i === index ? { ...notif, [channel]: !notif[channel] } : notif
      )
    );
  };

  const openRecipientDialog = (notification: NotificationPreference) => {
    setSelectedNotification(notification);
    setTempRecipients([...notification.recipients]);
    setRecipientDialogOpen(true);
  };

  const handleRecipientToggle = (recipientId: string) => {
    setTempRecipients((prev) =>
      prev.includes(recipientId)
        ? prev.filter((r) => r !== recipientId)
        : [...prev, recipientId]
    );
  };

  const saveRecipients = () => {
    if (selectedNotification) {
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.eventType === selectedNotification.eventType
            ? { ...notif, recipients: tempRecipients }
            : notif
        )
      );
      setRecipientDialogOpen(false);
      setSelectedNotification(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save each notification preference
      await Promise.all(
        notifications.map(async (notif) => {
          const response = await fetch(`/api/notification-preferences/${notif.eventType}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              email: notif.email,
              whatsapp: notif.whatsapp,
              appPush: notif.appPush,
              recipients: notif.recipients,
            }),
          });

          if (!response.ok) {
            throw new Error(`Erro ao salvar preferência para ${notif.label}`);
          }
        })
      );

      toast({
        title: "Preferências salvas",
        description: "As preferências de notificação foram atualizadas.",
      });
      await fetchNotificationPreferences();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as preferências.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRecipientLabels = (recipients: string[]) => {
    return recipients
      .map((r) => AVAILABLE_RECIPIENTS.find((ar) => ar.id === r)?.label || r)
      .join(", ");
  };

  // Count active channels
  const activeChannels = {
    email: notifications.filter((n) => n.email).length,
    whatsapp: notifications.filter((n) => n.whatsapp).length,
    appPush: notifications.filter((n) => n.appPush).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <SettingsCard
          title="Preferências de Notificação"
          description="Configure como e quando você quer ser notificado."
          showSaveButton={false}
        >
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </SettingsCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-muted/50 rounded-lg p-4 border">
        <div className="flex items-start gap-3">
          <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Central de Notificações</h3>
            <p className="text-sm text-muted-foreground">
              Configure como e quando você quer receber alertas sobre eventos importantes
              no sistema. Escolha os canais de notificação para cada tipo de evento.
            </p>
          </div>
        </div>
      </div>

      {/* Channel Summary */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600">
                <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-bold">{activeChannels.email}</p>
                <p className="text-xs text-muted-foreground">E-mails ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-green-100 to-green-50 text-green-600">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-bold">{activeChannels.whatsapp}</p>
                <p className="text-xs text-muted-foreground">WhatsApp ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center sm:text-left">
                <p className="text-xl sm:text-2xl font-bold">{activeChannels.appPush}</p>
                <p className="text-xs text-muted-foreground">Push ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification List */}
      <SettingsCard
        title="Preferências de Notificação"
        description="Configure como e quando você quer ser notificado sobre eventos importantes."
        onSave={handleSave}
        isSaving={isSaving}
      >
        <div className="space-y-3">
          {notifications.map((notification, index) => (
            <div
              key={notification.eventType}
              className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Icon and Info */}
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  {notification.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium">{notification.label}</span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${
                        CATEGORY_COLORS[notification.category] || ""
                      }`}
                    >
                      {notification.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 hidden sm:block">
                    {notification.description}
                  </p>

                  {/* Channels */}
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={notification.email}
                        onCheckedChange={() => handleToggle(index, "email")}
                      />
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm hidden sm:inline">E-mail</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={notification.whatsapp}
                        onCheckedChange={() => handleToggle(index, "whatsapp")}
                      />
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm hidden sm:inline">WhatsApp</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={notification.appPush}
                        onCheckedChange={() => handleToggle(index, "appPush")}
                      />
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm hidden sm:inline">Push</span>
                    </label>
                  </div>
                </div>

                {/* Recipients Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 gap-1 text-xs"
                  onClick={() => openRecipientDialog(notification)}
                >
                  <Users className="w-3 h-3" />
                  <span className="hidden sm:inline">
                    {notification.recipients.length} dest.
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>

              {/* Recipients preview on mobile */}
              <div className="mt-2 pt-2 border-t sm:hidden">
                <button
                  onClick={() => openRecipientDialog(notification)}
                  className="text-xs text-muted-foreground flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  {getRecipientLabels(notification.recipients.slice(0, 2))}
                  {notification.recipients.length > 2 && ` +${notification.recipients.length - 2}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      {/* Recipients Dialog */}
      <Dialog open={recipientDialogOpen} onOpenChange={setRecipientDialogOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5" />
              Destinatários
            </DialogTitle>
            <DialogDescription className="text-sm">
              Selecione quem deve receber notificações de "{selectedNotification?.label}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {AVAILABLE_RECIPIENTS.map((recipient) => (
              <label
                key={recipient.id}
                className="flex items-center gap-3 p-3 sm:p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors active:bg-accent"
              >
                <Checkbox
                  checked={tempRecipients.includes(recipient.id)}
                  onCheckedChange={() => handleRecipientToggle(recipient.id)}
                  className="h-5 w-5"
                />
                <span className="flex-1 text-sm sm:text-base">{recipient.label}</span>
              </label>
            ))}
          </div>

          {tempRecipients.length === 0 && (
            <p className="text-sm text-destructive text-center py-2">
              Selecione pelo menos um destinatário
            </p>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRecipientDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveRecipients}
              disabled={tempRecipients.length === 0}
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
