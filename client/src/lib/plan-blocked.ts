// Detecção de feature bloqueada por plano (gate do checkFeatureAccess no
// servidor — server/middleware/plan-limits.ts). Único lugar que conhece o
// contrato do 403 de plano; as páginas gateadas (AVM, ISA, Marketing IA)
// importam daqui em vez de duplicar a heurística.

export class PlanBlockedError extends Error {
  constructor() {
    super("PLAN_BLOCKED");
    this.name = "PlanBlockedError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonSafely(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getPayloadText(payload: unknown): string {
  if (!isRecord(payload)) return "";
  return [payload.error, payload.message, payload.code]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function isPlanBlockedResponse(res: Response, payload: unknown): boolean {
  if (res.status !== 403) return false;
  // Sinal estável do servidor (feature fora do plano). O 403 de assinatura
  // suspensa ("Subscription not active") NÃO carrega upgradeRequired e não
  // deve virar tela de upgrade — é problema de cobrança, não de plano.
  if (isRecord(payload) && payload.upgradeRequired === true) return true;

  const text = getPayloadText(payload);
  return (
    text.includes("feature not available") ||
    text.includes("upgrade") ||
    text.includes("plano")
  );
}

export function isPlanBlockedError(error: unknown): boolean {
  return error instanceof PlanBlockedError;
}

/**
 * fetch JSON de rota gateada por plano: lança PlanBlockedError no 403 de
 * upgrade e, em outros erros, preserva a mensagem do servidor quando houver.
 */
export async function fetchPlanGatedJson<T>(
  url: string,
  options?: RequestInit,
  fallbackMessage?: string,
): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  const payload = await readJsonSafely(res);

  if (isPlanBlockedResponse(res, payload)) {
    throw new PlanBlockedError();
  }

  if (!res.ok) {
    const serverMessage = isRecord(payload)
      ? [payload.message, payload.error].find(
          (value): value is string => typeof value === "string" && value.length > 0,
        )
      : undefined;
    throw new Error(serverMessage || fallbackMessage || `HTTP ${res.status}`);
  }
  return payload as T;
}
