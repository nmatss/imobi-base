/**
 * FILE CONTENT VALIDATOR
 *
 * Validates file content by checking magic bytes (file signatures)
 * to prevent web shell uploads and file type spoofing attacks.
 */

import { fileTypeFromBuffer } from 'file-type';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedType?: string;
}

/**
 * Magic bytes signatures for common file types
 * Used as fallback when file-type library cannot detect
 */
const MAGIC_BYTES_SIGNATURES: Record<string, { signature: number[][]; mime: string }> = {
  // Images
  jpeg: {
    signature: [[0xFF, 0xD8, 0xFF]],
    mime: 'image/jpeg',
  },
  png: {
    signature: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    mime: 'image/png',
  },
  gif: {
    signature: [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    mime: 'image/gif',
  },
  webp: {
    signature: [[0x52, 0x49, 0x46, 0x46]], // RIFF header (need to check WEBP at offset 8)
    mime: 'image/webp',
  },
  // Documents
  pdf: {
    signature: [[0x25, 0x50, 0x44, 0x46]], // %PDF
    mime: 'application/pdf',
  },
  zip: {
    signature: [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], // PK
    mime: 'application/zip',
  },
  docx: {
    signature: [[0x50, 0x4B, 0x03, 0x04]], // DOCX is ZIP-based
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
};

/**
 * Checks if buffer starts with any of the given signatures
 */
function matchesMagicBytes(buffer: Buffer, signatures: number[][]): boolean {
  return signatures.some(signature => {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Validates file content by checking magic bytes
 * Returns detected file type or null if unrecognized
 */
export async function validateFileContent(
  buffer: Buffer,
  declaredMimeType: string,
  declaredExtension: string
): Promise<FileValidationResult> {
  try {
    // Minimum buffer size check
    if (buffer.length < 8) {
      return {
        valid: false,
        error: 'File is too small or corrupted',
      };
    }

    // Detect type using file-type library (primary method)
    const detectedType = await fileTypeFromBuffer(buffer);

    if (!detectedType) {
      // Fallback to manual magic bytes check
      let manualDetection: { mime: string; ext: string } | null = null;

      for (const [ext, { signature, mime }] of Object.entries(MAGIC_BYTES_SIGNATURES)) {
        if (matchesMagicBytes(buffer, signature)) {
          manualDetection = { mime, ext };
          break;
        }
      }

      if (!manualDetection) {
        return {
          valid: false,
          error: 'Could not detect file type. File may be corrupted or unsupported.',
        };
      }

      // Verify against declared type
      const mimeMatches = manualDetection.mime === declaredMimeType;
      const extMatches = `.${manualDetection.ext}` === declaredExtension.toLowerCase();

      if (!mimeMatches && !extMatches) {
        return {
          valid: false,
          error: `File type mismatch. Declared: ${declaredMimeType}, Detected: ${manualDetection.mime}`,
          detectedType: manualDetection.mime,
        };
      }

      return {
        valid: true,
        detectedType: manualDetection.mime,
      };
    }

    // Normalize MIME types for comparison
    const normalizedDeclared = normalizeMimeType(declaredMimeType);
    const normalizedDetected = normalizeMimeType(detectedType.mime);

    // Check for exact match or compatible types
    const mimeMatches = normalizedDetected === normalizedDeclared;
    const extMatches = `.${detectedType.ext}` === declaredExtension.toLowerCase();

    // Special cases for compatible types
    const isCompatible = checkCompatibleTypes(normalizedDetected, normalizedDeclared, detectedType.ext, declaredExtension);

    if (!mimeMatches && !extMatches && !isCompatible) {
      return {
        valid: false,
        error: `File type mismatch. Declared: ${declaredMimeType} (${declaredExtension}), Detected: ${detectedType.mime} (.${detectedType.ext})`,
        detectedType: detectedType.mime,
      };
    }

    return {
      valid: true,
      detectedType: detectedType.mime,
    };
  } catch (error: any) {
    console.error('[FILE_VALIDATOR] Validation error:', error);
    return {
      valid: false,
      error: `File validation error: ${error.message}`,
    };
  }
}

/**
 * Normalize MIME types to handle variations
 */
function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().trim();

  // Handle common variations
  const mimeMap: Record<string, string> = {
    'image/jpg': 'image/jpeg',
    'image/pjpeg': 'image/jpeg',
    'application/x-zip-compressed': 'application/zip',
    'application/x-pdf': 'application/pdf',
  };

  return mimeMap[normalized] || normalized;
}

/**
 * Check if detected and declared types are compatible
 */
function checkCompatibleTypes(
  detectedMime: string,
  declaredMime: string,
  detectedExt: string,
  declaredExt: string
): boolean {
  // JPEG variations
  if ((detectedMime === 'image/jpeg' || detectedMime === 'image/jpg') &&
      (declaredMime === 'image/jpeg' || declaredMime === 'image/jpg')) {
    return true;
  }

  // Office documents (all are ZIP-based)
  const officeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];

  if (detectedMime === 'application/zip' && officeTypes.includes(declaredMime)) {
    return true;
  }

  return false;
}

/**
 * Blacklist of dangerous file extensions
 * These should NEVER be allowed to be uploaded
 */
const DANGEROUS_EXTENSIONS = new Set([
  // Web shells and scripts
  '.php', '.phtml', '.php3', '.php4', '.php5', '.php7', '.phps', '.pht', '.phar',
  '.asp', '.aspx', '.cer', '.asa', '.asax', '.ashx', '.asmx',
  '.jsp', '.jspx', '.jsw', '.jsv', '.jspf',

  // Executables
  '.exe', '.bat', '.cmd', '.com', '.scr', '.msi', '.dll', '.sys',
  '.app', '.deb', '.rpm', '.dmg', '.pkg',

  // Shell scripts
  '.sh', '.bash', '.zsh', '.fish', '.csh', '.ksh',
  '.ps1', '.psm1', '.psd1', '.ps1xml', '.pssc', '.psc1',

  // Scripts
  '.py', '.pyc', '.pyo', '.pyw', '.pyz', '.pyzw',
  '.rb', '.rbw',
  '.pl', '.pm', '.t', '.pod',
  '.cgi', '.fcgi',
  '.jar', '.war', '.ear',

  // Server configs
  '.htaccess', '.htpasswd', '.ini', '.config', '.conf',
  '.env', '.yml', '.yaml',

  // Other dangerous
  '.vbs', '.vbe', '.js', '.jse', '.ws', '.wsf', '.wsc', '.wsh',
  '.hta', '.reg', '.lnk', '.scf', '.inf',
  '.sql', '.sqlite', '.db',
]);

/**
 * Check if file extension is in the dangerous blacklist
 */
export function isExtensionDangerous(filename: string): boolean {
  const ext = getFileExtension(filename);
  return DANGEROUS_EXTENSIONS.has(ext);
}

/**
 * Check for double extensions (e.g., file.jpg.php)
 * This is a common technique to bypass file upload filters
 */
export function hasDoubleExtension(filename: string): boolean {
  const parts = filename.split('.');

  // Need at least 3 parts: name.ext1.ext2
  if (parts.length <= 2) return false;

  // Check last two extensions
  const lastTwo = parts.slice(-2).map(p => `.${p.toLowerCase()}`);

  // If any of the last two extensions is dangerous, it's suspicious
  return lastTwo.some(ext => DANGEROUS_EXTENSIONS.has(ext));
}

/**
 * Check for null byte injection in filename
 * Attackers use null bytes to truncate filenames and bypass validation
 */
export function hasNullByteInjection(filename: string): boolean {
  return filename.includes('\0') || filename.includes('%00');
}

/**
 * Sanitize filename to prevent path traversal and other attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove null bytes
  let sanitized = filename.replace(/\0/g, '').replace(/%00/g, '');

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[\/\\]/g, '');

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>:"|?*]/g, '');

  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - ext.length);
    sanitized = truncatedName + ext;
  }

  return sanitized;
}

/**
 * Get file extension including the dot
 */
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filename.substring(lastDot).toLowerCase();
}

/**
 * Comprehensive file security validation
 * Performs all security checks in one go
 */
export interface ComprehensiveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  detectedType?: string;
}

export async function comprehensiveFileValidation(
  buffer: Buffer,
  filename: string,
  declaredMimeType: string
): Promise<ComprehensiveValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let detectedType: string | undefined;

  // 1. Check for null byte injection
  if (hasNullByteInjection(filename)) {
    errors.push('Filename contains null bytes - potential injection attack');
  }

  // 2. Check for dangerous extensions
  if (isExtensionDangerous(filename)) {
    errors.push('File extension is not allowed for security reasons');
  }

  // 3. Check for double extensions
  if (hasDoubleExtension(filename)) {
    errors.push('Double file extensions are not allowed');
  }

  // 4. Check file size
  if (buffer.length === 0) {
    errors.push('File is empty');
  }

  if (buffer.length > 100 * 1024 * 1024) { // 100MB absolute max
    errors.push('File size exceeds absolute maximum of 100MB');
  }

  // 5. Validate magic bytes
  const declaredExtension = getFileExtension(filename);
  const magicBytesResult = await validateFileContent(buffer, declaredMimeType, declaredExtension);

  if (!magicBytesResult.valid) {
    errors.push(magicBytesResult.error || 'Magic bytes validation failed');
  }

  // Always capture detected type if available, even on validation failure
  if (magicBytesResult.detectedType) {
    detectedType = magicBytesResult.detectedType;
  }

  // 6. Check for embedded scripts in images (basic check)
  if (declaredMimeType.startsWith('image/')) {
    const bufferStr = buffer.toString('utf8', 0, Math.min(1024, buffer.length));
    const scriptPatterns = [
      '<?php',
      '<%',
      '<script',
      'eval(',
      'base64_decode',
      'system(',
      'exec(',
      'passthru(',
      'shell_exec',
    ];

    for (const pattern of scriptPatterns) {
      if (bufferStr.includes(pattern)) {
        warnings.push(`Suspicious content detected in image file: ${pattern}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    detectedType,
  };
}
