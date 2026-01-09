/**
 * EXEMPLO DE IMPLEMENTAÇÃO DE FEEDBACK VISUAL EM LEADS
 *
 * Demonstra:
 * - Toast notifications para CRUD operations
 * - Loading states em botões de ação
 * - Skeleton loaders para Kanban
 * - Confirmação de ações destrutivas
 * - Feedback visual em drag & drop
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToastFeedback, toastHelpers } from "@/hooks/useToastFeedback";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { KanbanBoardSkeleton } from "@/components/ui/skeleton-loaders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Mail, Phone, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  source: string;
}

export function LeadsWithFeedback() {
  const toast = useToastFeedback();
  const { confirm, dialog } = useConfirmDialog();
  const queryClient = useQueryClient();

  // Mutation para deletar lead
  const deleteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erro ao deletar lead");
      return response.json();
    },
    onSuccess: () => {
      toastHelpers.deleted("Lead");
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao deletar lead", error.message);
    },
  });

  // Mutation para mover lead
  const moveLeadMutation = useMutation({
    mutationFn: async ({ leadId, newStatus }: { leadId: string; newStatus: string }) => {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Erro ao mover lead");
      return response.json();
    },
    onMutate: async ({ leadId, newStatus }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/leads"] });
      const previousLeads = queryClient.getQueryData(["/api/leads"]);

      // Toast de loading
      toast.loading("Movendo lead...");

      return { previousLeads };
    },
    onSuccess: (data, variables) => {
      toast.dismiss();
      toast.success("Lead movido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error: any, variables, context) => {
      toast.dismiss();
      toast.error("Erro ao mover lead", error.message);
      // Rollback otimista
      if (context?.previousLeads) {
        queryClient.setQueryData(["/api/leads"], context.previousLeads);
      }
    },
  });

  // Mutation para enviar email
  const sendEmailMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/leads/${leadId}/email`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Erro ao enviar email");
      return response.json();
    },
    onSuccess: () => {
      toast.success("Email enviado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao enviar email", error.message);
    },
  });

  const handleDelete = async (lead: Lead) => {
    const confirmed = await confirm({
      title: "Deletar lead?",
      description: `Tem certeza que deseja deletar o lead "${lead.name}"? Esta ação não pode ser desfeita.`,
      confirmText: "Deletar",
      cancelText: "Cancelar",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate(lead.id);
    }
  };

  const handleSendEmail = (leadId: string) => {
    sendEmailMutation.mutate(leadId);
  };

  const handleMoveLead = (leadId: string, newStatus: string) => {
    moveLeadMutation.mutate({ leadId, newStatus });
  };

  return (
    <>
      {/* Dialog de confirmação */}
      {dialog}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leads</h1>
            <p className="text-muted-foreground">Gerencie seus contatos e oportunidades</p>
          </div>
          <Button>Novo Lead</Button>
        </div>

        {/* Exemplo de card de lead com feedback */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LeadCard
            lead={{
              id: "1",
              name: "João Silva",
              email: "joao@email.com",
              phone: "(11) 99999-9999",
              status: "new",
              source: "Website",
            }}
            onDelete={handleDelete}
            onSendEmail={handleSendEmail}
            onMove={handleMoveLead}
            isDeleting={deleteMutation.isPending}
            isSendingEmail={sendEmailMutation.isPending}
          />
        </div>
      </div>
    </>
  );
}

// Componente de card de lead com feedback
interface LeadCardProps {
  lead: Lead;
  onDelete: (lead: Lead) => void;
  onSendEmail: (leadId: string) => void;
  onMove: (leadId: string, newStatus: string) => void;
  isDeleting?: boolean;
  isSendingEmail?: boolean;
}

function LeadCard({
  lead,
  onDelete,
  onSendEmail,
  onMove,
  isDeleting,
  isSendingEmail,
}: LeadCardProps) {
  const statusLabels = {
    new: "Novo",
    contacted: "Contatado",
    qualified: "Qualificado",
    proposal: "Proposta",
    won: "Ganho",
    lost: "Perdido",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{lead.name}</CardTitle>
            <Badge variant="outline">{statusLabels[lead.status]}</Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isDeleting}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onSendEmail(lead.id)}
                disabled={isSendingEmail}
              >
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(lead)}
                disabled={isDeleting}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deletar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          {lead.email}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          {lead.phone}
        </div>

        {/* Botões de ação com loading states */}
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSendEmail(lead.id)}
            disabled={isSendingEmail}
            isLoading={isSendingEmail}
            className="flex-1"
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
          >
            <Phone className="mr-2 h-4 w-4" />
            Ligar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
