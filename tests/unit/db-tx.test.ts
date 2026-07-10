import { describe, expect, it } from "vitest";
import { withTenantTransaction } from "../../server/db-tx";
import { getTenantRlsContext } from "../../server/db-rls";

// Em ambiente de teste roda sobre SQLite (single-connection): o helper executa o
// callback dentro do contexto de tenant. A garantia forte de locking concorrente
// (FOR UPDATE) so existe em Postgres, mas o contrato (executa, retorna, valida
// tenant, expoe contexto) e o mesmo nos dois bancos.
describe("withTenantTransaction (ACT-1)", () => {
  it("executa o callback e propaga o valor de retorno", async () => {
    const result = await withTenantTransaction("tenant-1", async (tx) => {
      expect(tx).toBeDefined();
      return 42;
    });
    expect(result).toBe(42);
  });

  it("rejeita tenantId vazio", async () => {
    await expect(withTenantTransaction("", async () => 1)).rejects.toThrow(/tenantId/);
  });

  it("expoe o contexto RLS de tenant para o callback", async () => {
    const seen = await withTenantTransaction(
      "tenant-xyz",
      async () => getTenantRlsContext()?.tenantId,
    );
    expect(seen).toBe("tenant-xyz");
  });

  it("propaga erros do callback (rollback)", async () => {
    await expect(
      withTenantTransaction("tenant-1", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
  });
});
