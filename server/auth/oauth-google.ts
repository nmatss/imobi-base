/**
 * Google OAuth 2.0 Integration
 * Handles Google Sign-In flow
 */

import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import axios from "axios";
import { db } from "../db";
import { tenants, users, loginHistory } from "@shared/schema-sqlite";
import { ROLES } from "@shared/constants/roles";
import { eq, or, and } from "drizzle-orm";
import { createAuditLog } from "../routes-security";
import { runWithAuthEmailRlsContext, runWithTenantRlsContext } from "../db-rls";
import { issueOAuthState, consumeOAuthState } from "./oauth-state";
import { encryptSecret } from "../security/token-encryption";
import { provisionOAuthTenantAndOwner } from "./oauth-provisioning";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

// OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const OAUTH_AUTO_PROVISION_TENANT_ID = process.env.OAUTH_AUTO_PROVISION_TENANT_ID || '';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

type OAuthUser = typeof users.$inferSelect;

function sanitizeRedirectUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined;
  return value;
}

async function getAutoProvisionTenantId(): Promise<string | null> {
  if (!OAUTH_AUTO_PROVISION_TENANT_ID) return null;
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.id, OAUTH_AUTO_PROVISION_TENANT_ID))
    .limit(1);
  return tenant?.id ?? null;
}

export function registerGoogleOAuthRoutes(app: Express) {

  // Initiate Google OAuth flow
  app.get("/api/auth/google", (req: Request, res: Response) => {
    try {
      if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: "Google OAuth não configurado" });
      }

      // State stateless via cookie assinado (serverless-safe).
      const redirectUrl = sanitizeRedirectUrl(req.query.redirect);
      const state = issueOAuthState(res, "google", redirectUrl);

      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        access_type: 'offline',
        prompt: 'consent',
      });

      const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`;
      res.redirect(authUrl);

    } catch (error: any) {
      console.error('Google OAuth initiation error:', error);
      res.status(500).json({ error: "Erro ao iniciar autenticação Google" });
    }
  });

  // Handle Google OAuth callback
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error } = req.query;

      // Handle OAuth errors
      if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect(`/login?error=oauth_failed&provider=google`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect(`/login?error=missing_code`);
      }

      const stateResult = consumeOAuthState(req, res, "google", state);
      if (!stateResult.valid) {
        return res.redirect(`/login?error=invalid_state`);
      }
      const oauthRedirectUrl = stateResult.redirectUrl;

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.redirect(`/login?error=oauth_not_configured`);
      }

      // Exchange code for tokens
      const tokenResponse = await axios.post<GoogleTokenResponse>(GOOGLE_TOKEN_URL, {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user info from Google
      const userInfoResponse = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const googleUser = userInfoResponse.data;

      // Check if user already exists (by email or OAuth ID)
      const existingUserList = await runWithAuthEmailRlsContext(googleUser.email, () =>
        db.select()
          .from(users)
          .where(
            or(
              eq(users.email, googleUser.email),
              and(
                eq(users.oauthProvider, 'google'),
                eq(users.oauthId, googleUser.id)
              )
            )
          )
          .limit(1),
      );

      // Tokens de terceiros são criptografados em repouso (AES-256-GCM).
      const encAccessToken = encryptSecret(access_token);
      const encRefreshToken = encryptSecret(refresh_token || null);

      let user: OAuthUser;
      let isNewUser = false;
      let needsOnboarding = false;

      if (existingUserList.length > 0) {
        user = existingUserList[0];

        // Update OAuth tokens if this is an OAuth account
        if (user.oauthProvider === 'google' && user.oauthId === googleUser.id) {
          await runWithTenantRlsContext(user.tenantId, () =>
            db.update(users)
              .set({
                oauthAccessToken: encAccessToken,
                oauthRefreshToken: encRefreshToken || user.oauthRefreshToken,
                lastLogin: new Date().toISOString(),
                lastLoginIp: req.ip || req.headers['x-forwarded-for']?.toString() || null,
                avatar: googleUser.picture || user.avatar,
                emailVerified: googleUser.verified_email,
              })
              .where(eq(users.id, user.id)),
          );
        } else {
          // Conta já existe com este email mas com outro provedor/senha.
          // Não há fluxo de account-linking na UI ainda, então em vez de
          // redirecionar para uma rota inexistente (404), mostramos um erro
          // amigável na tela de login. Ver docs/reports/PLANO_GO_LIVE_360 (B7).
          return res.redirect(`/login?error=email_in_use_other_provider`);
        }

      } else {
        isNewUser = true;
        const overrideTenantId = await getAutoProvisionTenantId();

        if (overrideTenantId) {
          // Modo white-label: usuário entra como MEMBER em um tenant fixo.
          const userId = nanoid();
          user = await runWithTenantRlsContext(overrideTenantId, async () => {
            await db.insert(users).values({
              id: userId,
              tenantId: overrideTenantId,
              name: googleUser.name,
              email: googleUser.email,
              password: '', // No password for OAuth users
              role: ROLES.MEMBER,
              avatar: googleUser.picture,
              emailVerified: googleUser.verified_email,
              oauthProvider: 'google',
              oauthId: googleUser.id,
              oauthAccessToken: encAccessToken,
              oauthRefreshToken: encRefreshToken || null,
              lastLogin: new Date().toISOString(),
              lastLoginIp: req.ip || req.headers['x-forwarded-for']?.toString() || null,
            });

            const createdUser = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];

            await createAuditLog(
              createdUser.tenantId,
              createdUser.id,
              'account_created',
              'user',
              createdUser.id,
              null,
              { provider: 'google', email: createdUser.email },
              req
            );

            return createdUser;
          });
        } else {
          // SaaS multi-tenant: provisiona nova imobiliária + admin e leva ao
          // onboarding para refinar nome/slug da empresa.
          const { userId } = await provisionOAuthTenantAndOwner({
            name: googleUser.name,
            email: googleUser.email,
            avatar: googleUser.picture,
            oauthProvider: 'google',
            oauthId: googleUser.id,
            oauthAccessToken: encAccessToken,
            oauthRefreshToken: encRefreshToken,
            emailVerified: googleUser.verified_email,
          });

          user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
          needsOnboarding = true;

          await runWithTenantRlsContext(user.tenantId, () =>
            createAuditLog(
              user.tenantId,
              user.id,
              'account_created',
              'user',
              user.id,
              null,
              { provider: 'google', email: user.email, onboarding: true },
              req
            ),
          );
        }
      }

      await runWithTenantRlsContext(user.tenantId, async () => {
        // Log successful login
        await db.insert(loginHistory).values({
          id: nanoid(),
          userId: user.id,
          email: user.email,
          success: true,
          failureReason: null,
          ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
          userAgent: req.headers['user-agent'] || null,
        });

        // Audit log for login
        await createAuditLog(
          user.tenantId,
          user.id,
          'login',
          'user',
          user.id,
          null,
          { provider: 'google', isNewUser },
          req
        );
      });

      // Set up session with regeneration to prevent session fixation
      if (req.login) {
        // Regenerate session before OAuth login
        req.session.regenerate(async (regenerateErr) => {
          if (regenerateErr) {
            console.error('OAuth session regeneration error:', regenerateErr);
            return res.redirect('/login?error=session_error');
          }

          req.login(user, (err) => {
            if (err) {
              console.error('OAuth login error:', err);
              return res.redirect('/login?error=login_failed');
            }

            // Novo tenant via SSO: leva ao onboarding antes do dashboard.
            // Caso contrário, usa o redirect do state assinado (cookie).
            res.redirect(needsOnboarding ? '/onboarding/agency' : (oauthRedirectUrl || '/dashboard'));
          });
        });
      } else {
        // If no session management, redirect with error
        res.redirect('/login?error=session_unavailable');
      }

    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`/login?error=oauth_callback_failed`);
    }
  });

  console.log("Google OAuth routes registered");
}
