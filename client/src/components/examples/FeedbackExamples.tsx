/**
 * EXEMPLOS DE USO DO SISTEMA DE FEEDBACK VISUAL
 *
 * Este arquivo contém exemplos práticos de como usar o sistema de feedback
 * implementado no ImobiBase. Use como referência ao implementar novas features.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast-enhanced";
import { ConfirmDialog, useConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  PropertyCardSkeleton,
  PropertyGridSkeleton,
  DashboardSkeleton,
} from "@/components/ui/skeleton-loaders";

// =============================================================================
// EXEMPLO 1: FORMULÁRIO COM FEEDBACK COMPLETO
// =============================================================================

export function FormWithFeedback() {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação simples
    if (!name || !email) {
      toast.warning("Campos obrigatórios", "Por favor, preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Simula chamada de API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simula erro em 30% das vezes
      if (Math.random() > 0.7) {
        throw new Error("Erro de conexão com o servidor");
      }

      toast.success(
        "Formulário enviado!",
        "Os dados foram salvos com sucesso."
      );

      // Limpa o formulário
      setName("");
      setEmail("");
    } catch (error: any) {
      toast.error(
        "Erro ao enviar formulário",
        error.message || "Tente novamente mais tarde."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplo 1: Formulário com Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXEMPLO 2: AÇÃO DESTRUTIVA COM CONFIRMAÇÃO (DECLARATIVO)
// =============================================================================

export function DeleteWithConfirmation() {
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      // Simula chamada de API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(
        "Item excluído!",
        "O item foi removido com sucesso."
      );

      setConfirmOpen(false);
    } catch (error: any) {
      toast.error(
        "Erro ao excluir",
        error.message || "Não foi possível excluir o item."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplo 2: Ação Destrutiva (Declarativo)</CardTitle>
      </CardHeader>
      <CardContent>
        <Button
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
        >
          Excluir Item
        </Button>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Tem certeza?"
          description="Esta ação não pode ser desfeita. O item será permanentemente removido."
          confirmText="Sim, excluir"
          cancelText="Cancelar"
          variant="destructive"
          onConfirm={handleDelete}
          isLoading={isDeleting}
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXEMPLO 3: AÇÃO DESTRUTIVA COM CONFIRMAÇÃO (IMPERATIVO)
// =============================================================================

export function DeleteWithConfirmationImperative() {
  const toast = useToast();
  const { confirm, dialog } = useConfirmDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: "Excluir item?",
      description: "Esta ação não pode ser desfeita.",
      confirmText: "Excluir",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (!confirmed) {
      toast.info("Ação cancelada", "O item não foi excluído.");
      return;
    }

    try {
      // Simula chamada de API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(
        "Item excluído!",
        "O item foi removido com sucesso."
      );
    } catch (error: any) {
      toast.error(
        "Erro ao excluir",
        error.message || "Não foi possível excluir o item."
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplo 3: Ação Destrutiva (Imperativo)</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" onClick={handleDelete}>
          Excluir Item
        </Button>
        {dialog}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXEMPLO 4: LOADING COM SKELETON
// =============================================================================

export function LoadingWithSkeleton() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

  const handleLoad = async () => {
    setIsLoading(true);
    setData([]);

    try {
      // Simula carregamento de dados
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Simula dados carregados
      setData([1, 2, 3, 4, 5, 6]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplo 4: Loading com Skeleton</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleLoad} className="mb-4">
          Carregar Dados
        </Button>

        {isLoading ? (
          <PropertyGridSkeleton count={6} />
        ) : data.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {data.map((item) => (
              <Card key={item}>
                <CardContent className="p-4">
                  <p>Item {item}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            Nenhum dado carregado. Clique no botão acima.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXEMPLO 5: TOAST PROMISE (PARA OPERAÇÕES ASSÍNCRONAS)
// =============================================================================

export function ToastPromiseExample() {
  const toast = useToast();

  const handleSave = async () => {
    const saveOperation = new Promise((resolve, reject) => {
      setTimeout(() => {
        // 70% de chance de sucesso
        if (Math.random() > 0.3) {
          resolve({ success: true });
        } else {
          reject(new Error("Erro ao salvar dados"));
        }
      }, 2000);
    });

    toast.promise(saveOperation, {
      loading: "Salvando dados...",
      success: "Dados salvos com sucesso!",
      error: (error) => `Erro: ${error.message}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplo 5: Toast Promise</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleSave}>
          Salvar (com Promise Toast)
        </Button>
        <p className="text-sm text-muted-foreground mt-2">
          Mostra automaticamente loading, success ou error
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXEMPLO 6: MÚLTIPLOS TIPOS DE TOAST
// =============================================================================

export function MultipleToastTypes() {
  const toast = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Exemplo 6: Tipos de Toast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant="default"
          onClick={() => toast.success("Sucesso!", "Operação concluída")}
        >
          Toast de Sucesso
        </Button>

        <Button
          variant="destructive"
          onClick={() => toast.error("Erro!", "Algo deu errado")}
        >
          Toast de Erro
        </Button>

        <Button
          variant="outline"
          onClick={() => toast.warning("Atenção!", "Verifique os dados")}
        >
          Toast de Aviso
        </Button>

        <Button
          variant="secondary"
          onClick={() => toast.info("Informação", "Nova atualização disponível")}
        >
          Toast de Info
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            const id = toast.loading("Carregando...");
            setTimeout(() => toast.dismiss(id), 2000);
          }}
        >
          Toast de Loading
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// EXEMPLO COMPLETO - TODOS OS PADRÕES JUNTOS
// =============================================================================

export function FeedbackExamplesShowcase() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold mb-6">
        Sistema de Feedback Visual - Exemplos
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <FormWithFeedback />
        <DeleteWithConfirmation />
        <DeleteWithConfirmationImperative />
        <LoadingWithSkeleton />
        <ToastPromiseExample />
        <MultipleToastTypes />
      </div>
    </div>
  );
}

export default FeedbackExamplesShowcase;
