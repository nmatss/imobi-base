/**
 * AIActionReview
 *
 * Operator-facing panel to review AI-proposed actions for a lead: generate a
 * plan, then approve / reject / execute each action and inspect its audit trail.
 *
 * Self-contained: relies on aiActionsApi (CSRF-aware via apiClient) and React
 * Query. Mount it anywhere with an optional `leadId` to scope the plan.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  aiActionsApi,
  type AiAction,
  type AiActionAudit,
  ACTION_TYPE_LABEL,
  RISK_LABEL,
  STATUS_LABEL,
} from "@/lib/ai-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AIActionReviewProps {
  /** Optional lead to scope the plan + listing. */
  leadId?: string;
  className?: string;
}

function riskVariant(risk: string | null): "secondary" | "warning" | "destructive" {
  if (risk === "high") return "destructive";
  if (risk === "medium") return "warning";
  return "secondary";
}

function statusVariant(
  status: string,
): "default" | "secondary" | "success" | "destructive" | "warning" {
  switch (status) {
    case "executed":
      return "success";
    case "approved":
      return "default";
    case "rejected":
    case "failed":
      return "destructive";
    case "expired":
      return "warning";
    default:
      return "secondary";
  }
}

export function AIActionReview({ leadId, className }: AIActionReviewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState("");
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const listKey = ["ai-actions", { leadId: leadId ?? null }] as const;

  const { data: actions = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () =>
      aiActionsApi.list(leadId ? { targetType: "lead", targetId: leadId } : undefined),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: listKey });

  const planMutation = useMutation({
    mutationFn: () => aiActionsApi.plan({ leadId, goal: goal.trim() || undefined }),
    onSuccess: (result) => {
      if (!result.aiAvailable) {
        toast({
          title: "IA indisponível",
          description: "Configure ANTHROPIC_API_KEY para gerar planos.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Plano gerado",
        description: `${result.created.length} ação(ões) proposta(s).`,
      });
      if (result.warnings.length) {
        console.warn("[AIActionReview] avisos do planner:", result.warnings);
      }
      invalidate();
    },
    onError: (err: any) =>
      toast({
        title: "Erro ao gerar plano",
        description: String(err?.message ?? err),
        variant: "destructive",
      }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => aiActionsApi.approve(id),
    onSuccess: () => {
      toast({ title: "Ação aprovada" });
      invalidate();
    },
    onError: (err: any) =>
      toast({ title: "Erro ao aprovar", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => aiActionsApi.reject(id),
    onSuccess: () => {
      toast({ title: "Ação rejeitada" });
      invalidate();
    },
    onError: (err: any) =>
      toast({ title: "Erro ao rejeitar", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const executeMutation = useMutation({
    mutationFn: (id: string) => aiActionsApi.execute(id),
    onSuccess: (outcome) => {
      if (!outcome.ok) {
        toast({
          title: "Não foi possível executar",
          description: outcome.error ?? outcome.status,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: outcome.alreadyExecuted ? "Já executada" : "Ação executada",
        description: outcome.summary,
      });
      invalidate();
    },
    onError: (err: any) =>
      toast({ title: "Erro ao executar", description: String(err?.message ?? err), variant: "destructive" }),
  });

  const anyPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    executeMutation.isPending;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Ações de IA</CardTitle>
        <CardDescription>
          Revise, aprove e execute ações sugeridas pela IA. Tudo é auditável.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Objetivo (opcional): ex. avançar lead para proposta"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="ai-action-goal-input"
          />
          <Button
            onClick={() => planMutation.mutate()}
            disabled={planMutation.isPending}
            data-testid="ai-action-plan-button"
          >
            {planMutation.isPending ? "Gerando..." : "Gerar plano"}
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando ações...</p>
        ) : actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma ação ainda. Gere um plano para começar.
          </p>
        ) : (
          <ul className="space-y-3">
            {actions.map((action) => (
              <ActionRow
                key={action.id}
                action={action}
                disabled={anyPending}
                onApprove={() => approveMutation.mutate(action.id)}
                onReject={() => rejectMutation.mutate(action.id)}
                onExecute={() => executeMutation.mutate(action.id)}
                auditExpanded={expandedAuditId === action.id}
                onToggleAudit={() =>
                  setExpandedAuditId((cur) => (cur === action.id ? null : action.id))
                }
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface ActionRowProps {
  action: AiAction;
  disabled: boolean;
  onApprove: () => void;
  onReject: () => void;
  onExecute: () => void;
  auditExpanded: boolean;
  onToggleAudit: () => void;
}

function ActionRow({
  action,
  disabled,
  onApprove,
  onReject,
  onExecute,
  auditExpanded,
  onToggleAudit,
}: ActionRowProps) {
  const canApprove = action.requiresApproval && action.status === "proposed";
  const canReject = action.status === "proposed" || action.status === "approved";
  const canExecute =
    action.status === "approved" ||
    (!action.requiresApproval && action.status === "proposed");

  return (
    <li className="rounded-lg border p-3" data-testid={`ai-action-${action.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {ACTION_TYPE_LABEL[action.actionType] ?? action.actionType}
        </span>
        <Badge variant={statusVariant(action.status)}>
          {STATUS_LABEL[action.status] ?? action.status}
        </Badge>
        <Badge variant={riskVariant(action.riskLevel)}>
          Risco: {RISK_LABEL[action.riskLevel ?? "low"] ?? action.riskLevel}
        </Badge>
        {action.requiresApproval && (
          <Badge variant="outline">Requer aprovação</Badge>
        )}
      </div>

      {action.rationale && (
        <p className="mt-2 text-sm text-muted-foreground">{action.rationale}</p>
      )}
      {action.error && (
        <p className="mt-2 text-sm text-destructive">Erro: {action.error}</p>
      )}

      <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
        {JSON.stringify(action.payload, null, 2)}
      </pre>

      <div className="mt-3 flex flex-wrap gap-2">
        {canApprove && (
          <Button size="sm" variant="default" disabled={disabled} onClick={onApprove}>
            Aprovar
          </Button>
        )}
        {canReject && (
          <Button size="sm" variant="outline" disabled={disabled} onClick={onReject}>
            Rejeitar
          </Button>
        )}
        {canExecute && (
          <Button size="sm" variant="secondary" disabled={disabled} onClick={onExecute}>
            Executar
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onToggleAudit}>
          {auditExpanded ? "Ocultar auditoria" : "Ver auditoria"}
        </Button>
      </div>

      {auditExpanded && <AuditTrail actionId={action.id} />}
    </li>
  );
}

function AuditTrail({ actionId }: { actionId: string }) {
  const { data: audit = [], isLoading } = useQuery({
    queryKey: ["ai-action-audit", actionId],
    queryFn: () => aiActionsApi.audit(actionId),
  });

  if (isLoading) {
    return <p className="mt-2 text-xs text-muted-foreground">Carregando auditoria...</p>;
  }
  if (audit.length === 0) {
    return <p className="mt-2 text-xs text-muted-foreground">Sem eventos de auditoria.</p>;
  }

  return (
    <ul className="mt-3 space-y-1 border-t pt-2 text-xs">
      {audit.map((entry: AiActionAudit) => (
        <li key={entry.id} className="flex items-center gap-2">
          <Badge variant="outline">{entry.event}</Badge>
          <span className="text-muted-foreground">
            {new Date(entry.createdAt).toLocaleString("pt-BR")} · {entry.actorType}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default AIActionReview;
