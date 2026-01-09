/**
 * Account Security Module
 * Handles password strength validation, account lockout, and suspicious activity detection
 */

import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { users, loginHistory } from "@shared/schema-sqlite";
import { eq, and, desc, gte } from "drizzle-orm";
import { createAuditLog } from "../routes-security";
import { sendSecurityAlertEmail, sendNewLoginEmail } from "./email-service";

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;
const SUSPICIOUS_ACTIVITY_THRESHOLD = 3; // Failed logins from different IPs

// Password strength requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  maxPasswordAge: 90, // days
};

// Validate password strength
export function validatePasswordStrength(password: string): {
  valid: boolean;
  score: number; // 0-100
  message?: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
} {
  const requirements = {
    minLength: password.length >= PASSWORD_REQUIREMENTS.minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const metRequirements = Object.values(requirements).filter(Boolean).length;
  const score = Math.min(100, (metRequirements / 5) * 100);

  let message: string | undefined;
  if (!requirements.minLength) {
    message = "A senha deve ter pelo menos 8 caracteres";
  } else if (!requirements.hasUppercase) {
    message = "A senha deve conter pelo menos uma letra maiúscula";
  } else if (!requirements.hasLowercase) {
    message = "A senha deve conter pelo menos uma letra minúscula";
  } else if (!requirements.hasNumber) {
    message = "A senha deve conter pelo menos um número";
  } else if (!requirements.hasSpecialChar) {
    message = "A senha deve conter pelo menos um caractere especial";
  }

  return {
    valid: metRequirements === 5,
    score,
    message,
    requirements,
  };
}

// Check if password was previously used
export async function checkPasswordHistory(
  userId: string,
  newPassword: string,
  historyCount = 5
): Promise<boolean> {
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userList.length) return true;

  const user = userList[0];
  const passwordHistory = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];

  // Check if password matches any in history
  for (const oldHash of passwordHistory.slice(0, historyCount)) {
    if (await bcrypt.compare(newPassword, oldHash)) {
      return false; // Password was previously used
    }
  }

  return true;
}

// Update password history
export async function updatePasswordHistory(
  userId: string,
  newPasswordHash: string
): Promise<void> {
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userList.length) return;

  const user = userList[0];
  const passwordHistory = user.passwordHistory ? JSON.parse(user.passwordHistory) : [];

  passwordHistory.unshift(newPasswordHash);

  // Keep only last 5 passwords
  const updatedHistory = passwordHistory.slice(0, 5);

  await db.update(users)
    .set({ passwordHistory: JSON.stringify(updatedHistory) })
    .where(eq(users.id, userId));
}

// Handle failed login attempt
export async function handleFailedLogin(
  userId: string,
  email: string,
  reason: string,
  req: Request
): Promise<{ locked: boolean; remainingAttempts: number }> {
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!userList.length) {
    // Log failed login for non-existent user
    await db.insert(loginHistory).values({
      id: nanoid(),
      userId: null,
      email,
      success: false,
      failureReason: reason,
      ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
      userAgent: req.headers['user-agent'] || null,
    });
    return { locked: false, remainingAttempts: 0 };
  }

  const user = userList[0];
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);

  let lockedUntil: string | null = null;
  let locked = false;

  // Lock account if max attempts reached
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
    locked = true;

    // Send security alert
    await sendSecurityAlertEmail(
      user.email,
      user.name,
      'Conta bloqueada por múltiplas tentativas de login falhadas',
      {
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString(),
      }
    );

    // Audit log
    await createAuditLog(
      user.tenantId,
      userId,
      'account_locked',
      'user',
      userId,
      null,
      { reason: 'max_failed_attempts', lockedUntil },
      req
    );
  }

  // Update user
  await db.update(users)
    .set({
      failedLoginAttempts: failedAttempts,
      lockedUntil,
    })
    .where(eq(users.id, userId));

  // Log failed login
  await db.insert(loginHistory).values({
    id: nanoid(),
    userId,
    email,
    success: false,
    failureReason: reason,
    ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
    userAgent: req.headers['user-agent'] || null,
  });

  return { locked, remainingAttempts };
}

// Handle successful login
export async function handleSuccessfulLogin(
  userId: string,
  email: string,
  req: Request
): Promise<{ suspicious: boolean }> {
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!userList.length) {
    return { suspicious: false };
  }

  const user = userList[0];
  const currentIp = req.ip || req.headers['x-forwarded-for']?.toString() || '';

  // Check for suspicious activity
  const recentLogins = await db.select()
    .from(loginHistory)
    .where(
      and(
        eq(loginHistory.userId, userId),
        eq(loginHistory.success, true),
        gte(loginHistory.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      )
    )
    .orderBy(desc(loginHistory.createdAt))
    .limit(10);

  let suspicious = false;

  // Check if login from new IP
  const knownIPs = new Set(recentLogins.map((l: any) => l.ipAddress).filter(Boolean));
  if (knownIPs.size > 0 && !knownIPs.has(currentIp)) {
    suspicious = true;
  }

  // Reset failed login attempts
  await db.update(users)
    .set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date().toISOString(),
      lastLoginIp: currentIp,
    })
    .where(eq(users.id, userId));

  // Log successful login
  await db.insert(loginHistory).values({
    id: nanoid(),
    userId,
    email,
    success: true,
    failureReason: null,
    ipAddress: currentIp,
    userAgent: req.headers['user-agent'] || null,
    suspicious,
  });

  // Send notification for new device/location
  if (suspicious) {
    await sendNewLoginEmail(
      user.email,
      user.name,
      {
        ipAddress: currentIp,
        device: req.headers['user-agent'],
        time: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      }
    );
  }

  // Audit log
  await createAuditLog(
    user.tenantId,
    userId,
    'login',
    'user',
    userId,
    null,
    { suspicious, ipAddress: currentIp },
    req
  );

  return { suspicious };
}

// Check if account is locked
export async function checkAccountLock(userId: string): Promise<{
  locked: boolean;
  lockedUntil?: Date;
  remainingTime?: number;
}> {
  const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  if (!userList.length) {
    return { locked: false };
  }

  const user = userList[0];

  if (!user.lockedUntil) {
    return { locked: false };
  }

  const lockedUntil = new Date(user.lockedUntil);
  const now = new Date();

  if (now >= lockedUntil) {
    // Unlock account
    await db.update(users)
      .set({
        lockedUntil: null,
        failedLoginAttempts: 0,
      })
      .where(eq(users.id, userId));

    return { locked: false };
  }

  const remainingTime = Math.ceil((lockedUntil.getTime() - now.getTime()) / 1000);

  return {
    locked: true,
    lockedUntil,
    remainingTime,
  };
}

export function registerSecurityRoutes(app: Express) {

  // Middleware to require authentication
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    next();
  };

  // Get password strength requirements
  app.get("/api/auth/security/password-requirements", (_req: Request, res: Response) => {
    res.json(PASSWORD_REQUIREMENTS);
  });

  // Validate password strength
  app.post("/api/auth/security/validate-password", (req: Request, res: Response) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      const result = validatePasswordStrength(password);
      res.json(result);

    } catch (error: any) {
      console.error('Password validation error:', error);
      res.status(500).json({ error: "Erro ao validar senha" });
    }
  });

  // Get login history
  app.get("/api/auth/security/login-history", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const { limit = 20 } = req.query;

      const history = await db.select()
        .from(loginHistory)
        .where(eq(loginHistory.userId, userId))
        .orderBy(desc(loginHistory.createdAt))
        .limit(Math.min(100, Number(limit)));

      // Format for response
      const formattedHistory = history.map((h: any) => ({
        id: h.id,
        success: h.success,
        failureReason: h.failureReason,
        ipAddress: h.ipAddress,
        location: h.location,
        suspicious: h.suspicious,
        createdAt: h.createdAt,
      }));

      res.json({ history: formattedHistory });

    } catch (error: any) {
      console.error('Get login history error:', error);
      res.status(500).json({ error: "Erro ao buscar histórico de login" });
    }
  });

  // Get security status
  app.get("/api/auth/security/status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!userList.length) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = userList[0];
      const lockStatus = await checkAccountLock(userId);

      // Get recent suspicious activity
      const recentSuspicious = await db.select()
        .from(loginHistory)
        .where(
          and(
            eq(loginHistory.userId, userId),
            eq(loginHistory.suspicious, true),
            gte(loginHistory.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          )
        )
        .limit(1);

      res.json({
        accountLocked: lockStatus.locked,
        lockedUntil: lockStatus.lockedUntil,
        failedLoginAttempts: user.failedLoginAttempts || 0,
        lastLogin: user.lastLogin,
        lastLoginIp: user.lastLoginIp,
        emailVerified: user.emailVerified,
        hasOAuth: !!user.oauthProvider,
        oauthProvider: user.oauthProvider,
        recentSuspiciousActivity: recentSuspicious.length > 0,
      });

    } catch (error: any) {
      console.error('Get security status error:', error);
      res.status(500).json({ error: "Erro ao buscar status de segurança" });
    }
  });

  console.log("Security routes registered");
}
