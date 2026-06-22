/**
 * ACT-1 — Helper transacional com contexto multi-tenant (RLS).
 *
 * Garante que um conjunto de operacoes rode em UMA transacao, compartilhando a
 * mesma conexao e o mesmo contexto RLS (SET LOCAL app.tenant_id). Isso e a base
 * para mutacoes atomicas com locking explicito (INSERT ... ON CONFLICT, SELECT
 * ... FOR UPDATE) sem race entre check-and-write.
 *
 * Em PostgreSQL: `db.transaction()` adquire um client via pool.connect (patcheado
 * por installTenantRlsOnClient em db-rls.ts), que aplica o SET LOCAL logo apos o
 * BEGIN; todas as queries do callback herdam o contexto e a atomicidade.
 *
 * Em SQLite (dev/testes): better-sqlite3 e single-connection e statement-atomic, e
 * o driver drizzle nao suporta callback assincrono em .transaction(). Executamos o
 * callback com o `db` diretamente, dentro do contexto de tenant (sem RLS nativo,
 * que o SQLite nao possui). O contrato de atomicidade vale na pratica por ser
 * conexao unica; a garantia forte (FOR UPDATE concorrente) so existe em Postgres.
 */
import { db, isSqlite } from "./db";
import { runWithTenantRlsContext } from "./db-rls";

export type TxRunner = typeof db;

export async function withTenantTransaction<T>(
  tenantId: string,
  fn: (tx: TxRunner) => Promise<T>,
): Promise<T> {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error("tenantId e obrigatorio para withTenantTransaction");
  }

  if (isSqlite) {
    return runWithTenantRlsContext(tenantId, () => fn(db));
  }

  return runWithTenantRlsContext(tenantId, () =>
    db.transaction((tx: TxRunner) => fn(tx)),
  );
}
