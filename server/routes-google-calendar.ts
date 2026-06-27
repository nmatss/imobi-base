/**
 * Rotas de conexão Google Calendar por corretor (Onda 2).
 *
 * Fluxo OAuth incremental (scope calendar.events), separado do login SSO:
 *  - GET  /api/integrations/google-calendar/connect   (auth)  → consentimento
 *  - GET  /api/integrations/google-calendar/callback           → grava conexão
 *  - GET  /api/integrations/google-calendar/status    (auth)
 *  - POST /api/integrations/google-calendar/disconnect(auth)
 *  - POST /api/integrations/google-calendar/sync-toggle(auth)
 *
 * A identidade do corretor (userId/tenantId) viaja no `meta` ASSINADO do state
 * (cookie sameSite=lax, volta no redirect do Google) — o callback não depende
 * do cookie de sessão e recria o contexto RLS via runWithTenantRlsContext.
 */

import type { Express, Request, Response, RequestHandler } from "express";
import { issueOAuthState, consumeOAuthState } from "./auth/oauth-state";
import { runWithTenantRlsContext } from "./db-rls";
import {
  GOOGLE_CALENDAR_SCOPES,
  exchangeCodeForTokens,
  fetchGoogleEmail,
} from "./integrations/google-calendar/client";
import {
  disconnectGoogle,
  getConnectionForUser,
  setSyncEnabled,
  upsertGoogleConnection,
} from "./integrations/google-calendar/service";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function redirectUri(): string {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    "http://localhost:5000/api/integrations/google-calendar/callback"
  );
}

function settingsRedirect(status: string): string {
  return `/settings?tab=integrations&calendar=${status}`;
}

export function registerGoogleCalendarRoutes(
  app: Express,
  deps: { requireAuth: RequestHandler },
) {
  const { requireAuth } = deps;

  // Status da conexão do corretor logado.
  app.get(
    "/api/integrations/google-calendar/status",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const conn = await getConnectionForUser(req.user!.id);
        res.json({
          connected: !!conn,
          googleEmail: conn?.googleEmail ?? null,
          syncEnabled: conn?.syncEnabled ?? false,
          lastError: conn?.lastError ?? null,
        });
      } catch (error) {
        console.error("google-calendar status error:", error);
        res.status(500).json({ error: "Erro ao consultar conexão Google Calendar" });
      }
    },
  );

  // Inicia o consentimento (scope calendar.events).
  app.get(
    "/api/integrations/google-calendar/connect",
    requireAuth,
    (req: Request, res: Response) => {
      if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: "Google OAuth não configurado" });
      }
      const state = issueOAuthState(res, "google_calendar", undefined, {
        userId: req.user!.id,
        tenantId: req.user!.tenantId,
      });

      const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri(),
        response_type: "code",
        scope: GOOGLE_CALENDAR_SCOPES.join(" "),
        state,
        access_type: "offline",
        prompt: "consent",
        include_granted_scopes: "true",
      });
      res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
    },
  );

  // Callback do consentimento — grava a conexão do corretor.
  app.get(
    "/api/integrations/google-calendar/callback",
    async (req: Request, res: Response) => {
      try {
        const { code, state, error } = req.query;
        if (error) return res.redirect(settingsRedirect("error"));
        if (!code || typeof code !== "string") {
          return res.redirect(settingsRedirect("missing_code"));
        }

        const stateResult = consumeOAuthState(req, res, "google_calendar", state);
        const userId = stateResult.meta?.userId;
        const tenantId = stateResult.meta?.tenantId;
        if (!stateResult.valid || !userId || !tenantId) {
          return res.redirect(settingsRedirect("invalid_state"));
        }

        if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
          return res.redirect(settingsRedirect("not_configured"));
        }

        const tokens = await exchangeCodeForTokens(code, redirectUri());
        const googleEmail = await fetchGoogleEmail(tokens.access_token).catch(() => undefined);

        await runWithTenantRlsContext(tenantId, () =>
          upsertGoogleConnection({
            tenantId,
            userId,
            googleEmail,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? null,
            expiresInSeconds: tokens.expires_in,
            scope: tokens.scope,
          }),
        );

        res.redirect(settingsRedirect("connected"));
      } catch (error) {
        console.error("google-calendar callback error:", error);
        res.redirect(settingsRedirect("callback_failed"));
      }
    },
  );

  // Desconecta a conta Google do corretor.
  app.post(
    "/api/integrations/google-calendar/disconnect",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        await disconnectGoogle(req.user!.id);
        res.json({ success: true });
      } catch (error) {
        console.error("google-calendar disconnect error:", error);
        res.status(500).json({ error: "Erro ao desconectar Google Calendar" });
      }
    },
  );

  // Liga/desliga a sincronização sem remover a conexão.
  app.post(
    "/api/integrations/google-calendar/sync-toggle",
    requireAuth,
    async (req: Request, res: Response) => {
      try {
        const enabled = req.body?.enabled !== false;
        await setSyncEnabled(req.user!.id, enabled);
        res.json({ success: true, syncEnabled: enabled });
      } catch (error) {
        console.error("google-calendar sync-toggle error:", error);
        res.status(500).json({ error: "Erro ao atualizar sincronização" });
      }
    },
  );

  console.log("Google Calendar routes registered");
}
