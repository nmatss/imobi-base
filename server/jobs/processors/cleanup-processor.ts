import { Job } from 'bullmq';
import { CleanupJobData } from '../queue-manager';
import { getRedisClient } from '../../cache/redis-client';
import * as Sentry from '@sentry/node';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Core cleanup logic, callable directly (inline on serverless) or from the
 * BullMQ worker. Returns the number of items deleted.
 */
export async function runCleanupTarget(
  target: CleanupJobData['target'],
  olderThan = 30,
): Promise<number> {
  console.log(
    `[CleanupProcessor] Cleaning up ${target} older than ${olderThan} days`,
  );

  const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);
  let itemsDeleted = 0;

  switch (target) {
    case 'sessions':
      itemsDeleted = await cleanupSessions();
      break;
    case 'logs':
      itemsDeleted = await cleanupLogs();
      break;
    case 'temp-files':
      itemsDeleted = await cleanupTempFiles(cutoffDate);
      break;
    case 'old-exports':
      itemsDeleted = await cleanupOldExports(cutoffDate);
      break;
    default: {
      const exhaustive: never = target;
      throw new Error(`Unknown cleanup target: ${String(exhaustive)}`);
    }
  }

  console.log(
    `[CleanupProcessor] Cleanup completed: ${itemsDeleted} items deleted (${target})`,
  );

  Sentry.addBreadcrumb({
    category: 'cleanup',
    message: `Cleanup completed: ${target}`,
    level: 'info',
    data: { target, olderThan, itemsDeleted },
  });

  return itemsDeleted;
}

/**
 * Cleanup processor - BullMQ worker entrypoint.
 */
export async function processCleanup(job: Job<CleanupJobData>): Promise<void> {
  const { target, olderThan = 30 } = job.data;

  try {
    await job.updateProgress(10);
    await runCleanupTarget(target, olderThan);
    await job.updateProgress(100);
  } catch (error) {
    console.error(`[CleanupProcessor] Cleanup failed:`, error);
    Sentry.captureException(error, {
      tags: { component: 'cleanup-processor', target },
      extra: { olderThan },
    });
    throw error;
  }
}

/**
 * Clean up expired/orphaned Redis sessions.
 */
async function cleanupSessions(): Promise<number> {
  const redis = getRedisClient();

  // SCAN avoids blocking Redis like KEYS does on large keyspaces.
  let cursor = '0';
  let deletedCount = 0;

  do {
    const [nextCursor, keys] = await redis.scan(
      cursor,
      'MATCH',
      'sess:*',
      'COUNT',
      100,
    );
    cursor = nextCursor;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      // -1 = no expiration set (orphaned), -2 = already expired.
      if (ttl === -1 || ttl === -2) {
        await redis.del(key);
        deletedCount++;
      }
    }
  } while (cursor !== '0');

  console.log(`[CleanupProcessor] Deleted ${deletedCount} orphaned sessions`);
  return deletedCount;
}

/**
 * Application logs are shipped to Sentry / the platform log drain (Vercel),
 * not to a writable local directory, so there is nothing to purge here.
 * This is an intentional honest no-op rather than a simulated success.
 */
async function cleanupLogs(): Promise<number> {
  console.log(
    '[CleanupProcessor] Log retention is managed by the platform log drain / Sentry; nothing to purge locally.',
  );
  return 0;
}

/**
 * Clean up temporary files written to the OS temp dir by this app.
 * Only files prefixed with "imobibase-" are touched.
 */
async function cleanupTempFiles(cutoffDate: Date): Promise<number> {
  const tmpDir = os.tmpdir();
  let deletedCount = 0;

  let files: string[];
  try {
    files = await fs.readdir(tmpDir);
  } catch (error) {
    console.warn(
      `[CleanupProcessor] Could not read temp dir ${tmpDir}:`,
      error,
    );
    return 0;
  }

  for (const file of files) {
    if (!file.startsWith('imobibase-')) continue;

    const filePath = path.join(tmpDir, file);
    try {
      const stats = await fs.stat(filePath);
      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    } catch {
      // File may have been removed concurrently; ignore.
    }
  }

  return deletedCount;
}

/**
 * Cleanup of old export artifacts. Exports live in object storage; without a
 * configured bucket there is nothing to clean. We log honestly instead of
 * pretending a fixed number of files were deleted.
 */
async function cleanupOldExports(_cutoffDate: Date): Promise<number> {
  const bucket = process.env.EXPORT_BUCKET;
  if (!bucket) {
    console.log(
      '[CleanupProcessor] EXPORT_BUCKET not configured; skipping export cleanup.',
    );
    return 0;
  }

  // Object-storage deletion requires the storage SDK + credentials, which are
  // not wired in this environment. Surface that clearly instead of faking it.
  console.warn(
    `[CleanupProcessor] EXPORT_BUCKET=${bucket} set but object-storage cleanup is not implemented; no exports purged.`,
  );
  return 0;
}
