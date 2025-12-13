import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useImobi } from "@/lib/imobi-context";
import { Building2, Users, DollarSign, CalendarCheck, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

const MOCK_CHART_DATA = [
  { name: "Jan", total: 12 },
  { name: "Fev", total: 18 },
  { name: "Mar", total: 15 },
  { name: "Abr", total: 24 },
  { name: "Mai", total: 32 },
  { name: "Jun", total: 28 },
];

export default function Dashboard() {
  const { tenant, properties, leads, contracts, visits } = useImobi();

  const kpis = useMemo(() => [
    {
      title: "Imóveis Ativos",
      value: properties.filter(p => p.status === "available").length.toString(),
      change: "+2.5%",
      trend: "up",
      icon: Building2,
    },
    {
      title: "Leads Totais",
      value: leads.length.toString(),
      change: "+15%",
      trend: "up",
      icon: Users,
    },
    {
      title: "Propostas",
      value: contracts.filter(c => c.status === "draft" || c.status === "sent").length.toString(),
      change: "-4%",
      trend: "down",
      icon: DollarSign,
    },
    {
      title: "Visitas Agendadas",
      value: visits.filter(v => v.status === "scheduled").length.toString(),
      change: "+8%",
      trend: "up",
      icon: CalendarCheck,
    },
  ], [properties, leads, contracts, visits]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral de {tenant?.name}</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline">Exportar</Button>
           <Button>Novo Lead</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Card key={i} className="hover-elevate transition-all duration-200 border-l-4" style={{ borderLeftColor: i === 0 ? tenant?.primaryColor : undefined }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={kpi.trend === "up" ? "text-green-600" : "text-red-600"}>
                  {kpi.change}
                </span>
                <span className="ml-1">vs. mês anterior</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Performance de Vendas</CardTitle>
            <CardDescription>Leads convertidos nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={MOCK_CHART_DATA}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  cursor={{fill: 'var(--muted)'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar 
                  dataKey="total" 
                  fill={tenant?.primaryColor || "currentColor"} 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Últimos Leads</CardTitle>
            <CardDescription>Novos contatos recentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {leads.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-bold">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{lead.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{lead.source}</p>
                    </div>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full font-medium ${
                    lead.status === 'new' ? 'bg-blue-100 text-blue-700' :
                    lead.status === 'visit' ? 'bg-orange-100 text-orange-700' :
                    lead.status === 'contract' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {lead.status === 'new' ? 'Novo' :
                     lead.status === 'visit' ? 'Visita' :
                     lead.status === 'contract' ? 'Contrato' :
                     lead.status}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
