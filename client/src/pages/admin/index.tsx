import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp, DollarSign, AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";

type AdminStats = {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  totalProperties: number;
  mrr: number;
  mrrGrowth: number;
};

type TenantAlert = {
  id: string;
  tenantName: string;
  type: "overdue" | "trial_expiring";
  message: string;
  severity: "high" | "medium" | "low";
};

type RecentTenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  userCount: number;
  propertyCount: number;
  createdAt: string;
};

type ChartData = {
  month: string;
  tenants: number;
};

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<AdminStats>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    suspendedTenants: 0,
    totalUsers: 0,
    totalProperties: 0,
    mrr: 0,
    mrrGrowth: 0,
  });
  const [alerts, setAlerts] = useState<TenantAlert[]>([]);
  const [recentTenants, setRecentTenants] = useState<RecentTenant[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  async function fetchAdminStats() {
    try {
      const res = await fetch("/api/admin/stats", {
        credentials: "include",
      });

      if (res.status === 403) {
        setLocation("/dashboard");
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setAlerts(data.alerts);
        setRecentTenants(data.recentTenants);
        setChartData(data.chartData);
      }
    } catch (error) {
      console.error("Failed to fetch admin stats:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "trial":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Admin Global</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie todos os tenants e monitore o desempenho da plataforma
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTenants} ativos, {stats.trialTenants} em trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tenants Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTenants}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeTenants / stats.totalTenants) * 100).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Totais</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalProperties} imóveis cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.mrr.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.mrrGrowth > 0 ? "+" : ""}
              {stats.mrrGrowth.toFixed(1)}% vs mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Novos Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Novos Tenants por Mês</CardTitle>
          <CardDescription>Crescimento da base de clientes nos últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="tenants" stroke="#0066cc" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Alertas
            </CardTitle>
            <CardDescription>
              Tenants que requerem atenção ({alerts.length})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
              ) : (
                alerts.map((alert) => (
                  <Alert key={alert.id} variant={getSeverityColor(alert.severity) as any}>
                    <AlertDescription className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{alert.tenantName}</p>
                        <p className="text-sm mt-1">{alert.message}</p>
                      </div>
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.type === "overdue" ? "Inadimplente" : "Trial expirando"}
                      </Badge>
                    </AlertDescription>
                  </Alert>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tenants Recentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tenants Recentes
            </CardTitle>
            <CardDescription>Últimos tenants cadastrados</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Nenhum tenant recente
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell className="font-medium">{tenant.name}</TableCell>
                      <TableCell>{tenant.plan}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(tenant.status) as any}>
                          {tenant.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
