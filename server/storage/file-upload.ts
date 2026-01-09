// @ts-nocheck
/**
 * FILE UPLOAD SERVICE
 *
 * Handles file uploads to Supabase Storage with validation,
 * organization by tenant/user/type, and generates signed URLs.
 *
 * SECURITY FEATURES:
 * - Magic bytes validation to prevent web shell uploads
 * - Double extension detection
 * - Dangerous file extension blacklist
 * - Null byte injection prevention
 * - Embedded script detection in images
 * - SVG sanitization to prevent XSS attacks (P0 Critical)
 */

import { supabaseStorage, STORAGE_BUCKETS, type StorageBucket, getPublicUrl, getSignedUrl } from './supabase-client';
import { nanoid } from 'nanoid';
import path from 'path';
import {
  validateFileContent,
  isExtensionDangerous,
  hasDoubleExtension,
  hasNullByteInjection,
  sanitizeFilename,
  comprehensiveFileValidation,
  type FileValidationResult as SecurityValidationResult,
} from '../security/file-validator';
import { validateAndSanitizeSVG, isSVGFile } from '../security/svg-sanitizer';

/**
 * Supported file types and their configurations
 */
export const FILE_TYPE_CONFIG = {
  image: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  },
  document: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  },
  avatar: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  logo: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.svg'],
  },
} as const;

export type FileType = keyof typeof FILE_TYPE_CONFIG;

/**
 * File upload result
 */
export interface UploadResult {
  success: boolean;
  fileId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  bucket: StorageBucket;
  size: number;
  mimeType: string;
  error?: string;
}

/**
 * File validation options
 */
export interface FileValidationOptions {
  fileType: FileType;
  maxSize?: number;
  allowedMimeTypes?: string[];
  virusScan?: boolean;
  skipMagicBytesValidation?: boolean; // For special cases, but should rarely be used
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
  warnings?: string[];
}

/**
 * Validate file before upload
 *
 * SECURITY FEATURES:
 * - Magic bytes validation to prevent web shell uploads (P0 Critical)
 * - SVG sanitization to prevent XSS (P0 Critical)
 * - Double extension detection
 * - Dangerous file extension blacklist
 * - Null byte injection prevention
 */
export async function validateFile(
  file: Express.Multer.File,
  options: FileValidationOptions
): Promise<FileValidationResult> {
  const config = FILE_TYPE_CONFIG[options.fileType];
  const warnings: string[] = [];

  // ===== PHASE 1: SECURITY CHECKS (Filename-based) =====

  // 1. Check for null byte injection
  if (hasNullByteInjection(file.originalname)) {
    console.error('[SECURITY] Null byte injection detected:', {
      filename: file.originalname,
      mimetype: file.mimetype,
    });
    return {
      valid: false,
      error: 'Filename contains null bytes - potential injection attack detected',
    };
  }

  // 2. Check for dangerous file extensions
  if (isExtensionDangerous(file.originalname)) {
    console.error('[SECURITY] Dangerous extension detected:', {
      filename: file.originalname,
      mimetype: file.mimetype,
    });
    return {
      valid: false,
      error: 'File extension is not allowed for security reasons',
    };
  }

  // 3. Check for double extensions (e.g., file.jpg.php)
  if (hasDoubleExtension(file.originalname)) {
    console.error('[SECURITY] Double extension detected:', {
      filename: file.originalname,
      mimetype: file.mimetype,
    });
    return {
      valid: false,
      error: 'Double file extensions are not allowed',
    };
  }

  // ===== PHASE 2: STANDARD VALIDATION (File properties) =====

  // 4. Check file size
  const maxSize = options.maxSize || config.maxSize;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
    };
  }

  // 5. Check if file is empty
  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // 6. Check MIME type (declared)
  const allowedMimeTypes = options.allowedMimeTypes || config.allowedMimeTypes;
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
    };
  }

  // 7. Check file extension (declared)
  const ext = path.extname(file.originalname).toLowerCase();
  if (!config.allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension ${ext} is not allowed. Allowed extensions: ${config.allowedExtensions.join(', ')}`,
    };
  }

  // ===== PHASE 3: SPECIAL FILE TYPE VALIDATION =====

  // 8. SVG Sanitization (P0 - Critical XSS Prevention)
  if (isSVGFile(file.originalname, file.mimetype)) {
    try {
      const svgContent = file.buffer.toString('utf-8');

      // Validate and sanitize SVG
      const svgResult = validateAndSanitizeSVG(svgContent);

      if (!svgResult.safe) {
        console.warn('[SECURITY] Unsafe SVG detected and blocked:', {
          filename: file.originalname,
          reason: svgResult.reason,
          warnings: svgResult.warnings,
        });

        return {
          valid: false,
          error: svgResult.reason || 'SVG contains potentially dangerous content and cannot be uploaded',
          warnings: svgResult.warnings,
        };
      }

      // Replace buffer with sanitized SVG
      file.buffer = Buffer.from(svgResult.sanitized, 'utf-8');

      // Log successful sanitization
      if (svgResult.warnings.length > 0) {
        console.log('[SECURITY] SVG sanitized successfully:', {
          filename: file.originalname,
          warnings: svgResult.warnings,
        });
        warnings.push(...svgResult.warnings);
      } else {
        console.log('[SECURITY] SVG validated as safe:', file.originalname);
      }

    } catch (error) {
      console.error('[SECURITY] SVG sanitization failed:', {
        filename: file.originalname,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        valid: false,
        error: 'Failed to sanitize SVG file. Please try a different image format.',
      };
    }
  }

  // ===== PHASE 4: MAGIC BYTES VALIDATION (Content verification) =====

  if (!options.skipMagicBytesValidation) {
    try {
      // Perform comprehensive security validation
      const securityValidation = await comprehensiveFileValidation(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      if (!securityValidation.valid) {
        console.error('[SECURITY] Comprehensive validation failed:', {
          filename: file.originalname,
          declaredMime: file.mimetype,
          detectedMime: securityValidation.detectedType,
          errors: securityValidation.errors,
        });

        return {
          valid: false,
          error: securityValidation.errors[0] || 'File content validation failed',
          detectedType: securityValidation.detectedType,
        };
      }

      // Log warnings if any
      if (securityValidation.warnings.length > 0) {
        console.warn('[SECURITY] File validation warnings:', {
          filename: file.originalname,
          warnings: securityValidation.warnings,
        });
        warnings.push(...securityValidation.warnings);
      }

      // Additional magic bytes validation for critical check
      const magicBytesValidation = await validateFileContent(
        file.buffer,
        file.mimetype,
        ext
      );

      if (!magicBytesValidation.valid) {
        console.error('[SECURITY] Magic bytes check failed:', {
          filename: file.originalname,
          declaredMime: file.mimetype,
          declaredExt: ext,
          detectedMime: magicBytesValidation.detectedType,
          error: magicBytesValidation.error,
        });

        return {
          valid: false,
          error: magicBytesValidation.error || 'File content does not match declared type',
          detectedType: magicBytesValidation.detectedType,
        };
      }

      // Success - all validations passed
      return {
        valid: true,
        detectedType: magicBytesValidation.detectedType,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      console.error('[SECURITY] Error during magic bytes validation:', error);
      // Fail secure: if validation fails, reject the file
      return {
        valid: false,
        error: `File validation error: ${error.message}`,
      };
    }
  }

  // TODO: Implement virus scanning if virusScan option is enabled
  // This would integrate with services like ClamAV or VirusTotal

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Generate organized file path
 * Format: {tenantId}/{category}/{year}/{month}/{uniqueId}-{filename}
 */
export function generateFilePath(
  tenantId: string,
  category: string,
  originalFilename: string
): { fileId: string; filePath: string; fileName: string } {
  const fileId = nanoid(16);
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // Sanitize filename
  const ext = path.extname(originalFilename);
  const baseName = path.basename(originalFilename, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .substring(0, 50);

  const fileName = `${fileId}-${baseName}${ext}`;
  const filePath = `${tenantId}/${category}/${year}/${month}/${fileName}`;

  return { fileId, filePath, fileName };
}

/**
 * Upload file to Supabase Storage
 */
export async function uploadFile(
  file: Express.Multer.File,
  bucket: StorageBucket,
  tenantId: string,
  category: string,
  options?: {
    userId?: string;
    metadata?: Record<string, any>;
  }
): Promise<UploadResult> {
  try {
    // Generate file path
    const { fileId, filePath, fileName } = generateFilePath(tenantId, category, file.originalname);

    // Upload to Supabase Storage
    const { data, error } = await supabaseStorage.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
        metadata: {
          tenantId,
          userId: options?.userId,
          category,
          originalName: file.originalname,
          ...options?.metadata,
        },
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        fileId,
        fileName,
        filePath,
        fileUrl: '',
        bucket,
        size: file.size,
        mimeType: file.mimetype,
        error: error.message,
      };
    }

    // Get file URL (public or signed based on bucket)
    const publicBuckets = [
      STORAGE_BUCKETS.PROPERTIES_IMAGES,
      STORAGE_BUCKETS.AVATARS,
      STORAGE_BUCKETS.LOGOS,
    ];

    let fileUrl: string;
    if (publicBuckets.includes(bucket)) {
      fileUrl = getPublicUrl(bucket, filePath);
    } else {
      const signedUrl = await getSignedUrl(bucket, filePath, 3600);
      fileUrl = signedUrl || '';
    }

    return {
      success: true,
      fileId,
      fileName,
      filePath: data.path,
      fileUrl,
      bucket,
      size: file.size,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error('Upload exception:', error);
    return {
      success: false,
      fileId: '',
      fileName: file.originalname,
      filePath: '',
      fileUrl: '',
      bucket,
      size: file.size,
      mimeType: file.mimetype,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: Express.Multer.File[],
  bucket: StorageBucket,
  tenantId: string,
  category: string,
  options?: {
    userId?: string;
    metadata?: Record<string, any>;
  }
): Promise<UploadResult[]> {
  const uploadPromises = files.map(file =>
    uploadFile(file, bucket, tenantId, category, options)
  );

  return Promise.all(uploadPromises);
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  bucket: StorageBucket,
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseStorage.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Delete multiple files
 */
export async function deleteMultipleFiles(
  bucket: StorageBucket,
  filePaths: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseStorage.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(bucket: StorageBucket, filePath: string) {
  try {
    const { data, error } = await supabaseStorage.storage
      .from(bucket)
      .list(path.dirname(filePath), {
        search: path.basename(filePath),
      });

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Error getting file metadata:', error);
    return null;
  }
}

/**
 * Move file to different path within same bucket
 */
export async function moveFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseStorage.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Copy file within same bucket
 */
export async function copyFile(
  bucket: StorageBucket,
  fromPath: string,
  toPath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseStorage.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
