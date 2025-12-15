import { useState, useEffect } from "react";
import { SettingsCard } from "../components/SettingsCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Permission, UserRole } from "../types";

const PERMISSIONS: Permission[] = [
  {
    category: "Imóveis",
    permissions: [
      { label: "Ver imóveis", key: "properties_view" },
      { label: "Criar imóveis", key: "properties_create" },
      { label: "Editar imóveis", key: "properties_edit" },
      { label: "Excluir imóveis", key: "properties_delete" },
    ],
  },
  {
    category: "Leads",
    permissions: [
      { label: "Ver leads", key: "leads_view" },
      { label: "Criar leads", key: "leads_create" },
      { label: "Editar leads", key: "leads_edit" },
      { label: "Excluir leads", key: "leads_delete" },
    ],
  },
  {
    category: "Agenda",
    permissions: [
      { label: "Ver visitas", key: "visits_view" },
      { label: "Agendar visitas", key: "visits_create" },
      { label: "Editar visitas", key: "visits_edit" },
      { label: "Cancelar visitas", key: "visits_delete" },
    ],
  },
  {
    category: "Contratos",
    permissions: [
      { label: "Ver contratos", key: "contracts_view" },
      { label: "Criar contratos", key: "contracts_create" },
      { label: "Editar contratos", key: "contracts_edit" },
      { label: "Excluir contratos", key: "contracts_delete" },
    ],
  },
  {
    category: "Vendas",
    permissions: [
      { label: "Ver vendas", key: "sales_view" },
      { label: "Registrar venda", key: "sales_create" },
      { label: "Editar venda", key: "sales_edit" },
      { label: "Cancelar venda", key: "sales_delete" },
    ],
  },
  {
    category: "Aluguéis",
    permissions: [
      { label: "Ver aluguéis", key: "rentals_view" },
      { label: "Criar contrato", key: "rentals_create" },
      { label: "Editar contrato", key: "rentals_edit" },
      { label: "Gerenciar pagamentos", key: "rentals_payments" },
    ],
  },
  {
    category: "Financeiro",
    permissions: [
      { label: "Ver valores", key: "financial_view" },
      { label: "Criar lançamentos", key: "financial_create" },
      { label: "Editar lançamentos", key: "financial_edit" },
      { label: "Excluir lançamentos", key: "financial_delete" },
    ],
  },
  {
    category: "Relatórios",
    permissions: [
      { label: "Ver relatórios", key: "reports_view" },
      { label: "Exportar relatórios", key: "reports_export" },
      { label: "Criar relatórios personalizados", key: "reports_create" },
    ],
  },
  {
    category: "Configurações",
    permissions: [
      { label: "Acessar configurações", key: "settings_access" },
      { label: "Gerenciar usuários", key: "settings_users" },
      { label: "Alterar integrações", key: "settings_integrations" },
    ],
  },
];

export function PermissionsTab() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user-roles", {
        credentials: "include",
      });

      if (response.ok) {
        const data: UserRole[] = await response.json();
        setRoles(data);

        // Transform roles into permissions matrix
        const permissionsMatrix: Record<string, Record<string, boolean>> = {};
        data.forEach((role) => {
          permissionsMatrix[role.name] = role.permissions;
        });
        setPermissions(permissionsMatrix);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as permissões.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (roleName: string, permissionKey: string) => {
    setPermissions((prev) => ({
      ...prev,
      [roleName]: {
        ...prev[roleName],
        [permissionKey]: !prev[roleName]?.[permissionKey],
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update each role's permissions
      await Promise.all(
        roles.map(async (role) => {
          const updatedPermissions = permissions[role.name];
          if (updatedPermissions) {
            const response = await fetch(`/api/user-roles/${role.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ permissions: updatedPermissions }),
            });

            if (!response.ok) {
              throw new Error(`Erro ao atualizar permissões de ${role.name}`);
            }
          }
        })
      );

      toast({
        title: "Permissões salvas",
        description: "As permissões foram atualizadas com sucesso.",
      });
      await fetchRoles();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Não foi possível salvar as permissões.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <SettingsCard
          title="Matriz de Permissões"
          description="Defina o que cada cargo pode fazer no sistema."
          showSaveButton={false}
        >
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </SettingsCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SettingsCard
        title="Matriz de Permissões"
        description="Defina o que cada cargo pode fazer no sistema."
        onSave={handleSave}
        isSaving={isSaving}
      >
        {roles.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            Nenhuma função encontrada. As funções padrão serão criadas automaticamente.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto -mx-4 sm:-mx-6">
              <div className="inline-block min-w-full align-middle px-4 sm:px-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px] sticky left-0 bg-background z-10">Permissão</TableHead>
                      {roles.map((role) => (
                        <TableHead key={role.id} className="text-center min-w-[100px]">
                          <div className="font-semibold text-xs">{role.name}</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSIONS.map((category) => (
                      <>
                        <TableRow key={category.category} className="bg-muted/50">
                          <TableCell
                            colSpan={roles.length + 1}
                            className="font-semibold sticky left-0 bg-muted/50 z-10"
                          >
                            {category.category}
                          </TableCell>
                        </TableRow>
                        {category.permissions.map((permission) => (
                          <TableRow key={permission.key}>
                            <TableCell className="text-sm sticky left-0 bg-background z-10">
                              {permission.label}
                            </TableCell>
                            {roles.map((role) => (
                              <TableCell key={`${role.id}-${permission.key}`} className="text-center">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={permissions[role.name]?.[permission.key] || false}
                                    onCheckedChange={() =>
                                      handleTogglePermission(role.name, permission.key)
                                    }
                                    className="h-5 w-5"
                                  />
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-6">
              {PERMISSIONS.map((category) => (
                <div key={category.category} className="space-y-3">
                  <h3 className="font-semibold text-base text-primary">{category.category}</h3>
                  <div className="space-y-2">
                    {category.permissions.map((permission) => (
                      <div key={permission.key} className="border rounded-lg p-3 space-y-3">
                        <div className="font-medium text-sm">{permission.label}</div>
                        <div className="grid grid-cols-2 gap-3">
                          {roles.map((role) => (
                            <label
                              key={`${role.id}-${permission.key}`}
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Checkbox
                                checked={permissions[role.name]?.[permission.key] || false}
                                onCheckedChange={() =>
                                  handleTogglePermission(role.name, permission.key)
                                }
                                className="h-5 w-5"
                              />
                              <span className="text-sm text-muted-foreground">{role.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SettingsCard>
    </div>
  );
}
