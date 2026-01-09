# File Storage System Documentation

## Overview

ImobiBase implements a comprehensive file storage system using **Supabase Storage** with advanced features including:

- Multi-bucket storage architecture
- Image processing and optimization
- CDN integration
- Storage quota management
- Tenant isolation
- File metadata tracking
- Automatic cleanup

## Architecture

### Components

1. **Supabase Storage Client** (`server/storage/supabase-client.ts`)
   - Initializes Supabase client with service role
   - Manages bucket creation and configuration
   - Provides public and signed URL generation

2. **File Upload Service** (`server/storage/file-upload.ts`)
   - Handles file uploads with validation
   - Organizes files by tenant/category/date
   - Supports multipart uploads
   - Validates file types and sizes

3. **Image Processor** (`server/storage/image-processor.ts`)
   - Resizes images to multiple sizes
   - Compresses images for web
   - Generates WebP versions
   - Extracts EXIF metadata
   - Creates blurhash placeholders

4. **File Manager** (`server/storage/file-manager.ts`)
   - CRUD operations for files
   - Storage quota management
   - Orphaned file cleanup
   - Storage usage statistics

5. **CDN Configuration** (`server/storage/cdn-config.ts`)
   - CDN URL generation
   - Responsive image srcsets
   - Cache header configuration
   - Lazy loading support

6. **File Routes** (`server/routes-files.ts`)
   - REST API endpoints for file operations
   - Authentication and authorization
   - Upload progress tracking

7. **File Upload Component** (`client/src/components/FileUpload.tsx`)
   - Drag & drop interface
   - Progress indicators
   - File preview
   - Client-side validation

## Storage Buckets

### Public Buckets

**properties-images**
- Purpose: Property photos and images
- Max size: 10MB per file
- Allowed types: JPEG, PNG, WebP, GIF
- Access: Public read

**avatars**
- Purpose: User profile pictures
- Max size: 5MB per file
- Allowed types: JPEG, PNG, WebP
- Access: Public read

**logos**
- Purpose: Tenant logos and branding
- Max size: 5MB per file
- Allowed types: JPEG, PNG, WebP, SVG
- Access: Public read

### Private Buckets

**documents**
- Purpose: Contracts, IDs, proof of income
- Max size: 50MB per file
- Allowed types: PDF, DOC, DOCX, JPEG, PNG
- Access: Authenticated users only

**invoices**
- Purpose: Financial invoices and receipts
- Max size: 50MB per file
- Allowed types: PDF, JPEG, PNG
- Access: Authenticated users only

**exports**
- Purpose: Temporary data exports
- Max size: 50MB per file
- Allowed types: CSV, PDF, XLSX
- Access: Authenticated users only
- Auto-cleanup: Files older than 7 days

## Storage Quotas by Plan

| Plan         | Storage Limit | File Count Limit |
|--------------|---------------|------------------|
| Free         | 1 GB          | Unlimited        |
| Starter      | 10 GB         | Unlimited        |
| Professional | 50 GB         | Unlimited        |
| Enterprise   | 200 GB        | Unlimited        |

## File Organization Structure

Files are organized in a hierarchical structure:

```
{tenantId}/{category}/{year}/{month}/{uniqueId}-{filename}

Example:
tenant-123/property-image/2024/12/abc123def456-beautiful-house.webp
```

This structure:
- Isolates files by tenant
- Groups files by category
- Organizes chronologically
- Prevents filename conflicts
- Enables efficient cleanup

## API Endpoints

### Upload Endpoints

#### Generic File Upload
```
POST /api/files/upload
```

Request (multipart/form-data):
- `file`: File to upload
- `fileType`: Type (image, document, avatar, logo)
- `category`: Category name
- `bucket`: Target bucket (optional)
- `entityType`: Related entity type (optional)
- `entityId`: Related entity ID (optional)
- `metadata`: Additional metadata as JSON (optional)

Response:
```json
{
  "success": true,
  "file": {
    "id": "file_123",
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "url": "https://...",
    "bucket": "documents",
    "filePath": "tenant-123/document/2024/12/..."
  }
}
```

#### Upload Avatar
```
POST /api/files/upload/avatar
```

Request (multipart/form-data):
- `avatar`: Image file

Features:
- Automatic circular crop
- Resize to 256x256
- WebP conversion
- Updates user avatar field

#### Upload Logo
```
POST /api/files/upload/logo
```

Request (multipart/form-data):
- `logo`: Image file

Features:
- Optimize for web
- Generate WebP version
- Create blurhash placeholder
- Updates tenant logo field

#### Upload Property Images
```
POST /api/files/upload/property-images
```

Request (multipart/form-data):
- `images[]`: Array of image files (up to 20)
- `propertyId`: Property ID

Features:
- Batch upload support
- Auto-optimization
- WebP conversion
- Blurhash generation
- Responsive image variants

#### Upload Document
```
POST /api/files/upload/document
```

Request (multipart/form-data):
- `document`: File to upload
- `documentType`: Type (rg, cpf, contract, etc.)
- `entityType`: Related entity type
- `entityId`: Related entity ID

Features:
- Private storage
- Signed URL generation
- Metadata tracking

### Retrieval Endpoints

#### Get File Metadata
```
GET /api/files/:id
```

Response:
```json
{
  "file": {
    "id": "file_123",
    "tenantId": "tenant_123",
    "bucket": "documents",
    "filePath": "...",
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "category": "contract",
    "url": "https://...",
    "isPublic": false,
    "createdAt": "2024-12-24T10:00:00Z"
  }
}
```

#### Get File URL
```
GET /api/files/:id/url?expiresIn=3600
```

Query params:
- `expiresIn`: URL expiration in seconds (default: 3600)

Response:
```json
{
  "url": "https://...",
  "expiresIn": 3600
}
```

### Management Endpoints

#### Delete File
```
DELETE /api/files/:id
```

Response:
```json
{
  "success": true
}
```

#### Bulk Delete Files
```
POST /api/files/bulk-delete
```

Request:
```json
{
  "fileIds": ["file_1", "file_2", "file_3"]
}
```

Response:
```json
{
  "success": true,
  "deleted": 3,
  "failed": 0
}
```

#### Get Storage Usage
```
GET /api/files/storage/usage
```

Response:
```json
{
  "usage": {
    "totalSize": 5242880000,
    "fileCount": 150,
    "quota": 10737418240,
    "quotaUsed": 48.83,
    "plan": "starter"
  }
}
```

#### List Files
```
GET /api/files/list?bucket=documents&category=contract&limit=50&offset=0
```

Query params:
- `bucket`: Filter by bucket
- `category`: Filter by category
- `limit`: Results per page (default: 50)
- `offset`: Pagination offset (default: 0)

Response:
```json
{
  "files": [...],
  "count": 25
}
```

#### Cleanup Orphaned Files (Admin)
```
POST /api/files/cleanup/orphaned
```

Request:
```json
{
  "bucket": "documents",
  "dryRun": true
}
```

Response:
```json
{
  "success": true,
  "orphanedCount": 5,
  "deletedCount": 0,
  "dryRun": true,
  "orphanedFiles": ["path1", "path2", ...]
}
```

## Image Processing

### Automatic Processing

All uploaded images undergo automatic processing:

1. **Format Conversion**: Convert to WebP for better compression
2. **Optimization**: Compress to 85% quality
3. **Resizing**: Generate multiple sizes (thumbnail, small, medium, large)
4. **Metadata Removal**: Strip EXIF data for privacy
5. **Blurhash**: Generate placeholder for progressive loading

### Image Sizes

| Size      | Dimensions     | Use Case                |
|-----------|----------------|-------------------------|
| Thumbnail | 150x150        | Grid views, lists       |
| Small     | 400x300        | Mobile displays         |
| Medium    | 800x600        | Desktop displays        |
| Large     | 1600x1200      | High-res displays       |
| Full      | 2400x1800      | Original quality        |

### Avatar Processing

Avatars receive special processing:
- Circular crop
- 256x256 pixels
- PNG format (for transparency)
- Center-focused crop

## CDN Configuration

### Supported Providers

1. **Supabase** (default)
   - Built-in image transformation
   - Auto-optimized delivery
   - Edge caching

2. **Cloudflare Images**
   - Advanced transformations
   - Global CDN
   - Automatic format selection

3. **Vercel Image Optimization**
   - Next.js integration
   - Automatic WebP/AVIF
   - Device-aware sizing

4. **Cloudinary**
   - Advanced transformations
   - AI-powered optimization
   - Video support

### Cache Headers

**Images**:
```
Cache-Control: public, max-age=31536000, immutable
```

**Documents**:
```
Cache-Control: private, max-age=3600
```

**Avatars**:
```
Cache-Control: public, max-age=86400
```

**Exports**:
```
Cache-Control: private, no-cache, no-store, must-revalidate
```

### Responsive Images

Generate responsive srcsets:

```typescript
import { defaultCDN } from './server/storage/cdn-config';

const srcset = defaultCDN.getResponsiveSrcSet(imageUrl, [320, 640, 1024, 1536]);
// Returns: "url-320w, url-640w, url-1024w, url-1536w"
```

## Client-Side Usage

### Basic Upload

```tsx
import { FileUpload } from '@/components/FileUpload';

function MyComponent() {
  return (
    <FileUpload
      accept="image/*"
      maxSize={10}
      maxFiles={5}
      multiple
      fileType="image"
      category="property-image"
      entityType="property"
      entityId={propertyId}
      onUploadComplete={(files) => {
        console.log('Uploaded:', files);
      }}
      onUploadError={(error) => {
        console.error('Error:', error);
      }}
    />
  );
}
```

### Avatar Upload

```tsx
<FileUpload
  accept="image/*"
  maxSize={5}
  fileType="avatar"
  onUploadComplete={(files) => {
    setAvatarUrl(files[0].url);
  }}
/>
```

### Document Upload

```tsx
<FileUpload
  accept=".pdf,.doc,.docx"
  maxSize={50}
  fileType="document"
  category="contract"
  entityType="contract"
  entityId={contractId}
  onUploadComplete={(files) => {
    console.log('Document uploaded:', files[0]);
  }}
/>
```

## Security

### Authentication

All file operations require authentication except:
- Public bucket file access (read-only)

### Authorization

- Users can only access files from their tenant
- File operations validate tenantId
- Private files require signed URLs

### Validation

**File Type Validation**:
- MIME type checking
- File extension validation
- Magic number verification (planned)

**File Size Limits**:
- Enforced on client and server
- Per-file and total limits
- Quota enforcement

**Virus Scanning** (planned):
- Integration with ClamAV
- Pre-upload scanning
- Quarantine malicious files

### Data Privacy

- EXIF metadata stripped from images
- Secure signed URLs for private files
- Tenant isolation enforced
- GDPR/LGPD compliant

## Database Schema

### Files Table

```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT REFERENCES users(id),
  bucket TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  category TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  is_public BOOLEAN DEFAULT false,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_files_tenant ON files(tenant_id);
CREATE INDEX idx_files_entity ON files(entity_type, entity_id);
CREATE INDEX idx_files_category ON files(category);
```

## Maintenance

### Cleanup Operations

#### Orphaned Files
```bash
# Dry run (list orphaned files)
POST /api/files/cleanup/orphaned
{ "bucket": "documents", "dryRun": true }

# Actual cleanup
POST /api/files/cleanup/orphaned
{ "bucket": "documents", "dryRun": false }
```

#### Temporary Files

Automatic cleanup of exports older than 7 days:
- Runs daily via cron job
- Deletes files from exports bucket
- Logs cleanup results

### Monitoring

Monitor storage usage:
- Per-tenant storage quotas
- File count metrics
- Upload/download rates
- Error rates

## Setup Instructions

### 1. Environment Variables

Add to `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
CDN_PROVIDER=supabase
```

### 2. Install Dependencies

```bash
npm install @supabase/supabase-js sharp multer blurhash
npm install --save-dev @types/multer
```

### 3. Initialize Buckets

```bash
tsx server/storage/setup-buckets.ts
```

### 4. Configure CORS

In Supabase Dashboard > Storage > Settings:

```json
{
  "allowedOrigins": ["https://yourdomain.com", "http://localhost:5000"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["*"],
  "maxAge": 3600
}
```

### 5. Push Database Schema

```bash
npm run db:push
```

## Best Practices

### Upload Optimization

1. **Client-side compression**: Compress images before upload
2. **Batch uploads**: Upload multiple files in parallel
3. **Progress feedback**: Show upload progress to users
4. **Error handling**: Gracefully handle upload failures

### Storage Management

1. **Regular cleanup**: Run cleanup jobs regularly
2. **Monitor quotas**: Alert when approaching limits
3. **Archive old files**: Move unused files to cold storage
4. **Optimize images**: Always use WebP when possible

### Performance

1. **Use CDN**: Serve all public files through CDN
2. **Lazy loading**: Use blurhash placeholders
3. **Responsive images**: Serve appropriate sizes
4. **Caching**: Set proper cache headers

## Troubleshooting

### Upload Fails

**Issue**: File upload returns 413 (Payload Too Large)
- Check file size against limits
- Verify quota not exceeded
- Check network timeout settings

**Issue**: Upload succeeds but file not accessible
- Verify bucket is public (for public files)
- Check RLS policies in Supabase
- Ensure signed URL not expired

### Image Processing Errors

**Issue**: Images not being optimized
- Verify Sharp is installed correctly
- Check image format is supported
- Review error logs for details

**Issue**: Blurhash generation fails
- Ensure image is valid
- Check image size (very large images may fail)
- Review Sharp processing errors

### Storage Quota Issues

**Issue**: Quota exceeded but files deleted
- Run cleanup for orphaned files
- Check database vs storage sync
- Review file metadata

## Future Enhancements

- [ ] Video upload and processing
- [ ] Virus scanning integration
- [ ] Automatic image tagging (AI)
- [ ] Duplicate file detection
- [ ] Cold storage integration
- [ ] Advanced analytics
- [ ] Multi-region support
- [ ] Real-time upload progress
- [ ] Background job processing
- [ ] Automated backups

## Support

For issues or questions:
- Check logs: `tail -f logs/storage.log`
- Review Supabase dashboard
- Contact support: support@imobibase.com
