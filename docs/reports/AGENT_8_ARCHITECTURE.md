# 📐 Arquitetura da Página de Relatórios - ImobiBase

## Visão Geral do Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                      PÁGINA DE RELATÓRIOS                        │
│                        /reports route                            │
└──────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
           ┌────────▼────────┐         ┌───────▼────────┐
           │   FRONTEND      │         │   BACKEND      │
           │   React/TS      │◄────────┤   Express API  │
           └─────────────────┘  HTTP   └────────────────┘
```

---

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUÁRIO seleciona tipo de relatório (ex: Vendas)            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. FRONTEND envia requisição GET                                │
│    /api/reports/sales?startDate=...&endDate=...&brokerId=...   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. BACKEND (routes.ts)                                          │
│    - Valida autenticação (requireAuth middleware)              │
│    - Extrai query parameters                                    │
│    - Valida tenantId do usuário                                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. STORAGE (storage.ts)                                         │
│    - Executa queries SQL no banco de dados                     │
│    - Calcula KPIs e agregações                                  │
│    - Formata dados para resposta                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. BACKEND retorna JSON                                         │
│    { kpis, sales, salesByMonth, salesByType }                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. FRONTEND renderiza                                           │
│    - KPI Cards com ícones                                       │
│    - Gráficos Recharts (BarChart, PieChart)                    │
│    - Tabelas de dados detalhados                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estrutura de Componentes

```
ReportsPage (index.tsx)
│
├─ Tela de Seleção
│  ├─ SavedReportsCard
│  │  └─ QuickAccessButton[]
│  └─ ReportTypeCards[]
│     ├─ ComissoesCard
│     ├─ VendasCard
│     ├─ AlugueisCard
│     ├─ LeadsCard
│     ├─ CorretoresCard
│     └─ FinanceiroCard
│
├─ Tela de Visualização
│  ├─ Header
│  │  ├─ BackButton
│  │  ├─ ReportTitle
│  │  ├─ SaveButton
│  │  └─ ExportButton
│  │
│  ├─ FiltersBar
│  │  ├─ PeriodSelect
│  │  ├─ DateRangePicker (se custom)
│  │  ├─ BrokerSelect
│  │  └─ ApplyButton
│  │
│  ├─ ReportContent (#report-content)
│  │  ├─ PrintHeader (hidden, apenas @media print)
│  │  │
│  │  ├─ KPISection
│  │  │  └─ KPICard[]
│  │  │     ├─ Icon
│  │  │     ├─ Value
│  │  │     ├─ Title
│  │  │     └─ Trend (opcional)
│  │  │
│  │  ├─ ChartsSection
│  │  │  └─ Card[]
│  │  │     ├─ CardHeader
│  │  │     └─ ResponsiveContainer
│  │  │        └─ RechartsChart
│  │  │           ├─ BarChart | LineChart | PieChart | AreaChart
│  │  │           ├─ XAxis / YAxis
│  │  │           ├─ Tooltip
│  │  │           └─ Legend
│  │  │
│  │  └─ TablesSection
│  │     ├─ Desktop: HTML <table>
│  │     └─ Mobile: ReportCard[] (expandable)
│  │
│  └─ BottomSheets
│     ├─ DatePickerSheet
│     ├─ ExportSheet
│     └─ FiltersSheet
│
└─ CommissionReports (relatório especial)
   └─ [Implementação própria]
```

---

## Tipos de Dados TypeScript

```typescript
// Tipos principais
type ReportType =
  | "vendas"
  | "alugueis"
  | "leads"
  | "financeiro"
  | "corretores"
  | "comissoes";

interface SavedReport {
  id: string;
  name: string;
  type: ReportType;
  filters: {
    period: string;
    startDate: string;
    endDate: string;
    selectedBroker?: string;
  };
  createdAt: string;
}

interface SalesReportData {
  kpis: {
    totalSales: number;
    totalValue: number;
    averageTicket: number;
    conversionRate: number;
    topBroker: string;
  };
  salesByMonth: Array<{
    month: string;
    value: number;
  }>;
  salesByType: Array<{
    type: string;
    value: number;
  }>;
  sales: Array<{
    saleDate: string;
    property: { title: string };
    buyer: { name: string };
    broker: { name: string };
    saleValue: number;
  }>;
}
```

---

## API Endpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                      API ENDPOINTS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ GET /api/reports/sales                                          │
│ ├─ Query: startDate, endDate, brokerId?                        │
│ ├─ Auth: Required (requireAuth)                                │
│ └─ Response: SalesReportData                                    │
│                                                                 │
│ GET /api/reports/rentals                                        │
│ ├─ Query: startDate, endDate, brokerId?                        │
│ ├─ Auth: Required                                               │
│ └─ Response: RentalsReportData                                  │
│                                                                 │
│ GET /api/reports/leads-funnel                                   │
│ ├─ Query: startDate, endDate                                   │
│ ├─ Auth: Required                                               │
│ └─ Response: LeadsFunnelReportData                              │
│                                                                 │
│ GET /api/reports/broker-performance                             │
│ ├─ Query: startDate, endDate                                   │
│ ├─ Auth: Required                                               │
│ └─ Response: BrokerPerformanceData                              │
│                                                                 │
│ GET /api/reports/properties                                     │
│ ├─ Query: startDate, endDate                                   │
│ ├─ Auth: Required                                               │
│ └─ Response: PropertiesReportData                               │
│                                                                 │
│ GET /api/reports/financial-summary                              │
│ ├─ Query: startDate, endDate                                   │
│ ├─ Auth: Required                                               │
│ └─ Response: FinancialReportData                                │
│                                                                 │
│ GET /api/users                                                  │
│ ├─ Query: none                                                  │
│ ├─ Auth: Required                                               │
│ └─ Response: User[] (para filtro de corretor)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fluxo de Exportação

```
┌─────────────────────────────────────────────────────────────────┐
│ USUÁRIO clica em "Exportar"                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ ExportSheet Bottom Sheet abre                                   │
│ ├─ Opção: CSV/Excel                                             │
│ ├─ Opção: Imprimir                                              │
│ └─ Opção: PDF (em dev)                                          │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  CSV/EXCEL   │   │   IMPRIMIR   │   │     PDF      │
├──────────────┤   ├──────────────┤   ├──────────────┤
│              │   │              │   │              │
│ generateCSV()│   │ window.      │   │ Toast:       │
│              │   │ print()      │   │ "Em desenv." │
│ Blob + URL   │   │              │   │              │
│              │   │ @media print │   │              │
│ Download     │   │ stylesheet   │   │              │
│ automático   │   │ ativo        │   │              │
│              │   │              │   │              │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## Print Stylesheet (@media print)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANTES DE IMPRIMIR                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────┐                    │
│  │ [◀ Voltar] Relatório de Vendas        │ <- Visível         │
│  │              [💾 Salvar] [📥 Exportar] │                    │
│  └────────────────────────────────────────┘                    │
│  ┌────────────────────────────────────────┐                    │
│  │ Filtros:                                │ <- Visível         │
│  │ [Período ▾] [Corretor ▾] [Aplicar]    │                    │
│  └────────────────────────────────────────┘                    │
│  ┌────────────────────────────────────────┐                    │
│  │ #report-content                         │                    │
│  │   [KPI Cards...]                        │ <- Visível         │
│  │   [Gráficos...]                         │                    │
│  │   [Tabelas...]                          │                    │
│  └────────────────────────────────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

                            │
                            ▼ window.print()
                            │
                            ▼

┌─────────────────────────────────────────────────────────────────┐
│                   DURANTE IMPRESSÃO                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────┐                    │
│  │ .no-print { display: none }             │ <- OCULTO          │
│  └────────────────────────────────────────┘                    │
│                                                                 │
│  ┌────────────────────────────────────────┐                    │
│  │ ImobiBase - Relatório de Vendas        │ <- NOVO            │
│  │ Período: 01/01/24 - 31/12/24           │    (PrintHeader)   │
│  │ Gerado em: 25/12/24 14:30              │                    │
│  └────────────────────────────────────────┘                    │
│  ┌────────────────────────────────────────┐                    │
│  │ #report-content                         │                    │
│  │   [KPI Cards...]                        │ <- Visível         │
│  │   [Gráficos...]                         │    (formatado      │
│  │   [Tabelas...]                          │     para A4)       │
│  └────────────────────────────────────────┘                    │
│                                                                 │
│  @page { size: A4; margin: 1cm; }                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Estado de Loading

```
┌─────────────────────────────────────────────────────────────────┐
│              ESTADOS DA INTERFACE                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. INITIAL LOAD (loading=true, reportData=null)                │
│    ┌──────────────────────────────────┐                        │
│    │  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │ <- Skeleton Loaders    │
│    │  │░░░░│ │░░░░│ │░░░░│ │░░░░│    │                        │
│    │  └────┘ └────┘ └────┘ └────┘    │                        │
│    │  ┌─────────────────────────┐     │                        │
│    │  │░░░░░░░░░░░░░░░░░░░░░░░░░│     │                        │
│    │  │░░░░░░░░░░░░░░░░░░░░░░░░░│     │                        │
│    │  └─────────────────────────┘     │                        │
│    └──────────────────────────────────┘                        │
│                                                                 │
│ 2. LOADED (loading=false, reportData exists)                   │
│    ┌──────────────────────────────────┐                        │
│    │  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │ <- Real Data           │
│    │  │ 12 │ │R$1M│ │R$5K│ │18% │    │                        │
│    │  └────┘ └────┘ └────┘ └────┘    │                        │
│    │  ┌─────────────────────────┐     │                        │
│    │  │     ╱╲                  │     │ <- Real Charts         │
│    │  │    ╱  ╲    ╱╲           │     │                        │
│    │  │   ╱    ╲  ╱  ╲          │     │                        │
│    │  └─────────────────────────┘     │                        │
│    └──────────────────────────────────┘                        │
│                                                                 │
│ 3. ERROR (catch block)                                         │
│    ┌──────────────────────────────────┐                        │
│    │  ❌ Erro ao carregar relatório   │ <- Toast Notification  │
│    │  Não foi possível conectar...    │                        │
│    └──────────────────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Responsividade - Breakpoints

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESPONSIVE DESIGN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ MOBILE (≤ 640px)                                                │
│ ┌─────────────────────┐                                        │
│ │ [Hamburguer Menu]   │                                        │
│ │ Relatório de Vendas │                                        │
│ ├─────────────────────┤                                        │
│ │ [Filtros ▾]  [📅]   │ <- Bottom Sheet                        │
│ ├─────────────────────┤                                        │
│ │ ┌────┐ ┌────┐       │ <- 2 colunas                          │
│ │ │KPI1│ │KPI2│       │                                        │
│ │ └────┘ └────┘       │                                        │
│ │ ┌────┐ ┌────┐       │                                        │
│ │ │KPI3│ │KPI4│       │                                        │
│ │ └────┘ └────┘       │                                        │
│ ├─────────────────────┤                                        │
│ │ ┌─────────────────┐ │ <- Gráfico full width                 │
│ │ │   [Chart 1]     │ │                                        │
│ │ └─────────────────┘ │                                        │
│ │ ┌─────────────────┐ │                                        │
│ │ │   [Chart 2]     │ │                                        │
│ │ └─────────────────┘ │                                        │
│ ├─────────────────────┤                                        │
│ │ ┌─────────────────┐ │ <- Cards expansíveis                  │
│ │ │[Card 1] R$1000 ▾│ │                                        │
│ │ └─────────────────┘ │                                        │
│ │ ┌─────────────────┐ │                                        │
│ │ │[Card 2] R$2000 ▾│ │                                        │
│ │ └─────────────────┘ │                                        │
│ └─────────────────────┘                                        │
│                                                                 │
│ DESKTOP (≥ 1024px)                                              │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [◀ Voltar] Relatório de Vendas    [💾 Salvar] [📥 Exportar]││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ [Período ▾] [01/01/24] [31/12/24] [Corretor ▾] [Aplicar]   ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ <- 5 colunas                 ││
│ │ │KPI│ │KPI│ │KPI│ │KPI│ │KPI│                               ││
│ │ └───┘ └───┘ └───┘ └───┘ └───┘                               ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ ┌───────────────┐ ┌───────────────┐ <- 2 colunas           ││
│ │ │  [Chart 1]    │ │  [Chart 2]    │                         ││
│ │ │               │ │               │                         ││
│ │ └───────────────┘ └───────────────┘                         ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │ ┌───────────────────────────────────────────────────────┐   ││
│ │ │ Data │ Imóvel │ Comprador │ Corretor │ Valor │ <- Tabela ││
│ │ │------|--------|-----------|----------|-------|           ││
│ │ │ ...  │  ...   │   ...     │   ...    │  ...  │           ││
│ │ └───────────────────────────────────────────────────────┘   ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECH STACK                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ FRONTEND                                                        │
│ ├─ React 18                 (UI library)                       │
│ ├─ TypeScript 5             (Type safety)                      │
│ ├─ Wouter                   (Routing)                          │
│ ├─ TanStack Query           (Data fetching)                    │
│ ├─ Recharts                 (Charts library)                   │
│ ├─ Shadcn/UI                (UI components)                    │
│ │  ├─ Card                                                      │
│ │  ├─ Button                                                    │
│ │  ├─ Select                                                    │
│ │  ├─ Sheet (Bottom Sheet)                                     │
│ │  ├─ Skeleton                                                  │
│ │  └─ Toast (Sonner)                                            │
│ ├─ Tailwind CSS             (Styling)                          │
│ └─ Vite                     (Build tool)                       │
│                                                                 │
│ BACKEND                                                         │
│ ├─ Express.js               (HTTP server)                      │
│ ├─ TypeScript               (Type safety)                      │
│ ├─ PostgreSQL               (Database)                         │
│ ├─ Drizzle ORM              (Database queries)                 │
│ └─ Custom Storage Layer     (Business logic)                   │
│                                                                 │
│ DEPLOYMENT                                                      │
│ ├─ Vercel                   (Hosting - configurado)            │
│ ├─ Docker                   (Containerização)                  │
│ └─ CI/CD                    (GitHub Actions)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Segurança

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 1. AUTENTICAÇÃO                                                 │
│    ┌─────────────────────────────────────────┐                 │
│    │ requireAuth middleware                   │                 │
│    │ - Verifica sessão ativa                 │                 │
│    │ - Valida JWT token                      │                 │
│    │ - Extrai req.user                       │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│ 2. MULTI-TENANCY                                                │
│    ┌─────────────────────────────────────────┐                 │
│    │ Tenant Isolation                        │                 │
│    │ - Todos os queries filtram por tenantId │                 │
│    │ - Usuário só vê dados do próprio tenant │                 │
│    │ - WHERE tenantId = req.user.tenantId    │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│ 3. VALIDAÇÃO DE INPUTS                                          │
│    ┌─────────────────────────────────────────┐                 │
│    │ Query Params                            │                 │
│    │ - Validação de datas (ISO string)       │                 │
│    │ - Sanitização de brokerId               │                 │
│    │ - Limites de período                    │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│ 4. SQL INJECTION PROTECTION                                     │
│    ┌─────────────────────────────────────────┐                 │
│    │ Drizzle ORM                             │                 │
│    │ - Prepared statements automáticos       │                 │
│    │ - Parametrized queries                  │                 │
│    │ - Type-safe queries                     │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
│ 5. RATE LIMITING (Futuro)                                       │
│    ┌─────────────────────────────────────────┐                 │
│    │ - Limite de requests por minuto         │                 │
│    │ - Proteção contra abuse                 │                 │
│    └─────────────────────────────────────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Optimizations

```
┌─────────────────────────────────────────────────────────────────┐
│                   PERFORMANCE FEATURES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ✅ LAZY LOADING                                                 │
│    const ReportsPage = lazy(() => import("@/pages/reports"))   │
│    - Componente carrega apenas quando necessário               │
│    - Reduz bundle inicial                                      │
│                                                                 │
│ ✅ CODE SPLITTING                                               │
│    - Vite divide automaticamente o código                      │
│    - Cada relatório pode ser chunk separado                    │
│                                                                 │
│ ✅ SKELETON LOADERS                                             │
│    - Feedback visual instantâneo                               │
│    - Perceived performance                                     │
│    - Usuário vê estrutura antes dos dados                      │
│                                                                 │
│ ✅ ABORT CONTROLLERS                                            │
│    useEffect(() => {                                            │
│      const controller = new AbortController();                 │
│      fetch(url, { signal: controller.signal });                │
│      return () => controller.abort();                          │
│    }, [deps]);                                                  │
│    - Previne race conditions                                   │
│    - Cancela requisições antigas                               │
│                                                                 │
│ ✅ MEMOIZATION (Futuro)                                         │
│    - useMemo() para cálculos pesados                           │
│    - React.memo() para componentes puros                       │
│                                                                 │
│ ✅ CACHING (Backend - Futuro)                                   │
│    - Redis para relatórios frequentes                          │
│    - TTL de 5-15 minutos                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

**Versão**: 1.0  
**Última Atualização**: 25/12/2024  
**Autor**: Claude Code - AGENTE 8
