import { Job } from 'bullmq';
import { BackupJobData } from '../queue-manager';
import * as Sentry from '@sentry/node';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

/**
 * Execute a command safely using spawn (prevents command injection).
 */
function spawnAsync(
  command: string,
  args: string[],
  env?: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: 'pipe',
    });

    let stderr = '';
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to execute ${command}: ${error.message}`));
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}: ${stderr}`));
      }
    });
  });
}

export interface BackupResult {
  backupName: string;
  localPath: string;
  sizeBytes: number;
  storageUrl?: string;
}

/**
 * Core database backup logic, callable directly (inline) or from the BullMQ
 * worker.
 *
 * IMPORTANT (honesty over simulation): this no longer swallows pg_dump errors
 * to pretend the backup succeeded. The previous implementation logged
 * "Backup completed" even when pg_dump was missing and the S3 upload was
 * commented out — i.e. it produced ZERO real backups while reporting success.
 *
 * Behaviour now:
 *   1. pg_dump must exist and succeed, or the job throws.
 *   2. The dump file must be uploaded to durable object storage. Since no
 *      storage SDK is wired in this environment, the job throws unless a
 *      BACKUP_BUCKET + uploader are configured, because a dump that only lives
 *      in the ephemeral /tmp of a serverless function is NOT a backup.
 *
 * The officially supported disaster-recovery mechanism for production is the
 * Supabase Point-In-Time Recovery (PITR). Set BACKUP_OPTIONAL=true to treat a
 * missing object-storage target as a non-fatal warning when PITR is the
 * primary DR strategy.
 */
export async function runBackup(data: BackupJobData): Promise<BackupResult> {
  const { type } = data;
  console.log(`[BackupProcessor] Starting ${type} backup`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL not configured; cannot run database backup');
  }

  const dbUrl = new URL(databaseUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `backup-${type}-${timestamp}`;
  const backupPath = path.join(os.tmpdir(), `imobibase-${backupName}.sql`);

  const pgDumpArgs = [
    '-h',
    dbUrl.hostname,
    '-p',
    String(dbUrl.port || 5432),
    '-U',
    decodeURIComponent(dbUrl.username),
    '-F',
    'c',
    '-f',
    backupPath,
    dbUrl.pathname.substring(1),
  ];

  const env = dbUrl.password
    ? { PGPASSWORD: decodeURIComponent(dbUrl.password) }
    : undefined;

  // 1) Run pg_dump for real. Any failure (including pg_dump not installed)
  //    propagates so the cron/worker reports a genuine error.
  await spawnAsync('pg_dump', pgDumpArgs, env);

  const stats = await fs.stat(backupPath);
  if (stats.size === 0) {
    throw new Error(`pg_dump produced an empty file at ${backupPath}`);
  }
  console.log(
    `[BackupProcessor] Database dump created: ${backupPath} (${stats.size} bytes)`,
  );

  // 2) Persist the dump to durable storage. A dump left in ephemeral /tmp is
  //    not a backup, so we refuse to report success without it.
  const bucket = process.env.BACKUP_BUCKET;
  const backupOptional = process.env.BACKUP_OPTIONAL === 'true';

  if (!bucket) {
    const message =
      'BACKUP_BUCKET is not configured. The pg_dump file lives only in ephemeral storage and is NOT a durable backup. ' +
      'Configure object storage, or rely on Supabase PITR as the official DR (set BACKUP_OPTIONAL=true to silence this).';

    // Clean up the orphaned dump regardless of outcome.
    await fs.unlink(backupPath).catch(() => undefined);

    if (backupOptional) {
      console.warn(`[BackupProcessor] ${message}`);
      return { backupName, localPath: backupPath, sizeBytes: stats.size };
    }
    throw new Error(message);
  }

  // Object-storage upload SDK is not wired in this codebase. Fail honestly
  // instead of pretending the upload happened.
  await fs.unlink(backupPath).catch(() => undefined);
  throw new Error(
    `BACKUP_BUCKET=${bucket} is set but no object-storage uploader is implemented in this build. ` +
      'Wire an S3/GCS client before enabling automated off-site backups.',
  );
}

/**
 * Backup processor - BullMQ worker entrypoint.
 */
export async function processBackup(job: Job<BackupJobData>): Promise<void> {
  try {
    await job.updateProgress(10);
    const result = await runBackup(job.data);
    await job.updateProgress(100);

    console.log(`[BackupProcessor] Backup completed: ${result.backupName}`);
    Sentry.addBreadcrumb({
      category: 'backup',
      message: `Backup completed: ${job.data.type}`,
      level: 'info',
      data: { type: job.data.type, backupName: result.backupName },
    });
  } catch (error) {
    console.error(`[BackupProcessor] Backup failed:`, error);
    Sentry.captureException(error, {
      tags: { component: 'backup-processor', backupType: job.data.type },
    });
    throw error;
  }
}
