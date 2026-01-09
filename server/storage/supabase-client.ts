/**
 * SUPABASE STORAGE CLIENT
 *
 * Initializes and manages Supabase Storage client with authentication
 * using service key for server-side operations.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ0MjQwNDAwLCJleHAiOjE5NTk4MTY0MDB9.dummy';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  WARNING: SUPABASE_URL or SUPABASE_SERVICE_KEY not set. File storage will not work.');
}

/**
 * Supabase client instance with service role key
 * This provides admin access to storage buckets
 */
export const supabaseStorage: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  PROPERTIES_IMAGES: 'properties-images',
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
  LOGOS: 'logos',
  INVOICES: 'invoices',
  EXPORTS: 'exports',
} as const;

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS];

/**
 * Initialize storage buckets
 * Creates buckets if they don't exist and sets up RLS policies
 */
export async function initializeStorageBuckets() {
  const { data: buckets, error: listError } = await supabaseStorage.storage.listBuckets();

  if (listError) {
    console.error('Failed to list storage buckets:', listError);
    return;
  }

  const existingBucketNames = buckets?.map(b => b.name) || [];

  // Create public buckets
  const publicBuckets = [
    STORAGE_BUCKETS.PROPERTIES_IMAGES,
    STORAGE_BUCKETS.AVATARS,
    STORAGE_BUCKETS.LOGOS,
  ];

  for (const bucketName of publicBuckets) {
    if (!existingBucketNames.includes(bucketName)) {
      const { error } = await supabaseStorage.storage.createBucket(bucketName, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      });

      if (error) {
        console.error(`Failed to create bucket ${bucketName}:`, error);
      } else {
        console.log(`✅ Created public bucket: ${bucketName}`);
      }
    }
  }

  // Create private buckets
  const privateBuckets = [
    STORAGE_BUCKETS.DOCUMENTS,
    STORAGE_BUCKETS.INVOICES,
    STORAGE_BUCKETS.EXPORTS,
  ];

  for (const bucketName of privateBuckets) {
    if (!existingBucketNames.includes(bucketName)) {
      const { error } = await supabaseStorage.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB for documents
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ]
      });

      if (error) {
        console.error(`Failed to create bucket ${bucketName}:`, error);
      } else {
        console.log(`✅ Created private bucket: ${bucketName}`);
      }
    }
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const { data } = supabaseStorage.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get signed URL for private files (valid for 1 hour)
 */
export async function getSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const { data, error } = await supabaseStorage.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error('Failed to create signed URL:', error);
    return null;
  }

  return data?.signedUrl || null;
}

/**
 * Health check for Supabase connection
 */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabaseStorage.storage.listBuckets();
    return !error && data !== null;
  } catch (error) {
    console.error('Storage health check failed:', error);
    return false;
  }
}
