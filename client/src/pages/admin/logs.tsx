import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Activity, User, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type UsageLog = {
  id: string;
  tenantName: string | null;
  userName: string | null;
  action: string;
  details: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type ActionFilter = "all" | "login" | "logout" | "create" | "update" | "delete";

export default function LogsPage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const logsPerPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, dateFilter]);

  useEffect(() => {
    filterLogs();
  }, [searchTerm, logs]);

  async function fetchLogs() {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: logsPerPage.toString(),
      });

      if (actionFilter !== "all") {
        params.append("action", actionFilter);
      }

      if (dateFilter !== "all") {
        const now = new Date();
        let startDate: Date;

        switch (dateFilter) {
          case "today":
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case "week":
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case "month":
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          default:
            startDate = new Date(0);
        }

        params.append("startDate", startDate.toISOString());
      }

      const res = await fetch(`/api/admin/logs?${params}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(Math.ceil(data.total / logsPerPage));
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  }

  function filterLogs() {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.tenantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }

  const getActionColor = (action: string) => {
    if (action.includes("create")) return "default";
    if (action.includes("update")) return "secondary";
    if (action.includes("delete")) return "destructive";
    if (action.includes("login")) return "outline";
    return "outline";
  };

  const getActionIcon = (action: string) => {
    if (action.includes("login") || action.includes("logout")) {
      return <User className="h-3 w-3" />;
    }
    if (action.includes("tenant")) {
      return <Building2 className="h-3 w-3" />;
    }
    return <Activity className="h-3 w-3" />;
  };

  const formatAction = (action: string) => {
    return action
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatDetails = (details: any) => {
    if (!details || Object.keys(details).length === 0) return "-";

    try {
      const detailsStr = JSON.stringify(details, null, 2);
      return detailsStr.length > 100 ? detailsStr.substring(0, 100) + "..." : detailsStr;
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Logs de Uso</h1>
        <p className="text-muted-foreground mt-1">
          Auditoria de todas as ações na plataforma
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tenant, usuário, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Ação</Label>
              <Select value={actionFilter} onValueChange={(value: ActionFilter) => setActionFilter(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="create">Criar</SelectItem>
                  <SelectItem value="update">Atualizar</SelectItem>
                  <SelectItem value="delete">Excluir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o período</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Auditoria ({filteredLogs.length})</CardTitle>
          <CardDescription>
            Histórico de ações realizadas na plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.tenantName || "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.userName || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionColor(log.action) as any} className="gap-1">
                        {getActionIcon(log.action)}
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ipAddress || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {formatDetails(log.details)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
              </Table>
            </div>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
