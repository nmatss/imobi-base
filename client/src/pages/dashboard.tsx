import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useImobi } from "@/lib/imobi-context";
import { Building2, Users, DollarSign, CalendarCheck, ArrowUpRight, ArrowDownRight, Plus, FileDown, Eye, Clock, MapPin, Phone } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  qualification: "#8b5cf6",
  visit: "#f97316",
  proposal: "#eab308",
  contract: "#22c55e",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Novo",
  qualification: "Qualificação",
  visit: "Visita",
  proposal: "Proposta",
  contract: "Contrato",
};

function parseCurrencyValue(value: string | null | undefined): number {
  if (!value) return 0;
  const cleanValue = value.replace(/[R$\s.]/g, "").replace(",", ".");
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

export default function Dashboard() {
  const { tenant, properties, leads, contracts, visits, refetchLeads } = useImobi();
  const [, setLocation] = useLocation();
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "website",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const kpis = useMemo(() => {
    const activeProperties = properties.filter(p => p.status === "available").length;
    const totalLeads = leads.length;
    const pendingContracts = contracts.filter(c => c.status === "draft" || c.status === "sent").length;
    const scheduledVisits = visits.filter(v => v.status === "scheduled").length;

    return [
      {
        title: "Imóveis Ativos",
        value: activeProperties.toString(),
        subValue: `${properties.length} total`,
        trend: "up",
        icon: Building2,
        color: "#3b82f6",
      },
      {
        title: "Leads Totais",
        value: totalLeads.toString(),
        subValue: `${leads.filter(l => l.status === "new").length} novos`,
        trend: "up",
        icon: Users,
        color: "#8b5cf6",
      },
      {
        title: "Propostas Ativas",
        value: pendingContracts.toString(),
        subValue: `${contracts.filter(c => c.status === "signed").length} assinados`,
        trend: pendingContracts > 0 ? "up" : "neutral",
        icon: DollarSign,
        color: "#22c55e",
      },
      {
        title: "Visitas Agendadas",
        value: scheduledVisits.toString(),
        subValue: `${visits.filter(v => v.status === "completed").length} realizadas`,
        trend: scheduledVisits > 0 ? "up" : "neutral",
        icon: CalendarCheck,
        color: "#f97316",
      },
    ];
  }, [properties, leads, contracts, visits]);

  const leadsByStatus = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    leads.forEach(lead => {
      statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: LEAD_STATUS_LABELS[status] || status,
      value: count,
      color: LEAD_STATUS_COLORS[status] || "#6b7280",
    }));
  }, [leads]);

  const propertiesByType = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    properties.forEach(prop => {
      const typeLabel = prop.type === "house" ? "Casa" : prop.type === "apartment" ? "Apartamento" : prop.type === "land" ? "Terreno" : prop.type === "commercial" ? "Comercial" : prop.type;
      typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([type, count]) => ({
      name: type,
      total: count,
    }));
  }, [properties]);

  const upcomingVisits = useMemo(() => {
    const now = new Date();
    return visits
      .filter(v => v.status === "scheduled" && new Date(v.scheduledFor) >= now)
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .slice(0, 4)
      .map(visit => {
        const property = properties.find(p => p.id === visit.propertyId);
        const lead = leads.find(l => l.id === visit.leadId);
        return { ...visit, property, lead };
      });
  }, [visits, properties, leads]);

  const totalContractValue = useMemo(() => {
    return contracts
      .filter(c => c.status === "signed")
      .reduce((sum, c) => sum + parseCurrencyValue(c.value), 0);
  }, [contracts]);

  async function handleCreateLead(e: React.FormEvent) {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.email || !newLeadForm.phone) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newLeadForm.name,
          email: newLeadForm.email,
          phone: newLeadForm.phone,
          source: newLeadForm.source,
          status: "new",
        }),
      });
      
      if (res.ok) {
        setNewLeadOpen(false);
        setNewLeadForm({ name: "", email: "", phone: "", source: "website" });
        await refetchLeads();
      }
    } catch (error) {
      console.error("Failed to create lead:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 data-testid="text-dashboard-title" className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral de {tenant?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" data-testid="button-export">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-lead">
                <Plus className="mr-2 h-4 w-4" />
                Novo Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Lead</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateLead} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lead-name">Nome</Label>
                  <Input
                    id="lead-name"
                    data-testid="input-lead-name"
                    value={newLeadForm.name}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-email">E-mail</Label>
                  <Input
                    id="lead-email"
                    type="email"
                    data-testid="input-lead-email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-phone">Telefone</Label>
                  <Input
                    id="lead-phone"
                    data-testid="input-lead-phone"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lead-source">Origem</Label>
                  <Select
                    value={newLeadForm.source}
                    onValueChange={(value) => setNewLeadForm(prev => ({ ...prev, source: value }))}
                  >
                    <SelectTrigger data-testid="select-lead-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Site</SelectItem>
                      <SelectItem value="referral">Indicação</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setNewLeadOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} data-testid="button-submit-lead">
                    {isSubmitting ? "Salvando..." : "Salvar Lead"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <Card 
            key={i} 
            data-testid={`card-kpi-${i}`}
            className="hover:shadow-lg transition-all duration-200 border-l-4" 
            style={{ borderLeftColor: kpi.color }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${kpi.color}20` }}>
                <kpi.icon className="h-4 w-4" style={{ color: kpi.color }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {kpi.trend === "up" ? (
                  <ArrowUpRight className="mr-1 h-3 w-3 text-green-500" />
                ) : kpi.trend === "down" ? (
                  <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                ) : null}
                <span>{kpi.subValue}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalContractValue > 0 && (
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Valor Total em Contratos Assinados</p>
                <p className="text-4xl font-bold mt-1" data-testid="text-total-contracts-value">
                  {formatCurrency(totalContractValue)}
                </p>
              </div>
              <DollarSign className="h-16 w-16 text-green-200 opacity-50" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Imóveis por Tipo</CardTitle>
            <CardDescription>Distribuição do portfólio de imóveis</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {propertiesByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={propertiesByType}>
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
                    allowDecimals={false}
                  />
                  <Tooltip 
                    cursor={{fill: 'var(--muted)'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`${value} imóveis`, 'Quantidade']}
                  />
                  <Bar 
                    dataKey="total" 
                    fill={tenant?.primaryColor || "#3b82f6"} 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div data-testid="empty-state-properties" className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Building2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p data-testid="text-no-properties">Nenhum imóvel cadastrado</p>
                  <Button data-testid="button-add-property" variant="link" onClick={() => setLocation("/properties")} className="mt-2">
                    Cadastrar imóvel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Funil de Leads</CardTitle>
            <CardDescription>Distribuição por status</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsByStatus.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={leadsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {leadsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [`${value} leads`, name]}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {leadsByStatus.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div data-testid="empty-state-leads-funnel" className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p data-testid="text-no-leads-funnel">Nenhum lead cadastrado</p>
                  <Button data-testid="button-add-lead-funnel" variant="link" onClick={() => setNewLeadOpen(true)} className="mt-2">
                    Cadastrar lead
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Próximas Visitas</CardTitle>
              <CardDescription>Visitas agendadas</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/visits")}>
              Ver todas
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingVisits.length > 0 ? (
              <div className="space-y-4">
                {upcomingVisits.map((visit) => (
                  <div key={visit.id} data-testid={`card-visit-${visit.id}`} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{visit.property?.title || "Imóvel"}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{visit.property?.address}, {visit.property?.city}</span>
                      </div>
                      {visit.lead && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <Phone className="h-3 w-3" />
                          <span>{visit.lead.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium" style={{ color: tenant?.primaryColor }}>
                        {format(new Date(visit.scheduledFor), "dd/MM", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(visit.scheduledFor), "HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div data-testid="empty-state-visits" className="py-8 text-center text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p data-testid="text-no-visits">Nenhuma visita agendada</p>
                <Button data-testid="button-schedule-visit" variant="link" onClick={() => setLocation("/visits")} className="mt-2">
                  Agendar visita
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Últimos Leads</CardTitle>
              <CardDescription>Novos contatos recentes</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/leads")}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            {leads.length > 0 ? (
              <div className="space-y-4">
                {leads.slice(0, 5).map((lead) => (
                  <div key={lead.id} data-testid={`card-lead-${lead.id}`} className="flex items-center justify-between group p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: tenant?.primaryColor || "#3b82f6" }}
                      >
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">{lead.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ 
                          backgroundColor: `${LEAD_STATUS_COLORS[lead.status]}20`,
                          color: LEAD_STATUS_COLORS[lead.status] 
                        }}
                      >
                        {LEAD_STATUS_LABELS[lead.status] || lead.status}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div data-testid="empty-state-leads" className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p data-testid="text-no-leads">Nenhum lead cadastrado</p>
                <Button data-testid="button-add-lead" variant="link" onClick={() => setNewLeadOpen(true)} className="mt-2">
                  Cadastrar lead
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
