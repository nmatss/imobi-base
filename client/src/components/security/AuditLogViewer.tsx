import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Shield, Search, Filter, Download, Calendar as CalendarIcon,
  User, FileText, Home, Users, Settings, Key, AlertTriangle,
  Clock, ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

interface AuditLogViewerProps {
  tenantId: string;
  entityType?: string;
  entityId?: string;
}

const actionColors: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
  login: 'bg-purple-500',
  logout: 'bg-gray-500',
  view: 'bg-amber-700', // WCAG AA: 4.6:1 contrast
  export: 'bg-orange-500',
  import: 'bg-teal-500',
};

const entityIcons: Record<string, any> = {
  user: User,
  property: Home,
  lead: Users,
  contract: FileText,
  settings: Settings,
  auth: Key,
  system: Shield,
};

const actionLabels: Record<string, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  login: 'Login',
  logout: 'Logout',
  view: 'Visualização',
  export: 'Exportação',
  import: 'Importação',
  '2fa_enabled': '2FA Ativado',
  '2fa_disabled': '2FA Desativado',
  password_change: 'Senha Alterada',
  permission_change: 'Permissões Alteradas',
};

const entityLabels: Record<string, string> = {
  user: 'Usuário',
  property: 'Imóvel',
  lead: 'Lead',
  contract: 'Contrato',
  settings: 'Configurações',
  auth: 'Autenticação',
  system: 'Sistema',
  report: 'Relatório',
  campaign: 'Campanha',
};

export function AuditLogViewer({ tenantId, entityType, entityId }: AuditLogViewerProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterEntity, setFilterEntity] = useState<string>(entityType || 'all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const limit = 50;

  const { data, isLoading, refetch } = useQuery<{ logs: AuditLog[]; total: number }>({
    queryKey: ['audit-logs', tenantId, page, search, filterAction, filterEntity, dateRange, entityId],
    queryFn: async () => {
      const params = new URLSearchParams({
        tenantId,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search) params.append('search', search);
      if (filterAction !== 'all') params.append('action', filterAction);
      if (filterEntity !== 'all') params.append('entityType', filterEntity);
      if (entityId) params.append('entityId', entityId);
      if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
      if (dateRange.to) params.append('endDate', dateRange.to.toISOString());

      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar logs');
      return res.json();
    },
  });

  const exportLogs = async () => {
    const params = new URLSearchParams({
      tenantId,
      format: 'csv',
    });

    if (filterAction !== 'all') params.append('action', filterAction);
    if (filterEntity !== 'all') params.append('entityType', filterEntity);
    if (dateRange.from) params.append('startDate', dateRange.from.toISOString());
    if (dateRange.to) params.append('endDate', dateRange.to.toISOString());

    const res = await fetch(`/api/audit-logs/export?${params}`);
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Logs de Auditoria
          </h2>
          <p className="text-muted-foreground">
            Histórico de todas as ações realizadas no sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportLogs}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuário, ação..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Ações</SelectItem>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!entityType && (
              <Select value={filterEntity} onValueChange={setFilterEntity}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Entidades</SelectItem>
                  {Object.entries(entityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, 'dd/MM', { locale: ptBR })} -{' '}
                        {format(dateRange.to, 'dd/MM', { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })
                    )
                  ) : (
                    'Selecionar período'
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.logs || data.logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4 opacity-30" />
              <h3 className="font-semibold mb-1">Nenhum log encontrado</h3>
              <p className="text-sm text-muted-foreground">
                Não há registros para os filtros selecionados
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {data.logs.map((log) => {
                const EntityIcon = entityIcons[log.entityType] || Shield;
                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className={`p-2 rounded-full ${actionColors[log.action] || 'bg-gray-500'}`}>
                      <EntityIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{log.userName}</span>
                        <Badge variant="outline" className="text-xs">
                          {actionLabels[log.action] || log.action}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {entityLabels[log.entityType] || log.entityType}
                        </Badge>
                        {log.entityId && (
                          <span className="text-xs text-muted-foreground font-mono">
                            #{log.entityId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      {log.details?.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {log.details.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), 'HH:mm:ss', { locale: ptBR })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {data && data.total > limit && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)} de {data.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Detalhes do Log
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Usuário</p>
                  <p className="font-medium">{selectedLog.userName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data/Hora</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ação</p>
                  <Badge className={actionColors[selectedLog.action]}>
                    {actionLabels[selectedLog.action] || selectedLog.action}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Entidade</p>
                  <Badge variant="outline">
                    {entityLabels[selectedLog.entityType] || selectedLog.entityType}
                    {selectedLog.entityId && ` #${selectedLog.entityId.slice(0, 8)}`}
                  </Badge>
                </div>
                {selectedLog.ipAddress && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Endereço IP</p>
                    <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
                  </div>
                )}
              </div>

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Detalhes</p>
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto max-h-64">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.userAgent && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">User Agent</p>
                  <p className="text-xs font-mono bg-muted p-2 rounded overflow-auto">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
