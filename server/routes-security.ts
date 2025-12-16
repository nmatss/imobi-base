/**
 * Security & Compliance Routes
 * - 2FA/TOTP Authentication
 * - Audit Logs
 */

import type { Express, Request, Response } from "express";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { nanoid } from "nanoid";
import { db } from "./db";
import { twoFactorAuth, auditLogs } from "@shared/schema-sqlite";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// TOTP implementation (RFC 6238)
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function generateBase32Secret(length = 32): string {
  const buffer = randomBytes(length);
  let secret = '';
  for (let i = 0; i < buffer.length; i++) {
    secret += BASE32_CHARS[buffer[i] % 32];
  }
  return secret;
}

function base32Decode(encoded: string): Buffer {
  encoded = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bits: number[] = [];

  for (const char of encoded) {
    const val = BASE32_CHARS.indexOf(char);
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i + j];
    }
    bytes.push(byte);
  }

  return Buffer.from(bytes);
}

function generateTOTP(secret: string, timeStep = 30, digits = 6): string {
  const time = Math.floor(Date.now() / 1000 / timeStep);
  const timeBuffer = Buffer.alloc(8);
  timeBuffer.writeBigInt64BE(BigInt(time));

  const key = base32Decode(secret);
  const hmac = createHash('sha1');

  // Simple HMAC-SHA1 for TOTP
  const blockSize = 64;
  let keyPadded = key;
  if (key.length > blockSize) {
    keyPadded = createHash('sha1').update(key).digest();
  }
  if (keyPadded.length < blockSize) {
    keyPadded = Buffer.concat([keyPadded, Buffer.alloc(blockSize - keyPadded.length)]);
  }

  const ipad = Buffer.alloc(blockSize);
  const opad = Buffer.alloc(blockSize);
  for (let i = 0; i < blockSize; i++) {
    ipad[i] = keyPadded[i] ^ 0x36;
    opad[i] = keyPadded[i] ^ 0x5c;
  }

  const inner = createHash('sha1').update(Buffer.concat([ipad, timeBuffer])).digest();
  const hash = createHash('sha1').update(Buffer.concat([opad, inner])).digest();

  const offset = hash[hash.length - 1] & 0xf;
  const binary = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);

  const otp = binary % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

function verifyTOTP(secret: string, token: string, window = 1): boolean {
  for (let i = -window; i <= window; i++) {
    const time = Math.floor(Date.now() / 1000 / 30) + i;
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));

    const key = base32Decode(secret);
    const blockSize = 64;
    let keyPadded = key;
    if (key.length > blockSize) {
      keyPadded = createHash('sha1').update(key).digest();
    }
    if (keyPadded.length < blockSize) {
      keyPadded = Buffer.concat([keyPadded, Buffer.alloc(blockSize - keyPadded.length)]);
    }

    const ipad = Buffer.alloc(blockSize);
    const opad = Buffer.alloc(blockSize);
    for (let j = 0; j < blockSize; j++) {
      ipad[j] = keyPadded[j] ^ 0x36;
      opad[j] = keyPadded[j] ^ 0x5c;
    }

    const inner = createHash('sha1').update(Buffer.concat([ipad, timeBuffer])).digest();
    const hash = createHash('sha1').update(Buffer.concat([opad, inner])).digest();

    const offset = hash[hash.length - 1] & 0xf;
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);

    const otp = (binary % 1000000).toString().padStart(6, '0');
    if (otp === token) return true;
  }
  return false;
}

function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

function hashBackupCode(code: string): string {
  return createHash('sha256').update(code.toUpperCase()).digest('hex');
}

// Audit log helper
export async function createAuditLog(
  tenantId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  oldValues: any,
  newValues: any,
  req?: Request
) {
  try {
    await db.insert(auditLogs).values({
      id: nanoid(),
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      ipAddress: req?.ip || req?.headers['x-forwarded-for']?.toString() || null,
      userAgent: req?.headers['user-agent'] || null,
      metadata: null,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// Input validation helpers
const isValidToken = (token: string): boolean => {
  return typeof token === 'string' && /^\d{6}$/.test(token);
};

const isValidBackupCode = (code: string): boolean => {
  return typeof code === 'string' && /^[A-Z0-9]{8}$/.test(code.toUpperCase());
};

const sanitizeString = (str: any, maxLength = 255): string | null => {
  if (typeof str !== 'string') return null;
  return str.trim().slice(0, maxLength);
};

// Timing-safe string comparison
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against itself to maintain constant time
    const dummy = Buffer.from(a);
    timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Simple in-memory rate limiter for 2FA endpoints
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;

function checkRateLimit(key: string): { allowed: boolean; remainingAttempts: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up old entries periodically
  if (Math.random() < 0.01) {
    rateLimitStore.forEach((v, k) => {
      if (v.resetAt < now) rateLimitStore.delete(k);
    });
  }

  if (!record || record.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - 1, resetIn: RATE_LIMIT_WINDOW };
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0, resetIn: record.resetAt - now };
  }

  record.count++;
  return { allowed: true, remainingAttempts: RATE_LIMIT_MAX_ATTEMPTS - record.count, resetIn: record.resetAt - now };
}

function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

export function registerSecurityRoutes(app: Express) {
  // Middleware to check authentication
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    next();
  };

  // ==================== 2FA ROUTES ====================

  // Setup 2FA - Generate secret
  app.post("/api/auth/2fa/setup", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Check if already has 2FA
      const existing = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId));
      if (existing.length > 0 && existing[0].isEnabled) {
        return res.status(400).json({ error: "2FA já está ativo" });
      }

      // Generate new secret
      const secret = generateBase32Secret(20);
      const backupCodes = generateBackupCodes(10);
      const hashedCodes = backupCodes.map(hashBackupCode);

      // Save or update
      if (existing.length > 0) {
        await db.update(twoFactorAuth)
          .set({
            secret,
            backupCodes: JSON.stringify(hashedCodes),
            isEnabled: false,
            verifiedAt: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(twoFactorAuth.userId, userId));
      } else {
        await db.insert(twoFactorAuth).values({
          id: nanoid(),
          userId,
          secret,
          backupCodes: JSON.stringify(hashedCodes),
          isEnabled: false,
        });
      }

      // Generate QR code URL (otpauth format)
      const issuer = 'ImobiBase';
      const accountName = req.user!.email;
      const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      res.json({
        secret,
        otpauthUrl,
        backupCodes, // Show only once during setup
        qrCodeData: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
      });

      await createAuditLog(req.user!.tenantId, userId, 'setup_2fa', 'user', userId, null, { enabled: false }, req);
    } catch (error: any) {
      console.error('2FA setup error:', error);
      res.status(500).json({ error: "Erro ao configurar 2FA" });
    }
  });

  // Verify and enable 2FA
  app.post("/api/auth/2fa/verify", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { token } = req.body;

      // Rate limiting
      const rateLimitKey = `2fa_verify:${userId}`;
      const rateLimit = checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: "Muitas tentativas. Tente novamente mais tarde.",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        });
      }

      if (!token || !isValidToken(token)) {
        return res.status(400).json({ error: "Token inválido. Deve conter 6 dígitos." });
      }

      const tfa = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId));
      if (tfa.length === 0) {
        return res.status(400).json({ error: "2FA não configurado" });
      }

      const isValid = verifyTOTP(tfa[0].secret, token);
      if (!isValid) {
        return res.status(400).json({
          error: "Código inválido",
          remainingAttempts: rateLimit.remainingAttempts
        });
      }

      // Success - reset rate limit
      resetRateLimit(rateLimitKey);

      // Enable 2FA
      await db.update(twoFactorAuth)
        .set({
          isEnabled: true,
          verifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(twoFactorAuth.userId, userId));

      await createAuditLog(req.user!.tenantId, userId, 'enable_2fa', 'user', userId, { enabled: false }, { enabled: true }, req);

      res.json({ success: true, message: "2FA ativado com sucesso" });
    } catch (error: any) {
      console.error('2FA verify error:', error);
      res.status(500).json({ error: "Erro ao verificar 2FA" });
    }
  });

  // Disable 2FA
  app.post("/api/auth/2fa/disable", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { token, backupCode } = req.body;

      // Rate limiting
      const rateLimitKey = `2fa_disable:${userId}`;
      const rateLimit = checkRateLimit(rateLimitKey);
      if (!rateLimit.allowed) {
        return res.status(429).json({
          error: "Muitas tentativas. Tente novamente mais tarde.",
          retryAfter: Math.ceil(rateLimit.resetIn / 1000)
        });
      }

      // Validate input - must provide either token or backup code
      if (!token && !backupCode) {
        return res.status(400).json({ error: "Token ou código de backup é obrigatório" });
      }

      if (token && !isValidToken(token)) {
        return res.status(400).json({ error: "Token inválido. Deve conter 6 dígitos." });
      }

      if (backupCode && !isValidBackupCode(backupCode)) {
        return res.status(400).json({ error: "Código de backup inválido" });
      }

      const tfa = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId));
      if (tfa.length === 0 || !tfa[0].isEnabled) {
        return res.status(400).json({ error: "2FA não está ativo" });
      }

      // Verify with token or backup code
      let isValid = false;
      if (token) {
        isValid = verifyTOTP(tfa[0].secret, token);
      } else if (backupCode) {
        const hashedCode = hashBackupCode(backupCode);
        const storedCodes = JSON.parse(tfa[0].backupCodes || '[]');
        // Use timing-safe comparison for backup codes
        isValid = storedCodes.some((c: string) => timingSafeCompare(c, hashedCode));

        // Remove used backup code
        if (isValid) {
          const newCodes = storedCodes.filter((c: string) => !timingSafeCompare(c, hashedCode));
          await db.update(twoFactorAuth)
            .set({ backupCodes: JSON.stringify(newCodes) })
            .where(eq(twoFactorAuth.userId, userId));
        }
      }

      if (!isValid) {
        return res.status(400).json({
          error: "Código inválido",
          remainingAttempts: rateLimit.remainingAttempts
        });
      }

      // Success - reset rate limit
      resetRateLimit(rateLimitKey);

      // Disable 2FA
      await db.update(twoFactorAuth)
        .set({
          isEnabled: false,
          verifiedAt: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(twoFactorAuth.userId, userId));

      await createAuditLog(req.user!.tenantId, userId, 'disable_2fa', 'user', userId, { enabled: true }, { enabled: false }, req);

      res.json({ success: true, message: "2FA desativado" });
    } catch (error: any) {
      console.error('2FA disable error:', error);
      res.status(500).json({ error: "Erro ao desativar 2FA" });
    }
  });

  // Get 2FA status
  app.get("/api/auth/2fa/status", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const tfa = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId));

      if (tfa.length === 0) {
        return res.json({ enabled: false, configured: false });
      }

      const backupCodesCount = JSON.parse(tfa[0].backupCodes || '[]').length;

      res.json({
        enabled: tfa[0].isEnabled,
        configured: true,
        verifiedAt: tfa[0].verifiedAt,
        backupCodesRemaining: backupCodesCount,
      });
    } catch (error: any) {
      console.error('2FA status error:', error);
      res.status(500).json({ error: "Erro ao verificar status 2FA" });
    }
  });

  // Validate 2FA token (for login flow)
  app.post("/api/auth/2fa/validate", async (req, res) => {
    try {
      const { userId, token, backupCode } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "Usuário não informado" });
      }

      const tfa = await db.select().from(twoFactorAuth).where(eq(twoFactorAuth.userId, userId));
      if (tfa.length === 0 || !tfa[0].isEnabled) {
        return res.json({ required: false });
      }

      if (!token && !backupCode) {
        return res.json({ required: true });
      }

      let isValid = false;
      if (token) {
        isValid = verifyTOTP(tfa[0].secret, token);
      } else if (backupCode) {
        const hashedCode = hashBackupCode(backupCode);
        const storedCodes = JSON.parse(tfa[0].backupCodes || '[]');
        isValid = storedCodes.includes(hashedCode);

        if (isValid) {
          const newCodes = storedCodes.filter((c: string) => c !== hashedCode);
          await db.update(twoFactorAuth)
            .set({ backupCodes: JSON.stringify(newCodes) })
            .where(eq(twoFactorAuth.userId, userId));
        }
      }

      res.json({ valid: isValid, required: true });
    } catch (error: any) {
      console.error('2FA validate error:', error);
      res.status(500).json({ error: "Erro ao validar 2FA" });
    }
  });

  // ==================== AUDIT LOG ROUTES ====================

  // Get audit logs
  app.get("/api/audit-logs", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const { entityType, entityId, action, userId, startDate, endDate, limit = 50, page = 1 } = req.query;

      const conditions = [eq(auditLogs.tenantId, tenantId)];

      if (entityType) {
        conditions.push(eq(auditLogs.entityType, entityType as string));
      }
      if (entityId) {
        conditions.push(eq(auditLogs.entityId, entityId as string));
      }
      if (action) {
        conditions.push(eq(auditLogs.action, action as string));
      }
      if (userId) {
        conditions.push(eq(auditLogs.userId, userId as string));
      }
      if (startDate) {
        conditions.push(gte(auditLogs.createdAt, startDate as string));
      }
      if (endDate) {
        conditions.push(lte(auditLogs.createdAt, endDate as string));
      }

      // Get total count
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(auditLogs)
        .where(and(...conditions));
      const total = countResult[0]?.count || 0;

      // Get paginated logs
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(100, Math.max(1, Number(limit)));
      const offset = (pageNum - 1) * limitNum;

      const logs = await db.select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limitNum)
        .offset(offset);

      res.json({ logs, total });
    } catch (error: any) {
      console.error('Audit logs error:', error);
      res.status(500).json({ error: "Erro ao buscar logs" });
    }
  });

  // Get audit log for specific entity
  app.get("/api/audit-logs/entity/:entityType/:entityId", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const { entityType, entityId } = req.params;

      const logs = await db.select()
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          eq(auditLogs.entityType, entityType),
          eq(auditLogs.entityId, entityId)
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(50);

      res.json(logs);
    } catch (error: any) {
      console.error('Entity audit log error:', error);
      res.status(500).json({ error: "Erro ao buscar histórico" });
    }
  });

  // Export audit logs
  app.get("/api/audit-logs/export", requireAuth, async (req, res) => {
    try {
      const tenantId = req.user!.tenantId;
      const { startDate, endDate, format = 'json' } = req.query;

      const conditions = [eq(auditLogs.tenantId, tenantId)];
      if (startDate) conditions.push(gte(auditLogs.createdAt, startDate as string));
      if (endDate) conditions.push(lte(auditLogs.createdAt, endDate as string));

      const logs = await db.select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt));

      await createAuditLog(tenantId, req.user!.id, 'export', 'audit_logs', null, null, { count: logs.length }, req);

      if (format === 'csv') {
        type LogType = typeof logs[number];
        const csv = [
          'Data,Usuário,Ação,Entidade,ID,IP',
          ...logs.map((l: LogType) => `"${l.createdAt}","${l.userId || ''}","${l.action}","${l.entityType}","${l.entityId || ''}","${l.ipAddress || ''}"`)
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=audit-logs.csv');
        return res.send(csv);
      }

      res.json(logs);
    } catch (error: any) {
      console.error('Export audit logs error:', error);
      res.status(500).json({ error: "Erro ao exportar logs" });
    }
  });

  console.log("Security routes registered (2FA, Audit Logs)");
}
