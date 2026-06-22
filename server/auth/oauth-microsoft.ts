/**
 * Microsoft OAuth 2.0 Integration
 * Handles Microsoft/Azure AD Sign-In flow
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

// Microsoft OAuth configuration
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || '';
const MICROSOFT_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET || '';
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/microsoft/callback';
const MICROSOFT_TENANT = process.env.MICROSOFT_TENANT || 'common'; // 'common', 'organizations', 'consumers', or specific tenant ID

// OAuth endpoints
const MICROSOFT_AUTH_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/authorize`;
const MICROSOFT_TOKEN_URL = `https://login.microsoftonline.com/${MICROSOFT_TENANT}/oauth2/v2.0/token`;
const MICROSOFT_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me';
const OAUTH_AUTO_PROVISION_TENANT_ID = process.env.OAUTH_AUTO_PROVISION_TENANT_ID || '';

interface MicrosoftTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

interface MicrosoftUserInfo {
  id: string;
  userPrincipalName: string;
  mail: string;
  displayName: string;
  givenName: string;
  surname: string;
  jobTitle?: string;
  mobilePhone?: string;
  officeLocation?: string;
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

export function registerMicrosoftOAuthRoutes(app: Express) {

  // Initiate Microsoft OAuth flow
  app.get("/api/auth/microsoft", (req: Request, res: Response) => {
    try {
      if (!MICROSOFT_CLIENT_ID) {
        return res.status(500).json({ error: "Microsoft OAuth não configurado" });
      }

      // State stateless via cookie assinado (serverless-safe).
      const redirectUrl = sanitizeRedirectUrl(req.query.redirect);
      const state = issueOAuthState(res, "microsoft", redirectUrl);

      const params = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile User.Read offline_access',
        state,
        response_mode: 'query',
      });

      const authUrl = `${MICROSOFT_AUTH_URL}?${params.toString()}`;
      res.redirect(authUrl);

    } catch (error: any) {
      console.error('Microsoft OAuth initiation error:', error);
      res.status(500).json({ error: "Erro ao iniciar autenticação Microsoft" });
    }
  });

  // Handle Microsoft OAuth callback
  app.get("/api/auth/microsoft/callback", async (req: Request, res: Response) => {
    try {
      const { code, state, error, error_description } = req.query;

      // Handle OAuth errors
      if (error) {
        console.error('Microsoft OAuth error:', error, error_description);
        return res.redirect(`/auth/login?error=oauth_failed&provider=microsoft&details=${encodeURIComponent(error_description as string || '')}`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect(`/auth/login?error=missing_code`);
      }

      const stateResult = consumeOAuthState(req, res, "microsoft", state);
      if (!stateResult.valid) {
        return res.redirect(`/auth/login?error=invalid_state`);
      }
      const oauthRedirectUrl = stateResult.redirectUrl;

      if (!MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
        return res.redirect(`/auth/login?error=oauth_not_configured`);
      }

      // Exchange code for tokens
      const tokenParams = new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: MICROSOFT_REDIRECT_URI,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read offline_access',
      });

      const tokenResponse = await axios.post<MicrosoftTokenResponse>(
        MICROSOFT_TOKEN_URL,
        tokenParams.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = tokenResponse.data;

      // Get user info from Microsoft Graph
      const userInfoResponse = await axios.get<MicrosoftUserInfo>(MICROSOFT_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const microsoftUser = userInfoResponse.data;
      const email = microsoftUser.mail || microsoftUser.userPrincipalName;

      if (!email) {
        return res.redirect(`/auth/login?error=no_email_from_provider`);
      }

      // Check if user already exists (by email or OAuth ID)
      const existingUserList = await runWithAuthEmailRlsContext(email, () =>
        db.select()
          .from(users)
          .where(
            or(
              eq(users.email, email),
              and(
                eq(users.oauthProvider, 'microsoft'),
                eq(users.oauthId, microsoftUser.id)
              )
            )
          )
          .limit(1),
      );

      let user: OAuthUser;
      let isNewUser = false;

      if (existingUserList.length > 0) {
        user = existingUserList[0];

        // Update OAuth tokens if this is an OAuth account
        if (user.oauthProvider === 'microsoft' && user.oauthId === microsoftUser.id) {
          await runWithTenantRlsContext(user.tenantId, () =>
            db.update(users)
              .set({
                oauthAccessToken: access_token,
                oauthRefreshToken: refresh_token || user.oauthRefreshToken,
                lastLogin: new Date().toISOString(),
                lastLoginIp: req.ip || req.headers['x-forwarded-for']?.toString() || null,
                emailVerified: true, // Microsoft accounts are pre-verified
              })
              .where(eq(users.id, user.id)),
          );
        } else {
          // User exists with same email but different provider
          return res.redirect(`/auth/link-account?email=${encodeURIComponent(email)}&provider=microsoft&pending=true`);
        }

      } else {
        // Create new user only when an explicit tenant was configured and verified.
        isNewUser = true;
        const tenantId = await getAutoProvisionTenantId();
        if (!tenantId) {
          return res.redirect(`/auth/login?error=oauth_account_not_found&provider=microsoft`);
        }

        const userId = nanoid();

        user = await runWithTenantRlsContext(tenantId, async () => {
          await db.insert(users).values({
            id: userId,
            tenantId,
            name: microsoftUser.displayName,
            email,
            password: '', // No password for OAuth users
            role: ROLES.MEMBER,
            avatar: null,
            emailVerified: true,
            oauthProvider: 'microsoft',
            oauthId: microsoftUser.id,
            oauthAccessToken: access_token,
            oauthRefreshToken: refresh_token || null,
            lastLogin: new Date().toISOString(),
            lastLoginIp: req.ip || req.headers['x-forwarded-for']?.toString() || null,
          });

          const createdUser = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];

          // Audit log for new account
          await createAuditLog(
            createdUser.tenantId,
            createdUser.id,
            'account_created',
            'user',
            createdUser.id,
            null,
            { provider: 'microsoft', email: createdUser.email },
            req
          );

          return createdUser;
        });
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
          { provider: 'microsoft', isNewUser },
          req
        );
      });

      // Set up session with regeneration to prevent session fixation
      if (req.login) {
        // Regenerate session before OAuth login
        req.session.regenerate(async (regenerateErr) => {
          if (regenerateErr) {
            console.error('OAuth session regeneration error:', regenerateErr);
            return res.redirect('/auth/login?error=session_error');
          }

          req.login(user, (err) => {
            if (err) {
              console.error('OAuth login error:', err);
              return res.redirect('/auth/login?error=login_failed');
            }

            // Redirect URL veio do state assinado (cookie), já consumido.
            res.redirect(oauthRedirectUrl || '/dashboard');
          });
        });
      } else {
        // If no session management, redirect with error
        res.redirect('/auth/login?error=session_unavailable');
      }

    } catch (error: any) {
      console.error('Microsoft OAuth callback error:', error);
      res.redirect(`/auth/login?error=oauth_callback_failed`);
    }
  });

  console.log("Microsoft OAuth routes registered");
}
