/**
 * EXEMPLO DE USO DO COMPONENTE DashboardMetrics
 *
 * Este arquivo demonstra como utilizar o componente DashboardMetrics
 * em uma página de dashboard.
 */

import { DashboardMetrics } from "./DashboardMetrics";

// ==================== EXEMPLO 1: Uso Básico ====================
export function ExampleBasicUsage() {
  const metrics = {
    properties: { value: 42, trend: 5 },      // +5% vs mês anterior
    leads: { value: 18, trend: -3 },          // -3% vs mês anterior
    visits: { value: 12 },                     // Sem trend
    contracts: { value: 8, trend: 12 },       // +12% vs mês anterior
  };

  return (
    <div className="space-y-6">
      <h1>Dashboard</h1>
      <DashboardMetrics metrics={metrics} />
    </div>
  );
}

// ==================== EXEMPLO 2: Com Dados Reais ====================
export function ExampleWithRealData() {
  // Simulando dados vindos de uma API
  const propertiesCount = 42;
  const propertiesLastMonth = 40;
  const propertiesTrend = ((propertiesCount - propertiesLastMonth) / propertiesLastMonth) * 100;

  const leadsCount = 18;
  const leadsLastMonth = 20;
  const leadsTrend = ((leadsCount - leadsLastMonth) / leadsLastMonth) * 100;

  const visitsCount = 12;

  const contractsCount = 8;
  const contractsLastMonth = 7;
  const contractsTrend = ((contractsCount - contractsLastMonth) / contractsLastMonth) * 100;

  const metrics = {
    properties: {
      value: propertiesCount,
      trend: Math.round(propertiesTrend)
    },
    leads: {
      value: leadsCount,
      trend: Math.round(leadsTrend)
    },
    visits: {
      value: visitsCount
    },
    contracts: {
      value: contractsCount,
      trend: Math.round(contractsTrend)
    },
  };

  return <DashboardMetrics metrics={metrics} />;
}

// ==================== EXEMPLO 3: Integração com Context ====================
import { useImobi } from "@/lib/imobi-context";
import { useMemo } from "react";

export function ExampleWithContext() {
  const { properties, leads, visits, contracts } = useImobi();

  const metrics = useMemo(() => {
    // Calcular métricas do mês atual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Imóveis ativos
    const activeProperties = properties.filter(p => p.status === "available").length;

    // Leads do mês atual
    const currentMonthLeads = leads.filter(l => {
      const leadDate = new Date(l.createdAt);
      return leadDate.getMonth() === currentMonth && leadDate.getFullYear() === currentYear;
    }).length;

    // Leads do mês anterior
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthLeads = leads.filter(l => {
      const leadDate = new Date(l.createdAt);
      return leadDate.getMonth() === lastMonth && leadDate.getFullYear() === lastMonthYear;
    }).length;

    const leadsTrend = lastMonthLeads > 0
      ? Math.round(((currentMonthLeads - lastMonthLeads) / lastMonthLeads) * 100)
      : 0;

    // Visitas agendadas
    const scheduledVisits = visits.filter(v => v.status === "scheduled").length;

    // Contratos ativos
    const activeContracts = contracts.filter(c => c.status === "signed").length;

    return {
      properties: { value: activeProperties },
      leads: { value: currentMonthLeads, trend: leadsTrend },
      visits: { value: scheduledVisits },
      contracts: { value: activeContracts },
    };
  }, [properties, leads, visits, contracts]);

  return <DashboardMetrics metrics={metrics} />;
}

// ==================== EXEMPLO 4: Com Loading State ====================
import { Skeleton } from "@/components/ui/skeleton";

export function ExampleWithLoading({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const metrics = {
    properties: { value: 42, trend: 5 },
    leads: { value: 18, trend: -3 },
    visits: { value: 12 },
    contracts: { value: 8, trend: 12 },
  };

  return <DashboardMetrics metrics={metrics} />;
}

// ==================== EXEMPLO 5: Responsivo ====================
export function ExampleResponsive() {
  return (
    <div className="container mx-auto px-4">
      {/* Mobile: 1 coluna */}
      {/* Tablet (xs): 2 colunas */}
      {/* Desktop (lg): 4 colunas */}
      <DashboardMetrics
        metrics={{
          properties: { value: 42, trend: 5 },
          leads: { value: 18, trend: -3 },
          visits: { value: 12 },
          contracts: { value: 8, trend: 12 },
        }}
      />
    </div>
  );
}
