/**
 * FILE UPLOAD ROUTES
 *
 * API endpoints for file upload, download, and management.
 *
 * 🔒 SECURITY: Includes protection against prototype pollution attacks
 */

import type { Express, Request, Response } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import {
  uploadFile,
  uploadMultipleFiles,
  validateFile,
  FILE_TYPE_CONFIG,
  type FileType,
} from './storage/file-upload';
import { STORAGE_BUCKETS } from './storage/supabase-client';
import {
  getFileById,
  getFileUrl,
  deleteFileById,
  deleteBulkFiles,
  getTenantStorageUsage,
  checkStorageQuota,
  listFilesByTenant,
  cleanupOrphanedFiles,
} from './storage/file-manager';
import {
  processImage,
  generateImageVariants,
  optimizeForWeb,
  createCircularAvatar,
  generateBlurhash,
} from './storage/image-processor';
import { storage } from './storage';

// Configure Multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * Authentication middleware - ensures user is logged in
 */
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * Get tenant ID from authenticated user
 */
function getTenantId(req: Request): string {
  return req.user?.tenantId || '';
}

/**
 * Get user ID from authenticated user
 */
function getUserId(req: Request): string {
  return req.user?.id || '';
}

/**
 * 🔒 SECURITY: Safe JSON parse that prevents prototype pollution
 * Removes dangerous properties that can modify Object.prototype
 */
function safeJSONParse(jsonString: string): Record<string, any> {
  try {
    const parsed = JSON.parse(jsonString);

    // If not an object, return empty object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }

    // Remove dangerous properties that can cause prototype pollution
    const dangerousProps = ['__proto__', 'constructor', 'prototype'];
    const sanitized: Record<string, any> = {};

    for (const key in parsed) {
      // Skip dangerous properties
      if (dangerousProps.includes(key.toLowerCase())) {
        console.warn(`[SECURITY] Blocked prototype pollution attempt via "${key}" property`);
        continue;
      }

      // Only copy own properties (not inherited)
      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        sanitized[key] = parsed[key];
      }
    }

    return sanitized;
  } catch (error) {
    console.error('[FILES] JSON parse error:', error);
    return {};
  }
}

/**
 * Register file upload routes
 */
export function registerFileRoutes(app: Express) {
  /**
   * POST /api/files/upload
   * Generic file upload
   */
  app.post(
    '/api/files/upload',
    requireAuth,
    upload.single('file'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const fileType = (req.body.fileType as FileType) || 'document';
        const category = req.body.category || 'general';
        const bucket = req.body.bucket || STORAGE_BUCKETS.DOCUMENTS;

        // Validate file (includes magic bytes validation)
        const validation = await validateFile(req.file, { fileType });
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }

        // Check storage quota
        const quotaCheck = await checkStorageQuota(tenantId, req.file.size);
        if (!quotaCheck.allowed) {
          return res.status(413).json({
            error: 'Storage quota exceeded',
            usage: quotaCheck.usage,
          });
        }

        // Upload file
        const result = await uploadFile(req.file, bucket, tenantId, category, {
          userId,
          // 🔒 SECURITY: Use safeJSONParse to prevent prototype pollution
          metadata: req.body.metadata ? safeJSONParse(req.body.metadata) : {},
        });

        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }

        // Store file metadata in database
        const fileRecord = await storage.createFile({
          id: result.fileId,
          tenantId,
          userId,
          bucket: result.bucket,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.size,
          mimeType: result.mimeType,
          category,
          entityType: req.body.entityType,
          entityId: req.body.entityId,
          isPublic: [
            STORAGE_BUCKETS.PROPERTIES_IMAGES,
            STORAGE_BUCKETS.AVATARS,
            STORAGE_BUCKETS.LOGOS,
          ].includes(bucket),
        });

        res.json({
          success: true,
          file: {
            ...fileRecord,
            url: result.fileUrl,
          },
        });
      } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }
  );

  /**
   * POST /api/files/upload/avatar
   * Upload user avatar with image processing
   */
  app.post(
    '/api/files/upload/avatar',
    requireAuth,
    upload.single('avatar'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        const tenantId = getTenantId(req);
        const userId = getUserId(req);

        // Validate as avatar (includes magic bytes validation)
        const validation = await validateFile(req.file, { fileType: 'avatar' });
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }

        // Process avatar - create circular avatar
        const processed = await createCircularAvatar(req.file.buffer, 256);

        // Upload processed avatar
        const avatarFile = {
          ...req.file,
          buffer: processed.buffer,
          size: processed.size,
        };

        const result = await uploadFile(
          avatarFile,
          STORAGE_BUCKETS.AVATARS,
          tenantId,
          'avatar',
          { userId }
        );

        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }

        // Store in database
        const fileRecord = await storage.createFile({
          id: result.fileId,
          tenantId,
          userId,
          bucket: result.bucket,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.size,
          mimeType: result.mimeType,
          category: 'avatar',
          entityType: 'user',
          entityId: userId,
          isPublic: true,
        });

        // Update user avatar
        await storage.updateUser(userId, { avatar: result.fileUrl });

        res.json({
          success: true,
          file: {
            ...fileRecord,
            url: result.fileUrl,
          },
        });
      } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }
  );

  /**
   * POST /api/files/upload/logo
   * Upload tenant logo
   */
  app.post(
    '/api/files/upload/logo',
    requireAuth,
    upload.single('logo'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        const tenantId = getTenantId(req);
        const userId = getUserId(req);

        // Validate as logo (includes magic bytes validation)
        const validation = await validateFile(req.file, { fileType: 'logo' });
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }

        // Process logo - optimize for web
        const optimized = await optimizeForWeb(req.file.buffer, 800, 800);

        // Upload WebP version
        const logoFile = {
          ...req.file,
          buffer: optimized.webp.buffer,
          size: optimized.webp.size,
          mimetype: 'image/webp',
        };

        const result = await uploadFile(
          logoFile,
          STORAGE_BUCKETS.LOGOS,
          tenantId,
          'logo',
          { userId }
        );

        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }

        // Store in database
        const fileRecord = await storage.createFile({
          id: result.fileId,
          tenantId,
          userId,
          bucket: result.bucket,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.size,
          mimeType: result.mimeType,
          category: 'logo',
          entityType: 'tenant',
          entityId: tenantId,
          isPublic: true,
          metadata: JSON.stringify({ blurhash: optimized.blurhash }),
        });

        // Update tenant logo
        await storage.updateTenant(tenantId, { logo: result.fileUrl });

        res.json({
          success: true,
          file: {
            ...fileRecord,
            url: result.fileUrl,
            blurhash: optimized.blurhash,
          },
        });
      } catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }
  );

  /**
   * POST /api/files/upload/property-images
   * Upload multiple property images
   */
  app.post(
    '/api/files/upload/property-images',
    requireAuth,
    upload.array('images', 20),
    async (req: Request, res: Response) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
          return res.status(400).json({ error: 'No files provided' });
        }

        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const propertyId = req.body.propertyId;

        if (!propertyId) {
          return res.status(400).json({ error: 'Property ID required' });
        }

        // Validate all files (includes magic bytes validation)
        for (const file of files) {
          const validation = await validateFile(file, { fileType: 'image' });
          if (!validation.valid) {
            return res.status(400).json({
              error: `Invalid file ${file.originalname}: ${validation.error}`,
            });
          }
        }

        // Check storage quota
        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const quotaCheck = await checkStorageQuota(tenantId, totalSize);
        if (!quotaCheck.allowed) {
          return res.status(413).json({
            error: 'Storage quota exceeded',
            usage: quotaCheck.usage,
          });
        }

        // Process and upload all images
        const uploadResults = await Promise.all(
          files.map(async (file) => {
            // Optimize image for web
            const optimized = await optimizeForWeb(file.buffer, 1920, 1080);

            // Upload WebP version
            const imageFile = {
              ...file,
              buffer: optimized.webp.buffer,
              size: optimized.webp.size,
              mimetype: 'image/webp',
            };

            const result = await uploadFile(
              imageFile,
              STORAGE_BUCKETS.PROPERTIES_IMAGES,
              tenantId,
              'property-image',
              { userId, metadata: { propertyId } }
            );

            if (result.success) {
              // Store in database
              const fileRecord = await storage.createFile({
                id: result.fileId,
                tenantId,
                userId,
                bucket: result.bucket,
                filePath: result.filePath,
                fileName: result.fileName,
                fileSize: result.size,
                mimeType: result.mimeType,
                category: 'property-image',
                entityType: 'property',
                entityId: propertyId,
                isPublic: true,
                metadata: JSON.stringify({
                  blurhash: optimized.blurhash,
                  width: optimized.webp.width,
                  height: optimized.webp.height,
                }),
              });

              return {
                ...fileRecord,
                url: result.fileUrl,
                blurhash: optimized.blurhash,
              };
            }

            return null;
          })
        );

        const successfulUploads = uploadResults.filter(r => r !== null);

        res.json({
          success: true,
          files: successfulUploads,
          count: successfulUploads.length,
        });
      } catch (error) {
        console.error('Property images upload error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }
  );

  /**
   * POST /api/files/upload/document
   * Upload document (RG, CPF, contracts, etc.)
   */
  app.post(
    '/api/files/upload/document',
    requireAuth,
    upload.single('document'),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file provided' });
        }

        const tenantId = getTenantId(req);
        const userId = getUserId(req);
        const documentType = req.body.documentType || 'general';
        const entityType = req.body.entityType;
        const entityId = req.body.entityId;

        // Validate as document (includes magic bytes validation)
        const validation = await validateFile(req.file, { fileType: 'document' });
        if (!validation.valid) {
          return res.status(400).json({ error: validation.error });
        }

        // Check storage quota
        const quotaCheck = await checkStorageQuota(tenantId, req.file.size);
        if (!quotaCheck.allowed) {
          return res.status(413).json({
            error: 'Storage quota exceeded',
            usage: quotaCheck.usage,
          });
        }

        // Upload document
        const result = await uploadFile(
          req.file,
          STORAGE_BUCKETS.DOCUMENTS,
          tenantId,
          documentType,
          { userId, metadata: { documentType, entityType, entityId } }
        );

        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }

        // Store in database
        const fileRecord = await storage.createFile({
          id: result.fileId,
          tenantId,
          userId,
          bucket: result.bucket,
          filePath: result.filePath,
          fileName: result.fileName,
          fileSize: result.size,
          mimeType: result.mimeType,
          category: documentType,
          entityType,
          entityId,
          isPublic: false,
        });

        // For private files, generate signed URL
        const signedUrl = await getFileUrl(fileRecord.id);

        res.json({
          success: true,
          file: {
            ...fileRecord,
            url: signedUrl,
          },
        });
      } catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }
    }
  );

  /**
   * GET /api/files/:id
   * Get file metadata
   */
  app.get('/api/files/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const file = await getFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if user has access to this file
      const tenantId = getTenantId(req);
      if (file.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json({ file });
    } catch (error) {
      console.error('Get file error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get file',
      });
    }
  });

  /**
   * GET /api/files/:id/url
   * Get file download URL (signed for private files)
   */
  app.get('/api/files/:id/url', requireAuth, async (req: Request, res: Response) => {
    try {
      const file = await getFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check access
      const tenantId = getTenantId(req);
      if (file.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const expiresIn = parseInt(req.query.expiresIn as string) || 3600;
      const url = await getFileUrl(file.id, expiresIn);

      if (!url) {
        return res.status(500).json({ error: 'Failed to generate URL' });
      }

      res.json({ url, expiresIn });
    } catch (error) {
      console.error('Get file URL error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get file URL',
      });
    }
  });

  /**
   * DELETE /api/files/:id
   * Delete file
   */
  app.delete('/api/files/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const file = await getFileById(req.params.id);
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check access
      const tenantId = getTenantId(req);
      if (file.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const deleted = await deleteFileById(file.id);
      if (!deleted) {
        return res.status(500).json({ error: 'Failed to delete file' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete file',
      });
    }
  });

  /**
   * POST /api/files/bulk-delete
   * Delete multiple files
   */
  app.post('/api/files/bulk-delete', requireAuth, async (req: Request, res: Response) => {
    try {
      const { fileIds } = req.body;
      if (!fileIds || !Array.isArray(fileIds)) {
        return res.status(400).json({ error: 'File IDs array required' });
      }

      const tenantId = getTenantId(req);

      // Verify all files belong to tenant
      const files = await Promise.all(fileIds.map(id => getFileById(id)));
      const unauthorized = files.some(file => !file || file.tenantId !== tenantId);

      if (unauthorized) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const result = await deleteBulkFiles(fileIds);

      res.json({
        success: true,
        deleted: result.success,
        failed: result.failed,
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete files',
      });
    }
  });

  /**
   * GET /api/files/storage/usage
   * Get storage usage statistics
   */
  app.get('/api/files/storage/usage', requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const usage = await getTenantStorageUsage(tenantId);

      res.json({ usage });
    } catch (error) {
      console.error('Get storage usage error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get storage usage',
      });
    }
  });

  /**
   * GET /api/files/list
   * List files for tenant
   */
  app.get('/api/files/list', requireAuth, async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const bucket = req.query.bucket as string;
      const category = req.query.category as string;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const files = await listFilesByTenant(tenantId, bucket as any, {
        limit,
        offset,
        category,
      });

      res.json({ files, count: files.length });
    } catch (error) {
      console.error('List files error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to list files',
      });
    }
  });

  /**
   * POST /api/files/cleanup/orphaned
   * Admin: Cleanup orphaned files
   */
  app.post('/api/files/cleanup/orphaned', requireAuth, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      const userRole = req.user?.role;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const tenantId = getTenantId(req);
      const bucket = req.body.bucket;
      const dryRun = req.body.dryRun !== false;

      if (!bucket) {
        return res.status(400).json({ error: 'Bucket required' });
      }

      const result = await cleanupOrphanedFiles(tenantId, bucket, dryRun);

      res.json({
        success: true,
        orphanedCount: result.orphanedCount,
        deletedCount: result.deletedCount,
        dryRun,
        orphanedFiles: dryRun ? result.orphanedFiles : undefined,
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Cleanup failed',
      });
    }
  });
}
