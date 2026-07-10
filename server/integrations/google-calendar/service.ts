/**
 * Serviço de sincronização Google Calendar por corretor.
 *
 * Modelo: cada corretor (users.id) conecta a própria conta Google em
 * Configurações (token com scope calendar.events, separado do login SSO).
 * Visitas atribuídas a ele (visits.assignedTo) são espelhadas como eventos no
 * Google Agenda dele, com link Meet para visitas virtuais.
 *
 * IMPORTANTE: as funções assumem que já existe contexto RLS de tenant ativo
 * (requireAuth nas rotas autenticadas; runWithTenantRlsContext no callback).
 */

import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "../../db";
import {
  userCalendarConnections,
  visits,
  properties,
  leads,
  type UserCalendarConnection,
} from "@shared/schema-sqlite";
import { decryptSecret, encryptSecret } from "../../security/token-encryption";
import {
  deleteEvent,
  insertEvent,
  patchEvent,
  refreshAccessToken,
  type GoogleEventInput,
} from "./client";

const VISIT_SLOT_MINUTES = 60;
const VISIT_TIMEZONE = "America/Sao_Paulo";

function nowIso(): string {
  return new Date().toISOString();
}

export async function getConnectionForUser(
  userId: string,
): Promise<UserCalendarConnection | undefined> {
  const rows = await db
    .select()
    .from(userCalendarConnections)
    .where(
      and(
        eq(userCalendarConnections.userId, userId),
        eq(userCalendarConnections.provider, "google"),
      ),
    )
    .limit(1);
  return rows[0];
}

export async function upsertGoogleConnection(input: {
  tenantId: string;
  userId: string;
  googleEmail?: string;
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds: number;
  scope?: string;
}): Promise<void> {
  const existing = await getConnectionForUser(input.userId);
  const tokenExpiresAt = new Date(Date.now() + input.expiresInSeconds * 1000).toISOString();

  const base = {
    googleEmail: input.googleEmail ?? null,
    accessToken: encryptSecret(input.accessToken),
    tokenExpiresAt,
    scope: input.scope ?? null,
    syncEnabled: true,
    lastError: null,
    updatedAt: nowIso(),
  };

  if (existing) {
    // Só sobrescreve o refresh token se o Google enviou um novo.
    const refreshPatch = input.refreshToken
      ? { refreshToken: encryptSecret(input.refreshToken) }
      : {};
    await db
      .update(userCalendarConnections)
      .set({ ...base, ...refreshPatch })
      .where(eq(userCalendarConnections.id, existing.id));
  } else {
    await db.insert(userCalendarConnections).values({
      id: nanoid(),
      tenantId: input.tenantId,
      userId: input.userId,
      provider: "google",
      calendarId: "primary",
      refreshToken: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      ...base,
    });
  }
}

export async function disconnectGoogle(userId: string): Promise<void> {
  await db
    .delete(userCalendarConnections)
    .where(
      and(
        eq(userCalendarConnections.userId, userId),
        eq(userCalendarConnections.provider, "google"),
      ),
    );
}

export async function setSyncEnabled(userId: string, enabled: boolean): Promise<void> {
  await db
    .update(userCalendarConnections)
    .set({ syncEnabled: enabled, updatedAt: nowIso() })
    .where(
      and(
        eq(userCalendarConnections.userId, userId),
        eq(userCalendarConnections.provider, "google"),
      ),
    );
}

/** Retorna um access token válido, renovando via refresh token quando expirado. */
async function getValidAccessToken(
  conn: UserCalendarConnection,
): Promise<string | null> {
  const access = decryptSecret(conn.accessToken);
  const expMs = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : 0;
  const stillValid = access && expMs > Date.now() + 60_000; // margem de 60s
  if (stillValid) return access;

  const refresh = decryptSecret(conn.refreshToken);
  if (!refresh) return access; // sem refresh: tenta o que tem (pode falhar)

  const refreshed = await refreshAccessToken(refresh);
  await db
    .update(userCalendarConnections)
    .set({
      accessToken: encryptSecret(refreshed.accessToken),
      tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      updatedAt: nowIso(),
    })
    .where(eq(userCalendarConnections.id, conn.id));
  return refreshed.accessToken;
}

function isVirtual(notes: string | null | undefined): boolean {
  return !!notes && /\[TYPE:virtual\]/i.test(notes);
}

function cleanNotes(notes: string | null | undefined): string {
  return (notes || "").replace(/\[[A-Z_]+:[^\]]*\]/g, "").trim();
}

async function buildEventInput(visit: typeof visits.$inferSelect): Promise<GoogleEventInput> {
  const [property] = visit.propertyId
    ? await db.select().from(properties).where(eq(properties.id, visit.propertyId)).limit(1)
    : [];
  const [lead] = visit.leadId
    ? await db.select().from(leads).where(eq(leads.id, visit.leadId)).limit(1)
    : [];

  const start = new Date(visit.scheduledFor);
  const end = new Date(start.getTime() + VISIT_SLOT_MINUTES * 60 * 1000);
  const virtual = isVirtual(visit.notes);

  const propertyLabel = property?.title || "Imóvel";
  const locationParts = [property?.address, property?.city].filter(Boolean);

  const descriptionLines = [
    lead?.name ? `Cliente: ${lead.name}` : null,
    lead?.phone ? `Telefone: ${lead.phone}` : null,
    cleanNotes(visit.notes) || null,
    "Agendado via ImobiBase.",
  ].filter(Boolean) as string[];

  return {
    summary: `Visita: ${propertyLabel}${lead?.name ? ` — ${lead.name}` : ""}`,
    description: descriptionLines.join("\n"),
    location: virtual ? undefined : locationParts.join(", ") || undefined,
    startDateTime: start.toISOString(),
    endDateTime: end.toISOString(),
    timeZone: VISIT_TIMEZONE,
    attendees: lead?.email ? [{ email: lead.email, displayName: lead.name || undefined }] : undefined,
    createMeet: virtual,
  };
}

/**
 * Sincroniza uma visita com o Google Agenda do corretor responsável.
 * Best-effort: nunca lança; grava o estado de sync na própria visita.
 */
export async function syncVisitToGoogle(visitId: string): Promise<void> {
  const [visit] = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
  if (!visit) return;

  const markState = (patch: Partial<typeof visits.$inferSelect>) =>
    db.update(visits).set(patch).where(eq(visits.id, visit.id));

  try {
    // Sem corretor atribuído, ou visita cancelada → remove do Google se existir.
    if (!visit.assignedTo || visit.status === "cancelled") {
      if (visit.googleCalendarEventId) {
        await removeVisitFromGoogle(visit);
      }
      await markState({ googleSyncState: "skipped", lastSyncedAt: nowIso(), googleSyncError: null });
      return;
    }

    const conn = await getConnectionForUser(visit.assignedTo);
    if (!conn || !conn.syncEnabled) {
      await markState({ googleSyncState: "skipped", lastSyncedAt: nowIso(), googleSyncError: null });
      return;
    }

    const accessToken = await getValidAccessToken(conn);
    if (!accessToken) {
      await markState({ googleSyncState: "failed", googleSyncError: "Sem access token válido", lastSyncedAt: nowIso() });
      return;
    }

    const input = await buildEventInput(visit);
    const result = visit.googleCalendarEventId
      ? await patchEvent(accessToken, conn.calendarId, visit.googleCalendarEventId, input)
      : await insertEvent(accessToken, conn.calendarId, input);

    await markState({
      googleCalendarEventId: result.eventId,
      googleMeetUrl: result.meetUrl ?? visit.googleMeetUrl ?? null,
      googleSyncState: "synced",
      googleSyncError: null,
      lastSyncedAt: nowIso(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markState({ googleSyncState: "failed", googleSyncError: message.slice(0, 480), lastSyncedAt: nowIso() }).catch(() => {});
    console.error(`[google-calendar] sync da visita ${visitId} falhou:`, message);
  }
}

/** Remove o evento do Google (best-effort). */
export async function removeVisitFromGoogle(
  visit: typeof visits.$inferSelect,
): Promise<void> {
  try {
    if (!visit.googleCalendarEventId || !visit.assignedTo) return;
    const conn = await getConnectionForUser(visit.assignedTo);
    if (!conn) return;
    const accessToken = await getValidAccessToken(conn);
    if (!accessToken) return;
    await deleteEvent(accessToken, conn.calendarId, visit.googleCalendarEventId);
  } catch (err) {
    console.error(`[google-calendar] remoção do evento da visita ${visit.id} falhou:`, err);
  }
}
