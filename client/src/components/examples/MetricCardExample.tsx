/**
 * MetricCard Component Examples
 *
 * Este arquivo demonstra diferentes variações do componente MetricCard
 * para uso como referência de implementação.
 */

import { MetricCard } from '@/components/ui/MetricCard';
import { Building2, Users, DollarSign, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { useLocation } from 'wouter';

export function MetricCardExamples() {
  const [, navigate] = useLocation();

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold mb-2">MetricCard Examples</h1>
      <p className="text-muted-foreground mb-8">
        Diferentes variações do componente MetricCard
      </p>

      {/* Exemplo 1: Básico */}
      <section className="section">
        <h2 className="text-xl font-semibold mb-4">1. Básico (sem trend)</h2>
        <div className="metrics-grid">
          <MetricCard
            icon={Building2}
            label="Imóveis Cadastrados"
            value={42}
          />
          <MetricCard
            icon={Users}
            label="Total de Leads"
            value={127}
          />
          <MetricCard
            icon={DollarSign}
            label="Receita do Mês"
            value="R$ 45.000"
          />
          <MetricCard
            icon={Calendar}
            label="Visitas Agendadas"
            value={8}
          />
        </div>
      </section>

      {/* Exemplo 2: Com Trend Positivo */}
      <section className="section">
        <h2 className="text-xl font-semibold mb-4">2. Com Trend Positivo</h2>
        <div className="metrics-grid">
          <MetricCard
            icon={Building2}
            label="Imóveis Disponíveis"
            value={42}
            trend={{
              value: "+5",
              direction: "up",
              label: "vs mês anterior"
            }}
          />
          <MetricCard
            icon={Users}
            label="Novos Leads"
            value={127}
            trend={{
              value: "+18",
              direction: "up",
              label: "vs semana anterior"
            }}
          />
          <MetricCard
            icon={DollarSign}
            label="Faturamento"
            value="R$ 45.000"
            trend={{
              value: "+12%",
              direction: "up",
              label: "vs mês anterior"
            }}
          />
        </div>
      </section>

      {/* Exemplo 3: Com Trend Negativo */}
      <section className="section">
        <h2 className="text-xl font-semibold mb-4">3. Com Trend Negativo</h2>
        <div className="metrics-grid">
          <MetricCard
            icon={Users}
            label="Leads Ativos"
            value={89}
            trend={{
              value: "-8",
              direction: "down",
              label: "vs mês anterior"
            }}
          />
          <MetricCard
            icon={TrendingDown}
            label="Taxa de Conversão"
            value="18%"
            trend={{
              value: "-3%",
              direction: "down",
              label: "vs trimestre anterior"
            }}
          />
        </div>
      </section>

      {/* Exemplo 4: Clicável (navegação) */}
      <section className="section">
        <h2 className="text-xl font-semibold mb-4">4. Clicável (com hover)</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Clique nos cards para navegar (comportamento hover ativado)
        </p>
        <div className="metrics-grid">
          <MetricCard
            icon={Building2}
            label="Ver Imóveis"
            value={42}
            onClick={() => navigate('/properties')}
          />
          <MetricCard
            icon={Users}
            label="Ver Leads"
            value={127}
            trend={{ value: "+18", direction: "up" }}
            onClick={() => navigate('/leads')}
          />
          <MetricCard
            icon={Calendar}
            label="Ver Agenda"
            value={8}
            onClick={() => navigate('/calendar')}
          />
        </div>
      </section>

      {/* Exemplo 5: Com valores formatados */}
      <section className="section">
        <h2 className="text-xl font-semibold mb-4">5. Valores Formatados</h2>
        <div className="metrics-grid">
          <MetricCard
            icon={DollarSign}
            label="Receita Total"
            value="R$ 1.245.890,00"
            trend={{ value: "+15%", direction: "up" }}
          />
          <MetricCard
            icon={TrendingUp}
            label="Ticket Médio"
            value="R$ 350.000"
            trend={{ value: "+8%", direction: "up" }}
          />
          <MetricCard
            icon={Building2}
            label="Área Total"
            value="12.450 m²"
          />
          <MetricCard
            icon={Users}
            label="Taxa de Conversão"
            value="23.5%"
            trend={{ value: "+2.3%", direction: "up" }}
          />
        </div>
      </section>

      {/* Exemplo 6: Trend Neutro */}
      <section className="section">
        <h2 className="text-xl font-semibold mb-4">6. Trend Neutro</h2>
        <div className="metrics-grid">
          <MetricCard
            icon={Building2}
            label="Imóveis em Manutenção"
            value={3}
            trend={{
              value: "0",
              direction: "neutral",
              label: "sem alterações"
            }}
          />
        </div>
      </section>

      {/* Exemplo 7: Customizado */}
      <section className="section">
        <h2 className="text-xl font-semibold mb-4">7. Customizado (className)</h2>
        <div className="metrics-grid">
          <MetricCard
            icon={Building2}
            label="Destacado"
            value={42}
            className="border-2 border-primary shadow-lg"
          />
          <MetricCard
            icon={Users}
            label="Alerta"
            value={5}
            trend={{ value: "-10", direction: "down" }}
            className="border-2 border-red-500"
          />
        </div>
      </section>

      {/* Dicas de Uso */}
      <section className="section">
        <div className="bg-muted p-6 rounded-lg">
          <h3 className="font-semibold mb-3">Dicas de Uso:</h3>
          <ul className="space-y-2 text-sm">
            <li>• Use <code>metrics-grid</code> para layout automático responsivo</li>
            <li>• <code>trend.direction</code> aceita: "up", "down", "neutral"</li>
            <li>• <code>onClick</code> adiciona hover effect automaticamente</li>
            <li>• <code>value</code> aceita string ou número</li>
            <li>• <code>trend.label</code> é opcional mas recomendado</li>
            <li>• Ícones vêm de <code>lucide-react</code></li>
          </ul>
        </div>
      </section>
    </div>
  );
}

export default MetricCardExamples;
