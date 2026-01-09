import { useQuery } from "@tanstack/react-query";
import { cacheStrategies } from "@/lib/queryClient";

/**
 * Hooks para dados em tempo real que precisam estar sempre atualizados
 * Usa network-first ou always-fetch strategy
 */

// ==================== TYPES ====================

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

export type Activity = {
  id: string;
  type: string;
  userId: string;
  userName: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
};

export type TodayAgenda = {
  visits: Array<{
    id: string;
    leadName: string;
    propertyAddress: string;
    scheduledFor: string;
    status: string;
  }>;
  followUps: Array<{
    id: string;
    leadName: string;
    type: string;
    dueAt: string;
    notes?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    dueAt: string;
    priority: string;
  }>;
};

// ==================== API FUNCTIONS ====================

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetch("/api/dashboard/metrics", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard metrics");
  }

  return response.json();
}

async function fetchRecentActivities(limit: number = 10): Promise<Activity[]> {
  const response = await fetch(`/api/activities?limit=${limit}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recent activities");
  }

  return response.json();
}

async function fetchNotifications(unreadOnly: boolean = false): Promise<Notification[]> {
  const url = `/api/notifications${unreadOnly ? "?unread=true" : ""}`;
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notifications");
  }

  return response.json();
}

async function fetchTodayAgenda(): Promise<TodayAgenda> {
  const response = await fetch("/api/agenda/today", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch today's agenda");
  }

  return response.json();
}

// ==================== QUERY KEYS ====================

export const realtimeKeys = {
  all: ["realtime"] as const,
  dashboardMetrics: () => [...realtimeKeys.all, "dashboard-metrics"] as const,
  activities: (limit?: number) => [...realtimeKeys.all, "activities", limit] as const,
  notifications: (unreadOnly?: boolean) => [
    ...realtimeKeys.all,
    "notifications",
    unreadOnly,
  ] as const,
  todayAgenda: () => [...realtimeKeys.all, "today-agenda"] as const,
};

// ==================== HOOKS ====================

/**
 * Hook para buscar métricas do dashboard
 * Sempre busca dados frescos e atualiza a cada 30 segundos
 */
export function useDashboardMetrics(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: realtimeKeys.dashboardMetrics(),
    queryFn: fetchDashboardMetrics,
    ...cacheStrategies.realtime,
    refetchInterval: options?.refetchInterval ?? 30 * 1000, // 30 segundos
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar atividades recentes
 * Atualiza frequentemente para mostrar atividades em tempo real
 */
export function useRecentActivities(
  limit: number = 10,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: realtimeKeys.activities(limit),
    queryFn: () => fetchRecentActivities(limit),
    ...cacheStrategies.realtime,
    refetchInterval: options?.refetchInterval ?? 30 * 1000, // 30 segundos
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar notificações
 * Atualiza com frequência para mostrar novas notificações
 */
export function useNotifications(
  unreadOnly: boolean = false,
  options?: { enabled?: boolean; refetchInterval?: number }
) {
  return useQuery({
    queryKey: realtimeKeys.notifications(unreadOnly),
    queryFn: () => fetchNotifications(unreadOnly),
    ...cacheStrategies.realtime,
    refetchInterval: options?.refetchInterval ?? 60 * 1000, // 1 minuto
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para buscar agenda de hoje
 * Atualiza frequentemente para refletir mudanças no dia
 */
export function useTodayAgenda(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({
    queryKey: realtimeKeys.todayAgenda(),
    queryFn: fetchTodayAgenda,
    ...cacheStrategies.realtime,
    refetchInterval: options?.refetchInterval ?? 60 * 1000, // 1 minuto
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook para verificar contagem de notificações não lidas
 * Versão otimizada que só busca a contagem
 */
export function useUnreadNotificationsCount(options?: {
  enabled?: boolean;
  refetchInterval?: number;
}) {
  const { data: notifications = [] } = useNotifications(true, {
    enabled: options?.enabled,
    refetchInterval: options?.refetchInterval,
  });

  return {
    count: notifications.length,
    hasUnread: notifications.length > 0,
  };
}
