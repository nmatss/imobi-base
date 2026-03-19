/**
 * Tenant Isolation Middleware
 * Ensures resources belong to the authenticated user's tenant (IDOR prevention).
 * Returns 404 for both not-found and wrong-tenant to avoid leaking resource existence.
 */

import type { Request, Response, NextFunction } from "express";

export function ensureTenantOwnership(
  getResource: (id: string) => Promise<{ tenantId: string } | null>,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const resourceId = req.params.id;
    const resource = await getResource(resourceId);

    if (!resource || resource.tenantId !== req.user!.tenantId) {
      return res.status(404).json({ error: "Resource not found" });
    }

    next();
  };
}
