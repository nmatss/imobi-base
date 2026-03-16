import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  AlertTriangle,
  Activity,
  Users,
  Gauge,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";

type AnalyticsDashboardData = {
  totalPageviews: number;
  topPages: { path: string; count: number }[];
  webVitals: { name: string; avg: number; rating: string }[];
  errorCount: number;
  uniqueSessions: number;
  pageviewsByDay: { date: string; count: number }[];
  recentErrors: {
    id: string;
    message: string;
    stack: string | null;
    userAgent: string | null;
    createdAt: string;
    userId: string | null;
  }[];
};

const ratingColor = (rating: string) => {
  if (rating === "good") return "text-green-600 bg-green-100";
  if (rating === "needs-improvement") return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
};

const ratingLabel = (rating: string) => {
  if (rating === "good") return "Bom";
  if (rating === "needs-improvement") return "A melhorar";
  return "Ruim";
};

const vitalUnit = (name: string) => {
  if (name === "CLS") return "";
  return "ms";
};

const vitalDescription = (name: string) => {
  switch (name) {
    case "LCP": return "Largest Contentful Paint";
    case "FID": return "First Input Delay";
    case "CLS": return "Cumulative Layout Shift";
    case "FCP": return "First Contentful Paint";
    case "TTFB": return "Time to First Byte";
    case "INP": return "Interaction to Next Paint";
    default: return name;
  }
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<string>("month");

  const { data, isLoading, error } = useQuery<AnalyticsDashboardData>({
    queryKey: ["/api/analytics/dashboard", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/dashboard?period=${period}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Falha ao carregar analytics");
      return res.json();
    },
  });

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-700">Erro ao carregar analytics</h2>
            <p className="text-gray-500 mt-2">Tente novamente mais tarde.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Monitoramento de uso e performance do sistema</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Periodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">7 dias</SelectItem>
            <SelectItem value="month">30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pageviews</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{data?.totalPageviews?.toLocaleString('pt-BR') || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Sessoes Unicas</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{data?.uniqueSessions?.toLocaleString('pt-BR') || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Erros</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{data?.errorCount?.toLocaleString('pt-BR') || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Gauge className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Web Vitals</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{data?.webVitals?.length || 0} metricas</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pageviews Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Pageviews por dia
          </CardTitle>
          <CardDescription>Volume de pageviews ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : data?.pageviewsByDay && data.pageviewsByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.pageviewsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const d = new Date(v + "T00:00:00");
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <RechartsTooltip
                  labelFormatter={(v) => {
                    const d = new Date(v + "T00:00:00");
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  }}
                  formatter={(value: number) => [value, "Pageviews"]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p>Nenhum dado de pageview no periodo</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Web Vitals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Web Vitals
            </CardTitle>
            <CardDescription>Metricas de performance do frontend</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : data?.webVitals && data.webVitals.length > 0 ? (
              <div className="space-y-3">
                {data.webVitals.map((vital) => (
                  <div key={vital.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold text-sm">{vital.name}</p>
                      <p className="text-xs text-gray-500">{vitalDescription(vital.name)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">
                        {vital.avg}{vitalUnit(vital.name)}
                      </span>
                      <Badge className={ratingColor(vital.rating)} variant="secondary">
                        {ratingLabel(vital.rating)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400">
                <Gauge className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p>Nenhum dado de Web Vitals no periodo</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Paginas mais visitadas
            </CardTitle>
            <CardDescription>Top 10 paginas por visualizacoes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : data?.topPages && data.topPages.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pagina</TableHead>
                    <TableHead className="text-right">Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topPages.map((page, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm truncate max-w-[250px]">
                        {page.path || "/"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {page.count.toLocaleString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-gray-400">
                <Eye className="h-12 w-12 mx-auto mb-2 opacity-40" />
                <p>Nenhum dado de paginas no periodo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Log de Erros Recentes
          </CardTitle>
          <CardDescription>Ultimos erros reportados pelo frontend</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : data?.recentErrors && data.recentErrors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mensagem</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead className="text-right">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Data
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentErrors.map((err) => (
                  <TableRow key={err.id}>
                    <TableCell className="max-w-[400px]">
                      <p className="text-sm font-medium text-red-700 truncate">{err.message}</p>
                      {err.stack && (
                        <p className="text-xs text-gray-400 truncate mt-1">{err.stack.split('\n')[0]}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">
                      {err.userAgent ? err.userAgent.slice(0, 60) + '...' : '-'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500 whitespace-nowrap">
                      {new Date(err.createdAt).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-40" />
              <p>Nenhum erro reportado no periodo</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
