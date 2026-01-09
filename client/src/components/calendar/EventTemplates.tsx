import { EventType } from "./EventCard";

export interface EventTemplate {
  id: string;
  label: string;
  type: EventType;
  duration: number; // em minutos
  reminderMinutes: number;
  description?: string;
  defaultNotes?: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'visit',
    label: 'Visita de Imóvel',
    type: 'visit',
    duration: 30,
    reminderMinutes: 60,
    description: 'Visita presencial ou virtual ao imóvel',
    defaultNotes: 'Visita agendada. Lembrar de confirmar com cliente 1 dia antes.'
  },
  {
    id: 'followup',
    label: 'Follow-up',
    type: 'followup',
    duration: 15,
    reminderMinutes: 5,
    description: 'Contato de acompanhamento com lead ou cliente',
    defaultNotes: 'Follow-up para verificar interesse e próximos passos.'
  },
  {
    id: 'meeting',
    label: 'Reunião de Proposta',
    type: 'meeting',
    duration: 60,
    reminderMinutes: 30,
    description: 'Reunião para apresentar ou negociar proposta',
    defaultNotes: 'Reunião para discussão de proposta. Preparar documentação necessária.'
  },
  {
    id: 'contract',
    label: 'Assinatura de Contrato',
    type: 'meeting',
    duration: 60,
    reminderMinutes: 120,
    description: 'Reunião para assinatura de documentos',
    defaultNotes: 'Assinatura de contrato. Verificar documentação completa antes da reunião.'
  },
  {
    id: 'evaluation',
    label: 'Avaliação de Imóvel',
    type: 'visit',
    duration: 45,
    reminderMinutes: 60,
    description: 'Visita para avaliar imóvel',
    defaultNotes: 'Avaliação de imóvel. Levar equipamentos de medição e câmera.'
  },
  {
    id: 'quick_call',
    label: 'Ligação Rápida',
    type: 'followup',
    duration: 10,
    reminderMinutes: 5,
    description: 'Ligação rápida de follow-up',
    defaultNotes: 'Ligação para confirmação ou esclarecimento rápido.'
  }
];

export function getTemplateById(id: string): EventTemplate | undefined {
  return EVENT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByType(type: EventType): EventTemplate[] {
  return EVENT_TEMPLATES.filter(t => t.type === type);
}
