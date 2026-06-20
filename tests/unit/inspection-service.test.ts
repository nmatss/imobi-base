import { describe, it, expect } from "vitest";
import {
  getDefaultRooms,
  getDefaultItems,
  estimateRepairCost,
  compareInspections,
  generateInspectionReport,
  getTemplates,
  type ComparisonResult,
} from "../../server/services/inspection-service";

/**
 * Testes comportamentais para o Inspection Service (Vistorias).
 *
 * O módulo é 100% funcional puro (sem storage/DB), então testamos as regras
 * de negócio reais: seleção de templates por tipo de imóvel, estimativa de
 * custo de reparo, comparação entrada/saída (cálculo de danos e mudanças de
 * condição) e a geração do relatório HTML.
 */

describe("getDefaultRooms (seleção de template por tipo de imóvel)", () => {
  it("retorna template de casa para 'house'/'casa'/'sobrado' (mais cômodos que apto)", () => {
    const house = getDefaultRooms("house");
    expect(house.some((r) => r.type === "garage")).toBe(true);
    expect(house.some((r) => r.type === "bedroom_3")).toBe(true);
    // casa estende apartamento, então deve ter mais cômodos
    expect(house.length).toBeGreaterThan(getDefaultRooms("apartment").length);
    expect(getDefaultRooms("casa")).toEqual(house);
    expect(getDefaultRooms("sobrado")).toEqual(house);
  });

  it("retorna template comercial para 'commercial'/'comercial'/'loja'/'sala'", () => {
    const commercial = getDefaultRooms("commercial");
    expect(commercial.some((r) => r.type === "main_hall")).toBe(true);
    expect(commercial.some((r) => r.label === "Fachada")).toBe(true);
    // comercial não tem quartos
    expect(commercial.some((r) => r.type.startsWith("bedroom"))).toBe(false);
    expect(getDefaultRooms("comercial")).toEqual(commercial);
    expect(getDefaultRooms("loja")).toEqual(commercial);
    expect(getDefaultRooms("sala")).toEqual(commercial);
  });

  it("retorna template de apartamento para apartment/flat/studio/kitnet", () => {
    const apt = getDefaultRooms("apartment");
    expect(apt.some((r) => r.type === "living_room")).toBe(true);
    expect(apt.some((r) => r.type === "garage")).toBe(false);
    expect(getDefaultRooms("flat")).toEqual(apt);
    expect(getDefaultRooms("studio")).toEqual(apt);
    expect(getDefaultRooms("kitnet")).toEqual(apt);
  });

  it("é case-insensitive", () => {
    expect(getDefaultRooms("HOUSE")).toEqual(getDefaultRooms("house"));
    expect(getDefaultRooms("Comercial")).toEqual(getDefaultRooms("comercial"));
  });

  it("faz fallback para apartamento em tipo desconhecido, null ou undefined", () => {
    const apt = getDefaultRooms("apartment");
    expect(getDefaultRooms("galpao_industrial")).toEqual(apt);
    expect(getDefaultRooms(undefined as any)).toEqual(apt);
    expect(getDefaultRooms(null as any)).toEqual(apt);
    expect(getDefaultRooms("")).toEqual(apt);
  });
});

describe("getDefaultItems (itens por tipo de cômodo)", () => {
  it("retorna os itens específicos de um cômodo conhecido", () => {
    const kitchen = getDefaultItems("kitchen");
    expect(kitchen).toContain("Pia");
    expect(kitchen).toContain("Armarios");
    expect(kitchen).toContain("Exaustor");
  });

  it("encontra cômodos que só existem no template comercial", () => {
    // main_hall só existe em COMMERCIAL_ROOMS
    const hall = getDefaultItems("main_hall");
    expect(hall).toContain("Ar Condicionado");
    expect(hall.length).toBeGreaterThan(0);
  });

  it("encontra cômodos que só existem no template de casa", () => {
    const garage = getDefaultItems("garage");
    expect(garage).toContain("Portao");
  });

  it("retorna lista genérica padrão para tipo de cômodo desconhecido", () => {
    const fallback = getDefaultItems("cinema_room");
    expect(fallback).toEqual([
      "Piso",
      "Paredes",
      "Teto",
      "Janelas",
      "Portas",
      "Tomadas",
      "Interruptores",
    ]);
  });
});

describe("estimateRepairCost (custo estimado por item e condição)", () => {
  it("usa o custo tabelado por item para 'fair' e 'poor'", () => {
    // Piso: { fair: 80, poor: 200 }
    expect(estimateRepairCost("Piso", "fair")).toBe(80);
    expect(estimateRepairCost("Piso", "poor")).toBe(200);
  });

  it("poor sempre é mais caro (ou igual) que fair para o mesmo item", () => {
    expect(estimateRepairCost("Portas", "poor")).toBeGreaterThan(
      estimateRepairCost("Portas", "fair")
    );
  });

  it("retorna 0 quando a condição é boa/excelente (sem reparo)", () => {
    expect(estimateRepairCost("Piso", "good")).toBe(0);
    expect(estimateRepairCost("Piso", "excellent")).toBe(0);
    expect(estimateRepairCost("Piso", "")).toBe(0);
  });

  it("usa custos default para item desconhecido", () => {
    expect(estimateRepairCost("Quadro Decorativo", "fair")).toBe(50);
    expect(estimateRepairCost("Quadro Decorativo", "poor")).toBe(150);
    expect(estimateRepairCost("Quadro Decorativo", "good")).toBe(0);
  });
});

describe("compareInspections (comparação entrada vs saída)", () => {
  const entryInspection = {
    id: "entry-1",
    completedDate: "2026-01-01",
    createdAt: "2025-12-30",
    overallCondition: "good",
  };
  const exitInspection = {
    id: "exit-1",
    completedDate: "2026-06-01",
    createdAt: "2026-05-30",
    overallCondition: "fair",
  };

  it("monta os metadados básicos da comparação a partir das vistorias", () => {
    const result = compareInspections([], [], entryInspection, exitInspection);
    expect(result.entryInspectionId).toBe("entry-1");
    expect(result.exitInspectionId).toBe("exit-1");
    // prefere completedDate sobre createdAt
    expect(result.entryDate).toBe("2026-01-01");
    expect(result.exitDate).toBe("2026-06-01");
    expect(result.overallEntryCondition).toBe("good");
    expect(result.overallExitCondition).toBe("fair");
    expect(result.items).toEqual([]);
    expect(result.totalDamages).toBe(0);
  });

  it("cai para createdAt quando completedDate está ausente", () => {
    const result = compareInspections(
      [],
      [],
      { id: "e", completedDate: null, createdAt: "2025-01-01", overallCondition: null },
      { id: "x", completedDate: null, createdAt: "2025-02-01", overallCondition: null }
    );
    expect(result.entryDate).toBe("2025-01-01");
    expect(result.exitDate).toBe("2025-02-01");
  });

  it("detecta mudança de condição do cômodo entre entrada e saída", () => {
    const entryRooms = [
      { room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "good" }, items: [] },
    ];
    const exitRooms = [
      { room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "poor" }, items: [] },
    ];
    const result = compareInspections(entryRooms, exitRooms, entryInspection, exitInspection);
    expect(result.roomsSummary).toHaveLength(1);
    expect(result.roomsSummary[0]).toMatchObject({
      roomLabel: "Cozinha",
      entryCondition: "good",
      exitCondition: "poor",
      changed: true,
    });
  });

  it("marca changed=false quando a condição do cômodo não muda", () => {
    const rooms = [
      { room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "good" }, items: [] },
    ];
    const result = compareInspections(rooms, rooms, entryInspection, exitInspection);
    expect(result.roomsSummary[0].changed).toBe(false);
  });

  it("trata cômodo novo na saída (sem correspondente na entrada) como mudança", () => {
    const exitRooms = [
      { room: { roomType: "balcony", roomLabel: "Varanda", overallCondition: "good" }, items: [] },
    ];
    const result = compareInspections([], exitRooms, entryInspection, exitInspection);
    expect(result.roomsSummary[0].entryCondition).toBeNull();
    // good (saída) !== null (entrada inexistente) => changed
    expect(result.roomsSummary[0].changed).toBe(true);
  });

  it("compara itens e detecta mudança de condição por item", () => {
    const entryRooms = [
      {
        room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "good" },
        items: [{ itemName: "Pia", condition: "good" }],
      },
    ];
    const exitRooms = [
      {
        room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "good" },
        items: [{ itemName: "Pia", condition: "poor", hasDamage: false }],
      },
    ];
    const result = compareInspections(entryRooms, exitRooms, entryInspection, exitInspection);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      itemName: "Pia",
      roomLabel: "Cozinha",
      entryCondition: "good",
      exitCondition: "poor",
      conditionChanged: true,
      hasDamage: false,
    });
  });

  it("assume condição 'good' como padrão quando item de entrada ou saída não tem condition", () => {
    const exitRooms = [
      {
        room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "good" },
        // item de saída sem condição, e sem item correspondente na entrada
        items: [{ itemName: "Torneira" }],
      },
    ];
    const result = compareInspections([], exitRooms, entryInspection, exitInspection);
    expect(result.items[0].entryCondition).toBe("good");
    expect(result.items[0].exitCondition).toBe("good");
    expect(result.items[0].conditionChanged).toBe(false);
  });

  it("soma totalDamages apenas dos itens com hasDamage E custo de reparo", () => {
    const exitRooms = [
      {
        room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "fair" },
        items: [
          { itemName: "Pia", condition: "poor", hasDamage: true, estimatedRepairCost: 300 },
          { itemName: "Torneira", condition: "fair", hasDamage: true, estimatedRepairCost: 80 },
          // hasDamage true mas sem custo => não soma
          { itemName: "Bancada", condition: "poor", hasDamage: true },
          // tem custo mas hasDamage false => não soma
          { itemName: "Armarios", condition: "good", hasDamage: false, estimatedRepairCost: 999 },
        ],
      },
    ];
    const result = compareInspections([], exitRooms, entryInspection, exitInspection);
    expect(result.totalDamages).toBe(380);
  });

  it("itera sobre os cômodos de SAÍDA (a saída é a fonte de verdade do estado final)", () => {
    const entryRooms = [
      { room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "good" }, items: [] },
      { room: { roomType: "balcony", roomLabel: "Varanda", overallCondition: "good" }, items: [] },
    ];
    // saída só tem a cozinha
    const exitRooms = [
      { room: { roomType: "kitchen", roomLabel: "Cozinha", overallCondition: "good" }, items: [] },
    ];
    const result = compareInspections(entryRooms, exitRooms, entryInspection, exitInspection);
    expect(result.roomsSummary).toHaveLength(1);
    expect(result.roomsSummary[0].roomLabel).toBe("Cozinha");
  });
});

describe("generateInspectionReport (relatório HTML)", () => {
  const property = { title: "Apto 101", address: "Rua A, 123" };
  const baseInspection = {
    type: "entry",
    overallCondition: "good",
    inspectorName: "João Vistoriador",
    renterName: "Maria Inquilina",
    completedDate: "2026-06-01",
  };

  it("gera HTML válido com cabeçalho, dados do imóvel e tipo traduzido", () => {
    const html = generateInspectionReport(baseInspection, [], property);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Relatorio de Vistoria - Entrada");
    expect(html).toContain("Apto 101");
    expect(html).toContain("Rua A, 123");
    expect(html).toContain("João Vistoriador");
    expect(html).toContain("Maria Inquilina");
  });

  it("renderiza cômodos, itens e marca dano/custo", () => {
    const rooms = [
      {
        room: { roomLabel: "Cozinha", overallCondition: "fair", notes: "Pia trincada" },
        items: [
          {
            itemName: "Pia",
            condition: "poor",
            hasDamage: true,
            estimatedRepairCost: 300,
            damageDescription: "Rachadura grande",
          },
        ],
      },
    ];
    const html = generateInspectionReport(baseInspection, rooms, property);
    expect(html).toContain("Cozinha");
    expect(html).toContain("Pia trincada");
    expect(html).toContain("Pia");
    expect(html).toContain("Sim"); // hasDamage
    expect(html).toContain("R$ 300.00");
    expect(html).toContain("Rachadura grande");
  });

  it("escapa graciosamente campos ausentes do imóvel sem quebrar", () => {
    const html = generateInspectionReport(
      { type: "exit", overallCondition: "poor" },
      [],
      undefined
    );
    expect(html).toContain("Saida");
    // sem inquilino => N/A
    expect(html).toContain("N/A");
    expect(typeof html).toBe("string");
  });

  it("inclui bloco de resumo de comparação quando comparison é fornecido", () => {
    const comparison: ComparisonResult = {
      entryInspectionId: "e1",
      exitInspectionId: "x1",
      entryDate: "2026-01-01",
      exitDate: "2026-06-01",
      overallEntryCondition: "good",
      overallExitCondition: "fair",
      items: [
        {
          itemName: "Pia",
          roomLabel: "Cozinha",
          entryCondition: "good",
          exitCondition: "poor",
          conditionChanged: true,
          hasDamage: true,
          estimatedRepairCost: 300,
        },
      ],
      totalDamages: 300,
      roomsSummary: [
        { roomLabel: "Cozinha", entryCondition: "good", exitCondition: "poor", changed: true },
      ],
    };
    const rooms = [
      {
        room: { roomLabel: "Cozinha", overallCondition: "poor" },
        items: [{ itemName: "Pia", condition: "poor", hasDamage: true, estimatedRepairCost: 300 }],
      },
    ];
    const html = generateInspectionReport(baseInspection, rooms, property, comparison);
    expect(html).toContain("Resumo da Comparacao");
    expect(html).toContain("Total de Danos:</strong> R$ 300.00");
    expect(html).toContain("Comodos com alteracao:</strong> 1 de 1");
    // coluna extra de condição de entrada aparece
    expect(html).toContain("Condicao Entrada");
  });

  it("exibe total de reparos quando inspection.totalDamages > 0", () => {
    const html = generateInspectionReport(
      { ...baseInspection, totalDamages: 1250.5 },
      [],
      property
    );
    expect(html).toContain("Total de Reparos Estimados");
    expect(html).toContain("R$ 1250.50");
  });

  it("renderiza imagens de assinatura quando presentes", () => {
    const html = generateInspectionReport(
      {
        ...baseInspection,
        inspectorSignature: "data:image/png;base64,AAA",
        renterSignature: "data:image/png;base64,BBB",
      },
      [],
      property
    );
    expect(html).toContain('src="data:image/png;base64,AAA"');
    expect(html).toContain('src="data:image/png;base64,BBB"');
  });
});

describe("getTemplates (catálogo completo)", () => {
  it("expõe os três tipos de template e a tabela de custos", () => {
    const t = getTemplates();
    expect(t.apartment).toEqual(getDefaultRooms("apartment"));
    expect(t.house).toEqual(getDefaultRooms("house"));
    expect(t.commercial).toEqual(getDefaultRooms("commercial"));
    expect(t.repairCosts["Piso"]).toEqual({ fair: 80, poor: 200 });
  });
});
