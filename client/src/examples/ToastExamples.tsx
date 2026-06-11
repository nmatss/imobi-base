/**
 * Toast Notifications - Live Examples
 *
 * This component demonstrates all toast notification patterns
 * available in the ImobiBase system.
 *
 * @author AGENTE 4 - Toast Notifications Architect
 * @date December 28, 2024
 */

import React from "react";
import { toast } from "@/lib/toast-helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export function ToastExamples() {
  // Simulate async operation
  const simulateAsyncOperation = () => new Promise((resolve, reject) => {
      setTimeout(() => {
        Math.random() > 0.3 ? resolve({ name: "João Silva" }) : reject(new Error("Falha na conexão"));
      }, 2000);
    });

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Toast Notifications Gallery</h1>
          <p className="text-muted-foreground">
            Exemplos interativos de todas as notificações toast disponíveis no sistema.
          </p>
        </div>

        <Separator />

        {/* Core Toast Types */}
        <Card>
          <CardHeader>
            <CardTitle>1. Core Toast Types</CardTitle>
            <CardDescription>Tipos básicos de notificação com cores semânticas</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Button
              onClick={() => toast.success("Operação concluída!", "Dados salvos com sucesso.")}
              className="bg-green-600 hover:bg-green-700"
            >
              Success Toast
            </Button>

            <Button
              onClick={() => toast.error("Erro ao processar", "Por favor, tente novamente.")}
              variant="destructive"
            >
              Error Toast
            </Button>

            <Button
              onClick={() => toast.warning("Atenção necessária", "Alguns campos estão vazios.")}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              Warning Toast
            </Button>

            <Button
              onClick={() => toast.info("Nova funcionalidade", "Agora você pode usar atalhos!")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Info Toast
            </Button>
          </CardContent>
        </Card>

        {/* CRUD Operations */}
        <Card>
          <CardHeader>
            <CardTitle>2. CRUD Operations</CardTitle>
            <CardDescription>Notificações para operações de banco de dados</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Button onClick={() => toast.crud.created("Imóvel")} variant="outline">
              Created
            </Button>

            <Button onClick={() => toast.crud.updated("Lead")} variant="outline">
              Updated
            </Button>

            <Button onClick={() => toast.crud.deleted("Contrato")} variant="outline">
              Deleted
            </Button>

            <Button onClick={() => toast.crud.saved("Configurações")} variant="outline">
              Saved
            </Button>

            <Button onClick={() => toast.crud.archived("Proposta")} variant="outline">
              Archived
            </Button>
          </CardContent>
        </Card>

        {/* User Actions */}
        <Card>
          <CardHeader>
            <CardTitle>3. User Actions</CardTitle>
            <CardDescription>Feedback para ações do usuário</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <Button onClick={() => toast.action.copied("Link")} size="sm" variant="secondary">
              Copied
            </Button>

            <Button onClick={() => toast.action.linkCopied()} size="sm" variant="secondary">
              Link Copied
            </Button>

            <Button onClick={() => toast.action.shared("Imóvel")} size="sm" variant="secondary">
              Shared
            </Button>

            <Button onClick={() => toast.action.downloaded("PDF")} size="sm" variant="secondary">
              Downloaded
            </Button>

            <Button onClick={() => toast.action.uploaded("Fotos")} size="sm" variant="secondary">
              Uploaded
            </Button>

            <Button onClick={() => toast.action.sent("WhatsApp")} size="sm" variant="secondary">
              Sent
            </Button>

            <Button onClick={() => toast.action.favorited("Imóvel")} size="sm" variant="secondary">
              Favorited
            </Button>

            <Button onClick={() => toast.action.refreshed("Dados")} size="sm" variant="secondary">
              Refreshed
            </Button>
          </CardContent>
        </Card>

        {/* Error Helpers */}
        <Card>
          <CardHeader>
            <CardTitle>4. Error Helpers</CardTitle>
            <CardDescription>Mensagens de erro padronizadas</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <Button onClick={() => toast.errors.operation("salvar dados")} variant="outline">
              Operation Error
            </Button>

            <Button onClick={() => toast.errors.validation("Campos inválidos")} variant="outline">
              Validation Error
            </Button>

            <Button onClick={() => toast.errors.network()} variant="outline">
              Network Error
            </Button>

            <Button onClick={() => toast.errors.permission()} variant="outline">
              Permission Error
            </Button>

            <Button onClick={() => toast.errors.notFound("Imóvel")} variant="outline">
              Not Found
            </Button>
          </CardContent>
        </Card>

        {/* Warning Helpers */}
        <Card>
          <CardHeader>
            <CardTitle>5. Warning Helpers</CardTitle>
            <CardDescription>Avisos comuns do sistema</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button onClick={() => toast.warnings.unsavedChanges()} variant="outline">
              Unsaved Changes
            </Button>

            <Button onClick={() => toast.warnings.incompleteData()} variant="outline">
              Incomplete Data
            </Button>

            <Button
              onClick={() => toast.warnings.custom("Aviso customizado", "Esta é uma descrição")}
              variant="outline"
            >
              Custom Warning
            </Button>
          </CardContent>
        </Card>

        {/* Promise-based Toasts */}
        <Card>
          <CardHeader>
            <CardTitle>6. Promise-based Toasts</CardTitle>
            <CardDescription>
              Toasts automáticos para operações assíncronas
              <Badge className="ml-2" variant="secondary">
                Advanced
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  toast.promise(simulateAsyncOperation(), {
                    loading: "Processando operação...",
                    success: "Operação concluída com sucesso!",
                    error: "Falha ao processar operação",
                  });
                }}
              >
                Promise Toast (Simples)
              </Button>

              <Button
                onClick={() => {
                  toast.promise(simulateAsyncOperation(), {
                    loading: "Carregando usuário...",
                    success: (data: any) => `Bem-vindo, ${data.name}!`,
                    error: (err: any) => `Erro: ${err.message}`,
                  });
                }}
                variant="secondary"
              >
                Promise Toast (Dinâmico)
              </Button>
            </div>

            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              <strong>Comportamento:</strong> Loading → Success (70%) / Error (30%)
            </div>
          </CardContent>
        </Card>

        {/* Advanced Features */}
        <Card>
          <CardHeader>
            <CardTitle>7. Advanced Features</CardTitle>
            <CardDescription>
              Recursos avançados com botões de ação
              <Badge className="ml-2" variant="secondary">
                Advanced
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              onClick={() => {
                let count = 0;
                toast.withAction(
                  "Lead arquivado",
                  "Desfazer",
                  () => {
                    count++;
                    toast.success(`Restaurado (${count}x)`);
                  },
                  "Clique em Desfazer para restaurar"
                );
              }}
            >
              With Action Button
            </Button>

            <Button
              onClick={() => {
                toast.confirm(
                  "Deseja excluir este item?",
                  () => toast.success("Item excluído!"),
                  () => toast.info("Cancelado pelo usuário"),
                  "Esta ação não pode ser desfeita"
                );
              }}
              variant="destructive"
            >
              Confirmation Dialog
            </Button>

            <Button
              onClick={() => {
                const id = toast.loading("Processando arquivo...", "Aguarde enquanto processamos");

                setTimeout(() => {
                  toast.dismiss(id);
                  toast.success("Arquivo processado!");
                }, 3000);
              }}
              variant="outline"
            >
              Loading State
            </Button>
          </CardContent>
        </Card>

        {/* Duration Examples */}
        <Card>
          <CardHeader>
            <CardTitle>8. Duration Comparison</CardTitle>
            <CardDescription>Compare diferentes durações de auto-dismiss</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Button
                onClick={() => toast.success("Quick toast (2s)")}
                size="sm"
                className="w-full"
              >
                Quick (2s)
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                Copy feedback
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => toast.success("Success toast (4s)")}
                size="sm"
                className="w-full"
              >
                Success (4s)
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                Default success
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => toast.error("Error toast (5s)")}
                size="sm"
                variant="destructive"
                className="w-full"
              >
                Error (5s)
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                Longer for errors
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => {
                  toast.withAction(
                    "Action toast (10s)",
                    "Click",
                    () => toast.success("Clicked!")
                  );
                }}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Action (10s)
              </Button>
              <div className="text-xs text-muted-foreground text-center">
                More time to act
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Real-world Scenarios */}
        <Card>
          <CardHeader>
            <CardTitle>9. Real-world Scenarios</CardTitle>
            <CardDescription>Exemplos práticos de uso no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Property Save */}
              <Button
                onClick={() => {
                  toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 1500)),
                    {
                      loading: "Salvando imóvel...",
                      success: "Imóvel criado com sucesso!",
                      error: "Erro ao salvar imóvel",
                    }
                  );
                }}
                variant="outline"
              >
                Salvar Imóvel
              </Button>

              {/* Lead Status Change */}
              <Button
                onClick={() => {
                  toast.success("Lead movido", 'Lead movido para "Proposta"');
                }}
                variant="outline"
              >
                Mover Lead
              </Button>

              {/* Copy Property Link */}
              <Button
                onClick={() => {
                  const url = "https://imobibase.com/imovel/123";
                  navigator.clipboard.writeText(url);
                  toast.action.linkCopied();
                }}
                variant="outline"
              >
                Copiar Link Imóvel
              </Button>

              {/* Delete with Undo */}
              <Button
                onClick={() => {
                  toast.withAction(
                    "Imóvel excluído",
                    "Desfazer",
                    () => {
                      toast.success("Imóvel restaurado!");
                    },
                    "O imóvel foi movido para a lixeira"
                  );
                }}
                variant="destructive"
              >
                Excluir Imóvel
              </Button>

              {/* Form Validation */}
              <Button
                onClick={() => {
                  toast.errors.validation("Preencha todos os campos obrigatórios");
                }}
                variant="outline"
              >
                Validação Formulário
              </Button>

              {/* WhatsApp Send */}
              <Button
                onClick={() => {
                  toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 1000)),
                    {
                      loading: "Enviando WhatsApp...",
                      success: "Mensagem enviada!",
                      error: "Falha no envio",
                    }
                  );
                }}
                variant="outline"
              >
                Enviar WhatsApp
              </Button>

              {/* Bulk Operation */}
              <Button
                onClick={() => {
                  const count = 5;
                  toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 2500)),
                    {
                      loading: `Excluindo ${count} imóveis...`,
                      success: `${count} imóveis excluídos com sucesso!`,
                      error: "Erro na exclusão em lote",
                    }
                  );
                }}
                variant="outline"
              >
                Exclusão em Lote
              </Button>

              {/* Settings Save */}
              <Button
                onClick={() => {
                  toast.promise(
                    new Promise((resolve) => setTimeout(resolve, 1000)),
                    {
                      loading: "Salvando configurações...",
                      success: "Configurações salvas!",
                      error: "Erro ao salvar",
                    }
                  );
                }}
                variant="outline"
              >
                Salvar Configurações
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Usage Tips */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-blue-900">💡 Usage Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-900">
            <div className="flex items-start gap-2">
              <span className="font-semibold shrink-0">✅ DO:</span>
              <span>Use semantic helpers (toast.crud.created, toast.action.linkCopied)</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold shrink-0">✅ DO:</span>
              <span>Use promise toasts for async operations</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold shrink-0">✅ DO:</span>
              <span>Provide context in error messages (toast.errors.operation("salvar"))</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold shrink-0">❌ DON'T:</span>
              <span>Use generic messages like "Success!" or "Error"</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold shrink-0">❌ DON'T:</span>
              <span>Spam toasts - limit to 3-4 visible at once</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ToastExamples;
