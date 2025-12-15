import { apiClient } from './api-client';

export type AIModule =
  | 'properties'
  | 'leads'
  | 'calendar'
  | 'sales'
  | 'rentals'
  | 'financial'
  | 'reports';

export interface AIContext {
  module: AIModule;
  data?: any;
  tenantSettings?: any;
}

export interface AIPreset {
  id: string;
  label: string;
  prompt: string;
}

export interface AIGenerationRequest {
  prompt: string;
  context: AIContext;
  presetId?: string;
}

export interface AIGenerationResponse {
  content: string;
}

export async function generateAIContent(
  prompt: string,
  context: AIContext,
  presetId?: string
): Promise<string> {
  try {
    const response = await apiClient.post<AIGenerationResponse>('/api/ai/generate', {
      prompt,
      context,
      presetId,
    });
    return response.content;
  } catch (error: any) {
    throw new Error(error.message || 'Erro ao gerar conteúdo com IA');
  }
}

export const AI_PRESETS: Record<AIModule, AIPreset[]> = {
  properties: [
    {
      id: 'description',
      label: 'Gerar descrição do imóvel',
      prompt: 'Crie uma descrição atrativa e profissional para este imóvel, destacando suas principais características e benefícios.',
    },
    {
      id: 'title',
      label: 'Criar título atrativo',
      prompt: 'Crie um título chamativo e profissional para este imóvel que capte a atenção de potenciais compradores.',
    },
    {
      id: 'highlights',
      label: 'Destacar diferenciais',
      prompt: 'Liste os principais diferenciais e pontos fortes deste imóvel que o tornam uma ótima oportunidade.',
    },
    {
      id: 'social_media',
      label: 'Post para redes sociais',
      prompt: 'Crie um texto curto e atrativo para divulgar este imóvel nas redes sociais, com emojis e hashtags relevantes.',
    },
  ],
  leads: [
    {
      id: 'followup',
      label: 'Mensagem de follow-up',
      prompt: 'Crie uma mensagem de acompanhamento profissional e cordial para entrar em contato com este lead.',
    },
    {
      id: 'qualification',
      label: 'Qualificar lead',
      prompt: 'Com base nas informações disponíveis, sugira perguntas para qualificar melhor este lead e entender suas necessidades.',
    },
    {
      id: 'response',
      label: 'Resposta automática',
      prompt: 'Crie uma resposta inicial acolhedora e profissional para este lead, demonstrando interesse em ajudá-lo.',
    },
    {
      id: 'whatsapp',
      label: 'Mensagem WhatsApp',
      prompt: 'Crie uma mensagem informal e amigável para enviar via WhatsApp, mantendo profissionalismo.',
    },
  ],
  rentals: [
    {
      id: 'collection',
      label: 'Texto de cobrança',
      prompt: 'Crie um texto educado mas firme para cobrança de aluguel em atraso, mantendo o bom relacionamento.',
    },
    {
      id: 'adjustment',
      label: 'Aviso de reajuste',
      prompt: 'Crie um comunicado claro e transparente sobre o reajuste do valor do aluguel.',
    },
    {
      id: 'notice',
      label: 'Carta de aviso',
      prompt: 'Crie uma carta formal de aviso ou notificação para o inquilino.',
    },
    {
      id: 'welcome',
      label: 'Boas-vindas ao inquilino',
      prompt: 'Crie uma mensagem de boas-vindas calorosa para um novo inquilino.',
    },
  ],
  sales: [
    {
      id: 'proposal',
      label: 'Proposta comercial',
      prompt: 'Crie uma proposta comercial profissional e persuasiva para este cliente.',
    },
    {
      id: 'followup',
      label: 'E-mail de acompanhamento',
      prompt: 'Crie um e-mail de follow-up profissional para acompanhar uma proposta de venda.',
    },
    {
      id: 'negotiation',
      label: 'Contra-proposta',
      prompt: 'Crie um texto para responder a uma contra-proposta, mantendo a negociação ativa.',
    },
  ],
  financial: [
    {
      id: 'monthly_summary',
      label: 'Resumo financeiro do mês',
      prompt: 'Crie um resumo executivo completo da situação financeira da imobiliária no período selecionado, incluindo: total de comissões recebidas (vendas e locações), receitas de aluguel, repasses realizados a proprietários, despesas operacionais e saldo de caixa. Destaque os principais pontos positivos e de atenção.',
    },
    {
      id: 'category_analysis',
      label: 'Identificar categorias com maior gasto',
      prompt: 'Analise as categorias de despesas e identifique onde está concentrada a maior parte dos gastos da imobiliária. Sugira possíveis otimizações ou cortes, comparando com benchmarks do setor imobiliário. Liste as top 5 categorias de despesa e top 5 de receita.',
    },
    {
      id: 'commission_impact',
      label: 'Simular impacto de comissão',
      prompt: 'Com base nos dados financeiros atuais, simule o impacto de um aumento de 1% na taxa de comissão sobre vendas e locações. Calcule quanto isso representaria em receita adicional mensal e anual, considerando o volume atual de transações.',
    },
    {
      id: 'cash_flow_forecast',
      label: 'Previsão de fluxo de caixa',
      prompt: 'Analise a tendência de receitas e despesas dos últimos meses e projete o fluxo de caixa para os próximos 3 meses. Considere a sazonalidade do mercado imobiliário e identifique períodos de possível aperto financeiro.',
    },
    {
      id: 'partner_report',
      label: 'Relatório para sócios',
      prompt: 'Crie um relatório executivo profissional para apresentação aos sócios/investidores da imobiliária. Inclua: visão geral do período, principais indicadores (receita bruta, margem operacional, ticket médio), comparativo com período anterior, destaques e próximos passos recomendados.',
    },
    {
      id: 'pending_analysis',
      label: 'Análise de pendências',
      prompt: 'Analise os lançamentos pendentes e atrasados. Liste os valores a receber (receitas previstas) e a pagar (despesas previstas), identifique possíveis inadimplências e sugira ações para regularização do fluxo de caixa.',
    },
    {
      id: 'profitability',
      label: 'Análise de rentabilidade',
      prompt: 'Calcule a rentabilidade da imobiliária considerando: margem operacional (receitas - despesas operacionais), retorno sobre comissões, custo por transação realizada. Compare vendas vs locações e identifique qual segmento está mais rentável.',
    },
  ],
  reports: [
    {
      id: 'explain',
      label: 'Explicar relatório',
      prompt: 'Explique de forma clara e objetiva os principais indicadores e métricas deste relatório.',
    },
    {
      id: 'insights',
      label: 'Gerar insights',
      prompt: 'Analise os dados e gere insights acionáveis e recomendações estratégicas.',
    },
    {
      id: 'trends',
      label: 'Identificar tendências',
      prompt: 'Identifique tendências e padrões importantes nos dados apresentados.',
    },
  ],
  calendar: [
    {
      id: 'reminder',
      label: 'Lembrete de evento',
      prompt: 'Crie um lembrete profissional para este compromisso agendado.',
    },
    {
      id: 'reschedule',
      label: 'Reagendamento',
      prompt: 'Crie uma mensagem educada para solicitar ou confirmar o reagendamento de um compromisso.',
    },
  ],
};

export function getPresetsByModule(module: AIModule): AIPreset[] {
  return AI_PRESETS[module] || [];
}

export function getPresetById(module: AIModule, presetId: string): AIPreset | undefined {
  return AI_PRESETS[module]?.find(preset => preset.id === presetId);
}
