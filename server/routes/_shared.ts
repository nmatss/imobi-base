/**
 * arch-1 — Helpers compartilhados das rotas.
 *
 * Extraidos de server/routes.ts (que era um monolito de ~4500 LOC) para permitir
 * decompor os handlers por dominio em server/routes/<dominio>.ts sem duplicar estes
 * helpers. Sao funcoes puras sobre `storage` e `validateResourceTenant`.
 *
 * `RouteDeps` carrega os middlewares que sao locais de registerRoutes (requireAuth,
 * limiters) para os modulos de dominio extraidos.
 */
import type { RequestHandler } from "express";
import { storage } from "../storage";
import { validateResourceTenant } from "../middleware/tenant-resource";

// ===== ERROR HELPERS =====
export function toHttpError(error: unknown): { status: number; message: string } {
  const err = error as { status?: number; message?: string } | undefined;
  return {
    status: err?.status || 500,
    message: err?.message || "Erro interno do servidor",
  };
}

export function createHttpError(status: number, message: string): Error & { status: number } {
  const error = new Error(message) as Error & { status: number };
  error.status = status;
  return error;
}

// ===== VALIDATION HELPERS =====
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.length >= 10 && cleaned.length <= 15;
};

export const isValidDate = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

export const sanitizePagination = (
  page: string | number | undefined,
  limit: string | number | undefined,
  maxLimit: number = 100,
): { page: number; limit: number } => {
  const parsedPage = Math.max(1, parseInt(String(page)) || 1);
  const parsedLimit = Math.min(
    maxLimit,
    Math.max(1, parseInt(String(limit)) || 50),
  );
  return { page: parsedPage, limit: parsedLimit };
};

// ===== TENANT ISOLATION HELPERS (IDOR Prevention) =====
// Resolvem uma referencia opcional e validam que ela pertence ao tenant. Novas
// rotas devem preferir `withTenantResource` (middleware/tenant-resource.ts).

export async function validateTenantUserReference(
  tenantId: string,
  userId?: string | null,
  resourceName = "Usuário",
): Promise<void> {
  if (!userId) return;
  const user = await storage.getUser(userId);
  await validateResourceTenant(user, tenantId, resourceName);
}

export async function validateLeadReference(tenantId: string, leadId?: string | null): Promise<void> {
  if (!leadId) return;
  const lead = await storage.getLead(leadId);
  await validateResourceTenant(lead, tenantId, "Lead");
}

export async function validatePropertyReference(tenantId: string, propertyId?: string | null): Promise<void> {
  if (!propertyId) return;
  const property = await storage.getProperty(propertyId);
  await validateResourceTenant(property, tenantId, "Imóvel");
}

export async function validateOwnerReference(tenantId: string, ownerId?: string | null): Promise<void> {
  if (!ownerId) return;
  const owner = await storage.getOwner(ownerId);
  await validateResourceTenant(owner, tenantId, "Locador");
}

export async function validateRenterReference(tenantId: string, renterId?: string | null): Promise<void> {
  if (!renterId) return;
  const renter = await storage.getRenter(renterId);
  await validateResourceTenant(renter, tenantId, "Inquilino");
}

export async function validateRentalContractReference(
  tenantId: string,
  rentalContractId?: string | null,
): Promise<void> {
  if (!rentalContractId) return;
  const contract = await storage.getRentalContract(rentalContractId);
  await validateResourceTenant(contract, tenantId, "Contrato de aluguel");
}

export async function validateFinanceCategoryReference(
  tenantId: string,
  categoryId?: string | null,
): Promise<void> {
  if (!categoryId) return;
  const category = await storage.getFinanceCategory(categoryId);
  await validateResourceTenant(category, tenantId, "Categoria financeira");
}

export async function validateLeadAssignment(tenantId: string, assignedTo?: string | null): Promise<void> {
  await validateTenantUserReference(tenantId, assignedTo, "Corretor");
}

export async function validateContractReferences(
  tenantId: string,
  contract: { propertyId?: string | null; leadId?: string | null },
): Promise<void> {
  await validatePropertyReference(tenantId, contract.propertyId);
  await validateLeadReference(tenantId, contract.leadId);
}

export async function validateRentalContractReferences(
  tenantId: string,
  contract: { propertyId?: string | null; ownerId?: string | null; renterId?: string | null },
): Promise<void> {
  await validatePropertyReference(tenantId, contract.propertyId);
  await validateOwnerReference(tenantId, contract.ownerId);
  await validateRenterReference(tenantId, contract.renterId);
}

export async function validatePropertySaleReferences(
  tenantId: string,
  sale: {
    propertyId?: string | null;
    buyerLeadId?: string | null;
    sellerId?: string | null;
    brokerId?: string | null;
  },
): Promise<void> {
  await validatePropertyReference(tenantId, sale.propertyId);
  await validateLeadReference(tenantId, sale.buyerLeadId);
  await validateOwnerReference(tenantId, sale.sellerId);
  await validateTenantUserReference(tenantId, sale.brokerId, "Corretor");
}

export async function validateFollowUpReferences(
  tenantId: string,
  followUp: { leadId?: string | null; assignedTo?: string | null },
): Promise<void> {
  await validateLeadReference(tenantId, followUp.leadId);
  await validateTenantUserReference(tenantId, followUp.assignedTo, "Responsável");
}

/**
 * Middlewares locais de registerRoutes que os modulos de dominio extraidos
 * precisam receber por injecao (definidos com closures sobre config de runtime).
 */
export interface RouteDeps {
  requireAuth: RequestHandler;
  requireSuperAdmin: RequestHandler;
  apiLimiter: RequestHandler;
  authLimiter: RequestHandler;
  publicLimiter: RequestHandler;
  adminLimiter: RequestHandler;
}
