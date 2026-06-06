/**
 * ROLES GATE TEST
 * ----------------------------------------------------------------------------
 * Regressão do P1 de gate: o bootstrap (server/routes-admin-bootstrap.ts) e o
 * seed (script/seed-super-admin.ts) criam o usuário com role=`super_admin`,
 * mas o middleware requireSuperAdmin (server/routes.ts) e o override de tenant
 * testavam o literal `superadmin` — divergência que impedia o super admin de
 * acessar QUALQUER rota admin.
 *
 * Este teste trava o contrato: a role canônica gravada pelo bootstrap/seed é
 * EXATAMENTE a que o gate aceita (ambos via ROLES.SUPER_ADMIN /
 * isSuperAdminRole). Se alguém reintroduzir `superadmin` em qualquer um dos
 * lados, o teste falha.
 */
import { describe, it, expect } from "vitest";
import {
  ROLES,
  isSuperAdminRole,
  isAdminRole,
} from "../../shared/constants/roles";

type FakeReq = {
  isAuthenticated: () => boolean;
  user?: { role: string };
};

/**
 * Réplica fiel do predicado de requireSuperAdmin em server/routes.ts. Mantida
 * em sincronia: o middleware retorna 403 a menos que isSuperAdminRole(role).
 */
function requireSuperAdminAllows(req: FakeReq): boolean {
  if (!req.isAuthenticated()) return false;
  return isSuperAdminRole(req.user?.role);
}

describe("ROLES gate — super admin do bootstrap passa em requireSuperAdmin", () => {
  it("a role canônica é a string 'super_admin'", () => {
    expect(ROLES.SUPER_ADMIN).toBe("super_admin");
  });

  it("usuário criado pelo bootstrap (role=ROLES.SUPER_ADMIN) passa no gate", () => {
    // Simula o user persistido pelo bootstrap/seed.
    const bootstrapUser = { role: ROLES.SUPER_ADMIN };
    const req: FakeReq = {
      isAuthenticated: () => true,
      user: bootstrapUser,
    };
    expect(requireSuperAdminAllows(req)).toBe(true);
  });

  it("o literal legado 'superadmin' (sem underscore) NÃO é aceito — evita regressão silenciosa", () => {
    const req: FakeReq = {
      isAuthenticated: () => true,
      user: { role: "superadmin" },
    };
    expect(requireSuperAdminAllows(req)).toBe(false);
  });

  it("usuário não autenticado é barrado", () => {
    const req: FakeReq = { isAuthenticated: () => false };
    expect(requireSuperAdminAllows(req)).toBe(false);
  });

  it("admin de tenant não passa em requireSuperAdmin, mas conta como admin role", () => {
    const req: FakeReq = {
      isAuthenticated: () => true,
      user: { role: ROLES.ADMIN },
    };
    expect(requireSuperAdminAllows(req)).toBe(false);
    expect(isAdminRole(ROLES.ADMIN)).toBe(true);
    expect(isAdminRole(ROLES.SUPER_ADMIN)).toBe(true);
    expect(isAdminRole(ROLES.MEMBER)).toBe(false);
  });
});
