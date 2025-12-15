/**
 * PERMISSION MANAGEMENT SYSTEM
 * Sistema completo de gerenciamento de permissões baseado em roles
 */

import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "./queryClient";

// Interface de permissões que corresponde ao schema
export interface RolePermissions {
  properties: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  leads: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  calendar: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  contracts: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  sales: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  rentals: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  financial: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewValues: boolean;
  };
  reports: {
    view: boolean;
    export: boolean;
  };
  settings: {
    view: boolean;
    edit: boolean;
    manageUsers: boolean;
  };
}

// Roles padrão do sistema
export const DEFAULT_ROLES: Record<string, RolePermissions> = {
  Administrador: {
    properties: { view: true, create: true, edit: true, delete: true },
    leads: { view: true, create: true, edit: true, delete: true },
    calendar: { view: true, create: true, edit: true, delete: true },
    contracts: { view: true, create: true, edit: true, delete: true },
    sales: { view: true, create: true, edit: true, delete: true },
    rentals: { view: true, create: true, edit: true, delete: true },
    financial: { view: true, create: true, edit: true, delete: true, viewValues: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: true, manageUsers: true },
  },
  Gestor: {
    properties: { view: true, create: true, edit: true, delete: true },
    leads: { view: true, create: true, edit: true, delete: true },
    calendar: { view: true, create: true, edit: true, delete: true },
    contracts: { view: true, create: true, edit: true, delete: false },
    sales: { view: true, create: true, edit: true, delete: false },
    rentals: { view: true, create: true, edit: true, delete: false },
    financial: { view: true, create: true, edit: true, delete: false, viewValues: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: false, manageUsers: false },
  },
  Corretor: {
    properties: { view: true, create: true, edit: true, delete: false },
    leads: { view: true, create: true, edit: true, delete: false },
    calendar: { view: true, create: true, edit: true, delete: false },
    contracts: { view: true, create: false, edit: false, delete: false },
    sales: { view: true, create: true, edit: true, delete: false },
    rentals: { view: true, create: false, edit: false, delete: false },
    financial: { view: false, create: false, edit: false, delete: false, viewValues: false },
    reports: { view: true, export: false },
    settings: { view: false, edit: false, manageUsers: false },
  },
  Financeiro: {
    properties: { view: true, create: false, edit: false, delete: false },
    leads: { view: true, create: false, edit: false, delete: false },
    calendar: { view: true, create: false, edit: false, delete: false },
    contracts: { view: true, create: false, edit: false, delete: false },
    sales: { view: true, create: false, edit: false, delete: false },
    rentals: { view: true, create: false, edit: true, delete: false },
    financial: { view: true, create: true, edit: true, delete: true, viewValues: true },
    reports: { view: true, export: true },
    settings: { view: false, edit: false, manageUsers: false },
  },
};

// Interface para user com roleId
interface UserWithRole {
  id: string;
  roleId?: string;
  role: string;
}

// Interface para role data
interface RoleData {
  id: string;
  name: string;
  permissions: RolePermissions;
}

// Hook para buscar permissões do usuário
export function usePermissions() {
  const { data: meData, isLoading } = useQuery<{ user: UserWithRole } | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: roleData } = useQuery<RoleData | null>({
    queryKey: meData?.user?.roleId ? [`/api/user-roles/${meData.user.roleId}`] : ["skip-role-query"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!meData?.user?.roleId,
    retry: false,
  });

  // Determina as permissões do usuário
  const permissions: Partial<RolePermissions> = (roleData?.permissions as RolePermissions) || {};

  /**
   * Verifica se o usuário tem uma permissão específica
   * @param module - Módulo (ex: 'properties', 'leads')
   * @param action - Ação (ex: 'view', 'create', 'edit', 'delete')
   */
  const hasPermission = (module: string, action: string): boolean => {
    if (!permissions || typeof permissions !== 'object') return false;
    const modulePerms = permissions[module as keyof RolePermissions];
    if (!modulePerms || typeof modulePerms !== 'object') return false;
    return (modulePerms as any)[action] === true;
  };

  /**
   * Verifica permissão usando formato 'module.action'
   * @param permission - String no formato 'module.action' (ex: 'properties.create')
   */
  const can = (permission: string): boolean => {
    const [module, action] = permission.split('.');
    return hasPermission(module, action);
  };

  /**
   * Verifica se o usuário é administrador
   */
  const isAdmin = (): boolean => {
    return meData?.user?.role === 'admin' || can('settings.manageUsers');
  };

  /**
   * Verifica se possui todas as permissões especificadas
   */
  const hasAllPermissions = (perms: string[]): boolean => {
    return perms.every(p => can(p));
  };

  /**
   * Verifica se possui ao menos uma das permissões especificadas
   */
  const hasAnyPermission = (perms: string[]): boolean => {
    return perms.some(p => can(p));
  };

  return {
    permissions,
    hasPermission,
    can,
    isAdmin,
    hasAllPermissions,
    hasAnyPermission,
    loading: isLoading,
  };
}

/**
 * Hook simplificado para verificar uma permissão específica
 */
export function useHasPermission(module: string, action: string): boolean {
  const { hasPermission } = usePermissions();
  return hasPermission(module, action);
}

/**
 * Hook para verificar permissão no formato 'module.action'
 */
export function useCan(permission: string): boolean {
  const { can } = usePermissions();
  return can(permission);
}
