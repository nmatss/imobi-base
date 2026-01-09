/**
 * FILE VALIDATOR TEST SUITE
 *
 * Comprehensive tests for file-validator.ts security functions
 * Tests magic bytes validation, dangerous extension detection, and file security
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateFileContent,
  isExtensionDangerous,
  hasDoubleExtension,
  hasNullByteInjection,
  sanitizeFilename,
  comprehensiveFileValidation,
  type FileValidationResult,
  type ComprehensiveValidationResult,
} from './file-validator';

// Mock file-type library (ESM-only, needs mocking in test environment)
vi.mock('file-type', () => ({
  fileTypeFromBuffer: async (buffer: Buffer) => {
    // Simulate magic bytes detection
    const bytes = Array.from(buffer.slice(0, 16));

    // JPEG: FF D8 FF
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
      return { ext: 'jpg', mime: 'image/jpeg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
      return { ext: 'png', mime: 'image/png' };
    }

    // GIF87a: 47 49 46 38 37 61
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && bytes[4] === 0x37) {
      return { ext: 'gif', mime: 'image/gif' };
    }

    // GIF89a: 47 49 46 38 39 61
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38 && bytes[4] === 0x39) {
      return { ext: 'gif', mime: 'image/gif' };
    }

    // PDF: 25 50 44 46 (%PDF)
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return { ext: 'pdf', mime: 'application/pdf' };
    }

    // ZIP: 50 4B 03 04 or 50 4B 05 06
    if (bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 0x03 || bytes[2] === 0x05)) {
      return { ext: 'zip', mime: 'application/zip' };
    }

    return undefined;
  },
}));

describe('File Validator Security Tests', () => {
  // Helper function to create buffers - just use standard Buffer.from
  const createBuffer = (bytes: number[]): Buffer => {
    return Buffer.from(bytes);
  };

  describe('validateFileContent - Magic Bytes Validation', () => {
    it('should validate a valid JPEG file', async () => {
      // JPEG magic bytes: FF D8 FF
      const jpegBuffer = createBuffer([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);

      const result = await validateFileContent(jpegBuffer, 'image/jpeg', '.jpg');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.detectedType).toBe('image/jpeg');
    });

    it('should validate a valid PNG file', async () => {
      // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = createBuffer([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      ]);

      const result = await validateFileContent(pngBuffer, 'image/png', '.png');

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/png');
    });

    it('should validate a valid GIF file (GIF87a)', async () => {
      // GIF87a magic bytes: 47 49 46 38 37 61
      const gifBuffer = createBuffer([
        0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      const result = await validateFileContent(gifBuffer, 'image/gif', '.gif');

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/gif');
    });

    it('should validate a valid GIF file (GIF89a)', async () => {
      // GIF89a magic bytes: 47 49 46 38 39 61
      const gifBuffer = createBuffer([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      const result = await validateFileContent(gifBuffer, 'image/gif', '.gif');

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/gif');
    });

    it('should validate a valid PDF file', async () => {
      // PDF magic bytes: 25 50 44 46 (%PDF)
      const pdfBuffer = createBuffer([
        0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34,
        0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A, 0x00,
      ]);

      const result = await validateFileContent(pdfBuffer, 'application/pdf', '.pdf');

      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('application/pdf');
    });

    it('should detect file type spoofing - PNG claiming to be JPEG', async () => {
      const pngBuffer = createBuffer([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      ]);

      const result = await validateFileContent(pngBuffer, 'image/jpeg', '.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type mismatch');
      expect(result.detectedType).toBe('image/png');
    });

    it('should detect file type spoofing - JPEG claiming to be PNG', async () => {
      const jpegBuffer = createBuffer([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);

      const result = await validateFileContent(jpegBuffer, 'image/png', '.png');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('File type mismatch');
      expect(result.detectedType).toBe('image/jpeg');
    });

    it('should reject empty files', async () => {
      const emptyBuffer = createBuffer([]);

      const result = await validateFileContent(emptyBuffer, 'image/jpeg', '.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small or corrupted');
    });

    it('should reject files that are too small (< 8 bytes)', async () => {
      const tinyBuffer = createBuffer([0xFF, 0xD8, 0xFF]);

      const result = await validateFileContent(tinyBuffer, 'image/jpeg', '.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small or corrupted');
    });

    it('should reject corrupted files with unrecognized magic bytes', async () => {
      const corruptedBuffer = createBuffer([
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      const result = await validateFileContent(corruptedBuffer, 'image/jpeg', '.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Could not detect file type|File type mismatch/);
    });

    it('should accept JPEG with alternative MIME type (image/jpg)', async () => {
      const jpegBuffer = createBuffer([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);

      const result = await validateFileContent(jpegBuffer, 'image/jpg', '.jpg');

      expect(result.valid).toBe(true);
    });

    it('should accept JPEG with pjpeg MIME type', async () => {
      const jpegBuffer = createBuffer([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);

      const result = await validateFileContent(jpegBuffer, 'image/pjpeg', '.jpg');

      expect(result.valid).toBe(true);
    });

    it('should validate ZIP files', async () => {
      // ZIP magic bytes: 50 4B 03 04
      const zipBuffer = createBuffer([
        0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00,
        0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      const result = await validateFileContent(zipBuffer, 'application/zip', '.zip');

      expect(result.valid).toBe(true);
    });
  });

  describe('isExtensionDangerous - Dangerous Extension Detection', () => {
    describe('Web shell extensions', () => {
      it('should detect .php as dangerous', () => {
        expect(isExtensionDangerous('shell.php')).toBe(true);
      });

      it('should detect .phtml as dangerous', () => {
        expect(isExtensionDangerous('webshell.phtml')).toBe(true);
      });

      it('should detect .php5 as dangerous', () => {
        expect(isExtensionDangerous('backdoor.php5')).toBe(true);
      });

      it('should detect .asp as dangerous', () => {
        expect(isExtensionDangerous('webshell.asp')).toBe(true);
      });

      it('should detect .aspx as dangerous', () => {
        expect(isExtensionDangerous('malicious.aspx')).toBe(true);
      });

      it('should detect .jsp as dangerous', () => {
        expect(isExtensionDangerous('shell.jsp')).toBe(true);
      });
    });

    describe('Executable extensions', () => {
      it('should detect .exe as dangerous', () => {
        expect(isExtensionDangerous('malware.exe')).toBe(true);
      });

      it('should detect .bat as dangerous', () => {
        expect(isExtensionDangerous('script.bat')).toBe(true);
      });

      it('should detect .cmd as dangerous', () => {
        expect(isExtensionDangerous('command.cmd')).toBe(true);
      });

      it('should detect .dll as dangerous', () => {
        expect(isExtensionDangerous('library.dll')).toBe(true);
      });

      it('should detect .msi as dangerous', () => {
        expect(isExtensionDangerous('installer.msi')).toBe(true);
      });
    });

    describe('Script extensions', () => {
      it('should detect .sh as dangerous', () => {
        expect(isExtensionDangerous('script.sh')).toBe(true);
      });

      it('should detect .bash as dangerous', () => {
        expect(isExtensionDangerous('malicious.bash')).toBe(true);
      });

      it('should detect .ps1 as dangerous', () => {
        expect(isExtensionDangerous('powershell.ps1')).toBe(true);
      });

      it('should detect .py as dangerous', () => {
        expect(isExtensionDangerous('script.py')).toBe(true);
      });

      it('should detect .rb as dangerous', () => {
        expect(isExtensionDangerous('ruby.rb')).toBe(true);
      });

      it('should detect .pl as dangerous', () => {
        expect(isExtensionDangerous('perl.pl')).toBe(true);
      });
    });

    describe('Configuration file extensions', () => {
      it('should detect .htaccess as dangerous', () => {
        expect(isExtensionDangerous('.htaccess')).toBe(true);
      });

      it('should detect .env as dangerous', () => {
        expect(isExtensionDangerous('.env')).toBe(true);
      });

      it('should detect .ini as dangerous', () => {
        expect(isExtensionDangerous('config.ini')).toBe(true);
      });

      it('should detect .yml as dangerous', () => {
        expect(isExtensionDangerous('docker-compose.yml')).toBe(true);
      });
    });

    describe('Safe extensions', () => {
      it('should allow .jpg', () => {
        expect(isExtensionDangerous('photo.jpg')).toBe(false);
      });

      it('should allow .png', () => {
        expect(isExtensionDangerous('image.png')).toBe(false);
      });

      it('should allow .pdf', () => {
        expect(isExtensionDangerous('document.pdf')).toBe(false);
      });

      it('should allow .txt', () => {
        expect(isExtensionDangerous('readme.txt')).toBe(false);
      });

      it('should allow .docx', () => {
        expect(isExtensionDangerous('report.docx')).toBe(false);
      });

      it('should allow .xlsx', () => {
        expect(isExtensionDangerous('spreadsheet.xlsx')).toBe(false);
      });
    });

    describe('Case insensitivity', () => {
      it('should detect .PHP (uppercase) as dangerous', () => {
        expect(isExtensionDangerous('shell.PHP')).toBe(true);
      });

      it('should detect .ExE (mixed case) as dangerous', () => {
        expect(isExtensionDangerous('malware.ExE')).toBe(true);
      });

      it('should detect .AsP (mixed case) as dangerous', () => {
        expect(isExtensionDangerous('webshell.AsP')).toBe(true);
      });
    });
  });

  describe('hasDoubleExtension - Double Extension Attack Detection', () => {
    describe('Dangerous double extensions', () => {
      it('should detect .jpg.php', () => {
        expect(hasDoubleExtension('image.jpg.php')).toBe(true);
      });

      it('should detect .png.php', () => {
        expect(hasDoubleExtension('photo.png.php')).toBe(true);
      });

      it('should detect .pdf.exe', () => {
        expect(hasDoubleExtension('document.pdf.exe')).toBe(true);
      });

      it('should detect .txt.sh', () => {
        expect(hasDoubleExtension('readme.txt.sh')).toBe(true);
      });

      it('should detect .doc.asp', () => {
        expect(hasDoubleExtension('report.doc.asp')).toBe(true);
      });

      it('should detect triple extensions with dangerous ending', () => {
        expect(hasDoubleExtension('file.txt.jpg.php')).toBe(true);
      });
    });

    describe('Safe double extensions', () => {
      it('should allow .tar.gz', () => {
        expect(hasDoubleExtension('archive.tar.gz')).toBe(false);
      });

      it('should allow single extension files', () => {
        expect(hasDoubleExtension('image.jpg')).toBe(false);
      });

      it('should allow files without extension', () => {
        expect(hasDoubleExtension('README')).toBe(false);
      });

      it('should allow .doc.pdf', () => {
        expect(hasDoubleExtension('converted.doc.pdf')).toBe(false);
      });
    });

    describe('Case insensitivity', () => {
      it('should detect .jpg.PHP (uppercase)', () => {
        expect(hasDoubleExtension('image.jpg.PHP')).toBe(true);
      });

      it('should detect .PDF.ExE (mixed case)', () => {
        expect(hasDoubleExtension('document.PDF.ExE')).toBe(true);
      });
    });
  });

  describe('hasNullByteInjection - Null Byte Attack Detection', () => {
    it('should detect null byte character (\\0)', () => {
      expect(hasNullByteInjection('file.php\0.jpg')).toBe(true);
    });

    it('should detect URL-encoded null byte (%00)', () => {
      expect(hasNullByteInjection('file.php%00.jpg')).toBe(true);
    });

    it('should detect null byte in middle of filename', () => {
      expect(hasNullByteInjection('normal\0malicious.jpg')).toBe(true);
    });

    it('should detect multiple null bytes', () => {
      expect(hasNullByteInjection('file\0.php\0.jpg')).toBe(true);
    });

    it('should detect mixed null byte encodings', () => {
      expect(hasNullByteInjection('file\0.php%00.jpg')).toBe(true);
    });

    it('should allow clean filenames', () => {
      expect(hasNullByteInjection('normal.jpg')).toBe(false);
    });

    it('should allow filenames with special characters', () => {
      expect(hasNullByteInjection('file-name_2024.jpg')).toBe(false);
    });

    it('should allow Unicode filenames', () => {
      expect(hasNullByteInjection('arquivo-português.jpg')).toBe(false);
    });
  });

  describe('sanitizeFilename - Filename Sanitization', () => {
    describe('Path traversal prevention', () => {
      it('should remove .. (parent directory)', () => {
        const sanitized = sanitizeFilename('../../../etc/passwd');
        expect(sanitized).not.toContain('..');
        expect(sanitized).toBe('etcpasswd');
      });

      it('should remove forward slashes', () => {
        const sanitized = sanitizeFilename('path/to/file.jpg');
        expect(sanitized).not.toContain('/');
        expect(sanitized).toBe('pathtofile.jpg');
      });

      it('should remove backslashes', () => {
        const sanitized = sanitizeFilename('path\\to\\file.jpg');
        expect(sanitized).not.toContain('\\');
        expect(sanitized).toBe('pathtofile.jpg');
      });
    });

    describe('Null byte removal', () => {
      it('should remove null byte characters', () => {
        const sanitized = sanitizeFilename('file.php\0.jpg');
        expect(sanitized).not.toContain('\0');
        expect(sanitized).toBe('file.php.jpg');
      });

      it('should remove URL-encoded null bytes', () => {
        const sanitized = sanitizeFilename('file.php%00.jpg');
        expect(sanitized).not.toContain('%00');
        expect(sanitized).toBe('file.php.jpg');
      });
    });

    describe('Dangerous character removal', () => {
      it('should remove < and >', () => {
        const sanitized = sanitizeFilename('file<script>.jpg');
        expect(sanitized).toBe('filescript.jpg');
      });

      it('should remove : (colon)', () => {
        const sanitized = sanitizeFilename('C:\\file.jpg');
        expect(sanitized).toBe('Cfile.jpg');
      });

      it('should remove " (quotes)', () => {
        const sanitized = sanitizeFilename('file"name.jpg');
        expect(sanitized).toBe('filename.jpg');
      });

      it('should remove | (pipe)', () => {
        const sanitized = sanitizeFilename('file|name.jpg');
        expect(sanitized).toBe('filename.jpg');
      });

      it('should remove ? (question mark)', () => {
        const sanitized = sanitizeFilename('file?.jpg');
        expect(sanitized).toBe('file.jpg');
      });

      it('should remove * (asterisk)', () => {
        const sanitized = sanitizeFilename('file*.jpg');
        expect(sanitized).toBe('file.jpg');
      });
    });

    describe('Length limitation', () => {
      it('should truncate very long filenames to 255 characters', () => {
        const longName = 'a'.repeat(300) + '.jpg';
        const sanitized = sanitizeFilename(longName);
        expect(sanitized.length).toBeLessThanOrEqual(255);
        expect(sanitized).toMatch(/\.jpg$/);
      });

      it('should preserve extension when truncating', () => {
        const longName = 'verylongfilename'.repeat(20) + '.jpeg';
        const sanitized = sanitizeFilename(longName);
        expect(sanitized).toMatch(/\.jpeg$/);
        expect(sanitized.length).toBeLessThanOrEqual(255);
      });
    });

    describe('Safe filenames', () => {
      it('should preserve normal filenames', () => {
        expect(sanitizeFilename('normal.jpg')).toBe('normal.jpg');
      });

      it('should preserve filenames with spaces', () => {
        expect(sanitizeFilename('my photo.jpg')).toBe('my photo.jpg');
      });

      it('should preserve filenames with hyphens', () => {
        expect(sanitizeFilename('file-name-2024.jpg')).toBe('file-name-2024.jpg');
      });

      it('should preserve filenames with underscores', () => {
        expect(sanitizeFilename('file_name_2024.jpg')).toBe('file_name_2024.jpg');
      });
    });
  });

  describe('comprehensiveFileValidation - Integration Tests', () => {
    describe('Valid files', () => {
      it('should pass validation for valid JPEG', async () => {
        const jpegBuffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);

        const result = await comprehensiveFileValidation(
          jpegBuffer,
          'photo.jpg',
          'image/jpeg'
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.detectedType).toBe('image/jpeg');
      });

      it('should pass validation for valid PNG', async () => {
        const pngBuffer = createBuffer([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        ]);

        const result = await comprehensiveFileValidation(
          pngBuffer,
          'image.png',
          'image/png'
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should pass validation for valid PDF', async () => {
        const pdfBuffer = createBuffer([
          0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34,
          0x0A, 0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A, 0x00,
        ]);

        const result = await comprehensiveFileValidation(
          pdfBuffer,
          'document.pdf',
          'application/pdf'
        );

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Attack detection', () => {
      it('should fail validation for null byte injection', async () => {
        const jpegBuffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);

        const result = await comprehensiveFileValidation(
          jpegBuffer,
          'file.php\0.jpg',
          'image/jpeg'
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Filename contains null bytes - potential injection attack');
      });

      it('should fail validation for dangerous extension', async () => {
        const buffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);

        const result = await comprehensiveFileValidation(
          buffer,
          'webshell.php',
          'application/x-php'
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('File extension is not allowed for security reasons');
      });

      it('should fail validation for double extension attack', async () => {
        const jpegBuffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);

        const result = await comprehensiveFileValidation(
          jpegBuffer,
          'image.jpg.php',
          'image/jpeg'
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Double file extensions are not allowed');
      });

      it('should fail validation for empty file', async () => {
        const emptyBuffer = createBuffer([]);

        const result = await comprehensiveFileValidation(
          emptyBuffer,
          'empty.jpg',
          'image/jpeg'
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('File is empty');
      });

      it('should fail validation for file type mismatch', async () => {
        const pngBuffer = createBuffer([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        ]);

        const result = await comprehensiveFileValidation(
          pngBuffer,
          'fake.jpg',
          'image/jpeg'
        );

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.detectedType).toBe('image/png');
      });
    });

    describe('Embedded script detection', () => {
      it('should warn about PHP embedded in JPEG', async () => {
        const jpegBuffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);
        const maliciousBuffer = Buffer.concat([
          jpegBuffer,
          Buffer.from('<?php system($_GET["cmd"]); ?>')
        ]);

        const result = await comprehensiveFileValidation(
          maliciousBuffer,
          'malicious.jpg',
          'image/jpeg'
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('<?php'))).toBe(true);
      });

      it('should warn about ASP embedded in PNG', async () => {
        const pngBuffer = createBuffer([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        ]);
        const maliciousBuffer = Buffer.concat([
          pngBuffer,
          Buffer.from('<% Execute Request("cmd") %>')
        ]);

        const result = await comprehensiveFileValidation(
          maliciousBuffer,
          'webshell.png',
          'image/png'
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('<%'))).toBe(true);
      });

      it('should warn about JavaScript in image', async () => {
        const jpegBuffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);
        const maliciousBuffer = Buffer.concat([
          jpegBuffer,
          Buffer.from('<script>alert("XSS")</script>')
        ]);

        const result = await comprehensiveFileValidation(
          maliciousBuffer,
          'xss.jpg',
          'image/jpeg'
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('<script'))).toBe(true);
      });

      it('should warn about eval() in image', async () => {
        const pngBuffer = createBuffer([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        ]);
        const maliciousBuffer = Buffer.concat([
          pngBuffer,
          Buffer.from('eval(atob("ZXZpbCBjb2Rl"))')
        ]);

        const result = await comprehensiveFileValidation(
          maliciousBuffer,
          'eval.png',
          'image/png'
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('eval('))).toBe(true);
      });

      it('should warn about base64_decode in image', async () => {
        const jpegBuffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);
        const maliciousBuffer = Buffer.concat([
          jpegBuffer,
          Buffer.from('<?php eval(base64_decode("...")); ?>')
        ]);

        const result = await comprehensiveFileValidation(
          maliciousBuffer,
          'obfuscated.jpg',
          'image/jpeg'
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('base64_decode'))).toBe(true);
      });

      it('should warn about system() call in image', async () => {
        const pngBuffer = createBuffer([
          0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
          0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        ]);
        const maliciousBuffer = Buffer.concat([
          pngBuffer,
          Buffer.from('<?php system("ls -la"); ?>')
        ]);

        const result = await comprehensiveFileValidation(
          maliciousBuffer,
          'shell.png',
          'image/png'
        );

        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('system('))).toBe(true);
      });
    });

    describe('File size validation', () => {
      it('should reject files larger than 100MB', async () => {
        // Create a buffer larger than 100MB (we'll just check the logic)
        const largeBuffer = Buffer.alloc(101 * 1024 * 1024); // 101MB

        const result = await comprehensiveFileValidation(
          largeBuffer,
          'huge.jpg',
          'image/jpeg'
        );

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('File size exceeds absolute maximum of 100MB');
      });

      it('should accept files under 100MB', async () => {
        const jpegBuffer = createBuffer([
          0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
          0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
        ]);

        const result = await comprehensiveFileValidation(
          jpegBuffer,
          'small.jpg',
          'image/jpeg'
        );

        expect(result.errors).not.toContain('File size exceeds absolute maximum of 100MB');
      });
    });

    describe('Multiple simultaneous errors', () => {
      it('should detect multiple issues at once', async () => {
        const emptyBuffer = createBuffer([]);

        const result = await comprehensiveFileValidation(
          emptyBuffer,
          'malicious.jpg.php\0.exe',
          'image/jpeg'
        );

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
        expect(result.errors).toContain('Filename contains null bytes - potential injection attack');
        expect(result.errors).toContain('File extension is not allowed for security reasons');
        expect(result.errors).toContain('File is empty');
      });
    });
  });

  describe('Edge cases and security scenarios', () => {
    it('should handle filenames with only dots', async () => {
      const jpegBuffer = createBuffer([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);

      const result = await comprehensiveFileValidation(
        jpegBuffer,
        '...jpg',
        'image/jpeg'
      );

      expect(result).toBeDefined();
    });

    it('should handle Unicode filenames', async () => {
      const jpegBuffer = createBuffer([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
        0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      ]);

      const result = await comprehensiveFileValidation(
        jpegBuffer,
        'arquivo-português-日本語-🔥.jpg',
        'image/jpeg'
      );

      expect(result.valid).toBe(true);
    });

    it('should handle extremely long filenames', () => {
      const longFilename = 'a'.repeat(500) + '.jpg';
      const sanitized = sanitizeFilename(longFilename);

      expect(sanitized.length).toBeLessThanOrEqual(255);
      expect(sanitized).toMatch(/\.jpg$/);
    });

    it('should detect case variations of dangerous extensions', () => {
      expect(isExtensionDangerous('file.pHp')).toBe(true);
      expect(isExtensionDangerous('file.AsP')).toBe(true);
      expect(isExtensionDangerous('file.EXE')).toBe(true);
      expect(isExtensionDangerous('file.bAt')).toBe(true);
    });

    it('should handle files without extensions', async () => {
      const result = await comprehensiveFileValidation(
        createBuffer([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46]),
        'filename',
        'image/jpeg'
      );

      expect(result).toBeDefined();
    });

    it('should sanitize path traversal in various forms', () => {
      expect(sanitizeFilename('../file.jpg')).toBe('file.jpg');
      expect(sanitizeFilename('..\\file.jpg')).toBe('file.jpg');
      expect(sanitizeFilename('./../file.jpg')).toBe('.file.jpg'); // Leading dot is preserved
      expect(sanitizeFilename('....//....//file.jpg')).toBe('file.jpg');
    });
  });
});
