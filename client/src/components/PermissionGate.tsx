/**
 * PERMISSION GATE COMPONENT
 * Componente para controle de acesso baseado em permissões
 */

import { ReactNode } from 'react';
import { usePermissions } from '@/lib/permissions';

interface PermissionGateProps {
  /**
   * Permissão única no formato 'module.action'
   * Exemplo: 'properties.create'
   */
  permission?: string;

  /**
   * Módulo da permissão (alternativa ao formato 'module.action')
   */
  module?: string;

  /**
   * Ação da permissão (alternativa ao formato 'module.action')
   */
  action?: string;

  /**
   * Array de permissões - requer que o usuário tenha TODAS
   */
  allPermissions?: string[];

  /**
   * Array de permissões - requer que o usuário tenha PELO MENOS UMA
   */
  anyPermissions?: string[];

  /**
   * Conteúdo a ser renderizado se o usuário tiver permissão
   */
  children: ReactNode;

  /**
   * Conteúdo a ser renderizado se o usuário NÃO tiver permissão
   */
  fallback?: ReactNode;

  /**
   * Se true, renderiza null durante carregamento. Se false, renderiza children.
   */
  showLoadingAsNull?: boolean;
}

/**
 * PermissionGate - Controla renderização baseado em permissões
 *
 * @example
 * // Usando formato 'module.action'
 * <PermissionGate permission="properties.create">
 *   <Button>Novo Imóvel</Button>
 * </PermissionGate>
 *
 * @example
 * // Usando module e action separados
 * <PermissionGate module="leads" action="edit">
 *   <Button>Editar Lead</Button>
 * </PermissionGate>
 *
 * @example
 * // Requer todas as permissões
 * <PermissionGate allPermissions={['financial.view', 'financial.viewValues']}>
 *   <FinancialChart />
 * </PermissionGate>
 *
 * @example
 * // Requer pelo menos uma permissão
 * <PermissionGate anyPermissions={['properties.edit', 'properties.delete']}>
 *   <ActionsMenu />
 * </PermissionGate>
 *
 * @example
 * // Com fallback
 * <PermissionGate
 *   permission="financial.viewValues"
 *   fallback={<p>Você não tem permissão para ver valores</p>}
 * >
 *   <MoneyDisplay value={1000} />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  module,
  action,
  allPermissions,
  anyPermissions,
  children,
  fallback = null,
  showLoadingAsNull = true,
}: PermissionGateProps) {
  const { can, hasPermission, hasAllPermissions, hasAnyPermission, loading } = usePermissions();

  // Durante carregamento
  if (loading) {
    return showLoadingAsNull ? null : <>{children}</>;
  }

  let hasAccess = false;

  // Verifica permissão usando formato 'module.action'
  if (permission) {
    hasAccess = can(permission);
  }
  // Verifica usando module e action separados
  else if (module && action) {
    hasAccess = hasPermission(module, action);
  }
  // Verifica se tem todas as permissões
  else if (allPermissions && allPermissions.length > 0) {
    hasAccess = hasAllPermissions(allPermissions);
  }
  // Verifica se tem pelo menos uma permissão
  else if (anyPermissions && anyPermissions.length > 0) {
    hasAccess = hasAnyPermission(anyPermissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * PermissionGuard - Wrapper para rotas protegidas
 * Redireciona ou mostra mensagem se não tiver permissão
 */
interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  unauthorizedMessage?: string;
}

export function PermissionGuard({
  permission,
  children,
  unauthorizedMessage = "Você não tem permissão para acessar esta página."
}: PermissionGuardProps) {
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!can(permission)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Acesso Negado</h3>
          <p className="mt-1 text-sm text-gray-500">{unauthorizedMessage}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
