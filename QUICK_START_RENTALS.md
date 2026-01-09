# Quick Start - Melhorias de Aluguéis

Guia rápido para usar os novos componentes de aluguéis.

## 📦 Importação

```tsx
import {
  RentalDashboard,
  RentalAlerts,
  RentalContractCard,
  PaymentTimeline,
} from "@/pages/rentals/components";

import type { PaymentStatus } from "@/pages/rentals/components";
```

## 🚀 Uso Rápido

### 1. Dashboard de Ocupação

```tsx
<RentalDashboard
  metrics={{
    activeContracts: 45,
    vacantProperties: 5,
    delinquencyValue: 15000,
    delinquencyPercentage: 8.5,
    pendingTransfers: 3,
    contractsExpiringThisMonth: 2,
    contractsAdjustingThisMonth: 1,
    monthlyRecurringRevenue: 175000,
  }}
  chartData={[
    { month: "2024-01", revenue: 170000, delinquency: 12000 },
    { month: "2024-02", revenue: 173000, delinquency: 10000 },
  ]}
  period="currentMonth"
  onPeriodChange={(period) => console.log(period)}
  loading={false}
/>
```

**Features**:
- ✅ Gauge circular de ocupação
- ✅ MRR + projeção anual
- ✅ Indicadores críticos
- ✅ Gráfico de receita vs inadimplência

---

### 2. Alertas com Ações Rápidas

```tsx
<RentalAlerts
  alerts={{
    paymentsDueToday: [/* pagamentos */],
    paymentsDueTomorrow: [/* pagamentos */],
    overduePayments: [
      { payment: {...}, daysOverdue: 15 }
    ],
    contractsExpiring: [/* contratos */],
    contractsAdjusting: [/* contratos */],
    vacantProperties: [/* imóveis */],
  }}
  onPaymentClick={(payment) => {/* ver pagamento */}}
  onContractClick={(contract) => {/* ver contrato */}}
  onSendReminder={(payment) => {/* enviar lembrete */}}
  onSendBulkReminder={(payments) => {/* enviar em massa */}}
  onRenewContract={(contract) => {/* renovar */}}
  loading={false}
/>
```

**Features**:
- ✅ 6 categorias de alertas
- ✅ Ações inline (Ver, Lembrar, Renovar)
- ✅ Envio em massa
- ✅ Accordion colapsável

---

### 3. Card de Contrato

```tsx
<RentalContractCard
  id="contract-1"
  contract={{
    id: "contract-1",
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
    status: "active",
    // ...
  }}
  property={{
    id: "prop-1",
    title: "Apartamento Centro",
    address: "Rua Principal, 123",
    city: "São Paulo",
    state: "SP",
    // ...
  }}
  tenant={{
    id: "renter-1",
    name: "João Silva",
    phone: "(11) 98765-4321",
    // ...
  }}
  nextDueDate={new Date("2024-04-10")}
  paymentHistory={[
    {
      month: "2024-01",
      status: "paid",
      amount: 1900,
      paidDate: new Date("2024-01-08"),
    },
    // ... mais meses
  ]}
  onViewDetails={(id) => {/* ver detalhes */}}
  onCharge={(id) => {/* cobrar */}}
  onRenew={(id) => {/* renovar */}}
  onTerminate={(id) => {/* rescindir */}}
  onContactTenant={(phone) => {/* contatar */}}
/>
```

**Features**:
- ✅ Informações completas do contrato
- ✅ Timeline de pagamentos expandível
- ✅ Badge de próximo vencimento
- ✅ Ações: Ver, Cobrar, Renovar, Rescindir
- ✅ Botão WhatsApp

---

### 4. Timeline de Pagamentos

**Versão Compacta (para cards)**:
```tsx
<PaymentTimeline
  payments={[
    {
      month: "2024-01",
      status: "paid",
      amount: 1900,
      paidDate: new Date("2024-01-08"),
    },
    {
      month: "2024-02",
      status: "late",
      amount: 1900,
      paidDate: new Date("2024-02-15"),
      daysLate: 5,
    },
    {
      month: "2024-03",
      status: "unpaid",
      amount: 1900,
      dueDate: new Date("2024-03-10"),
    },
  ]}
  compact={true}
  orientation="horizontal"
/>
```

**Versão Completa (para modais)**:
```tsx
<PaymentTimeline
  payments={paymentHistory}
  compact={false}
  orientation="vertical"
/>
```

**Features**:
- ✅ Status visuais: 🟢 Pago | 🟡 Atrasado | 🔴 Não Pago | ⚪ Futuro
- ✅ Tooltips com detalhes
- ✅ Estatísticas automáticas
- ✅ Versão compacta e completa

---

## 🎨 Status de Pagamento

```typescript
type PaymentStatus = {
  month: string;        // "2024-01" format
  status: "paid" | "late" | "unpaid" | "upcoming";
  paidDate?: Date;      // quando foi pago
  dueDate?: Date;       // data de vencimento
  amount: number;       // valor do pagamento
  method?: string;      // "PIX", "Transferência", etc.
  daysLate?: number;    // dias de atraso (se aplicável)
};
```

---

## 📊 Estrutura de Dados Completa

### RentalMetrics
```typescript
{
  activeContracts: number;
  vacantProperties: number;
  delinquencyValue: number;
  delinquencyPercentage: number;
  pendingTransfers: number;
  contractsExpiringThisMonth: number;
  contractsAdjustingThisMonth: number;
  monthlyRecurringRevenue: number;
}
```

### RentalAlerts
```typescript
{
  paymentsDueToday: RentalPayment[];
  paymentsDueTomorrow: RentalPayment[];
  overduePayments: { payment: RentalPayment; daysOverdue: number }[];
  contractsExpiring: RentalContract[];
  contractsAdjusting: RentalContract[];
  vacantProperties: Property[];
}
```

---

## 🔌 APIs Necessárias

```typescript
// Dashboard
GET /api/rentals/metrics
GET /api/rentals/metrics/chart?period={currentMonth|lastMonth|year}

// Alertas
GET /api/rentals/alerts

// Contratos
GET /api/rental-contracts
GET /api/rental-contracts/:id

// Pagamentos
GET /api/rentals/payments/:contractId
GET /api/rental-payments
```

---

## 🎯 Exemplo Completo - Página de Aluguéis

```tsx
import { useState, useEffect } from "react";
import {
  RentalDashboard,
  RentalAlerts,
  RentalContractCard,
} from "@/pages/rentals/components";

export default function RentalsPage() {
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState("currentMonth");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [metricsRes, alertsRes, contractsRes, chartRes] =
          await Promise.all([
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Aluguéis</h1>
        <p className="text-muted-foreground">
          Gestão completa de locações
        </p>
      </div>

      {/* Dashboard */}
      <RentalDashboard
        metrics={metrics}
        chartData={chartData}
        period={period}
        onPeriodChange={setPeriod}
        loading={loading}
      />

      {/* Alerts */}
      <RentalAlerts
        alerts={alerts}
        loading={loading}
        onPaymentClick={handlePaymentClick}
        onContractClick={handleContractClick}
        onSendReminder={handleSendReminder}
        onSendBulkReminder={handleBulkReminder}
        onRenewContract={handleRenewContract}
      />

      {/* Contracts List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Contratos Ativos</h2>
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

---

## 📱 Responsividade

### Mobile (< 640px)
- Cards em stack vertical
- Timeline com scroll horizontal
- Botões touch-friendly (44px)

### Tablet (640px - 1024px)
- Grid 2 colunas
- Dashboard em 2 colunas

### Desktop (> 1024px)
- Grid 3 colunas
- Dashboard em 3 colunas
- Hover effects completos

---

## 🎨 Customização

### Cores dos Status

```typescript
// Em PaymentTimeline.tsx
const STATUS_CONFIG = {
  paid: { color: "text-green-600", bgColor: "bg-green-100" },
  late: { color: "text-yellow-600", bgColor: "bg-yellow-100" },
  unpaid: { color: "text-red-600", bgColor: "bg-red-100" },
  upcoming: { color: "text-gray-400", bgColor: "bg-gray-100" },
};
```

### Ações Customizadas

```tsx
const handleSendReminder = async (payment) => {
  // Integrar com WhatsApp
  const message = `Lembrete: Pagamento de ${formatPrice(payment.totalValue)}`;
  await sendWhatsApp(tenant.phone, message);
};

const handleBulkReminder = async (payments) => {
  // Enviar para múltiplos inquilinos
  await Promise.all(
    payments.map(p => sendWhatsApp(getTenant(p).phone, message))
  );
};
```

---

## 📚 Mais Exemplos

Ver arquivo completo: `/client/src/pages/rentals/components/EXAMPLES.md`

---

## ✅ Checklist de Integração

- [ ] Importar componentes
- [ ] Configurar APIs (GET /api/rentals/...)
- [ ] Implementar handlers (handleSendReminder, etc.)
- [ ] Testar em mobile
- [ ] Testar ações rápidas
- [ ] Integrar WhatsApp (opcional)
- [ ] Configurar cores do tema (se necessário)

---

**Documentação completa**: `AGENTE_11_RENTAL_IMPROVEMENTS_REPORT.md`
