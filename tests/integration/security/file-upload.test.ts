/**
 * File Upload Security Integration Tests
 * Tests malicious file detection, validation, and sanitization
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import multer from 'multer';
import {
  comprehensiveFileValidation,
  isExtensionDangerous,
  hasDoubleExtension,
  hasNullByteInjection,
  sanitizeFilename as sanitizeFilenameSecurity
} from '../../../server/security/file-validator';

const upload = multer({ storage: multer.memoryStorage() });

function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  // File upload endpoint with security validation
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { originalname, buffer, mimetype } = req.file;

      // 1. Check for dangerous extensions
      if (isExtensionDangerous(originalname)) {
        return res.status(400).json({
          error: 'File type not allowed',
          code: 'DANGEROUS_EXTENSION',
        });
      }

      // 2. Check for double extensions
      if (hasDoubleExtension(originalname)) {
        return res.status(400).json({
          error: 'Double extensions not allowed',
          code: 'DOUBLE_EXTENSION',
        });
      }

      // 3. Check for null byte injection
      if (hasNullByteInjection(originalname)) {
        return res.status(400).json({
          error: 'Invalid filename characters',
          code: 'NULL_BYTE_INJECTION',
        });
      }

      // 4. Comprehensive validation
      const validation = await comprehensiveFileValidation(
        buffer,
        originalname,
        mimetype
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: 'File validation failed',
          code: 'VALIDATION_FAILED',
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      // 5. Sanitize filename
      const sanitizedFilename = sanitizeFilenameSecurity(originalname);

      res.json({
        success: true,
        filename: sanitizedFilename,
        size: buffer.length,
        detectedType: validation.detectedType,
        warnings: validation.warnings,
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      res.status(500).json({
        error: 'Upload failed',
        message: error.message,
      });
    }
  });

  // Simple upload endpoint without validation (for testing)
  app.post('/api/upload-unsafe', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      success: true,
      filename: req.file.originalname,
      size: req.file.size,
    });
  });

  return app;
}

describe('File Upload Security Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Malicious File Detection', () => {
    it('should reject PHP web shell upload', async () => {
      const phpShell = Buffer.from('<?php system($_GET["cmd"]); ?>');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', phpShell, 'shell.php')
        .expect(400);

      expect(res.body.error).toContain('File type not allowed');
      expect(res.body.code).toBe('DANGEROUS_EXTENSION');
    });

    it('should reject executable file upload', async () => {
      const exe = Buffer.from('MZ'); // EXE magic bytes

      const res = await request(app)
        .post('/api/upload')
        .attach('file', exe, 'malware.exe')
        .expect(400);

      expect(res.body.error).toContain('File type not allowed');
      expect(res.body.code).toBe('DANGEROUS_EXTENSION');
    });

    it('should reject shell script upload', async () => {
      const script = Buffer.from('#!/bin/bash\nrm -rf /');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', script, 'evil.sh')
        .expect(400);

      expect(res.body.error).toContain('File type not allowed');
      expect(res.body.code).toBe('DANGEROUS_EXTENSION');
    });

    it('should reject ASP web shell upload', async () => {
      const aspShell = Buffer.from('<%@ Page Language="C#" %>');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', aspShell, 'shell.aspx')
        .expect(400);

      expect(res.body.error).toContain('File type not allowed');
      expect(res.body.code).toBe('DANGEROUS_EXTENSION');
    });

    it('should reject JSP web shell upload', async () => {
      const jspShell = Buffer.from('<%@ page import="java.io.*" %>');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', jspShell, 'shell.jsp')
        .expect(400);

      expect(res.body.error).toContain('File type not allowed');
      expect(res.body.code).toBe('DANGEROUS_EXTENSION');
    });
  });

  describe('Double Extension Attack Prevention', () => {
    it('should reject file with double extension (image.jpg.php)', async () => {
      const phpContent = Buffer.from('<?php echo "pwned"; ?>');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', phpContent, 'image.jpg.php')
        .expect(400);

      expect(res.body.error).toContain('Double extensions not allowed');
      expect(res.body.code).toBe('DOUBLE_EXTENSION');
    });

    it('should reject file with double extension (doc.pdf.exe)', async () => {
      const exeContent = Buffer.from('MZ');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', exeContent, 'document.pdf.exe')
        .expect(400);

      expect(res.body.code).toBe('DANGEROUS_EXTENSION');
    });

    it('should reject file with triple extension (file.txt.sh.php)', async () => {
      const phpContent = Buffer.from('<?php system($_GET["c"]); ?>');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', phpContent, 'readme.txt.sh.php')
        .expect(400);

      expect(res.body.code).toBe('DANGEROUS_EXTENSION');
    });
  });

  describe('Null Byte Injection Prevention', () => {
    it('should reject filename with null byte (image.jpg\\x00.php)', async () => {
      const content = Buffer.from('fake image');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', content, 'image.jpg\x00.php')
        .expect(400);

      expect(res.body.error).toContain('Invalid filename');
      expect(res.body.code).toBe('NULL_BYTE_INJECTION');
    });

    it('should reject filename with URL-encoded null byte', async () => {
      const content = Buffer.from('test');

      const res = await request(app)
        .post('/api/upload')
        .attach('file', content, 'image.jpg%00.php')
        .expect(400);

      expect(res.body.code).toBe('NULL_BYTE_INJECTION');
    });
  });

  describe('Magic Bytes Validation', () => {
    it('should reject fake image (PHP with .jpg extension)', async () => {
      const phpContent = Buffer.from('<?php echo "fake"; ?>');

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg')
        .attach('file', phpContent, 'fake-image.jpg')
        .expect(400);

      expect(res.body.error).toContain('File validation failed');
      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('should accept valid JPEG image', async () => {
      // JPEG magic bytes: FF D8 FF
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const jpegContent = Buffer.concat([jpegHeader, Buffer.alloc(1000)]);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg')
        .attach('file', jpegContent, 'valid-image.jpg')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.detectedType).toContain('image');
    });

    it('should accept valid PNG image', async () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      const pngContent = Buffer.concat([pngHeader, Buffer.alloc(1000)]);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/png')
        .attach('file', pngContent, 'valid-image.png')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.detectedType).toContain('image');
    });

    it('should accept valid PDF document', async () => {
      // PDF magic bytes: %PDF
      const pdfHeader = Buffer.from('%PDF-1.4\n');
      const pdfContent = Buffer.concat([pdfHeader, Buffer.alloc(1000)]);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'application/pdf')
        .attach('file', pdfContent, 'document.pdf')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.detectedType).toContain('pdf');
    });
  });

  describe('Embedded Script Detection', () => {
    it('should detect embedded PHP in image file', async () => {
      // JPEG header + embedded PHP
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const embeddedPhp = Buffer.from('<?php system("whoami"); ?>');
      const maliciousImage = Buffer.concat([jpegHeader, embeddedPhp, Buffer.alloc(500)]);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg')
        .attach('file', maliciousImage, 'image-with-php.jpg')
        .expect(200); // Accepted but with warnings

      expect(res.body.warnings).toBeDefined();
      expect(res.body.warnings.length).toBeGreaterThan(0);
      expect(res.body.warnings.some((w: string) => w.includes('Suspicious content'))).toBe(true);
    });

    it('should detect eval() in image file', async () => {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
      const embeddedScript = Buffer.from('eval(atob("malicious"))');
      const maliciousImage = Buffer.concat([jpegHeader, embeddedScript, Buffer.alloc(500)]);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg')
        .attach('file', maliciousImage, 'image-with-eval.jpg')
        .expect(200);

      expect(res.body.warnings).toBeDefined();
      expect(res.body.warnings.some((w: string) => w.includes('Suspicious content'))).toBe(true);
    });
  });

  describe('File Size Validation', () => {
    it('should reject empty file', async () => {
      const emptyBuffer = Buffer.alloc(0);

      const res = await request(app)
        .post('/api/upload')
        .attach('file', emptyBuffer, 'empty.txt')
        .expect(400);

      expect(res.body.errors).toContain('File is empty');
    });

    it('should reject file exceeding maximum size (100MB)', async () => {
      // Note: This test creates a large buffer, might be slow
      const hugeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB

      const res = await request(app)
        .post('/api/upload')
        .attach('file', hugeBuffer, 'huge.txt')
        .expect(400);

      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some((e: string) => e.includes('exceeds'))).toBe(true);
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize filename with path traversal attempt', async () => {
      const content = Buffer.from('test content');

      const res = await request(app)
        .post('/api/upload-unsafe')
        .attach('file', content, '../../../etc/passwd')
        .expect(200);

      // Filename should be sanitized
      expect(res.body.filename).not.toContain('../');
    });

    it('should sanitize filename with special characters', async () => {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const jpegContent = Buffer.concat([jpegHeader, Buffer.alloc(100)]);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg')
        .attach('file', jpegContent, 'test<script>.jpg')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.filename).not.toContain('<');
      expect(res.body.filename).not.toContain('>');
    });

    it('should handle very long filenames', async () => {
      const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
      const jpegContent = Buffer.concat([jpegHeader, Buffer.alloc(100)]);

      const longFilename = 'a'.repeat(300) + '.jpg';

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg')
        .attach('file', jpegContent, longFilename)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.filename.length).toBeLessThanOrEqual(255);
    });
  });

  describe('MIME Type Validation', () => {
    it('should reject MIME type mismatch', async () => {
      // PDF content declared as image
      const pdfContent = Buffer.from('%PDF-1.4\n' + 'a'.repeat(100));

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg')
        .attach('file', pdfContent, 'fake.jpg')
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.errors.some((e: string) => e.includes('mismatch'))).toBe(true);
    });
  });

  describe('Content-Type Spoofing Prevention', () => {
    it('should validate actual file content, not just Content-Type header', async () => {
      // PHP file with fake Content-Type
      const phpContent = Buffer.from('<?php phpinfo(); ?>');

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/jpeg') // Fake MIME type
        .attach('file', phpContent, 'shell.jpg')
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });

    it('should reject HTML file disguised as image', async () => {
      const htmlContent = Buffer.from('<!DOCTYPE html><html><body><script>alert(1)</script></body></html>');

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/png')
        .attach('file', htmlContent, 'malicious.png')
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('SVG Upload Security', () => {
    it('should reject SVG with embedded JavaScript', async () => {
      const maliciousSvg = Buffer.from(`
        <?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns="http://www.w3.org/2000/svg">
          <script>alert('XSS')</script>
        </svg>
      `);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'image/svg+xml')
        .attach('file', maliciousSvg, 'malicious.svg')
        .expect(400);

      expect(res.body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('Archive File Validation', () => {
    it('should accept valid ZIP file', async () => {
      // ZIP magic bytes: PK
      const zipHeader = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
      const zipContent = Buffer.concat([zipHeader, Buffer.alloc(100)]);

      const res = await request(app)
        .post('/api/upload')
        .field('mimetype', 'application/zip')
        .attach('file', zipContent, 'archive.zip')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
