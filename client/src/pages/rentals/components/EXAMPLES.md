# Exemplos de Uso - Componentes de Aluguéis

Este arquivo contém exemplos práticos de como usar os novos componentes criados para o módulo de aluguéis.

## 1. RentalContractCard

Componente para exibir informações detalhadas de um contrato de aluguel em formato de card.

### Exemplo Básico

```tsx
import { RentalContractCard } from "@/pages/rentals/components/RentalContractCard";

function ContractsList() {
  const contract = {
    id: "contract-123",
    tenantId: "tenant-1",
    propertyId: "prop-1",
    ownerId: "owner-1",
    renterId: "renter-1",
    rentValue: "1500.00",
    condoFee: "300.00",
    iptuValue: "100.00",
    dueDay: 10,
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    adjustmentIndex: "IGPM",
    depositValue: "1500.00",
    administrationFee: "10",
    status: "active",
    notes: null,
    createdAt: "2024-01-01",
  };

  const property = {
    id: "prop-1",
    title: "Apartamento Centro - 2 Quartos",
    address: "Rua Principal, 123",
    city: "São Paulo",
    state: "SP",
    // ... outros campos
  };

  const tenant = {
    id: "renter-1",
    name: "João Silva",
    phone: "(11) 98765-4321",
    // ... outros campos
  };

  const paymentHistory = [
    {
      month: "2024-01",
      status: "paid" as const,
      paidDate: new Date("2024-01-08"),
      dueDate: new Date("2024-01-10"),
      amount: 1900,
      method: "PIX",
    },
    {
      month: "2024-02",
      status: "late" as const,
      paidDate: new Date("2024-02-15"),
      dueDate: new Date("2024-02-10"),
      amount: 1900,
      method: "Transferência",
      daysLate: 5,
    },
    {
      month: "2024-03",
      status: "unpaid" as const,
      dueDate: new Date("2024-03-10"),
      amount: 1900,
    },
  ];

  return (
    <RentalContractCard
      id={contract.id}
      contract={contract}
      property={property}
      tenant={tenant}
      nextDueDate={new Date("2024-04-10")}
      paymentHistory={paymentHistory}
      onViewDetails={(id) => console.log("Ver detalhes:", id)}
      onCharge={(id) => console.log("Cobrar:", id)}
      onRenew={(id) => console.log("Renovar:", id)}
      onTerminate={(id) => console.log("Rescindir:", id)}
      onContactTenant={(phone) => console.log("Contatar:", phone)}
    />
  );
}
```

### Exemplo em Lista

```tsx
function ContractsGrid() {
  const contracts = [/* array de contratos */];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {contracts.map((contract) => (
        <RentalContractCard
          key={contract.id}
          id={contract.id}
          contract={contract}
          property={getProperty(contract.propertyId)}
          tenant={getTenant(contract.renterId)}
          nextDueDate={getNextDueDate(contract)}
          paymentHistory={getPaymentHistory(contract.id)}
          onViewDetails={handleViewDetails}
          onCharge={handleCharge}
          onRenew={handleRenew}
          onTerminate={handleTerminate}
          onContactTenant={handleContact}
        />
      ))}
    </div>
  );
}
```

## 2. PaymentTimeline

Componente para exibir o histórico visual de pagamentos.

### Versão Compacta (para cards)

```tsx
import { PaymentTimeline } from "@/pages/rentals/components/PaymentTimeline";

function CompactTimeline() {
  const payments = [
    { month: "2024-01", status: "paid" as const, amount: 1500, paidDate: new Date("2024-01-08") },
    { month: "2024-02", status: "late" as const, amount: 1500, paidDate: new Date("2024-02-15"), daysLate: 5 },
    { month: "2024-03", status: "unpaid" as const, amount: 1500, dueDate: new Date("2024-03-10") },
    { month: "2024-04", status: "upcoming" as const, amount: 1500, dueDate: new Date("2024-04-10") },
  ];

  return (
    <PaymentTimeline
      payments={payments}
      compact={true}
      orientation="horizontal"
    />
  );
}
```

### Versão Completa (para modais/detalhes)

```tsx
function FullTimeline() {
  const payments = [
    {
      month: "2024-01",
      status: "paid" as const,
      amount: 1900,
      paidDate: new Date("2024-01-08"),
      dueDate: new Date("2024-01-10"),
      method: "PIX",
    },
    {
      month: "2024-02",
      status: "late" as const,
      amount: 1900,
      paidDate: new Date("2024-02-15"),
      dueDate: new Date("2024-02-10"),
      method: "Transferência",
      daysLate: 5,
    },
    // ... mais meses
  ];

  return (
    <Dialog>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Pagamentos</DialogTitle>
        </DialogHeader>
        <PaymentTimeline
          payments={payments}
          compact={false}
          orientation="vertical"
        />
      </DialogContent>
    </Dialog>
  );
}
```

## 3. RentalDashboard (Atualizado)

Dashboard com gauge de ocupação e métricas principais.

### Exemplo de Uso

```tsx
import { RentalDashboard } from "@/pages/rentals/components/RentalDashboard";

function RentalsPage() {
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState("currentMonth");

  useEffect(() => {
    // Buscar métricas
    fetch("/api/rentals/metrics")
      .then(res => res.json())
      .then(setMetrics);

    // Buscar dados do gráfico
    fetch(`/api/rentals/metrics/chart?period=${period}`)
      .then(res => res.json())
      .then(setChartData);
  }, [period]);

  return (
    <RentalDashboard
      metrics={metrics}
      chartData={chartData}
      period={period}
      onPeriodChange={setPeriod}
      loading={!metrics}
    />
  );
}
```

### Estrutura de Dados do Dashboard

```typescript
// Metrics
const metrics = {
  activeContracts: 45,
  vacantProperties: 5,
  delinquencyValue: 15000,
  delinquencyPercentage: 8.5,
  pendingTransfers: 3,
  contractsExpiringThisMonth: 2,
  contractsAdjustingThisMonth: 1,
  monthlyRecurringRevenue: 175000,
};

// Chart Data
const chartData = [
  { month: "2024-01", revenue: 170000, delinquency: 12000 },
  { month: "2024-02", revenue: 173000, delinquency: 10000 },
  { month: "2024-03", revenue: 175000, delinquency: 15000 },
];
```

## 4. RentalAlerts (Atualizado)

Alertas com ações rápidas inline.

### Exemplo de Uso

```tsx
import { RentalAlerts } from "@/pages/rentals/components/RentalAlerts";

function RentalsPage() {
  const [alerts, setAlerts] = useState(null);

  useEffect(() => {
    fetch("/api/rentals/alerts")
      .then(res => res.json())
      .then(setAlerts);
  }, []);

  const handleSendReminder = async (payment) => {
    // Lógica para enviar lembrete individual
    console.log("Enviando lembrete para:", payment.id);
    // Abrir modal de WhatsApp, etc.
  };

  const handleBulkReminder = async (payments) => {
    // Lógica para enviar lembretes em massa
    console.log("Enviando lembretes para:", payments.length, "pagamentos");
  };

  const handleRenewContract = async (contract) => {
    // Lógica para renovar contrato
    console.log("Renovando contrato:", contract.id);
  };

  return (
    <RentalAlerts
      alerts={alerts}
      loading={!alerts}
      onPaymentClick={(payment) => {
        // Navegar para página de pagamento ou abrir modal
        console.log("Ver pagamento:", payment.id);
      }}
      onContractClick={(contract) => {
        // Navegar para página de contrato ou abrir modal
        console.log("Ver contrato:", contract.id);
      }}
      onPropertyClick={(property) => {
        // Navegar para página do imóvel
        console.log("Ver imóvel:", property.id);
      }}
      onSendReminder={handleSendReminder}
      onSendBulkReminder={handleBulkReminder}
      onRenewContract={handleRenewContract}
    />
  );
}
```

### Estrutura de Dados dos Alertas

```typescript
const alerts = {
  paymentsDueToday: [
    {
      id: "pay-1",
      referenceMonth: "2024-03",
      totalValue: "1900.00",
      dueDate: "2024-03-25",
      status: "pending",
      // ... outros campos
    },
  ],
  paymentsDueTomorrow: [
    // ... similar
  ],
  overduePayments: [
    {
      payment: {
        id: "pay-2",
        referenceMonth: "2024-02",
        totalValue: "1900.00",
        dueDate: "2024-02-10",
        status: "pending",
        // ... outros campos
      },
      daysOverdue: 15,
    },
  ],
  contractsExpiring: [
    {
      id: "contract-1",
      rentValue: "1500.00",
      endDate: "2024-04-30",
      status: "active",
      // ... outros campos
    },
  ],
  contractsAdjusting: [
    // ... similar
  ],
  vacantProperties: [
    {
      id: "prop-1",
      title: "Apartamento Centro",
      city: "São Paulo",
      // ... outros campos
    },
  ],
};
```

## 5. Integração Completa na Página de Aluguéis

### Exemplo Completo

```tsx
export default function RentalsPage() {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState("currentMonth");
  const [loading, setLoading] = useState(true);

  // Buscar todos os dados
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [metricsRes, alertsRes, contractsRes, chartRes] = await Promise.all([
          fetch("/api/rentals/metrics"),
          fetch("/api/rentals/alerts"),
          fetch("/api/rental-contracts"),
          fetch(`/api/rentals/metrics/chart?period=${period}`),
        ]);

        setMetrics(await metricsRes.json());
        setAlerts(await alertsRes.json());
        setContracts(await contractsRes.json());
        setChartData(await chartRes.json());
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period]);

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Aluguéis</h1>
        <p className="text-muted-foreground">Gestão completa de locações</p>
      </div>

      {/* Dashboard com Métricas */}
      <RentalDashboard
        metrics={metrics}
        chartData={chartData}
        period={period}
        onPeriodChange={setPeriod}
        loading={loading}
      />

      {/* Alertas */}
      <RentalAlerts
        alerts={alerts}
        loading={loading}
        onPaymentClick={handlePaymentClick}
        onContractClick={handleContractClick}
        onPropertyClick={handlePropertyClick}
        onSendReminder={handleSendReminder}
        onSendBulkReminder={handleBulkReminder}
        onRenewContract={handleRenewContract}
      />

      {/* Lista de Contratos */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Contratos Ativos</h2>
          <Button onClick={handleNewContract}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {contracts.map((contract) => (
            <RentalContractCard
              key={contract.id}
              id={contract.id}
              contract={contract}
              property={getProperty(contract.propertyId)}
              tenant={getTenant(contract.renterId)}
              nextDueDate={getNextDueDate(contract)}
              paymentHistory={getPaymentHistory(contract.id)}
              onViewDetails={handleViewDetails}
              onCharge={handleCharge}
              onRenew={handleRenew}
              onTerminate={handleTerminate}
              onContactTenant={handleContactTenant}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Notas Importantes

1. **PaymentTimeline**: Use `compact={true}` em cards e `compact={false}` em modais/detalhes
2. **RentalContractCard**: O histórico de pagamentos é expandível com botão
3. **RentalAlerts**: Ações rápidas aparecem inline nos cards de alerta
4. **RentalDashboard**: Agora inclui gauge circular de ocupação e 3 cards principais
5. **Mobile-First**: Todos os componentes são responsivos e otimizados para mobile

## Customização

### Cores e Temas

Os componentes usam as cores do tema definido em `tailwind.config.ts`. Para customizar:

```tsx
// Status personalizados no PaymentTimeline
const STATUS_CONFIG = {
  paid: { color: "text-green-600", bgColor: "bg-green-100", ... },
  late: { color: "text-yellow-600", bgColor: "bg-yellow-100", ... },
  // ...
};
```

### Ações Customizadas

```tsx
// Exemplo de ação customizada
const handleSendReminder = async (payment) => {
  // Integrar com WhatsApp API
  const message = `Lembrete: Pagamento de ${formatPrice(payment.totalValue)} vence em breve`;
  await sendWhatsApp(tenant.phone, message);
};
```
