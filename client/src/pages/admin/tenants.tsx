import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Edit, Trash2, Play, Pause, Eye } from "lucide-react";
import { toast } from "sonner";

type TenantWithStats = {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  plan: string;
  status: string;
  userCount: number;
  propertyCount: number;
  createdAt: string;
};

type Plan = {
  id: string;
  name: string;
  price: string;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<TenantWithStats[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<TenantWithStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithStats | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    planId: "",
    status: "trial",
    maxUsers: 5,
    maxProperties: 100,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterTenants();
  }, [searchTerm, statusFilter, planFilter, tenants]);

  async function fetchData() {
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        fetch("/api/admin/tenants", { credentials: "include" }),
        fetch("/api/admin/plans", { credentials: "include" }),
      ]);

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  function filterTenants() {
    let filtered = tenants;

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    if (planFilter !== "all") {
      filtered = filtered.filter((t) => t.plan === planFilter);
    }

    setFilteredTenants(filtered);
  }

  async function handleCreate() {
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Tenant criado com sucesso!");
        setCreateModalOpen(false);
        resetForm();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao criar tenant");
      }
    } catch (error) {
      toast.error("Erro ao criar tenant");
    }
  }

  async function handleUpdate() {
    if (!selectedTenant) return;

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Tenant atualizado com sucesso!");
        setEditModalOpen(false);
        setSelectedTenant(null);
        resetForm();
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao atualizar tenant");
      }
    } catch (error) {
      toast.error("Erro ao atualizar tenant");
    }
  }

  async function handleDelete() {
    if (!selectedTenant) return;

    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Tenant excluído com sucesso!");
        setDeleteDialogOpen(false);
        setSelectedTenant(null);
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.error || "Erro ao excluir tenant");
      }
    } catch (error) {
      toast.error("Erro ao excluir tenant");
    }
  }

  async function handleToggleStatus(tenant: TenantWithStats) {
    const newStatus = tenant.status === "active" ? "suspended" : "active";

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(
          newStatus === "active" ? "Tenant ativado!" : "Tenant suspenso!"
        );
        fetchData();
      } else {
        toast.error("Erro ao alterar status");
      }
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  }

  function openEditModal(tenant: TenantWithStats) {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email || "",
      phone: tenant.phone || "",
      planId: plans.find((p) => p.name === tenant.plan)?.id || "",
      status: tenant.status,
      maxUsers: 5,
      maxProperties: 100,
    });
    setEditModalOpen(true);
  }

  function openDeleteDialog(tenant: TenantWithStats) {
    setSelectedTenant(tenant);
    setDeleteDialogOpen(true);
  }

  function resetForm() {
    setFormData({
      name: "",
      slug: "",
      email: "",
      phone: "",
      planId: "",
      status: "trial",
      maxUsers: 5,
      maxProperties: 100,
    });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "trial":
        return "secondary";
      case "suspended":
        return "destructive";
      case "cancelled":
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "trial":
        return "Trial";
      case "suspended":
        return "Suspenso";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold">Gerenciamento de Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os tenants da plataforma
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Tenant
        </Button>
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
                  placeholder="Nome, slug ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.name}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Tenants ({filteredTenants.length})</CardTitle>
          <CardDescription>
            Lista de todos os tenants cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="inline-block min-w-full align-middle">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Imóveis</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
            <TableBody>
              {filteredTenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum tenant encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="text-muted-foreground">{tenant.slug}</TableCell>
                    <TableCell>{tenant.plan}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(tenant.status) as any}>
                        {getStatusLabel(tenant.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{tenant.userCount}</TableCell>
                    <TableCell>{tenant.propertyCount}</TableCell>
                    <TableCell>
                      {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(tenant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(tenant)}
                        >
                          {tenant.status === "active" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(tenant)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Criar Tenant */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Tenant</DialogTitle>
            <DialogDescription>
              Preencha os dados do novo tenant
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Imobiliária ABC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="imobiliaria-abc"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@imobiliaria.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 98888-8888"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan">Plano</Label>
                <Select
                  value={formData.planId}
                  onValueChange={(value) => setFormData({ ...formData, planId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {parseFloat(plan.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Criar Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Tenant */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Tenant</DialogTitle>
            <DialogDescription>
              Atualize os dados do tenant
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug">Slug</Label>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  disabled
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-plan">Plano</Label>
                <Select
                  value={formData.planId}
                  onValueChange={(value) => setFormData({ ...formData, planId: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - R$ {parseFloat(plan.price).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tenant "{selectedTenant?.name}"?
              Esta ação não pode ser desfeita e todos os dados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
