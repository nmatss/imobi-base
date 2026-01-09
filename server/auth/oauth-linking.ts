/**
 * OAuth Account Linking Module
 * Handles linking OAuth accounts to existing email accounts
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users } from "@shared/schema-sqlite";
import { eq, and } from "drizzle-orm";
import { createAuditLog } from "../routes-security";

// Temporary storage for pending OAuth links (in production, use Redis)
const pendingLinks = new Map<string, {
  email: string;
  provider: 'google' | 'microsoft';
  oauthId: string;
  oauthData: any;
  createdAt: number;
}>();

export function storePendingLink(
  linkToken: string,
  email: string,
  provider: 'google' | 'microsoft',
  oauthId: string,
  oauthData: any
): void {
  pendingLinks.set(linkToken, {
    email,
    provider,
    oauthId,
    oauthData,
    createdAt: Date.now(),
  });

  // Clean up old pending links (older than 10 minutes)
  setTimeout(() => {
    const now = Date.now();
    pendingLinks.forEach((value, key) => {
      if (now - value.createdAt > 10 * 60 * 1000) {
        pendingLinks.delete(key);
      }
    });
  }, 1000);
}

export function registerOAuthLinkingRoutes(app: Express) {

  // Link OAuth account to existing user (requires authentication)
  app.post("/api/auth/oauth/link", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;
      const { provider, password } = req.body;

      if (!provider || !['google', 'microsoft'].includes(provider)) {
        return res.status(400).json({ error: "Provedor inválido" });
      }

      // Get user
      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!userList.length) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = userList[0];

      // If user already has an OAuth provider, they need to unlink first
      if (user.oauthProvider) {
        return res.status(400).json({
          error: "Esta conta já está vinculada a um provedor OAuth. Desvincule primeiro.",
          currentProvider: user.oauthProvider
        });
      }

      // Verify password if user has one
      if (user.password) {
        if (!password) {
          return res.status(400).json({ error: "Senha é obrigatória para vincular conta" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ error: "Senha incorreta" });
        }
      }

      // This endpoint is for initiating the OAuth flow with linking intent
      // The actual linking happens in the OAuth callback
      res.json({
        success: true,
        message: "Inicie o fluxo OAuth para completar a vinculação",
        redirectUrl: `/api/auth/${provider}?action=link`
      });

    } catch (error: any) {
      console.error('OAuth link error:', error);
      res.status(500).json({ error: "Erro ao vincular conta" });
    }
  });

  // Unlink OAuth account
  app.post("/api/auth/oauth/unlink", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;
      const { password, newPassword } = req.body;

      // Get user
      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!userList.length) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = userList[0];

      if (!user.oauthProvider) {
        return res.status(400).json({ error: "Esta conta não está vinculada a um provedor OAuth" });
      }

      // If user doesn't have a password, they must set one before unlinking
      if (!user.password || user.password === '') {
        if (!newPassword) {
          return res.status(400).json({
            error: "Você precisa definir uma senha antes de desvincular sua conta OAuth",
            requirePassword: true
          });
        }

        // Validate new password
        if (newPassword.length < 8) {
          return res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
        }

        // Hash and set password
        const hashedPassword = await bcrypt.hash(newPassword, 12); // P2 Security Fix: Increased from 10 to 12 rounds

        await db.update(users)
          .set({
            password: hashedPassword,
            oauthProvider: null,
            oauthId: null,
            oauthAccessToken: null,
            oauthRefreshToken: null,
          })
          .where(eq(users.id, userId));

      } else {
        // Verify existing password
        if (!password) {
          return res.status(400).json({ error: "Senha é obrigatória para desvincular conta" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(400).json({ error: "Senha incorreta" });
        }

        // Unlink OAuth
        await db.update(users)
          .set({
            oauthProvider: null,
            oauthId: null,
            oauthAccessToken: null,
            oauthRefreshToken: null,
          })
          .where(eq(users.id, userId));
      }

      // Audit log
      await createAuditLog(
        user.tenantId,
        userId,
        'oauth_unlinked',
        'user',
        userId,
        { oauthProvider: user.oauthProvider },
        { oauthProvider: null },
        req
      );

      res.json({
        success: true,
        message: "Conta OAuth desvinculada com sucesso"
      });

    } catch (error: any) {
      console.error('OAuth unlink error:', error);
      res.status(500).json({ error: "Erro ao desvincular conta" });
    }
  });

  // Get OAuth link status
  app.get("/api/auth/oauth/status", async (req: Request, res: Response) => {
    try {
      // Check authentication
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;

      // Get user
      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!userList.length) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = userList[0];

      res.json({
        linked: !!user.oauthProvider,
        provider: user.oauthProvider || null,
        hasPassword: !!user.password && user.password !== '',
        email: user.email,
      });

    } catch (error: any) {
      console.error('OAuth status error:', error);
      res.status(500).json({ error: "Erro ao verificar status OAuth" });
    }
  });

  console.log("OAuth linking routes registered");
}
