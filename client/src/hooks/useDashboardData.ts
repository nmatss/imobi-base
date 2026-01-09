import { useMemo, useState, useEffect } from "react";
import { useImobi } from "@/lib/imobi-context";
import { differenceInDays, startOfDay, endOfDay, isWithinInterval, isPast, isToday } from "date-fns";

export type FollowUp = {
  id: string;
  tenantId: string;
  leadId: string;
  assignedTo: string | null;
  dueAt: string;
  type: string;
  status: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type DashboardMetrics = {
  // Leads
  newLeads: number;
  inContactLeads: number;
  inVisitLeads: number;
  proposalLeads: number;
  closedLeads: number;
  totalLeads: number;

  // Visitas
  todayVisits: number;
  scheduledVisits: number;
  completedVisits: number;

  // Contratos
  draftContracts: number;
  sentContracts: number;
  signedContracts: number;

  // Imóveis
  availableProperties: number;
  featuredProperties: number;
  rentProperties: number;
  saleProperties: number;

  // Taxas de conversão
  conversionToVisit: number;
  conversionToProposal: number;
  conversionToClosed: number;
};

export type PendenciesData = {
  leadsWithoutContact: any[];
  todayVisitsList: any[];
  overdueFollowUps: any[];
  todayFollowUps: any[];
  totalUrgent: number;
};

export type PipelineStage = {
  key: string;
  label: string;
  color: string;
  icon: any;
  count: number;
  leads: any[];
};

export type PropertyInsights = {
  total: number;
  available: number;
  withoutImages: number;
  withoutDescription: number;
  needsAttention: number;
  byType: Array<{ name: string; total: number; available: number; rent: number; sale: number }>;
};

export function useDashboardData() {
  const { properties, leads, contracts, visits } = useImobi();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch follow-ups
  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/follow-ups?status=pending", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setFollowUps(data);
      }
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
      setError("Erro ao carregar lembretes");
    } finally {
      setLoading(false);
    }
  };

  // Métricas operacionais
  const metrics: DashboardMetrics = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Leads por status
    const newLeads = leads.filter(l => l.status === "new").length;
    const inContactLeads = leads.filter(l => l.status === "qualification").length;
    const inVisitLeads = leads.filter(l => l.status === "visit").length;
    const proposalLeads = leads.filter(l => l.status === "proposal").length;
    const closedLeads = leads.filter(l => l.status === "contract").length;

    // Visitas
    const todayVisits = visits.filter(v => {
      const visitDate = new Date(v.scheduledFor);
      return isWithinInterval(visitDate, { start: today, end: todayEnd }) && v.status === "scheduled";
    }).length;
    const scheduledVisits = visits.filter(v => v.status === "scheduled").length;
    const completedVisits = visits.filter(v => v.status === "completed").length;

    // Propostas
    const draftContracts = contracts.filter(c => c.status === "draft").length;
    const sentContracts = contracts.filter(c => c.status === "sent").length;
    const signedContracts = contracts.filter(c => c.status === "signed").length;

    // Imóveis
    const availableProperties = properties.filter(p => p.status === "available").length;
    const featuredProperties = properties.filter(p => p.featured).length;
    const rentProperties = properties.filter(p => p.category === "rent" && p.status === "available").length;
    const saleProperties = properties.filter(p => p.category === "sale" && p.status === "available").length;

    // Taxas de conversão
    const totalLeads = leads.length || 1;
    const conversionToVisit = Math.round(((inVisitLeads + proposalLeads + closedLeads) / totalLeads) * 100);
    const conversionToProposal = Math.round(((proposalLeads + closedLeads) / totalLeads) * 100);
    const conversionToClosed = Math.round((closedLeads / totalLeads) * 100);

    return {
      newLeads,
      inContactLeads,
      inVisitLeads,
      proposalLeads,
      closedLeads,
      todayVisits,
      scheduledVisits,
      completedVisits,
      draftContracts,
      sentContracts,
      signedContracts,
      availableProperties,
      featuredProperties,
      rentProperties,
      saleProperties,
      conversionToVisit,
      conversionToProposal,
      conversionToClosed,
      totalLeads: leads.length,
    };
  }, [leads, visits, contracts, properties]);

  // Pendências de hoje
  const pendencies: PendenciesData = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Create Maps for O(1) lookups (PERFORMANCE OPTIMIZATION)
    const propertiesMap = new Map(properties.map(p => [p.id, p]));
    const leadsMap = new Map(leads.map(l => [l.id, l]));

    // Leads sem contato há mais de 2 dias
    const leadsWithoutContact = leads.filter(l => {
      if (l.status === "contract") return false;
      const daysSinceUpdate = differenceInDays(now, new Date(l.updatedAt));
      return daysSinceUpdate >= 2;
    });

    // Visitas de hoje - O(1) lookups instead of O(n)
    const todayVisitsList = visits.filter(v => {
      const visitDate = new Date(v.scheduledFor);
      return isWithinInterval(visitDate, { start: today, end: todayEnd }) && v.status === "scheduled";
    }).map(visit => ({
      ...visit,
      property: propertiesMap.get(visit.propertyId),
      lead: leadsMap.get(visit.leadId!),
    }));

    // Follow-ups atrasados - O(1) lookups
    const overdueFollowUps = followUps.filter(f => {
      const dueDate = new Date(f.dueAt);
      return f.status === "pending" && isPast(dueDate) && !isToday(dueDate);
    }).map(f => ({
      ...f,
      lead: leadsMap.get(f.leadId),
    }));

    // Follow-ups de hoje - O(1) lookups
    const todayFollowUps = followUps.filter(f => {
      const dueDate = new Date(f.dueAt);
      return f.status === "pending" && isToday(dueDate);
    }).map(f => ({
      ...f,
      lead: leadsMap.get(f.leadId),
    }));

    return {
      leadsWithoutContact,
      todayVisitsList,
      overdueFollowUps,
      todayFollowUps,
      totalUrgent: overdueFollowUps.length + leadsWithoutContact.filter(l => l.status === "new").length,
    };
  }, [leads, visits, followUps, properties]);

  // Insights de imóveis
  const propertyInsights: PropertyInsights = useMemo(() => {
    const available = properties.filter(p => p.status === "available");
    const withoutImages = available.filter(p => !p.images || p.images.length === 0);
    const withoutDescription = available.filter(p => !p.description || p.description.length < 50);

    // Imóveis por tipo
    const byType: Record<string, { total: number; available: number; rent: number; sale: number }> = {};
    properties.forEach(prop => {
      const type = prop.type === "house" ? "Casa" :
                   prop.type === "apartment" ? "Apto" :
                   prop.type === "land" ? "Terreno" :
                   prop.type === "commercial" ? "Comercial" : prop.type;
      if (!byType[type]) byType[type] = { total: 0, available: 0, rent: 0, sale: 0 };
      byType[type].total++;
      if (prop.status === "available") {
        byType[type].available++;
        if (prop.category === "rent") byType[type].rent++;
        if (prop.category === "sale") byType[type].sale++;
      }
    });

    return {
      total: properties.length,
      available: available.length,
      withoutImages: withoutImages.length,
      withoutDescription: withoutDescription.length,
      needsAttention: withoutImages.length + withoutDescription.length,
      byType: Object.entries(byType).map(([name, data]) => ({ name, ...data })),
    };
  }, [properties]);

  // Últimos leads
  const recentLeads = useMemo(() => {
    return leads
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(lead => {
        const daysSinceCreated = differenceInDays(new Date(), new Date(lead.createdAt));
        const daysSinceUpdate = differenceInDays(new Date(), new Date(lead.updatedAt));

        let nextAction = "Fazer primeiro contato";
        if (lead.status === "qualification") nextAction = "Agendar visita";
        if (lead.status === "visit") nextAction = "Enviar proposta";
        if (lead.status === "proposal") nextAction = "Aguardar retorno";
        if (lead.status === "contract") nextAction = "Concluído";

        return {
          ...lead,
          daysSinceCreated,
          daysSinceUpdate,
          nextAction,
          needsAttention: daysSinceUpdate >= 2 && lead.status !== "contract",
        };
      });
  }, [leads]);

  // Timeline de visitas de hoje
  const todayTimeline = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Create Maps for O(1) lookups (PERFORMANCE OPTIMIZATION)
    const propertiesMap = new Map(properties.map(p => [p.id, p]));
    const leadsMap = new Map(leads.map(l => [l.id, l]));

    return visits
      .filter(v => {
        const visitDate = new Date(v.scheduledFor);
        return isWithinInterval(visitDate, { start: today, end: todayEnd });
      })
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .map(visit => ({
        ...visit,
        property: propertiesMap.get(visit.propertyId),
        lead: leadsMap.get(visit.leadId!),
        isPast: isPast(new Date(visit.scheduledFor)),
      }));
  }, [visits, properties, leads]);

  return {
    metrics,
    pendencies,
    propertyInsights,
    recentLeads,
    todayTimeline,
    followUps,
    loading,
    error,
    refetchFollowUps: fetchFollowUps,
  };
}
