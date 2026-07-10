import crypto from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, isSqlite, schema } from "../db";
import { isUniqueViolation } from "../utils/db-errors";

export type WebhookProvider = "stripe" | "mercadopago" | "clicksign" | "whatsapp" | "twilio";
export type WebhookEventStatus = "processing" | "processed" | "failed";

export interface WebhookReservation {
  reserved: boolean;
  duplicate: boolean;
  status?: WebhookEventStatus;
}

export interface ReserveWebhookEventInput {
  provider: WebhookProvider;
  eventId: string;
  eventType?: string;
  tenantId?: string | null;
  payloadDigest?: string;
  signatureDigest?: string;
  staleAfterMs?: number;
}

const DEFAULT_STALE_AFTER_MS = 20 * 60 * 1000;

export function createWebhookPayloadDigest(payload: unknown): string {
  let buffer: Buffer;
  if (Buffer.isBuffer(payload)) {
    buffer = payload;
  } else if (typeof payload === "string") {
    buffer = Buffer.from(payload);
  } else {
    buffer = Buffer.from(JSON.stringify(payload ?? ""));
  }

  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export async function reserveWebhookEvent(
  input: ReserveWebhookEventInput,
): Promise<WebhookReservation> {
  const existing = await findWebhookEvent(input.provider, input.eventId);
  if (existing) {
    return reserveExistingEvent(input, existing);
  }

  try {
    await db.insert(schema.webhookEvents).values({
      id: crypto.randomUUID(),
      tenantId: input.tenantId ?? null,
      provider: input.provider,
      eventId: input.eventId,
      eventType: input.eventType,
      status: "processing",
      attempts: 1,
      payloadDigest: input.payloadDigest,
      signatureDigest: input.signatureDigest,
      receivedAt: nowForDatabase(),
      updatedAt: nowForDatabase(),
    });

    return { reserved: true, duplicate: false, status: "processing" };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const raced = await findWebhookEvent(input.provider, input.eventId);
    if (!raced) throw error;
    return reserveExistingEvent(input, raced);
  }
}

export async function markWebhookEventProcessed(input: {
  provider: WebhookProvider;
  eventId: string;
  tenantId?: string | null;
}): Promise<void> {
  await updateWebhookEvent(input.provider, input.eventId, {
    tenantId: input.tenantId ?? undefined,
    status: "processed",
    processedAt: nowForDatabase(),
    failedAt: null,
    lastError: null,
    updatedAt: nowForDatabase(),
  });
}

export async function markWebhookEventFailed(input: {
  provider: WebhookProvider;
  eventId: string;
  tenantId?: string | null;
  error: unknown;
}): Promise<void> {
  await updateWebhookEvent(input.provider, input.eventId, {
    tenantId: input.tenantId ?? undefined,
    status: "failed",
    failedAt: nowForDatabase(),
    lastError: input.error instanceof Error ? input.error.message : String(input.error),
    updatedAt: nowForDatabase(),
  });
}

async function reserveExistingEvent(
  input: ReserveWebhookEventInput,
  existing: { status: string; updatedAt?: Date | string | null },
): Promise<WebhookReservation> {
  const status = normalizeStatus(existing.status);
  const staleAfterMs = input.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  const staleProcessing =
    status === "processing" &&
    existing.updatedAt &&
    Date.now() - new Date(existing.updatedAt).getTime() > staleAfterMs;

  if (status === "failed" || staleProcessing) {
    await updateWebhookEvent(input.provider, input.eventId, {
      tenantId: input.tenantId ?? undefined,
      eventType: input.eventType,
      status: "processing",
      attempts: sql`${schema.webhookEvents.attempts} + 1`,
      payloadDigest: input.payloadDigest,
      signatureDigest: input.signatureDigest,
      lastError: null,
      failedAt: null,
      updatedAt: nowForDatabase(),
    });

    return { reserved: true, duplicate: false, status: "processing" };
  }

  return { reserved: false, duplicate: true, status };
}

async function findWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
): Promise<{ status: string; updatedAt?: Date | string | null } | null> {
  const rows = await db
    .select({
      status: schema.webhookEvents.status,
      updatedAt: schema.webhookEvents.updatedAt,
    })
    .from(schema.webhookEvents)
    .where(
      and(
        eq(schema.webhookEvents.provider, provider),
        eq(schema.webhookEvents.eventId, eventId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

async function updateWebhookEvent(
  provider: WebhookProvider,
  eventId: string,
  values: Record<string, unknown>,
): Promise<void> {
  const cleanValues = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );

  await db
    .update(schema.webhookEvents)
    .set(cleanValues)
    .where(
      and(
        eq(schema.webhookEvents.provider, provider),
        eq(schema.webhookEvents.eventId, eventId),
      ),
    );
}

function normalizeStatus(status: string): WebhookEventStatus {
  if (status === "processed" || status === "failed" || status === "processing") {
    return status;
  }
  return "processing";
}

function nowForDatabase(): Date | string {
  return isSqlite ? new Date().toISOString() : new Date();
}
