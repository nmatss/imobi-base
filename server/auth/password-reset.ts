/**
 * Password Reset Module
 * Handles secure password reset flow with token generation and validation
 */

import type { Express, Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db } from "../db";
import { users, loginHistory } from "@shared/schema-sqlite";
import { eq, and, gt } from "drizzle-orm";
import { sendPasswordResetEmail, sendPasswordChangedEmail } from "./email-service";
import { createAuditLog } from "../routes-security";

// Rate limiting for password reset requests
const resetRequestLimiter = new Map<string, { count: number; resetAt: number }>();
const RESET_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RESET_RATE_LIMIT_MAX = 3; // Max 3 requests per hour

function checkResetRateLimit(email: string): { allowed: boolean; remainingAttempts: number; resetIn: number } {
  const now = Date.now();
  const key = `reset:${email.toLowerCase()}`;
  const record = resetRequestLimiter.get(key);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    resetRequestLimiter.forEach((v, k) => {
      if (v.resetAt < now) resetRequestLimiter.delete(k);
    });
  }

  if (!record || record.resetAt < now) {
    resetRequestLimiter.set(key, { count: 1, resetAt: now + RESET_RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: RESET_RATE_LIMIT_MAX - 1, resetIn: RESET_RATE_LIMIT_WINDOW };
  }

  if (record.count >= RESET_RATE_LIMIT_MAX) {
    return { allowed: false, remainingAttempts: 0, resetIn: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remainingAttempts: RESET_RATE_LIMIT_MAX - record.count, resetIn: record.resetAt - now };
}

function generateResetToken(): string {
  // Generate cryptographically secure random token
  return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < 8) {
    return { valid: false, message: "A senha deve ter pelo menos 8 caracteres" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "A senha deve conter pelo menos uma letra maiúscula" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "A senha deve conter pelo menos uma letra minúscula" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "A senha deve conter pelo menos um número" };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: "A senha deve conter pelo menos um caractere especial" };
  }
  return { valid: true };
}

async function checkPasswordHistory(userId: string, newPassword: string): Promise<boolean> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) return true;

  const passwordHistory = user[0].passwordHistory ? JSON.parse(user[0].passwordHistory) : [];

  // Check if password was used in last 5 passwords
  for (const oldHash of passwordHistory.slice(0, 5)) {
    if (await bcrypt.compare(newPassword, oldHash)) {
      return false; // Password was previously used
    }
  }

  return true;
}

async function updatePasswordHistory(userId: string, newPasswordHash: string): Promise<void> {
  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) return;

  const passwordHistory = user[0].passwordHistory ? JSON.parse(user[0].passwordHistory) : [];
  passwordHistory.unshift(newPasswordHash);

  // Keep only last 5 passwords
  const updatedHistory = passwordHistory.slice(0, 5);

  await db.update(users)
    .set({ passwordHistory: JSON.stringify(updatedHistory) })
    .where(eq(users.id, userId));
}

export function registerPasswordResetRoutes(app: Express) {

  // Request password reset
  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Rate limiting
      const rateLimit = checkResetRateLimit(normalizedEmail);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: "Muitas solicitações. Tente novamente mais tarde.",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        });
      }

      // Find user by email
      const userList = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

      // Always return success to prevent email enumeration
      if (!userList.length) {
        return res.json({
          success: true,
          message: "Se o email existir, você receberá instruções para redefinir sua senha"
        });
      }

      const user = userList[0];

      // Check if account is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return res.json({
          success: true,
          message: "Se o email existir, você receberá instruções para redefinir sua senha"
        });
      }

      // Generate reset token
      const resetToken = generateResetToken();
      const hashedToken = hashToken(resetToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save token to database
      await db.update(users)
        .set({
          passwordResetToken: hashedToken,
          passwordResetExpires: expiresAt.toISOString(),
        })
        .where(eq(users.id, user.id));

      // Send reset email
      await sendPasswordResetEmail(user.email, user.name, resetToken);

      // Audit log
      await createAuditLog(
        user.tenantId,
        user.id,
        'password_reset_requested',
        'user',
        user.id,
        null,
        { email: user.email },
        req
      );

      res.json({
        success: true,
        message: "Se o email existir, você receberá instruções para redefinir sua senha"
      });

    } catch (error: any) {
      console.error('Password reset request error:', error);
      res.status(500).json({ error: "Erro ao processar solicitação" });
    }
  });

  // Validate reset token
  app.get("/api/auth/reset-token/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token || token.length !== 64) {
        return res.status(400).json({ error: "Token inválido" });
      }

      const hashedToken = hashToken(token);
      const now = new Date().toISOString();

      const userList = await db.select()
        .from(users)
        .where(
          and(
            eq(users.passwordResetToken, hashedToken),
            gt(users.passwordResetExpires, now)
          )
        )
        .limit(1);

      if (!userList.length) {
        return res.status(400).json({
          error: "Token inválido ou expirado",
          expired: true
        });
      }

      res.json({
        valid: true,
        email: userList[0].email
      });

    } catch (error: any) {
      console.error('Token validation error:', error);
      res.status(500).json({ error: "Erro ao validar token" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token e senha são obrigatórios" });
      }

      if (token.length !== 64) {
        return res.status(400).json({ error: "Token inválido" });
      }

      // Validate password strength
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.message });
      }

      const hashedToken = hashToken(token);
      const now = new Date().toISOString();

      // Find user with valid token
      const userList = await db.select()
        .from(users)
        .where(
          and(
            eq(users.passwordResetToken, hashedToken),
            gt(users.passwordResetExpires, now)
          )
        )
        .limit(1);

      if (!userList.length) {
        return res.status(400).json({
          error: "Token inválido ou expirado",
          expired: true
        });
      }

      const user = userList[0];

      // Check password history
      const isPasswordReused = !(await checkPasswordHistory(user.id, password));
      if (isPasswordReused) {
        return res.status(400).json({
          error: "Esta senha foi usada recentemente. Escolha uma senha diferente."
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12); // P2 Security Fix: Increased from 10 to 12 rounds

      // Update password and clear reset token
      await db.update(users)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(users.id, user.id));

      // Update password history
      await updatePasswordHistory(user.id, hashedPassword);

      // Send confirmation email
      await sendPasswordChangedEmail(user.email, user.name);

      // Audit log
      await createAuditLog(
        user.tenantId,
        user.id,
        'password_changed',
        'user',
        user.id,
        null,
        { method: 'reset_token' },
        req
      );

      // Log successful password reset
      await db.insert(loginHistory).values({
        id: nanoid(),
        userId: user.id,
        email: user.email,
        success: true,
        failureReason: null,
        ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({
        success: true,
        message: "Senha redefinida com sucesso"
      });

    } catch (error: any) {
      console.error('Password reset error:', error);
      res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  });

  console.log("Password reset routes registered");
}
