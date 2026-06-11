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

// O banco temporário nasce vazio: materializa o subconjunto de tabelas que o
// storage de inspections toca (espelho do DDL de data/imobibase.db e de
// shared/schema-sqlite.ts). Usa o MESMO arquivo que server/db abrirá.
{
  const { default: Database } = await import("better-sqlite3");
  const bootstrap = new Database(process.env.SQLITE_DB_PATH);
  bootstrap.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id text PRIMARY KEY NOT NULL,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS property_inspections (
      id text PRIMARY KEY NOT NULL,
      tenant_id text NOT NULL,
      property_id text NOT NULL,
      rental_contract_id text,
      type text NOT NULL,
      status text DEFAULT 'in_progress' NOT NULL,
      inspector_name text NOT NULL,
      inspector_id text,
      renter_name text,
      renter_id text,
      scheduled_date text,
      completed_date text,
      signed_at text,
      overall_condition text,
      general_notes text,
      total_damages real,
      previous_inspection_id text,
      inspector_signature text,
      renter_signature text,
      created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS inspection_rooms (
      id text PRIMARY KEY NOT NULL,
      inspection_id text NOT NULL,
      room_type text NOT NULL,
      room_label text NOT NULL,
      overall_condition text,
      notes text,
      photos text,
      "order" integer DEFAULT 0 NOT NULL
    );
    CREATE TABLE IF NOT EXISTS inspection_items (
      id text PRIMARY KEY NOT NULL,
      room_id text NOT NULL,
      item_name text NOT NULL,
      condition text DEFAULT 'good' NOT NULL,
      description text,
      has_damage integer DEFAULT false,
      damage_description text,
      estimated_repair_cost real,
      photos text,
      previous_condition text,
      "order" integer DEFAULT 0 NOT NULL
    );
  `);
  bootstrap.close();
}

const { storage } = await import("../../../server/storage");
const { closeDb } = await import("../../../server/db");

describe("inspections storage (persistência real)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("returns an empty list for a tenant without inspections", async () => {
    await expect(storage.getPropertyInspectionsByTenant("tenant-1")).resolves.toEqual([]);
  });

  it("creates, lists (with filters), updates and deletes an inspection tree", async () => {
    const inspection = await storage.createPropertyInspection({
      tenantId: "tenant-1",
      propertyId: "property-1",
      rentalContractId: null,
      type: "entry",
      status: "in_progress",
      inspectorName: "Vistoriador Teste",
      inspectorId: null,
      renterName: "Locatário Teste",
      renterId: null,
      scheduledDate: null,
      previousInspectionId: null,
    });
    expect(inspection.id).toBeTruthy();
    expect(inspection.tenantId).toBe("tenant-1");
    expect(inspection.status).toBe("in_progress");

    // Lista por tenant + filtros usados por routes-inspections.ts
    const listed = await storage.getPropertyInspectionsByTenant("tenant-1", {
      propertyId: "property-1",
      type: "entry",
      status: "in_progress",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(inspection.id);

    // Isolamento: outro tenant não vê
    await expect(storage.getPropertyInspectionsByTenant("tenant-2")).resolves.toEqual([]);

    // Rooms + items (campos exatamente como routes-inspections.ts envia)
    const room = await storage.createInspectionRoom({
      inspectionId: inspection.id,
      roomType: "kitchen",
      roomLabel: "Cozinha",
      order: 0,
    });
    expect(room.roomLabel).toBe("Cozinha");

    const item = await storage.createInspectionItem({
      roomId: room.id,
      itemName: "Piso",
      condition: "good",
      order: 0,
    });
    expect(item.condition).toBe("good");

    const updatedItem = await storage.updateInspectionItem(item.id, {
      condition: "poor",
      hasDamage: true,
      estimatedRepairCost: 150,
      previousCondition: "good",
    });
    expect(updatedItem?.hasDamage).toBe(true);
    expect(updatedItem?.estimatedRepairCost).toBe(150);

    // Completion flow de routes-inspections.ts
    const completed = await storage.updatePropertyInspection(inspection.id, {
      status: "completed",
      completedDate: new Date().toISOString(),
      totalDamages: 150,
      overallCondition: "fair",
      generalNotes: "ok",
    });
    expect(completed?.status).toBe("completed");
    expect(completed?.totalDamages).toBe(150);

    // Delete em cascata manual (items -> rooms -> inspection)
    await expect(storage.deletePropertyInspection(inspection.id)).resolves.toBe(true);
    await expect(storage.getPropertyInspection(inspection.id)).resolves.toBeUndefined();
    await expect(storage.getInspectionRoomsByInspection(inspection.id)).resolves.toEqual([]);
  });
});
