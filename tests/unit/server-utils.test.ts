import { describe, expect, it, vi } from "vitest";
import {
  buildCursorPaginationMeta,
  buildPaginationMeta,
  createPaginatedResponse,
  createPaginator,
  decodeCursor,
  encodeCursor,
  getEstimatedCount,
  getPaginationOptions,
  getSmartCount,
  paginate,
  parsePaginationParams,
} from "../../server/utils/pagination";
import {
  PII_FIELD_NAMES,
  maskBankAccount,
  maskByFieldName,
  maskCpfCnpj,
  maskEmail,
  maskPhone,
} from "../../server/utils/pii-mask";
import {
  sanitizeError,
  sanitizeObject,
  sanitizeResponse,
  shouldSkipDetailedLogging,
} from "../../server/utils/log-sanitizer";
import { apiError, apiPaginated, apiResponse } from "../../server/utils/api-response";

function createResponseMock() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("server utils", () => {
  describe("pagination", () => {
    it("normalizes page and limit parameters defensively", () => {
      expect(parsePaginationParams({ page: -10, limit: 500 })).toEqual({
        page: 1,
        limit: 100,
        offset: 0,
      });
      expect(parsePaginationParams({ page: 3, limit: 25 })).toEqual({
        page: 3,
        limit: 25,
        offset: 50,
      });
      expect(getPaginationOptions({ page: "bad" as never, limit: 0 })).toEqual({
        offset: 0,
        limit: 20,
      });
    });

    it("builds offset and cursor pagination metadata", () => {
      expect(buildPaginationMeta(45, 2, 20)).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });

      const cursor = encodeCursor("lead-123");
      expect(decodeCursor(cursor)).toBe("lead-123");
      expect(buildCursorPaginationMeta([{ id: "a" }, { id: "b" }], 2, true)).toEqual({
        hasNext: true,
        hasPrev: true,
        nextCursor: encodeCursor("b"),
        prevCursor: encodeCursor("a"),
      });
    });

    it("creates paginated responses and executes data/count functions in helpers", async () => {
      expect(createPaginatedResponse(["a"], 1, 1, 20)).toEqual({
        data: ["a"],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      });

      const queryFn = vi.fn(async (limit: number, offset: number) => [`${limit}:${offset}`]);
      const countFn = vi.fn(async () => 7);
      await expect(paginate(queryFn, countFn, { page: 2, limit: 3 })).resolves.toMatchObject({
        data: ["3:3"],
        pagination: { page: 2, limit: 3, total: 7 },
      });

      const paginator = createPaginator<string>();
      await expect(paginator(queryFn, countFn, { page: 1, limit: 2 })).resolves.toMatchObject({
        data: ["2:0"],
        pagination: { page: 1, limit: 2, total: 7 },
      });
    });

    it("rejects suspicious estimated count table names before querying", async () => {
      const db = { execute: vi.fn() };
      await expect(getEstimatedCount(db, "users; DROP TABLE users")).resolves.toBe(0);
      expect(db.execute).not.toHaveBeenCalled();

      await expect(getSmartCount(async () => 42, "properties")).resolves.toEqual({
        count: 42,
        isEstimate: false,
      });
    });
  });

  describe("pii masking", () => {
    it("masks personal identifiers while preserving useful suffixes", () => {
      expect(maskCpfCnpj("123.456.789-09")).toBe("***.***.**0-09");
      expect(maskCpfCnpj("12.345.678/0001-95")).toBe("**.***.***/****-95");
      expect(maskCpfCnpj("abc123")).toBe("*23");
      expect(maskEmail("joao.silva@gmail.com")).toBe("j*********@gmail.com");
      expect(maskEmail("invalid")).toBe("******d");
      expect(maskPhone("+55 (11) 98765-4321")).toBe("*********4321");
      expect(maskBankAccount("00012345-6")).toBe("******45-6");
    });

    it("selects masks by known field names and leaves non-PII unchanged", () => {
      expect(maskByFieldName("ownerEmail", "ana@example.com")).toBe("a**@example.com");
      expect(maskByFieldName("pixKey", "12345678901")).toBe("*******8901");
      expect(maskByFieldName("title", "Apartamento")).toBe("Apartamento");
      expect(maskByFieldName("phone", null)).toBe("");
      expect(PII_FIELD_NAMES).toContain("cpfCnpj");
    });
  });

  describe("log sanitizer", () => {
    it("redacts sensitive fields deeply", () => {
      expect(
        sanitizeObject({
          email: "visible@example.com",
          password: "secret",
          nested: { accessToken: "abc", keep: true },
          list: [{ api_key: "key" }],
        }),
      ).toEqual({
        email: "visible@example.com",
        password: "[REDACTED]",
        nested: { accessToken: "[REDACTED]", keep: true },
        list: [{ api_key: "[REDACTED]" }],
      });
    });

    it("serializes/truncates responses and sanitizes errors", () => {
      expect(sanitizeResponse({ token: "abc", ok: true })).toBe(
        '{"token":"[REDACTED]","ok":true}',
      );
      expect(sanitizeResponse({ value: "abcdef" }, 10)).toContain("[truncated]");

      const previousNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";
      const sanitized = sanitizeError(
        Object.assign(new Error("failed"), {
          code: "E_FAIL",
          details: { refreshToken: "abc" },
        }),
      );
      process.env.NODE_ENV = previousNodeEnv;

      expect(sanitized).toMatchObject({
        message: "failed",
        name: "Error",
        code: "E_FAIL",
        details: { refreshToken: "[REDACTED]" },
      });
      expect(sanitized.stack).toBeUndefined();
      expect(shouldSkipDetailedLogging("/api/health/live")).toBe(true);
      expect(shouldSkipDetailedLogging("/api/leads")).toBe(false);
    });
  });

  describe("api response helpers", () => {
    it("writes success, error and paginated envelopes", () => {
      const success = createResponseMock();
      expect(apiResponse(success as never, { id: "1" }, undefined, 201)).toBe(success);
      expect(success.status).toHaveBeenCalledWith(201);
      expect(success.json).toHaveBeenCalledWith({
        success: true,
        data: { id: "1" },
        meta: undefined,
      });

      const failure = createResponseMock();
      apiError(failure as never, 403, "Forbidden", "FORBIDDEN", { reason: "tenant" });
      expect(failure.status).toHaveBeenCalledWith(403);
      expect(failure.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: "Forbidden",
          code: "FORBIDDEN",
          details: { reason: "tenant" },
        },
      });

      const paginated = createResponseMock();
      apiPaginated(paginated as never, ["a"], 1, 1, 20);
      expect(paginated.json).toHaveBeenCalledWith({
        success: true,
        data: ["a"],
        meta: { page: 1, limit: 20, total: 1 },
      });
    });
  });
});
