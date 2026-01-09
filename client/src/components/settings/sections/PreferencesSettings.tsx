import { useState } from "react";
import { SettingsCard } from "@/pages/settings/components/SettingsCard";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Moon,
  Sun,
  Globe,
  Layout,
  Zap,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PreferencesData {
  theme: "light" | "dark" | "system";
  language: "pt-BR" | "en-US" | "es-ES";
  compactMode: boolean;
  showAvatars: boolean;
  enableAnimations: boolean;
  autoRefresh: boolean;
  defaultView: "list" | "grid" | "kanban";
}

export function PreferencesSettings() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<PreferencesData>({
    theme: "system",
    language: "pt-BR",
    compactMode: false,
    showAvatars: true,
    enableAnimations: true,
    autoRefresh: true,
    defaultView: "list",
  });

  const { isSaving, lastSaved } = useAutoSave({
    data: preferences,
    onSave: async (data) => {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      console.log("Saving preferences:", data);
    },
    delay: 1500,
    enabled: true,
    onSuccess: () => {
      toast({
        title: "Preferências salvas",
        description: "Suas configurações foram atualizadas automaticamente.",
      });
    },
  });

  const updatePreference = <K extends keyof PreferencesData>(
    key: K,
    value: PreferencesData[K]
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title="Preferências de Interface"
        description="Personalize a aparência e comportamento do sistema"
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
          {/* Theme */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-base">
              <Monitor className="h-5 w-5 text-primary" />
              Tema
            </Label>
            <RadioGroup
              value={preferences.theme}
              onValueChange={(value: "light" | "dark" | "system") =>
                updatePreference("theme", value)
              }
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div className="relative">
                <RadioGroupItem
                  value="light"
                  id="theme-light"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Sun className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Claro</div>
                    <div className="text-xs text-muted-foreground">Tema claro</div>
                  </div>
                </Label>
              </div>

              <div className="relative">
                <RadioGroupItem
                  value="dark"
                  id="theme-dark"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Moon className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Escuro</div>
                    <div className="text-xs text-muted-foreground">Tema escuro</div>
                  </div>
                </Label>
              </div>

              <div className="relative">
                <RadioGroupItem
                  value="system"
                  id="theme-system"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Monitor className="mb-3 h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Sistema</div>
                    <div className="text-xs text-muted-foreground">Auto</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Language */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2 text-base">
              <Globe className="h-5 w-5 text-primary" />
              Idioma
            </Label>
            <RadioGroup
              value={preferences.language}
              onValueChange={(value: "pt-BR" | "en-US" | "es-ES") =>
                updatePreference("language", value)
              }
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pt-BR" id="lang-pt" />
                <Label htmlFor="lang-pt" className="cursor-pointer">
                  Português (Brasil)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="en-US" id="lang-en" />
                <Label htmlFor="lang-en" className="cursor-pointer">
                  English (US)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="es-ES" id="lang-es" />
                <Label htmlFor="lang-es" className="cursor-pointer">
                  Español (España)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Default View */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="flex items-center gap-2 text-base">
              <Layout className="h-5 w-5 text-primary" />
              Visualização Padrão
            </Label>
            <p className="text-sm text-muted-foreground">
              Modo de exibição padrão para listas de imóveis e leads
            </p>
            <RadioGroup
              value={preferences.defaultView}
              onValueChange={(value: "list" | "grid" | "kanban") =>
                updatePreference("defaultView", value)
              }
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="list" id="view-list" />
                <Label htmlFor="view-list" className="cursor-pointer">
                  Lista
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="grid" id="view-grid" />
                <Label htmlFor="view-grid" className="cursor-pointer">
                  Grade
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="kanban" id="view-kanban" />
                <Label htmlFor="view-kanban" className="cursor-pointer">
                  Kanban
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Toggle Options */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode" className="text-base font-medium flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Modo Compacto
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reduz espaçamentos para exibir mais informações na tela
                </p>
              </div>
              <Switch
                id="compact-mode"
                checked={preferences.compactMode}
                onCheckedChange={(value) => updatePreference("compactMode", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-avatars" className="text-base font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Mostrar Avatares
                </Label>
                <p className="text-sm text-muted-foreground">
                  Exibir fotos de perfil em listas e comentários
                </p>
              </div>
              <Switch
                id="show-avatars"
                checked={preferences.showAvatars}
                onCheckedChange={(value) => updatePreference("showAvatars", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-animations" className="text-base font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Animações
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ativar transições e animações na interface
                </p>
              </div>
              <Switch
                id="enable-animations"
                checked={preferences.enableAnimations}
                onCheckedChange={(value) => updatePreference("enableAnimations", value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-refresh" className="text-base font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Atualização Automática
                </Label>
                <p className="text-sm text-muted-foreground">
                  Atualizar dados automaticamente a cada 30 segundos
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={preferences.autoRefresh}
                onCheckedChange={(value) => updatePreference("autoRefresh", value)}
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
