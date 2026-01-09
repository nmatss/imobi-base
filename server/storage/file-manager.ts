// @ts-nocheck
/**
 * FILE MANAGER SERVICE
 *
 * Manages files with CRUD operations, quota management,
 * and cleanup of orphaned files.
 */

import { supabaseStorage, type StorageBucket, STORAGE_BUCKETS, getPublicUrl, getSignedUrl } from './supabase-client';
import { storage } from '../storage';

/**
 * Storage quota limits per plan (in bytes)
 */
export const STORAGE_QUOTAS = {
  free: 1 * 1024 * 1024 * 1024, // 1GB
  starter: 10 * 1024 * 1024 * 1024, // 10GB
  professional: 50 * 1024 * 1024 * 1024, // 50GB
  enterprise: 200 * 1024 * 1024 * 1024, // 200GB
} as const;

export type StoragePlan = keyof typeof STORAGE_QUOTAS;

/**
 * File metadata interface
 */
export interface FileMetadata {
  id: string;
  tenantId: string;
  userId?: string;
  bucket: StorageBucket;
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  category: string;
  url: string;
  isPublic: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * List files by tenant
 */
export async function listFilesByTenant(
  tenantId: string,
  bucket: StorageBucket,
  options?: {
    limit?: number;
    offset?: number;
    category?: string;
  }
): Promise<FileMetadata[]> {
  try {
    const prefix = tenantId;
    const { data, error } = await supabaseStorage.storage
      .from(bucket)
      .list(prefix, {
        limit: options?.limit || 100,
        offset: options?.offset || 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('Error listing files:', error);
      return [];
    }

    if (!data) return [];

    // Get stored file metadata from database
    const dbFiles = await storage.getFilesByTenant(tenantId, bucket);

    // Map Supabase files to FileMetadata
    const publicBuckets = [
      STORAGE_BUCKETS.PROPERTIES_IMAGES,
      STORAGE_BUCKETS.AVATARS,
      STORAGE_BUCKETS.LOGOS,
    ];

    const isPublic = publicBuckets.includes(bucket);

    const files: FileMetadata[] = data.map(file => {
      const filePath = `${prefix}/${file.name}`;
      const dbFile = dbFiles.find(f => f.filePath === filePath);

      return {
        id: dbFile?.id || file.id || '',
        tenantId,
        userId: dbFile?.userId,
        bucket,
        filePath,
        fileName: file.name,
        fileSize: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'application/octet-stream',
        category: dbFile?.category || 'uncategorized',
        url: isPublic ? getPublicUrl(bucket, filePath) : '',
        isPublic,
        metadata: file.metadata,
        createdAt: file.created_at || new Date().toISOString(),
        updatedAt: file.updated_at || new Date().toISOString(),
      };
    });

    return files;
  } catch (error) {
    console.error('Exception listing files:', error);
    return [];
  }
}

/**
 * List files by user
 */
export async function listFilesByUser(
  userId: string,
  bucket?: StorageBucket
): Promise<FileMetadata[]> {
  try {
    const dbFiles = await storage.getFilesByUser(userId, bucket);
    return dbFiles as FileMetadata[];
  } catch (error) {
    console.error('Error listing files by user:', error);
    return [];
  }
}

/**
 * Get file by ID
 */
export async function getFileById(fileId: string): Promise<FileMetadata | null> {
  try {
    const dbFile = await storage.getFile(fileId);
    if (!dbFile) return null;

    const publicBuckets = [
      STORAGE_BUCKETS.PROPERTIES_IMAGES,
      STORAGE_BUCKETS.AVATARS,
      STORAGE_BUCKETS.LOGOS,
    ];

    const isPublic = publicBuckets.includes(dbFile.bucket as StorageBucket);
    const url = isPublic
      ? getPublicUrl(dbFile.bucket as StorageBucket, dbFile.filePath)
      : '';

    return {
      ...dbFile,
      url,
      isPublic,
    } as FileMetadata;
  } catch (error) {
    console.error('Error getting file:', error);
    return null;
  }
}

/**
 * Get file download URL
 */
export async function getFileUrl(
  fileId: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const file = await getFileById(fileId);
    if (!file) return null;

    // If public, return public URL
    if (file.isPublic) {
      return file.url;
    }

    // For private files, generate signed URL
    return await getSignedUrl(file.bucket, file.filePath, expiresIn);
  } catch (error) {
    console.error('Error getting file URL:', error);
    return null;
  }
}

/**
 * Delete file
 */
export async function deleteFileById(fileId: string): Promise<boolean> {
  try {
    const file = await getFileById(fileId);
    if (!file) return false;

    // Delete from Supabase Storage
    const { error } = await supabaseStorage.storage
      .from(file.bucket)
      .remove([file.filePath]);

    if (error) {
      console.error('Error deleting file from storage:', error);
      return false;
    }

    // Delete from database
    await storage.deleteFile(fileId);

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Delete multiple files
 */
export async function deleteBulkFiles(fileIds: string[]): Promise<{
  success: number;
  failed: number;
}> {
  let success = 0;
  let failed = 0;

  await Promise.all(
    fileIds.map(async (fileId) => {
      const deleted = await deleteFileById(fileId);
      if (deleted) {
        success++;
      } else {
        failed++;
      }
    })
  );

  return { success, failed };
}

/**
 * Calculate storage usage for tenant
 */
export async function getTenantStorageUsage(
  tenantId: string
): Promise<{
  totalSize: number;
  fileCount: number;
  quota: number;
  quotaUsed: number;
  plan: StoragePlan;
}> {
  try {
    const files = await storage.getFilesByTenant(tenantId);
    const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const fileCount = files.length;

    // Get tenant plan (default to 'free')
    const tenant = await storage.getTenant(tenantId);
    const plan: StoragePlan = (tenant?.plan as StoragePlan) || 'free';
    const quota = STORAGE_QUOTAS[plan];
    const quotaUsed = (totalSize / quota) * 100;

    return {
      totalSize,
      fileCount,
      quota,
      quotaUsed: Math.round(quotaUsed * 100) / 100,
      plan,
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return {
      totalSize: 0,
      fileCount: 0,
      quota: STORAGE_QUOTAS.free,
      quotaUsed: 0,
      plan: 'free',
    };
  }
}

/**
 * Check if tenant has sufficient storage quota
 */
export async function checkStorageQuota(
  tenantId: string,
  additionalSize: number
): Promise<{ allowed: boolean; usage?: any }> {
  const usage = await getTenantStorageUsage(tenantId);

  if (usage.totalSize + additionalSize > usage.quota) {
    return { allowed: false, usage };
  }

  return { allowed: true, usage };
}

/**
 * Cleanup orphaned files
 * Files in storage but not in database
 */
export async function cleanupOrphanedFiles(
  tenantId: string,
  bucket: StorageBucket,
  dryRun: boolean = true
): Promise<{
  orphanedCount: number;
  orphanedFiles: string[];
  deletedCount: number;
}> {
  try {
    // Get all files from storage
    const { data: storageFiles } = await supabaseStorage.storage
      .from(bucket)
      .list(tenantId, {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (!storageFiles) {
      return { orphanedCount: 0, orphanedFiles: [], deletedCount: 0 };
    }

    // Get all files from database
    const dbFiles = await storage.getFilesByTenant(tenantId, bucket);
    const dbFilePaths = new Set(dbFiles.map(f => f.filePath));

    // Find orphaned files
    const orphanedFiles: string[] = [];
    storageFiles.forEach(file => {
      const filePath = `${tenantId}/${file.name}`;
      if (!dbFilePaths.has(filePath)) {
        orphanedFiles.push(filePath);
      }
    });

    let deletedCount = 0;

    // Delete orphaned files if not dry run
    if (!dryRun && orphanedFiles.length > 0) {
      const { error } = await supabaseStorage.storage
        .from(bucket)
        .remove(orphanedFiles);

      if (!error) {
        deletedCount = orphanedFiles.length;
      }
    }

    return {
      orphanedCount: orphanedFiles.length,
      orphanedFiles,
      deletedCount,
    };
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
    return { orphanedCount: 0, orphanedFiles: [], deletedCount: 0 };
  }
}

/**
 * Cleanup old temporary files (exports older than 7 days)
 */
export async function cleanupTemporaryFiles(): Promise<number> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: files } = await supabaseStorage.storage
      .from(STORAGE_BUCKETS.EXPORTS)
      .list('', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (!files) return 0;

    // Filter files older than 7 days
    const oldFiles = files.filter(file => {
      const fileDate = new Date(file.created_at || 0);
      return fileDate < sevenDaysAgo;
    });

    if (oldFiles.length === 0) return 0;

    const filePaths = oldFiles.map(f => f.name);
    const { error } = await supabaseStorage.storage
      .from(STORAGE_BUCKETS.EXPORTS)
      .remove(filePaths);

    if (error) {
      console.error('Error cleaning up temporary files:', error);
      return 0;
    }

    return oldFiles.length;
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
    return 0;
  }
}

/**
 * Get storage statistics for admin dashboard
 */
export async function getStorageStatistics() {
  try {
    const buckets = Object.values(STORAGE_BUCKETS);
    const stats: Record<string, { fileCount: number; totalSize: number }> = {};

    for (const bucket of buckets) {
      const { data: files } = await supabaseStorage.storage
        .from(bucket)
        .list('', {
          limit: 10000,
        });

      if (files) {
        const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);
        stats[bucket] = {
          fileCount: files.length,
          totalSize,
        };
      }
    }

    return stats;
  } catch (error) {
    console.error('Error getting storage statistics:', error);
    return {};
  }
}
