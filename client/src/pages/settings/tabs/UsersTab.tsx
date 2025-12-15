import { useState } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  Edit,
  Trash2,
  Loader2,
  MoreVertical,
  Mail,
  Power,
  PowerOff,
  Clock,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "../types";

interface UsersTabProps {
  users: User[];
  onRefresh: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  broker: "Corretor",
  financial: "Financeiro",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary text-primary-foreground",
  manager: "bg-blue-500 text-white",
  broker: "bg-green-500 text-white",
  financial: "bg-purple-500 text-white",
};

const STATUS_CONFIG = {
  active: {
    label: "Ativo",
    icon: UserCheck,
    className: "text-green-600 bg-green-50 border-green-200",
  },
  inactive: {
    label: "Inativo",
    icon: UserX,
    className: "text-gray-600 bg-gray-50 border-gray-200",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "text-orange-600 bg-orange-50 border-orange-200",
  },
};

export function UsersTab({ users, onRefresh }: UsersTabProps) {
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    role: "broker",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    status: "active" as "active" | "inactive" | "pending",
  });

  // Summary stats
  const activeUsers = users.filter((u) => u.status === "active" || !u.status).length;
  const inactiveUsers = users.filter((u) => u.status === "inactive").length;
  const pendingUsers = users.filter((u) => u.status === "pending").length;

  const handleInviteUser = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(inviteForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao convidar usuário");
      }

      toast({
        title: "Convite enviado",
        description: "O convite foi enviado por e-mail com sucesso.",
      });

      setInviteDialogOpen(false);
      setInviteForm({ name: "", email: "", role: "broker" });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o convite.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao editar usuário");
      }

      toast({
        title: "Usuário atualizado",
        description: "Os dados do usuário foram atualizados com sucesso.",
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível atualizar o usuário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao remover usuário");
      }

      toast({
        title: "Usuário removido",
        description: "O usuário foi removido do sistema com sucesso.",
      });

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível remover o usuário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "active" || !user.status ? "inactive" : "active";
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao alterar status");
      }

      toast({
        title: newStatus === "active" ? "Usuário ativado" : "Usuário desativado",
        description: `${user.name} foi ${newStatus === "active" ? "ativado" : "desativado"} com sucesso.`,
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível alterar o status.",
        variant: "destructive",
      });
    }
  };

  const handleResendInvite = async (user: User) => {
    try {
      const response = await fetch(`/api/users/${user.id}/resend-invite`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao reenviar convite");
      }

      toast({
        title: "Convite reenviado",
        description: `Um novo convite foi enviado para ${user.email}.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível reenviar o convite.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status || "active",
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastLogin = (date?: string) => {
    if (!date) return "Nunca";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Hoje";
    if (days === 1) return "Ontem";
    if (days < 7) return `${days} dias atrás`;
    if (days < 30) return `${Math.floor(days / 7)} semanas atrás`;
    return d.toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600 hidden sm:block">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{activeUsers}</p>
                <p className="text-xs text-muted-foreground">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-orange-100 text-orange-600 hidden sm:block">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{pendingUsers}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600 hidden sm:block">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold">{inactiveUsers}</p>
                <p className="text-xs text-muted-foreground">Inativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <SettingsCard
        title="Usuários do Sistema"
        description="Gerencie os usuários que têm acesso ao sistema."
        showSaveButton={false}
        footerContent={
          <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Convidar Usuário</span>
            <span className="sm:hidden">Convidar</span>
          </Button>
        }
      >
        {users.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setInviteDialogOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Convidar primeiro usuário
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user) => {
              const status = user.status || "active";
              const statusConfig = STATUS_CONFIG[status];
              const StatusIcon = statusConfig.icon;

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{user.name}</span>
                      <Badge
                        className={ROLE_COLORS[user.role] || "bg-gray-500 text-white"}
                      >
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="truncate hidden sm:inline">{user.email}</span>
                      <span className="hidden md:flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLastLogin(user.lastLogin)}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={`shrink-0 gap-1 ${statusConfig.className}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span className="hidden sm:inline">{statusConfig.label}</span>
                  </Badge>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="shrink-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(user)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {status === "pending" && (
                        <DropdownMenuItem onClick={() => handleResendInvite(user)}>
                          <Mail className="w-4 h-4 mr-2" />
                          Reenviar Convite
                        </DropdownMenuItem>
                      )}
                      {status !== "pending" && (
                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                          {status === "active" ? (
                            <>
                              <PowerOff className="w-4 h-4 mr-2" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Power className="w-4 h-4 mr-2" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDeleteDialog(user)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </SettingsCard>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>
              Envie um convite por e-mail para adicionar um novo usuário ao sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nome Completo</Label>
              <Input
                id="invite-name"
                value={inviteForm.name}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, name: e.target.value })
                }
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                placeholder="joao@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Cargo</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) =>
                  setInviteForm({ ...inviteForm, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setInviteDialogOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleInviteUser} disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-role">Cargo</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value: "active" | "inactive" | "pending") =>
                    setEditForm({ ...editForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={loading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleEditUser} disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O usuário{" "}
              <strong>{selectedUser?.name}</strong> será removido permanentemente do
              sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
