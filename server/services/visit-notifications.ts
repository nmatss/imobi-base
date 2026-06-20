/**
 * Visit notifications: confirmation / reschedule links + reminder dispatch.
 *
 * Generates a per-visit `confirmationToken` (crypto.randomBytes hex) and the public
 * links the lead uses to confirm or reschedule:
 *   - /v/confirm/:token
 *   - /v/reschedule/:token
 *
 * Messages are sent through the existing async queues so the request path never
 * blocks on a third-party API:
 *   - WhatsApp via `messageQueue.queueMessage` (server/integrations/whatsapp/message-queue.ts)
 *   - Email   via `getEmailService().send({ queue: true })` (degrades to inline send
 *     when no Redis queue is configured; never throws if the service is unconfigured)
 *
 * The token is persisted onto the visit row via `storage.updateVisit` (confirmationToken
 * is a real column on `visits`). No shared storage interface is modified.
 */

import crypto from "crypto";
import { storage } from "../storage";
import { messageQueue } from "../integrations/whatsapp/message-queue";
import { log } from "../utils/log";

// Storage-derived row types (pg-vs-sqlite agnostic). The `@shared/schema` row types
// type timestamps as Date, but the active storage layer returns ISO strings, so we
// anchor on what storage actually returns to keep the file type-clean.
type Visit = NonNullable<Awaited<ReturnType<typeof storage.getVisit>>>;
type Lead = NonNullable<Awaited<ReturnType<typeof storage.getLead>>>;
type Property = NonNullable<Awaited<ReturnType<typeof storage.getProperty>>>;

const APP_URL = (process.env.APP_URL || process.env.VITE_APP_URL || "http://localhost:5000").replace(/\/$/, "");

export function generateConfirmationToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function buildConfirmUrl(token: string): string {
  return `${APP_URL}/v/confirm/${token}`;
}

export function buildRescheduleUrl(token: string): string {
  return `${APP_URL}/v/reschedule/${token}`;
}

function formatScheduledFor(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export interface VisitNotificationContext {
  visit: Visit;
  lead?: Lead | null;
  property?: Property | null;
  confirmUrl: string;
  rescheduleUrl: string;
  scheduledForLabel: string;
}

function buildWhatsAppBody(ctx: VisitNotificationContext): string {
  const propertyLabel = (ctx.property as any)?.title || (ctx.property as any)?.address || "o imóvel";
  return [
    `Olá${ctx.lead?.name ? ` ${ctx.lead.name}` : ""}! Sua visita a ${propertyLabel} está agendada para ${ctx.scheduledForLabel}.`,
    "",
    `Confirmar: ${ctx.confirmUrl}`,
    `Reagendar: ${ctx.rescheduleUrl}`,
  ].join("\n");
}

function buildEmailHtml(ctx: VisitNotificationContext): string {
  const propertyLabel = (ctx.property as any)?.title || (ctx.property as any)?.address || "o imóvel";
  return `
    <div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2937">
      <p>Olá${ctx.lead?.name ? ` ${ctx.lead.name}` : ""},</p>
      <p>Sua visita a <strong>${propertyLabel}</strong> está agendada para <strong>${ctx.scheduledForLabel}</strong>.</p>
      <p>
        <a href="${ctx.confirmUrl}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;margin-right:8px">Confirmar visita</a>
        <a href="${ctx.rescheduleUrl}" style="display:inline-block;padding:10px 18px;background:#e5e7eb;color:#111827;border-radius:8px;text-decoration:none">Reagendar</a>
      </p>
      <p style="font-size:13px;color:#6b7280">Se os botões não funcionarem, copie e cole os links:<br/>
        Confirmar: ${ctx.confirmUrl}<br/>Reagendar: ${ctx.rescheduleUrl}</p>
    </div>`;
}

/**
 * Ensures the visit has a confirmation token, persisting a freshly generated one
 * when missing. Returns the token in use.
 */
export async function ensureConfirmationToken(visit: Visit): Promise<string> {
  const existing = (visit as any).confirmationToken as string | null | undefined;
  if (existing) return existing;
  const token = generateConfirmationToken();
  await storage.updateVisit(visit.id, { confirmationToken: token } as any);
  return token;
}

async function loadContext(visit: Visit): Promise<VisitNotificationContext> {
  const token = await ensureConfirmationToken(visit);
  const [lead, property] = await Promise.all([
    visit.leadId ? storage.getLead(visit.leadId) : Promise.resolve(undefined),
    storage.getProperty(visit.propertyId),
  ]);
  return {
    visit,
    lead: lead ?? null,
    property: property ?? null,
    confirmUrl: buildConfirmUrl(token),
    rescheduleUrl: buildRescheduleUrl(token),
    scheduledForLabel: formatScheduledFor((visit as any).scheduledFor),
  };
}

async function dispatchWhatsApp(ctx: VisitNotificationContext): Promise<boolean> {
  const phone = ctx.lead?.phone;
  if (!phone) return false;
  try {
    await messageQueue.queueMessage({
      tenantId: ctx.visit.tenantId,
      phoneNumber: phone,
      messageType: "text",
      content: buildWhatsAppBody(ctx),
      priority: 8,
      metadata: { kind: "visit-notification", visitId: ctx.visit.id },
    });
    return true;
  } catch (error: any) {
    log(`visit-notifications: WhatsApp queue failed for visit ${ctx.visit.id}: ${error?.message}`, "visits");
    return false;
  }
}

async function dispatchEmail(ctx: VisitNotificationContext, subject: string): Promise<boolean> {
  const email = ctx.lead?.email;
  if (!email) return false;
  try {
    // Lazy import keeps this module loadable even if email isn't configured.
    const { getEmailService } = await import("../email/email-service");
    let service;
    try {
      service = getEmailService();
    } catch {
      log(`visit-notifications: email service not configured, skipping email for visit ${ctx.visit.id}`, "visits");
      return false;
    }
    const result = await service.send({
      to: email,
      subject,
      html: buildEmailHtml(ctx),
      queue: true,
      priority: 8,
    });
    return result.success;
  } catch (error: any) {
    log(`visit-notifications: email send failed for visit ${ctx.visit.id}: ${error?.message}`, "visits");
    return false;
  }
}

export interface VisitNotificationResult {
  token: string;
  confirmUrl: string;
  rescheduleUrl: string;
  whatsappQueued: boolean;
  emailQueued: boolean;
}

/**
 * Sends the initial confirmation request (WhatsApp + email) for a visit.
 * Safe to call on a freshly created visit; idempotent on the token.
 */
export async function sendVisitConfirmationRequest(visit: Visit): Promise<VisitNotificationResult> {
  const ctx = await loadContext(visit);
  const [whatsappQueued, emailQueued] = await Promise.all([
    dispatchWhatsApp(ctx),
    dispatchEmail(ctx, "Confirme sua visita"),
  ]);
  return {
    token: ctx.confirmUrl.split("/").pop() || "",
    confirmUrl: ctx.confirmUrl,
    rescheduleUrl: ctx.rescheduleUrl,
    whatsappQueued,
    emailQueued,
  };
}

/**
 * Sends a reminder (WhatsApp + email) for an upcoming visit and marks it as sent.
 * Used by the visit-reminders cron job (see registerAgendaCrmRoutes /
 * integrationInstructions).
 */
export async function sendVisitReminder(visit: Visit): Promise<VisitNotificationResult> {
  const ctx = await loadContext(visit);
  const [whatsappQueued, emailQueued] = await Promise.all([
    dispatchWhatsApp(ctx),
    dispatchEmail(ctx, "Lembrete: sua visita está chegando"),
  ]);
  await storage.markVisitReminderSent(visit.id);
  return {
    token: ctx.confirmUrl.split("/").pop() || "",
    confirmUrl: ctx.confirmUrl,
    rescheduleUrl: ctx.rescheduleUrl,
    whatsappQueued,
    emailQueued,
  };
}

/**
 * Processes the reminder window: for every upcoming visit without a reminder yet,
 * dispatches a reminder. Returns the count processed.
 */
export async function processVisitReminders(
  windowStart: Date,
  windowEnd: Date,
): Promise<{ processed: number }> {
  const visits = await storage.getUpcomingVisitsForReminder(windowStart, windowEnd);
  let processed = 0;
  for (const visit of visits) {
    try {
      await sendVisitReminder(visit);
      processed += 1;
    } catch (error: any) {
      log(`visit-notifications: reminder failed for visit ${visit.id}: ${error?.message}`, "visits");
    }
  }
  return { processed };
}
