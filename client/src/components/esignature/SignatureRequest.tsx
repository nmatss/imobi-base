/**
 * Signature Request Component
 * Create and manage signature requests with ClickSign integration
 */

import React, { useState } from "react";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSignature, Plus, X, Upload, Loader2, Send, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Signer {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  role: string;
}

interface SignatureRequestProps {
  tenantId: string;
  contractId?: string;
  onSuccess?: (data: any) => void;
}

export function SignatureRequest({ tenantId, contractId, onSuccess }: SignatureRequestProps) {
  const [open, setOpen] = useState(false);
  const [document, setDocument] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [signers, setSigners] = useState<Signer[]>([
    { name: '', email: '', cpf: '', phone: '', role: 'Signatário' },
  ]);
  const [signingOrder, setSigningOrder] = useState<'parallel' | 'sequential'>('parallel');
  const [customMessage, setCustomMessage] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const res = await fetch('/api/esignature/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          filename: file.name,
          contentBase64: base64,
          autoClose: true,
          locale: 'pt-BR',
        }),
      });

      if (!res.ok) throw new Error('Failed to upload document');
      return res.json();
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (documentKey: string) => {
      const res = await fetch('/api/esignature/create-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          documentKey,
          listName: `Assinaturas - ${documentName}`,
          signers,
          signingConfig: {
            order: signingOrder,
            refusable: true,
            customMessage,
          },
        }),
      });

      if (!res.ok) throw new Error('Failed to create signature request');
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (listKey: string) => {
      const res = await fetch('/api/esignature/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          listKey,
          message: customMessage,
        }),
      });

      if (!res.ok) throw new Error('Failed to send invitations');
      return res.json();
    },
  });

  const handleSubmit = async () => {
    if (!document) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione um documento',
        variant: 'destructive',
      });
      return;
    }

    // Validate signers
    const invalidSigners = signers.filter(s => !s.name || !s.email);
    if (invalidSigners.length > 0) {
      toast({
        title: 'Erro',
        description: 'Preencha nome e email de todos os signatários',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Step 1: Upload document
      const uploadResult = await uploadMutation.mutateAsync(document);
      const documentKey = uploadResult.document.key;

      // Step 2: Create signature request
      const requestResult = await createRequestMutation.mutateAsync(documentKey);
      const listKey = requestResult.list.key;

      // Step 3: Send invitations
      await sendMutation.mutateAsync(listKey);

      toast({
        title: 'Sucesso!',
        description: 'Solicitação de assinatura enviada com sucesso',
      });

      queryClient.invalidateQueries({ queryKey: ['signature-requests'] });
      setOpen(false);
      resetForm();

      if (onSuccess) {
        onSuccess({ documentKey, listKey });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar solicitação',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setDocument(null);
    setDocumentName('');
    setSigners([{ name: '', email: '', cpf: '', phone: '', role: 'Signatário' }]);
    setSigningOrder('parallel');
    setCustomMessage('');
  };

  const addSigner = () => {
    setSigners([...signers, { name: '', email: '', cpf: '', phone: '', role: 'Signatário' }]);
  };

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: keyof Signer, value: string) => {
    const newSigners = [...signers];
    newSigners[index] = { ...newSigners[index], [field]: value };
    setSigners(newSigners);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Erro',
          description: 'Por favor, selecione um arquivo PDF',
          variant: 'destructive',
        });
        return;
      }
      setDocument(file);
      setDocumentName(file.name.replace('.pdf', ''));
    }
  };

  const isProcessing = uploadMutation.isPending || createRequestMutation.isPending || sendMutation.isPending;

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <FileSignature className="h-4 w-4 mr-2" />
        Nova Solicitação de Assinatura
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSignature className="h-5 w-5" />
              Solicitar Assinaturas Digitais
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Document Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documento</CardTitle>
                <CardDescription>Faça upload do PDF para assinatura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="document">Arquivo PDF</Label>
                  <div className="flex gap-2">
                    <Input
                      id="document"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="flex-1"
                    />
                    {document && (
                      <Button variant="ghost" size="icon" onClick={() => setDocument(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {document && (
                    <p className="text-sm text-muted-foreground">
                      Arquivo selecionado: {document.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="docName">Nome do Documento</Label>
                  <Input
                    id="docName"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="Ex: Contrato de Locação"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Signers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Signatários</CardTitle>
                    <CardDescription>Configure quem deve assinar o documento</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={addSigner}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {signers.map((signer, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Signatário {index + 1}</span>
                      {signers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSigner(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Nome Completo*</Label>
                        <Input
                          value={signer.name}
                          onChange={(e) => updateSigner(index, 'name', e.target.value)}
                          placeholder="Nome completo"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Email*</Label>
                        <Input
                          type="email"
                          value={signer.email}
                          onChange={(e) => updateSigner(index, 'email', e.target.value)}
                          placeholder="email@exemplo.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>CPF (opcional)</Label>
                        <Input
                          value={signer.cpf}
                          onChange={(e) => updateSigner(index, 'cpf', e.target.value)}
                          placeholder="000.000.000-00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Telefone (opcional)</Label>
                        <Input
                          value={signer.phone}
                          onChange={(e) => updateSigner(index, 'phone', e.target.value)}
                          placeholder="(00) 00000-0000"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Função</Label>
                        <Input
                          value={signer.role}
                          onChange={(e) => updateSigner(index, 'role', e.target.value)}
                          placeholder="Ex: Locador, Locatário, Testemunha"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Signing Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Ordem de Assinatura</Label>
                  <Select value={signingOrder} onValueChange={(v: any) => setSigningOrder(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parallel">Paralelo (todos ao mesmo tempo)</SelectItem>
                      <SelectItem value="sequential">Sequencial (um por vez)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mensagem Personalizada (opcional)</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Escreva uma mensagem que será enviada junto com o convite para assinatura..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isProcessing || !document}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar para Assinatura
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
