import Redis, { Redis as RedisClient, RedisOptions } from 'ioredis';
import * as Sentry from '@sentry/node';

let redisClient: RedisClient | null = null;
let isShuttingDown = false;

const defaultOptions: RedisOptions = {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err: Error) {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
  enableReadyCheck: true,
  lazyConnect: false,
};

/**
 * Initialize Redis connection
 * Uses REDIS_URL from environment or falls back to local Redis
 */
export async function initializeRedis(): Promise<RedisClient> {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  try {
    redisClient = new Redis(redisUrl, {
      ...defaultOptions,
      // Connection pool settings
      maxLoadingRetryTime: 10000,
      connectionName: 'imobibase-main',
    });

    // Handle connection events
    redisClient.on('connect', () => {
      console.log('[Redis] Connected to Redis server');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Redis client is ready');
    });

    redisClient.on('error', (err: Error) => {
      console.error('[Redis] Redis client error:', err);
      Sentry.captureException(err, {
        tags: { component: 'redis-client' },
      });
    });

    redisClient.on('close', () => {
      console.log('[Redis] Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      console.log('[Redis] Redis client reconnecting...');
    });

    redisClient.on('end', () => {
      console.log('[Redis] Redis connection ended');
      if (!isShuttingDown) {
        redisClient = null;
      }
    });

    // Wait for connection to be ready
    await redisClient.ping();
    console.log('[Redis] Connection verified with PING');

    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize Redis:', error);
    Sentry.captureException(error, {
      tags: { component: 'redis-client', action: 'initialize' },
    });
    throw error;
  }
}

/**
 * Get the Redis client instance
 * Throws if not initialized
 */
export function getRedisClient(): RedisClient {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  try {
    if (!redisClient) {
      return { status: 'unhealthy', error: 'Redis client not initialized' };
    }

    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    return {
      status: 'healthy',
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get Redis connection info
 */
export async function getRedisInfo(): Promise<{
  connected: boolean;
  mode?: string;
  version?: string;
  usedMemory?: string;
  connectedClients?: number;
  uptime?: number;
}> {
  try {
    if (!redisClient) {
      return { connected: false };
    }

    const info = await redisClient.info();
    const lines = info.split('\r\n');
    const infoObj: Record<string, string> = {};

    for (const line of lines) {
      const [key, value] = line.split(':');
      if (key && value) {
        infoObj[key] = value;
      }
    }

    return {
      connected: true,
      mode: infoObj['redis_mode'],
      version: infoObj['redis_version'],
      usedMemory: infoObj['used_memory_human'],
      connectedClients: parseInt(infoObj['connected_clients'] || '0'),
      uptime: parseInt(infoObj['uptime_in_seconds'] || '0'),
    };
  } catch (error) {
    console.error('[Redis] Failed to get info:', error);
    return { connected: false };
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  isShuttingDown = true;

  try {
    console.log('[Redis] Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Connection closed successfully');
  } catch (error) {
    console.error('[Redis] Error closing Redis connection:', error);
    // Force disconnect if graceful quit fails
    if (redisClient) {
      redisClient.disconnect();
      redisClient = null;
    }
  }
}

/**
 * Create a new Redis client for specific use (e.g., pub/sub)
 */
export function createRedisClient(name?: string): RedisClient {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const client = new Redis(redisUrl, {
    ...defaultOptions,
    connectionName: name || `imobibase-${Date.now()}`,
  });

  client.on('error', (err: Error) => {
    console.error(`[Redis:${name}] Error:`, err);
    Sentry.captureException(err, {
      tags: { component: 'redis-client', name },
    });
  });

  return client;
}
