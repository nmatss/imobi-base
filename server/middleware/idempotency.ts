/**
 * Idempotency Middleware (ACT-3 / ESC-2)
 *
 * Previne processamento duplicado de pagamentos (PIX/boleto) usando a chave do
 * header `Idempotency-Key`. O backing store primario e o Redis (SET NX + TTL),
 * que deduplica entre as N instancias serverless da Vercel — o Map em processo
 * antigo so deduplicava dentro de uma instancia e permitia dupla cobranca apos
 * reciclagem/fan-out.
 *
 * Semantica:
 *   - Primeira requisicao com a chave: reserva no Redis (estado "pending"),
 *     segue o fluxo e, na resposta, persiste o resultado (status + body) por 7 dias.
 *   - Requisicao repetida com resultado ja persistido: retorna o resultado cacheado.
 *   - Requisicao repetida ainda em voo (pending): responde 409 (em processamento).
 *   - Sem Redis configurado (dev/single-instance) OU erro de Redis em runtime:
 *     cai para o Map em memoria (degradado, dedup so intra-instancia) e registra
 *     o downgrade no Sentry para ser observavel. Em multi-instancia isso reabre a
 *     janela de dupla cobranca; por isso o alerta — ver runbook OP.
 */

import type { Request, Response, NextFunction } from "express";
import { getRedisClient } from "../cache/redis-client";
import * as Sentry from "@sentry/node";

interface CachedResponse {
  statusCode: number;
  body: any;
  createdAt: number;
}

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias (>= janela exigida pelo audit)
const TTL_SEC = Math.floor(TTL_MS / 1000);
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // limpeza do fallback a cada hora
const REDIS_KEY_PREFIX = "idem:";
const PENDING = "__pending__";

// Fallback em memoria (apenas quando Redis indisponivel).
const memoryCache = new Map<string, CachedResponse>();

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (now - entry.createdAt > TTL_MS) {
      memoryCache.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) cleanupTimer.unref();

let degradedWarned = false;
function warnDegraded(reason: string, error?: unknown): void {
  // Evita flood: registra a transicao para o modo degradado uma vez por janela.
  if (!degradedWarned) {
    degradedWarned = true;
    Sentry.captureMessage(
      `Idempotency em modo degradado (memoria): ${reason}. Risco de dupla cobranca em multi-instancia.`,
      "warning",
    );
    setTimeout(() => {
      degradedWarned = false;
    }, CLEANUP_INTERVAL_MS).unref?.();
  }
  if (error) {
    Sentry.captureException(error, {
      tags: { component: "idempotency", action: "redis-degraded" },
    });
  }
}

function buildKey(req: Request, idempotencyKey: string): string {
  // Escopo por rota para evitar colisao de chave entre endpoints distintos.
  return `${REDIS_KEY_PREFIX}${req.method}:${req.path}:${idempotencyKey}`;
}

function memoryIdempotency(
  req: Request,
  res: Response,
  next: NextFunction,
  key: string,
): void {
  const cached = memoryCache.get(key);
  if (cached) {
    res.status(cached.statusCode).json(cached.body);
    return;
  }
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    memoryCache.set(key, { statusCode: res.statusCode, body, createdAt: Date.now() });
    return originalJson(body);
  };
  next();
}

async function handle(req: Request, res: Response, next: NextFunction): Promise<void> {
  const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

  // Sem header — segue normal (backward compatible).
  if (!idempotencyKey) {
    next();
    return;
  }

  const key = buildKey(req, idempotencyKey);

  let redis: ReturnType<typeof getRedisClient> | null = null;
  try {
    redis = getRedisClient();
  } catch {
    // Redis nao configurado (dev/single-instance): fallback silencioso.
    memoryIdempotency(req, res, next, key);
    return;
  }

  try {
    // Reserva atomica entre instancias: so a primeira requisicao consegue o SET NX.
    const reserved = await redis.set(key, PENDING, "EX", TTL_SEC, "NX");

    if (reserved === null) {
      const existing = await redis.get(key);
      if (existing && existing !== PENDING) {
        const parsed = JSON.parse(existing) as { statusCode: number; body: any };
        res.status(parsed.statusCode).json(parsed.body);
        return;
      }
      // Ainda em processamento numa requisicao concorrente.
      res.status(409).json({
        error: "Requisicao identica ja esta em processamento",
        code: "IDEMPOTENCY_IN_PROGRESS",
      });
      return;
    }

    // Reservamos a chave: persistimos o resultado final ao responder.
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      const payload = JSON.stringify({ statusCode: res.statusCode, body });
      redis!.set(key, payload, "EX", TTL_SEC).catch((err) => {
        warnDegraded("falha ao persistir resposta", err);
      });
      return originalJson(body);
    };
    next();
  } catch (err) {
    // Erro de Redis em runtime: degrada para memoria, mas torna observavel.
    warnDegraded("erro de runtime do Redis", err);
    memoryIdempotency(req, res, next, key);
  }
}

/**
 * Middleware Express. Erros assincronos sao encaminhados ao next() para nunca
 * virarem unhandledRejection.
 */
export function idempotencyCheck(req: Request, res: Response, next: NextFunction): void {
  handle(req, res, next).catch(next);
}
