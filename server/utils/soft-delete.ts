/* eslint-disable @typescript-eslint/no-explicit-any -- helpers precisam aceitar tabelas Drizzle genericas (SQLite ou Postgres) */
/**
 * Soft Delete Utilities
 * Helpers for filtering and performing soft deletes with Drizzle ORM.
 */

import { isNull } from "drizzle-orm";
import { db, isSqlite } from "../db";

/**
 * Returns a Drizzle condition that filters out soft-deleted rows.
 * Usage: db.select().from(table).where(softDeleteFilter(table))
 */
export function softDeleteFilter(table: { deletedAt: any }) {
  return isNull(table.deletedAt);
}

/**
 * Versao segura para schemas duais (SQLite + PostgreSQL).
 * SQLite nao tem coluna deletedAt; PostgreSQL tem. Retorna undefined em
 * SQLite (para que `and(..., undefined)` simplesmente ignore), e
 * `isNull(deletedAt)` em PG.
 *
 * Uso: where(and(eq(table.tenantId, tid), activeRowsFilter(table)))
 */
export function activeRowsFilter(table: any) {
  if (isSqlite) return undefined;
  if (!table || typeof table !== "object") return undefined;
  if (!("deletedAt" in table)) return undefined;
  return isNull(table.deletedAt);
}

/**
 * Soft-deletes a record by setting deletedAt to the current timestamp.
 * Usage: await softDelete(schema.properties, id)
 */
export async function softDelete(table: any, id: string) {
  const { eq } = await import("drizzle-orm");
  return db
    .update(table)
    .set({ deletedAt: new Date() })
    .where(eq(table.id, id));
}

/**
 * Permanently deletes records that were soft-deleted more than `days` ago.
 */
export async function purgeDeletedRecords(table: any, days: number = 90) {
  const { lt, and, isNotNull } = await import("drizzle-orm");
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .delete(table)
    .where(and(isNotNull(table.deletedAt), lt(table.deletedAt, cutoff)));
}
