# Componentes do Calendário - ImobiBase

## Visão Geral

Sistema completo de calendário com vistas melhoradas, modal de criação simplificado e templates de eventos pré-configurados.

## Componentes Criados

### 1. EventCard.tsx
Componente para exibição de eventos no calendário com suporte a diferentes vistas.

**Props:**
```typescript
interface EventCardProps {
  id: string;
  type: 'visit' | 'followup' | 'meeting' | 'other';
  title: string;
  startTime: Date;
  endTime: Date;
  client?: string;
  location?: string;
  status: 'pending' | 'completed' | 'cancelled';
  participants?: number;
  hasNotes?: boolean;
  color: string;
  onClick?: (id: string) => void;
  compact?: boolean;
  draggable?: boolean;
}
```

**Características:**
- Barra lateral colorida por tipo de evento
- Versão compacta para vista de mês
- Versão expandida para vistas de dia e semana
- Suporte a drag and drop
- Ícones contextuais (localização, participantes, notas)
- Badge de status visual
- Hover states com informações adicionais

**Cores por Tipo:**
- **Visita** (visit): Azul (#3b82f6)
- **Follow-up** (followup): Verde (#22c55e)
- **Reunião** (meeting): Roxo (#a855f7)
- **Outro** (other): Cinza (#6b7280)

### 2. CreateEventModal.tsx
Modal simplificado para criação rápida de eventos.

**Estrutura:**

#### Campos Principais (sempre visíveis):
- Tipo de evento (select com ícones)
- Título
- Data e Hora
- Duração com cálculo automático de término
- Cliente/Lead (autocomplete)

#### Templates Rápidos:
- Visita de Imóvel (30 min, lembrete 1h antes)
- Follow-up (15 min, lembrete 5 min antes)
- Reunião de Proposta (1h, lembrete 30 min antes)
- Assinatura de Contrato (1h, lembrete 2h antes)
- Avaliação de Imóvel (45 min, lembrete 1h antes)
- Ligação Rápida (10 min, lembrete 5 min antes)

#### Campos Opcionais (Accordion "Mais detalhes"):
- Propriedade relacionada
- Localização
- Lembretes configuráveis
- Descrição/Notas

**Características:**
- Validação inline
- Templates com um clique
- Cálculo automático de horário de término
- Accordion para campos opcionais
- Loading states durante submissão
- Integração com lista de clientes e propriedades

### 3. EventTemplates.tsx
Definições de templates pré-configurados para criação rápida de eventos.

**Templates Disponíveis:**

| Template | Tipo | Duração | Lembrete |
|----------|------|---------|----------|
| Visita de Imóvel | visit | 30 min | 60 min antes |
| Follow-up | followup | 15 min | 5 min antes |
| Reunião de Proposta | meeting | 60 min | 30 min antes |
| Assinatura de Contrato | meeting | 60 min | 120 min antes |
| Avaliação de Imóvel | visit | 45 min | 60 min antes |
| Ligação Rápida | followup | 10 min | 5 min antes |

**Funções Utilitárias:**
- `getTemplateById(id: string)`: Busca template por ID
- `getTemplatesByType(type: EventType)`: Filtra templates por tipo

## Melhorias na Página de Calendário

### Vista de Mês
**Implementado:**
- Mostra APENAS 2 eventos por dia (os mais importantes)
- Indicador "+X mais" quando há mais eventos
- Popover ao clicar no dia com lista completa de eventos
- Popover inclui:
  - Título do dia formatado
  - Lista scrollável de todos os eventos
  - Detalhes resumidos de cada evento
  - Botão "Ver todos os eventos" que muda para vista de lista
- Click em dia vazio abre modal de criação
- Eventos exibem horário e barra colorida por status

### Vista de Semana
**Mantido da implementação original:**
- Timeline por hora (slots de 30 minutos)
- Eventos compactos com cores por tipo
- Drag and drop para reagendar
- Grid responsivo (horizontal scroll no mobile)

### Vista de Dia
**Mantido da implementação original:**
- Timeline detalhada com slots de 30 minutos
- Eventos expandidos com todas as informações
- Click em slot vazio para criar evento
- Indicador visual da hora atual
- Espaço para múltiplos eventos no mesmo horário

### Vista de Lista (Agenda)
**Mantido da implementação original:**
- Lista cronológica de eventos do dia
- Cards completos com todas as informações
- Navegação por swipe (mobile)
- Empty state com call-to-action

## Como Usar

### Importação
```typescript
import {
  EventCard,
  CreateEventModal,
  EVENT_TEMPLATES
} from '@/components/calendar';
```

### Exemplo de Uso do EventCard
```typescript
<EventCard
  id="visit-123"
  type="visit"
  title="Visita ao Apt 301"
  startTime={new Date('2025-01-15T10:00:00')}
  endTime={new Date('2025-01-15T10:30:00')}
  client="João Silva"
  location="Rua das Flores, 123"
  status="pending"
  color="#3b82f6"
  onClick={(id) => handleEventClick(id)}
  compact={false}
/>
```

### Exemplo de Uso do CreateEventModal
```typescript
<CreateEventModal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  onSubmit={handleCreateEvent}
  initialDate={new Date()}
  clients={clientsList}
  properties={propertiesList}
/>
```

## Integração com Sistema Existente

O sistema mantém compatibilidade total com o backend de visitas existente:

1. **Criação de Eventos**: Convertidos para formato de visita (`/api/visits`)
2. **Metadados**: Armazenados em notas com tags:
   - `[TYPE:visit|followup|meeting|other]`
   - `[REMINDER:X]` onde X = minutos
3. **Status**: Mapeados para status existentes de visita

## Responsividade

### Mobile
- Modal ocupa 90% da altura da tela
- Templates em grid 2x3
- Campos agrupados logicamente
- Accordion para campos opcionais
- Botões de ação em grid

### Desktop
- Modal com largura máxima de 2xl (768px)
- Templates em grid 3 colunas
- Melhor aproveitamento do espaço
- Popover posicionado estrategicamente

## Acessibilidade

- Labels semânticos em todos os campos
- Navegação por teclado
- Estados de foco visíveis
- Mensagens de erro claras
- Loading states durante ações

## Estados de Loading

1. **Criação de Evento**: Spinner no botão "Criar Evento"
2. **Templates**: Feedback visual ao selecionar
3. **Validação**: Inline para campos obrigatórios

## Validações

### Campos Obrigatórios:
- Tipo de evento
- Título
- Data
- Hora

### Validações Automáticas:
- Data não pode ser anterior a hoje (warning apenas)
- Horário de término calculado automaticamente
- Duração mínima de 10 minutos

## Próximas Melhorias Sugeridas

1. **Recorrência**: Adicionar eventos recorrentes
2. **Notificações Push**: Integrar com sistema de notificações
3. **Sincronização**: Google Calendar / Outlook
4. **Anexos**: Permitir upload de documentos
5. **Participantes Múltiplos**: Suporte a múltiplos participantes
6. **Conflitos**: Detecção de conflitos de horário
7. **Zoom/Meet**: Integração para reuniões virtuais

## Arquivos Modificados

- `/client/src/pages/calendar/index.tsx` - Página principal do calendário
- `/client/src/components/calendar/EventCard.tsx` - Componente de card de evento (novo)
- `/client/src/components/calendar/CreateEventModal.tsx` - Modal de criação (novo)
- `/client/src/components/calendar/EventTemplates.tsx` - Templates (novo)
- `/client/src/components/calendar/index.ts` - Barrel export (novo)

## Performance

- Templates pré-carregados (sem fetch)
- Memoização de cálculos de data
- Lazy loading de popover content
- Debounce em inputs de busca (implementar se necessário)

## Compatibilidade

- React 18+
- TypeScript 5+
- Radix UI components
- date-fns para manipulação de datas
- Tailwind CSS para estilos
