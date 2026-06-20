/**
 * Buyer Portal Routes — Portal de Atendimento ao Comprador
 *
 * Permite que uma imobiliária monte uma "seleção" de imóveis para um lead
 * (comprador) e compartilhe um link público com token. O comprador acessa
 * sem login (o token é a credencial), aceita/recusa/talvez cada imóvel,
 * comenta e agenda visita. Cada interação é registrada no CRM do lead.
 *
 * Rotas públicas: rate-limit por IP, validação de status `active` e `expiresAt`.
 * NUNCA expõem PII do lead (nome/email/telefone) — só dados do imóvel + brand.
 *
 * Rotas admin: requireAuth (sessão + tenant scoped via RLS).
 */

import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { requireAuth } from "./middleware/auth";

/**
 * Shape do brand/white-label exposto ao portal público.
 * Espelha o buildPortalBrand de routes-portal.ts (mantido local para não
 * acoplar a um símbolo não exportado).
 */
interface BuyerPortalBrand {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  faviconUrl: string | null;
  footerText: string | null;
  phone?: string | null;
  email?: string | null;
}

/**
 * Monta o payload white-label do tenant, mesclando brandSettings.
 * Nunca lança: em qualquer falha cai para os dados do tenant.
 */
async function buildPortalBrand(
  tenant:
    | {
        id: string;
        name: string;
        slug: string;
        logo?: string | null;
        primaryColor?: string | null;
        secondaryColor?: string | null;
        phone?: string | null;
        email?: string | null;
      }
    | undefined,
  includeContact = false,
): Promise<BuyerPortalBrand | null> {
  if (!tenant) return null;

  let brand: Record<string, unknown> | undefined;
  try {
    brand = (await storage.getBrandSettings(tenant.id)) as Record<string, unknown> | undefined;
  } catch {
    brand = undefined;
  }

  const payload: BuyerPortalBrand = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logo: (brand?.logoUrl as string | undefined) ?? tenant.logo ?? null,
    primaryColor: (brand?.primaryColor as string | undefined) ?? tenant.primaryColor ?? null,
    secondaryColor: (brand?.secondaryColor as string | undefined) ?? tenant.secondaryColor ?? null,
    faviconUrl: (brand?.faviconUrl as string | undefined) ?? null,
    footerText: (brand?.footerText as string | undefined) ?? null,
  };

  if (includeContact) {
    payload.phone = tenant.phone ?? null;
    payload.email = tenant.email ?? null;
  }

  return payload;
}

/**
 * Verifica se a seleção está utilizável publicamente: precisa existir, estar
 * com status `active` e (se houver expiresAt) não estar expirada.
 */
function isSelectionUsable(selection: { status: string; expiresAt?: unknown }): {
  ok: boolean;
  reason?: "closed" | "expired";
} {
  if (selection.status !== "active") {
    return { ok: false, reason: selection.status === "expired" ? "expired" : "closed" };
  }
  if (selection.expiresAt) {
    const exp = new Date(selection.expiresAt as string | number | Date).getTime();
    if (!Number.isNaN(exp) && exp < Date.now()) {
      return { ok: false, reason: "expired" };
    }
  }
  return { ok: true };
}

/**
 * Projeta um imóvel para o portal público, expondo só o necessário.
 */
function publicProperty(property: any) {
  if (!property) return null;
  return {
    id: property.id,
    title: property.title,
    description: property.description ?? null,
    type: property.type,
    category: property.category,
    price: property.price,
    address: property.address,
    city: property.city,
    state: property.state,
    bedrooms: property.bedrooms ?? null,
    bathrooms: property.bathrooms ?? null,
    area: property.area ?? null,
    images: property.images ?? [],
    features: property.features ?? [],
  };
}

const VALID_RESPONSES = new Set(["accepted", "rejected", "maybe"]);

export function registerBuyerPortalRoutes(app: Express): void {
  // Rate limit por IP para as rotas públicas (mesmo perfil do limiter de
  // routes-portal.ts: janela de 15min, 20 req).
  const buyerPortalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: "Muitas requisições. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // ==================== PÚBLICAS (token é a credencial) ====================

  // GET /api/portal/selection/:token
  // Retorna brand + seleção + itens com imóveis. NÃO expõe PII do lead.
  app.get(
    "/api/portal/selection/:token",
    buyerPortalLimiter,
    async (req: Request, res: Response) => {
      try {
        const { token } = req.params;
        const selection = await storage.getBuyerSelectionByToken(token);
        if (!selection) {
          return res.status(404).json({ error: "Seleção não encontrada", code: "NOT_FOUND" });
        }

        const usable = isSelectionUsable(selection);
        if (!usable.ok) {
          return res.status(410).json({
            error:
              usable.reason === "expired"
                ? "Este link expirou."
                : "Esta seleção foi encerrada.",
            code: usable.reason === "expired" ? "EXPIRED" : "CLOSED",
          });
        }

        const tenant = await storage.getTenant(selection.tenantId);
        const brand = await buildPortalBrand(tenant as any, true);

        res.json({
          brand,
          selection: {
            id: selection.id,
            title: selection.title,
            message: selection.message ?? null,
            status: selection.status,
            expiresAt: selection.expiresAt ?? null,
            createdAt: selection.createdAt ?? null,
          },
          items: selection.items.map((item) => ({
            id: item.id,
            sortOrder: item.sortOrder ?? 0,
            response: item.response ?? null,
            comment: item.comment ?? null,
            respondedAt: item.respondedAt ?? null,
            property: publicProperty(item.property),
          })),
        });
      } catch (err) {
        console.error("Buyer portal get selection error:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );

  // POST /api/portal/selection/:token/items/:itemId/respond
  // Body: { response: accepted|rejected|maybe, comment?: string }
  app.post(
    "/api/portal/selection/:token/items/:itemId/respond",
    buyerPortalLimiter,
    async (req: Request, res: Response) => {
      try {
        const { token, itemId } = req.params;
        const { response, comment } = req.body ?? {};

        if (!response || !VALID_RESPONSES.has(String(response))) {
          return res.status(400).json({
            error: "Resposta inválida. Use accepted, rejected ou maybe.",
          });
        }

        const selection = await storage.getBuyerSelectionByToken(token);
        if (!selection) {
          return res.status(404).json({ error: "Seleção não encontrada", code: "NOT_FOUND" });
        }
        const usable = isSelectionUsable(selection);
        if (!usable.ok) {
          return res.status(410).json({
            error:
              usable.reason === "expired"
                ? "Este link expirou."
                : "Esta seleção foi encerrada.",
            code: usable.reason === "expired" ? "EXPIRED" : "CLOSED",
          });
        }

        // Garante que o item pertence a esta seleção (evita responder item de
        // outra seleção via token válido).
        const item = selection.items.find((i) => i.id === itemId);
        if (!item) {
          return res.status(404).json({ error: "Imóvel não encontrado nesta seleção", code: "NOT_FOUND" });
        }

        const commentStr =
          typeof comment === "string" && comment.trim().length > 0
            ? comment.trim().slice(0, 2000)
            : undefined;

        const updated = await storage.updateSelectionItemResponse(
          itemId,
          String(response),
          commentStr,
        );

        // Registra interação no CRM (quando há lead vinculado).
        if (selection.leadId) {
          const labelMap: Record<string, string> = {
            accepted: "aceitou",
            rejected: "recusou",
            maybe: "marcou como talvez",
          };
          const propertyTitle = item.property?.title ?? "um imóvel";
          const content = `Comprador ${labelMap[String(response)]} "${propertyTitle}" na seleção "${selection.title}".${
            commentStr ? ` Comentário: ${commentStr}` : ""
          }`;
          try {
            await storage.createInteraction({
              leadId: selection.leadId,
              userId: selection.createdBy,
              type: "portal_buyer",
              content,
            });
          } catch (interErr) {
            console.error("Buyer portal respond interaction error:", interErr);
          }
        }

        res.json({
          id: updated?.id ?? itemId,
          response: updated?.response ?? String(response),
          comment: updated?.comment ?? commentStr ?? null,
          respondedAt: updated?.respondedAt ?? null,
        });
      } catch (err) {
        console.error("Buyer portal respond error:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );

  // POST /api/portal/selection/:token/items/:itemId/visit
  // Body: { preferredDate: string (ISO), notes?: string }
  app.post(
    "/api/portal/selection/:token/items/:itemId/visit",
    buyerPortalLimiter,
    async (req: Request, res: Response) => {
      try {
        const { token, itemId } = req.params;
        const { preferredDate, notes } = req.body ?? {};

        if (!preferredDate) {
          return res.status(400).json({ error: "Data preferida é obrigatória" });
        }
        const scheduledFor = new Date(preferredDate);
        if (Number.isNaN(scheduledFor.getTime())) {
          return res.status(400).json({ error: "Data preferida inválida" });
        }

        const selection = await storage.getBuyerSelectionByToken(token);
        if (!selection) {
          return res.status(404).json({ error: "Seleção não encontrada", code: "NOT_FOUND" });
        }
        const usable = isSelectionUsable(selection);
        if (!usable.ok) {
          return res.status(410).json({
            error:
              usable.reason === "expired"
                ? "Este link expirou."
                : "Esta seleção foi encerrada.",
            code: usable.reason === "expired" ? "EXPIRED" : "CLOSED",
          });
        }

        const item = selection.items.find((i) => i.id === itemId);
        if (!item || !item.property) {
          return res.status(404).json({ error: "Imóvel não encontrado nesta seleção", code: "NOT_FOUND" });
        }

        const notesStr =
          typeof notes === "string" && notes.trim().length > 0
            ? notes.trim().slice(0, 2000)
            : undefined;

        const visit = await storage.createVisit({
          tenantId: selection.tenantId,
          propertyId: item.property.id,
          leadId: selection.leadId ?? null,
          scheduledFor: scheduledFor.toISOString(),
          status: "requested",
          assignedTo: selection.createdBy,
          notes: notesStr
            ? `Solicitada via portal do comprador. ${notesStr}`
            : "Solicitada via portal do comprador.",
        } as any);

        // Registra a solicitação no CRM do lead.
        if (selection.leadId) {
          const propertyTitle = item.property.title ?? "um imóvel";
          const content = `Comprador solicitou visita ao imóvel "${propertyTitle}" para ${scheduledFor.toLocaleString(
            "pt-BR",
          )}.${notesStr ? ` Observações: ${notesStr}` : ""}`;
          try {
            await storage.createInteraction({
              leadId: selection.leadId,
              userId: selection.createdBy,
              type: "portal_buyer",
              content,
            });
          } catch (interErr) {
            console.error("Buyer portal visit interaction error:", interErr);
          }
        }

        res.status(201).json({
          id: visit?.id,
          status: visit?.status ?? "requested",
          scheduledFor: visit?.scheduledFor ?? scheduledFor.toISOString(),
          message: "Visita solicitada com sucesso. A imobiliária entrará em contato para confirmar.",
        });
      } catch (err) {
        console.error("Buyer portal visit error:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );

  // ==================== ADMIN (requireAuth + tenant scoped) ====================

  // POST /api/portal/buyer-selections
  // Body: { leadId: string, propertyIds: string[], message?: string, title?: string, expiresAt?: string }
  app.post(
    "/api/portal/buyer-selections",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const userId = req.user!.id;
        const { leadId, propertyIds, message, title, expiresAt } = req.body ?? {};

        if (!leadId || !Array.isArray(propertyIds) || propertyIds.length === 0) {
          return res
            .status(400)
            .json({ error: "leadId e ao menos um imóvel (propertyIds) são obrigatórios" });
        }

        // Valida o lead dentro do tenant.
        const lead = await storage.getLead(leadId);
        if (!lead || lead.tenantId !== tenantId) {
          return res.status(404).json({ error: "Lead não encontrado" });
        }

        // Valida que todos os imóveis pertencem ao tenant.
        const validPropertyIds: string[] = [];
        for (const pid of propertyIds) {
          const property = await storage.getProperty(pid);
          if (property && property.tenantId === tenantId) {
            validPropertyIds.push(pid);
          }
        }
        if (validPropertyIds.length === 0) {
          return res.status(400).json({ error: "Nenhum imóvel válido informado" });
        }

        const publicToken = randomBytes(32).toString("base64url");

        const selection = await storage.createBuyerSelection({
          tenantId,
          leadId,
          createdBy: userId,
          title:
            typeof title === "string" && title.trim().length > 0
              ? title.trim().slice(0, 200)
              : `Seleção de imóveis para ${lead.name}`,
          publicToken,
          status: "active",
          message:
            typeof message === "string" && message.trim().length > 0
              ? message.trim().slice(0, 2000)
              : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        } as any);

        await storage.addSelectionItems(
          validPropertyIds.map((propertyId, index) => ({
            selectionId: selection.id,
            propertyId,
            sortOrder: index,
          })) as any,
        );

        res.status(201).json({
          ...selection,
          itemCount: validPropertyIds.length,
        });
      } catch (err) {
        console.error("Buyer portal create selection error:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );

  // GET /api/portal/buyer-selections
  app.get(
    "/api/portal/buyer-selections",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const selections = await storage.getBuyerSelectionsByTenant(tenantId);
        res.json(selections);
      } catch (err) {
        console.error("Buyer portal list selections error:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );

  // GET /api/portal/buyer-selections/:id
  app.get(
    "/api/portal/buyer-selections/:id",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const selection = await storage.getBuyerSelection(req.params.id);
        if (!selection || selection.tenantId !== tenantId) {
          return res.status(404).json({ error: "Seleção não encontrada" });
        }

        // Reaproveita o getter por token para trazer itens + imóveis.
        const full = await storage.getBuyerSelectionByToken(selection.publicToken);

        let leadInfo: { id: string; name: string; email: string; phone: string } | null = null;
        if (selection.leadId) {
          const lead = await storage.getLead(selection.leadId);
          if (lead && lead.tenantId === tenantId) {
            leadInfo = {
              id: lead.id,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
            };
          }
        }

        res.json({
          ...selection,
          lead: leadInfo,
          items:
            full?.items.map((item) => ({
              id: item.id,
              sortOrder: item.sortOrder ?? 0,
              response: item.response ?? null,
              comment: item.comment ?? null,
              respondedAt: item.respondedAt ?? null,
              property: publicProperty(item.property),
            })) ?? [],
        });
      } catch (err) {
        console.error("Buyer portal get selection detail error:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );

  // POST /api/portal/buyer-selections/:id/close
  app.post(
    "/api/portal/buyer-selections/:id/close",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const tenantId = req.user!.tenantId;
        const selection = await storage.getBuyerSelection(req.params.id);
        if (!selection || selection.tenantId !== tenantId) {
          return res.status(404).json({ error: "Seleção não encontrada" });
        }

        const closed = await storage.closeBuyerSelection(selection.id);
        res.json(closed ?? { ...selection, status: "closed" });
      } catch (err) {
        console.error("Buyer portal close selection error:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
      }
    },
  );
}
