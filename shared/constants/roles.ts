/**
 * Roles canônicas do ImobiBase.
 *
 * Fonte única de verdade para os valores de `users.role` (texto livre no
 * schema). Antes desta constante havia divergência entre o bootstrap/seed,
 * que gravavam `super_admin`, e as checagens de gate em routes.ts, que
 * testavam `superadmin` — o super admin criado NÃO conseguia acessar as
 * rotas admin. Toda checagem de role deve usar este enum.
 */
export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  OWNER: "owner",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Conjunto de roles com acesso administrativo total (bypass de permissões
 * granulares). super_admin opera cross-tenant; admin é admin do tenant.
 */
export const ADMIN_ROLES: ReadonlySet<string> = new Set<string>([
  ROLES.SUPER_ADMIN,
  ROLES.ADMIN,
]);

export function isAdminRole(role: string | null | undefined): boolean {
  return role != null && ADMIN_ROLES.has(role);
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return role === ROLES.SUPER_ADMIN;
}
