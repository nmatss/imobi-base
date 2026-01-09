/**
 * Session Management Module
 * Handles user sessions, device tracking, and session revocation
 */

import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import { createHash } from "crypto";
import { db } from "../db";
import { userSessions } from "@shared/schema-sqlite";
import { eq, and, desc, lt } from "drizzle-orm";
import { createAuditLog } from "../routes-security";
import { UAParser } from "ua-parser-js";

// Session expiration time (30 days)
const SESSION_EXPIRY_DAYS = 30;

// Helper to parse user agent
function parseUserAgent(userAgentString: string | undefined): {
  browser: string;
  os: string;
  deviceType: string;
} {
  if (!userAgentString) {
    return { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop' };
  }

  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  return {
    browser: result.browser.name || 'Unknown',
    os: result.os.name || 'Unknown',
    deviceType: result.device.type || 'desktop',
  };
}

// Helper to get device name
function getDeviceName(browser: string, os: string, deviceType: string): string {
  if (deviceType === 'mobile') {
    return `${os} Mobile - ${browser}`;
  } else if (deviceType === 'tablet') {
    return `${os} Tablet - ${browser}`;
  }
  return `${os} - ${browser}`;
}

// Create new session
export async function createSession(
  userId: string,
  req: Request
): Promise<string> {
  const sessionToken = nanoid(64);
  const hashedToken = createHash('sha256').update(sessionToken).digest('hex');

  const userAgent = req.headers['user-agent'];
  const { browser, os, deviceType } = parseUserAgent(userAgent);
  const deviceName = getDeviceName(browser, os, deviceType);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(userSessions).values({
    id: nanoid(),
    userId,
    sessionToken: hashedToken,
    deviceName,
    deviceType,
    browser,
    os,
    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
    location: null, // Can be enhanced with IP geolocation
    lastActivity: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  });

  return sessionToken;
}

// Update session activity
export async function updateSessionActivity(sessionToken: string): Promise<void> {
  const hashedToken = createHash('sha256').update(sessionToken).digest('hex');

  await db.update(userSessions)
    .set({
      lastActivity: new Date().toISOString(),
    })
    .where(eq(userSessions.sessionToken, hashedToken));
}

// Validate session
export async function validateSession(sessionToken: string): Promise<{
  valid: boolean;
  userId?: string;
  session?: any;
}> {
  const hashedToken = createHash('sha256').update(sessionToken).digest('hex');
  const now = new Date().toISOString();

  const sessionList = await db.select()
    .from(userSessions)
    .where(eq(userSessions.sessionToken, hashedToken))
    .limit(1);

  if (!sessionList.length) {
    return { valid: false };
  }

  const session = sessionList[0];

  // Check if session is expired
  if (session.expiresAt < now) {
    // Delete expired session
    await db.delete(userSessions).where(eq(userSessions.id, session.id));
    return { valid: false };
  }

  // Update last activity
  await updateSessionActivity(sessionToken);

  return {
    valid: true,
    userId: session.userId,
    session,
  };
}

// Clean up expired sessions
export async function cleanupExpiredSessions(): Promise<number> {
  const now = new Date().toISOString();

  const result = await db.delete(userSessions)
    .where(lt(userSessions.expiresAt, now));

  return result.rowsAffected || 0;
}

export function registerSessionManagementRoutes(app: Express) {

  // Middleware to require authentication
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    next();
  };

  // Get all active sessions for current user
  app.get("/api/auth/sessions", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const sessions = await db.select()
        .from(userSessions)
        .where(eq(userSessions.userId, userId))
        .orderBy(desc(userSessions.lastActivity));

      // Clean up expired sessions
      const now = new Date().toISOString();
      const activeSessions = sessions.filter((s: any) => s.expiresAt > now);

      // Delete expired ones
      const expiredIds = sessions
        .filter((s: any) => s.expiresAt <= now)
        .map((s: any) => s.id);

      if (expiredIds.length > 0) {
        for (const id of expiredIds) {
          await db.delete(userSessions).where(eq(userSessions.id, id));
        }
      }

      // Format sessions for response (hide sensitive data)
      const formattedSessions = activeSessions.map((s: any) => ({
        id: s.id,
        deviceName: s.deviceName,
        deviceType: s.deviceType,
        browser: s.browser,
        os: s.os,
        ipAddress: s.ipAddress,
        location: s.location,
        lastActivity: s.lastActivity,
        createdAt: s.createdAt,
        isCurrent: false, // Will be set by client
      }));

      res.json({ sessions: formattedSessions });

    } catch (error: any) {
      console.error('Get sessions error:', error);
      res.status(500).json({ error: "Erro ao buscar sessões" });
    }
  });

  // Revoke a specific session
  app.delete("/api/auth/sessions/:sessionId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({ error: "ID da sessão é obrigatório" });
      }

      // Check if session belongs to user
      const sessionList = await db.select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.id, sessionId),
            eq(userSessions.userId, userId)
          )
        )
        .limit(1);

      if (!sessionList.length) {
        return res.status(404).json({ error: "Sessão não encontrada" });
      }

      // Delete session
      await db.delete(userSessions).where(eq(userSessions.id, sessionId));

      // Audit log
      await createAuditLog(
        req.user!.tenantId,
        userId,
        'session_revoked',
        'session',
        sessionId,
        { sessionId },
        null,
        req
      );

      res.json({
        success: true,
        message: "Sessão revogada com sucesso"
      });

    } catch (error: any) {
      console.error('Revoke session error:', error);
      res.status(500).json({ error: "Erro ao revogar sessão" });
    }
  });

  // Revoke all sessions except current
  app.delete("/api/auth/sessions/all", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { keepCurrent } = req.body;

      // Get current session token from request (you may need to adjust this based on your session implementation)
      const currentSessionToken = req.session?.id || req.headers['x-session-token'];

      if (keepCurrent && currentSessionToken) {
        const hashedToken = createHash('sha256').update(currentSessionToken as string).digest('hex');

        // Get current session
        const currentSession = await db.select()
          .from(userSessions)
          .where(
            and(
              eq(userSessions.userId, userId),
              eq(userSessions.sessionToken, hashedToken)
            )
          )
          .limit(1);

        // Delete all sessions except current
        const allSessions = await db.select()
          .from(userSessions)
          .where(eq(userSessions.userId, userId));

        for (const session of allSessions) {
          if (currentSession.length > 0 && session.id !== currentSession[0].id) {
            await db.delete(userSessions).where(eq(userSessions.id, session.id));
          }
        }

      } else {
        // Delete all sessions
        await db.delete(userSessions).where(eq(userSessions.userId, userId));
      }

      // Audit log
      await createAuditLog(
        req.user!.tenantId,
        userId,
        'all_sessions_revoked',
        'user',
        userId,
        null,
        { keepCurrent },
        req
      );

      res.json({
        success: true,
        message: "Todas as sessões foram revogadas"
      });

    } catch (error: any) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({ error: "Erro ao revogar sessões" });
    }
  });

  // Get session count
  app.get("/api/auth/sessions/count", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const now = new Date().toISOString();

      const sessions = await db.select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId)
          )
        );

      const activeCount = sessions.filter((s: any) => s.expiresAt > now).length;

      res.json({ count: activeCount });

    } catch (error: any) {
      console.error('Get session count error:', error);
      res.status(500).json({ error: "Erro ao contar sessões" });
    }
  });

  console.log("Session management routes registered");
}

// Background job to clean up expired sessions (run periodically)
export function startSessionCleanupJob(): void {
  // Run cleanup every hour
  setInterval(async () => {
    try {
      const deletedCount = await cleanupExpiredSessions();
      if (deletedCount > 0) {
        console.log(`Cleaned up ${deletedCount} expired sessions`);
      }
    } catch (error) {
      console.error('Session cleanup job error:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  console.log("Session cleanup job started");
}
