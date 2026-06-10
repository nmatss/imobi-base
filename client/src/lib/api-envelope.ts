// Normalização de respostas da API.
// Rotas paginadas retornam envelope ({ data, pagination } ou { success, data, meta })
// enquanto rotas legadas retornam o corpo cru. Estes helpers são o ÚNICO lugar
// que conhece esse contrato — não duplicar unwrap local em páginas/contexts.

export function unwrapList<T = unknown>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (json && typeof json === "object" && Array.isArray((json as { data?: unknown }).data)) {
    return (json as { data: T[] }).data;
  }
  return [];
}

export function unwrapData<T = unknown>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}

/** Total informado pelo envelope paginado, se presente. */
export function getPaginationTotal(json: unknown): number | undefined {
  if (!json || typeof json !== "object") return undefined;
  const envelope = json as { pagination?: { total?: unknown }; meta?: { total?: unknown } };
  const total = envelope.pagination?.total ?? envelope.meta?.total;
  return typeof total === "number" ? total : undefined;
}
