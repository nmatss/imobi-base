/**
 * Deteccao de erros do banco agnostica de driver (PostgreSQL e better-sqlite3).
 * Usado para resolver corridas de escrita de forma deterministica: o indice unico
 * do banco e a fonte de verdade; a aplicacao trata a violacao como "ja existe".
 */

/** True quando o erro e uma violacao de constraint UNIQUE (PG 23505 ou SQLite). */
export function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybe = error as { code?: string; message?: string };
  return (
    maybe.code === "23505" || // PostgreSQL unique_violation
    maybe.code === "SQLITE_CONSTRAINT_UNIQUE" ||
    maybe.code === "SQLITE_CONSTRAINT" ||
    /unique|duplicate/i.test(maybe.message ?? "")
  );
}
