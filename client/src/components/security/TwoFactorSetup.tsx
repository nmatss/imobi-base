import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldX, Smartphone, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorSetupProps {
  userId: string;
}

interface TwoFactorStatus {
  enabled: boolean;
  enabledAt?: string;
}

interface SetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export function TwoFactorSetup({ userId }: TwoFactorSetupProps) {
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery<TwoFactorStatus>({
    queryKey: ['2fa-status', userId],
    queryFn: async () => {
      const res = await fetch(`/api/auth/2fa/status?userId=${userId}`);
      if (!res.ok) throw new Error('Erro ao verificar status do 2FA');
      return res.json();
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Erro ao configurar 2FA');
      return res.json();
    },
    onSuccess: (data) => {
      setSetupData(data);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: code }),
      });
      if (!res.ok) throw new Error('Código inválido');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Autenticação de dois fatores ativada com sucesso!',
      });
      setSetupData(null);
      setVerificationCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status', userId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: code }),
      });
      if (!res.ok) throw new Error('Código inválido');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Autenticação de dois fatores desativada.',
      });
      setShowDisableDialog(false);
      setDisableCode('');
      queryClient.invalidateQueries({ queryKey: ['2fa-status', userId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopiedBackup(true);
      setTimeout(() => setCopiedBackup(false), 2000);
    }
  };

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status?.enabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
              {status?.enabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Autenticação de Dois Fatores</CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança à sua conta
              </CardDescription>
            </div>
          </div>
          <Badge variant={status?.enabled ? 'default' : 'secondary'}>
            {status?.enabled ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.enabled && !setupData && (
          <>
            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Use um aplicativo autenticador como Google Authenticator, Authy ou 1Password para gerar códigos de verificação.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>
              {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Configurar 2FA
            </Button>
          </>
        )}

        {setupData && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code abaixo com seu aplicativo autenticador:
              </p>
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg inline-block">
                  <img src={setupData.qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Ou insira este código manualmente:</p>
                <code className="bg-muted px-3 py-1 rounded text-sm font-mono">
                  {setupData.secret}
                </code>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Códigos de Backup</Label>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Guarde estes códigos em um lugar seguro. Você pode usá-los para acessar sua conta caso perca o acesso ao seu dispositivo.
                </AlertDescription>
              </Alert>
              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm mb-3">
                  {setupData.backupCodes.map((code, i) => (
                    <div key={i} className="bg-background px-3 py-1 rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" onClick={copyBackupCodes} className="w-full">
                  {copiedBackup ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copiados!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar códigos
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Digite o código do aplicativo para confirmar:</Label>
              <div className="flex gap-2">
                <Input
                  id="verification-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="font-mono text-center text-lg tracking-widest"
                  maxLength={6}
                />
                <Button
                  onClick={() => verifyMutation.mutate(verificationCode)}
                  disabled={verificationCode.length !== 6 || verifyMutation.isPending}
                >
                  {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar
                </Button>
              </div>
            </div>

            <Button variant="ghost" onClick={() => setSetupData(null)} className="w-full">
              Cancelar
            </Button>
          </div>
        )}

        {status?.enabled && !setupData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Ativado em {new Date(status.enabledAt!).toLocaleDateString('pt-BR')}
            </div>

            <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <ShieldX className="h-4 w-4" />
                  Desativar 2FA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Desativar Autenticação de Dois Fatores</DialogTitle>
                  <DialogDescription>
                    Digite o código do seu aplicativo autenticador para confirmar a desativação.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Isso tornará sua conta menos segura. Você precisará configurar o 2FA novamente se quiser reativá-lo.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <Label htmlFor="disable-code">Código de verificação:</Label>
                    <Input
                      id="disable-code"
                      placeholder="000000"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="font-mono text-center text-lg tracking-widest"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowDisableDialog(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => disableMutation.mutate(disableCode)}
                      disabled={disableCode.length !== 6 || disableMutation.isPending}
                      className="flex-1"
                    >
                      {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Desativar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
