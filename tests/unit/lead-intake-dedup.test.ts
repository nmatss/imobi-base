import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  storage: {
    createLead: vi.fn(),
    findLeadByDedup: vi.fn(),
    getActiveBrokers: vi.fn(),
    getLeadAssignmentState: vi.fn(),
    advanceLeadAssignment: vi.fn(),
    getLeadsByTenant: vi.fn(),
  },
}));

vi.mock("../../server/storage", () => ({ storage: mocks.storage }));

const { createLeadDeduped } = await import("../../server/services/lead-intake");

describe("createLeadDeduped (ACT-2 — corrida de de-dup)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna o lead criado quando o insert tem sucesso", async () => {
    mocks.storage.createLead.mockResolvedValueOnce({ id: "lead-1", name: "Ana" });
    const result = await createLeadDeduped("t1", { name: "Ana", phone: "11999999999" });
    expect(result).toEqual({ duplicate: false, lead: { id: "lead-1", name: "Ana" } });
    expect(mocks.storage.findLeadByDedup).not.toHaveBeenCalled();
  });

  it("trata violacao de unicidade (PG 23505) como duplicata e retorna o vencedor", async () => {
    const uniqueErr = Object.assign(new Error("duplicate key value violates unique constraint"), {
      code: "23505",
    });
    mocks.storage.createLead.mockRejectedValueOnce(uniqueErr);
    mocks.storage.findLeadByDedup.mockResolvedValueOnce({ id: "lead-winner" });

    const result = await createLeadDeduped("t1", { name: "Ana", email: "ANA@x.com" });

    expect(result).toEqual({ duplicate: true, existingLead: { id: "lead-winner" } });
    // re-busca o vencedor com contato normalizado
    expect(mocks.storage.findLeadByDedup).toHaveBeenCalledWith("t1", undefined, "ana@x.com");
  });

  it("trata violacao de unicidade do SQLite como duplicata", async () => {
    const sqliteErr = Object.assign(new Error("UNIQUE constraint failed: leads.tenant_id"), {
      code: "SQLITE_CONSTRAINT_UNIQUE",
    });
    mocks.storage.createLead.mockRejectedValueOnce(sqliteErr);
    mocks.storage.findLeadByDedup.mockResolvedValueOnce({ id: "lead-winner-2" });

    const result = await createLeadDeduped("t1", { name: "Bob", phone: "11888888888" });
    expect(result).toEqual({ duplicate: true, existingLead: { id: "lead-winner-2" } });
  });

  it("repropaga erros que nao sao de unicidade", async () => {
    const otherErr = Object.assign(new Error("connection refused"), { code: "ECONNREFUSED" });
    mocks.storage.createLead.mockRejectedValueOnce(otherErr);
    await expect(createLeadDeduped("t1", { name: "X" })).rejects.toThrow("connection refused");
    expect(mocks.storage.findLeadByDedup).not.toHaveBeenCalled();
  });
});
