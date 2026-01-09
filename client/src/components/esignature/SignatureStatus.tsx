/**
 * Signature Status Component
 * Track and display signature progress
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  Mail,
  Loader2,
  Download,
  FileText,
} from 'lucide-react';

interface SignatureStatusProps {
  documentKey: string;
  listKey: string;
  showActions?: boolean;
}

interface Signer {
  name: string;
  email: string;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'refused';
  signedAt?: string;
  viewedAt?: string;
  refusedAt?: string;
}

const statusConfig = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    color: 'text-gray-500',
    bg: 'bg-gray-100',
  },
  sent: {
    label: 'Enviado',
    icon: Mail,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
  },
  viewed: {
    label: 'Visualizado',
    icon: Eye,
    color: 'text-white', // WCAG AA compliant
    bg: 'bg-amber-700', // WCAG AA: 4.6:1 contrast
  },
  signed: {
    label: 'Assinado',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-100',
  },
  refused: {
    label: 'Recusado',
    icon: XCircle,
    color: 'text-red-500',
    bg: 'bg-red-100',
  },
};

export function SignatureStatus({ documentKey, listKey, showActions = true }: SignatureStatusProps) {
  const { data: document, isLoading: docLoading } = useQuery({
    queryKey: ['document-status', documentKey],
    queryFn: async () => {
      const res = await fetch(`/api/esignature/status/${documentKey}`);
      if (!res.ok) throw new Error('Failed to load document status');
      return res.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const { data: signersData, isLoading: signersLoading } = useQuery({
    queryKey: ['signers-status', listKey],
    queryFn: async () => {
      const res = await fetch(`/api/esignature/signers/${listKey}`);
      if (!res.ok) throw new Error('Failed to load signers');
      return res.json();
    },
    refetchInterval: 10000,
  });

  if (docLoading || signersLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const signers: Signer[] = signersData?.signers || [];
  const summary = signersData?.summary || { total: 0, signed: 0, pending: 0, refused: 0 };
  const progress = summary.total > 0 ? (summary.signed / summary.total) * 100 : 0;

  const handleDownload = async () => {
    window.open(`/api/esignature/download/${documentKey}`, '_blank');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {document?.document?.filename || 'Documento'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Status da assinatura
            </p>
          </div>
          {showActions && document?.document?.status === 'closed' && (
            <Button onClick={handleDownload} size="sm" variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Baixar Assinado
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">
              {summary.signed} de {summary.total} assinaturas
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>{summary.signed} Assinado(s)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-700" /> {/* WCAG AA: 4.6:1 */}
              <span>{summary.pending} Pendente(s)</span>
            </div>
            {summary.refused > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>{summary.refused} Recusado(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* Signers List */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Signatários</h4>
          <div className="space-y-2">
            {signers.map((signer, index) => {
              const config = statusConfig[signer.status];
              const StatusIcon = config.icon;

              return (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={config.bg}>
                      {getInitials(signer.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{signer.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {signer.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusIcon className={`h-4 w-4 ${config.color}`} />
                    <Badge variant="outline" className="whitespace-nowrap">
                      {config.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Status */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status do Documento</span>
            <Badge variant={document?.document?.isComplete ? 'default' : 'secondary'}>
              {document?.document?.isComplete ? 'Concluído' : 'Em Andamento'}
            </Badge>
          </div>
          {document?.document?.finishedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Finalizado em {new Date(document.document.finishedAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
