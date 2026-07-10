import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Testes comportamentais do motor AVM (Automated Valuation Model).
 *
 * Foco: lógica de avaliação de imóvel — cálculo de valor a partir de
 * comparáveis, aplicação de fatores/ajustes (área, dormitórios, banheiros,
 * vagas, diferenciais, conservação, idade), sanitização de inputs e
 * derivação de confiança/faixa de valor.
 *
 * O módulo importa `../db` (Drizzle), que ao ser carregado abre conexão
 * com o banco. Para isolar a lógica pura, mockamos `../db`: o builder de
 * query é um "thenable" encadeável que resolve para um conjunto de
 * resultados controlado por teste (uma fila). Assim conseguimos dirigir
 * `findComparables`/`calculateValuation` com dados determinísticos e
 * asseverar o COMPORTAMENTO (entradas -> saídas), não a implementação.
 */

// Fila de resultados que o builder de query vai consumir, em ordem.
// Cada item é o array que o `await` da query retorna.
let queryResults: any[][] = [];
const insertedRows: any[] = [];
const deleteCalls: any[] = [];

function makeQueryBuilder() {
  // Builder encadeável: select().from().where().limit() etc.
  // É "thenable": quando aguardado, devolve o próximo resultado da fila.
  const builder: any = {
    from: () => builder,
    where: () => builder,
    limit: () => builder,
    orderBy: () => builder,
    then: (resolve: (v: any) => any) => {
      const next = queryResults.length > 0 ? queryResults.shift() : [];
      return Promise.resolve(next).then(resolve);
    },
  };
  return builder;
}

vi.mock("../../server/db", () => {
  const db = {
    select: () => makeQueryBuilder(),
    insert: () => ({
      values: (row: any) => {
        insertedRows.push(row);
        return Promise.resolve();
      },
    }),
    delete: () => ({
      where: (cond: any) => {
        deleteCalls.push(cond);
        return Promise.resolve();
      },
    }),
  };
  const schema = {
    properties: { tenantId: "tenantId", status: "status" },
    marketIndices: {
      tenantId: "tenantId",
      city: "city",
      propertyType: "propertyType",
      category: "category",
      period: "period",
    },
  };
  return { db, schema };
});

// nanoid é puro mas o mock evita ESM/entropy surpresas
vi.mock("nanoid", () => ({ nanoid: () => "test-id" }));

// drizzle-orm helpers viram no-ops; só importam para montar a query mockada.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}),
  and: () => ({}),
  or: () => ({}),
  gte: () => ({}),
  lte: () => ({}),
  sql: () => ({}),
}));

import {
  calculateValuation,
  findComparables,
  type ValuationInput,
} from "../../server/services/avm-engine";

beforeEach(() => {
  queryResults = [];
  insertedRows.length = 0;
  deleteCalls.length = 0;
});

/** Helper para enfileirar a lista de imóveis que findComparables vai receber. */
function setProperties(rows: any[]) {
  queryResults.push(rows);
}

/** Fábrica de imóvel-comparável com defaults sensatos. */
function prop(overrides: Partial<any> = {}) {
  return {
    id: "p1",
    title: "Apto",
    address: "Rua A, 100",
    city: "Sao Paulo",
    state: "SP",
    type: "apartment",
    category: "sale",
    price: "500000",
    area: 100,
    bedrooms: 3,
    bathrooms: 2,
    status: "available",
    ...overrides,
  };
}

const baseInput: ValuationInput = {
  propertyType: "apartment",
  category: "sale",
  city: "Sao Paulo",
  state: "SP",
  area: 100,
  bedrooms: 3,
  bathrooms: 2,
};

describe("findComparables — filtragem e scoring", () => {
  it("descarta imóveis de outro estado", async () => {
    setProperties([
      prop({ id: "same", state: "SP" }),
      prop({ id: "other", state: "RJ" }),
    ]);
    const comps = await findComparables("t1", baseInput);
    expect(comps.map((c) => c.id)).toEqual(["same"]);
  });

  it("descarta imóveis com preço ou área inválidos (<= 0)", async () => {
    setProperties([
      prop({ id: "ok" }),
      prop({ id: "noPrice", price: "0" }),
      prop({ id: "noArea", area: 0 }),
      prop({ id: "negPrice", price: "-10" }),
    ]);
    const comps = await findComparables("t1", baseInput);
    expect(comps.map((c) => c.id)).toEqual(["ok"]);
  });

  it("descarta comparáveis com similaridade abaixo de 30%", async () => {
    // Imóvel totalmente diferente: outra cidade, outro tipo/categoria,
    // área e dormitórios distantes -> score deve cair abaixo de 30.
    setProperties([
      prop({
        id: "lowSim",
        city: "Campinas",
        type: "house",
        category: "rent",
        area: 1000,
        bedrooms: 8,
        bathrooms: 8,
        address: "X",
      }),
    ]);
    const comps = await findComparables("t1", baseInput);
    expect(comps).toHaveLength(0);
  });

  it("calcula pricePerSqm = preço/área e ordena por similaridade desc", async () => {
    setProperties([
      // menos similar (área 30% diferente)
      prop({ id: "b", area: 130, price: "650000", bedrooms: 3, bathrooms: 2 }),
      // mais similar (idêntico ao subject)
      prop({ id: "a", area: 100, price: "500000", bedrooms: 3, bathrooms: 2 }),
    ]);
    const comps = await findComparables("t1", baseInput);
    expect(comps[0].id).toBe("a");
    expect(comps[0].pricePerSqm).toBe(5000); // 500000 / 100
    expect(comps[0].similarityScore).toBeGreaterThanOrEqual(comps[1].similarityScore);
  });

  it("respeita o limite de comparáveis retornados", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => prop({ id: `p${i}` }));
    setProperties(rows);
    const comps = await findComparables("t1", baseInput, 5);
    expect(comps).toHaveLength(5);
  });

  it("score de imóvel idêntico (com bônus de bairro) é 100%", async () => {
    // O bônus de bairro (5 pts) só conta quando o subject informa neighborhood
    // e o address do comparável o contém. Sem isso o teto é 95.
    setProperties([prop({ id: "twin", address: "Centro, Rua A, 100" })]);
    const comps = await findComparables("t1", { ...baseInput, neighborhood: "Centro" });
    expect(comps[0].similarityScore).toBe(100);
  });

  it("sem informar bairro, o score máximo atingível é 95 (bônus não conta)", async () => {
    setProperties([prop({ id: "twin", address: "Rua A, 100" })]);
    const comps = await findComparables("t1", baseInput);
    expect(comps[0].similarityScore).toBe(95);
  });
});

describe("calculateValuation — avaliação base por comparáveis", () => {
  it("estima valor = preço/m2 médio ponderado × área (sem ajustes)", async () => {
    // 3 comparáveis idênticos ao subject @ 5000/m2 -> base 5000, sem ajustes.
    setProperties([
      prop({ id: "1", area: 100, price: "500000" }),
      prop({ id: "2", area: 100, price: "500000" }),
      prop({ id: "3", area: 100, price: "500000" }),
    ]);
    const r = await calculateValuation("t1", baseInput);
    expect(r.pricePerSqm).toBe(5000);
    expect(r.estimatedValue).toBe(500000); // 5000 * 100
    expect(r.comparables.length).toBe(3);
  });

  it("min/max envolvem o valor estimado e respeitam a faixa de confiança", async () => {
    setProperties([
      prop({ id: "1", area: 100, price: "500000" }),
      prop({ id: "2", area: 100, price: "500000" }),
      prop({ id: "3", area: 100, price: "500000" }),
    ]);
    const r = await calculateValuation("t1", baseInput);
    expect(r.minValue).toBeLessThan(r.estimatedValue);
    expect(r.maxValue).toBeGreaterThan(r.estimatedValue);
    // faixa simétrica em torno do estimado
    expect(r.estimatedValue - r.minValue).toBeCloseTo(r.maxValue - r.estimatedValue, -1);
  });

  it("confiança fica entre 5 e 98 e cresce com volume/qualidade", async () => {
    // 12 comparáveis idênticos (alta similaridade) -> confiança alta.
    const many = Array.from({ length: 12 }, (_, i) =>
      prop({ id: `m${i}`, area: 100, price: "500000" }),
    );
    setProperties(many);
    const rHigh = await calculateValuation("t1", baseInput);

    // 1 único comparável -> confiança bem menor.
    setProperties([prop({ id: "solo", area: 100, price: "500000" })]);
    const rLow = await calculateValuation("t1", baseInput);

    expect(rHigh.confidenceScore).toBeGreaterThan(rLow.confidenceScore);
    for (const r of [rHigh, rLow]) {
      expect(r.confidenceScore).toBeGreaterThanOrEqual(5);
      expect(r.confidenceScore).toBeLessThanOrEqual(98);
    }
  });

  it("média ponderada favorece comparáveis mais similares", async () => {
    // 'a' idêntico (peso alto) @ 5000/m2; 'b' menos similar @ 10000/m2.
    // A ponderação deve puxar o resultado para mais perto de 5000 do que
    // a média aritmética simples (7500).
    setProperties([
      prop({ id: "a", area: 100, price: "500000", bedrooms: 3, bathrooms: 2 }),
      prop({
        id: "b",
        area: 130,
        price: "1300000",
        bedrooms: 5,
        bathrooms: 4,
        address: "X",
      }),
    ]);
    const r = await calculateValuation("t1", baseInput);
    // sem considerar ajuste de área, a base ponderada < 7500
    // (estimatedValue/area aproxima o preço/m2 ajustado; ainda assim < 7500*100)
    expect(r.estimatedValue / baseInput.area).toBeLessThan(7500);
  });
});

describe("calculateValuation — fatores/ajustes", () => {
  // Base estável: 3 comparáveis idênticos @ 5000/m2, área média 100.
  function baseComps() {
    return [
      prop({ id: "1", area: 100, price: "500000", bedrooms: 3, bathrooms: 2 }),
      prop({ id: "2", area: 100, price: "500000", bedrooms: 3, bathrooms: 2 }),
      prop({ id: "3", area: 100, price: "500000", bedrooms: 3, bathrooms: 2 }),
    ];
  }

  it("diferenciais (features) somam prêmio e são limitados a 25%", async () => {
    setProperties(baseComps());
    const r = await calculateValuation("t1", {
      ...baseInput,
      // piscina 8 + academia 5 + sauna 4 + cobertura 8 + vista mar 10 = 35 -> cap 25
      features: ["piscina", "academia", "sauna", "cobertura", "vista mar"],
    });
    expect(r.adjustments.features).toBe(25);
  });

  it("features desconhecidas não geram ajuste; case/trim são normalizados", async () => {
    setProperties(baseComps());
    const r = await calculateValuation("t1", {
      ...baseInput,
      features: ["  PISCINA  ", "feature-inexistente"],
    });
    expect(r.adjustments.features).toBe(8); // só a piscina, normalizada
  });

  it("conservação aplica ajuste mapeado e ignora 'bom' (0) e desconhecido", async () => {
    setProperties(baseComps());
    const rNew = await calculateValuation("t1", { ...baseInput, condition: "NOVO" });
    expect(rNew.adjustments.condition).toBe(10);

    setProperties(baseComps());
    const rReforma = await calculateValuation("t1", {
      ...baseInput,
      condition: "needs_renovation",
    });
    expect(rReforma.adjustments.condition).toBe(-15);

    setProperties(baseComps());
    const rGood = await calculateValuation("t1", { ...baseInput, condition: "bom" });
    expect(rGood.adjustments.condition).toBeUndefined();

    setProperties(baseComps());
    const rUnknown = await calculateValuation("t1", {
      ...baseInput,
      condition: "estado-qualquer",
    });
    expect(rUnknown.adjustments.condition).toBeUndefined();
  });

  it("vagas de garagem somam +5% por vaga", async () => {
    setProperties(baseComps());
    const r = await calculateValuation("t1", { ...baseInput, parkingSpaces: 2 });
    expect(r.adjustments.parking).toBe(10);
  });

  it("idade: imóvel novo não tem ajuste; antigo deprecia limitado a -20%", async () => {
    const currentYear = new Date().getFullYear();

    setProperties(baseComps());
    const rNew = await calculateValuation("t1", {
      ...baseInput,
      yearBuilt: currentYear - 5, // <= 10 anos, sem ajuste
    });
    expect(rNew.adjustments.age).toBeUndefined();

    setProperties(baseComps());
    const rOld = await calculateValuation("t1", {
      ...baseInput,
      yearBuilt: currentYear - 100, // muito antigo -> cap em -20
    });
    expect(rOld.adjustments.age).toBe(-20);
  });

  it("ajuste de área: imóvel maior que a média deprecia o preço/m2", async () => {
    // subject maior (200) que a média dos comparáveis (100) -> ajuste negativo.
    setProperties(baseComps());
    const r = await calculateValuation("t1", { ...baseInput, area: 200 });
    expect(r.adjustments.area).toBeLessThan(0);
  });

  it("ajuste de área: imóvel menor que a média valoriza o preço/m2", async () => {
    setProperties(baseComps());
    const r = await calculateValuation("t1", { ...baseInput, area: 50 });
    expect(r.adjustments.area).toBeGreaterThan(0);
  });

  it("dormitórios acima da média dos comparáveis geram ajuste positivo", async () => {
    setProperties(baseComps()); // média 3 dorms
    const r = await calculateValuation("t1", { ...baseInput, bedrooms: 5 });
    expect(r.adjustments.bedrooms).toBeGreaterThan(0);
  });

  it("ajustes compõem o valor final multiplicativamente sobre o preço base", async () => {
    setProperties(baseComps());
    // só vagas: +5% -> 5000 * 1.05 = 5250/m2 -> 525000
    const r = await calculateValuation("t1", { ...baseInput, parkingSpaces: 1 });
    expect(r.adjustments.parking).toBe(5);
    expect(r.estimatedValue).toBe(525000);
  });
});

describe("calculateValuation — fallback sem comparáveis", () => {
  it("usa índice de mercado quando não há comparáveis", async () => {
    // 1ª query (findComparables): nenhum imóvel.
    setProperties([]);
    // 2ª query (marketIndices): índice disponível.
    setProperties([{ avgPricePerSqm: 8000, trend: "up" }]);

    const r = await calculateValuation("t1", baseInput);
    expect(r.comparables).toHaveLength(0);
    expect(r.pricePerSqm).toBe(8000);
    expect(r.estimatedValue).toBe(800000); // 8000 * 100
    expect(r.confidenceScore).toBe(20);
    expect(r.marketTrend).toBe("up");
  });

  it("fallback genérico para venda (5000/m2) quando não há índice", async () => {
    setProperties([]); // sem comparáveis
    setProperties([]); // sem índice
    const r = await calculateValuation("t1", { ...baseInput, category: "sale" });
    expect(r.pricePerSqm).toBe(5000);
    expect(r.estimatedValue).toBe(500000);
    expect(r.confidenceScore).toBe(5);
  });

  it("fallback genérico para aluguel (30/m2) quando não há índice", async () => {
    setProperties([]);
    setProperties([]);
    const r = await calculateValuation("t1", { ...baseInput, category: "rent" });
    expect(r.pricePerSqm).toBe(30);
    expect(r.estimatedValue).toBe(3000); // 30 * 100
  });

  it("confiança baixa amplia a faixa min/max para ±20%", async () => {
    setProperties([]);
    setProperties([]);
    const r = await calculateValuation("t1", baseInput);
    // confiança 5 -> faixa 20%
    expect(r.minValue).toBe(Math.round(r.estimatedValue * 0.8));
    expect(r.maxValue).toBe(Math.round(r.estimatedValue * 1.2));
  });
});

describe("calculateValuation — saída/contrato", () => {
  it("retorna a forma completa do resultado e metodologia textual", async () => {
    setProperties([
      prop({ id: "1", area: 100, price: "500000" }),
      prop({ id: "2", area: 100, price: "500000" }),
      prop({ id: "3", area: 100, price: "500000" }),
    ]);
    const r = await calculateValuation("t1", baseInput);
    expect(r).toMatchObject({
      estimatedValue: expect.any(Number),
      minValue: expect.any(Number),
      maxValue: expect.any(Number),
      pricePerSqm: expect.any(Number),
      confidenceScore: expect.any(Number),
      comparables: expect.any(Array),
      adjustments: expect.any(Object),
      marketTrend: expect.any(String),
      methodology: expect.any(String),
    });
    expect(r.methodology).toContain("Sao Paulo");
    expect(r.methodology.length).toBeGreaterThan(50);
  });

  it("limita os comparáveis retornados a no máximo 10", async () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      prop({ id: `c${i}`, area: 100, price: "500000" }),
    );
    setProperties(rows);
    const r = await calculateValuation("t1", baseInput);
    expect(r.comparables.length).toBe(10);
  });
});
