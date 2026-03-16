import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2, Home, DollarSign, FileText, Wrench, LogOut,
  Calendar, Clock, AlertTriangle, CheckCircle, CreditCard,
  Camera, Plus, MapPin, Phone, Mail, MessageSquare, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

function portalFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem("portal_token");
  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers || {}),
      Authorization: `Bearer ${token}`,
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
    },
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

export default function RenterPortal() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium",
  });
  const [boletoDialogOpen, setBoletoDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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
    queryKey: ["/api/portal/renter/dashboard"],
    queryFn: () => portalFetch("/api/portal/renter/dashboard"),
  });

  const { data: payments } = useQuery({
    queryKey: ["/api/portal/renter/payments"],
    queryFn: () => portalFetch("/api/portal/renter/payments"),
    enabled: activeTab === "payments",
  });

  const { data: contract } = useQuery({
    queryKey: ["/api/portal/renter/contract"],
    queryFn: () => portalFetch("/api/portal/renter/contract"),
    enabled: activeTab === "contract" || activeTab === "dashboard",
  });

  const { data: documents } = useQuery({
    queryKey: ["/api/portal/renter/documents"],
    queryFn: () => portalFetch("/api/portal/renter/documents"),
    enabled: activeTab === "documents",
  });

  const { data: maintenance } = useQuery({
    queryKey: ["/api/portal/renter/maintenance"],
    queryFn: () => portalFetch("/api/portal/renter/maintenance"),
    enabled: activeTab === "maintenance",
  });

  const { data: boletoData } = useQuery({
    queryKey: ["/api/portal/renter/payments", selectedPaymentId, "boleto"],
    queryFn: () => portalFetch(`/api/portal/renter/payments/${selectedPaymentId}/boleto`),
    enabled: !!selectedPaymentId && boletoDialogOpen,
  });

  const createTicketMutation = useMutation({
    mutationFn: (data: any) => portalFetch("/api/portal/renter/maintenance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/renter/maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/renter/dashboard"] });
      setNewTicketOpen(false);
      setTicketForm({ title: "", description: "", category: "general", priority: "medium" });
      toast.success("Chamado aberto com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao abrir chamado. Tente novamente.");
    },
  });

  const requestCopyMutation = useMutation({
    mutationFn: (paymentId: string) => portalFetch(`/api/portal/renter/payments/${paymentId}/request-copy`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
    onSuccess: () => {
      toast.success("2a via solicitada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao solicitar 2a via.");
    },
  });

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_user");
    localStorage.removeItem("portal_tenant");
    setLocation("/portal/login");
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "outline" },
      paid: { label: "Pago", variant: "default" },
      overdue: { label: "Vencido", variant: "destructive" },
      active: { label: "Ativo", variant: "default" },
      open: { label: "Aberto", variant: "destructive" },
      in_progress: { label: "Em Andamento", variant: "outline" },
      waiting_approval: { label: "Aguardando", variant: "outline" },
      completed: { label: "Concluído", variant: "default" },
      cancelled: { label: "Cancelado", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const categoryLabel: Record<string, string> = {
    plumbing: "Hidráulica",
    electrical: "Elétrica",
    structural: "Estrutural",
    appliance: "Eletrodoméstico",
    general: "Geral",
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
                <p className="text-xs text-muted-foreground">Portal do Inquilino</p>
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
              <Home className="h-4 w-4" /> Início
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5">
              <DollarSign className="h-4 w-4" /> Pagamentos
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-1.5">
              <FileText className="h-4 w-4" /> Contrato
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1.5">
              <Wrench className="h-4 w-4" /> Manutenção
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5">
              <FileText className="h-4 w-4" /> Documentos
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <div className="space-y-6">
              {/* Next Payment Card */}
              {dashboard?.nextPayment && (
                <Card className="border-l-4" style={{ borderLeftColor: dashboard.nextPayment.status === "overdue" ? "#ef4444" : primaryColor }}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Próximo Pagamento</p>
                        <p className="text-2xl font-bold">{formatCurrency(dashboard.nextPayment.totalValue)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            Vencimento: {new Date(dashboard.nextPayment.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                          {statusBadge(dashboard.nextPayment.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Referência: {dashboard.nextPayment.referenceMonth}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedPaymentId(dashboard.nextPayment.id);
                          setBoletoDialogOpen(true);
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" /> Dados para Pagamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard?.totalContracts || 0}</p>
                        <p className="text-xs text-muted-foreground">Contratos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Wrench className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard?.openTickets || 0}</p>
                        <p className="text-xs text-muted-foreground">Chamados Abertos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{dashboard?.contract?.status === "active" ? "Ativo" : "N/A"}</p>
                        <p className="text-xs text-muted-foreground">Status do Contrato</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Property Info */}
              {dashboard?.property && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Meu Imóvel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-40 h-28 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                        {dashboard.property.images ? (
                          <img
                            src={typeof dashboard.property.images === "string" ? JSON.parse(dashboard.property.images)[0] : dashboard.property.images[0]}
                            alt={dashboard.property.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Home className="h-10 w-10 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{dashboard.property.title}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {dashboard.property.address}, {dashboard.property.city}
                        </p>
                        {dashboard.contract && (
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Aluguel</span>
                              <p className="font-semibold">{formatCurrency(dashboard.contract.rentValue)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Dia de Vencimento</span>
                              <p className="font-semibold">Dia {dashboard.contract.dueDay}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contact Card */}
              {tenant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contato da Imobiliária</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      {tenant.phone && (
                        <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Phone className="h-4 w-4" /> {tenant.phone}
                        </a>
                      )}
                      {tenant.email && (
                        <a href={`mailto:${tenant.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <Mail className="h-4 w-4" /> {tenant.email}
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Payments */}
          <TabsContent value="payments">
            {!payments || payments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum pagamento registrado</p>
                  <p className="text-sm">Seus pagamentos aparecerão aqui.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {payments.map((payment: any) => (
                  <Card key={payment.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {payment.referenceMonth}
                            </span>
                            {statusBadge(payment.status)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {payment.propertyTitle || payment.propertyAddress}
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Valor</span>
                              <p className="font-semibold">{formatCurrency(payment.totalValue)}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vencimento</span>
                              <p className="font-semibold">{new Date(payment.dueDate).toLocaleDateString("pt-BR")}</p>
                            </div>
                            {payment.paidDate && (
                              <div>
                                <span className="text-muted-foreground">Pago em</span>
                                <p className="font-semibold">{new Date(payment.paidDate).toLocaleDateString("pt-BR")}</p>
                              </div>
                            )}
                            {payment.paidValue && (
                              <div>
                                <span className="text-muted-foreground">Valor Pago</span>
                                <p className="font-semibold">{formatCurrency(payment.paidValue)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {(payment.status === "pending" || payment.status === "overdue") && (
                          <div className="flex gap-2 self-start flex-shrink-0">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPaymentId(payment.id);
                                setBoletoDialogOpen(true);
                              }}
                            >
                              <CreditCard className="h-3 w-3 mr-1" /> Pagar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => requestCopyMutation.mutate(payment.id)}
                              disabled={requestCopyMutation.isPending}
                            >
                              <Copy className="h-3 w-3 mr-1" /> 2a Via
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

          {/* Contract */}
          <TabsContent value="contract">
            {!contract ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum contrato ativo</p>
                  <p className="text-sm">Seus dados contratuais aparecerão aqui.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detalhes do Contrato</CardTitle>
                    <CardDescription>
                      Contrato de Locação Residencial
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="mt-1">{statusBadge(contract.status)}</div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Aluguel Mensal</p>
                        <p className="font-bold text-lg">{formatCurrency(contract.rentValue)}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Dia de Vencimento</p>
                        <p className="font-bold text-lg">Dia {contract.dueDay}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Início</p>
                        <p className="font-semibold">{new Date(contract.startDate).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Término</p>
                        <p className="font-semibold">{new Date(contract.endDate).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Índice de Reajuste</p>
                        <p className="font-semibold">{contract.adjustmentIndex || "IGPM"}</p>
                      </div>
                      {contract.condoFee && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Condomínio</p>
                          <p className="font-semibold">{formatCurrency(contract.condoFee)}</p>
                        </div>
                      )}
                      {contract.iptuValue && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-muted-foreground">IPTU</p>
                          <p className="font-semibold">{formatCurrency(contract.iptuValue)}</p>
                        </div>
                      )}
                      {contract.depositValue && (
                        <div className="p-3 bg-slate-50 rounded-lg">
                          <p className="text-xs text-muted-foreground">Caução</p>
                          <p className="font-semibold">{formatCurrency(contract.depositValue)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {contract.property && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Imóvel Locado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-40 h-28 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0">
                          {contract.property.images ? (
                            <img
                              src={typeof contract.property.images === "string" ? JSON.parse(contract.property.images)[0] : contract.property.images[0]}
                              alt={contract.property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="h-10 w-10 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{contract.property.title}</h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {contract.property.address}, {contract.property.city} - {contract.property.state}
                          </p>
                          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                            {contract.property.bedrooms && (
                              <div>
                                <span className="text-muted-foreground">Quartos</span>
                                <p className="font-semibold">{contract.property.bedrooms}</p>
                              </div>
                            )}
                            {contract.property.bathrooms && (
                              <div>
                                <span className="text-muted-foreground">Banheiros</span>
                                <p className="font-semibold">{contract.property.bathrooms}</p>
                              </div>
                            )}
                            {contract.property.area && (
                              <div>
                                <span className="text-muted-foreground">Área</span>
                                <p className="font-semibold">{contract.property.area} m²</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Maintenance */}
          <TabsContent value="maintenance">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Manutenção</h2>
              <Button onClick={() => setNewTicketOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Abrir Chamado
              </Button>
            </div>

            {!maintenance || maintenance.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum chamado registrado</p>
                  <p className="text-sm">Abra um chamado para solicitar manutenção no imóvel.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {maintenance.map((ticket: any) => {
                  const notes = ticket.notes ? JSON.parse(ticket.notes) : [];
                  return (
                    <Card key={ticket.id}>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{ticket.title}</span>
                                {statusBadge(ticket.status)}
                                <Badge variant="outline" className="text-xs">
                                  {categoryLabel[ticket.category] || ticket.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{ticket.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {ticket.propertyTitle || ticket.propertyAddress}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                            </span>
                          </div>

                          {ticket.estimatedCost && (
                            <p className="text-xs">Custo estimado: <span className="font-semibold">{formatCurrency(ticket.estimatedCost)}</span></p>
                          )}

                          {/* Notes timeline */}
                          {notes.length > 0 && (
                            <div className="border-t pt-3 mt-3">
                              <p className="text-xs font-semibold mb-2">Histórico</p>
                              <div className="space-y-2">
                                {notes.map((note: any, i: number) => (
                                  <div key={i} className="flex gap-2 text-xs">
                                    <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                                    <div>
                                      <span className="font-medium">{note.author}</span>
                                      <span className="text-muted-foreground"> - {new Date(note.date).toLocaleDateString("pt-BR")}</span>
                                      <p className="text-muted-foreground">{note.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents">
            {!documents || documents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhum documento disponível</p>
                  <p className="text-sm">Seus documentos aparecerão aqui.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((doc: any) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        {statusBadge(doc.status)}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* New Ticket Dialog */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Chamado de Manutenção</DialogTitle>
            <DialogDescription>
              Descreva o problema encontrado no imóvel.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createTicketMutation.mutate(ticketForm);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                placeholder="Ex: Vazamento na pia da cozinha"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={ticketForm.category}
                onValueChange={(v) => setTicketForm({ ...ticketForm, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="plumbing">Hidráulica</SelectItem>
                  <SelectItem value="electrical">Elétrica</SelectItem>
                  <SelectItem value="structural">Estrutural</SelectItem>
                  <SelectItem value="appliance">Eletrodoméstico</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={ticketForm.priority}
                onValueChange={(v) => setTicketForm({ ...ticketForm, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Descreva o problema com detalhes..."
                rows={4}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewTicketOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createTicketMutation.isPending}>
                {createTicketMutation.isPending ? "Enviando..." : "Abrir Chamado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Boleto/PIX Dialog */}
      <Dialog open={boletoDialogOpen} onOpenChange={(open) => {
        setBoletoDialogOpen(open);
        if (!open) setSelectedPaymentId(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dados para Pagamento</DialogTitle>
            <DialogDescription>
              Utilize as informações abaixo para realizar o pagamento.
            </DialogDescription>
          </DialogHeader>
          {boletoData ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 mb-1">Valor</p>
                <p className="text-2xl font-bold text-blue-800">
                  {formatCurrency(boletoData.payment.totalValue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vencimento: {new Date(boletoData.payment.dueDate).toLocaleDateString("pt-BR")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Ref: {boletoData.payment.referenceMonth}
                </p>
              </div>

              {boletoData.paymentInfo.pixKey && (
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 mb-2 font-semibold">PIX</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-sm bg-white px-3 py-2 rounded border break-all">
                      {boletoData.paymentInfo.pixKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(boletoData.paymentInfo.pixKey);
                        toast.success("Chave PIX copiada!");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}

              {boletoData.paymentInfo.bankName && (
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Transferência Bancária</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Banco</span>
                      <p className="font-semibold">{boletoData.paymentInfo.bankName}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Agência</span>
                      <p className="font-semibold">{boletoData.paymentInfo.bankAgency}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Conta</span>
                      <p className="font-semibold">{boletoData.paymentInfo.bankAccount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Beneficiário</span>
                      <p className="font-semibold">{boletoData.paymentInfo.beneficiary}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
