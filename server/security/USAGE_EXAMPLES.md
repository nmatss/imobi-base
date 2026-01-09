# File Validator - Usage Examples

Complete guide with practical examples for using the magic bytes validation system.

## 📚 Table of Contents

1. [Basic Usage](#basic-usage)
2. [Advanced Validation](#advanced-validation)
3. [Custom Configurations](#custom-configurations)
4. [Error Handling](#error-handling)
5. [Security Logging](#security-logging)
6. [Integration Examples](#integration-examples)

## Basic Usage

### Example 1: Simple File Validation

```typescript
import { validateFile } from '../storage/file-upload';

// In your Express route handler
app.post('/api/upload', upload.single('file'), async (req, res) => {
  // Validate the uploaded file
  const validation = await validateFile(req.file, {
    fileType: 'image'
  });

  if (!validation.valid) {
    return res.status(400).json({
      error: validation.error
    });
  }

  // File is valid, proceed with upload
  // ...
});
```

### Example 2: Validate with Custom MIME Types

```typescript
const validation = await validateFile(req.file, {
  fileType: 'document',
  allowedMimeTypes: ['application/pdf', 'application/msword'],
  maxSize: 10 * 1024 * 1024 // 10MB
});

if (!validation.valid) {
  return res.status(400).json({
    error: validation.error,
    detectedType: validation.detectedType
  });
}
```

## Advanced Validation

### Example 3: Comprehensive Security Check

```typescript
import { comprehensiveFileValidation } from '../security/file-validator';

async function secureFileUpload(file: Express.Multer.File) {
  // Run all security checks
  const result = await comprehensiveFileValidation(
    file.buffer,
    file.originalname,
    file.mimetype
  );

  if (!result.valid) {
    console.error('[SECURITY] File validation failed:', {
      filename: file.originalname,
      errors: result.errors,
      detectedType: result.detectedType
    });

    throw new Error(`Security validation failed: ${result.errors.join(', ')}`);
  }

  // Log warnings if any
  if (result.warnings.length > 0) {
    console.warn('[SECURITY] File validation warnings:', {
      filename: file.originalname,
      warnings: result.warnings
    });
  }

  return {
    safe: true,
    detectedType: result.detectedType
  };
}
```

### Example 4: Individual Security Checks

```typescript
import {
  isExtensionDangerous,
  hasDoubleExtension,
  hasNullByteInjection,
  sanitizeFilename
} from '../security/file-validator';

function validateFilename(filename: string): { valid: boolean; error?: string } {
  // Check for null byte injection
  if (hasNullByteInjection(filename)) {
    return {
      valid: false,
      error: 'Null byte injection detected in filename'
    };
  }

  // Check for dangerous extensions
  if (isExtensionDangerous(filename)) {
    return {
      valid: false,
      error: 'File extension is not allowed'
    };
  }

  // Check for double extensions
  if (hasDoubleExtension(filename)) {
    return {
      valid: false,
      error: 'Double file extensions are not allowed'
    };
  }

  return { valid: true };
}

// Usage
const filenameCheck = validateFilename(req.file.originalname);
if (!filenameCheck.valid) {
  return res.status(400).json({ error: filenameCheck.error });
}
```

### Example 5: Magic Bytes Validation Only

```typescript
import { validateFileContent } from '../security/file-validator';

async function checkFileMagicBytes(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase();

  const validation = await validateFileContent(
    file.buffer,
    file.mimetype,
    ext
  );

  if (!validation.valid) {
    console.error('[SECURITY] Magic bytes mismatch:', {
      filename: file.originalname,
      declared: file.mimetype,
      detected: validation.detectedType,
      error: validation.error
    });

    return false;
  }

  console.log('[SECURITY] Magic bytes validated:', {
    filename: file.originalname,
    type: validation.detectedType
  });

  return true;
}
```

## Custom Configurations

### Example 6: Skip Magic Bytes Validation (Not Recommended)

```typescript
// Only use when absolutely necessary!
const validation = await validateFile(req.file, {
  fileType: 'document',
  skipMagicBytesValidation: true // ⚠️ Use with caution
});

if (!validation.valid) {
  return res.status(400).json({ error: validation.error });
}
```

### Example 7: Custom File Type Configuration

```typescript
// Define custom file type config
const customConfig = {
  fileType: 'image' as const,
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
};

const validation = await validateFile(req.file, customConfig);

if (!validation.valid) {
  return res.status(400).json({
    error: validation.error,
    maxSize: '5MB',
    allowedTypes: customConfig.allowedMimeTypes
  });
}
```

## Error Handling

### Example 8: Detailed Error Handling

```typescript
app.post('/api/upload/avatar', upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }

    const validation = await validateFile(req.file, {
      fileType: 'avatar'
    });

    if (!validation.valid) {
      // Log security event
      console.error('[SECURITY] Avatar upload rejected:', {
        userId: req.user?.id,
        filename: req.file.originalname,
        error: validation.error,
        detectedType: validation.detectedType,
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        error: validation.error,
        code: 'VALIDATION_FAILED',
        details: {
          detectedType: validation.detectedType,
          declaredType: req.file.mimetype
        }
      });
    }

    // Log warnings
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('[SECURITY] Avatar validation warnings:', {
        userId: req.user?.id,
        filename: req.file.originalname,
        warnings: validation.warnings
      });
    }

    // Proceed with upload
    // ...

    res.json({
      success: true,
      file: {
        // ... file details
      }
    });

  } catch (error) {
    console.error('[UPLOAD] Avatar upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
```

### Example 9: Validation with Retry Logic

```typescript
async function uploadWithRetry(
  file: Express.Multer.File,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const validation = await validateFile(file, {
        fileType: 'image'
      });

      if (!validation.valid) {
        if (attempt < maxRetries) {
          console.warn(`[UPLOAD] Validation failed (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        return {
          success: false,
          error: validation.error
        };
      }

      // Validation successful
      return { success: true };

    } catch (error) {
      if (attempt === maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Validation error'
        };
      }

      console.warn(`[UPLOAD] Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}
```

## Security Logging

### Example 10: Comprehensive Security Logging

```typescript
import { comprehensiveFileValidation } from '../security/file-validator';

async function logSecurityEvent(
  event: 'UPLOAD_ATTEMPT' | 'VALIDATION_FAILED' | 'UPLOAD_SUCCESS',
  details: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ...details
  };

  // Log to console
  console.log(`[SECURITY] ${event}:`, JSON.stringify(logEntry, null, 2));

  // TODO: Send to security monitoring system
  // await sendToSecurityMonitoring(logEntry);
}

app.post('/api/secure-upload', upload.single('file'), async (req, res) => {
  const userId = req.user?.id;
  const filename = req.file?.originalname;

  await logSecurityEvent('UPLOAD_ATTEMPT', {
    userId,
    filename,
    size: req.file?.size,
    mimetype: req.file?.mimetype
  });

  const validation = await comprehensiveFileValidation(
    req.file!.buffer,
    filename!,
    req.file!.mimetype
  );

  if (!validation.valid) {
    await logSecurityEvent('VALIDATION_FAILED', {
      userId,
      filename,
      errors: validation.errors,
      detectedType: validation.detectedType
    });

    return res.status(400).json({
      error: 'File validation failed',
      details: validation.errors
    });
  }

  // Upload file...

  await logSecurityEvent('UPLOAD_SUCCESS', {
    userId,
    filename,
    detectedType: validation.detectedType,
    warnings: validation.warnings
  });

  res.json({ success: true });
});
```

## Integration Examples

### Example 11: Integration with Multer Middleware

```typescript
import multer from 'multer';
import { validateFile } from '../storage/file-upload';

// Create custom storage with validation
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: async (req, file, cb) => {
    // Note: fileFilter in multer is synchronous, so we do basic checks here
    // Full validation happens in route handler

    // Basic extension check
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

    if (!allowedExts.includes(ext)) {
      cb(new Error('Invalid file extension'));
      return;
    }

    cb(null, true);
  }
});

// Route handler with full validation
app.post('/api/upload', upload.single('image'), async (req, res) => {
  // Perform full magic bytes validation
  const validation = await validateFile(req.file!, {
    fileType: 'image'
  });

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  // Upload file...
});
```

### Example 12: Batch File Validation

```typescript
async function validateMultipleFiles(
  files: Express.Multer.File[]
): Promise<{
  valid: boolean;
  results: Array<{ filename: string; valid: boolean; error?: string }>;
}> {
  const results = await Promise.all(
    files.map(async (file) => {
      const validation = await validateFile(file, {
        fileType: 'image'
      });

      return {
        filename: file.originalname,
        valid: validation.valid,
        error: validation.error,
        detectedType: validation.detectedType
      };
    })
  );

  const allValid = results.every(r => r.valid);

  return {
    valid: allValid,
    results
  };
}

// Usage
app.post('/api/upload/multiple', upload.array('images', 10), async (req, res) => {
  const files = req.files as Express.Multer.File[];

  const validation = await validateMultipleFiles(files);

  if (!validation.valid) {
    const failedFiles = validation.results.filter(r => !r.valid);

    return res.status(400).json({
      error: 'Some files failed validation',
      failedFiles
    });
  }

  // All files valid, proceed with upload...
  res.json({ success: true, count: files.length });
});
```

### Example 13: Filename Sanitization

```typescript
import { sanitizeFilename } from '../security/file-validator';

function processUpload(file: Express.Multer.File) {
  // Sanitize the filename
  const safeFilename = sanitizeFilename(file.originalname);

  console.log('Original:', file.originalname);
  console.log('Sanitized:', safeFilename);

  // Use sanitized filename for storage
  return {
    originalName: file.originalname,
    storageName: safeFilename,
    // ... other properties
  };
}

// Examples:
// "../../../etc/passwd" -> "etcpasswd"
// "file<script>.jpg" -> "filescript.jpg"
// "normal file.jpg" -> "normal file.jpg"
```

## Testing Examples

### Example 14: Unit Testing Validation

```typescript
import { describe, it, expect } from 'vitest';
import { validateFileContent, isExtensionDangerous } from '../security/file-validator';

describe('File Validator', () => {
  it('should detect dangerous extensions', () => {
    expect(isExtensionDangerous('shell.php')).toBe(true);
    expect(isExtensionDangerous('safe.jpg')).toBe(false);
  });

  it('should validate JPEG magic bytes', async () => {
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46
    ]);

    const result = await validateFileContent(
      jpegBuffer,
      'image/jpeg',
      '.jpg'
    );

    expect(result.valid).toBe(true);
    expect(result.detectedType).toBe('image/jpeg');
  });

  it('should detect file type mismatch', async () => {
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    ]);

    const result = await validateFileContent(
      pngBuffer,
      'image/jpeg',
      '.jpg'
    );

    expect(result.valid).toBe(false);
    expect(result.error).toContain('mismatch');
  });
});
```

---

## 🔐 Security Best Practices

1. **Always validate on the server** - Never trust client-side validation
2. **Log all security events** - Track validation failures for security monitoring
3. **Use default settings** - Don't skip magic bytes validation unless absolutely necessary
4. **Sanitize filenames** - Always sanitize before storing
5. **Monitor warnings** - Review files with warnings even if allowed
6. **Regular updates** - Keep `file-type` library updated
7. **Rate limiting** - Implement rate limiting on upload endpoints
8. **Virus scanning** - Consider adding ClamAV for additional security

## 📚 Additional Resources

- [File Validator Source Code](/server/security/file-validator.ts)
- [Implementation Guide](/MAGIC_BYTES_VALIDATION_IMPLEMENTATION.md)
- [Security Summary](/MAGIC_BYTES_SECURITY_SUMMARY.md)
- [Test Suite](/server/security/file-validator.test.ts)
