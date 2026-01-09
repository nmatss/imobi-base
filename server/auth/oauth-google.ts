/**
 * Google OAuth 2.0 Integration
 * Handles Google Sign-In flow
 */

import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import axios from "axios";
import { db } from "../db";
import { users, loginHistory } from "@shared/schema-sqlite";
import { eq, or, and } from "drizzle-orm";
import { createAuditLog } from "../routes-security";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

// OAuth endpoints
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

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

// State storage for OAuth flow (in production, use Redis)
const oauthStateStore = new Map<string, { createdAt: number; redirectUrl?: string }>();

function generateState(): string {
  const state = nanoid(32);
  oauthStateStore.set(state, { createdAt: Date.now() });

  // Clean up old states (older than 10 minutes)
  setTimeout(() => {
    const now = Date.now();
    oauthStateStore.forEach((value, key) => {
      if (now - value.createdAt > 10 * 60 * 1000) {
        oauthStateStore.delete(key);
      }
    });
  }, 1000);

  return state;
}

function verifyState(state: string): boolean {
  const record = oauthStateStore.get(state);
  if (!record) return false;

  // Check if state is not expired (10 minutes)
  if (Date.now() - record.createdAt > 10 * 60 * 1000) {
    oauthStateStore.delete(state);
    return false;
  }

  return true;
}

export function registerGoogleOAuthRoutes(app: Express) {

  // Initiate Google OAuth flow
  app.get("/api/auth/google", (req: Request, res: Response) => {
    try {
      if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({ error: "Google OAuth não configurado" });
      }

      const state = generateState();

      // Store redirect URL if provided
      const redirectUrl = req.query.redirect as string;
      if (redirectUrl) {
        const stateData = oauthStateStore.get(state);
        if (stateData) {
          stateData.redirectUrl = redirectUrl;
        }
      }

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
        return res.redirect(`/auth/login?error=oauth_failed&provider=google`);
      }

      if (!code || typeof code !== 'string') {
        return res.redirect(`/auth/login?error=missing_code`);
      }

      if (!state || typeof state !== 'string' || !verifyState(state)) {
        return res.redirect(`/auth/login?error=invalid_state`);
      }

      if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return res.redirect(`/auth/login?error=oauth_not_configured`);
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
      const existingUserList = await db.select()
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
        .limit(1);

      let user;
      let isNewUser = false;

      if (existingUserList.length > 0) {
        user = existingUserList[0];

        // Update OAuth tokens if this is an OAuth account
        if (user.oauthProvider === 'google' && user.oauthId === googleUser.id) {
          await db.update(users)
            .set({
              oauthAccessToken: access_token,
              oauthRefreshToken: refresh_token || user.oauthRefreshToken,
              lastLogin: new Date().toISOString(),
              lastLoginIp: req.ip || req.headers['x-forwarded-for']?.toString() || null,
              avatar: googleUser.picture || user.avatar,
              emailVerified: googleUser.verified_email,
            })
            .where(eq(users.id, user.id));
        } else {
          // User exists with same email but different provider
          // This is a linking scenario - handled separately
          return res.redirect(`/auth/link-account?email=${encodeURIComponent(googleUser.email)}&provider=google&pending=true`);
        }

      } else {
        // Create new user
        isNewUser = true;

        // Get default tenant (you may need to adjust this logic)
        const defaultTenantId = 'default-tenant'; // Replace with actual tenant selection logic

        const userId = nanoid();

        await db.insert(users).values({
          id: userId,
          tenantId: defaultTenantId,
          name: googleUser.name,
          email: googleUser.email,
          password: '', // No password for OAuth users
          role: 'user',
          avatar: googleUser.picture,
          emailVerified: googleUser.verified_email,
          oauthProvider: 'google',
          oauthId: googleUser.id,
          oauthAccessToken: access_token,
          oauthRefreshToken: refresh_token || null,
          lastLogin: new Date().toISOString(),
          lastLoginIp: req.ip || req.headers['x-forwarded-for']?.toString() || null,
        });

        user = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];

        // Audit log for new account
        await createAuditLog(
          user.tenantId,
          user.id,
          'account_created',
          'user',
          user.id,
          null,
          { provider: 'google', email: user.email },
          req
        );
      }

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

            // Get redirect URL from state
            const stateData = oauthStateStore.get(state as string);
            const redirectUrl = stateData?.redirectUrl || '/dashboard';
            oauthStateStore.delete(state as string);

            res.redirect(redirectUrl);
          });
        });
      } else {
        // If no session management, redirect with error
        res.redirect('/auth/login?error=session_unavailable');
      }

    } catch (error: any) {
      console.error('Google OAuth callback error:', error);
      res.redirect(`/auth/login?error=oauth_callback_failed`);
    }
  });

  console.log("Google OAuth routes registered");
}
