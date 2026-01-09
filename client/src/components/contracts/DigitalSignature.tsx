import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  FileSignature, Send, Check, Clock, AlertTriangle,
  FileText, Users, Loader2, Download, Eye, RefreshCw,
  Mail, Smartphone, Copy, CheckCheck, X, Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Signer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined';
  signedAt?: string;
  signatureToken?: string;
}

interface SignatureRequest {
  id: string;
  documentId: string;
  documentName: string;
  documentUrl: string;
  status: 'draft' | 'pending' | 'partial' | 'completed' | 'expired' | 'declined';
  signers: Signer[];
  expiresAt?: string;
  createdAt: string;
  completedAt?: string;
}

interface DigitalSignatureProps {
  contractId?: string;
  tenantId: string;
}

const statusConfig = {
  draft: { label: 'Rascunho', color: 'bg-gray-500', icon: FileText },
  pending: { label: 'Pendente', color: 'bg-amber-700', icon: Clock }, // WCAG AA: 4.6:1 contrast
  partial: { label: 'Parcial', color: 'bg-blue-500', icon: Users },
  completed: { label: 'Concluído', color: 'bg-green-500', icon: Check },
  expired: { label: 'Expirado', color: 'bg-red-500', icon: AlertTriangle },
  declined: { label: 'Recusado', color: 'bg-red-500', icon: X },
};

const signerStatusConfig = {
  pending: { label: 'Pendente', color: 'secondary' as const },
  sent: { label: 'Enviado', color: 'outline' as const },
  viewed: { label: 'Visualizado', color: 'default' as const },
  signed: { label: 'Assinado', color: 'default' as const },
  declined: { label: 'Recusado', color: 'destructive' as const },
};

export function DigitalSignature({ contractId, tenantId }: DigitalSignatureProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<SignatureRequest | null>(null);
  const [newRequest, setNewRequest] = useState({
    documentName: '',
    documentUrl: '',
    signers: [{ name: '', email: '', phone: '', role: 'signer' }],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery<SignatureRequest[]>({
    queryKey: ['signature-requests', tenantId, contractId],
    queryFn: async () => {
      const url = contractId
        ? `/api/contracts/${contractId}/signatures`
        : `/api/signatures?tenantId=${tenantId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Erro ao carregar assinaturas');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newRequest) => {
      const res = await fetch('/api/signatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, tenantId, contractId }),
      });
      if (!res.ok) throw new Error('Erro ao criar solicitação');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Solicitação de assinatura criada!' });
      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      setShowCreateDialog(false);
      setNewRequest({
        documentName: '',
        documentUrl: '',
        signers: [{ name: '', email: '', phone: '', role: 'signer' }],
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ requestId, signerId }: { requestId: string; signerId: string }) => {
      const res = await fetch(`/api/signatures/${requestId}/remind/${signerId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erro ao enviar lembrete');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Sucesso', description: 'Lembrete enviado com sucesso!' });
    },
  });

  const addSigner = () => {
    setNewRequest({
      ...newRequest,
      signers: [...newRequest.signers, { name: '', email: '', phone: '', role: 'signer' }],
    });
  };

  const removeSigner = (index: number) => {
    setNewRequest({
      ...newRequest,
      signers: newRequest.signers.filter((_, i) => i !== index),
    });
  };

  const updateSigner = (index: number, field: string, value: string) => {
    const signers = [...newRequest.signers];
    signers[index] = { ...signers[index], [field]: value };
    setNewRequest({ ...newRequest, signers });
  };

  const getProgress = (request: SignatureRequest) => {
    const total = request.signers.length;
    const signed = request.signers.filter(s => s.status === 'signed').length;
    return (signed / total) * 100;
  };

  const copySigningLink = (token: string) => {
    const link = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link copiado!', description: 'O link de assinatura foi copiado.' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileSignature className="h-6 w-6" />
            Assinaturas Digitais
          </h2>
          <p className="text-muted-foreground">
            Gerencie assinaturas eletrônicas de documentos
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Solicitar Assinaturas</DialogTitle>
              <DialogDescription>
                Configure o documento e adicione os signatários
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Document Info */}
              <div className="space-y-4">
                <h4 className="font-medium">Documento</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome do Documento</Label>
                    <Input
                      placeholder="Ex: Contrato de Locação"
                      value={newRequest.documentName}
                      onChange={(e) => setNewRequest({ ...newRequest, documentName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL do Documento (PDF)</Label>
                    <Input
                      placeholder="https://..."
                      value={newRequest.documentUrl}
                      onChange={(e) => setNewRequest({ ...newRequest, documentUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Signers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Signatários</h4>
                  <Button variant="outline" size="sm" onClick={addSigner}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
                {newRequest.signers.map((signer, index) => (
                  <div key={index} className="p-4 rounded-lg border space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Signatário {index + 1}</span>
                      {newRequest.signers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeSigner(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          placeholder="Nome completo"
                          value={signer.name}
                          onChange={(e) => updateSigner(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={signer.email}
                          onChange={(e) => updateSigner(index, 'email', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefone (opcional)</Label>
                        <Input
                          placeholder="(00) 00000-0000"
                          value={signer.phone}
                          onChange={(e) => updateSigner(index, 'phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Função</Label>
                        <Input
                          placeholder="Ex: Locador, Locatário"
                          value={signer.role}
                          onChange={(e) => updateSigner(index, 'role', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newRequest)}
                  disabled={
                    !newRequest.documentName ||
                    !newRequest.documentUrl ||
                    newRequest.signers.some(s => !s.name || !s.email) ||
                    createMutation.isPending
                  }
                  className="flex-1"
                >
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Solicitação
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      {(!requests || requests.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileSignature className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
            <h3 className="font-semibold mb-1">Nenhuma solicitação de assinatura</h3>
            <p className="text-sm text-muted-foreground">
              Crie uma nova solicitação para enviar documentos para assinatura
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const StatusIcon = statusConfig[request.status].icon;
            const progress = getProgress(request);

            return (
              <Card key={request.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${statusConfig[request.status].color} text-white`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{request.documentName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Criado em {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <Badge className={statusConfig[request.status].color}>
                          {statusConfig[request.status].label}
                        </Badge>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {request.signers.filter(s => s.status === 'signed').length} de {request.signers.length} assinaturas
                          </span>
                          <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Signers */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {request.signers.map((signer) => (
                          <div
                            key={signer.id}
                            className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-1.5 rounded-full"
                          >
                            <span>{signer.name}</span>
                            <Badge variant={signerStatusConfig[signer.status].color} className="text-xs">
                              {signerStatusConfig[signer.status].label}
                            </Badge>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={request.documentUrl} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-4 w-4 mr-1" />
                            Ver Documento
                          </a>
                        </Button>
                        {request.status === 'completed' && (
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-1" />
                            Baixar Assinado
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Users className="h-4 w-4 mr-1" />
                              Gerenciar Signatários
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Signatários</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {request.signers.map((signer) => (
                                <div
                                  key={signer.id}
                                  className="flex items-center justify-between p-3 rounded-lg border"
                                >
                                  <div>
                                    <p className="font-medium">{signer.name}</p>
                                    <p className="text-sm text-muted-foreground">{signer.email}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{signer.role}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={signerStatusConfig[signer.status].color}>
                                      {signer.status === 'signed' && signer.signedAt && (
                                        <CheckCheck className="h-3 w-3 mr-1" />
                                      )}
                                      {signerStatusConfig[signer.status].label}
                                    </Badge>
                                    {signer.status !== 'signed' && signer.status !== 'declined' && (
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => sendReminderMutation.mutate({
                                            requestId: request.id,
                                            signerId: signer.id,
                                          })}
                                          disabled={sendReminderMutation.isPending}
                                        >
                                          <Mail className="h-4 w-4" />
                                        </Button>
                                        {signer.signatureToken && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => copySigningLink(signer.signatureToken!)}
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Component for the signing page (public)
export function SignDocument({ token }: { token: string }) {
  const [signature, setSignature] = useState('');
  const [agreed, setAgreed] = useState(false);
  const { toast } = useToast();

  const { data: signingInfo, isLoading, error } = useQuery({
    queryKey: ['signing-info', token],
    queryFn: async () => {
      const res = await fetch(`/api/signatures/token/${token}`);
      if (!res.ok) throw new Error('Link de assinatura inválido ou expirado');
      return res.json();
    },
  });

  const signMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/signatures/token/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature }),
      });
      if (!res.ok) throw new Error('Erro ao assinar documento');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Documento assinado!',
        description: 'Sua assinatura foi registrada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Link Inválido</h2>
            <p className="text-muted-foreground">
              Este link de assinatura é inválido ou já expirou.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Assinatura Concluída!</h2>
            <p className="text-muted-foreground">
              Obrigado por assinar o documento. Você receberá uma cópia por email.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-6 w-6" />
              Assinatura de Documento
            </CardTitle>
            <CardDescription>
              Você está assinando: {signingInfo?.documentName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Preview */}
            <div className="aspect-[8.5/11] bg-white border rounded-lg overflow-hidden">
              <iframe
                src={signingInfo?.documentUrl}
                className="w-full h-full"
                title="Document Preview"
              />
            </div>

            {/* Signature Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sua Assinatura (digite seu nome completo)</Label>
                <Input
                  placeholder="Nome completo"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="text-lg"
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="agree"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="agree" className="text-sm text-muted-foreground">
                  Declaro que li e concordo com os termos do documento acima.
                  Entendo que esta assinatura eletrônica tem validade jurídica.
                </label>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => signMutation.mutate()}
                disabled={!signature || !agreed || signMutation.isPending}
              >
                {signMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSignature className="mr-2 h-4 w-4" />
                )}
                Assinar Documento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
