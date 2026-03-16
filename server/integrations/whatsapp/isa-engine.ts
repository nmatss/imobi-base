/**
 * ISA Engine - Inside Sales Agent for WhatsApp
 *
 * Rule-based NLP engine that qualifies leads 24/7 via WhatsApp.
 * Uses keyword matching and conversation flow stages (no external AI API).
 *
 * Conversation flow: GREETING -> IDENTIFY_INTEREST -> QUALIFY_BUDGET ->
 *   QUALIFY_TIMELINE -> QUALIFY_NEED -> RECOMMEND -> SCHEDULE_VISIT -> TRANSFER
 */

import { storage } from "../../storage";
import type { Property, IsaConversation } from "@shared/schema-sqlite";
import { log } from "../../index";

// ==================== TYPES ====================

export type ConversationStage =
  | "greeting"
  | "identify_interest"
  | "qualify_budget"
  | "qualify_timeline"
  | "qualify_need"
  | "recommend"
  | "schedule_visit"
  | "transfer";

export interface QualificationData {
  budget?: string;
  budgetValue?: number;
  authority?: string; // decision_maker, influencer, unknown
  need?: string;
  timeline?: string; // urgent, 1month, 3months, 6months, no_rush, unknown
  score: number;
}

export interface SearchCriteria {
  type?: string; // apartamento, casa, terreno, comercial
  category?: string; // venda, aluguel
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  keywords?: string[];
}

export type Intent =
  | "greeting"
  | "property_search"
  | "budget_info"
  | "timeline_info"
  | "schedule_visit"
  | "faq"
  | "human_transfer"
  | "affirmative"
  | "negative"
  | "name_info"
  | "offensive"
  | "unknown";

// ==================== INTENT DETECTION ====================

const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  greeting: [
    /^(oi|ol[aá]|bom\s*dia|boa\s*(tarde|noite)|e\s*a[ií]|opa|hey|hi|hello|fala|salve|tudo\s*bem)/i,
  ],
  property_search: [
    /procur(o|ando)\s*(um|uma|apartamento|casa|im[oó]vel|terreno|sala|loja|kit)/i,
    /quer(o|ia)\s*(um|uma|comprar|alugar|ver|conhecer)/i,
    /tem\s*(algo|algum|alguma|im[oó]vel|apartamento|casa)/i,
    /interest(e|ado|ada)\s*(em|no|na|num|numa)/i,
    /procur(o|ando)\s*(em|no|na|perto)/i,
    /(apartamento|casa|terreno|im[oó]vel|sala|cobertura|kit|kitnet|loft|sobrado|ch[aá]cara|s[ií]tio)/i,
    /(comprar|alugar|vend|alugu[eé])/i,
    /quartos?\s*\d|\d\s*quartos?/i,
    /(quero|preciso)\s*(de\s*)?(um|uma|morar|mudar)/i,
  ],
  budget_info: [
    /(or[cç]amento|budget)\s*([eé]|de|at[eé])/i,
    /poss?o\s*pagar\s*(at[eé]|no\s*m[aá]ximo)/i,
    /quanto\s*(custa|vale|[eé]|fica|sai)/i,
    /pre[cç]o|valor/i,
    /at[eé]\s*R?\$?\s*[\d.,]+/i,
    /R?\$\s*[\d.,]+/i,
    /(mil|milh[oõã]|reais)/i,
    /financ(iar|iamento|io)/i,
    /parcela|entrada|sinal/i,
  ],
  timeline_info: [
    /(urgen(te|cia)|r[aá]pido|preciso\s*(logo|j[aá]|urgente))/i,
    /(sem\s*pressa|n[aã]o\s*tenho\s*pressa|tranquilo|com\s*calma)/i,
    /(m[eê]s\s*que\s*vem|pr[oó]ximo\s*m[eê]s|semana\s*que\s*vem)/i,
    /(esse\s*(m[eê]s|ano)|at[eé]\s*o\s*final\s*d[eo])/i,
    /(quando|prazo|data|tempo)/i,
    /(\d+\s*(dias?|semanas?|meses?|m[eê]s))/i,
    /(mudan[cç]a|mudar)/i,
  ],
  schedule_visit: [
    /(quero|posso|gostaria)\s*(de\s*)?(visitar|ver|conhecer|agendar)/i,
    /agendar?\s*(uma?\s*)?(visita|horario|hor[aá]rio)/i,
    /visita(r|[cç][aã]o)?/i,
    /(marcar|combinar)\s*(uma?\s*)?(visita|horario)/i,
    /(quando|qual)\s*(posso|consigo|d[aá])\s*(ir|visitar|ver)/i,
    /hor[aá]rio\s*(dispon[ií]vel|livre)/i,
  ],
  faq: [
    /(hor[aá]rio|funcionamento|aberto|atendimento)/i,
    /document(o|a[cç][aã]o|os)/i,
    /financ(iamento|iar)/i,
    /(como\s*funciona|como\s*fa[cç]o|como\s*[eé])/i,
    /condom[ií]nio|taxa|iptu/i,
    /(aceita|tem)\s*(pet|animal|cachorro|gato)/i,
    /(garagem|vaga|estacionamento)/i,
    /(seguran[cç]a|portaria|port[aã]o)/i,
    /(reforma|reformar|obra)/i,
    /escrit(ura|ório)/i,
  ],
  human_transfer: [
    /(falar|conversar)\s*(com|c\/)\s*(um\s*)?(corretor|atendente|pessoa|humano|real|algu[eé]m)/i,
    /(atendente|corretor|humano|pessoa\s*real)/i,
    /(preciso|quero)\s*(falar|ajuda|atendimento)\s*(humano|real|pessoal)?/i,
    /n[aã]o\s*(estou|est[aá])\s*(entendendo|conseguindo)/i,
    /rob[oô]|bot|m[aá]quina|autom[aá]tico/i,
  ],
  affirmative: [
    /^(sim|s|claro|com\s*certeza|isso|exato|correto|positivo|ok|pode\s*ser|beleza|bora|vamos|top|show|massa|demais|perfeito|legal|blz|tá|ta|uhum)/i,
  ],
  negative: [
    /^(n[aã]o|nop|nah|negativo|nem|nunca|de\s*jeito\s*nenhum|nada|nope)/i,
  ],
  name_info: [
    /^(meu\s*nome\s*[eé]\s*|me\s*chamo\s*|sou\s*(o|a)\s*|eu\s*sou\s*(o|a)?\s*)/i,
    /^[A-Z][a-záéíóúãõâêîôûç]+(\s+[A-Z][a-záéíóúãõâêîôûç]+){0,3}$/,
  ],
  offensive: [
    /(porra|merda|caralho|fod[aeiou]|put[ao]|vai\s*(se\s*)?f[ou]d|idiota|burr[oa]|lixo|bost[ao])/i,
  ],
  unknown: [],
};

function detectIntent(message: string): Intent {
  const trimmed = message.trim();
  if (!trimmed) return "unknown";

  // Check each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === "unknown") continue;
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return intent as Intent;
      }
    }
  }
  return "unknown";
}

function detectMultipleIntents(message: string): Intent[] {
  const trimmed = message.trim();
  if (!trimmed) return ["unknown"];

  const detected: Intent[] = [];
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === "unknown") continue;
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        detected.push(intent as Intent);
        break;
      }
    }
  }
  return detected.length > 0 ? detected : ["unknown"];
}

// ==================== DATA EXTRACTORS ====================

function extractBudget(message: string): { raw: string; value: number } | null {
  // Match R$ 300.000 or 300000 or 300k or 300 mil
  const patterns = [
    /R?\$\s*([\d.,]+)\s*(mil(h[oõã][eõ]s|[aã]o)?|k|m)?/i,
    /at[eé]\s*R?\$?\s*([\d.,]+)\s*(mil(h[oõã][eõ]s|[aã]o)?|k|m)?/i,
    /([\d.,]+)\s*(mil(h[oõã][eõ]s|[aã]o)?|k|m)\s*(reais)?/i,
    /([\d.,]+)\s*reais/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      let numStr = match[1].replace(/\./g, "").replace(",", ".");
      let value = parseFloat(numStr);
      const multiplier = match[2]?.toLowerCase();
      if (multiplier) {
        if (/milh[oõã]|m$/i.test(multiplier)) value *= 1_000_000;
        else if (/mil|k$/i.test(multiplier)) value *= 1_000;
      }
      if (value > 0 && value < 100) {
        // Probably means thousands or millions
        if (value < 10) value *= 1_000_000;
        else value *= 1_000;
      }
      return { raw: match[0], value };
    }
  }
  return null;
}

function extractPropertyType(message: string): string | null {
  const types: Record<string, RegExp> = {
    apartamento: /(apartamento|apto|ap\b)/i,
    casa: /(casa|sobrado|ch[aá]cara)/i,
    terreno: /(terreno|lote)/i,
    comercial: /(sala|loja|galpão|galp[aã]o|ponto\s*comercial|comercial)/i,
    cobertura: /(cobertura)/i,
    kitnet: /(kitnet|kit|loft|studio|est[uú]dio)/i,
  };

  for (const [type, pattern] of Object.entries(types)) {
    if (pattern.test(message)) return type;
  }
  return null;
}

function extractCategory(message: string): string | null {
  if (/(comprar|compra|venda|vender|adquirir)/i.test(message)) return "venda";
  if (/(alugar|aluguel|alugu[eé]|loca[cç][aã]o|arrendar)/i.test(message)) return "aluguel";
  return null;
}

function extractBedrooms(message: string): number | null {
  const match = message.match(/(\d+)\s*(quartos?|dormit[oó]rios?|su[ií]tes?|dorm)/i);
  if (match) return parseInt(match[1]);
  return null;
}

function extractCity(message: string): string | null {
  const match = message.match(/(em|no|na|perto\s*de|regi[aã]o\s*de)\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)/i);
  if (match) return match[2];
  return null;
}

function extractName(message: string): string | null {
  // "meu nome é X" or "me chamo X" or "sou o/a X"
  const patterns = [
    /meu\s*nome\s*[eé]\s*(.+)/i,
    /me\s*chamo\s*(.+)/i,
    /sou\s*(o|a)\s*(.+)/i,
    /eu\s*sou\s*(o|a)?\s*(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      const name = (match[2] || match[1]).trim();
      // Basic validation: at least 2 chars, mostly letters
      if (name.length >= 2 && /^[A-Za-záéíóúãõâêîôûçÁÉÍÓÚÃÕÂÊÎÔÛÇ\s]+$/.test(name)) {
        return name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      }
    }
  }
  return null;
}

function extractTimeline(message: string): string {
  if (/(urgen(te|cia)|r[aá]pido|j[aá]|imediato|logo)/i.test(message)) return "urgent";
  if (/(semana|pr[oó]xim[oa]\s*semana)/i.test(message)) return "1month";
  if (/(m[eê]s\s*que\s*vem|pr[oó]ximo\s*m[eê]s|esse\s*m[eê]s)/i.test(message)) return "1month";
  if (/(2|dois|duas)\s*meses/i.test(message)) return "3months";
  if (/(3|tr[eê]s)\s*meses/i.test(message)) return "3months";
  if (/(6|seis)\s*meses|semestre/i.test(message)) return "6months";
  if (/(sem\s*pressa|tranquilo|calma|n[aã]o\s*tenho\s*pressa)/i.test(message)) return "no_rush";
  return "unknown";
}

// ==================== BANT SCORING ====================

export function calculateLeadScore(data: QualificationData): number {
  let score = 0;

  // Budget (0-30 points)
  if (data.budgetValue && data.budgetValue > 0) {
    score += 30;
  } else if (data.budget) {
    score += 15;
  }

  // Authority (0-20 points)
  if (data.authority === "decision_maker") score += 20;
  else if (data.authority === "influencer") score += 10;
  else score += 5; // gave some info

  // Need (0-25 points)
  if (data.need && data.need.length > 10) score += 25;
  else if (data.need) score += 15;

  // Timeline (0-25 points)
  switch (data.timeline) {
    case "urgent": score += 25; break;
    case "1month": score += 20; break;
    case "3months": score += 15; break;
    case "6months": score += 10; break;
    case "no_rush": score += 5; break;
    default: score += 0;
  }

  return Math.min(100, score);
}

export function calculateLeadTemperature(qualificationData: QualificationData): "hot" | "warm" | "cold" {
  const score = qualificationData.score;
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

// ==================== PROPERTY MATCHING ====================

export async function matchProperties(tenantId: string, criteria: SearchCriteria): Promise<Property[]> {
  const allProperties = await storage.getPropertiesByTenant(tenantId, {
    type: criteria.type,
    category: criteria.category,
    status: "available",
  });

  return allProperties.filter(p => {
    // Filter by price range
    if (criteria.minPrice || criteria.maxPrice) {
      const price = parseFloat(p.price);
      if (criteria.minPrice && price < criteria.minPrice) return false;
      if (criteria.maxPrice && price > criteria.maxPrice) return false;
    }

    // Filter by bedrooms
    if (criteria.minBedrooms && p.bedrooms && p.bedrooms < criteria.minBedrooms) return false;
    if (criteria.maxBedrooms && p.bedrooms && p.bedrooms > criteria.maxBedrooms) return false;

    // Filter by city
    if (criteria.city && p.city.toLowerCase() !== criteria.city.toLowerCase()) {
      // Partial match
      if (!p.city.toLowerCase().includes(criteria.city.toLowerCase()) &&
          !criteria.city.toLowerCase().includes(p.city.toLowerCase())) {
        return false;
      }
    }

    return true;
  }).slice(0, 5); // Max 5 results
}

function formatPropertyForWhatsApp(property: Property, index: number): string {
  const price = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(property.price));
  const lines = [
    `\n${index + 1}. *${property.title}*`,
    `   💰 ${price}`,
  ];
  if (property.bedrooms) lines.push(`   🛏️ ${property.bedrooms} quarto${property.bedrooms > 1 ? "s" : ""}`);
  if (property.area) lines.push(`   📐 ${property.area}m²`);
  lines.push(`   📍 ${property.address}, ${property.city}`);
  if (property.features) {
    try {
      const features = JSON.parse(property.features);
      if (Array.isArray(features) && features.length > 0) {
        lines.push(`   ✨ ${features.slice(0, 3).join(", ")}`);
      }
    } catch { /* ignore */ }
  }
  return lines.join("\n");
}

// ==================== FAQ HANDLING ====================

const DEFAULT_FAQS: Record<string, string> = {
  horario: "📅 Nosso horário de atendimento é de segunda a sexta, das 08h às 18h, e sábados das 09h às 13h.",
  documentos: "📋 Para compra, você vai precisar de: RG, CPF, comprovante de renda, comprovante de residência e certidões negativas. Para aluguel: RG, CPF, comprovante de renda (3x o valor do aluguel) e fiador ou seguro fiança.",
  financiamento: "🏦 Sim, trabalhamos com financiamento! Você pode financiar até 80% do valor do imóvel em até 35 anos. Ajudamos com toda a documentação e simulação junto aos bancos parceiros.",
  como_funciona: "🔄 O processo é simples:\n1️⃣ Encontramos o imóvel ideal para você\n2️⃣ Agendamos uma visita\n3️⃣ Fazemos a proposta\n4️⃣ Cuidamos de toda a documentação\n5️⃣ Entrega das chaves! 🔑",
  condominio: "🏢 Os valores de condomínio variam de acordo com o empreendimento. Posso verificar o valor específico do imóvel que te interessa!",
  pet: "🐾 Depende do condomínio ou proprietário. Posso verificar se o imóvel que te interessa aceita pets!",
  garagem: "🚗 Verifico a disponibilidade de vagas de garagem no imóvel específico que te interessa.",
  seguranca: "🔒 Muitos dos nossos imóveis contam com portaria 24h, câmeras de segurança e controle de acesso. Posso filtrar por essas características!",
};

function findFaqAnswer(message: string, customFaqs?: Array<{ question: string; answer: string }>): string | null {
  // Check custom FAQs first
  if (customFaqs && customFaqs.length > 0) {
    for (const faq of customFaqs) {
      const keywords = faq.question.toLowerCase().split(/\s+/);
      const msgLower = message.toLowerCase();
      if (keywords.some(kw => kw.length > 3 && msgLower.includes(kw))) {
        return faq.answer;
      }
    }
  }

  // Check default FAQs
  const msgLower = message.toLowerCase();
  if (/hor[aá]rio|funcionamento|aberto|atendimento/i.test(msgLower)) return DEFAULT_FAQS.horario;
  if (/document|doc\b/i.test(msgLower)) return DEFAULT_FAQS.documentos;
  if (/financ/i.test(msgLower)) return DEFAULT_FAQS.financiamento;
  if (/como\s*(funciona|fa[cç]o|[eé])/i.test(msgLower)) return DEFAULT_FAQS.como_funciona;
  if (/condom[ií]nio|taxa/i.test(msgLower)) return DEFAULT_FAQS.condominio;
  if (/pet|animal|cachorro|gato/i.test(msgLower)) return DEFAULT_FAQS.pet;
  if (/garagem|vaga|estacionamento/i.test(msgLower)) return DEFAULT_FAQS.garagem;
  if (/seguran[cç]a|portaria/i.test(msgLower)) return DEFAULT_FAQS.seguranca;

  return null;
}

// ==================== RESPONSE GENERATION ====================

function getGreetingResponse(settings: any, tenantName: string, leadName?: string | null): string {
  const greeting = (settings?.greeting || "Ola! Sou a assistente virtual da {companyName}. Como posso ajudar?")
    .replace("{companyName}", tenantName);

  const nameGreeting = leadName ? `${leadName}, ` : "";

  const personality = settings?.personality || "professional";
  let followUp = "";
  switch (personality) {
    case "friendly":
      followUp = `\n\n${nameGreeting}Estou aqui pra te ajudar a encontrar o imovel dos seus sonhos! 🏡\nVoce esta procurando algo para *comprar* ou *alugar*?`;
      break;
    case "formal":
      followUp = `\n\n${nameGreeting}Estou a disposicao para auxilia-lo na busca do imovel ideal.\nPoderia me informar se tem interesse em *compra* ou *locacao*?`;
      break;
    default:
      followUp = `\n\n${nameGreeting}Posso te ajudar a encontrar o imovel perfeito!\nVoce esta buscando *comprar* ou *alugar*?`;
  }

  return greeting + followUp;
}

function getIdentifyInterestResponse(propertyType: string | null, category: string | null, city: string | null): string {
  const parts: string[] = [];

  if (propertyType && category) {
    parts.push(`Otimo! Voce esta procurando um *${propertyType}* para *${category}*. 👍`);
  } else if (propertyType) {
    parts.push(`Entendi, voce tem interesse em *${propertyType}*! 👍`);
    parts.push("E para *comprar* ou *alugar*?");
    return parts.join("\n");
  } else if (category) {
    parts.push(`Certo, voce quer *${category === "venda" ? "comprar" : "alugar"}*! 👍`);
    parts.push("Que tipo de imovel voce procura? (apartamento, casa, terreno, comercial)");
    return parts.join("\n");
  } else {
    return "Para te ajudar melhor, me conta:\n\n🏠 Que tipo de imovel voce procura?\n(apartamento, casa, terreno, comercial)\n\n📋 E voce quer *comprar* ou *alugar*?";
  }

  if (city) {
    parts.push(`Na regiao de *${city}*. 📍`);
  }

  parts.push("\n💰 Qual seria o seu orcamento aproximado?");

  return parts.join("\n");
}

function getBudgetResponse(budget: { raw: string; value: number }): string {
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(budget.value);
  return `Otimo! Orcamento de ate *${formatted}*. Anotado! ✅\n\n⏰ E qual seria o seu prazo? Voce precisa do imovel para quando?\n\n1️⃣ Urgente (proximo mes)\n2️⃣ Em 2-3 meses\n3️⃣ Em 6 meses\n4️⃣ Sem pressa`;
}

function getTimelineResponse(timeline: string): string {
  const labels: Record<string, string> = {
    urgent: "urgente",
    "1month": "proximo mes",
    "3months": "2-3 meses",
    "6months": "6 meses",
    no_rush: "sem pressa",
  };

  const label = labels[timeline] || timeline;
  return `Entendi, prazo *${label}*. ✅\n\nAgora, me conta um pouco mais sobre o que voce precisa:\n\n🛏️ Quantos quartos?\n📐 Tamanho minimo (em m²)?\n✨ Alguma caracteristica especial? (piscina, churrasqueira, varanda, etc.)`;
}

function getRecommendResponse(properties: Property[]): string {
  if (properties.length === 0) {
    return "😔 No momento nao encontrei imoveis que correspondam exatamente ao seu perfil.\n\nMas novos imoveis sao cadastrados toda semana! Vou manter seu perfil ativo e te aviso assim que surgir algo interessante. 🔔\n\nDeseja ajustar algum criterio de busca ou falar com um de nossos corretores?";
  }

  let response = `🎉 Encontrei *${properties.length} ${properties.length === 1 ? "imovel" : "imoveis"}* que combinam com o seu perfil:\n`;

  properties.forEach((prop, i) => {
    response += formatPropertyForWhatsApp(prop, i);
  });

  response += "\n\n📅 Gostaria de *agendar uma visita* em algum deles? Me diga o numero do imovel!";
  response += "\nOu se preferir, posso *transferir para um corretor* para mais detalhes.";

  return response;
}

function getScheduleResponse(propertyTitle?: string): string {
  if (propertyTitle) {
    return `Otimo! Vamos agendar sua visita ao *${propertyTitle}*! 📅\n\nQual a melhor data e horario para voce?\n\n🕐 Nossos horarios disponiveis sao:\n• Segunda a Sexta: 9h as 18h\n• Sabado: 9h as 13h`;
  }
  return "📅 Para agendar uma visita, me diga:\n\n1. Qual imovel voce quer visitar?\n2. Qual data e horario de preferencia?\n\n🕐 Atendemos de segunda a sexta (9h-18h) e sabados (9h-13h).";
}

function getTransferResponse(): string {
  return "👋 Entendi! Vou transferir voce para um dos nossos corretores especializados.\n\n📞 Um de nossos corretores entrara em contato com voce em breve.\n\nFoi um prazer atende-lo! Se precisar de algo mais, estou por aqui. 😊";
}

function getOffensiveResponse(): string {
  return "Entendo que voce pode estar frustrado, mas estou aqui para ajudar! 😊\n\nVamos focar em encontrar o imovel ideal para voce?\nOu, se preferir, posso transferir para um atendente humano.";
}

function getUnknownResponse(stage: ConversationStage): string {
  switch (stage) {
    case "greeting":
      return "Ola! 😊 Nao entendi muito bem. Voce esta procurando um imovel? Me conta o que voce precisa!\n\n🏠 Comprar ou alugar?\n📍 Em qual regiao?";
    case "identify_interest":
      return "Desculpa, nao consegui entender. Voce poderia me dizer:\n\n🏠 Que tipo de imovel procura? (apartamento, casa, terreno)\n📋 Quer *comprar* ou *alugar*?\n📍 Em qual cidade ou bairro?";
    case "qualify_budget":
      return "Para te ajudar melhor, preciso saber seu orcamento aproximado. 💰\n\nVoce pode me dizer um valor maximo? Ex: R$ 300.000 ou R$ 2.000/mes";
    case "qualify_timeline":
      return "E para quando voce precisa do imovel? ⏰\n\n1️⃣ Urgente\n2️⃣ Proximo mes\n3️⃣ 2-3 meses\n4️⃣ Sem pressa";
    case "qualify_need":
      return "Me conta um pouco mais sobre o que voce precisa no imovel:\n\n🛏️ Quantos quartos?\n📐 Tamanho?\n✨ Caracteristicas especiais?";
    default:
      return "Desculpa, nao entendi. 😅 Posso te ajudar com:\n\n🔍 Buscar imoveis\n📅 Agendar visitas\n❓ Responder duvidas\n👤 Transferir para um corretor\n\nO que voce prefere?";
  }
}

// ==================== MAIN ENGINE ====================

export async function processIncomingMessage(
  tenantId: string,
  phoneNumber: string,
  message: string
): Promise<string> {
  try {
    // Get or create conversation
    let conversation = await storage.getIsaConversationByPhone(tenantId, phoneNumber);

    // Get ISA settings
    const settings = await storage.getIsaSettings(tenantId);

    // Get tenant info
    const tenant = await storage.getTenant(tenantId);
    const tenantName = tenant?.name || "nossa imobiliaria";

    // Check if ISA is enabled
    if (settings && !settings.enabled) {
      return getTransferResponse();
    }

    // Check working hours
    if (settings?.workingHours) {
      try {
        const wh = JSON.parse(settings.workingHours);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;
        const currentDay = now.getDay();

        if (wh.start && wh.end && wh.days) {
          const [startH, startM] = wh.start.split(":").map(Number);
          const [endH, endM] = wh.end.split(":").map(Number);
          const startTime = startH * 60 + startM;
          const endTime = endH * 60 + endM;

          if (!wh.days.includes(currentDay) || currentTime < startTime || currentTime > endTime) {
            return `⏰ Nosso horario de atendimento e de ${wh.start} as ${wh.end}.\n\nMas deixe sua mensagem que retornaremos assim que possivel! 😊\n\nVoce esta interessado em *comprar* ou *alugar* um imovel?`;
          }
        }
      } catch { /* ignore parse errors */ }
    }

    // Create new conversation if none exists
    if (!conversation) {
      conversation = await storage.createIsaConversation({
        tenantId,
        phoneNumber,
        status: "active",
        conversationStage: "greeting",
        temperature: "unknown",
        messageCount: 0,
      });
    }

    // Save inbound message
    await storage.createIsaMessage({
      conversationId: conversation.id,
      tenantId,
      direction: "inbound",
      content: message,
      messageType: "text",
      sentAt: new Date().toISOString(),
    });

    // Update message count
    const messageCount = (conversation.messageCount || 0) + 1;

    // Check transfer threshold
    if (settings?.transferToHumanThreshold && messageCount >= settings.transferToHumanThreshold) {
      await storage.updateIsaConversation(conversation.id, {
        status: "transferred",
        transferredAt: new Date().toISOString(),
        messageCount,
        lastMessageAt: new Date().toISOString(),
      });
      const response = getTransferResponse();
      await saveOutboundMessage(conversation.id, tenantId, response);
      return response;
    }

    // Detect intent
    const intents = detectMultipleIntents(message);
    const primaryIntent = intents[0];
    const stage = (conversation.conversationStage || "greeting") as ConversationStage;

    // Parse current qualification data
    let qualData: QualificationData = { score: 0 };
    if (conversation.qualificationData) {
      try { qualData = JSON.parse(conversation.qualificationData); } catch { /* ignore */ }
    }

    // Parse interested property IDs
    let interestedProps: string[] = [];
    if (conversation.interestedPropertyIds) {
      try { interestedProps = JSON.parse(conversation.interestedPropertyIds); } catch { /* ignore */ }
    }

    let response = "";
    let newStage: ConversationStage = stage;
    let newTemperature = conversation.temperature || "unknown";

    // Handle special intents regardless of stage
    if (primaryIntent === "human_transfer") {
      await storage.updateIsaConversation(conversation.id, {
        status: "transferred",
        transferredAt: new Date().toISOString(),
        messageCount,
        lastMessageAt: new Date().toISOString(),
      });
      response = getTransferResponse();
      await saveOutboundMessage(conversation.id, tenantId, response);
      return response;
    }

    if (primaryIntent === "offensive") {
      response = getOffensiveResponse();
      await storage.updateIsaConversation(conversation.id, {
        messageCount,
        lastMessageAt: new Date().toISOString(),
      });
      await saveOutboundMessage(conversation.id, tenantId, response);
      return response;
    }

    if (primaryIntent === "faq") {
      let customFaqs: Array<{ question: string; answer: string }> | undefined;
      if (settings?.faqResponses) {
        try { customFaqs = JSON.parse(settings.faqResponses); } catch { /* ignore */ }
      }
      const faqAnswer = findFaqAnswer(message, customFaqs);
      if (faqAnswer) {
        response = faqAnswer + "\n\n💡 Posso te ajudar com mais alguma coisa? Estou aqui para encontrar o imovel ideal para voce!";
        await storage.updateIsaConversation(conversation.id, {
          messageCount,
          lastMessageAt: new Date().toISOString(),
        });
        await saveOutboundMessage(conversation.id, tenantId, response);
        return response;
      }
    }

    // Handle conversation flow by stage
    switch (stage) {
      case "greeting": {
        // Extract name if provided
        const name = extractName(message);
        if (name) {
          await storage.updateIsaConversation(conversation.id, { leadName: name });
        }

        // Check if they also mentioned property interest
        if (intents.includes("property_search")) {
          const propertyType = extractPropertyType(message);
          const category = extractCategory(message);
          const city = extractCity(message);
          const bedrooms = extractBedrooms(message);

          if (propertyType || category) {
            qualData.need = [propertyType, category, city, bedrooms ? `${bedrooms} quartos` : null]
              .filter(Boolean).join(", ");
          }

          response = getIdentifyInterestResponse(propertyType, category, city);
          newStage = (propertyType && category) ? "qualify_budget" : "identify_interest";
        } else {
          response = getGreetingResponse(settings, tenantName, name || conversation.leadName);
          newStage = "identify_interest";
        }
        break;
      }

      case "identify_interest": {
        const propertyType = extractPropertyType(message);
        const category = extractCategory(message);
        const city = extractCity(message);
        const bedrooms = extractBedrooms(message);
        const name = extractName(message);

        if (name && !conversation.leadName) {
          await storage.updateIsaConversation(conversation.id, { leadName: name });
        }

        if (propertyType || category || city || bedrooms) {
          qualData.need = [
            propertyType,
            category,
            city ? `regiao ${city}` : null,
            bedrooms ? `${bedrooms} quartos` : null
          ].filter(Boolean).join(", ");

          response = getIdentifyInterestResponse(propertyType, category, city);
          newStage = "qualify_budget";
        } else if (primaryIntent === "affirmative") {
          response = "Otimo! 😊 Me conta mais:\n\n🏠 Que tipo de imovel? (apartamento, casa, terreno)\n📋 Comprar ou alugar?\n📍 Em qual regiao?";
          newStage = "identify_interest";
        } else if (primaryIntent === "schedule_visit") {
          response = getScheduleResponse();
          newStage = "schedule_visit";
        } else {
          // Check for budget info
          const budget = extractBudget(message);
          if (budget) {
            qualData.budget = budget.raw;
            qualData.budgetValue = budget.value;
            response = getBudgetResponse(budget);
            newStage = "qualify_timeline";
          } else {
            response = getUnknownResponse(stage);
          }
        }
        break;
      }

      case "qualify_budget": {
        const budget = extractBudget(message);
        if (budget) {
          qualData.budget = budget.raw;
          qualData.budgetValue = budget.value;
          response = getBudgetResponse(budget);
          newStage = "qualify_timeline";
        } else if (primaryIntent === "property_search") {
          // They're giving more property details instead of budget
          const propertyType = extractPropertyType(message);
          const city = extractCity(message);
          const bedrooms = extractBedrooms(message);
          if (propertyType || city || bedrooms) {
            qualData.need = (qualData.need || "") + ", " + [propertyType, city, bedrooms ? `${bedrooms}q` : null].filter(Boolean).join(", ");
          }
          response = "Anotado! ✅\n\n💰 E qual seria o seu orcamento aproximado?";
          newStage = "qualify_budget";
        } else if (primaryIntent === "schedule_visit") {
          response = getScheduleResponse();
          newStage = "schedule_visit";
        } else if (primaryIntent === "negative" || /n[aã]o\s*sei|tanto\s*faz/i.test(message)) {
          qualData.budget = "nao informado";
          response = "Sem problemas! 😊\n\n⏰ E para quando voce precisa do imovel?\n\n1️⃣ Urgente\n2️⃣ Proximo mes\n3️⃣ 2-3 meses\n4️⃣ Sem pressa";
          newStage = "qualify_timeline";
        } else {
          response = getUnknownResponse(stage);
        }
        break;
      }

      case "qualify_timeline": {
        const timeline = extractTimeline(message);
        if (timeline !== "unknown") {
          qualData.timeline = timeline;
          response = getTimelineResponse(timeline);
          newStage = "qualify_need";
        } else if (/^[1-4]$/.test(message.trim())) {
          const numMap: Record<string, string> = { "1": "urgent", "2": "1month", "3": "3months", "4": "no_rush" };
          qualData.timeline = numMap[message.trim()];
          response = getTimelineResponse(qualData.timeline);
          newStage = "qualify_need";
        } else if (primaryIntent === "schedule_visit") {
          response = getScheduleResponse();
          newStage = "schedule_visit";
        } else if (primaryIntent === "negative" || /n[aã]o\s*sei|tanto\s*faz/i.test(message)) {
          qualData.timeline = "unknown";
          response = "Sem problemas! ⏰\n\nMe conta mais sobre o que voce precisa:\n\n🛏️ Quantos quartos?\n📐 Tamanho?\n✨ Algo especial? (piscina, varanda, etc.)";
          newStage = "qualify_need";
        } else {
          response = getUnknownResponse(stage);
        }
        break;
      }

      case "qualify_need": {
        const bedrooms = extractBedrooms(message);
        const propertyType = extractPropertyType(message);
        const city = extractCity(message);

        // Accumulate need info
        const needParts: string[] = [];
        if (qualData.need) needParts.push(qualData.need);
        if (bedrooms) needParts.push(`${bedrooms} quartos`);
        if (propertyType) needParts.push(propertyType);
        if (city) needParts.push(`regiao ${city}`);

        // Anything the user says here is additional need info
        if (message.length > 2) {
          if (!needParts.length) needParts.push(message.trim());
          qualData.need = needParts.join(", ");
          qualData.authority = "decision_maker"; // They're here asking, likely a decision maker

          // Calculate score and temperature
          qualData.score = calculateLeadScore(qualData);
          const temperature = calculateLeadTemperature(qualData);
          newTemperature = temperature;

          // Search for matching properties
          const criteria: SearchCriteria = {};
          if (propertyType || extractPropertyType(qualData.need || "")) {
            criteria.type = propertyType || extractPropertyType(qualData.need || "") || undefined;
          }
          if (city || extractCity(qualData.need || "")) {
            criteria.city = city || extractCity(qualData.need || "") || undefined;
          }
          if (bedrooms) {
            criteria.minBedrooms = bedrooms;
            criteria.maxBedrooms = bedrooms + 1;
          }
          if (qualData.budgetValue) {
            criteria.maxPrice = qualData.budgetValue * 1.2; // 20% flexibility
          }

          const properties = await matchProperties(tenantId, criteria);

          if (properties.length > 0) {
            interestedProps = properties.map(p => p.id);
            response = getRecommendResponse(properties);
          } else {
            // Try a broader search
            const broaderProperties = await matchProperties(tenantId, {
              maxPrice: qualData.budgetValue ? qualData.budgetValue * 1.5 : undefined,
            });
            if (broaderProperties.length > 0) {
              interestedProps = broaderProperties.map(p => p.id);
              response = "Nao encontrei exatamente o que procura, mas achei opcoes parecidas:\n" + getRecommendResponse(broaderProperties);
            } else {
              response = getRecommendResponse([]);
            }
          }
          newStage = "recommend";
        } else {
          response = getUnknownResponse(stage);
        }
        break;
      }

      case "recommend": {
        if (primaryIntent === "schedule_visit") {
          // Try to figure out which property
          const numberMatch = message.match(/(\d+)/);
          if (numberMatch && interestedProps.length > 0) {
            const idx = parseInt(numberMatch[1]) - 1;
            if (idx >= 0 && idx < interestedProps.length) {
              const property = await storage.getProperty(interestedProps[idx]);
              response = getScheduleResponse(property?.title);
              newStage = "schedule_visit";
            } else {
              response = getScheduleResponse();
              newStage = "schedule_visit";
            }
          } else {
            response = getScheduleResponse();
            newStage = "schedule_visit";
          }
        } else if (primaryIntent === "affirmative") {
          response = "Que bom que gostou! 😊\n\nQual imovel te interessou mais? Me diz o numero e eu agendo uma visita para voce! 📅";
        } else if (primaryIntent === "negative") {
          response = "Sem problemas! 😊 Posso buscar outros imoveis com criterios diferentes.\n\nO que voce gostaria de ajustar?\n💰 Orcamento\n📍 Localizacao\n🏠 Tipo de imovel\n🛏️ Quartos\n\nOu se preferir, posso transferir para um corretor.";
          newStage = "identify_interest";
        } else if (/^[1-5]$/.test(message.trim())) {
          // Selected a property number
          const idx = parseInt(message.trim()) - 1;
          if (idx >= 0 && idx < interestedProps.length) {
            const property = await storage.getProperty(interestedProps[idx]);
            response = getScheduleResponse(property?.title);
            newStage = "schedule_visit";
          } else {
            response = "Numero invalido. Por favor, escolha um dos imoveis listados acima.";
          }
        } else if (primaryIntent === "property_search") {
          // New search
          const propertyType = extractPropertyType(message);
          const category = extractCategory(message);
          const city = extractCity(message);
          response = getIdentifyInterestResponse(propertyType, category, city);
          newStage = "qualify_budget";
        } else {
          response = "Me diga o numero do imovel que te interessou para agendar uma visita! 📅\nOu me conte se deseja ajustar algum criterio de busca.";
        }
        break;
      }

      case "schedule_visit": {
        // Try to extract date from message
        const hasDate = /(\d{1,2}[\/\-]\d{1,2}|\segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|amanh[aã]|hoje|semana)/i.test(message);

        if (hasDate || primaryIntent === "affirmative") {
          // Auto-create lead if doesn't exist
          if (!conversation.leadId) {
            try {
              const lead = await storage.createLead({
                tenantId,
                name: conversation.leadName || `Lead WhatsApp ${phoneNumber}`,
                email: `whatsapp_${phoneNumber.replace(/\D/g, "")}@lead.isa`,
                phone: phoneNumber,
                source: "whatsapp_isa",
                status: "qualified",
                budget: qualData.budget || undefined,
                preferredType: extractPropertyType(qualData.need || "") || undefined,
                preferredCity: extractCity(qualData.need || "") || undefined,
              });
              await storage.updateIsaConversation(conversation.id, { leadId: lead.id });
              conversation = { ...conversation, leadId: lead.id };
            } catch (err) {
              log(`ISA: Error creating lead for ${phoneNumber}: ${err}`);
            }
          }

          // Schedule visit if we have a property
          if (interestedProps.length > 0 && conversation.leadId) {
            try {
              const visit = await storage.createVisit({
                tenantId,
                propertyId: interestedProps[0],
                leadId: conversation.leadId,
                scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow as fallback
                status: "scheduled",
                notes: `Agendado via ISA WhatsApp. Mensagem: ${message}`,
              });

              await storage.updateIsaConversation(conversation.id, {
                visitScheduledId: visit.id,
                status: "qualified",
              });

              response = `Visita agendada com sucesso! ✅🎉\n\n📅 Nosso corretor vai confirmar o melhor horario com voce.\n📱 Voce recebera uma confirmacao em breve.\n\nPrecisa de mais alguma coisa?`;
              newStage = "transfer";
            } catch (err) {
              log(`ISA: Error scheduling visit: ${err}`);
              response = "Houve um problema ao agendar. Vou transferir para um corretor que vai te ajudar com o agendamento! 📞";
              newStage = "transfer";
            }
          } else {
            response = "📅 Anotei sua preferencia de horario! Um corretor vai entrar em contato para confirmar a visita.\n\nPrecisa de mais alguma coisa?";
            newStage = "transfer";
          }
        } else if (primaryIntent === "negative") {
          response = "Sem problemas! 😊 Quando quiser agendar, e so me avisar.\n\nPosso te ajudar com mais alguma coisa?";
          newStage = "recommend";
        } else {
          response = "Para agendar, me diga qual o melhor dia e horario para voce.\n\nExemplo: *amanha as 14h* ou *sabado de manha*";
        }
        break;
      }

      case "transfer": {
        if (primaryIntent === "affirmative" || primaryIntent === "property_search") {
          // Start a new search cycle
          response = "Claro! 😊 Vamos la!\n\n🏠 Que tipo de imovel voce esta procurando agora?";
          newStage = "identify_interest";
        } else if (primaryIntent === "negative") {
          response = "Obrigado pelo contato! 😊 Se precisar de algo, e so mandar uma mensagem.\n\nTenha um otimo dia! 🌟";
          await storage.updateIsaConversation(conversation.id, {
            status: "closed",
            messageCount,
            lastMessageAt: new Date().toISOString(),
          });
          await saveOutboundMessage(conversation.id, tenantId, response);
          return response;
        } else if (primaryIntent === "greeting") {
          response = "Ola! 😊 Em que posso ajudar?";
        } else {
          response = "Entendi! 😊 Posso te ajudar com mais alguma coisa? Estou aqui para o que precisar!";
        }
        break;
      }

      default:
        response = getUnknownResponse("greeting");
        newStage = "identify_interest";
    }

    // Update qualification score
    qualData.score = calculateLeadScore(qualData);
    newTemperature = calculateLeadTemperature(qualData);

    // Update conversation
    await storage.updateIsaConversation(conversation.id, {
      conversationStage: newStage,
      qualificationData: JSON.stringify(qualData),
      interestedPropertyIds: JSON.stringify(interestedProps),
      temperature: newTemperature,
      messageCount,
      lastMessageAt: new Date().toISOString(),
      status: newStage === "transfer" ? "qualified" : conversation.status,
    });

    // Save outbound message
    await saveOutboundMessage(conversation.id, tenantId, response);

    return response;
  } catch (error) {
    log(`ISA Engine error: ${error}`);
    return "Desculpe, tive um problema tecnico. 😔 Vou transferir voce para um atendente humano. Um momento, por favor!";
  }
}

async function saveOutboundMessage(conversationId: string, tenantId: string, content: string): Promise<void> {
  await storage.createIsaMessage({
    conversationId,
    tenantId,
    direction: "outbound",
    content,
    messageType: "text",
    sentAt: new Date().toISOString(),
  });
}

export async function getConversationState(conversationId: string) {
  const conversation = await storage.getIsaConversation(conversationId);
  if (!conversation) return null;

  const messages = await storage.getIsaMessages(conversationId);
  let qualData: QualificationData = { score: 0 };
  if (conversation.qualificationData) {
    try { qualData = JSON.parse(conversation.qualificationData); } catch { /* ignore */ }
  }

  return {
    conversation,
    messages,
    qualificationData: qualData,
    stage: conversation.conversationStage as ConversationStage,
    temperature: conversation.temperature,
  };
}

export async function scheduleVisitForLead(
  tenantId: string,
  leadId: string,
  propertyId: string,
  preferredDate: string
): Promise<any> {
  const visit = await storage.createVisit({
    tenantId,
    propertyId,
    leadId,
    scheduledFor: preferredDate,
    status: "scheduled",
    notes: "Agendado via ISA Virtual",
  });
  return visit;
}
