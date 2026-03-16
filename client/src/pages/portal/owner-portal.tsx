import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Home, DollarSign, FileText, Wrench, BarChart3,
  LogOut, ChevronRight, Calendar, User, CheckCircle, Clock,
  AlertTriangle, TrendingUp, Eye, Phone, MapPin, ArrowUpDown,
  ThumbsUp, ThumbsDown, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function portalFetch(url: string) {
  const token = localStorage.getItem("portal_token");
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(res => {
    if (res.status === 401) {
      localStorage.removeItem("portal_token");
      localStorage.removeItem("portal_user");
      localStorage.removeItem("portal_tenant");
      window.location.href = "/portal/login";
      throw new Error("Sessão expirada");
    }
    if (!res.ok) throw new Error("Erro ao carregar dados");
    return res.json();
  });
}

export default function OwnerPortal() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [approveNotes, setApproveNotes] = useState("");
  const [repasseFilter, setRepasseFilter] = useState("all");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("portal_user") || "{}");
    } catch { return {}; }
  }, []);

  const tenant = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("portal_tenant") || "{}");
    } catch { return {}; }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    if (!token) setLocation("/portal/login");
  }, [setLocation]);

  const { data: dashboard } = useQuery({
    queryKey: ["/api/portal/owner/dashboard"],
    queryFn: () => portalFetch("/api/portal/owner/dashboard"),
  });

  const { data: properties } = useQuery({
    queryKey: ["/api/portal/owner/properties"],
    queryFn: () => portalFetch("/api/portal/owner/properties"),
    enabled: activeTab === "properties" || activeTab === "dashboard",
  });

  const { data: repasses } = useQuery({
    queryKey: ["/api/portal/owner/repasses"],
    queryFn: () => portalFetch("/api/portal/owner/repasses"),
    enabled: activeTab === "repasses",
  });

  const { data: contracts } = useQuery({
    queryKey: ["/api/portal/owner/contracts"],
    queryFn: () => portalFetch("/api/portal/owner/contracts"),
    enabled: activeTab === "contracts",
  });

  const { data: maintenance } = useQuery({
    queryKey: ["/api/portal/owner/maintenance"],
    queryFn: () => portalFetch("/api/portal/owner/maintenance"),
    enabled: activeTab === "maintenance",
  });

  const { data: incomeReport } = useQuery({
    queryKey: ["/api/portal/owner/income-report"],
    queryFn: () => portalFetch("/api/portal/owner/income-report"),
    enabled: activeTab === "income",
  });

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_user");
    localStorage.removeItem("portal_tenant");
    setLocation("/portal/login");
  };

  const handleApproveTicket = async (approved: boolean) => {
    if (!selectedTicket) return;
    const token = localStorage.getItem("portal_token");
    try {
      await fetch(`/api/portal/owner/maintenance/${selectedTicket.id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ approved, notes: approveNotes }),
      });
      setApproveDialogOpen(false);
      setSelectedTicket(null);
      setApproveNotes("");
    } catch (err) {
      console.error("Error approving ticket:", err);
    }
  };

  const filteredRepasses = useMemo(() => {
    if (!repasses) return [];
    if (repasseFilter === "all") return repasses;
    return repasses.filter((r: any) => r.status === repasseFilter);
  }, [repasses, repasseFilter]);

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Ativo", variant: "default" },
      inactive: { label: "Inativo", variant: "secondary" },
      pending: { label: "Pendente", variant: "outline" },
      paid: { label: "Pago", variant: "default" },
      open: { label: "Aberto", variant: "destructive" },
      in_progress: { label: "Em Andamento", variant: "outline" },
      waiting_approval: { label: "Aguardando Aprovação", variant: "outline" },
      completed: { label: "Concluído", variant: "default" },
      cancelled: { label: "Cancelado", variant: "secondary" },
      expired: { label: "Encerrado", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const primaryColor = tenant?.primaryColor || "#0066cc";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {tenant?.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}>
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">{tenant?.name || "Portal"}</p>
                <p className="text-xs text-muted-foreground">Portal do Proprietário</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <BarChart3 className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="properties" className="gap-1.5">
              <Home className="h-4 w-4" /> Imóveis
            </TabsTrigger>
            <TabsTrigger value="repasses" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> Repasses
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-1.5">
              <FileText className="h-4 w-4" /> Contratos
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5">
              <Wrench className="h-4 w-4" /> Manutenção
            </TabsTrigger>
            <TabsTrigger value="income" className="gap-1.5">
              <TrendingUp className="h-4 w-4" /> Rendimentos
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard?.totalProperties || 0}</p>
                      <p className="text-xs text-muted-foreground">Imóveis</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard?.occupancyRate || 0}%</p>
                      <p className="text-xs text-muted-foreground">Ocupação</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(dashboard?.monthlyRevenue || 0)}</p>
                      <p className="text-xs text-muted-foreground">Receita Mensal</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{dashboard?.pendingTransfers || 0}</p>
                      <p className="text-xs text-muted-foreground">Repasses Pendentes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo de Repasses</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard?.pendingTransfers > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                        <span className="text-sm">Valor pendente</span>
                        <span className="font-bold text-orange-700">{formatCurrency(dashboard?.pendingTransfersValue || 0)}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("repasses")}>
                        Ver Repasses <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhum repasse pendente</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Manutenção</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboard?.openTickets > 0 ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <span className="text-sm">Chamados abertos</span>
                        <span className="font-bold text-red-700">{dashboard?.openTickets}</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab("maintenance")}>
                        Ver Chamados <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                      <p className="text-sm">Nenhum chamado aberto</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Properties */}
          <TabsContent value="properties">
            <div className="space-y-4">
              {!properties || properties.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                    <Home className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum imóvel cadastrado</p>
                    <p className="text-sm">Seus imóveis aparecerão aqui quando vinculados.</p>
                  </CardContent>
                </Card>
              ) : (
                properties.map((item: any) => (
                  <Card key={item.property.id}>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-32 h-24 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                          {item.property.images ? (
                            <img
                              src={typeof item.property.images === "string" ? JSON.parse(item.property.images)[0] : item.property.images[0]}
                              alt={item.property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="h-8 w-8 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-sm">{item.property.title}</h3>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {item.property.address}, {item.property.city}
                              </p>
                            </div>
                            <Badge variant={item.isOccupied ? "default" : "secondary"}>
                              {item.isOccupied ? "Ocupado" : "Vago"}
                            </Badge>
                          </div>

                          {item.contract && (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Aluguel</span>
                                  <p className="font-semibold">{formatCurrency(item.contract.rentValue)}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Vigência</span>
                                  <p className="font-semibold">
                                    {new Date(item.contract.startDate).toLocaleDateString("pt-BR")} - {new Date(item.contract.endDate).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                                {item.renter && (
                                  <div>
                                    <span className="text-muted-foreground">Inquilino</span>
                                    <p className="font-semibold flex items-center gap-1">
                                      <User className="h-3 w-3" /> {item.renter.name}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* Repasses */}
          <TabsContent value="repasses">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Repasses</h2>
              <Select value={repasseFilter} onValueChange={setRepasseFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!filteredRepasses || filteredRepasses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum repasse encontrado</p>
                  <p className="text-sm">Seus repasses aparecerão aqui quando disponíveis.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredRepasses.map((transfer: any) => (
                  <Card key={transfer.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Ref: {transfer.referenceMonth}</span>
                            {statusBadge(transfer.status)}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Bruto</span>
                              <p className="font-semibold">{formatCurrency(transfer.grossAmount)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Taxa Admin.</span>
                              <p className="font-semibold text-red-600">-{formatCurrency(transfer.administrationFee || 0)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Deduções</span>
                              <p className="font-semibold text-red-600">-{formatCurrency(transfer.maintenanceDeductions || 0)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Líquido</span>
                              <p className="font-bold text-green-700">{formatCurrency(transfer.netAmount)}</p>
                            </div>
                          </div>
                        </div>
                        {transfer.paidDate && (
                          <div className="text-xs text-muted-foreground">
                            Pago em {new Date(transfer.paidDate).toLocaleDateString("pt-BR")}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Contracts */}
          <TabsContent value="contracts">
            {!contracts || contracts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum contrato encontrado</p>
                  <p className="text-sm">Seus contratos de locação aparecerão aqui.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {contracts.map((contract: any) => (
                  <Card key={contract.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">
                              {contract.property?.title || contract.property?.address || "Imóvel"}
                            </span>
                            {statusBadge(contract.status)}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Aluguel</span>
                              <p className="font-semibold">{formatCurrency(contract.rentValue)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Início</span>
                              <p className="font-semibold">{new Date(contract.startDate).toLocaleDateString("pt-BR")}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Término</span>
                              <p className="font-semibold">{new Date(contract.endDate).toLocaleDateString("pt-BR")}</p>
                            </div>
                            {contract.renter && (
                              <div>
                                <span className="text-muted-foreground">Inquilino</span>
                                <p className="font-semibold">{contract.renter.name}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance">
            {!maintenance || maintenance.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum chamado de manutenção</p>
                  <p className="text-sm">Chamados dos seus imóveis aparecerão aqui.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {maintenance.map((ticket: any) => (
                  <Card key={ticket.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{ticket.title}</span>
                            {statusBadge(ticket.status)}
                            <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{ticket.description}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {ticket.propertyTitle || ticket.propertyAddress}
                          </p>
                          {ticket.estimatedCost && (
                            <p className="text-xs">
                              Custo estimado: <span className="font-semibold">{formatCurrency(ticket.estimatedCost)}</span>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Aberto em {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        {(ticket.status === "open" || ticket.status === "waiting_approval") && (
                          <div className="flex gap-2 self-start">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => { setSelectedTicket(ticket); setApproveDialogOpen(true); }}
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" /> Aprovar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Income Report */}
          <TabsContent value="income">
            {!incomeReport ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Carregando relatório...</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Relatório de Rendimentos - {incomeReport.year}</CardTitle>
                    <CardDescription>
                      Dados para declaração de imposto de renda (DIMOB)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">Total Recebido</p>
                        <p className="text-xl font-bold text-blue-800">{formatCurrency(incomeReport.totalIncome)}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-xs text-green-600">Imóveis</p>
                        <p className="text-xl font-bold text-green-800">{incomeReport.propertiesCount}</p>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-xs text-purple-600">CPF/CNPJ</p>
                        <p className="text-xl font-bold text-purple-800">{incomeReport.owner?.cpfCnpj || "N/A"}</p>
                      </div>
                    </div>

                    {/* Monthly breakdown */}
                    <h4 className="text-sm font-semibold mb-3">Detalhamento Mensal</h4>
                    {Object.keys(incomeReport.incomeByMonth || {}).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum rendimento registrado no período.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(incomeReport.incomeByMonth).sort().map(([month, value]: [string, any]) => (
                          <div key={month} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded">
                            <span className="text-sm">{month}</span>
                            <span className="font-semibold text-sm">{formatCurrency(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Transfers breakdown */}
                {incomeReport.transfers && incomeReport.transfers.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Repasses do Período</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {incomeReport.transfers.map((t: any, i: number) => (
                          <div key={i} className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded text-sm">
                            <span>{t.referenceMonth}</span>
                            <div className="flex gap-4">
                              <span className="text-muted-foreground">Bruto: {formatCurrency(t.grossAmount)}</span>
                              <span className="font-semibold">{formatCurrency(t.netAmount)}</span>
                              {statusBadge(t.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Manutenção</DialogTitle>
            <DialogDescription>
              {selectedTicket?.title} - {selectedTicket?.propertyTitle}
              {selectedTicket?.estimatedCost && (
                <span className="block mt-1 font-semibold">
                  Custo estimado: {formatCurrency(selectedTicket.estimatedCost)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Observações (opcional)"
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleApproveTicket(false)}>
              <ThumbsDown className="h-4 w-4 mr-1" /> Recusar
            </Button>
            <Button onClick={() => handleApproveTicket(true)}>
              <ThumbsUp className="h-4 w-4 mr-1" /> Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
