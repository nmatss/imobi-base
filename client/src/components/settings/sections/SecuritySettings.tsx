import React from "react";
import { useState, useEffect } from "react";
import { SettingsCard } from "@/pages/settings/components/SettingsCard";
import { SettingsFormField } from "../SettingsFormField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useImobi } from "@/lib/imobi-context";
import { apiRequest } from "@/lib/queryClient";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import {
  Shield,
  AlertTriangle,
  Eye,
  EyeOff,
  LogOut,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface AccessLog {
  id: string;
  success: boolean;
  failureReason?: string | null;
  ipAddress?: string | null;
  location?: string | null;
  createdAt: string;
}

export function SecuritySettings() {
  const { toast } = useToast();
  const { user } = useImobi();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isEndingSessions, setIsEndingSessions] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/auth/security/login-history?limit=10");
        const data = await res.json();
        if (active) setAccessLogs(Array.isArray(data?.history) ? data.history : []);
      } catch {
        if (active) setAccessLogs([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;

    return Math.min(strength, 100);
  };

  const validateNewPassword = (password: string): string | null => {
    if (!password) return "Nova senha é obrigatória";

    if (password.length < 8) {
      return "A senha deve ter pelo menos 8 caracteres";
    }

    if (!/[A-Z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra maiúscula";
    }

    if (!/[a-z]/.test(password)) {
      return "A senha deve conter pelo menos uma letra minúscula";
    }

    if (!/\d/.test(password)) {
      return "A senha deve conter pelo menos um número";
    }

    const strength = calculatePasswordStrength(password);
    setPasswordStrength(strength);

    if (strength < 50) {
      return "warning:Senha fraca. Considere adicionar caracteres especiais.";
    }

    return null;
  };

  const validateConfirmPassword = (confirm: string): string | null => {
    if (!confirm) return "Confirmação de senha é obrigatória";

    if (confirm !== passwordData.new) {
      return "As senhas não coincidem";
    }

    return null;
  };

  const handlePasswordChange = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos de senha.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      toast({
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);

    try {
      await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: passwordData.current,
        newPassword: passwordData.new,
      });

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordStrength(0);
    } catch (error) {
      // apiRequest lança Error("<status>: <body>"); tenta extrair { error }.
      let description = "Não foi possível alterar a senha.";
      if (error instanceof Error) {
        const body = error.message.replace(/^\d+:\s*/, "");
        try {
          const parsed = JSON.parse(body);
          if (parsed?.error) description = parsed.error;
        } catch {
          if (body) description = body;
        }
      }
      toast({ title: "Erro ao alterar senha", description, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEndAllSessions = async () => {
    setIsEndingSessions(true);
    try {
      await apiRequest("POST", "/api/auth/logout-all");
      toast({
        title: "Sessões encerradas",
        description: "Todas as outras sessões foram encerradas.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível encerrar as sessões.",
        variant: "destructive",
      });
    } finally {
      setIsEndingSessions(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return "bg-red-500";
    if (passwordStrength < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getPasswordStrengthLabel = () => {
    if (passwordStrength < 40) return "Fraca";
    if (passwordStrength < 70) return "Média";
    return "Forte";
  };

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <SettingsCard
        title="Alterar Senha"
        description="Mantenha sua conta segura com uma senha forte"
        onSave={handlePasswordChange}
        isSaving={isChangingPassword}
        showSaveButton={true}
      >
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Senha Segura</AlertTitle>
          <AlertDescription>
            Use uma senha com pelo menos 8 caracteres, incluindo letras maiúsculas,
            minúsculas, números e caracteres especiais.
          </AlertDescription>
        </Alert>

        <div className="space-y-4 pt-4">
          <div className="grid gap-2">
            <Label htmlFor="current-password">Senha Atual</Label>
            <div className="relative">
              <input
                id="current-password"
                type={showCurrentPassword ? "text" : "password"}
                value={passwordData.current}
                onChange={(e) =>
                  setPasswordData((prev) => ({ ...prev, current: e.target.value }))
                }
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 pr-10"
                placeholder="Digite sua senha atual"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <SettingsFormField
            label="Nova Senha"
            name="new-password"
            type={showNewPassword ? "text" : "password"}
            value={passwordData.new}
            onChange={(value) => setPasswordData((prev) => ({ ...prev, new: value }))}
            validate={validateNewPassword}
            placeholder="Digite a nova senha"
          />

          {passwordData.new && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Força da senha:</span>
                <span className="font-medium">{getPasswordStrengthLabel()}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getPasswordStrengthColor()}`}
                  style={{ width: `${passwordStrength}%` }}
                />
              </div>
            </div>
          )}

          <SettingsFormField
            label="Confirmar Nova Senha"
            name="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            value={passwordData.confirm}
            onChange={(value) =>
              setPasswordData((prev) => ({ ...prev, confirm: value }))
            }
            validate={validateConfirmPassword}
            placeholder="Digite a nova senha novamente"
          />
        </div>
      </SettingsCard>

      {/* Two-Factor Authentication (componente real com QR/backup codes) */}
      {user && <TwoFactorSetup userId={user.id} />}

      {/* Active Sessions */}
      <SettingsCard
        title="Sessões Ativas"
        description="Encerre o acesso em outros dispositivos"
        showSaveButton={false}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Se você acha que sua conta foi acessada em outro dispositivo,
              encerre todas as outras sessões. Você continua conectado aqui.
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleEndAllSessions}
            isLoading={isEndingSessions}
            className="gap-2 shrink-0"
          >
            <LogOut className="h-4 w-4" />
            Encerrar Outras Sessões
          </Button>
        </div>
      </SettingsCard>

      {/* Security Logs */}
      <SettingsCard
        title="Logs de Acesso"
        description="Histórico de acessos à sua conta"
        showSaveButton={false}
      >
        <div className="space-y-3">
          {accessLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum acesso registrado ainda.
            </p>
          ) : (
            accessLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <div
                  className={`mt-0.5 h-2 w-2 rounded-full ${
                    log.success ? "bg-green-500" : "bg-yellow-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {log.success
                      ? "Login bem-sucedido"
                      : `Tentativa de login falhou${log.failureReason ? ` — ${log.failureReason}` : ""}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(log.location || log.ipAddress || "Origem desconhecida")}
                    {" • "}
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </SettingsCard>
    </div>
  );
}
