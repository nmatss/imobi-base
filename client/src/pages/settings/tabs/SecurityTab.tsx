import { useImobi } from "@/lib/imobi-context";
import { TwoFactorSetup } from "@/components/security/TwoFactorSetup";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation } from "wouter";
import {
  Shield, Key, History, Lock, Smartphone,
  AlertTriangle, CheckCircle, ExternalLink
} from "lucide-react";

export function SecurityTab() {
  const { user } = useImobi();
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Visão Geral de Segurança
          </CardTitle>
          <CardDescription>
            Status atual das configurações de segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Lock className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Senha</p>
                  <p className="text-xs text-muted-foreground">Última alteração há 30 dias</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Forte
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Key className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Sessões ativas</p>
                  <p className="text-xs text-muted-foreground">Dispositivos conectados</p>
                </div>
              </div>
              <Badge variant="secondary">1 dispositivo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      {user && <TwoFactorSetup userId={user.id} />}

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
          <CardDescription>
            Atualize sua senha regularmente para manter a conta segura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Recomendamos usar uma senha forte com no mínimo 12 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.
            </AlertDescription>
          </Alert>
          <Button variant="outline">
            <Key className="h-4 w-4 mr-2" />
            Alterar Senha
          </Button>
        </CardContent>
      </Card>

      {/* Audit Logs Link */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Logs de Auditoria
          </CardTitle>
          <CardDescription>
            Histórico de todas as ações realizadas na sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Acompanhe todas as atividades da sua conta, incluindo logins, alterações de configurações e operações realizadas.
          </p>
          <Button onClick={() => setLocation("/admin/logs")}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Logs de Auditoria
          </Button>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Sessões Ativas
          </CardTitle>
          <CardDescription>
            Dispositivos atualmente conectados à sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">Este dispositivo</p>
                  <p className="text-xs text-muted-foreground">
                    Navegador • {new Date().toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <Badge>Atual</Badge>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4 text-destructive hover:text-destructive">
            Encerrar Todas as Outras Sessões
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
