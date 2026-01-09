/**
 * Email Verification Module
 * Handles email verification flow for new user registrations
 */

import type { Express, Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import { nanoid } from "nanoid";
import { db } from "../db";
import { users } from "@shared/schema-sqlite";
import { eq, and, gt } from "drizzle-orm";
import { sendVerificationEmail } from "./email-service";
import { createAuditLog } from "../routes-security";

// Rate limiting for verification email resends
const resendLimiter = new Map<string, { count: number; resetAt: number }>();
const RESEND_RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RESEND_RATE_LIMIT_MAX = 3; // Max 3 resends per hour

function checkResendRateLimit(email: string): { allowed: boolean; remainingAttempts: number; resetIn: number } {
  const now = Date.now();
  const key = `resend:${email.toLowerCase()}`;
  const record = resendLimiter.get(key);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    resendLimiter.forEach((v, k) => {
      if (v.resetAt < now) resendLimiter.delete(k);
    });
  }

  if (!record || record.resetAt < now) {
    resendLimiter.set(key, { count: 1, resetAt: now + RESEND_RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: RESEND_RATE_LIMIT_MAX - 1, resetIn: RESEND_RATE_LIMIT_WINDOW };
  }

  if (record.count >= RESEND_RATE_LIMIT_MAX) {
    return { allowed: false, remainingAttempts: 0, resetIn: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remainingAttempts: RESEND_RATE_LIMIT_MAX - record.count, resetIn: record.resetAt - now };
}

function generateVerificationToken(): string {
  // Generate cryptographically secure random token
  return randomBytes(32).toString('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function sendVerificationTokenToUser(userId: string, email: string, name: string): Promise<void> {
  const verificationToken = generateVerificationToken();
  const hashedToken = hashToken(verificationToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save token to database
  await db.update(users)
    .set({
      verificationToken: hashedToken,
      verificationTokenExpires: expiresAt.toISOString(),
    })
    .where(eq(users.id, userId));

  // Send verification email
  await sendVerificationEmail(email, name, verificationToken);
}

export function registerEmailVerificationRoutes(app: Express) {

  // Verify email with token
  app.post("/api/auth/verify-email/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      if (!token || token.length !== 64) {
        return res.status(400).json({ error: "Token inválido" });
      }

      const hashedToken = hashToken(token);
      const now = new Date().toISOString();

      // Find user with valid token
      const userList = await db.select()
        .from(users)
        .where(
          and(
            eq(users.verificationToken, hashedToken),
            gt(users.verificationTokenExpires, now)
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

      // Check if already verified
      if (user.emailVerified) {
        return res.json({
          success: true,
          message: "Email já verificado",
          alreadyVerified: true
        });
      }

      // Mark email as verified
      await db.update(users)
        .set({
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpires: null,
        })
        .where(eq(users.id, user.id));

      // Audit log
      await createAuditLog(
        user.tenantId,
        user.id,
        'email_verified',
        'user',
        user.id,
        { emailVerified: false },
        { emailVerified: true },
        req
      );

      res.json({
        success: true,
        message: "Email verificado com sucesso"
      });

    } catch (error: any) {
      console.error('Email verification error:', error);
      res.status(500).json({ error: "Erro ao verificar email" });
    }
  });

  // Resend verification email
  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email é obrigatório" });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Rate limiting
      const rateLimit = checkResendRateLimit(normalizedEmail);
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
          message: "Se o email existir e não estiver verificado, você receberá um novo link de verificação"
        });
      }

      const user = userList[0];

      // Check if already verified
      if (user.emailVerified) {
        return res.json({
          success: true,
          message: "Email já está verificado",
          alreadyVerified: true
        });
      }

      // Generate and send new verification token
      await sendVerificationTokenToUser(user.id, user.email, user.name);

      // Audit log
      await createAuditLog(
        user.tenantId,
        user.id,
        'verification_email_resent',
        'user',
        user.id,
        null,
        { email: user.email },
        req
      );

      res.json({
        success: true,
        message: "Email de verificação reenviado com sucesso"
      });

    } catch (error: any) {
      console.error('Resend verification error:', error);
      res.status(500).json({ error: "Erro ao reenviar email de verificação" });
    }
  });

  // Check verification status (for authenticated users)
  app.get("/api/auth/verification-status", async (req: Request, res: Response) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated?.() || !req.user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const userId = req.user.id;

      const userList = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!userList.length) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      const user = userList[0];

      res.json({
        emailVerified: user.emailVerified || false,
        email: user.email,
      });

    } catch (error: any) {
      console.error('Verification status error:', error);
      res.status(500).json({ error: "Erro ao verificar status" });
    }
  });

  console.log("Email verification routes registered");
}
