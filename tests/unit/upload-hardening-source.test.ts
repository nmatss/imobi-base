import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  join(process.cwd(), 'server/routes-files.ts'),
  'utf8'
);

describe('upload route hardening source guards', () => {
  it('keeps property image uploads bounded while using memory storage', () => {
    expect(source).toContain('const PROPERTY_IMAGE_MAX_SIZE = 10 * MB;');
    expect(source).toContain('const PROPERTY_IMAGE_MAX_FILES = 10;');
    expect(source).toContain('const PROPERTY_IMAGE_TOTAL_MAX_SIZE = 50 * MB;');
    expect(source).toContain(
      "uploadPropertyImages.array('images', PROPERTY_IMAGE_MAX_FILES)"
    );
    expect(source).toContain('totalSize > PROPERTY_IMAGE_TOTAL_MAX_SIZE');
  });

  it('validates property image ownership before writing public files', () => {
    expect(source).toContain('const property = await storage.getProperty(propertyId);');
    expect(source).toContain('property.tenantId !== tenantId');
    expect(source).toContain("entityType: 'property'");
    expect(source).toContain('entityId: propertyId');
  });

  it('does not let generic uploads choose arbitrary buckets', () => {
    expect(source).toContain('const BUCKETS_BY_FILE_TYPE');
    expect(source).toContain('function resolveUploadBucket');
    expect(source).toContain('Bucket is not allowed for this file type');
    expect(source).not.toContain('const bucket = req.body.bucket || STORAGE_BUCKETS.DOCUMENTS;');
  });
});
