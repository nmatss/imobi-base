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
import { STORAGE_BUCKETS, type StorageBucket } from './storage/supabase-client';
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
import { runWithTenantRlsContext } from './db-rls';

const MB = 1024 * 1024;
const GENERIC_UPLOAD_MAX_SIZE = 10 * MB;
const PROPERTY_IMAGE_MAX_SIZE = 10 * MB;
const PROPERTY_IMAGE_MAX_FILES = 10;
const PROPERTY_IMAGE_TOTAL_MAX_SIZE = 50 * MB;
const FILE_URL_MIN_EXPIRES_IN_SECONDS = 60;
const FILE_URL_MAX_EXPIRES_IN_SECONDS = 3600;

const BUCKETS_BY_FILE_TYPE: Record<FileType, readonly StorageBucket[]> = {
  image: [STORAGE_BUCKETS.PROPERTIES_IMAGES],
  document: [STORAGE_BUCKETS.DOCUMENTS],
  avatar: [STORAGE_BUCKETS.AVATARS],
  logo: [STORAGE_BUCKETS.LOGOS],
};
const PUBLIC_UPLOAD_BUCKETS: readonly StorageBucket[] = [
  STORAGE_BUCKETS.PROPERTIES_IMAGES,
  STORAGE_BUCKETS.AVATARS,
  STORAGE_BUCKETS.LOGOS,
];

// Configure Multer for memory storage - default 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: GENERIC_UPLOAD_MAX_SIZE,
  },
});

// Property image uploads stay in memory, so keep per-file and batch caps tight.
const uploadPropertyImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PROPERTY_IMAGE_MAX_SIZE,
  },
});

/**
 * Authentication middleware - ensures user is logged in
 */
function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!req.user.tenantId) {
    return res.status(403).json({ error: 'Sessão inválida' });
  }
  runWithTenantRlsContext(req.user.tenantId, () => next());
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

function resolveUploadBucket(
  fileType: FileType,
  requestedBucket: unknown
): { bucket?: StorageBucket; error?: string } {
  const allowedBuckets = BUCKETS_BY_FILE_TYPE[fileType];

  if (!allowedBuckets) {
    return { error: 'Invalid file type' };
  }

  if (requestedBucket === undefined || requestedBucket === null || requestedBucket === '') {
    return { bucket: allowedBuckets[0] };
  }

  if (typeof requestedBucket !== 'string') {
    return { error: 'Invalid bucket' };
  }

  if (!allowedBuckets.includes(requestedBucket as StorageBucket)) {
    return { error: 'Bucket is not allowed for this file type' };
  }

  return { bucket: requestedBucket as StorageBucket };
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

type TenantOwnedEntity = {
  tenantId?: string | null;
};

type UploadEntityResolution = {
  entityType?: string;
  entityId?: string;
  error?: string;
  status?: number;
};

const UPLOAD_ENTITY_TYPE_ALIASES: Record<string, string> = {
  property: 'property',
  properties: 'property',
  lead: 'lead',
  leads: 'lead',
  contract: 'contract',
  contracts: 'contract',
  owner: 'owner',
  owners: 'owner',
  renter: 'renter',
  renters: 'renter',
  tenant: 'tenant',
  user: 'user',
  rentalContract: 'rentalContract',
  rental_contract: 'rentalContract',
  'rental-contract': 'rentalContract',
  rentalPayment: 'rentalPayment',
  rental_payment: 'rentalPayment',
  'rental-payment': 'rentalPayment',
  saleProposal: 'saleProposal',
  sale_proposal: 'saleProposal',
  'sale-proposal': 'saleProposal',
  propertySale: 'propertySale',
  property_sale: 'propertySale',
  'property-sale': 'propertySale',
  financeCategory: 'financeCategory',
  finance_category: 'financeCategory',
  'finance-category': 'financeCategory',
  financeEntry: 'financeEntry',
  finance_entry: 'financeEntry',
  'finance-entry': 'financeEntry',
  leadTag: 'leadTag',
  lead_tag: 'leadTag',
  'lead-tag': 'leadTag',
  followUp: 'followUp',
  follow_up: 'followUp',
  'follow-up': 'followUp',
  propertyValuation: 'propertyValuation',
  property_valuation: 'propertyValuation',
  'property-valuation': 'propertyValuation',
  propertyInspection: 'propertyInspection',
  property_inspection: 'propertyInspection',
  'property-inspection': 'propertyInspection',
};

const UPLOAD_ENTITY_LOADERS: Record<string, (entityId: string) => Promise<TenantOwnedEntity | undefined>> = {
  property: (entityId) => storage.getProperty(entityId),
  lead: (entityId) => storage.getLead(entityId),
  contract: (entityId) => storage.getContract(entityId),
  owner: (entityId) => storage.getOwner(entityId),
  renter: (entityId) => storage.getRenter(entityId),
  rentalContract: (entityId) => storage.getRentalContract(entityId),
  rentalPayment: (entityId) => storage.getRentalPayment(entityId),
  saleProposal: (entityId) => storage.getSaleProposal(entityId),
  propertySale: (entityId) => storage.getPropertySale(entityId),
  financeCategory: (entityId) => storage.getFinanceCategory(entityId),
  financeEntry: (entityId) => storage.getFinanceEntry(entityId),
  leadTag: (entityId) => storage.getLeadTag(entityId),
  followUp: (entityId) => storage.getFollowUp(entityId),
  propertyValuation: (entityId) => storage.getPropertyValuation(entityId),
  propertyInspection: (entityId) => storage.getPropertyInspection(entityId),
};

function normalizeEntityField(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

async function resolveUploadEntity(
  tenantId: string,
  userId: string,
  entityTypeInput: unknown,
  entityIdInput: unknown
): Promise<UploadEntityResolution> {
  const rawEntityType = normalizeEntityField(entityTypeInput);
  const entityId = normalizeEntityField(entityIdInput);

  if (!rawEntityType && !entityId) {
    return {};
  }

  if (!rawEntityType || !entityId) {
    return {
      error: 'entityType and entityId must be provided together',
      status: 400,
    };
  }

  const entityType = UPLOAD_ENTITY_TYPE_ALIASES[rawEntityType];
  if (!entityType) {
    return {
      error: 'Unsupported entity type for upload',
      status: 400,
    };
  }

  if (entityType === 'tenant') {
    return entityId === tenantId
      ? { entityType, entityId }
      : { error: 'Entity not found', status: 404 };
  }

  if (entityType === 'user') {
    const user = await storage.getUser(entityId);
    if (!user || user.tenantId !== tenantId) {
      return { error: 'Entity not found', status: 404 };
    }

    return { entityType, entityId };
  }

  const entity = await UPLOAD_ENTITY_LOADERS[entityType]?.(entityId);
  if (!entity || entity.tenantId !== tenantId) {
    return { error: 'Entity not found', status: 404 };
  }

  return { entityType, entityId };
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
        const entity = await resolveUploadEntity(
          tenantId,
          userId,
          req.body.entityType,
          req.body.entityId
        );
        if (entity.error) {
          return res.status(entity.status ?? 400).json({ error: entity.error });
        }
        const bucketResolution = resolveUploadBucket(fileType, req.body.bucket);
        if (!bucketResolution.bucket) {
          return res.status(400).json({ error: bucketResolution.error });
        }
        const bucket = bucketResolution.bucket;

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
          entityType: entity.entityType,
          entityId: entity.entityId,
          isPublic: PUBLIC_UPLOAD_BUCKETS.includes(bucket),
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
    uploadPropertyImages.array('images', PROPERTY_IMAGE_MAX_FILES),
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

        const property = await storage.getProperty(propertyId);
        if (!property || property.tenantId !== tenantId) {
          return res.status(404).json({ error: 'Property not found' });
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
        if (totalSize > PROPERTY_IMAGE_TOTAL_MAX_SIZE) {
          return res.status(413).json({
            error: 'Property image batch size exceeded',
            maxSize: PROPERTY_IMAGE_TOTAL_MAX_SIZE,
          });
        }

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
        const entity = await resolveUploadEntity(
          tenantId,
          userId,
          req.body.entityType,
          req.body.entityId
        );
        if (entity.error) {
          return res.status(entity.status ?? 400).json({ error: entity.error });
        }

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
          {
            userId,
            metadata: {
              documentType,
              entityType: entity.entityType,
              entityId: entity.entityId,
            },
          }
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
          entityType: entity.entityType,
          entityId: entity.entityId,
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

      const requestedExpiresIn = parseInt(req.query.expiresIn as string);
      const expiresIn = Math.min(
        Math.max(
          Number.isNaN(requestedExpiresIn) ? 3600 : requestedExpiresIn,
          FILE_URL_MIN_EXPIRES_IN_SECONDS,
        ),
        FILE_URL_MAX_EXPIRES_IN_SECONDS,
      );
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

  // Multer error handler - catches file size limit errors and returns 413
  app.use((err: any, req: Request, res: Response, next: Function) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: 'File too large. Maximum upload size exceeded.',
          code: 'FILE_TOO_LARGE',
          status: 413,
        });
      }
      return res.status(400).json({
        error: `Upload error: ${err.message}`,
        code: 'UPLOAD_ERROR',
        status: 400,
      });
    }
    next(err);
  });
}
