/**
 * AI Service - Unified Anthropic Claude Integration
 *
 * Provides optional AI-powered enhancements for:
 * - Auto-Marketing: property descriptions, social media posts
 * - ISA (Intelligent Sales Assistant): natural lead responses
 * - AVM (Automated Valuation Model): market insights
 *
 * 100% OPTIONAL - All features work without an API key via template fallback.
 * AI failures never break the application.
 */

import Anthropic from '@anthropic-ai/sdk';

// ==================== Types ====================

export interface PropertyData {
  title?: string;
  type: string;
  category?: string;
  price: string;
  area?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  address: string;
  city: string;
  state?: string;
  features?: string[] | null;
  description?: string | null;
}

export interface ISAContext {
  contactName?: string;
  phoneNumber?: string;
  messageText: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  leadInfo?: {
    name?: string;
    status?: string;
    budget?: string;
    preferredType?: string;
    preferredCity?: string;
  };
  tenantName?: string;
  agentName?: string;
}

export interface ValuationData {
  propertyType: string;
  area: number;
  bedrooms: number;
  bathrooms: number;
  city: string;
  state: string;
  address?: string;
  estimatedValue: number;
  pricePerSqm: number;
  comparables?: Array<{
    price: number;
    area: number;
    address?: string;
  }>;
  methodology?: string;
}

export interface AIGenerateRequest {
  prompt: string;
  context: {
    module: string;
    data?: any;
    tenantSettings?: any;
  };
  presetId?: string;
}

// ==================== Rate Limiting ====================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ==================== Client Initialization ====================

let client: Anthropic | null = null;

try {
  if (process.env.ANTHROPIC_API_KEY) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    console.log('[AI Service] Anthropic Claude client initialized successfully');
  } else {
    console.log('[AI Service] ANTHROPIC_API_KEY not configured - AI features will use template fallback');
  }
} catch (error) {
  console.warn('[AI Service] Failed to initialize Anthropic client:', error);
  client = null;
}

const MODEL = 'claude-sonnet-4-20250514';

// ==================== Public API ====================

/**
 * Check if AI features are available
 */
export function isAIAvailable(): boolean {
  return client !== null;
}

/**
 * Generate a professional property description using AI
 * Returns null if AI is unavailable or fails (caller should use template fallback)
 */
export async function generatePropertyDescription(
  property: PropertyData,
  tone: string = 'profissional'
): Promise<string | null> {
  if (!client) return null;

  if (!checkRateLimit('property-description')) {
    console.warn('[AI Service] Rate limit exceeded for property descriptions');
    return null;
  }

  try {
    const features = Array.isArray(property.features)
      ? property.features.join(', ')
      : 'Não informadas';

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Gere uma descrição profissional para o seguinte imóvel em português brasileiro. Tom: ${tone}.

Tipo: ${property.type}
Categoria: ${property.category || 'Não informada'}
Área: ${property.area ? `${property.area}m²` : 'Não informada'}
Quartos: ${property.bedrooms ?? 'Não informado'}
Banheiros: ${property.bathrooms ?? 'Não informado'}
Preço: R$ ${property.price}
Localização: ${property.address}, ${property.city}${property.state ? ` - ${property.state}` : ''}
Características: ${features}

Gere uma descrição envolvente de 2-3 parágrafos que destaque os pontos fortes do imóvel.
Não inclua o preço na descrição. Use linguagem natural e persuasiva, adequada para portais imobiliários.
Não use asteriscos, markdown ou formatação especial.`
      }]
    });

    const textBlock = message.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : null;
  } catch (error: any) {
    console.error('[AI Service] Error generating property description:', error.message);
    return null;
  }
}

/**
 * Generate a social media post for a property
 * Returns null if AI is unavailable or fails
 */
export async function generateSocialPost(
  property: PropertyData,
  platform: string = 'instagram'
): Promise<string | null> {
  if (!client) return null;

  if (!checkRateLimit('social-post')) {
    console.warn('[AI Service] Rate limit exceeded for social posts');
    return null;
  }

  try {
    const platformInstructions: Record<string, string> = {
      instagram: 'Use emojis relevantes e hashtags populares no mercado imobiliário brasileiro. Limite de 2200 caracteres. Inclua uma chamada para ação.',
      facebook: 'Tom mais informal e engajador. Incentive comentários e compartilhamentos. Inclua emojis moderadamente.',
      whatsapp: 'Texto curto e direto, pronto para enviar em grupos ou para contatos. Use emojis com moderação. Máximo 500 caracteres.',
      linkedin: 'Tom profissional e corporativo. Focado em investimento e mercado imobiliário. Sem muitos emojis.',
    };

    const instructions = platformInstructions[platform] || platformInstructions.instagram;

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Crie um post para ${platform} divulgando o seguinte imóvel. ${instructions}

Tipo: ${property.type}
Área: ${property.area ? `${property.area}m²` : 'A consultar'}
Quartos: ${property.bedrooms ?? 'A consultar'}
Banheiros: ${property.bathrooms ?? 'A consultar'}
Preço: R$ ${property.price}
Localização: ${property.city}${property.state ? ` - ${property.state}` : ''}
Características: ${Array.isArray(property.features) ? property.features.join(', ') : 'Diversas'}

Retorne apenas o texto do post, sem explicações adicionais.`
      }]
    });

    const textBlock = message.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : null;
  } catch (error: any) {
    console.error('[AI Service] Error generating social post:', error.message);
    return null;
  }
}

/**
 * Generate a natural lead response for ISA (Intelligent Sales Assistant)
 * Returns null if AI is unavailable or fails (caller should use rule-based response)
 */
export async function generateLeadResponse(
  context: ISAContext
): Promise<string | null> {
  if (!client) return null;

  if (!checkRateLimit('lead-response')) {
    console.warn('[AI Service] Rate limit exceeded for lead responses');
    return null;
  }

  try {
    const historyText = context.conversationHistory
      ?.slice(-6) // Keep last 6 messages for context
      .map(msg => `${msg.role === 'user' ? 'Corretor' : 'Cliente'}: ${msg.content}`)
      .join('\n') || '';

    const leadInfoText = context.leadInfo
      ? `
Informações do lead:
- Nome: ${context.leadInfo.name || 'Não informado'}
- Status: ${context.leadInfo.status || 'Novo'}
- Orçamento: ${context.leadInfo.budget ? `R$ ${context.leadInfo.budget}` : 'Não informado'}
- Tipo preferido: ${context.leadInfo.preferredType || 'Não informado'}
- Cidade preferida: ${context.leadInfo.preferredCity || 'Não informada'}`
      : '';

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: `Você é um assistente de vendas imobiliário (ISA) para a imobiliária "${context.tenantName || 'ImobiBase'}".
${context.agentName ? `O corretor responsável é ${context.agentName}.` : ''}

Sua tarefa é gerar uma resposta natural e profissional em português brasileiro para a mensagem do cliente via WhatsApp.

${leadInfoText}

${historyText ? `Histórico recente da conversa:\n${historyText}\n` : ''}
Última mensagem do cliente: "${context.messageText}"

Diretrizes:
- Seja cordial, profissional e objetivo
- Responda em português brasileiro natural (como um corretor real faria)
- Não use linguagem robótica ou genérica demais
- Se o cliente perguntou sobre um imóvel específico, demonstre interesse em ajudar
- Tente qualificar o lead (orçamento, preferências, urgência) de forma natural
- Mantenha as respostas curtas (ideal para WhatsApp, 1-3 frases)
- Não use markdown ou formatação especial
- Pode usar emojis com moderação (estilo WhatsApp)

Retorne apenas a mensagem de resposta, sem explicações.`
      }]
    });

    const textBlock = message.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : null;
  } catch (error: any) {
    console.error('[AI Service] Error generating lead response:', error.message);
    return null;
  }
}

/**
 * Generate market insights for an AVM (Automated Valuation Model) report
 * Returns null if AI is unavailable or fails
 */
export async function generateValuationInsights(
  valuation: ValuationData
): Promise<string | null> {
  if (!client) return null;

  if (!checkRateLimit('valuation-insights')) {
    console.warn('[AI Service] Rate limit exceeded for valuation insights');
    return null;
  }

  try {
    const comparablesText = valuation.comparables
      ?.map((c, i) => `  ${i + 1}. R$ ${c.price.toLocaleString('pt-BR')} - ${c.area}m² (R$ ${(c.price / c.area).toFixed(0)}/m²)${c.address ? ` - ${c.address}` : ''}`)
      .join('\n') || 'Não disponíveis';

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 768,
      messages: [{
        role: 'user',
        content: `Gere uma análise de mercado em português brasileiro para o seguinte laudo de avaliação imobiliária (AVM).

Dados do imóvel:
- Tipo: ${valuation.propertyType}
- Área: ${valuation.area}m²
- Quartos: ${valuation.bedrooms}
- Banheiros: ${valuation.bathrooms}
- Localização: ${valuation.address ? `${valuation.address}, ` : ''}${valuation.city} - ${valuation.state}

Resultado da avaliação:
- Valor estimado: R$ ${valuation.estimatedValue.toLocaleString('pt-BR')}
- Preço por m²: R$ ${valuation.pricePerSqm.toFixed(0)}/m²
${valuation.methodology ? `- Metodologia: ${valuation.methodology}` : ''}

Imóveis comparáveis:
${comparablesText}

Gere 2-3 parágrafos de insights sobre:
1. Análise do valor em relação ao mercado local
2. Fatores que podem valorizar ou desvalorizar o imóvel
3. Recomendação de faixa de preço para venda/locação

Use linguagem técnica mas acessível. Não use markdown ou formatação especial.
Retorne apenas o texto da análise.`
      }]
    });

    const textBlock = message.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text : null;
  } catch (error: any) {
    console.error('[AI Service] Error generating valuation insights:', error.message);
    return null;
  }
}

/**
 * Generic AI content generation for the AI Assistant feature
 * Used by the AIAssistant component via /api/ai/generate
 * Returns null if AI is unavailable or fails
 */
export async function generateContent(
  request: AIGenerateRequest
): Promise<{ content: string; aiGenerated: boolean } | null> {
  if (!client) return null;

  if (!checkRateLimit(`ai-generate-${request.context.module}`)) {
    console.warn(`[AI Service] Rate limit exceeded for module: ${request.context.module}`);
    return null;
  }

  try {
    const contextDataText = request.context.data
      ? `\n\nDados de contexto:\n${JSON.stringify(request.context.data, null, 2)}`
      : '';

    const toneText = request.context.tenantSettings?.tone
      ? `\nTom de voz: ${request.context.tenantSettings.tone}`
      : '\nTom de voz: profissional e cordial';

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Você é um assistente de IA especializado no mercado imobiliário brasileiro.
Módulo atual: ${request.context.module}${toneText}

Solicitação: ${request.prompt}${contextDataText}

Diretrizes:
- Responda em português brasileiro
- Seja profissional e objetivo
- Adapte o conteúdo para o contexto imobiliário
- Não use markdown ou formatação especial (a menos que explicitamente solicitado)
- Retorne apenas o conteúdo solicitado, sem explicações adicionais`
      }]
    });

    const textBlock = message.content.find(block => block.type === 'text');
    if (textBlock) {
      return { content: textBlock.text, aiGenerated: true };
    }
    return null;
  } catch (error: any) {
    console.error('[AI Service] Error generating content:', error.message);
    return null;
  }
}

/**
 * Generate property title using AI
 * Returns null if AI is unavailable or fails
 */
export async function generatePropertyTitle(
  property: PropertyData
): Promise<string | null> {
  if (!client) return null;

  if (!checkRateLimit('property-title')) {
    console.warn('[AI Service] Rate limit exceeded for property titles');
    return null;
  }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 128,
      messages: [{
        role: 'user',
        content: `Crie um título atrativo e profissional para este imóvel em português brasileiro.

Tipo: ${property.type}
Área: ${property.area ? `${property.area}m²` : ''}
Quartos: ${property.bedrooms ?? ''}
Localização: ${property.city}${property.state ? ` - ${property.state}` : ''}
Características: ${Array.isArray(property.features) ? property.features.slice(0, 3).join(', ') : ''}

Retorne apenas o título (máximo 80 caracteres), sem aspas ou explicações.`
      }]
    });

    const textBlock = message.content.find(block => block.type === 'text');
    return textBlock ? textBlock.text.trim() : null;
  } catch (error: any) {
    console.error('[AI Service] Error generating property title:', error.message);
    return null;
  }
}
