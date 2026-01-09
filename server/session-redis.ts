import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { getRedisClient } from './cache/redis-client';

/**
 * Create Redis-based session store
 * Much faster than PostgreSQL for session storage
 */
export function createRedisSessionStore(): session.Store {
  const redisClient = getRedisClient();

  const store = new RedisStore({
    client: redisClient,
    prefix: 'sess:', // Session key prefix in Redis
    ttl: 24 * 60 * 60, // 24 hours in seconds
  });

  console.log('[SessionRedis] Redis session store created');

  return store;
}

/**
 * Get session middleware configuration
 */
export function getSessionConfig(store: session.Store): session.SessionOptions {
  // In production, SESSION_SECRET must be set - fail fast if missing
  const sessionSecret = process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === 'production' && !sessionSecret) {
    throw new Error(
      '🚨 CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is required in production. ' +
      'Generate a strong random secret and set it before starting the server.'
    );
  }

  // In development, use a default secret but warn
  if (!sessionSecret) {
    console.warn('⚠️  Using default SESSION_SECRET in development. This is insecure for production.');
  }

  return {
    store,
    secret: sessionSecret || 'dev-secret-key-insecure-do-not-use-in-production',
    resave: false,
    saveUninitialized: false,
    name: 'imobibase.sid',
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
    },
  };
}
