/**
 * Tenant Resource Middleware
 *
 * Canonical helpers para proteger recursos contra IDOR (Insecure Direct Object
 * Reference). Sempre que uma rota acessa/modifica um recurso por ID (ex:
 * `/api/properties/:id`), o recurso DEVE pertencer ao tenant do usuario
 * autenticado. Usar qualquer um dos dois helpers abaixo garante isso:
 *
 * 1. `validateResourceTenant(resource, userTenantId, name)` — para uso em
 *    handlers existentes apos buscar o recurso manualmente.
 *
 * 2. `withTenantResource(loader, name)` — middleware que carrega o recurso,
 *    valida o tenant e anexa a `req.resource` em uma unica linha. Novas
 *    rotas devem preferir esta API.
 *
 * Ambas as APIs retornam 404 (nao 403) quando o tenant nao bate, para evitar
 * vazamento de informacao sobre existencia de IDs em outros tenants.
 */
import type { Request, Response, NextFunction } from "express";

/**
 * Valida que um recurso ja carregado pertence ao tenant do usuario. Joga
 * exception com status 404 se o recurso nao existir ou pertencer a outro
 * tenant. Use com try/catch + toHttpError em handlers existentes.
 *
 * Obs: `asserts` type predicates nao sao permitidos em Promise<...> (TS 4.x+),
 * por isso esta funcao retorna Promise<void> e o codigo de chamada precisa
 * continuar tratando `resource` como opcional apos a chamada. Para nova
 * codificacao type-safe prefira `withTenantResource` que anexa a `req.resource`.
 */
export async function validateResourceTenant(
  resource: { tenantId: string } | null | undefined,
  userTenantId: string,
  resourceName = "Resource",
): Promise<void> {
  if (!resource || resource.tenantId !== userTenantId) {
    // 404 ao inves de 403 para nao vazar existencia do ID em outros tenants
    throw { status: 404, message: `${resourceName} not found` };
  }
}

export interface TenantResourceRequest<T> extends Request {
  resource: T;
}

/**
 * HOF que gera middleware Express. Uso:
 *
 *   app.get(
 *     "/api/properties/:id",
 *     requireAuth,
 *     withTenantResource((id) => storage.getProperty(id), "Imovel"),
 *     (req, res) => res.json((req as TenantResourceRequest<Property>).resource),
 *   );
 */
export function withTenantResource<T extends { tenantId: string }>(
  loader: (id: string, req: Request) => Promise<T | null | undefined>,
  resourceName = "Resource",
  idParam: string = "id",
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.tenantId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      const id = req.params[idParam];
      if (!id) {
        res.status(400).json({ error: `Missing :${idParam}` });
        return;
      }
      const resource = await loader(id, req);
      if (!resource || resource.tenantId !== req.user.tenantId) {
        res.status(404).json({ error: `${resourceName} not found` });
        return;
      }
      (req as TenantResourceRequest<T>).resource = resource;
      next();
    } catch (err) {
      next(err);
    }
  };
}
