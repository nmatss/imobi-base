import { describe, expect, it } from "vitest";
import { ROLES } from "../../shared/constants/roles";
import { isJobAdminUser } from "../../server/routes-jobs";

describe("job admin RBAC", () => {
  it("allows tenant admins and platform super admins", () => {
    expect(isJobAdminUser({ role: ROLES.ADMIN })).toBe(true);
    expect(isJobAdminUser({ role: ROLES.SUPER_ADMIN })).toBe(true);
  });

  it("rejects non-admin and legacy role values", () => {
    expect(isJobAdminUser({ role: ROLES.MEMBER })).toBe(false);
    expect(isJobAdminUser({ role: "superadmin" })).toBe(false);
    expect(isJobAdminUser(undefined)).toBe(false);
  });
});
