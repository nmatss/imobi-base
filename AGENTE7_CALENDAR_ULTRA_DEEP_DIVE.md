# AGENTE 7/20: CALENDAR MODULE ULTRA DEEP DIVE

**Sistema ImobiBase - Análise Profunda do Módulo de Calendário**

Data: 25/12/2025
Arquivos Analisados:
- `/client/src/pages/calendar/index.tsx` (2255 linhas)
- `/client/src/components/calendar/EventCard.tsx` (215 linhas)
- `/client/src/components/calendar/CreateEventModal.tsx` (394 linhas)
- `/client/src/components/calendar/EventTemplates.tsx` (77 linhas)
- `/server/routes.ts` (Visits API - linhas 751-788)
- `/tests/e2e/calendar.spec.ts` (311 linhas de testes)

**Total:** ~3.500 linhas de código dedicadas ao calendário

---

## 📊 RESUMO EXECUTIVO - 20 CRITÉRIOS DE AVALIAÇÃO

| # | Critério | Nota | Status | Comparação |
|---|----------|------|--------|------------|
| 1 | **Calendar Views** | 8.5/10 | ✅ Excelente | Google: 10/10, Outlook: 9/10 |
| 2 | **Event Creation** | 9/10 | ✅ Excelente | Calendly: 10/10, Cal.com: 9/10 |
| 3 | **Event Rendering** | 7/10 | ⚠️ Bom | Google: 9/10, Outlook: 8/10 |
| 4 | **Recurring Events** | 0/10 | ❌ Ausente | Google: 10/10, Calendly: 9/10 |
| 5 | **Time Slot Management** | 8/10 | ✅ Muito Bom | Calendly: 10/10, Cal.com: 9/10 |
| 6 | **Conflict Detection** | 2/10 | ❌ Básico | Google: 9/10, Outlook: 8/10 |
| 7 | **Drag & Drop** | 9/10 | ✅ Excelente | Google: 10/10, Outlook: 9/10 |
| 8 | **Mobile Responsiveness** | 9/10 | ✅ Excelente | Google: 8/10, Outlook: 7/10 |
| 9 | **Touch Gestures** | 9/10 | ✅ Excelente | Google: 7/10, Calendly: 6/10 |
| 10 | **Sync & Integrations** | 0/10 | ❌ Ausente | Google: 10/10, Outlook: 10/10 |
| 11 | **Reminders System** | 3/10 | ❌ Básico | Google: 10/10, Calendly: 9/10 |
| 12 | **Team Calendar** | 0/10 | ❌ Ausente | Google: 9/10, Outlook: 10/10 |
| 13 | **Visit Management** | 8.5/10 | ✅ Excelente | Específico ImobiBase |
| 14 | **Performance** | 6/10 | ⚠️ Regular | Google: 9/10, Outlook: 8/10 |
| 15 | **Offline Support** | 0/10 | ❌ Ausente | Google: 8/10, Outlook: 7/10 |
| 16 | **Timezone Handling** | 0/10 | ❌ Ausente | Google: 10/10, Outlook: 10/10 |
| 17 | **AI Features** | 7/10 | ✅ Bom | Específico ImobiBase |
| 18 | **Search & Filter** | 7/10 | ✅ Bom | Google: 9/10, Outlook: 8/10 |
| 19 | **Route Optimization** | 0/10 | ❌ Ausente | Específico para visitas |
| 20 | **Analytics** | 8/10 | ✅ Muito Bom | Específico ImobiBase |

**Média Geral:** 5.5/10
**Pontos Fortes:** Mobile UX, Drag & Drop, Visit Management
**Pontos Críticos:** Sync, Recurring Events, Team Features

---

## 1. CALENDAR VIEWS - ANÁLISE DETALHADA

### 1.1 Arquitetura de Views (8.5/10)

**Arquivo:** `/client/src/pages/calendar/index.tsx`

```typescript
// Linhas 218-219: State management
const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "list">("list");
const [selectedDate, setSelectedDate] = useState(new Date());

// Linhas 1191-1212: View switcher mobile-optimized
<div className="flex border-b">
  {[
    { value: "list", label: "Lista", icon: List },
    { value: "day", label: "Dia", icon: CalendarIcon },
    { value: "week", label: "Semana", icon: CalendarPlus },
    { value: "month", label: "Mês", icon: CalendarIcon },
  ].map((view) => (
    <button
      onClick={() => setViewMode(view.value as any)}
      className={cn(
        "flex-1 py-3 px-2 text-sm font-medium border-b-2 transition-colors",
        viewMode === view.value
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground"
      )}
    >
      <view.icon className="h-4 w-4" />
      <span className="hidden xs:inline">{view.label}</span>
    </button>
  ))}
</div>
```

#### ✅ Pontos Fortes:

1. **Mobile-First Design**
   - Default view = "list" (melhor para mobile)
   - Icons sempre visíveis, labels ocultam em telas pequenas
   - Segmented control pattern (iOS-like)

2. **4 Views Completas**
   - **List View** (linhas 1222-1291): Agenda linear
   - **Day View** (linhas 1294-1377): Timeline com slots de 30min
   - **Week View** (linhas 1379-1524): Scroll horizontal mobile, grid desktop
   - **Month View** (linhas 1527-1682): Grid 7x6 com popover de detalhes

3. **Touch Navigation**
   ```typescript
   // Linhas 262-264: Touch state
   const [touchStart, setTouchStart] = useState<number | null>(null);
   const [touchEnd, setTouchEnd] = useState<number | null>(null);

   // Linhas 444-469: Swipe detection
   const minSwipeDistance = 50;
   const onTouchEnd = () => {
     if (!touchStart || !touchEnd) return;
     const distance = touchStart - touchEnd;
     if (distance > minSwipeDistance) handleNextDate(); // Swipe left
     if (distance < -minSwipeDistance) handlePreviousDate(); // Swipe right
   };
   ```

#### ❌ Problemas Identificados:

**Problema #1: Month View Density em Mobile**
```typescript
// Linha 1556: Grid 7x7 muito denso
<div className="grid grid-cols-7 gap-6 sm:gap-8">
  {daysInMonth.map((day, i) => {
    return (
      <div className="min-h-[80px] sm:min-h-[100px] border rounded-lg p-1.5">
        {/* Muito pequeno em mobile: ~45px por célula */}
      </div>
    );
  })}
</div>
```

**Impacto:**
- Células de ~45px width em telas de 320px
- Difícil clicar em dias específicos
- Eventos aparecem apenas como barras coloridas
- Violação de WCAG touch target size (mínimo 44x44px)

**Solução:**
```typescript
// Mês view mobile alternativo
const MobileMonthView = () => (
  <div className="sm:hidden">
    {/* Mostrar semana atual + navegação */}
    <div className="space-y-2">
      {currentWeekDays.map(day => (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <div className="text-xs text-muted-foreground">
                {format(day, "EEEE")}
              </div>
              <div className="text-2xl font-bold">
                {format(day, "dd")}
              </div>
            </div>
            <Badge>{getVisitsForDate(day).length} eventos</Badge>
          </div>
          <div className="space-y-2">
            {getVisitsForDate(day).map(visit => (
              <VisitCard visit={visit} compact />
            ))}
          </div>
        </Card>
      ))}
    </div>
    {/* Navegação de semanas */}
    <div className="flex gap-2 mt-4">
      <Button onClick={() => goToPreviousWeek()}>Semana Anterior</Button>
      <Button onClick={() => goToNextWeek()}>Próxima Semana</Button>
    </div>
  </div>
);
```

**Problema #2: Day View Timeline - Renderização Eager**
```typescript
// Linhas 1323-1376: Todos os 24 slots renderizados
<ScrollArea className="h-[500px] sm:h-[600px]">
  {TIME_SLOTS.map((slot, index) => {
    // 24 divs de 80px = 1920px de altura
    return <div className="h-16 sm:h-20 border-b">...</div>;
  })}
</ScrollArea>
```

**Impacto:**
- Renderização de 24 slots mesmo que apenas 3-4 tenham eventos
- Scroll desnecessário em horário comercial
- Performance impacto em mobile

**Solução:**
```typescript
// Virtual scrolling ou renderização inteligente
const workingHours = useMemo(() => {
  const hasEvents = TIME_SLOTS.filter(slot =>
    getVisitsForDate(selectedDate).some(v =>
      format(new Date(v.scheduledFor), "HH:mm") === slot
    )
  );

  if (hasEvents.length === 0) {
    // Mostrar apenas horário comercial
    return TIME_SLOTS.slice(2, 20); // 09:00 - 18:30
  }

  // Calcular range com margem
  const firstEventIndex = TIME_SLOTS.indexOf(hasEvents[0]);
  const lastEventIndex = TIME_SLOTS.indexOf(hasEvents[hasEvents.length - 1]);
  return TIME_SLOTS.slice(
    Math.max(0, firstEventIndex - 2),
    Math.min(TIME_SLOTS.length, lastEventIndex + 3)
  );
}, [selectedDate, visits]);
```

### 1.2 Comparação com Benchmarks

| Feature | ImobiBase | Google Calendar | Outlook | Calendly |
|---------|-----------|-----------------|---------|----------|
| List View | ✅ Sim | ✅ Agenda | ✅ Sim | ❌ Não |
| Day View | ✅ Timeline | ✅ Timeline | ✅ Timeline | ❌ Não |
| Week View | ✅ Grid/Scroll | ✅ Grid | ✅ Grid | ✅ Sim |
| Month View | ⚠️ Denso | ✅ Otimizado | ✅ Otimizado | ❌ Não |
| Touch Gestures | ✅ Swipe | ⚠️ Básico | ⚠️ Básico | ❌ Não |
| Compact Cards | ✅ Sim | ✅ Sim | ✅ Sim | N/A |
| Popover Details | ✅ Sim | ✅ Sim | ✅ Sim | N/A |

**Veredito:** ImobiBase tem views MELHORES que Google/Outlook em mobile UX, mas pior densidade em month view.

---

## 2. EVENT MANAGEMENT - CRIAÇÃO E EDIÇÃO

### 2.1 Quick Add com Templates (9/10)

**Arquivo:** `/client/src/components/calendar/CreateEventModal.tsx`

```typescript
// Linhas 12-68: Template system
export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'visit',
    label: 'Visita de Imóvel',
    type: 'visit',
    duration: 30,
    reminderMinutes: 60,
    defaultNotes: 'Visita agendada. Lembrar de confirmar com cliente 1 dia antes.'
  },
  {
    id: 'followup',
    label: 'Follow-up',
    type: 'followup',
    duration: 15,
    reminderMinutes: 5,
  },
  {
    id: 'meeting',
    label: 'Reunião de Proposta',
    type: 'meeting',
    duration: 60,
    reminderMinutes: 30,
  },
  // ... mais 3 templates
];

// Linhas 59-69: Template selection
const handleTemplateSelect = (template: EventTemplate) => {
  setSelectedTemplate(template.id);
  setFormData(prev => ({
    ...prev,
    type: template.type,
    title: template.label,
    duration: template.duration,
    reminderMinutes: template.reminderMinutes,
    description: template.defaultNotes || ''
  }));
};
```

#### ✅ Pontos Fortes:

1. **6 Templates Pré-definidos**
   - Visita de Imóvel (30min)
   - Follow-up (15min)
   - Reunião de Proposta (60min)
   - Assinatura de Contrato (60min)
   - Avaliação de Imóvel (45min)
   - Ligação Rápida (10min)

2. **Auto-fill Inteligente**
   - Duration pré-definida
   - Reminder time adequado ao tipo
   - Notas padrão úteis
   - Tipo de evento correto

3. **UI Responsiva**
   ```typescript
   // Linhas 127-145: Grid responsivo de templates
   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
     {EVENT_TEMPLATES.map(template => (
       <Button
         variant={selectedTemplate === template.id ? "default" : "outline"}
         className={cn(
           "h-auto py-3 px-4 flex flex-col items-start gap-1",
           selectedTemplate === template.id && "ring-2 ring-primary"
         )}
       >
         <span className="font-medium text-xs">{template.label}</span>
         <span className="text-[10px] text-muted-foreground">
           {template.duration} min • Lembrete {template.reminderMinutes} min antes
         </span>
       </Button>
     ))}
   </div>
   ```

#### ❌ Problemas:

**Problema #3: Recurring Events Ausente**

**Comparação:**
- Google Calendar: Full recurrence rules (daily, weekly, monthly, yearly, custom)
- Outlook: Recurrence patterns + exceptions
- Calendly: Recurring availability slots
- **ImobiBase: ❌ NENHUM suporte**

**Impacto:**
- Impossível criar visitas semanais (ex: "Todo sábado às 10h")
- Reuniões recorrentes precisam ser criadas manualmente
- Follow-ups mensais duplicam trabalho

**Solução:**
```typescript
// Adicionar ao EventFormData
export interface EventFormData {
  // ... campos existentes
  isRecurring?: boolean;
  recurrencePattern?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number; // a cada X dias/semanas/meses
    daysOfWeek?: number[]; // 0-6 (domingo-sábado)
    endDate?: string;
    occurrences?: number;
  };
}

// Componente de recorrência
const RecurrenceSelector = () => (
  <Accordion type="single" collapsible>
    <AccordionItem value="recurrence">
      <AccordionTrigger>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Repetir evento
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4">
        <Select onValueChange={(v) => setFormData(prev => ({
          ...prev,
          recurrencePattern: { ...prev.recurrencePattern, frequency: v }
        }))}>
          <SelectTrigger>
            <SelectValue placeholder="Frequência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Diariamente</SelectItem>
            <SelectItem value="weekly">Semanalmente</SelectItem>
            <SelectItem value="monthly">Mensalmente</SelectItem>
            <SelectItem value="yearly">Anualmente</SelectItem>
          </SelectContent>
        </Select>

        {/* Seletor de dias da semana para weekly */}
        {formData.recurrencePattern?.frequency === 'weekly' && (
          <div className="flex gap-2 flex-wrap">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, i) => (
              <Button
                key={i}
                variant={selectedDays.includes(i) ? "default" : "outline"}
                size="sm"
                className="w-12 h-10"
                onClick={() => toggleDay(i)}
              >
                {day}
              </Button>
            ))}
          </div>
        )}

        {/* Término */}
        <RadioGroup>
          <RadioGroupItem value="never" label="Nunca" />
          <RadioGroupItem value="date" label="Em uma data específica" />
          <RadioGroupItem value="count" label="Após X ocorrências" />
        </RadioGroup>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);
```

**Backend Changes:**
```typescript
// shared/schema.ts - adicionar campos
export const visits = pgTable("visits", {
  // ... campos existentes
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"), // iCal RRULE format
  parentEventId: text("parent_event_id").references(() => visits.id),
  recurrenceExceptions: text("recurrence_exceptions"), // JSON array de datas
});

// server/routes.ts - criar instâncias recorrentes
app.post("/api/visits", requireAuth, async (req, res) => {
  const { isRecurring, recurrencePattern, ...data } = req.body;

  if (isRecurring && recurrencePattern) {
    // Gerar array de datas
    const occurrences = generateRecurrenceOccurrences(
      new Date(data.scheduledFor),
      recurrencePattern
    );

    // Criar evento pai
    const parentEvent = await storage.createVisit({
      ...data,
      isRecurring: true,
      recurrenceRule: toRRULE(recurrencePattern)
    });

    // Criar instâncias filhas
    const instances = await Promise.all(
      occurrences.slice(1).map(date =>
        storage.createVisit({
          ...data,
          scheduledFor: date.toISOString(),
          parentEventId: parentEvent.id,
          isRecurring: false
        })
      )
    );

    res.json({ parent: parentEvent, instances });
  } else {
    // Lógica existente
  }
});
```

---

## 3. EVENT RENDERING - PERFORMANCE E UX

### 3.1 Event Cards - Componentes (7/10)

**Arquivo:** `/client/src/components/calendar/EventCard.tsx`

```typescript
// Linhas 82-214: EventCard component
export function EventCard({
  id, type, title, startTime, endTime, client, location,
  status, participants, hasNotes, color, onClick,
  compact = false, draggable = false,
  onDragStart, onDragEnd
}: EventCardProps) {
  const typeConfig = EVENT_TYPE_CONFIG[type];
  const statusConfig = STATUS_CONFIG[status];

  // Linhas 111-135: Compact version (month view)
  if (compact) {
    return (
      <div
        draggable={draggable}
        onClick={handleClick}
        className={cn(
          "group flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer border-l-2",
          typeConfig.bgColor,
          typeConfig.textColor,
        )}
        style={{ borderLeftColor: color }}
      >
        {draggable && <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50" />}
        <Clock className="h-3 w-3 shrink-0" />
        <span className="font-medium truncate flex-1">
          {format(startTime, "HH:mm")} {title}
        </span>
      </div>
    );
  }

  // Linhas 138-214: Full version
  return (
    <div className="group rounded-lg border-l-4 bg-card shadow-sm hover:shadow-md">
      {/* Header com horário */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          {draggable && <GripVertical className="h-4 w-4" />}
          <Clock className="h-4 w-4" />
          <span className="font-semibold text-sm">
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
          </span>
        </div>
        <Badge className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Conteúdo */}
      <div className="px-3 pb-3 space-y-2">
        <h4 className="font-medium text-sm truncate">{title}</h4>
        {client && (
          <div className="flex items-center gap-2 text-xs">
            <User className="h-3.5 w-3.5" />
            <span className="truncate">{client}</span>
          </div>
        )}
        {location && (
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{location}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

#### ✅ Pontos Fortes:

1. **Dual Mode Rendering**
   - Compact: Para month view (1 linha, 30px height)
   - Full: Para day/week/list views (card completo)

2. **Drag & Drop Ready**
   - HTML5 drag API
   - GripVertical indicator
   - Visual feedback (cursor-grab)

3. **Color Coding**
   ```typescript
   export const EVENT_TYPE_CONFIG = {
     visit: { color: '#3b82f6', bgColor: 'bg-blue-50', icon: Building },
     followup: { color: '#22c55e', bgColor: 'bg-green-50', icon: User },
     meeting: { color: '#a855f7', bgColor: 'bg-purple-50', icon: Users },
     other: { color: '#6b7280', bgColor: 'bg-gray-50', icon: FileText }
   };
   ```

#### ❌ Problemas:

**Problema #4: Event Overlap Handling Ausente**

Atualmente, eventos simultâneos se sobrepõem sem lógica de layout:

```typescript
// Problema atual (Day View - linha 1344)
<div className="flex-1 p-2">
  {slotVisits.length > 0 ? (
    <div className="space-y-1">
      {slotVisits.map(visit => (
        <VisitCard visit={visit} /> {/* Empilhados verticalmente */}
      ))}
    </div>
  ) : null}
</div>
```

**Impacto:**
- Eventos às 10:00 aparecem empilhados verticalmente
- Desperdiça espaço horizontal
- Difícil ver sobreposição de horários
- Violação de padrões de calendário (Google/Outlook mostram lado a lado)

**Solução:**
```typescript
// Algoritmo de overlap detection
interface PositionedEvent extends Visit {
  column: number;
  columnWidth: number;
  totalColumns: number;
}

const calculateEventPositions = (events: Visit[]): PositionedEvent[] => {
  // Ordenar por hora de início
  const sorted = events.sort((a, b) =>
    new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
  );

  const positioned: PositionedEvent[] = [];
  const columns: { end: Date, events: Visit[] }[] = [];

  sorted.forEach(event => {
    const start = new Date(event.scheduledFor);
    const end = addMinutes(start, 30); // Assumir 30min duration

    // Encontrar coluna disponível
    let column = columns.findIndex(col => col.end <= start);

    if (column === -1) {
      // Criar nova coluna
      column = columns.length;
      columns.push({ end, events: [event] });
    } else {
      // Usar coluna existente
      columns[column].end = end;
      columns[column].events.push(event);
    }

    positioned.push({
      ...event,
      column,
      columnWidth: 1,
      totalColumns: columns.length
    });
  });

  // Recalcular larguras
  positioned.forEach(event => {
    event.totalColumns = columns.length;
    event.columnWidth = 1;
  });

  return positioned;
};

// Renderização com posicionamento
{positionedEvents.map(event => (
  <div
    key={event.id}
    style={{
      position: 'absolute',
      left: `${(event.column / event.totalColumns) * 100}%`,
      width: `${(event.columnWidth / event.totalColumns) * 100}%`,
      top: calculateTopPosition(event),
      height: calculateHeight(event)
    }}
  >
    <VisitCard visit={event} />
  </div>
))}
```

**Problema #5: Performance com 100+ Eventos**

Sem virtualização ou lazy loading:

```typescript
// Month view renderiza TODOS os eventos (linha 1556+)
<div className="grid grid-cols-7">
  {daysInMonth.map((day) => {
    const dayVisits = getVisitsForDate(day); // Filter loop
    return (
      <div>
        {dayVisits.map(visit => <VisitCard visit={visit} compact />)}
      </div>
    );
  })}
</div>
```

**Impacto:**
- 30 dias × média 5 eventos/dia = 150 cards renderizados
- Filtro `getVisitsForDate` executado 30 vezes
- Re-render completo a cada mudança de mês

**Solução:**
```typescript
// 1. Memoizar eventos por dia
const eventsByDay = useMemo(() => {
  const map = new Map<string, Visit[]>();
  filteredVisits.forEach(visit => {
    const dayKey = format(new Date(visit.scheduledFor), 'yyyy-MM-dd');
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey)!.push(visit);
  });
  return map;
}, [filteredVisits]);

const getVisitsForDate = useCallback((date: Date) => {
  const key = format(date, 'yyyy-MM-dd');
  return eventsByDay.get(key) || [];
}, [eventsByDay]);

// 2. Virtualização para listas longas
import { useVirtualizer } from '@tanstack/react-virtual';

const DayViewWithVirtualization = () => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: TIME_SLOTS.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // 80px per slot
    overscan: 5
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => {
          const slot = TIME_SLOTS[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <TimeSlot slot={slot} />
            </div>
          );
        })}
      </div>
    </div>
  );
};
```

---

## 4. SCHEDULING - TIME SLOTS E AVAILABILITY

### 4.1 Time Slot Management (8/10)

**Arquivo:** `/client/src/pages/calendar/index.tsx`

```typescript
// Linhas 205-211: Slots de 30 minutos
const TIME_SLOTS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30"
];

// Linhas 433-442: Available slots calculation
const getAvailableSlots = useCallback((date: Date) => {
  const dateVisits = visits.filter(v =>
    v.status === "scheduled" &&
    isSameDay(new Date(v.scheduledFor), date)
  );

  const bookedTimes = dateVisits.map(v =>
    format(new Date(v.scheduledFor), "HH:mm")
  );

  return TIME_SLOTS.filter(slot => !bookedTimes.includes(slot));
}, [visits]);
```

#### ✅ Pontos Fortes:

1. **Slot Granularity**
   - Intervalo de 30 minutos
   - Horário comercial (08:00-19:30)
   - 24 slots disponíveis/dia

2. **Conflict Prevention**
   - Slots ocupados removidos da lista
   - Validação no form de criação
   - Visual feedback (slots bloqueados)

#### ❌ Problemas:

**Problema #6: Business Hours Hardcoded**

```typescript
// Slots fixos - não configuráveis
const TIME_SLOTS = ["08:00", "08:30", ...]; // Sempre 8h-19:30
```

**Impacto:**
- Imobiliária que atende sábados 9h-14h: precisa código custom
- Horários de verão/inverno não ajustam
- Feriados não considerados
- Diferentes agentes podem ter horários diferentes

**Solução:**
```typescript
// 1. Business Hours Configuration
interface BusinessHours {
  dayOfWeek: number; // 0-6
  startTime: string; // "09:00"
  endTime: string; // "18:00"
  slotDuration: number; // minutes
  bufferTime?: number; // minutes between slots
}

const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", slotDuration: 30 }, // Monday
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", slotDuration: 30 }, // Tuesday
  // ...
  { dayOfWeek: 6, startTime: "09:00", endTime: "14:00", slotDuration: 30 }, // Saturday
  // Sunday: sem configuração = fechado
];

// 2. Dynamic slot generation
const generateTimeSlots = (date: Date, businessHours: BusinessHours[]): string[] => {
  const dayOfWeek = getDay(date);
  const config = businessHours.find(bh => bh.dayOfWeek === dayOfWeek);

  if (!config) return []; // Fechado neste dia

  const slots: string[] = [];
  const [startHour, startMin] = config.startTime.split(':').map(Number);
  const [endHour, endMin] = config.endTime.split(':').map(Number);

  let current = new Date(date);
  current.setHours(startHour, startMin, 0, 0);

  const end = new Date(date);
  end.setHours(endHour, endMin, 0, 0);

  while (current < end) {
    slots.push(format(current, 'HH:mm'));
    current = addMinutes(current, config.slotDuration);
  }

  return slots;
};

// 3. Agent-specific availability
const getAgentAvailability = async (agentId: string, date: Date) => {
  // Check agent's custom schedule
  const agentSchedule = await storage.getAgentSchedule(agentId, date);

  // Check time-off requests
  const timeOff = await storage.getAgentTimeOff(agentId, date);

  // Check holidays
  const isHoliday = await storage.isHoliday(date);

  if (isHoliday || timeOff) return [];

  return agentSchedule?.slots || generateTimeSlots(date, DEFAULT_BUSINESS_HOURS);
};

// 4. UI Settings
<Accordion>
  <AccordionItem value="business-hours">
    <AccordionTrigger>Horário de Funcionamento</AccordionTrigger>
    <AccordionContent>
      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Checkbox
            checked={businessHours.some(bh => bh.dayOfWeek === i)}
            onCheckedChange={(checked) => {
              if (checked) {
                addBusinessHours(i);
              } else {
                removeBusinessHours(i);
              }
            }}
          />
          <span className="w-12">{day}</span>
          <Input
            type="time"
            value={getBusinessHours(i)?.startTime}
            onChange={(e) => updateStartTime(i, e.target.value)}
          />
          <span>até</span>
          <Input
            type="time"
            value={getBusinessHours(i)?.endTime}
            onChange={(e) => updateEndTime(i, e.target.value)}
          />
        </div>
      ))}
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

**Problema #7: Conflict Detection Básico**

```typescript
// Atual: Apenas verifica horário exato
const bookedTimes = dateVisits.map(v => format(new Date(v.scheduledFor), "HH:mm"));
return TIME_SLOTS.filter(slot => !bookedTimes.includes(slot));
```

**Limitações:**
- Não considera duração do evento
- Evento de 1h às 10:00 bloqueia apenas 10:00, não 10:30
- Sem buffer time entre eventos
- Sem validação de capacidade (múltiplos agentes)

**Solução:**
```typescript
interface Conflict {
  type: 'overlap' | 'buffer' | 'capacity';
  existingEvent: Visit;
  proposedEvent: Partial<Visit>;
  message: string;
}

const detectConflicts = (
  proposedStart: Date,
  proposedDuration: number,
  proposedAgentId: string,
  existingVisits: Visit[]
): Conflict[] => {
  const conflicts: Conflict[] = [];
  const proposedEnd = addMinutes(proposedStart, proposedDuration);

  existingVisits.forEach(existing => {
    // Pular se agentes diferentes (multi-agent support)
    if (existing.assignedTo !== proposedAgentId) return;

    const existingStart = new Date(existing.scheduledFor);
    const existingDuration = parseDuration(existing.notes); // Parse [DURATION:30]
    const existingEnd = addMinutes(existingStart, existingDuration || 30);

    // Check overlap
    const hasOverlap = (
      (proposedStart >= existingStart && proposedStart < existingEnd) ||
      (proposedEnd > existingStart && proposedEnd <= existingEnd) ||
      (proposedStart <= existingStart && proposedEnd >= existingEnd)
    );

    if (hasOverlap) {
      conflicts.push({
        type: 'overlap',
        existingEvent: existing,
        proposedEvent: { scheduledFor: proposedStart.toISOString() },
        message: `Conflito com evento às ${format(existingStart, 'HH:mm')}`
      });
    }

    // Check buffer time (15min antes/depois)
    const bufferTime = 15;
    const bufferedStart = addMinutes(existingStart, -bufferTime);
    const bufferedEnd = addMinutes(existingEnd, bufferTime);

    const violatesBuffer = (
      (proposedStart >= bufferedStart && proposedStart < existingStart) ||
      (proposedEnd > existingEnd && proposedEnd <= bufferedEnd)
    );

    if (violatesBuffer && !hasOverlap) {
      conflicts.push({
        type: 'buffer',
        existingEvent: existing,
        proposedEvent: { scheduledFor: proposedStart.toISOString() },
        message: `Muito próximo do evento às ${format(existingStart, 'HH:mm')} (recomendado 15min de intervalo)`
      });
    }
  });

  return conflicts;
};

// UI Feedback
const ConflictWarning = ({ conflicts }: { conflicts: Conflict[] }) => (
  <Alert variant="destructive">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Conflitos Detectados</AlertTitle>
    <AlertDescription>
      <ul className="list-disc list-inside space-y-1">
        {conflicts.map((conflict, i) => (
          <li key={i}>{conflict.message}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
);
```

---

## 5. DRAG & DROP - RESCHEDULING

### 5.1 Implementation (9/10)

**Arquivo:** `/client/src/pages/calendar/index.tsx`

```typescript
// Linhas 248-251: Drag state
const [draggedVisit, setDraggedVisit] = useState<Visit | null>(null);
const [rescheduleTarget, setRescheduleTarget] = useState<{
  visit: Visit;
  newDate: Date
} | null>(null);

// Linhas 727-750: Drag handlers
const handleDragStart = (e: React.DragEvent, visit: Visit) => {
  if (visit.status !== "scheduled") return; // Apenas eventos futuros
  setDraggedVisit(visit);
  e.dataTransfer.effectAllowed = "move";
};

const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
};

const handleDrop = (e: React.DragEvent, targetDate: Date) => {
  e.preventDefault();
  if (draggedVisit && draggedVisit.status === "scheduled") {
    setRescheduleTarget({ visit: draggedVisit, newDate: targetDate });
    setShowRescheduleNotify(true); // Confirmar reagendamento
  }
  setDraggedVisit(null);
};

const handleDragEnd = () => {
  setDraggedVisit(null);
};

// Linhas 753-794: Reschedule confirmation
const confirmReschedule = async (notify: boolean) => {
  if (!rescheduleTarget) return;

  const { visit, newDate } = rescheduleTarget;
  const originalTime = format(new Date(visit.scheduledFor), "HH:mm");
  const newScheduledFor = new Date(`${format(newDate, "yyyy-MM-dd")}T${originalTime}:00`);

  try {
    await fetch(`/api/visits/${visit.id}`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledFor: newScheduledFor.toISOString() })
    });

    toast({
      title: "Visita reagendada",
      description: `Movida para ${format(newDate, "d 'de' MMMM", { locale: ptBR })}`
    });

    // WhatsApp notification
    if (notify) {
      const message = `Sua visita foi reagendada para ${format(newScheduledFor, "dd/MM 'às' HH:mm")}`;
      setAiMessage(message);
      setShowAiPanel(true);
    }

    await refetchVisits();
  } catch (error) {
    toast({ title: "Erro", description: error.message, variant: "destructive" });
  }
};
```

#### ✅ Pontos Fortes:

1. **Native HTML5 Drag API**
   - Sem dependências externas
   - Performático
   - Acessibilidade built-in

2. **Visual Feedback**
   ```typescript
   // EventCard - linha 146
   draggable={draggable}
   className={cn(
     "cursor-grab active:cursor-grabbing",
     "hover:scale-[1.02] active:scale-[0.98]"
   )}
   ```

3. **Smart Restrictions**
   - Apenas eventos "scheduled" são draggable
   - Mantém horário original, muda apenas data
   - Confirmation dialog com opção de notificação

4. **Drop Zones**
   - Week view: cada dia é drop zone
   - Month view: cada célula é drop zone
   - Visual indicator durante drag (`border-dashed border-2`)

#### ❌ Problemas:

**Problema #8: Mobile Drag & Drop**

HTML5 Drag API tem suporte limitado em mobile:

```typescript
// Atual: Funciona apenas com mouse
<div
  draggable={true}
  onDragStart={(e) => handleDragStart(e, visit)}
  onDrop={(e) => handleDrop(e, date)}
>
```

**Impacto:**
- Não funciona em iOS Safari
- Android Chrome tem suporte parcial
- Touch events precisam de polyfill

**Solução:**
```typescript
// 1. Touch-based drag & drop
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const DraggableVisitCard = ({ visit }: { visit: Visit }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: visit.id,
    data: visit
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    touchAction: 'none' // Evita scroll durante drag
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "transition-transform",
        transform && "z-50 shadow-2xl scale-105"
      )}
    >
      <VisitCard visit={visit} draggable />
    </div>
  );
};

const DroppableDay = ({ date }: { date: Date }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, 'yyyy-MM-dd'),
    data: { date }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] border rounded-lg p-3 transition-colors",
        isOver && "bg-primary/10 border-primary border-2"
      )}
    >
      {/* Day content */}
    </div>
  );
};

// 2. Drag context
import { DndContext, DragEndEvent, TouchSensor, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';

const CalendarWithDnD = () => {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 } // 5px antes de iniciar drag
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 } // Long press
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const visit = active.data.current as Visit;
    const targetDate = over.data.current.date as Date;

    setRescheduleTarget({ visit, newDate: targetDate });
    setShowRescheduleNotify(true);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      {/* Calendar content */}
    </DndContext>
  );
};
```

**Problema #9: Undo/Redo Ausente**

```typescript
// Atual: Sem histórico de mudanças
const confirmReschedule = async (notify: boolean) => {
  await fetch(`/api/visits/${visit.id}`, {
    method: "PATCH",
    body: JSON.stringify({ scheduledFor: newScheduledFor })
  });
  // Mudança permanente imediatamente
};
```

**Impacto:**
- Drag acidental = precisa reagendar manualmente
- Sem "Ctrl+Z"
- Perda de histórico

**Solução:**
```typescript
// 1. Command Pattern
interface Command {
  id: string;
  execute: () => Promise<void>;
  undo: () => Promise<void>;
  timestamp: Date;
}

class RescheduleCommand implements Command {
  id: string;
  private visitId: string;
  private oldDate: Date;
  private newDate: Date;

  constructor(visitId: string, oldDate: Date, newDate: Date) {
    this.id = crypto.randomUUID();
    this.visitId = visitId;
    this.oldDate = oldDate;
    this.newDate = newDate;
  }

  async execute() {
    await fetch(`/api/visits/${this.visitId}`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledFor: this.newDate.toISOString() })
    });
  }

  async undo() {
    await fetch(`/api/visits/${this.visitId}`, {
      method: "PATCH",
      body: JSON.stringify({ scheduledFor: this.oldDate.toISOString() })
    });
  }

  get timestamp() {
    return new Date();
  }
}

// 2. Command Manager
class CommandManager {
  private history: Command[] = [];
  private currentIndex = -1;

  async execute(command: Command) {
    await command.execute();

    // Remove redos
    this.history.splice(this.currentIndex + 1);

    // Add to history
    this.history.push(command);
    this.currentIndex++;

    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
      this.currentIndex--;
    }
  }

  async undo() {
    if (this.currentIndex < 0) return false;

    const command = this.history[this.currentIndex];
    await command.undo();
    this.currentIndex--;
    return true;
  }

  async redo() {
    if (this.currentIndex >= this.history.length - 1) return false;

    this.currentIndex++;
    const command = this.history[this.currentIndex];
    await command.execute();
    return true;
  }

  canUndo() {
    return this.currentIndex >= 0;
  }

  canRedo() {
    return this.currentIndex < this.history.length - 1;
  }
}

// 3. Usage
const commandManager = new CommandManager();

const confirmReschedule = async () => {
  const command = new RescheduleCommand(
    visit.id,
    new Date(visit.scheduledFor),
    newDate
  );

  await commandManager.execute(command);

  // Show toast with undo
  toast({
    title: "Visita reagendada",
    description: `Movida para ${format(newDate, "dd/MM")}`,
    action: (
      <Button size="sm" variant="outline" onClick={() => commandManager.undo()}>
        Desfazer
      </Button>
    ),
    duration: 5000
  });
};

// 4. Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        commandManager.redo();
      } else {
        commandManager.undo();
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

---

## 6. SYNC & INTEGRATIONS - CRÍTICO AUSENTE

### 6.1 Situação Atual (0/10)

**Não há NENHUMA integração de calendário:**

- ❌ Google Calendar sync
- ❌ Outlook/Exchange sync
- ❌ iCal export/import
- ❌ Webhook notifications
- ❌ Two-way sync
- ❌ CalDAV support

**Impacto Business:**
- Agentes precisam duplicar eventos no Google Calendar
- Sem sincronização com calendário pessoal
- Clientes não podem adicionar ao calendário deles
- Notificações limitadas ao sistema

### 6.2 Solução Completa

#### A. Google Calendar Sync

```typescript
// 1. Backend - Google Calendar API
import { google } from 'googleapis';

interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

class GoogleCalendarService {
  private oauth2Client: any;

  constructor(config: GoogleCalendarConfig) {
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  async authorize(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async createEvent(visit: Visit, accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const event = {
      summary: `Visita: ${visit.property?.title}`,
      description: visit.notes || '',
      start: {
        dateTime: visit.scheduledFor,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: addMinutes(new Date(visit.scheduledFor), 30).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      attendees: visit.lead?.email ? [{ email: visit.lead.email }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
      extendedProperties: {
        private: {
          imobiBaseVisitId: visit.id,
          imobiBaseTenantId: visit.tenantId
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data.id; // Google Calendar event ID
  }

  async updateEvent(googleEventId: string, visit: Visit, accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.events.patch({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: {
        start: {
          dateTime: visit.scheduledFor,
          timeZone: 'America/Sao_Paulo',
        },
        end: {
          dateTime: addMinutes(new Date(visit.scheduledFor), 30).toISOString(),
          timeZone: 'America/Sao_Paulo',
        }
      }
    });
  }

  async deleteEvent(googleEventId: string, accessToken: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId
    });
  }

  async watchCalendar(accessToken: string, webhookUrl: string) {
    this.oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: crypto.randomUUID(),
        type: 'web_hook',
        address: webhookUrl,
        token: 'optional-token',
        expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    return response.data;
  }
}

// 2. Database schema
export const calendarIntegrations = pgTable("calendar_integrations", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  tenantId: text("tenant_id").notNull(),
  provider: text("provider").notNull(), // 'google', 'outlook', 'apple'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  calendarId: text("calendar_id"),
  syncEnabled: boolean("sync_enabled").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow()
});

export const calendarEventMappings = pgTable("calendar_event_mappings", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").references(() => visits.id).notNull(),
  integrationId: text("integration_id").references(() => calendarIntegrations.id).notNull(),
  externalEventId: text("external_event_id").notNull(),
  lastSyncedAt: timestamp("last_synced_at").defaultNow()
});

// 3. Sync middleware
class CalendarSyncMiddleware {
  async onVisitCreate(visit: Visit) {
    const integrations = await storage.getUserCalendarIntegrations(visit.assignedTo);

    await Promise.all(
      integrations.filter(i => i.syncEnabled).map(async (integration) => {
        try {
          const service = new GoogleCalendarService(config);
          const externalEventId = await service.createEvent(visit, integration.accessToken);

          await storage.createEventMapping({
            visitId: visit.id,
            integrationId: integration.id,
            externalEventId
          });
        } catch (error) {
          console.error(`Failed to sync visit ${visit.id} to ${integration.provider}:`, error);
        }
      })
    );
  }

  async onVisitUpdate(visit: Visit) {
    const mappings = await storage.getEventMappings(visit.id);

    await Promise.all(
      mappings.map(async (mapping) => {
        const integration = await storage.getCalendarIntegration(mapping.integrationId);
        if (!integration.syncEnabled) return;

        try {
          const service = new GoogleCalendarService(config);
          await service.updateEvent(mapping.externalEventId, visit, integration.accessToken);

          await storage.updateEventMapping(mapping.id, { lastSyncedAt: new Date() });
        } catch (error) {
          console.error(`Failed to sync update for visit ${visit.id}:`, error);
        }
      })
    );
  }

  async onVisitDelete(visit: Visit) {
    const mappings = await storage.getEventMappings(visit.id);

    await Promise.all(
      mappings.map(async (mapping) => {
        const integration = await storage.getCalendarIntegration(mapping.integrationId);

        try {
          const service = new GoogleCalendarService(config);
          await service.deleteEvent(mapping.externalEventId, integration.accessToken);

          await storage.deleteEventMapping(mapping.id);
        } catch (error) {
          console.error(`Failed to delete synced event ${mapping.externalEventId}:`, error);
        }
      })
    );
  }
}

// 4. Routes
app.get('/api/calendar/auth/google', requireAuth, async (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/calendar/callback/google`
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
    state: req.user!.id
  });

  res.redirect(authUrl);
});

app.get('/api/calendar/callback/google', async (req, res) => {
  const { code, state } = req.query;
  const userId = state as string;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/calendar/callback/google`
  );

  const { tokens } = await oauth2Client.getToken(code as string);

  await storage.createCalendarIntegration({
    userId,
    provider: 'google',
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date!)
  });

  res.redirect('/settings?tab=integrations&success=google_calendar_connected');
});

app.post('/api/calendar/webhook/google', async (req, res) => {
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];

  if (resourceState === 'sync') {
    // Initial sync
    res.status(200).send('OK');
    return;
  }

  // Fetch updated events
  const integration = await storage.getIntegrationByChannelId(channelId);
  if (!integration) {
    res.status(404).send('Integration not found');
    return;
  }

  const service = new GoogleCalendarService(config);
  // Fetch and sync changes...

  res.status(200).send('OK');
});
```

#### B. iCal Export

```typescript
// 1. iCal generation
import ical, { ICalCalendar } from 'ical-generator';

class ICalService {
  generateICS(visits: Visit[], user: User): string {
    const calendar = ical({
      name: `${user.name} - ImobiBase Visits`,
      timezone: 'America/Sao_Paulo',
      prodId: {
        company: 'ImobiBase',
        product: 'Visit Calendar',
        language: 'PT'
      }
    });

    visits.forEach(visit => {
      calendar.createEvent({
        start: new Date(visit.scheduledFor),
        end: addMinutes(new Date(visit.scheduledFor), 30),
        summary: `Visita: ${visit.property?.title || 'Imóvel'}`,
        description: this.formatDescription(visit),
        location: visit.property?.address || '',
        url: `${process.env.APP_URL}/calendar?visitId=${visit.id}`,
        organizer: {
          name: user.name,
          email: user.email
        },
        attendees: visit.lead?.email ? [{
          name: visit.lead.name,
          email: visit.lead.email,
          rsvp: true,
          status: 'NEEDS-ACTION'
        }] : [],
        status: visit.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
        alarms: [
          {
            type: 'display',
            trigger: 3600 // 1 hour before
          },
          {
            type: 'display',
            trigger: 900 // 15 min before
          }
        ]
      });
    });

    return calendar.toString();
  }

  private formatDescription(visit: Visit): string {
    const parts = [];

    if (visit.lead) {
      parts.push(`Cliente: ${visit.lead.name}`);
      if (visit.lead.phone) parts.push(`Telefone: ${visit.lead.phone}`);
    }

    if (visit.property) {
      parts.push(`Imóvel: ${visit.property.title}`);
      if (visit.property.price) {
        parts.push(`Valor: R$ ${parseFloat(visit.property.price).toLocaleString('pt-BR')}`);
      }
    }

    if (visit.notes) {
      const cleanNotes = visit.notes
        .replace(/\[TYPE:\w+\]\s*/g, '')
        .replace(/\[CHANNEL:\w+\]\s*/g, '')
        .trim();
      if (cleanNotes) parts.push(`\nObservações:\n${cleanNotes}`);
    }

    return parts.join('\n');
  }
}

// 2. Routes
app.get('/api/calendar/export/ical', requireAuth, async (req, res) => {
  const visits = await storage.getVisitsByTenant(req.user!.tenantId);
  const icalService = new ICalService();

  const ics = icalService.generateICS(visits, req.user!);

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="imobibase-calendar.ics"`);
  res.send(ics);
});

// 3. Frontend download
const exportToICalendar = async () => {
  const response = await fetch('/api/calendar/export/ical', {
    credentials: 'include'
  });

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'imobibase-calendar.ics';
  a.click();
  window.URL.revokeObjectURL(url);

  toast({
    title: "Calendário exportado",
    description: "Arquivo .ics salvo. Importe no Google Calendar, Outlook ou Apple Calendar."
  });
};
```

---

## 7. REMINDERS & NOTIFICATIONS

### 7.1 Situação Atual (3/10)

**Arquivo:** `/client/src/components/calendar/CreateEventModal.tsx`

```typescript
// Linhas 329-351: Reminder selector básico
<Select
  value={formData.reminderMinutes?.toString() || ''}
  onValueChange={(value) => setFormData(prev => ({
    ...prev,
    reminderMinutes: value ? parseInt(value) : undefined
  }))}
>
  <SelectContent>
    <SelectItem value="">Sem lembrete</SelectItem>
    <SelectItem value="5">5 minutos antes</SelectItem>
    <SelectItem value="15">15 minutos antes</SelectItem>
    <SelectItem value="30">30 minutos antes</SelectItem>
    <SelectItem value="60">1 hora antes</SelectItem>
    <SelectItem value="120">2 horas antes</SelectItem>
    <SelectItem value="1440">1 dia antes</SelectItem>
  </SelectContent>
</Select>
```

**Limitações:**
- ❌ Armazenado apenas nas notes: `[REMINDER:60]`
- ❌ Sem backend job para enviar lembretes
- ❌ Sem notificações push
- ❌ Sem email automático
- ❌ Sem WhatsApp reminder
- ❌ Sem múltiplos lembretes

### 7.2 Sistema Completo de Lembretes

```typescript
// 1. Database schema
export const eventReminders = pgTable("event_reminders", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").references(() => visits.id).notNull(),
  method: text("method").notNull(), // 'email', 'sms', 'whatsapp', 'push'
  minutesBefore: integer("minutes_before").notNull(),
  sentAt: timestamp("sent_at"),
  status: text("status").notNull(), // 'pending', 'sent', 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow()
});

// 2. Reminder scheduler (BullMQ job)
import { Queue, Worker } from 'bullmq';

interface ReminderJob {
  reminderId: string;
  visitId: string;
  method: 'email' | 'sms' | 'whatsapp' | 'push';
  leadId: string;
  scheduledFor: Date;
}

class ReminderScheduler {
  private queue: Queue<ReminderJob>;

  constructor() {
    this.queue = new Queue<ReminderJob>('visit-reminders', {
      connection: redisConnection
    });

    this.startWorker();
  }

  async scheduleReminders(visit: Visit, reminderMinutes: number[]) {
    const reminders = await Promise.all(
      reminderMinutes.map(async (minutes) => {
        // Calculate when to send
        const sendAt = new Date(visit.scheduledFor);
        sendAt.setMinutes(sendAt.getMinutes() - minutes);

        // Create reminder record
        const reminder = await storage.createReminder({
          visitId: visit.id,
          method: this.getPreferredMethod(visit.lead),
          minutesBefore: minutes,
          status: 'pending'
        });

        // Schedule job
        await this.queue.add(
          `reminder-${reminder.id}`,
          {
            reminderId: reminder.id,
            visitId: visit.id,
            method: reminder.method,
            leadId: visit.leadId!,
            scheduledFor: new Date(visit.scheduledFor)
          },
          {
            delay: sendAt.getTime() - Date.now(),
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 60000
            }
          }
        );

        return reminder;
      })
    );

    return reminders;
  }

  private getPreferredMethod(lead?: Lead): 'email' | 'sms' | 'whatsapp' | 'push' {
    if (lead?.phone && lead.phone.startsWith('55')) return 'whatsapp';
    if (lead?.email) return 'email';
    if (lead?.phone) return 'sms';
    return 'push';
  }

  private startWorker() {
    new Worker<ReminderJob>(
      'visit-reminders',
      async (job) => {
        const { reminderId, visitId, method, leadId, scheduledFor } = job.data;

        const visit = await storage.getVisit(visitId);
        const lead = await storage.getLead(leadId);

        if (!visit || !lead) {
          throw new Error('Visit or lead not found');
        }

        // Check if visit was cancelled/rescheduled
        if (visit.status === 'cancelled' || visit.scheduledFor !== scheduledFor.toISOString()) {
          await storage.updateReminder(reminderId, {
            status: 'cancelled',
            errorMessage: 'Visit was modified or cancelled'
          });
          return;
        }

        // Send reminder
        try {
          switch (method) {
            case 'email':
              await this.sendEmailReminder(visit, lead);
              break;
            case 'sms':
              await this.sendSMSReminder(visit, lead);
              break;
            case 'whatsapp':
              await this.sendWhatsAppReminder(visit, lead);
              break;
            case 'push':
              await this.sendPushReminder(visit, lead);
              break;
          }

          await storage.updateReminder(reminderId, {
            status: 'sent',
            sentAt: new Date()
          });
        } catch (error: any) {
          await storage.updateReminder(reminderId, {
            status: 'failed',
            errorMessage: error.message
          });
          throw error; // Retry via BullMQ
        }
      },
      { connection: redisConnection }
    );
  }

  private async sendEmailReminder(visit: Visit, lead: Lead) {
    const emailService = new SendGridService();

    await emailService.send({
      to: lead.email!,
      templateId: 'visit-reminder',
      dynamicTemplateData: {
        leadName: lead.name,
        propertyTitle: visit.property?.title,
        propertyAddress: visit.property?.address,
        visitDateTime: format(new Date(visit.scheduledFor), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR }),
        agentName: visit.assignedToUser?.name,
        agentPhone: visit.assignedToUser?.phone,
        addToCalendarUrl: `${process.env.APP_URL}/api/calendar/ical/${visit.id}`,
        cancelUrl: `${process.env.APP_URL}/visit/cancel/${visit.id}`
      }
    });
  }

  private async sendWhatsAppReminder(visit: Visit, lead: Lead) {
    const whatsappService = new WhatsAppService();

    const message = `
🏠 *Lembrete de Visita*

Olá ${lead.name}!

Sua visita ao imóvel está agendada para:
📅 ${format(new Date(visit.scheduledFor), "dd/MM/yyyy 'às' HH:mm")}

📍 ${visit.property?.address}

Aguardamos você! Em caso de imprevistos, por favor avise com antecedência.
    `.trim();

    await whatsappService.sendMessage(lead.phone!, message);
  }

  private async sendSMSReminder(visit: Visit, lead: Lead) {
    const smsService = new TwilioService();

    const message = `ImobiBase: Lembrete de visita ao ${visit.property?.title} em ${format(new Date(visit.scheduledFor), "dd/MM 'às' HH:mm")}. Aguardamos você!`;

    await smsService.sendSMS(lead.phone!, message);
  }

  private async sendPushReminder(visit: Visit, lead: Lead) {
    // Web Push API ou Firebase Cloud Messaging
    const pushService = new PushNotificationService();

    await pushService.send({
      userId: visit.assignedTo!,
      title: 'Lembrete de Visita',
      body: `Visita ao ${visit.property?.title} em ${format(new Date(visit.scheduledFor), "HH:mm")}`,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: {
        visitId: visit.id,
        url: `/calendar?visitId=${visit.id}`
      }
    });
  }
}

// 3. Updated create modal
const CreateEventModalWithMultipleReminders = () => {
  const [reminders, setReminders] = useState<number[]>([60]); // Default: 1 hour

  const addReminder = () => {
    setReminders([...reminders, 60]);
  };

  const removeReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const updateReminder = (index: number, value: number) => {
    const updated = [...reminders];
    updated[index] = value;
    setReminders(updated);
  };

  return (
    <div className="space-y-3">
      <Label>Lembretes</Label>
      {reminders.map((minutes, index) => (
        <div key={index} className="flex gap-2">
          <Select
            value={minutes.toString()}
            onValueChange={(v) => updateReminder(index, parseInt(v))}
          >
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 minutos antes</SelectItem>
              <SelectItem value="15">15 minutos antes</SelectItem>
              <SelectItem value="30">30 minutos antes</SelectItem>
              <SelectItem value="60">1 hora antes</SelectItem>
              <SelectItem value="120">2 horas antes</SelectItem>
              <SelectItem value="1440">1 dia antes</SelectItem>
              <SelectItem value="2880">2 dias antes</SelectItem>
              <SelectItem value="10080">1 semana antes</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeReminder(index)}
            disabled={reminders.length === 1}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addReminder}
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Lembrete
      </Button>
    </div>
  );
};
```

---

## 8. TEAM CALENDAR - AUSENTE (0/10)

### 8.1 Features Necessárias

```typescript
// 1. Team view
interface TeamCalendarView {
  agents: User[];
  selectedDate: Date;
  viewMode: 'day' | 'week';
}

const TeamCalendar = () => {
  const { users } = useImobi();
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Load visits for multiple agents
  const { data: teamVisits } = useQuery({
    queryKey: ['teamVisits', selectedAgents, selectedDate],
    queryFn: async () => {
      const response = await fetch(`/api/visits/team?${new URLSearchParams({
        agentIds: selectedAgents.join(','),
        date: format(selectedDate, 'yyyy-MM-dd')
      })}`);
      return response.json();
    }
  });

  return (
    <div className="space-y-4">
      {/* Agent selector */}
      <MultiSelect
        options={users.map(u => ({ value: u.id, label: u.name }))}
        value={selectedAgents}
        onChange={setSelectedAgents}
        placeholder="Selecionar corretores"
      />

      {/* Team timeline */}
      <div className="border rounded-lg">
        {selectedAgents.map(agentId => {
          const agent = users.find(u => u.id === agentId);
          const agentVisits = teamVisits?.filter((v: Visit) => v.assignedTo === agentId);

          return (
            <div key={agentId} className="border-b last:border-b-0">
              <div className="p-3 bg-muted flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{agent?.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{agent?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {agentVisits?.length || 0} visitas
                  </div>
                </div>
                <Badge variant={getAvailabilityBadge(agentVisits)}>
                  {getAvailabilityStatus(agentVisits)}
                </Badge>
              </div>

              {/* Timeline for this agent */}
              <div className="p-2">
                <AgentDayTimeline visits={agentVisits} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// 2. Resource booking (salas de reunião)
interface Resource {
  id: string;
  name: string;
  type: 'meeting_room' | 'vehicle' | 'equipment';
  capacity?: number;
  location?: string;
}

export const resources = pgTable("resources", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  capacity: integer("capacity"),
  location: text("location"),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow()
});

export const resourceBookings = pgTable("resource_bookings", {
  id: text("id").primaryKey(),
  resourceId: text("resource_id").references(() => resources.id).notNull(),
  visitId: text("visit_id").references(() => visits.id),
  bookedBy: text("booked_by").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  purpose: text("purpose"),
  createdAt: timestamp("created_at").defaultNow()
});

// 3. Shared calendars
export const sharedCalendars = pgTable("shared_calendars", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tenantId: text("tenant_id").notNull(),
  ownerId: text("owner_id").references(() => users.id).notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow()
});

export const calendarShares = pgTable("calendar_shares", {
  id: text("id").primaryKey(),
  calendarId: text("calendar_id").references(() => sharedCalendars.id).notNull(),
  userId: text("user_id").references(() => users.id).notNull(),
  permission: text("permission").notNull(), // 'view', 'edit', 'admin'
  createdAt: timestamp("created_at").defaultNow()
});
```

---

## 9. VISIT MANAGEMENT - FEATURES ESPECÍFICAS

### 9.1 Implementação Atual (8.5/10)

#### ✅ Pontos Fortes:

1. **Visit Status Tracking**
   ```typescript
   // Linhas 85-126: Status configuration
   const STATUS_CONFIG = {
     scheduled: { bg: "bg-blue-100", label: "Agendada", icon: CalendarIcon },
     completed: { bg: "bg-green-100", label: "Realizada", icon: CheckCircle },
     cancelled: { bg: "bg-red-100", label: "Cancelada", icon: XCircle },
     rescheduled: { bg: "bg-amber-100", label: "Reagendada", icon: RefreshCw },
     noshow: { bg: "bg-gray-100", label: "Não Compareceu", icon: UserX },
   };
   ```

2. **Smart Alerts**
   ```typescript
   // Linhas 320-375: Alert system
   const alerts = useMemo(() => {
     // Visits starting in next 30 minutes
     const startingSoon = visits.filter(v => {
       const minutesUntil = differenceInMinutes(new Date(v.scheduledFor), now);
       return minutesUntil > 0 && minutesUntil <= 30;
     });

     // Delayed visits
     const delayedVisits = visits.filter(v =>
       v.status === "scheduled" &&
       isPast(new Date(v.scheduledFor)) &&
       !isToday(new Date(v.scheduledFor))
     );

     // Needs feedback
     const needsFeedback = visits.filter(v =>
       v.status === "completed" &&
       isToday(new Date(v.scheduledFor)) &&
       !v.notes?.includes("[FEEDBACK:")
     );

     return [startingSoon, delayedVisits, needsFeedback];
   }, [visits]);
   ```

3. **AI-Powered Messages**
   ```typescript
   // Linhas 152-181: AI prompt templates
   const AI_PROMPTS = [
     {
       id: "confirm",
       label: "Confirmar visita",
       template: (visit) => `Olá ${visit.lead?.name}! Gostaria de confirmar...`
     },
     {
       id: "remind",
       label: "Lembrete de visita",
       template: (visit) => `Lembrando que sua visita está marcada...`
     },
     {
       id: "feedback",
       label: "Pedir feedback pós-visita",
       template: (visit) => `Foi um prazer recebê-lo...`
     },
     {
       id: "reschedule",
       label: "Reagendar visita",
       template: (visit) => `Precisamos reagendar sua visita...`
     }
   ];
   ```

4. **Feedback System**
   ```typescript
   // Linhas 2204-2252: Feedback dialog
   const FEEDBACK_OPTIONS = [
     { value: "interested", label: "Interessado", icon: ThumbsUp },
     { value: "not_interested", label: "Não Interessado", icon: ThumbsDown },
     { value: "thinking", label: "Pensando", icon: Clock },
   ];
   ```

5. **Analytics**
   ```typescript
   // Linhas 286-317: Stats calculation
   const stats = useMemo((): VisitStats => ({
     scheduled: visits.filter(v => v.status === "scheduled").length,
     completed: visits.filter(v => v.status === "completed").length,
     cancelled: visits.filter(v => v.status === "cancelled").length,
     delayed: visits.filter(v => isPast(v.scheduledFor) && v.status === "scheduled").length,
     today: todayVisits.length,
     week: weekVisits.length,
   }), [visits]);
   ```

#### ❌ Problemas:

**Problema #10: Route Optimization Ausente**

**Necessidade:**
- Corretor tem 5 visitas no mesmo dia em bairros diferentes
- Precisa otimizar rota para minimizar tempo de deslocamento
- Integrar com Google Maps Directions API

**Solução:**
```typescript
// 1. Route optimization service
import { Client as GoogleMapsClient } from '@googlemaps/google-maps-services-js';

interface OptimizedRoute {
  visits: Visit[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  waypoints: { lat: number; lng: number; visitId: string }[];
  mapUrl: string;
}

class RouteOptimizationService {
  private mapsClient: GoogleMapsClient;

  constructor() {
    this.mapsClient = new GoogleMapsClient({});
  }

  async optimizeRoute(visits: Visit[], startLocation?: string): Promise<OptimizedRoute> {
    if (visits.length === 0) {
      throw new Error('No visits to optimize');
    }

    // Geocode all addresses
    const locations = await Promise.all(
      visits.map(async (visit) => {
        const address = visit.property?.address;
        if (!address) return null;

        const response = await this.mapsClient.geocode({
          params: {
            address,
            key: process.env.GOOGLE_MAPS_API_KEY!
          }
        });

        const location = response.data.results[0]?.geometry.location;
        return location ? { ...location, visitId: visit.id } : null;
      })
    );

    const validLocations = locations.filter(Boolean);

    // Use Directions API with waypoint optimization
    const origin = startLocation || validLocations[0];
    const destination = validLocations[validLocations.length - 1];
    const waypoints = validLocations.slice(1, -1);

    const directionsResponse = await this.mapsClient.directions({
      params: {
        origin: `${origin.lat},${origin.lng}`,
        destination: `${destination.lat},${destination.lng}`,
        waypoints: waypoints.map(w => `${w.lat},${w.lng}`),
        optimize: true, // Google automatically reorders waypoints
        mode: 'driving',
        key: process.env.GOOGLE_MAPS_API_KEY!
      }
    });

    const route = directionsResponse.data.routes[0];
    const waypointOrder = route.waypoint_order || [];

    // Reorder visits based on optimized route
    const optimizedVisits = [
      visits[0],
      ...waypointOrder.map(index => visits[index + 1]),
      visits[visits.length - 1]
    ];

    // Calculate totals
    const totalDistance = route.legs.reduce((sum, leg) => sum + leg.distance.value, 0);
    const totalDuration = route.legs.reduce((sum, leg) => sum + leg.duration.value, 0);

    // Generate shareable map URL
    const mapUrl = this.generateMapUrl(optimizedVisits);

    return {
      visits: optimizedVisits,
      totalDistance,
      totalDuration,
      waypoints: validLocations,
      mapUrl
    };
  }

  private generateMapUrl(visits: Visit[]): string {
    const addresses = visits
      .map(v => v.property?.address)
      .filter(Boolean)
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&waypoints=${encodeURIComponent(addresses)}`;
  }
}

// 2. Frontend component
const RouteOptimizer = ({ date }: { date: Date }) => {
  const { visits } = useImobi();
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const dayVisits = visits.filter(v =>
    v.status === 'scheduled' &&
    isSameDay(new Date(v.scheduledFor), date)
  );

  const handleOptimize = async () => {
    setIsOptimizing(true);
    try {
      const response = await fetch('/api/visits/optimize-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitIds: dayVisits.map(v => v.id),
          date: format(date, 'yyyy-MM-dd')
        })
      });

      const result = await response.json();
      setOptimizedRoute(result);

      toast({
        title: "Rota otimizada!",
        description: `${formatDistance(result.totalDistance)} • ${formatDuration(result.totalDuration)}`
      });
    } catch (error) {
      toast({
        title: "Erro ao otimizar rota",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Otimização de Rota
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{dayVisits.length} visitas</div>
            <div className="text-sm text-muted-foreground">
              {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </div>
          </div>
          <Button onClick={handleOptimize} disabled={isOptimizing || dayVisits.length < 2}>
            {isOptimizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Otimizar Rota
          </Button>
        </div>

        {optimizedRoute && (
          <div className="space-y-3">
            <Separator />

            {/* Route summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Distância Total</div>
                <div className="font-semibold">
                  {(optimizedRoute.totalDistance / 1000).toFixed(1)} km
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Tempo Estimado</div>
                <div className="font-semibold">
                  {Math.round(optimizedRoute.totalDuration / 60)} min
                </div>
              </div>
            </div>

            {/* Optimized order */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Ordem Recomendada:</div>
              {optimizedRoute.visits.map((visit, index) => {
                const details = getVisitDetails(visit);
                return (
                  <div key={visit.id} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {format(new Date(visit.scheduledFor), "HH:mm")} - {details.property?.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {details.property?.address}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" asChild>
                <a href={optimizedRoute.mapUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir no Maps
                </a>
              </Button>
              <Button variant="outline" onClick={() => shareRoute(optimizedRoute)}>
                <Send className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

**Problema #11: Check-in/Check-out Ausente**

**Necessidade:**
- Corretor precisa registrar quando chegou e saiu da visita
- GPS tracking para validação
- Tempo real de visita para analytics

**Solução:**
```typescript
// 1. Schema
export const visitCheckIns = pgTable("visit_check_ins", {
  id: text("id").primaryKey(),
  visitId: text("visit_id").references(() => visits.id).notNull(),
  checkInAt: timestamp("check_in_at").notNull(),
  checkInLocation: text("check_in_location"), // JSON: { lat, lng, accuracy }
  checkOutAt: timestamp("check_out_at"),
  checkOutLocation: text("check_out_location"),
  duration: integer("duration"), // seconds
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// 2. Frontend component
const VisitCheckIn = ({ visit }: { visit: Visit }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckIn = async () => {
    setIsLoading(true);
    try {
      // Get current location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      // Validate proximity to property
      const distance = calculateDistance(
        location,
        visit.property?.location // Assumir que temos lat/lng da propriedade
      );

      if (distance > 500) { // 500 meters
        const confirm = await showConfirmDialog({
          title: "Localização Distante",
          description: `Você está a ${Math.round(distance)}m do imóvel. Deseja fazer check-in mesmo assim?`
        });
        if (!confirm) {
          setIsLoading(false);
          return;
        }
      }

      // Create check-in
      const response = await fetch(`/api/visits/${visit.id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location })
      });

      const data = await response.json();
      setCheckInData(data);
      setIsCheckedIn(true);

      toast({
        title: "Check-in realizado",
        description: `Início da visita registrado às ${format(new Date(), "HH:mm")}`
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fazer check-in",
        description: error.message === 'User denied Geolocation'
          ? "Permissão de localização negada"
          : error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setIsLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true
        });
      });

      const location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      };

      const response = await fetch(`/api/visits/${visit.id}/check-out`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkInId: checkInData.id,
          location
        })
      });

      const data = await response.json();

      toast({
        title: "Check-out realizado",
        description: `Visita durou ${formatDuration(data.duration)}`
      });

      // Open feedback dialog
      setFeedbackVisit(visit);
    } catch (error: any) {
      toast({
        title: "Erro ao fazer check-out",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {!isCheckedIn ? (
          <Button
            onClick={handleCheckIn}
            className="w-full h-14"
            size="lg"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
            <MapPin className="h-5 w-5 mr-2" />
            Fazer Check-in
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-green-900">Em Visita</div>
                  <div className="text-sm text-green-700">
                    Iniciado às {format(new Date(checkInData.checkInAt), "HH:mm")}
                  </div>
                </div>
              </div>
              <Timer startTime={new Date(checkInData.checkInAt)} />
            </div>

            <Button
              onClick={handleCheckOut}
              variant="outline"
              className="w-full h-14"
              size="lg"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-5 w-5 mr-2 animate-spin" />}
              Finalizar Visita
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// 3. Timer component
const Timer = ({ startTime }: { startTime: Date }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;

  return (
    <div className="font-mono text-lg font-bold text-green-900">
      {hours.toString().padStart(2, '0')}:
      {minutes.toString().padStart(2, '0')}:
      {seconds.toString().padStart(2, '0')}
    </div>
  );
};
```

---

## 10. PERFORMANCE - ANÁLISE E OTIMIZAÇÕES

### 10.1 Current Performance Score (6/10)

**Problemas Identificados:**

1. ❌ **Todos os eventos carregados em memória**
   ```typescript
   // Linha 214: useImobi hook carrega TODOS os visits do tenant
   const { visits, leads, properties } = useImobi();
   ```
   - 1000+ visitas históricas = payload enorme
   - Re-renders desnecessários
   - Memória desperdiçada

2. ❌ **Filtros executam a cada render**
   ```typescript
   // Linhas 378-406: useMemo mas dependencies muito amplas
   const filteredVisits = useMemo(() => {
     return visits.filter(v => {
       // Complex filters
     });
   }, [visits, filters, visibleStatuses, getVisitDetails]);
   ```

3. ❌ **getVisitsForDate executado repetidamente**
   ```typescript
   // Month view: 30+ chamadas em um único render
   {daysInMonth.map((day) => {
     const dayVisits = getVisitsForDate(day); // Filter completo
   })}
   ```

### 10.2 Otimizações

```typescript
// 1. Server-side pagination + date range
app.get("/api/visits", requireAuth, async (req, res) => {
  const { startDate, endDate, page = 1, limit = 100 } = req.query;

  const query = db
    .select()
    .from(visits)
    .where(
      and(
        eq(visits.tenantId, req.user!.tenantId),
        gte(visits.scheduledFor, startDate),
        lte(visits.scheduledFor, endDate)
      )
    )
    .orderBy(visits.scheduledFor)
    .limit(limit)
    .offset((page - 1) * limit);

  const results = await query;
  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(visits)
    .where(eq(visits.tenantId, req.user!.tenantId));

  res.json({
    visits: results,
    pagination: {
      page,
      limit,
      total: total[0].count,
      pages: Math.ceil(total[0].count / limit)
    }
  });
});

// 2. React Query with date range
const useVisitsInRange = (startDate: Date, endDate: Date) => {
  return useQuery({
    queryKey: ['visits', format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(`/api/visits?${new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

// 3. Memoized event map
const useEventsByDay = (visits: Visit[]) => {
  return useMemo(() => {
    const map = new Map<string, Visit[]>();

    visits.forEach(visit => {
      const dayKey = format(new Date(visit.scheduledFor), 'yyyy-MM-dd');
      if (!map.has(dayKey)) {
        map.set(dayKey, []);
      }
      map.get(dayKey)!.push(visit);
    });

    // Sort events within each day
    map.forEach(dayEvents => {
      dayEvents.sort((a, b) =>
        new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
      );
    });

    return map;
  }, [visits]);
};

// 4. Virtual scrolling for day view
import { FixedSizeList } from 'react-window';

const VirtualDayView = () => {
  const { data: visits } = useVisitsInRange(selectedDate, selectedDate);
  const eventsByDay = useEventsByDay(visits?.visits || []);

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const slot = TIME_SLOTS[index];
    const dayKey = format(selectedDate, 'yyyy-MM-dd');
    const dayEvents = eventsByDay.get(dayKey) || [];
    const slotEvents = dayEvents.filter(v =>
      format(new Date(v.scheduledFor), "HH:mm") === slot
    );

    return (
      <div style={style} className="border-b">
        <TimeSlotRow slot={slot} events={slotEvents} />
      </div>
    );
  };

  return (
    <FixedSizeList
      height={600}
      itemCount={TIME_SLOTS.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};

// 5. Lazy load details
const LazyVisitDetails = ({ visitId }: { visitId: string }) => {
  const { data: visit, isLoading } = useQuery({
    queryKey: ['visit', visitId],
    queryFn: async () => {
      const response = await fetch(`/api/visits/${visitId}`);
      return response.json();
    },
    enabled: !!visitId
  });

  if (isLoading) return <DetailsSkeleton />;
  return <VisitDetailsPanel visit={visit} />;
};

// 6. Debounced search
import { useDebouncedValue } from '@/hooks/useDebounce';

const CalendarWithSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const { data: searchResults } = useQuery({
    queryKey: ['visitSearch', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch) return [];
      const response = await fetch(`/api/visits/search?q=${encodeURIComponent(debouncedSearch)}`);
      return response.json();
    },
    enabled: debouncedSearch.length >= 2
  });

  return (
    <Input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Buscar visitas..."
    />
  );
};
```

---

## 11. COMPARAÇÃO FINAL COM BENCHMARKS

### Google Calendar

| Feature | ImobiBase | Google | Gap Analysis |
|---------|-----------|--------|--------------|
| Recurring Events | ❌ 0/10 | ✅ 10/10 | **CRÍTICO** - Implementar RRULE |
| Calendar Sync | ❌ 0/10 | ✅ 10/10 | **CRÍTICO** - Google API integration |
| Team Sharing | ❌ 0/10 | ✅ 9/10 | **IMPORTANTE** - Multi-user calendars |
| Mobile App | ❌ 0/10 | ✅ 10/10 | **OK** - PWA suficiente |
| Smart Scheduling | ⚠️ 5/10 | ✅ 9/10 | **MELHORAR** - Find a time, suggest slots |
| Multiple Calendars | ❌ 0/10 | ✅ 10/10 | **DESEJÁVEL** - Separar pessoal/trabalho |
| Keyboard Shortcuts | ❌ 0/10 | ✅ 8/10 | **MELHORAR** - Produtividade |
| Drag & Drop | ✅ 9/10 | ✅ 10/10 | **OK** - Já implementado bem |
| Touch Gestures | ✅ 9/10 | ⚠️ 7/10 | **MELHOR** - ImobiBase superior |
| Performance 1000+ | ⚠️ 4/10 | ✅ 9/10 | **MELHORAR** - Virtualização |

### Outlook Calendar

| Feature | ImobiBase | Outlook | Gap Analysis |
|---------|-----------|---------|--------------|
| Exchange Sync | ❌ 0/10 | ✅ 10/10 | **IMPORTANTE** - Corporate users |
| Meeting Rooms | ❌ 0/10 | ✅ 10/10 | **DESEJÁVEL** - Resource booking |
| Email Integration | ❌ 0/10 | ✅ 10/10 | **DESEJÁVEL** - Auto-schedule from email |
| Timezone Support | ❌ 0/10 | ✅ 10/10 | **IMPORTANTE** - International |
| Categories/Tags | ⚠️ 3/10 | ✅ 9/10 | **MELHORAR** - Visit types básico |
| Search | ⚠️ 7/10 | ✅ 9/10 | **OK** - Suficiente |

### Calendly

| Feature | ImobiBase | Calendly | Gap Analysis |
|---------|-----------|----------|--------------|
| Public Booking | ❌ 0/10 | ✅ 10/10 | **CRÍTICO** - Clientes agendarem sozinhos |
| Availability Rules | ⚠️ 5/10 | ✅ 10/10 | **IMPORTANTE** - Business hours config |
| Buffer Times | ❌ 0/10 | ✅ 9/10 | **MELHORAR** - Evitar burnout |
| Custom Forms | ❌ 0/10 | ✅ 9/10 | **DESEJÁVEL** - Lead capture |
| Payment Integration | ❌ 0/10 | ✅ 8/10 | **FUTURO** - Cobrar visitas premium |
| Analytics | ✅ 8/10 | ✅ 9/10 | **OK** - Já razoável |

### Cal.com (Open Source)

| Feature | ImobiBase | Cal.com | Gap Analysis |
|---------|-----------|---------|--------------|
| Self-hosted | ✅ 10/10 | ✅ 10/10 | **OK** - Ambos |
| Team Scheduling | ❌ 0/10 | ✅ 9/10 | **IMPORTANTE** - Round-robin, collective |
| Workflows | ❌ 0/10 | ✅ 9/10 | **DESEJÁVEL** - Auto-actions |
| API-first | ⚠️ 5/10 | ✅ 10/10 | **MELHORAR** - Webhooks, REST API completo |
| Customization | ✅ 9/10 | ✅ 8/10 | **MELHOR** - ImobiBase específico imobiliário |

---

## 12. ROADMAP DE IMPLEMENTAÇÃO

### Priority 1 - CRITICAL (Sprint 1-2, 2 semanas)

1. **Recurring Events** (5 dias)
   - RRULE support
   - UI para recurrence rules
   - Backend generation
   - Edit single vs all instances

2. **Google Calendar Sync** (5 dias)
   - OAuth2 flow
   - Two-way sync
   - Webhook handling
   - Conflict resolution

3. **Performance Optimization** (3 dias)
   - Date range queries
   - Event memoization
   - Virtual scrolling day view
   - Lazy load details

### Priority 2 - IMPORTANT (Sprint 3-4, 2 semanas)

4. **Business Hours Config** (3 dias)
   - Per-agent schedules
   - Holiday calendar
   - Time-off requests
   - UI settings panel

5. **Advanced Reminders** (4 dias)
   - Multi-channel (email, SMS, WhatsApp)
   - Multiple reminders per event
   - BullMQ job queue
   - Retry logic

6. **Conflict Detection** (3 dias)
   - Overlap detection
   - Buffer time validation
   - Visual warnings
   - Smart suggestions

### Priority 3 - DESIRABLE (Sprint 5-6, 2 semanas)

7. **Team Calendar** (5 dias)
   - Multi-agent view
   - Resource booking (salas)
   - Shared calendars
   - Permissions

8. **Public Booking Page** (5 dias)
   - Customer-facing URL
   - Availability display
   - Lead capture form
   - Email confirmations

9. **Route Optimization** (3 dias)
   - Google Maps integration
   - Waypoint optimization
   - Distance/duration estimates
   - Shareable routes

### Priority 4 - ENHANCEMENT (Backlog)

10. **Mobile App** (2-3 semanas)
    - React Native wrapper
    - Offline mode
    - Push notifications
    - GPS tracking

11. **AI Features** (1-2 semanas)
    - Smart scheduling suggestions
    - Conflict prediction
    - Auto-categorization
    - NLP for quick add

12. **Advanced Analytics** (1 semana)
    - Visit conversion rates
    - Agent performance
    - No-show patterns
    - Revenue attribution

---

## 13. CONCLUSÃO E RECOMENDAÇÕES

### Pontos Fortes do Módulo Atual

1. **Mobile UX Excelente (9/10)**
   - Touch gestures nativo
   - Swipe navigation
   - FAB posicionado corretamente
   - Responsividade superior a Google/Outlook mobile

2. **Drag & Drop Profissional (9/10)**
   - HTML5 API implementado corretamente
   - Visual feedback claro
   - Confirmation dialog inteligente
   - WhatsApp integration no reschedule

3. **Visit Management Específico (8.5/10)**
   - Smart alerts (starting soon, delayed, needs feedback)
   - AI-powered message templates
   - Feedback system pós-visita
   - Stats dashboard útil

### Lacunas Críticas

1. **Recurring Events (0/10) - SHOW STOPPER**
   - Impossível criar eventos semanais
   - Forçar re-criação manual
   - Perda de produtividade enorme

2. **Calendar Sync (0/10) - BUSINESS CRITICAL**
   - Sem integração Google/Outlook
   - Duplicação de trabalho
   - Perda de adoção do sistema

3. **Team Features (0/10) - COLABORAÇÃO IMPOSSÍVEL**
   - Sem view de equipe
   - Sem resource booking
   - Sem calendários compartilhados

### Recomendações Finais

**IMPLEMENTAR IMEDIATAMENTE (próximos 30 dias):**
1. Recurring events com RRULE
2. Google Calendar sync (two-way)
3. Performance optimization (virtual scrolling, date ranges)

**IMPLEMENTAR EM SEGUIDA (60 dias):**
1. Business hours configuration
2. Advanced reminder system (multi-channel)
3. Team calendar view

**CONSIDERAR PARA FUTURO:**
1. Public booking page (competitor de Calendly)
2. Mobile app nativo (React Native)
3. AI-powered scheduling suggestions

**MANTER COMO ESTÁ:**
- Touch gestures
- Drag & drop
- Visit-specific features
- Mobile responsiveness

---

## SCORE FINAL: 5.5/10

**Breakdown:**
- Mobile UX: 9/10
- Core Features: 7/10
- Performance: 6/10
- Integrations: 0/10
- Team Features: 0/10
- Visit Management: 8.5/10

**Comparação com Mercado:**
- Google Calendar: 9.5/10
- Outlook Calendar: 9/10
- Calendly: 8.5/10
- Cal.com: 8/10
- **ImobiBase: 5.5/10** (mas com potencial de 8.5/10 após melhorias)

---

**Report gerado por:** Agente 7 - Calendar Ultra Deep Dive Specialist
**Data:** 25/12/2025
**Próximo passo:** Implementar Priority 1 do roadmap
