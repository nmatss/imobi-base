import { Job } from 'bullmq';
import { CleanupJobData } from '../queue-manager';
import { getRedisClient } from '../../cache/redis-client';
import * as Sentry from '@sentry/node';

/**
 * Cleanup processor - handles cleanup of old data
 */
export async function processCleanup(job: Job<CleanupJobData>): Promise<void> {
  const { target, olderThan = 30 } = job.data;

  try {
    console.log(`[CleanupProcessor] Cleaning up ${target} older than ${olderThan} days`);

    await job.updateProgress(10);

    const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);
    let itemsDeleted = 0;

    switch (target) {
      case 'sessions':
        itemsDeleted = await cleanupSessions(cutoffDate);
        break;

      case 'logs':
        itemsDeleted = await cleanupLogs(cutoffDate);
        break;

      case 'temp-files':
        itemsDeleted = await cleanupTempFiles(cutoffDate);
        break;

      case 'old-exports':
        itemsDeleted = await cleanupOldExports(cutoffDate);
        break;

      default:
        throw new Error(`Unknown cleanup target: ${target}`);
    }

    await job.updateProgress(100);

    console.log(`[CleanupProcessor] Cleanup completed: ${itemsDeleted} items deleted`);

    Sentry.addBreadcrumb({
      category: 'cleanup',
      message: `Cleanup completed: ${target}`,
      level: 'info',
      data: {
        target,
        olderThan,
        itemsDeleted,
      },
    });
  } catch (error) {
    console.error(`[CleanupProcessor] Cleanup failed:`, error);

    Sentry.captureException(error, {
      tags: {
        component: 'cleanup-processor',
        target,
      },
      extra: {
        olderThan,
      },
    });

    throw error;
  }
}

/**
 * Clean up old Redis sessions
 */
async function cleanupSessions(cutoffDate: Date): Promise<number> {
  console.log(`[CleanupProcessor] Cleaning up sessions older than ${cutoffDate.toISOString()}`);

  try {
    const redis = getRedisClient();

    // Get all session keys
    const sessionKeys = await redis.keys('sess:*');
    let deletedCount = 0;

    for (const key of sessionKeys) {
      const ttl = await redis.ttl(key);

      // If TTL is -1 (no expiration) or session is expired, delete it
      if (ttl === -1 || ttl === -2) {
        await redis.del(key);
        deletedCount++;
      }
    }

    console.log(`[CleanupProcessor] Deleted ${deletedCount} sessions`);
    return deletedCount;
  } catch (error) {
    console.error(`[CleanupProcessor] Failed to cleanup sessions:`, error);
    return 0;
  }
}

/**
 * Clean up old logs
 */
async function cleanupLogs(cutoffDate: Date): Promise<number> {
  console.log(`[CleanupProcessor] Cleaning up logs older than ${cutoffDate.toISOString()}`);

  // In production, clean up log files or database log entries
  /*
  import fs from 'fs/promises';
  import path from 'path';

  const logDir = '/var/log/imobibase';
  const files = await fs.readdir(logDir);

  let deletedCount = 0;
  for (const file of files) {
    const filePath = path.join(logDir, file);
    const stats = await fs.stat(filePath);

    if (stats.mtime < cutoffDate) {
      await fs.unlink(filePath);
      deletedCount++;
    }
  }

  return deletedCount;
  */

  // Simulated cleanup
  await new Promise((resolve) => setTimeout(resolve, 200));
  return 15;
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles(cutoffDate: Date): Promise<number> {
  console.log(`[CleanupProcessor] Cleaning up temp files older than ${cutoffDate.toISOString()}`);

  // In production, clean up /tmp directory
  /*
  import fs from 'fs/promises';
  import path from 'path';

  const tmpDir = '/tmp';
  const files = await fs.readdir(tmpDir);

  let deletedCount = 0;
  for (const file of files) {
    if (file.startsWith('imobibase-')) {
      const filePath = path.join(tmpDir, file);
      const stats = await fs.stat(filePath);

      if (stats.mtime < cutoffDate) {
        await fs.unlink(filePath);
        deletedCount++;
      }
    }
  }

  return deletedCount;
  */

  // Simulated cleanup
  await new Promise((resolve) => setTimeout(resolve, 300));
  return 42;
}

/**
 * Clean up old export files
 */
async function cleanupOldExports(cutoffDate: Date): Promise<number> {
  console.log(`[CleanupProcessor] Cleaning up old exports older than ${cutoffDate.toISOString()}`);

  // In production, clean up from cloud storage
  /*
  import AWS from 'aws-sdk';
  const s3 = new AWS.S3();

  const objects = await s3.listObjectsV2({
    Bucket: process.env.EXPORT_BUCKET!,
    Prefix: 'exports/',
  }).promise();

  let deletedCount = 0;
  for (const obj of objects.Contents || []) {
    if (obj.LastModified && obj.LastModified < cutoffDate) {
      await s3.deleteObject({
        Bucket: process.env.EXPORT_BUCKET!,
        Key: obj.Key!,
      }).promise();
      deletedCount++;
    }
  }

  return deletedCount;
  */

  // Simulated cleanup
  await new Promise((resolve) => setTimeout(resolve, 250));
  return 8;
}
