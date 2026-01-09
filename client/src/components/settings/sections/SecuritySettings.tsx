import React from "react";
import { useState } from "react";
import { SettingsCard } from "@/pages/settings/components/SettingsCard";
import { SettingsFormField } from "../SettingsFormField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export function SecuritySettings() {
  const { toast } = useToast();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [sessions] = useState<Session[]>([
    {
      id: "1",
      device: "Chrome on Windows",
      location: "São Paulo, SP",
      lastActive: "Agora",
      current: true,
    },
    {
      id: "2",
      device: "Safari on iPhone",
      location: "São Paulo, SP",
      lastActive: "Há 2 horas",
      current: false,
    },
    {
      id: "3",
      device: "Chrome on Android",
      location: "Rio de Janeiro, RJ",
      lastActive: "Há 1 dia",
      current: false,
    },
  ]);

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
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });

      setPasswordData({ current: "", new: "", confirm: "" });
      setPasswordStrength(0);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha.",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    const newState = !twoFactorEnabled;

    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setTwoFactorEnabled(newState);

      toast({
        title: newState ? "2FA Ativado" : "2FA Desativado",
        description: newState
          ? "Autenticação de dois fatores foi ativada com sucesso."
          : "Autenticação de dois fatores foi desativada.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar a configuração de 2FA.",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "Sessão encerrada",
        description: "A sessão foi encerrada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível encerrar a sessão.",
        variant: "destructive",
      });
    }
  };

  const handleEndAllSessions = async () => {
    try {
      // Simular API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

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

      {/* Two-Factor Authentication */}
      <SettingsCard
        title="Autenticação de Dois Fatores (2FA)"
        description="Adicione uma camada extra de segurança à sua conta"
        showSaveButton={false}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <Label htmlFor="2fa-toggle" className="text-base font-medium">
                Ativar 2FA
              </Label>
              {twoFactorEnabled && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Ativo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Quando ativado, você precisará fornecer um código de 6 dígitos além da senha
              para fazer login.
            </p>
          </div>
          <Switch
            id="2fa-toggle"
            checked={twoFactorEnabled}
            onCheckedChange={handleToggle2FA}
          />
        </div>

        {twoFactorEnabled && (
          <Alert className="mt-4">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertTitle>2FA Configurado</AlertTitle>
            <AlertDescription>
              Sua conta está protegida com autenticação de dois fatores. Use o app Google
              Authenticator ou similar para gerar códigos.
            </AlertDescription>
          </Alert>
        )}
      </SettingsCard>

      {/* Active Sessions */}
      <SettingsCard
        title="Sessões Ativas"
        description="Gerencie os dispositivos conectados à sua conta"
        showSaveButton={false}
      >
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span>{session.device}</span>
                        {session.current && (
                          <Badge variant="secondary" className="text-xs">
                            Atual
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.location}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {session.lastActive}
                    </TableCell>
                    <TableCell>
                      {!session.current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEndSession(session.id)}
                          className="gap-1"
                        >
                          <LogOut className="h-3 w-3" />
                          Encerrar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Não reconhece algum dispositivo?</span>
            </div>
            <Button
              variant="outline"
              onClick={handleEndAllSessions}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Encerrar Todas as Outras Sessões
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* Security Logs */}
      <SettingsCard
        title="Logs de Acesso"
        description="Histórico de acessos à sua conta"
        showSaveButton={false}
      >
        <div className="space-y-3">
          {[
            {
              action: "Login bem-sucedido",
              time: "Há 5 minutos",
              location: "São Paulo, SP",
              status: "success",
            },
            {
              action: "Senha alterada",
              time: "Há 2 dias",
              location: "São Paulo, SP",
              status: "success",
            },
            {
              action: "Tentativa de login falhou",
              time: "Há 5 dias",
              location: "Curitiba, PR",
              status: "warning",
            },
          ].map((log, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div
                className={`mt-0.5 h-2 w-2 rounded-full ${
                  log.status === "success" ? "bg-green-500" : "bg-yellow-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {log.location} • {log.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 text-center">
          <Button variant="link" size="sm">
            Ver histórico completo
          </Button>
        </div>
      </SettingsCard>
    </div>
  );
}
