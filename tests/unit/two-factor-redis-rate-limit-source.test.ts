import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'server/routes-security.ts'),
  'utf8'
);

describe('2FA distributed rate limit source guards', () => {
  it('uses Redis for 2FA rate limiting when REDIS_URL is configured', () => {
    expect(source).toContain('import { getRedisClient } from "./cache/redis-client";');
    expect(source).toContain('function getTwoFactorRedis()');
    expect(source).toContain('if (!process.env.REDIS_URL)');
    expect(source).toContain('const count = await redis.incr(redisKey);');
    expect(source).toContain('await redis.pexpire(redisKey, RATE_LIMIT_WINDOW);');
    expect(source).toContain('const ttl = await redis.pttl(redisKey);');
    expect(source).toContain('await redis.del(redisRateLimitKey(key));');
  });

  it('keeps a process-local fallback for dev/test or Redis outage', () => {
    expect(source).toContain('const rateLimitStore = new Map');
    expect(source).toContain('return checkMemoryRateLimit(key);');
    expect(source).toContain('falling back to process-local memory');
  });

  it('awaits rate limit checks and resets in all 2FA validation paths', () => {
    expect(source.match(/await checkRateLimit\(rateLimitKey\)/g)).toHaveLength(3);
    expect(source.match(/await resetRateLimit\(rateLimitKey\)/g)).toHaveLength(3);
  });
});
