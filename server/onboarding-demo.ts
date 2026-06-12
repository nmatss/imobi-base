/**
 * Onboarding Demo Data
 *
 * Popula o tenant recém-criado com dados de exemplo realistas (imóveis,
 * leads, visitas e lançamentos financeiros) para que o usuário veja o
 * dashboard "vivo" logo após o onboarding (aha moment), em vez de telas
 * vazias.
 *
 * Marcação: NÃO há coluna dedicada no schema — todos os registros criados
 * recebem o prefixo `[Exemplo] ` no título/nome/descrição (e nas notas das
 * visitas). A remoção varre o tenant procurando esse prefixo, portanto é
 * idempotente e segura: nunca toca em registros criados pelo usuário.
 */

import { storage } from "./storage";
import type { InsertProperty, InsertLead, InsertVisit, InsertFinanceEntry } from "@shared/schema-sqlite";

export const DEMO_PREFIX = "[Exemplo] ";

const isDemo = (text: string | null | undefined) =>
  typeof text === "string" && text.startsWith(DEMO_PREFIX);

/**
 * Datas relativas (ISO) para que os dados pareçam sempre recentes.
 * O storage aceita ISO strings em ambos os dialetos (SQLite text /
 * Postgres timestamp) — mesmo caminho das rotas /api/visits e
 * /api/finance-entries.
 */
const daysFromNow = (days: number, hour = 10): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

/**
 * Imóveis/leads de exemplo carregam arrays (features, images, interests) —
 * o storage serializa para JSON no SQLite e passa direto no Postgres
 * (text[]), exatamente como server/seed.ts. O tipo Insert* do schema-sqlite
 * declara esses campos como string (JSON), por isso o cast no call site.
 */
type WithArrays<T, K extends keyof T> = Omit<T, K> & { [P in K]?: string[] | null };
type DemoProperty = WithArrays<InsertProperty, "features" | "images">;
type DemoLead = WithArrays<InsertLead, "interests">;

// URLs do Unsplash já usadas no seed do projeto (server/seed.ts e
// script/seed-supabase.ts) — reaproveitadas para não introduzir domínios novos.
const IMG = {
  apartmentModern: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800",
  apartmentInterior: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  house: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
  penthouse: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  building: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
  houseCondo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
  studio: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
};

/**
 * Verifica se o tenant já possui dados de exemplo (qualquer imóvel ou lead
 * com o prefixo). Usado para garantir idempotência do POST.
 */
export async function hasDemoData(tenantId: string): Promise<boolean> {
  const [properties, leads] = await Promise.all([
    storage.getPropertiesByTenant(tenantId),
    storage.getLeadsByTenant(tenantId),
  ]);
  return properties.some((p) => isDemo(p.title)) || leads.some((l) => isDemo(l.name));
}

export interface DemoSeedResult {
  properties: number;
  leads: number;
  visits: number;
  financeEntries: number;
  ids: {
    propertyIds: string[];
    leadIds: string[];
    visitIds: string[];
    financeEntryIds: string[];
  };
}

/**
 * Cria os dados de exemplo no tenant. Assume que `hasDemoData` já foi
 * verificado pelo caller (a rota retorna 409 caso contrário).
 */
export async function seedDemoData(tenantId: string, userId?: string): Promise<DemoSeedResult> {
  // ---------- Imóveis (6) ----------
  const demoProperties: DemoProperty[] = [
    {
      tenantId,
      title: `${DEMO_PREFIX}Apartamento 3 Quartos em Pinheiros`,
      description:
        "Apartamento reformado com varanda gourmet, 2 vagas e lazer completo. A 5 min do metrô Faria Lima.",
      type: "apartment",
      category: "sale",
      price: "980000",
      address: "Rua dos Pinheiros, 800",
      city: "São Paulo",
      state: "SP",
      zipCode: "05422-001",
      bedrooms: 3,
      bathrooms: 2,
      area: 110,
      features: ["Varanda Gourmet", "2 Vagas", "Academia", "Piscina"],
      images: [IMG.apartmentModern, IMG.apartmentInterior],
      status: "available",
      featured: true,
    },
    {
      tenantId,
      title: `${DEMO_PREFIX}Casa com Quintal na Vila Mariana`,
      description:
        "Casa térrea com quintal amplo, churrasqueira e edícula. Rua tranquila próxima ao Parque Ibirapuera.",
      type: "house",
      category: "sale",
      price: "1250000",
      address: "Rua Domingos de Morais, 1200",
      city: "São Paulo",
      state: "SP",
      zipCode: "04010-100",
      bedrooms: 4,
      bathrooms: 3,
      area: 220,
      features: ["Quintal", "Churrasqueira", "Edícula", "3 Vagas"],
      images: [IMG.house],
      status: "available",
      featured: false,
    },
    {
      tenantId,
      title: `${DEMO_PREFIX}Studio Mobiliado no Itaim Bibi`,
      description:
        "Studio compacto totalmente mobiliado, pronto para morar. Condomínio com coworking e lavanderia.",
      type: "apartment",
      category: "rent",
      price: "3200",
      address: "Rua João Cachoeira, 460",
      city: "São Paulo",
      state: "SP",
      zipCode: "04535-001",
      bedrooms: 1,
      bathrooms: 1,
      area: 38,
      features: ["Mobiliado", "Coworking", "Lavanderia", "Portaria 24h"],
      images: [IMG.studio],
      status: "available",
      featured: false,
    },
    {
      tenantId,
      title: `${DEMO_PREFIX}Cobertura Duplex em Moema`,
      description:
        "Cobertura duplex com terraço, espaço gourmet e vista livre para o Ibirapuera. Alto padrão de acabamento.",
      type: "apartment",
      category: "sale",
      price: "2400000",
      address: "Av. Ibirapuera, 2100",
      city: "São Paulo",
      state: "SP",
      zipCode: "04028-001",
      bedrooms: 4,
      bathrooms: 4,
      area: 280,
      features: ["Terraço", "Espaço Gourmet", "Vista Livre", "4 Vagas"],
      images: [IMG.penthouse, IMG.building],
      status: "available",
      featured: true,
    },
    {
      tenantId,
      title: `${DEMO_PREFIX}Sala Comercial na Av. Paulista`,
      description:
        "Sala comercial com copa e 1 vaga em prédio com recepção e segurança 24h. Ideal para escritórios e consultórios.",
      type: "commercial",
      category: "rent",
      price: "5800",
      address: "Av. Paulista, 1500 - Conj. 1204",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-100",
      bedrooms: null,
      bathrooms: 1,
      area: 65,
      features: ["Copa", "1 Vaga", "Segurança 24h", "Ar-condicionado"],
      images: [IMG.office],
      status: "available",
      featured: false,
    },
    {
      tenantId,
      title: `${DEMO_PREFIX}Casa em Condomínio no Morumbi`,
      description:
        "Casa em condomínio fechado com piscina, área verde e segurança. Perfeita para famílias.",
      type: "house",
      category: "rent",
      price: "8500",
      address: "Rua Dr. Flávio Américo Maurano, 300",
      city: "São Paulo",
      state: "SP",
      zipCode: "05668-010",
      bedrooms: 3,
      bathrooms: 3,
      area: 180,
      features: ["Condomínio Fechado", "Piscina", "Área Verde", "2 Vagas"],
      images: [IMG.houseCondo],
      status: "available",
      featured: false,
    },
  ];

  const propertyIds: string[] = [];
  const createdProperties = [];
  for (const prop of demoProperties) {
    const created = await storage.createProperty(prop as unknown as InsertProperty);
    propertyIds.push(created.id);
    createdProperties.push(created);
  }

  // ---------- Leads (8) distribuídos pelo funil ----------
  // Status reais do kanban (client/src/pages/leads/kanban.tsx):
  // new → qualification → visit → proposal → contract
  const demoLeads: DemoLead[] = [
    {
      tenantId,
      name: `${DEMO_PREFIX}Ana Oliveira`,
      email: "ana.oliveira@example.com",
      phone: "(11) 98765-1001",
      source: "Site",
      status: "new",
      budget: "950000",
      interests: ["apartment"],
      preferredType: "apartment",
      preferredCategory: "sale",
      preferredCity: "São Paulo",
      preferredNeighborhood: "Pinheiros",
      notes: "Procura apartamento de 3 quartos perto do metrô.",
    },
    {
      tenantId,
      name: `${DEMO_PREFIX}Bruno Costa`,
      email: "bruno.costa@example.com",
      phone: "(11) 98765-1002",
      source: "WhatsApp",
      status: "new",
      budget: "4000",
      interests: ["apartment"],
      preferredType: "apartment",
      preferredCategory: "rent",
      preferredCity: "São Paulo",
      notes: "Quer alugar studio mobiliado, urgência de 30 dias.",
    },
    {
      tenantId,
      name: `${DEMO_PREFIX}Carla Mendes`,
      email: "carla.mendes@example.com",
      phone: "(11) 98765-1003",
      source: "Instagram",
      status: "qualification",
      budget: "1300000",
      interests: ["house"],
      preferredType: "house",
      preferredCategory: "sale",
      preferredCity: "São Paulo",
      preferredNeighborhood: "Vila Mariana",
      notes: "Família com 2 filhos, busca casa com quintal.",
    },
    {
      tenantId,
      name: `${DEMO_PREFIX}Diego Ferreira`,
      email: "diego.ferreira@example.com",
      phone: "(11) 98765-1004",
      source: "Portal",
      status: "qualification",
      budget: "6000",
      interests: ["commercial"],
      preferredType: "commercial",
      preferredCategory: "rent",
      preferredCity: "São Paulo",
      notes: "Abrindo consultório, precisa de sala na região da Paulista.",
    },
    {
      tenantId,
      name: `${DEMO_PREFIX}Eduarda Lima`,
      email: "eduarda.lima@example.com",
      phone: "(11) 98765-1005",
      source: "Indicação",
      status: "visit",
      budget: "2500000",
      interests: ["apartment"],
      preferredType: "apartment",
      preferredCategory: "sale",
      preferredCity: "São Paulo",
      preferredNeighborhood: "Moema",
      notes: "Interessada na cobertura em Moema, visita agendada.",
    },
    {
      tenantId,
      name: `${DEMO_PREFIX}Felipe Souza`,
      email: "felipe.souza@example.com",
      phone: "(11) 98765-1006",
      source: "Telefone",
      status: "visit",
      budget: "9000",
      interests: ["house"],
      preferredType: "house",
      preferredCategory: "rent",
      preferredCity: "São Paulo",
      preferredNeighborhood: "Morumbi",
      notes: "Mudança corporativa, quer visitar casa em condomínio.",
    },
    {
      tenantId,
      name: `${DEMO_PREFIX}Gabriela Rocha`,
      email: "gabriela.rocha@example.com",
      phone: "(11) 98765-1007",
      source: "Site",
      status: "proposal",
      budget: "1000000",
      interests: ["apartment"],
      preferredType: "apartment",
      preferredCategory: "sale",
      preferredCity: "São Paulo",
      notes: "Proposta enviada para o apartamento de Pinheiros, aguardando retorno.",
    },
    {
      tenantId,
      name: `${DEMO_PREFIX}Henrique Alves`,
      email: "henrique.alves@example.com",
      phone: "(11) 98765-1008",
      source: "Indicação",
      status: "contract",
      budget: "3500",
      interests: ["apartment"],
      preferredType: "apartment",
      preferredCategory: "rent",
      preferredCity: "São Paulo",
      notes: "Contrato de locação do studio assinado este mês.",
    },
  ];

  const leadIds: string[] = [];
  const createdLeads = [];
  for (const lead of demoLeads) {
    const created = await storage.createLead(lead as unknown as InsertLead);
    leadIds.push(created.id);
    createdLeads.push(created);
  }

  // ---------- Visitas (2) ----------
  // Vinculadas a imóveis e leads de exemplo; notas recebem o prefixo para a
  // limpeza encontrar as visitas sem depender de join.
  const demoVisits: InsertVisit[] = [
    {
      tenantId,
      propertyId: createdProperties[3].id, // Cobertura Duplex em Moema
      leadId: createdLeads[4].id, // Eduarda Lima (status visit)
      scheduledFor: daysFromNow(1, 10),
      status: "scheduled",
      notes: `${DEMO_PREFIX}Visita com a cliente Eduarda — confirmar portaria do condomínio.`,
      assignedTo: userId ?? null,
    },
    {
      tenantId,
      propertyId: createdProperties[5].id, // Casa em Condomínio no Morumbi
      leadId: createdLeads[5].id, // Felipe Souza (status visit)
      scheduledFor: daysFromNow(3, 15),
      status: "scheduled",
      notes: `${DEMO_PREFIX}Visita com o cliente Felipe — levar tabela de valores do condomínio.`,
      assignedTo: userId ?? null,
    },
  ];

  const visitIds: string[] = [];
  for (const visit of demoVisits) {
    const created = await storage.createVisit(visit);
    visitIds.push(created.id);
  }

  // ---------- Lançamentos financeiros (4) ----------
  // Garante as categorias padrão do tenant e usa as existentes (sem criar
  // categorias com prefixo: a limpeza remove apenas os lançamentos).
  const categories = await storage.seedDefaultCategories(tenantId);
  const allCategories = categories.length
    ? categories
    : await storage.getFinanceCategoriesByTenant(tenantId);
  const incomeCategory = allCategories.find((c) => c.type === "income");
  const expenseCategory = allCategories.find((c) => c.type === "expense");

  const demoEntries: InsertFinanceEntry[] = [
    {
      tenantId,
      categoryId: incomeCategory?.id ?? null,
      description: `${DEMO_PREFIX}Comissão — venda apartamento Pinheiros`,
      amount: "29400",
      flow: "income",
      entryDate: daysFromNow(-10),
      status: "completed",
    },
    {
      tenantId,
      categoryId: incomeCategory?.id ?? null,
      description: `${DEMO_PREFIX}Taxa administrativa — locação studio Itaim`,
      amount: "320",
      flow: "income",
      entryDate: daysFromNow(-5),
      status: "completed",
    },
    {
      tenantId,
      categoryId: expenseCategory?.id ?? null,
      description: `${DEMO_PREFIX}Anúncios em portais imobiliários`,
      amount: "850",
      flow: "expense",
      entryDate: daysFromNow(-7),
      status: "completed",
    },
    {
      tenantId,
      categoryId: expenseCategory?.id ?? null,
      description: `${DEMO_PREFIX}Material de escritório e impressões`,
      amount: "240",
      flow: "expense",
      entryDate: daysFromNow(-2),
      status: "completed",
    },
  ];

  const financeEntryIds: string[] = [];
  for (const entry of demoEntries) {
    const created = await storage.createFinanceEntry(entry);
    financeEntryIds.push(created.id);
  }

  return {
    properties: propertyIds.length,
    leads: leadIds.length,
    visits: visitIds.length,
    financeEntries: financeEntryIds.length,
    ids: { propertyIds, leadIds, visitIds, financeEntryIds },
  };
}

export interface DemoRemoveResult {
  properties: number;
  leads: number;
  visits: number;
  financeEntries: number;
}

/**
 * Remove todos os registros de exemplo do tenant (prefixo `[Exemplo] `).
 * Ordem respeita as FKs: lançamentos → visitas → leads → imóveis.
 * É no-op (retorna zeros) se não houver dados de exemplo.
 */
export async function removeDemoData(tenantId: string): Promise<DemoRemoveResult> {
  const [properties, leads, visits, entries] = await Promise.all([
    storage.getPropertiesByTenant(tenantId),
    storage.getLeadsByTenant(tenantId),
    storage.getVisitsByTenant(tenantId),
    storage.getFinanceEntriesByTenant(tenantId),
  ]);

  const demoPropertyIds = new Set(properties.filter((p) => isDemo(p.title)).map((p) => p.id));
  const demoLeadIds = new Set(leads.filter((l) => isDemo(l.name)).map((l) => l.id));

  // Visitas: pelas notas com prefixo OU vinculadas a imóvel/lead de exemplo
  // (necessário para não violar a FK property_id ao excluir os imóveis).
  const demoVisits = visits.filter(
    (v) =>
      isDemo(v.notes) ||
      demoPropertyIds.has(v.propertyId) ||
      (v.leadId != null && demoLeadIds.has(v.leadId)),
  );

  const demoEntries = entries.filter((e) => isDemo(e.description));

  for (const entry of demoEntries) {
    await storage.deleteFinanceEntry(entry.id);
  }
  for (const visit of demoVisits) {
    await storage.deleteVisit(visit.id);
  }
  for (const leadId of demoLeadIds) {
    await storage.deleteLead(leadId);
  }
  for (const propertyId of demoPropertyIds) {
    await storage.deleteProperty(propertyId);
  }

  return {
    properties: demoPropertyIds.size,
    leads: demoLeadIds.size,
    visits: demoVisits.length,
    financeEntries: demoEntries.length,
  };
}
