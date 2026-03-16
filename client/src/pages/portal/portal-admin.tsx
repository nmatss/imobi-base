import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Users, Plus, Shield, ShieldOff, Key, Trash2, Wrench,
  User, Home as HomeIcon, Clock, CheckCircle, AlertTriangle,
  Search, Filter
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
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useImobi } from "@/lib/imobi-context";

export default function PortalAdmin() {
  const { user } = useImobi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("access");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("all");
  const [updateTicketDialogOpen, setUpdateTicketDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketNotes, setTicketNotes] = useState("");
  const [ticketStatus, setTicketStatus] = useState("");

  const [newAccessForm, setNewAccessForm] = useState({
    clientType: "owner",
    clientId: "",
    email: "",
    password: "",
  });

  // Queries
  const { data: accesses, isLoading: accessesLoading } = useQuery({
    queryKey: ["/api/portal/admin/access"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/admin/access");
      return res.json();
    },
  });

  const { data: maintenance, isLoading: maintenanceLoading } = useQuery({
    queryKey: ["/api/portal/admin/maintenance"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/portal/admin/maintenance");
      return res.json();
    },
    enabled: activeTab === "maintenance",
  });

  const { data: owners } = useQuery({
    queryKey: ["/api/owners"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/owners");
      return res.json();
    },
  });

  const { data: renters } = useQuery({
    queryKey: ["/api/renters"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/renters");
      return res.json();
    },
  });

  // Mutations
  const createAccessMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/portal/admin/access", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/access"] });
      setCreateDialogOpen(false);
      setNewAccessForm({ clientType: "owner", clientId: "", email: "", password: "" });
      if (data.temporaryPassword) {
        toast.success(`Acesso criado! Senha temporária: ${data.temporaryPassword}`);
      } else {
        toast.success("Acesso criado com sucesso!");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao criar acesso");
    },
  });

  const toggleAccessMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/access/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/access"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const deleteAccessMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/portal/admin/access/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/access"] });
      setDeleteDialogOpen(false);
      setSelectedAccess(null);
      toast.success("Acesso removido!");
    },
    onError: () => {
      toast.error("Erro ao remover acesso");
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/portal/admin/access/${id}/reset-password`, {});
      return res.json();
    },
    onSuccess: (data) => {
      setResetPasswordDialogOpen(false);
      setSelectedAccess(null);
      if (data.temporaryPassword) {
        toast.success(`Nova senha: ${data.temporaryPassword}`);
      } else {
        toast.success("Senha redefinida!");
      }
    },
    onError: () => {
      toast.error("Erro ao redefinir senha");
    },
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/portal/admin/maintenance/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portal/admin/maintenance"] });
      setUpdateTicketDialogOpen(false);
      setSelectedTicket(null);
      setTicketNotes("");
      setTicketStatus("");
      toast.success("Chamado atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar chamado");
    },
  });

  const filteredAccesses = accesses?.filter((a: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.email?.toLowerCase().includes(q) ||
      a.clientName?.toLowerCase().includes(q) ||
      a.clientType?.toLowerCase().includes(q)
    );
  });

  const filteredMaintenance = maintenance?.filter((t: any) => {
    if (ticketStatusFilter === "all") return true;
    return t.status === ticketStatusFilter;
  });

  const clientTypeLabel = (type: string) => {
    return type === "owner" ? "Proprietário" : type === "renter" ? "Inquilino" : type;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      open: { label: "Aberto", variant: "destructive" },
      in_progress: { label: "Em Andamento", variant: "outline" },
      waiting_approval: { label: "Aguardando", variant: "outline" },
      completed: { label: "Concluído", variant: "default" },
      cancelled: { label: "Cancelado", variant: "secondary" },
    };
    const s = map[status] || { label: status, variant: "secondary" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const priorityBadge = (priority: string) => {
    const map: Record<string, { label: string; color: string }> = {
      low: { label: "Baixa", color: "bg-green-100 text-green-700" },
      medium: { label: "Média", color: "bg-yellow-100 text-yellow-700" },
      high: { label: "Alta", color: "bg-orange-100 text-orange-700" },
      urgent: { label: "Urgente", color: "bg-red-100 text-red-700" },
    };
    const p = map[priority] || { label: priority, color: "bg-gray-100 text-gray-700" };
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>{p.label}</span>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  };

  const clientOptions = newAccessForm.clientType === "owner" ? (owners || []) : (renters || []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portal Self-Service</h1>
          <p className="text-muted-foreground">Gerencie acessos de proprietários e inquilinos ao portal</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="access" className="gap-1.5">
            <Users className="h-4 w-4" /> Acessos ({accesses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="maintenance" className="gap-1.5">
            <Wrench className="h-4 w-4" /> Manutenção ({maintenance?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Access Management */}
        <TabsContent value="access" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Convidar Usuário
            </Button>
          </div>

          {accessesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" />
            </div>
          ) : !filteredAccesses || filteredAccesses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum acesso cadastrado</p>
                <p className="text-sm mb-4">Convide proprietários e inquilinos para o portal.</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Convidar Usuário
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAccesses.map((access: any) => (
                <Card key={access.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          access.clientType === "owner" ? "bg-blue-100" : "bg-green-100"
                        }`}>
                          <User className={`h-5 w-5 ${
                            access.clientType === "owner" ? "text-blue-600" : "text-green-600"
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{access.clientName || "Sem nome"}</p>
                            <Badge variant="outline" className="text-xs">
                              {clientTypeLabel(access.clientType)}
                            </Badge>
                            {access.isActive ? (
                              <Badge variant="default" className="text-xs">Ativo</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Inativo</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{access.email}</p>
                          {access.lastLogin && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              Último acesso: {new Date(access.lastLogin).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 self-start flex-shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAccessMutation.mutate({
                            id: access.id,
                            isActive: !access.isActive,
                          })}
                          title={access.isActive ? "Desativar" : "Ativar"}
                        >
                          {access.isActive ? (
                            <ShieldOff className="h-3 w-3" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAccess(access);
                            setResetPasswordDialogOpen(true);
                          }}
                          title="Redefinir senha"
                        >
                          <Key className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setSelectedAccess(access);
                            setDeleteDialogOpen(true);
                          }}
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Maintenance Management */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="flex gap-3">
            <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="waiting_approval">Aguardando</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {maintenanceLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full" />
            </div>
          ) : !filteredMaintenance || filteredMaintenance.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                <Wrench className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum chamado de manutenção</p>
                <p className="text-sm">Chamados abertos pelo portal aparecerão aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredMaintenance.map((ticket: any) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{ticket.title}</span>
                          {statusBadge(ticket.status)}
                          {priorityBadge(ticket.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground">{ticket.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <HomeIcon className="h-3 w-3" />
                            {ticket.propertyTitle || ticket.propertyAddress}
                          </span>
                          <span>
                            Aberto em {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                        {ticket.estimatedCost && (
                          <p className="text-xs">
                            Custo estimado: <span className="font-semibold">{formatCurrency(ticket.estimatedCost)}</span>
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setTicketStatus(ticket.status);
                          setUpdateTicketDialogOpen(true);
                        }}
                      >
                        Gerenciar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Access Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar para o Portal</DialogTitle>
            <DialogDescription>
              Crie acesso ao portal para um proprietário ou inquilino.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createAccessMutation.mutate(newAccessForm);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newAccessForm.clientType}
                onValueChange={(v) => setNewAccessForm({ ...newAccessForm, clientType: v, clientId: "" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Proprietário</SelectItem>
                  <SelectItem value="renter">Inquilino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{newAccessForm.clientType === "owner" ? "Proprietário" : "Inquilino"}</Label>
              <Select
                value={newAccessForm.clientId}
                onValueChange={(v) => {
                  const client = clientOptions.find((c: any) => c.id === v);
                  setNewAccessForm({
                    ...newAccessForm,
                    clientId: v,
                    email: client?.email || newAccessForm.email,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Email de acesso</Label>
              <Input
                type="email"
                value={newAccessForm.email}
                onChange={(e) => setNewAccessForm({ ...newAccessForm, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Senha (opcional - será gerada automaticamente)</Label>
              <Input
                type="text"
                value={newAccessForm.password}
                onChange={(e) => setNewAccessForm({ ...newAccessForm, password: e.target.value })}
                placeholder="Deixe vazio para gerar automaticamente"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createAccessMutation.isPending}>
                {createAccessMutation.isPending ? "Criando..." : "Criar Acesso"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Acesso</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o acesso de{" "}
              <strong>{selectedAccess?.clientName || selectedAccess?.email}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => selectedAccess && deleteAccessMutation.mutate(selectedAccess.id)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation */}
      <AlertDialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Redefinir Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Uma nova senha será gerada para{" "}
              <strong>{selectedAccess?.clientName || selectedAccess?.email}</strong>.
              A senha será exibida apenas uma vez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedAccess && resetPasswordMutation.mutate(selectedAccess.id)}
            >
              Redefinir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Ticket Dialog */}
      <Dialog open={updateTicketDialogOpen} onOpenChange={setUpdateTicketDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Chamado</DialogTitle>
            <DialogDescription>
              {selectedTicket?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={ticketStatus} onValueChange={setTicketStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="waiting_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                value={ticketNotes}
                onChange={(e) => setTicketNotes(e.target.value)}
                placeholder="Adicionar observação..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateTicketDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedTicket) {
                  updateTicketMutation.mutate({
                    id: selectedTicket.id,
                    data: {
                      status: ticketStatus,
                      notes: ticketNotes || undefined,
                    },
                  });
                }
              }}
              disabled={updateTicketMutation.isPending}
            >
              {updateTicketMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
