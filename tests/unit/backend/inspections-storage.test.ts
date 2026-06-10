import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// SQLITE_DB_PATH precisa apontar para um diretório existente ANTES de
// server/db ser importado (better-sqlite3 cria o arquivo, mas não o
// diretório — e o default ./data/ não existe em clone limpo/CI, além de
// ser o banco real de dev). Por isso os imports do server são dinâmicos.
process.env.SQLITE_DB_PATH = path.join(
  mkdtempSync(path.join(tmpdir(), "inspections-storage-test-")),
  "test.db",
);

const { storage } = await import("../../../server/storage");
const { closeDb } = await import("../../../server/db");

describe("inspections storage", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("returns an empty list instead of crashing when inspections table is unavailable", async () => {
    await expect(storage.getPropertyInspectionsByTenant("tenant-1")).resolves.toEqual([]);
  });
});
