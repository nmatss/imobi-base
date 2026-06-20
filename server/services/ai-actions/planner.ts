/**
 * AI Actions Planner
 *
 * Uses the Anthropic client ONLY to PROPOSE structured actions. Every proposed
 * action is validated against the registry Zod schema before being persisted as
 * an `ai_actions` row with status "proposed". Nothing is executed here.
 *
 * Graceful degradation: if ANTHROPIC_API_KEY is absent (or the call fails), the
 * planner returns an empty plan and persists nothing — callers must handle the
 * empty result. AI failures never break the application.
 */

import Anthropic from "@anthropic-ai/sdk";
import { storage } from "../../storage";
import { getActionCatalog, getActionDefinition } from "./registry";

const MODEL = "claude-sonnet-4-20250514";

let client: Anthropic | null = null;
try {
  if (process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
} catch (error) {
  console.warn("[ai-actions/planner] Falha ao iniciar Anthropic client:", error);
  client = null;
}

export interface PlanRequest {
  tenantId: string;
  /** User requesting the plan (proposer is recorded as "ai", actor as user). */
  requestedByUserId: string;
  /** Optional lead the plan should focus on. */
  leadId?: string;
  /** Free-text context / goal provided by the operator. */
  goal?: string;
}

export interface PlannedActionSummary {
  id: string;
  actionType: string;
  status: string;
  requiresApproval: boolean;
  riskLevel: string | null;
  rationale: string | null;
  payload: unknown;
}

export interface PlanResult {
  aiAvailable: boolean;
  created: PlannedActionSummary[];
  /** Non-fatal notes (e.g. invalid proposals dropped). */
  warnings: string[];
}

export function isPlannerAvailable(): boolean {
  return client !== null;
}

interface RawProposal {
  actionType?: string;
  payload?: unknown;
  rationale?: string;
  confidence?: number;
}

/**
 * Build a focused context block for the model from the target lead.
 */
async function buildLeadContext(
  tenantId: string,
  leadId?: string,
): Promise<string> {
  if (!leadId) return "Nenhum lead específico selecionado.";
  const lead = await storage.getLead(leadId);
  if (!lead || lead.tenantId !== tenantId) {
    return "Lead informado não encontrado no tenant.";
  }
  return [
    `Lead: ${lead.name}`,
    `Status atual: ${lead.status}`,
    `Orçamento: ${lead.budget ?? "não informado"}`,
    `Tipo preferido: ${(lead as any).preferredType ?? "não informado"}`,
    `Cidade preferida: ${(lead as any).preferredCity ?? "não informada"}`,
    `Interesses: ${Array.isArray((lead as any).interests) ? (lead as any).interests.join(", ") : "não informados"}`,
  ].join("\n");
}

export async function planActions(req: PlanRequest): Promise<PlanResult> {
  const warnings: string[] = [];

  if (!client) {
    return { aiAvailable: false, created: [], warnings: ["ANTHROPIC_API_KEY ausente."] };
  }

  const catalog = getActionCatalog();
  const leadContext = await buildLeadContext(req.tenantId, req.leadId);

  let proposals: RawProposal[] = [];
  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildPrompt(catalog, leadContext, req),
        },
      ],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    const text = textBlock && "text" in textBlock ? textBlock.text : "";
    proposals = extractProposals(text);
  } catch (err: any) {
    console.error("[ai-actions/planner] Erro ao chamar Anthropic:", err?.message ?? err);
    return {
      aiAvailable: true,
      created: [],
      warnings: ["Falha ao gerar plano com IA."],
    };
  }

  const created: PlannedActionSummary[] = [];

  for (const proposal of proposals) {
    if (!proposal?.actionType) {
      warnings.push("Proposta sem actionType ignorada.");
      continue;
    }
    const def = getActionDefinition(proposal.actionType);
    if (!def) {
      warnings.push(`Tipo desconhecido ignorado: ${proposal.actionType}`);
      continue;
    }
    // Validate proposal payload against the registry schema.
    const parsed = def.schema.safeParse(injectLeadId(proposal.payload, req.leadId));
    if (!parsed.success) {
      warnings.push(
        `Payload inválido para ${proposal.actionType}: ${parsed.error.issues
          .map((i) => i.message)
          .join("; ")}`,
      );
      continue;
    }

    try {
      const action = await storage.createAiAction({
        tenantId: req.tenantId,
        actionType: def.actionType,
        status: "proposed",
        targetType: def.targetType,
        targetId: req.leadId ?? (parsed.data as any).leadId ?? null,
        payload: parsed.data as any,
        rationale: proposal.rationale ?? null,
        confidence:
          typeof proposal.confidence === "number" ? proposal.confidence : null,
        requiresApproval: def.requiresApproval,
        riskLevel: def.riskLevel,
        proposedBy: "ai",
        aiModel: MODEL,
      } as any);

      await storage.appendAiActionAudit({
        tenantId: req.tenantId,
        actionId: action.id,
        event: "proposed",
        actorId: req.requestedByUserId ?? null,
        actorType: "ai",
        afterState: { actionType: def.actionType, payload: parsed.data } as any,
        details: { rationale: proposal.rationale ?? null } as any,
      } as any);

      created.push({
        id: action.id,
        actionType: action.actionType,
        status: action.status,
        requiresApproval: action.requiresApproval,
        riskLevel: action.riskLevel ?? def.riskLevel,
        rationale: action.rationale ?? null,
        payload: parsed.data,
      });
    } catch (err: any) {
      warnings.push(`Falha ao persistir ${def.actionType}: ${err?.message ?? err}`);
    }
  }

  return { aiAvailable: true, created, warnings };
}

// ==================== Prompt / parsing helpers ====================

function buildPrompt(
  catalog: ReturnType<typeof getActionCatalog>,
  leadContext: string,
  req: PlanRequest,
): string {
  const catalogText = catalog
    .map(
      (c) =>
        `- ${c.actionType} (risco: ${c.riskLevel}, aprovação: ${
          c.requiresApproval ? "sim" : "não"
        }): ${c.description}`,
    )
    .join("\n");

  return `Você é um assistente de CRM imobiliário. Sua tarefa é PROPOR ações estruturadas para o corretor a partir do contexto do lead. Você NÃO executa nada — apenas propõe.

Ações disponíveis:
${catalogText}

Contexto do lead:
${leadContext}

Objetivo do corretor: ${req.goal || "Avançar o lead no funil de forma adequada."}

Regras de payload por tipo:
- qualify_lead: { "leadId": string, "status": "new|contacted|qualified|proposal|negotiation|won|lost", "notes"?: string }
- suggest_properties: { "leadId": string, "propertyIds": string[], "message"?: string }
- create_follow_up: { "leadId": string, "dueAt": ISO8601, "type": "call|email|whatsapp|visit|task", "notes"?: string }
- log_summary: { "leadId": string, "summary": string }
- move_stage: { "leadId": string, "toStatus": "new|contacted|qualified|proposal|negotiation|won|lost", "reason"?: string }
- reactivate_contacts: { "leadIds": string[], "message"?: string }

${req.leadId ? `Use SEMPRE leadId = "${req.leadId}".` : ""}

Responda APENAS com um array JSON (sem markdown) no formato:
[{ "actionType": "...", "payload": { ... }, "rationale": "...", "confidence": 0.0-1.0 }]

Proponha de 1 a 4 ações relevantes. Se não houver ação adequada, responda [].`;
}

function extractProposals(text: string): RawProposal[] {
  if (!text) return [];
  // Strip code fences if present.
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  const slice = cleaned.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? (parsed as RawProposal[]) : [];
  } catch {
    return [];
  }
}

function injectLeadId(payload: unknown, leadId?: string): unknown {
  if (!leadId || typeof payload !== "object" || payload === null) return payload;
  const obj = payload as Record<string, unknown>;
  // Only inject for single-lead payloads (not the batch reactivate shape).
  if (!("leadIds" in obj) && obj.leadId == null) {
    return { ...obj, leadId };
  }
  return payload;
}
