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

  it('validates generic upload entity ownership before persisting entity references', () => {
    expect(source).toContain('async function resolveUploadEntity');
    expect(source).toContain('const UPLOAD_ENTITY_TYPE_ALIASES');
    expect(source).toContain('const UPLOAD_ENTITY_LOADERS');
    expect(source).toContain('entityType and entityId must be provided together');
    expect(source).toContain('Unsupported entity type for upload');
    expect(source).toContain('if (!entity || entity.tenantId !== tenantId)');
    expect(source).toContain('entityType: entity.entityType');
    expect(source).toContain('entityId: entity.entityId');
    expect(source).not.toContain('entityType: req.body.entityType');
    expect(source).not.toContain('entityId: req.body.entityId');
  });

  it('bounds file URL expiry values for private signed URLs', () => {
    expect(source).toContain('const FILE_URL_MIN_EXPIRES_IN_SECONDS = 60;');
    expect(source).toContain('const FILE_URL_MAX_EXPIRES_IN_SECONDS = 3600;');
    expect(source).toContain('Number.isNaN(requestedExpiresIn) ? 3600 : requestedExpiresIn');
    expect(source).toContain('Math.max(\n          Number.isNaN(requestedExpiresIn) ? 3600 : requestedExpiresIn,\n          FILE_URL_MIN_EXPIRES_IN_SECONDS,\n        )');
    expect(source).toContain('Math.min(\n        Math.max(\n          Number.isNaN(requestedExpiresIn) ? 3600 : requestedExpiresIn,');
  });
});
