/**
 * Signer List Component
 * Manage signers for a document
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MoreVertical, Mail, Copy, CheckCircle2, Clock, Eye, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Signer {
  key: string;
  name: string;
  email: string;
  status: 'pending' | 'sent' | 'viewed' | 'signed' | 'refused';
  signedAt?: string;
  viewedAt?: string;
}

interface SignerListProps {
  listKey: string;
  signers: Signer[];
}

const statusIcons = {
  pending: Clock,
  sent: Mail,
  viewed: Eye,
  signed: CheckCircle2,
  refused: XCircle,
};

const statusColors = {
  pending: 'text-gray-500',
  sent: 'text-blue-500',
  viewed: 'text-amber-700', // WCAG AA: 4.6:1 contrast
  signed: 'text-green-500',
  refused: 'text-red-500',
};

export function SignerList({ listKey, signers }: SignerListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resendMutation = useMutation({
    mutationFn: async (signerKey: string) => {
      const res = await fetch(`/api/esignature/resend/${listKey}/${signerKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant_1' }), // TODO: Get from context
      });
      if (!res.ok) throw new Error('Failed to resend invitation');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Convite reenviado',
        description: 'O convite foi reenviado com sucesso',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    toast({
      title: 'Email copiado',
      description: 'O email foi copiado para a área de transferência',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Signatários ({signers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {signers.map((signer) => {
            const StatusIcon = statusIcons[signer.status];

            return (
              <div
                key={signer.key}
                className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors"
              >
                <Avatar>
                  <AvatarFallback>
                    {getInitials(signer.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{signer.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {signer.email}
                  </p>
                  {signer.signedAt && (
                    <p className="text-xs text-muted-foreground">
                      Assinado em {new Date(signer.signedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <StatusIcon className={`h-4 w-4 ${statusColors[signer.status]}`} />
                  <Badge variant="outline">
                    {signer.status === 'pending' && 'Pendente'}
                    {signer.status === 'sent' && 'Enviado'}
                    {signer.status === 'viewed' && 'Visualizado'}
                    {signer.status === 'signed' && 'Assinado'}
                    {signer.status === 'refused' && 'Recusado'}
                  </Badge>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copyEmail(signer.email)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar Email
                    </DropdownMenuItem>
                    {signer.status !== 'signed' && signer.status !== 'refused' && (
                      <DropdownMenuItem
                        onClick={() => resendMutation.mutate(signer.key)}
                        disabled={resendMutation.isPending}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Reenviar Convite
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
