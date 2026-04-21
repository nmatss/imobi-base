/**
 * Admin Bootstrap Route
 *
 * Endpoint one-shot para criar o primeiro super_admin quando o DB acaba de
 * subir e ainda não há ninguém com permissões administrativas. Depois que
 * existe pelo menos 1 super_admin, o endpoint fica trancado e retorna 409.
 *
 * Segurança:
 * - Exige header `x-bootstrap-secret` igual a process.env.ADMIN_BOOTSTRAP_SECRET.
 *   Sem env configurada → endpoint fica desabilitado (503).
 * - Só funciona se 0 usuários com role=super_admin existem no DB.
 * - Rate-limit agressivo (5 req/hora por IP) para mitigar brute-force.
 * - Sempre cria via bcrypt 12 rounds.
 *
 * Uso típico:
 *
 *   curl -X POST https://imobibase.com.br/api/admin/bootstrap \
 *     -H "Content-Type: application/json" \
 *     -H "x-bootstrap-secret: $ADMIN_BOOTSTRAP_SECRET" \
 *     -d '{"email":"admin@imobibase.com.br","password":"senha-forte","name":"Admin"}'
 */
import type { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db, schema } from "./db";
import { generateRateLimitKey } from "./middleware/rate-limit-key-generator";

const bootstrapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Muitas tentativas. Aguarde 1 hora.",
  },
});

interface BootstrapBody {
  email?: string;
  password?: string;
  name?: string;
}

export function registerAdminBootstrapRoutes(app: Express): void {
  app.post(
    "/api/admin/bootstrap",
    bootstrapLimiter,
    async (req: Request, res: Response) => {
      const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
      if (!expectedSecret) {
        res.status(503).json({
          error:
            "Bootstrap desabilitado. Configure ADMIN_BOOTSTRAP_SECRET na Vercel e redeploy.",
        });
        return;
      }

      const providedSecret = req.header("x-bootstrap-secret");
      if (!providedSecret || providedSecret !== expectedSecret) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { email, password, name } = (req.body || {}) as BootstrapBody;
      if (!email || !password || !name) {
        res.status(400).json({
          error: "email, password e name são obrigatórios",
        });
        return;
      }
      if (password.length < 12) {
        res.status(400).json({
          error: "password deve ter pelo menos 12 caracteres",
        });
        return;
      }

      try {
        const usersTable = (schema as any).users;
        const tenantsTable = (schema as any).tenants;

        // Gate: so funciona se nao existir nenhum super_admin ainda
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(usersTable)
          .where(eq(usersTable.role, "super_admin"));
        const existingCount = Number(countRow?.count ?? 0);
        if (existingCount > 0) {
          res.status(409).json({
            error:
              "Ja existe pelo menos um super_admin. Use um super_admin existente para criar outros via /api/users.",
          });
          return;
        }

        // Garantir tenant de operação
        const slug =
          process.env.ADMIN_TENANT_SLUG || "imobibase-ops";
        let [tenant] = await db
          .select()
          .from(tenantsTable)
          .where(eq(tenantsTable.slug, slug))
          .limit(1);
        if (!tenant) {
          [tenant] = await db
            .insert(tenantsTable)
            .values({
              name: "ImobiBase Ops",
              slug,
              email,
              primaryColor: "#0066cc",
              secondaryColor: "#333333",
            })
            .returning();
        }

        const hashed = await bcrypt.hash(password, 12);
        const [created] = await db
          .insert(usersTable)
          .values({
            tenantId: tenant.id,
            email,
            password: hashed,
            role: "super_admin",
            name,
          })
          .returning();

        res.status(201).json({
          ok: true,
          user: {
            id: created.id,
            email: created.email,
            role: created.role,
            tenantId: created.tenantId,
          },
          message:
            "Super admin criado. Faça login em /login e acesse /admin.",
        });
      } catch (err) {
        console.error("[admin-bootstrap] falha:", err);
        res.status(500).json({
          error: err instanceof Error ? err.message : "Bootstrap falhou",
        });
      }
    },
  );

  // Utilidade para o usuario saber se o bootstrap ainda esta disponivel.
  // Nao vaza dados: retorna apenas available:boolean.
  app.get(
    "/api/admin/bootstrap/status",
    async (_req: Request, res: Response) => {
      try {
        const usersTable = (schema as any).users;
        const [countRow] = await db
          .select({ count: sql<number>`count(*)` })
          .from(usersTable)
          .where(eq(usersTable.role, "super_admin"));
        const count = Number(countRow?.count ?? 0);
        res.json({
          available: count === 0,
          secretConfigured: Boolean(process.env.ADMIN_BOOTSTRAP_SECRET),
        });
      } catch (err) {
        res.status(500).json({
          error: err instanceof Error ? err.message : "status error",
          available: false,
        });
      }
    },
  );
}
