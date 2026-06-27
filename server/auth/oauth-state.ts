/**
 * OAuth state (CSRF) handling — STATELESS via signed cookie.
 *
 * O store antigo era um Map em memória, que NÃO funciona em serverless
 * multi-instância: o state gravado num lambda some no callback que cai em
 * outra instância (state inválido intermitente / brecha de CSRF). Aqui o state
 * é assinado com HMAC-SHA256 (SESSION_SECRET) e guardado num cookie httpOnly de
 * curta duração — verificável por qualquer instância, sem estado compartilhado.
 */

import type { Request, Response } from "express";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const COOKIE_PREFIX = "oauth_state_";

function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.AUTH_SECRET ||
    "dev-oauth-state-secret-change-me"
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function cookieName(provider: string): string {
  return `${COOKIE_PREFIX}${provider}`;
}

interface StatePayload {
  state: string;
  redirectUrl?: string;
  /** Metadados assinados (ex.: userId/tenantId no connect de Calendar). */
  meta?: Record<string, string>;
  exp: number;
}

/**
 * Gera o state, grava o cookie assinado e retorna o valor do `state` para a URL
 * de autorização do provedor. `meta` é assinado junto (não confiar em dados não
 * assinados no callback).
 */
export function issueOAuthState(
  res: Response,
  provider: string,
  redirectUrl?: string,
  meta?: Record<string, string>,
): string {
  const state = randomBytes(24).toString("base64url");
  const payload: StatePayload = {
    state,
    redirectUrl,
    meta,
    exp: Date.now() + STATE_TTL_MS,
  };
  const body = base64url(JSON.stringify(payload));
  const token = `${body}.${sign(body)}`;

  res.cookie(cookieName(provider), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // enviado no top-level GET de volta do provedor
    maxAge: STATE_TTL_MS,
    path: "/",
  });

  return state;
}

/**
 * Valida o state do callback contra o cookie assinado. Sempre limpa o cookie.
 * Retorna { valid, redirectUrl }.
 */
export function consumeOAuthState(
  req: Request,
  res: Response,
  provider: string,
  state: unknown,
): { valid: boolean; redirectUrl?: string; meta?: Record<string, string> } {
  const name = cookieName(provider);
  const raw = (req as any).cookies?.[name] as string | undefined;
  // Limpa o cookie independentemente do resultado (single-use).
  res.clearCookie(name, { path: "/" });

  if (!raw || typeof state !== "string" || !state) {
    return { valid: false };
  }

  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return { valid: false };

  const body = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!safeEqual(sig, sign(body))) {
    return { valid: false };
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { valid: false };
  }

  if (!payload?.state || payload.exp < Date.now()) {
    return { valid: false };
  }
  if (!safeEqual(payload.state, state)) {
    return { valid: false };
  }

  return { valid: true, redirectUrl: payload.redirectUrl, meta: payload.meta };
}
