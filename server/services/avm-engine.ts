// @ts-nocheck
/**
 * AVM (Automated Valuation Model) Engine
 * AI-powered property pricing engine that estimates market value
 * based on comparable properties, location data, and property characteristics.
 */

import { eq, and, sql, gte, lte, or } from "drizzle-orm";
import { db, schema } from "../db";
import { nanoid } from "nanoid";
import type { Property, PropertyValuation, MarketIndex } from "@shared/schema-sqlite";

export interface ValuationInput {
  propertyType: string;
  category: string;
  city: string;
  state: string;
  neighborhood?: string;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  features?: string[];
  condition?: string;
  yearBuilt?: number;
}

export interface ComparableProperty {
  id: string;
  title: string;
  address: string;
  city: string;
  neighborhood?: string;
  type: string;
  category: string;
  price: number;
  area: number;
  bedrooms: number | null;
  bathrooms: number | null;
  pricePerSqm: number;
  similarityScore: number;
  distance?: string;
}

export interface ValuationResult {
  estimatedValue: number;
  minValue: number;
  maxValue: number;
  pricePerSqm: number;
  confidenceScore: number;
  comparables: ComparableProperty[];
  adjustments: Record<string, number>;
  marketTrend: string;
  methodology: string;
}

// Feature premium percentages
const FEATURE_PREMIUMS: Record<string, number> = {
  piscina: 8,
  pool: 8,
  academia: 5,
  gym: 5,
  varanda: 4,
  balcony: 4,
  churrasqueira: 4,
  bbq: 4,
  playground: 3,
  "salao de festas": 3,
  "salão de festas": 3,
  sauna: 4,
  "sala de jogos": 2,
  portaria: 3,
  "portaria 24h": 5,
  elevador: 3,
  jardim: 2,
  "vista para o mar": 10,
  "vista mar": 10,
  cobertura: 8,
  "ar condicionado": 2,
  mobiliado: 5,
  "semi-mobiliado": 3,
  condominio: 2,
  seguranca: 3,
};

// Condition adjustments
const CONDITION_ADJUSTMENTS: Record<string, number> = {
  new: 10,
  novo: 10,
  excellent: 5,
  excelente: 5,
  good: 0,
  bom: 0,
  fair: -5,
  regular: -5,
  needs_renovation: -15,
  reforma: -15,
};

/**
 * Calculate similarity score between subject property and a comparable
 */
function calculateSimilarityScore(
  subject: ValuationInput,
  comparable: Property
): number {
  let score = 0;
  let maxScore = 0;

  // Same city: 20 points
  maxScore += 20;
  if (comparable.city.toLowerCase() === subject.city.toLowerCase()) {
    score += 20;
  }

  // Same state: 5 points
  maxScore += 5;
  if (comparable.state.toLowerCase() === subject.state.toLowerCase()) {
    score += 5;
  }

  // Same type: 15 points
  maxScore += 15;
  if (comparable.type.toLowerCase() === subject.propertyType.toLowerCase()) {
    score += 15;
  }

  // Same category: 10 points
  maxScore += 10;
  if (comparable.category.toLowerCase() === subject.category.toLowerCase()) {
    score += 10;
  }

  // Area similarity: up to 20 points
  maxScore += 20;
  const compArea = comparable.area || 0;
  if (compArea > 0 && subject.area > 0) {
    const areaDiff = Math.abs(compArea - subject.area) / subject.area;
    if (areaDiff <= 0.1) score += 20;
    else if (areaDiff <= 0.2) score += 15;
    else if (areaDiff <= 0.3) score += 10;
    else if (areaDiff <= 0.5) score += 5;
  }

  // Bedroom similarity: up to 15 points
  maxScore += 15;
  if (subject.bedrooms != null && comparable.bedrooms != null) {
    const bedroomDiff = Math.abs(comparable.bedrooms - subject.bedrooms);
    if (bedroomDiff === 0) score += 15;
    else if (bedroomDiff === 1) score += 10;
    else if (bedroomDiff === 2) score += 5;
  }

  // Bathroom similarity: up to 10 points
  maxScore += 10;
  if (subject.bathrooms != null && comparable.bathrooms != null) {
    const bathDiff = Math.abs(comparable.bathrooms - subject.bathrooms);
    if (bathDiff === 0) score += 10;
    else if (bathDiff === 1) score += 7;
    else if (bathDiff === 2) score += 3;
  }

  // Neighborhood match bonus: 5 points
  maxScore += 5;
  if (subject.neighborhood && comparable.address) {
    if (comparable.address.toLowerCase().includes(subject.neighborhood.toLowerCase())) {
      score += 5;
    }
  }

  return Math.round((score / maxScore) * 100);
}

/**
 * Find comparable properties from the database
 */
export async function findComparables(
  tenantId: string,
  input: ValuationInput,
  limit = 20
): Promise<ComparableProperty[]> {
  // Get all properties for the tenant with filters
  const minArea = input.area * 0.7;
  const maxArea = input.area * 1.3;

  // Query properties with broad criteria first
  const allProperties = await db
    .select()
    .from(schema.properties)
    .where(
      and(
        eq(schema.properties.tenantId, tenantId),
        eq(schema.properties.status, "available")
      )
    );

  // Filter and score comparables
  const comparables: ComparableProperty[] = [];

  for (const prop of allProperties) {
    const price = parseFloat(prop.price || "0");
    const area = prop.area || 0;

    if (price <= 0 || area <= 0) continue;

    // Must be same state at minimum
    if (prop.state.toLowerCase() !== input.state.toLowerCase()) continue;

    const similarityScore = calculateSimilarityScore(input, prop);

    // Only include if similarity is at least 30%
    if (similarityScore < 30) continue;

    comparables.push({
      id: prop.id,
      title: prop.title,
      address: prop.address,
      city: prop.city,
      neighborhood: undefined,
      type: prop.type,
      category: prop.category,
      price,
      area,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      pricePerSqm: Math.round((price / area) * 100) / 100,
      similarityScore,
    });
  }

  // Sort by similarity score descending
  comparables.sort((a, b) => b.similarityScore - a.similarityScore);

  return comparables.slice(0, limit);
}

/**
 * Calculate the automated property valuation
 */
export async function calculateValuation(
  tenantId: string,
  input: ValuationInput
): Promise<ValuationResult> {
  // Step 1: Find comparable properties
  const comparables = await findComparables(tenantId, input, 20);

  // Step 2: Calculate base price per sqm from comparables
  let basePricePerSqm: number;
  let confidenceScore: number;
  let marketTrend: string = "stable";

  if (comparables.length === 0) {
    // No comparables - use rough estimation based on location
    // Try to get market indices
    const indices = await db
      .select()
      .from(schema.marketIndices)
      .where(
        and(
          eq(schema.marketIndices.tenantId, tenantId),
          eq(schema.marketIndices.city, input.city),
          eq(schema.marketIndices.propertyType, input.propertyType),
          eq(schema.marketIndices.category, input.category)
        )
      )
      .limit(1);

    if (indices.length > 0 && indices[0].avgPricePerSqm) {
      basePricePerSqm = indices[0].avgPricePerSqm;
      confidenceScore = 20;
      marketTrend = indices[0].trend || "stable";
    } else {
      // Absolute fallback - generic price based on category
      basePricePerSqm = input.category === "sale" ? 5000 : 30;
      confidenceScore = 5;
    }
  } else {
    // Calculate weighted average price per sqm
    let totalWeight = 0;
    let weightedSum = 0;

    for (const comp of comparables) {
      const weight = comp.similarityScore / 100;
      weightedSum += comp.pricePerSqm * weight;
      totalWeight += weight;
    }

    basePricePerSqm = totalWeight > 0 ? weightedSum / totalWeight : comparables[0].pricePerSqm;

    // Calculate confidence based on number and quality of comparables
    const avgSimilarity =
      comparables.reduce((sum, c) => sum + c.similarityScore, 0) / comparables.length;

    if (comparables.length >= 10 && avgSimilarity >= 70) {
      confidenceScore = 85 + Math.min(15, (comparables.length - 10) * 1.5);
    } else if (comparables.length >= 5 && avgSimilarity >= 50) {
      confidenceScore = 60 + Math.min(25, comparables.length * 2 + avgSimilarity * 0.1);
    } else if (comparables.length >= 3) {
      confidenceScore = 40 + Math.min(20, comparables.length * 3 + avgSimilarity * 0.2);
    } else {
      confidenceScore = 15 + comparables.length * 8 + avgSimilarity * 0.1;
    }

    confidenceScore = Math.min(98, Math.max(5, confidenceScore));

    // Determine trend from comparables price variation
    const prices = comparables.map((c) => c.pricePerSqm);
    const median = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    if (avg > median * 1.05) marketTrend = "up";
    else if (avg < median * 0.95) marketTrend = "down";
  }

  // Step 3: Apply adjustments
  const adjustments: Record<string, number> = {};

  // Area adjustment: larger properties tend to have lower price/sqm (log scale)
  if (comparables.length > 0) {
    const avgCompArea =
      comparables.reduce((sum, c) => sum + c.area, 0) / comparables.length;
    const areaRatio = input.area / avgCompArea;
    if (areaRatio > 1) {
      const areaAdj = -Math.log(areaRatio) * 8; // Negative for larger
      adjustments["area"] = Math.round(areaAdj * 100) / 100;
    } else if (areaRatio < 1) {
      const areaAdj = Math.log(1 / areaRatio) * 5; // Positive for smaller
      adjustments["area"] = Math.round(areaAdj * 100) / 100;
    }
  }

  // Bedroom adjustment
  if (input.bedrooms != null && comparables.length > 0) {
    const avgBedrooms =
      comparables.filter((c) => c.bedrooms != null).reduce((sum, c) => sum + (c.bedrooms || 0), 0) /
      Math.max(1, comparables.filter((c) => c.bedrooms != null).length);
    const bedroomDiff = input.bedrooms - avgBedrooms;
    if (Math.abs(bedroomDiff) > 0.5) {
      adjustments["bedrooms"] = Math.round(bedroomDiff * 3 * 100) / 100;
    }
  }

  // Bathroom adjustment
  if (input.bathrooms != null && comparables.length > 0) {
    const avgBathrooms =
      comparables.filter((c) => c.bathrooms != null).reduce((sum, c) => sum + (c.bathrooms || 0), 0) /
      Math.max(1, comparables.filter((c) => c.bathrooms != null).length);
    const bathDiff = input.bathrooms - avgBathrooms;
    if (Math.abs(bathDiff) > 0.5) {
      adjustments["bathrooms"] = Math.round(bathDiff * 2 * 100) / 100;
    }
  }

  // Parking spaces adjustment
  if (input.parkingSpaces != null && input.parkingSpaces > 0) {
    adjustments["parking"] = input.parkingSpaces * 5;
  }

  // Features premium
  if (input.features && input.features.length > 0) {
    let featureAdj = 0;
    for (const feature of input.features) {
      const key = feature.toLowerCase().trim();
      if (FEATURE_PREMIUMS[key]) {
        featureAdj += FEATURE_PREMIUMS[key];
      }
    }
    if (featureAdj > 0) {
      // Cap feature premium at 25%
      adjustments["features"] = Math.min(25, featureAdj);
    }
  }

  // Condition adjustment
  if (input.condition) {
    const condAdj = CONDITION_ADJUSTMENTS[input.condition.toLowerCase()];
    if (condAdj !== undefined && condAdj !== 0) {
      adjustments["condition"] = condAdj;
    }
  }

  // Age adjustment: -0.5% per year over 10 years
  if (input.yearBuilt) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - input.yearBuilt;
    if (age > 10) {
      const ageAdj = -0.5 * (age - 10);
      adjustments["age"] = Math.max(-20, ageAdj); // Cap at -20%
    }
  }

  // Step 4: Calculate final value
  const totalAdjustment = Object.values(adjustments).reduce((sum, adj) => sum + adj, 0);
  const adjustedPricePerSqm = basePricePerSqm * (1 + totalAdjustment / 100);
  const estimatedValue = Math.round(adjustedPricePerSqm * input.area);
  const pricePerSqm = Math.round(adjustedPricePerSqm * 100) / 100;

  // Step 5: Calculate range based on confidence
  const rangePct = confidenceScore >= 70 ? 0.1 : confidenceScore >= 40 ? 0.15 : 0.2;
  const minValue = Math.round(estimatedValue * (1 - rangePct));
  const maxValue = Math.round(estimatedValue * (1 + rangePct));

  // Step 6: Generate methodology text
  const methodology = generateMethodology(input, comparables.length, adjustments, confidenceScore, basePricePerSqm);

  return {
    estimatedValue,
    minValue,
    maxValue,
    pricePerSqm,
    confidenceScore: Math.round(confidenceScore * 10) / 10,
    comparables: comparables.slice(0, 10), // Return top 10
    adjustments,
    marketTrend,
    methodology,
  };
}

/**
 * Generate professional methodology text
 */
function generateMethodology(
  input: ValuationInput,
  comparablesCount: number,
  adjustments: Record<string, number>,
  confidence: number,
  basePricePerSqm: number
): string {
  const parts: string[] = [];

  parts.push(
    `A avaliacao foi realizada pelo metodo comparativo direto de dados de mercado, ` +
    `analisando imoveis similares na regiao de ${input.city}/${input.state}.`
  );

  if (comparablesCount > 0) {
    parts.push(
      `Foram identificados ${comparablesCount} imoveis comparaveis no banco de dados, ` +
      `com preco medio por m2 de R$ ${basePricePerSqm.toFixed(2)}.`
    );
  } else {
    parts.push(
      `Nao foram encontrados imoveis diretamente comparaveis. A estimativa foi baseada ` +
      `em indices de mercado gerais para a regiao.`
    );
  }

  const adjDescriptions: string[] = [];
  if (adjustments.area) {
    adjDescriptions.push(
      `area (${adjustments.area > 0 ? "+" : ""}${adjustments.area.toFixed(1)}%)`
    );
  }
  if (adjustments.bedrooms) {
    adjDescriptions.push(
      `dormitorios (${adjustments.bedrooms > 0 ? "+" : ""}${adjustments.bedrooms.toFixed(1)}%)`
    );
  }
  if (adjustments.bathrooms) {
    adjDescriptions.push(
      `banheiros (${adjustments.bathrooms > 0 ? "+" : ""}${adjustments.bathrooms.toFixed(1)}%)`
    );
  }
  if (adjustments.parking) {
    adjDescriptions.push(`vagas (+${adjustments.parking.toFixed(1)}%)`);
  }
  if (adjustments.features) {
    adjDescriptions.push(`diferenciais (+${adjustments.features.toFixed(1)}%)`);
  }
  if (adjustments.condition) {
    adjDescriptions.push(
      `estado de conservacao (${adjustments.condition > 0 ? "+" : ""}${adjustments.condition.toFixed(1)}%)`
    );
  }
  if (adjustments.age) {
    adjDescriptions.push(`idade do imovel (${adjustments.age.toFixed(1)}%)`);
  }

  if (adjDescriptions.length > 0) {
    parts.push(
      `Foram aplicados ajustes por: ${adjDescriptions.join(", ")}.`
    );
  }

  if (confidence < 40) {
    parts.push(
      `ATENCAO: O indice de confianca esta baixo (${confidence.toFixed(1)}%) devido a quantidade ` +
      `limitada de dados comparaveis. Recomenda-se complementar esta avaliacao com vistorias ` +
      `presenciais e analise de mercado local.`
    );
  } else if (confidence < 70) {
    parts.push(
      `O indice de confianca moderado (${confidence.toFixed(1)}%) sugere que a estimativa pode ` +
      `ser refinada com dados adicionais de mercado.`
    );
  } else {
    parts.push(
      `O indice de confianca alto (${confidence.toFixed(1)}%) indica boa representatividade ` +
      `dos dados utilizados na avaliacao.`
    );
  }

  parts.push(
    `Tipo de imovel: ${input.propertyType} | Categoria: ${input.category === "sale" ? "Venda" : "Aluguel"} | ` +
    `Area: ${input.area}m2${input.bedrooms ? ` | Dormitorios: ${input.bedrooms}` : ""}` +
    `${input.bathrooms ? ` | Banheiros: ${input.bathrooms}` : ""}.`
  );

  return parts.join(" ");
}

/**
 * Recalculate market indices from existing properties in the database
 */
export async function recalculateMarketIndices(tenantId: string): Promise<number> {
  // Get all properties for the tenant
  const allProperties = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.tenantId, tenantId));

  if (allProperties.length === 0) return 0;

  // Group properties by city + state + type + category
  const groups: Record<
    string,
    {
      city: string;
      state: string;
      propertyType: string;
      category: string;
      prices: number[];
      pricesPerSqm: number[];
    }
  > = {};

  for (const prop of allProperties) {
    const price = parseFloat(prop.price || "0");
    const area = prop.area || 0;
    if (price <= 0) continue;

    const key = `${prop.city.toLowerCase()}|${prop.state.toLowerCase()}|${prop.type}|${prop.category}`;
    if (!groups[key]) {
      groups[key] = {
        city: prop.city,
        state: prop.state,
        propertyType: prop.type,
        category: prop.category,
        prices: [],
        pricesPerSqm: [],
      };
    }

    groups[key].prices.push(price);
    if (area > 0) {
      groups[key].pricesPerSqm.push(price / area);
    }
  }

  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
  let createdCount = 0;

  // Delete existing indices for current period
  await db
    .delete(schema.marketIndices)
    .where(
      and(
        eq(schema.marketIndices.tenantId, tenantId),
        eq(schema.marketIndices.period, currentPeriod)
      )
    );

  // Create new indices
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    if (group.pricesPerSqm.length === 0) continue;

    const sortedPrices = [...group.prices].sort((a, b) => a - b);
    const sortedPricesPerSqm = [...group.pricesPerSqm].sort((a, b) => a - b);

    const medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
    const avgPricePerSqm =
      sortedPricesPerSqm.reduce((sum, p) => sum + p, 0) / sortedPricesPerSqm.length;

    // Check previous period for trend
    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 3);
    const prevPeriod = prevDate.toISOString().slice(0, 7);

    const [prevIndex] = await db
      .select()
      .from(schema.marketIndices)
      .where(
        and(
          eq(schema.marketIndices.tenantId, tenantId),
          eq(schema.marketIndices.city, group.city),
          eq(schema.marketIndices.propertyType, group.propertyType),
          eq(schema.marketIndices.category, group.category),
          eq(schema.marketIndices.period, prevPeriod)
        )
      )
      .limit(1);

    let trend = "stable";
    let trendPercentage = 0;

    if (prevIndex && prevIndex.avgPricePerSqm) {
      trendPercentage =
        ((avgPricePerSqm - prevIndex.avgPricePerSqm) / prevIndex.avgPricePerSqm) * 100;
      if (trendPercentage > 2) trend = "up";
      else if (trendPercentage < -2) trend = "down";
    }

    await db.insert(schema.marketIndices).values({
      id: nanoid(),
      tenantId,
      city: group.city,
      state: group.state,
      propertyType: group.propertyType,
      category: group.category,
      avgPricePerSqm: Math.round(avgPricePerSqm * 100) / 100,
      medianPrice: Math.round(medianPrice * 100) / 100,
      sampleSize: group.prices.length,
      trend,
      trendPercentage: Math.round(trendPercentage * 100) / 100,
      period: currentPeriod,
      createdAt: new Date().toISOString(),
    });

    createdCount++;
  }

  return createdCount;
}

/**
 * Get price map data by neighborhood
 */
export async function getPriceMapData(
  tenantId: string,
  city?: string,
  category?: string
): Promise<
  Array<{
    neighborhood: string;
    city: string;
    avgPricePerSqm: number;
    medianPrice: number;
    count: number;
    propertyType: string;
  }>
> {
  const allProperties = await db
    .select()
    .from(schema.properties)
    .where(eq(schema.properties.tenantId, tenantId));

  const groups: Record<
    string,
    { neighborhood: string; city: string; propertyType: string; prices: number[]; pricesPerSqm: number[] }
  > = {};

  for (const prop of allProperties) {
    const price = parseFloat(prop.price || "0");
    const area = prop.area || 0;
    if (price <= 0 || area <= 0) continue;

    if (city && prop.city.toLowerCase() !== city.toLowerCase()) continue;
    if (category && prop.category.toLowerCase() !== category.toLowerCase()) continue;

    // Use address as pseudo-neighborhood
    const neighborhood = prop.address.split(",")[0]?.trim() || prop.address;

    const key = `${neighborhood}|${prop.city}|${prop.type}`;
    if (!groups[key]) {
      groups[key] = {
        neighborhood,
        city: prop.city,
        propertyType: prop.type,
        prices: [],
        pricesPerSqm: [],
      };
    }

    groups[key].prices.push(price);
    groups[key].pricesPerSqm.push(price / area);
  }

  return Object.values(groups).map((group) => {
    const sortedPrices = [...group.prices].sort((a, b) => a - b);
    return {
      neighborhood: group.neighborhood,
      city: group.city,
      propertyType: group.propertyType,
      avgPricePerSqm:
        Math.round(
          (group.pricesPerSqm.reduce((s, p) => s + p, 0) / group.pricesPerSqm.length) * 100
        ) / 100,
      medianPrice: sortedPrices[Math.floor(sortedPrices.length / 2)],
      count: group.prices.length,
    };
  });
}
