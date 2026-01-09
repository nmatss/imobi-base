# Componentes de Vendas - Pipeline Visual e Propostas

Este diretório contém os componentes melhorados para a página de Vendas, incluindo pipeline visual, propostas simplificadas e funil de vendas.

## 📦 Componentes Disponíveis

### 1. SalesPipeline.tsx

Pipeline visual Kanban-style para gerenciar oportunidades de vendas através dos estágios.

**Características:**
- 5 estágios configuráveis (Interesse Inicial → Proposta Enviada → Negociação → Aprovação Financeira → Fechamento)
- Cards de oportunidade com imagem da propriedade, comprador e valor
- Indicador visual de % do valor pedido (verde ≥90%, amarelo 80-89%, vermelho <80%)
- Dias no estágio
- Ações rápidas: Ver, Contatar, Mover estágio
- Resumo por estágio: quantidade e valor total
- Funil de conversão integrado
- Scroll horizontal responsivo

**Props:**
```typescript
interface SalesPipelineProps {
  stages: PipelineStage[];
  onMoveStage?: (opportunityId: string, newStage: string) => void;
  onViewOpportunity?: (opportunityId: string) => void;
  onContactBuyer?: (buyerId: string) => void;
}

interface PipelineStage {
  id: string;
  name: string;
  opportunities: SaleOpportunity[];
  totalValue: number;
  color: string;
}

interface SaleOpportunity {
  id: string;
  property: {
    id: string;
    address: string;
    imageUrl?: string;
    askingPrice: number;
  };
  buyer: {
    name: string;
    avatar?: string;
  };
  proposedValue: number;
  stage: string;
  daysInStage: number;
  createdAt: Date;
}
```

**Exemplo de uso:**
```tsx
import { SalesPipeline } from "./SalesPipeline";

const stages = [
  {
    id: "initial",
    name: "Interesse Inicial",
    opportunities: [...],
    totalValue: 5000000,
    color: "blue"
  },
  // ... outros estágios
];

<SalesPipeline
  stages={stages}
  onMoveStage={(oppId, newStage) => console.log("Move", oppId, "to", newStage)}
  onViewOpportunity={(oppId) => console.log("View", oppId)}
  onContactBuyer={(buyerId) => console.log("Contact", buyerId)}
/>
```

---

### 2. ProposalCard.tsx

Card de proposta simplificado com ações rápidas e informações visuais claras.

**Características:**
- Header com propriedade e status badge colorido
- Informações do comprador e data da proposta
- Valor proposto em destaque com % do valor pedido
- Barra visual de progresso do valor
- Condições principais (entrada, financiamento, prazo)
- Ações contextuais baseadas no status:
  - **Pendente**: Aceitar | Contra-propor | Recusar
  - **Negociando**: Continuar negociação | Aceitar
  - **Aceita/Recusada**: Ver detalhes

**Props:**
```typescript
interface ProposalCardProps {
  id: string;
  property: {
    address: string;
    askingPrice: number;
    imageUrl?: string;
  };
  buyer: {
    name: string;
    contact: string;
    avatar?: string;
  };
  proposedValue: number;
  downPayment?: number;
  financing?: boolean;
  deadline?: Date;
  status: 'pending' | 'accepted' | 'rejected' | 'negotiating';
  createdAt: Date;
  notes?: string;
  onAccept?: (id: string) => void;
  onCounterOffer?: (id: string) => void;
  onReject?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}
```

**Exemplo de uso:**
```tsx
import { ProposalCard } from "./ProposalCard";

<ProposalCard
  id="prop-123"
  property={{
    address: "Rua das Flores, 123",
    askingPrice: 500000,
  }}
  buyer={{
    name: "João Silva",
    contact: "(11) 98765-4321",
  }}
  proposedValue={475000}
  downPayment={100000}
  financing={true}
  status="pending"
  createdAt={new Date()}
  onAccept={(id) => console.log("Accept", id)}
  onCounterOffer={(id) => console.log("Counter", id)}
  onReject={(id) => console.log("Reject", id)}
  onViewDetails={(id) => console.log("View", id)}
/>
```

---

### 3. SalesFunnel.tsx

Visualização de funil de vendas com métricas e análise de conversão.

**Características:**
- Estatísticas resumidas (Total Leads, Taxa Conversão, Ticket Médio, Tempo Médio)
- Funil visual com barras gradientes coloridas
- Indicadores de conversão entre estágios
- % de leads em cada estágio
- Tempo médio por estágio
- Análise detalhada de conversão e perdas

**Props:**
```typescript
interface SalesFunnelProps {
  stages: FunnelStage[];
  className?: string;
}

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  value: number;
  averageDays?: number;
}
```

**Exemplo de uso:**
```tsx
import { SalesFunnel } from "./SalesFunnel";

const funnelData = [
  { id: "initial", name: "Interesse Inicial", count: 100, value: 50000000, averageDays: 3 },
  { id: "proposal", name: "Proposta Enviada", count: 80, value: 40000000, averageDays: 7 },
  { id: "negotiation", name: "Negociação", count: 60, value: 30000000, averageDays: 14 },
  { id: "approval", name: "Aprovação Financeira", count: 40, value: 20000000, averageDays: 21 },
  { id: "closing", name: "Fechamento", count: 20, value: 10000000, averageDays: 30 },
];

<SalesFunnel stages={funnelData} />
```

---

## 🔌 Integração com a Página Principal

Consulte o arquivo `ExampleIntegration.tsx` para ver exemplos completos de:

1. **Adapters de dados**: Funções para converter dados do contexto para o formato dos componentes
2. **Estrutura da página**: Como organizar os componentes em uma estrutura com tabs
3. **Handlers**: Exemplos de implementação dos callbacks

### Estrutura Sugerida

```tsx
<div className="space-y-8">
  {/* Header */}
  <div>
    <h1>Vendas</h1>
    <Button>Nova Oportunidade</Button>
  </div>

  {/* Funil Visual */}
  <SalesFunnel stages={funnelData} />

  {/* Tabs */}
  <Tabs defaultValue="pipeline">
    <TabsList>
      <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
      <TabsTrigger value="proposals">Propostas</TabsTrigger>
      <TabsTrigger value="contracts">Contratos</TabsTrigger>
    </TabsList>

    <TabsContent value="pipeline">
      <SalesPipeline stages={pipelineStages} {...handlers} />
    </TabsContent>

    <TabsContent value="proposals">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {proposals.map(p => <ProposalCard key={p.id} {...p} />)}
      </div>
    </TabsContent>

    <TabsContent value="contracts">
      {/* Lista de contratos */}
    </TabsContent>
  </Tabs>
</div>
```

---

## 🎨 Design System

Todos os componentes seguem o design system do projeto:

- **Cores**: Usa tokens do Tailwind CSS e variáveis CSS do shadcn/ui
- **Componentes**: Construídos sobre componentes base do shadcn/ui (Card, Badge, Button, etc.)
- **Responsividade**: Mobile-first com breakpoints adequados
- **Acessibilidade**: Elementos semânticos e suporte a teclado

---

## 📱 Responsividade

### Desktop (≥1024px)
- Pipeline: Scroll horizontal com todas as colunas visíveis
- Propostas: Grid de 3 colunas
- Funil: Visualização completa

### Tablet (768px - 1023px)
- Pipeline: Scroll horizontal com colunas de 320px
- Propostas: Grid de 2 colunas
- Funil: Layout adaptado

### Mobile (<768px)
- Pipeline: Scroll horizontal com colunas de 300px
- Propostas: Grid de 1 coluna
- Funil: Layout vertical compacto
- Ações: Botões empilhados

---

## 🔄 Fluxo de Trabalho

### Pipeline de Vendas
1. Lead demonstra interesse → Adicionar em "Interesse Inicial"
2. Enviar proposta → Mover para "Proposta Enviada"
3. Comprador contrapropõe → Mover para "Negociação"
4. Aceitar proposta → Mover para "Aprovação Financeira"
5. Financiamento aprovado → Mover para "Fechamento"

### Gestão de Propostas
1. Nova proposta → Status "Pendente"
2. Negociar valores → Status "Em Negociação"
3. Acordo final → Status "Aceita"
4. Recusar oferta → Status "Recusada"

---

## ⚡ Performance

- **Memoização**: Usa `useMemo` para evitar recálculos desnecessários
- **Lazy Loading**: Cards são renderizados sob demanda
- **Otimização de imagens**: Thumbnails pequenos no pipeline
- **Scroll virtual**: Recomendado para listas muito grandes (>100 items)

---

## 🎯 Próximos Passos

1. **Drag & Drop**: Adicionar react-beautiful-dnd para arrastar cards entre estágios
2. **Filtros avançados**: Por valor, comprador, imóvel, data
3. **Notificações**: Alertas para propostas pendentes há muito tempo
4. **Relatórios**: Exportar dados do funil
5. **Histórico**: Timeline de mudanças de estágio
6. **Automações**: Mover automaticamente baseado em regras

---

## 📝 Notas de Implementação

- Os componentes são **desacoplados** e podem ser usados individualmente
- Todos os handlers são **opcionais** via props
- O formato de dados é **flexível** - use os adapters para converter seus dados
- As cores e estilos podem ser **customizados** via className e variantes
- Compatível com **dark mode** do shadcn/ui
