import { describe, it, expect } from "vitest";
import {
  parsePaginationParams,
  buildPaginationMeta,
  createPaginatedResponse,
  getPaginationOptions,
  encodeCursor,
  decodeCursor,
  buildCursorPaginationMeta,
  getSmartCount,
  paginate,
  createPaginator,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
} from "../../server/utils/pagination";

/**
 * Testes comportamentais para server/utils/pagination.ts.
 *
 * Foco: parsing/validação de paginação (page/limit/offset), construção de
 * metadados (totalPages/hasNext/hasPrev), cursor base64 (encode/decode) e os
 * helpers de orquestração (paginate / getSmartCount). Funções que dependem do
 * banco recebem o `db`/fns por injeção, então são testadas com mocks puros.
 */

describe("constants", () => {
  it("expõe defaults e limites coerentes", () => {
    expect(DEFAULT_PAGE).toBe(1);
    expect(DEFAULT_LIMIT).toBe(20);
    expect(MAX_LIMIT).toBe(100);
    expect(MIN_LIMIT).toBe(1);
    expect(MIN_LIMIT).toBeLessThan(DEFAULT_LIMIT);
    expect(DEFAULT_LIMIT).toBeLessThan(MAX_LIMIT);
  });
});

describe("parsePaginationParams", () => {
  it("usa defaults quando params vazios", () => {
    expect(parsePaginationParams({})).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    });
  });

  it("calcula offset = (page - 1) * limit", () => {
    expect(parsePaginationParams({ page: 3, limit: 10 })).toEqual({
      page: 3,
      limit: 10,
      offset: 20,
    });
    expect(parsePaginationParams({ page: 1, limit: 50 }).offset).toBe(0);
    expect(parsePaginationParams({ page: 5, limit: 25 }).offset).toBe(100);
  });

  it("aceita strings numéricas vindas de query string", () => {
    // @ts-expect-error - req.query entrega strings; o módulo faz parseInt
    expect(parsePaginationParams({ page: "4", limit: "15" })).toEqual({
      page: 4,
      limit: 15,
      offset: 45,
    });
  });

  it("clampa limit acima de MAX_LIMIT para MAX_LIMIT", () => {
    const r = parsePaginationParams({ page: 1, limit: 5000 });
    expect(r.limit).toBe(MAX_LIMIT);
    expect(r.offset).toBe(0);
  });

  it("limit exatamente em MAX_LIMIT é preservado (boundary)", () => {
    expect(parsePaginationParams({ limit: MAX_LIMIT }).limit).toBe(MAX_LIMIT);
  });

  it("limit zero/negativo cai para DEFAULT_LIMIT", () => {
    expect(parsePaginationParams({ limit: 0 }).limit).toBe(DEFAULT_LIMIT);
    expect(parsePaginationParams({ limit: -10 }).limit).toBe(DEFAULT_LIMIT);
  });

  it("limit fracionário < 1 cai para default; >= 1 trunca via parseInt", () => {
    // parseInt(String(0.5)) === 0 -> < MIN_LIMIT -> default
    expect(parsePaginationParams({ limit: 0.5 }).limit).toBe(DEFAULT_LIMIT);
    // parseInt(String(2.9)) === 2
    expect(parsePaginationParams({ limit: 2.9 }).limit).toBe(2);
  });

  it("page zero/negativa cai para DEFAULT_PAGE (offset 0)", () => {
    expect(parsePaginationParams({ page: 0, limit: 10 })).toEqual({
      page: 1,
      limit: 10,
      offset: 0,
    });
    expect(parsePaginationParams({ page: -3, limit: 10 }).page).toBe(1);
  });

  it("page/limit não-numéricos (NaN) caem para defaults", () => {
    // @ts-expect-error - simula query inválida
    const r = parsePaginationParams({ page: "abc", limit: "xyz" });
    expect(r).toEqual({ page: DEFAULT_PAGE, limit: DEFAULT_LIMIT, offset: 0 });
  });

  it("limit é validado independentemente do page (limit alto + page alta)", () => {
    const r = parsePaginationParams({ page: 2, limit: 1000 });
    expect(r.limit).toBe(MAX_LIMIT);
    // offset usa o limit JÁ clampado
    expect(r.offset).toBe((2 - 1) * MAX_LIMIT);
  });
});

describe("getPaginationOptions", () => {
  it("retorna apenas { offset, limit } derivados de parsePaginationParams", () => {
    expect(getPaginationOptions({ page: 3, limit: 10 })).toEqual({
      offset: 20,
      limit: 10,
    });
  });

  it("aplica clamp de MAX_LIMIT também aqui", () => {
    expect(getPaginationOptions({ limit: 99999 }).limit).toBe(MAX_LIMIT);
  });
});

describe("buildPaginationMeta", () => {
  it("calcula totalPages com ceil e flags has*", () => {
    const meta = buildPaginationMeta(45, 1, 20);
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3, // ceil(45/20)
      hasNext: true,
      hasPrev: false,
    });
  });

  it("hasPrev verdadeiro em páginas internas", () => {
    const meta = buildPaginationMeta(45, 2, 20);
    expect(meta.hasPrev).toBe(true);
    expect(meta.hasNext).toBe(true);
  });

  it("última página: hasNext false, hasPrev true", () => {
    const meta = buildPaginationMeta(45, 3, 20);
    expect(meta.totalPages).toBe(3);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it("total zero => totalPages 0 e sem navegação", () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it("total <= limit cabe em uma única página", () => {
    const meta = buildPaginationMeta(5, 1, 20);
    expect(meta.totalPages).toBe(1);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });

  it("total múltiplo exato do limit não cria página extra", () => {
    const meta = buildPaginationMeta(40, 2, 20);
    expect(meta.totalPages).toBe(2);
    expect(meta.hasNext).toBe(false);
  });
});

describe("createPaginatedResponse", () => {
  it("embrulha data + metadados de paginação", () => {
    const data = [{ id: "a" }, { id: "b" }];
    const res = createPaginatedResponse(data, 2, 1, 20);
    expect(res.data).toBe(data);
    expect(res.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
  });
});

describe("encodeCursor / decodeCursor (base64 round-trip)", () => {
  it("decode(encode(id)) === id", () => {
    const id = "user-123-abc";
    const cursor = encodeCursor(id);
    expect(cursor).not.toBe(id); // foi codificado
    expect(decodeCursor(cursor)).toBe(id);
  });

  it("encode produz base64 válido", () => {
    const cursor = encodeCursor("hello");
    expect(cursor).toBe(Buffer.from("hello").toString("base64"));
    expect(cursor).toBe("aGVsbG8=");
  });

  it("round-trip preserva UUIDs e caracteres especiais", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(decodeCursor(encodeCursor(uuid))).toBe(uuid);
    const weird = "id:ção/+=&";
    expect(decodeCursor(encodeCursor(weird))).toBe(weird);
  });

  it("decode de string arbitrária não lança (Buffer é tolerante)", () => {
    // Buffer.from não lança para base64 inválido; só ignora bytes inválidos.
    expect(() => decodeCursor("!!!not-base64!!!")).not.toThrow();
    expect(typeof decodeCursor("!!!not-base64!!!")).toBe("string");
  });
});

describe("buildCursorPaginationMeta", () => {
  it("hasMore=true gera nextCursor do último item e prevCursor do primeiro", () => {
    const data = [{ id: "first" }, { id: "mid" }, { id: "last" }];
    const meta = buildCursorPaginationMeta(data, 3, true);
    expect(meta.hasNext).toBe(true);
    expect(meta.hasPrev).toBe(true);
    expect(meta.nextCursor).toBe(encodeCursor("last"));
    expect(meta.prevCursor).toBe(encodeCursor("first"));
    expect(decodeCursor(meta.nextCursor!)).toBe("last");
    expect(decodeCursor(meta.prevCursor!)).toBe("first");
  });

  it("hasMore=false => sem nextCursor, mas mantém prevCursor", () => {
    const data = [{ id: "x" }, { id: "y" }];
    const meta = buildCursorPaginationMeta(data, 5, false);
    expect(meta.hasNext).toBe(false);
    expect(meta.nextCursor).toBeUndefined();
    expect(meta.prevCursor).toBe(encodeCursor("x"));
    expect(meta.hasPrev).toBe(true);
  });

  it("data vazia => sem cursors e hasPrev false", () => {
    const meta = buildCursorPaginationMeta([], 10, false);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
    expect(meta.nextCursor).toBeUndefined();
    expect(meta.prevCursor).toBeUndefined();
  });

  it("hasMore=true mas data vazia não inventa nextCursor", () => {
    const meta = buildCursorPaginationMeta([], 10, true);
    expect(meta.hasNext).toBe(true);
    expect(meta.nextCursor).toBeUndefined();
    expect(meta.prevCursor).toBeUndefined();
  });
});

describe("getSmartCount", () => {
  it("usa contagem exata e marca isEstimate=false", async () => {
    const exactFn = async () => 42;
    const result = await getSmartCount(exactFn, "properties");
    expect(result).toEqual({ count: 42, isEstimate: false });
  });

  it("chama a função de contagem exata exatamente uma vez", async () => {
    let calls = 0;
    const exactFn = async () => {
      calls += 1;
      return 7;
    };
    await getSmartCount(exactFn, "leads", 10000);
    expect(calls).toBe(1);
  });

  it("propaga o valor retornado mesmo acima do threshold", async () => {
    const result = await getSmartCount(async () => 999999, "leads", 100);
    expect(result.count).toBe(999999);
    expect(result.isEstimate).toBe(false);
  });
});

describe("paginate (orquestrador com injeção de query/count)", () => {
  it("combina dados, total e metadados aplicando clamp/offset", async () => {
    const allRows = Array.from({ length: 35 }, (_, i) => ({ id: `r${i}` }));
    const queryFn = async (limit: number, offset: number) =>
      allRows.slice(offset, offset + limit);
    const countFn = async () => allRows.length;

    const res = await paginate(queryFn, countFn, { page: 2, limit: 10 });

    expect(res.data).toHaveLength(10);
    expect(res.data[0].id).toBe("r10"); // offset = (2-1)*10
    expect(res.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 35,
      totalPages: 4,
      hasNext: true,
      hasPrev: true,
    });
  });

  it("passa limit/offset JÁ validados para queryFn", async () => {
    let receivedLimit = -1;
    let receivedOffset = -1;
    const queryFn = async (limit: number, offset: number) => {
      receivedLimit = limit;
      receivedOffset = offset;
      return [];
    };
    const countFn = async () => 0;

    await paginate(queryFn, countFn, { page: 3, limit: 10000 });

    expect(receivedLimit).toBe(MAX_LIMIT); // limit foi clampado
    expect(receivedOffset).toBe((3 - 1) * MAX_LIMIT);
  });

  it("trata resultado vazio sem quebrar metadados", async () => {
    const res = await paginate(
      async () => [],
      async () => 0,
      {}
    );
    expect(res.data).toEqual([]);
    expect(res.pagination.total).toBe(0);
    expect(res.pagination.totalPages).toBe(0);
    expect(res.pagination.hasNext).toBe(false);
  });
});

describe("createPaginator", () => {
  it("retorna um paginador funcional equivalente a paginate", async () => {
    const paginator = createPaginator<{ id: string }>();
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const res = await paginator(
      async (limit, offset) => rows.slice(offset, offset + limit),
      async () => rows.length,
      { page: 1, limit: 2 }
    );
    expect(res.data).toEqual([{ id: "a" }, { id: "b" }]);
    expect(res.pagination.total).toBe(3);
    expect(res.pagination.totalPages).toBe(2);
    expect(res.pagination.hasNext).toBe(true);
  });
});
