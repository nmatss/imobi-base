import { vi } from 'vitest';

interface FileUpload {
  path: string;
  name: string;
  size: number;
  mimetype: string;
  buffer: Buffer;
}

// In-memory storage
const fileStore = new Map<string, FileUpload>();

// Mock Supabase Storage
export const createMockSupabaseStorage = () => ({
  from: (bucket: string) => ({
    upload: vi.fn(async (path: string, file: Buffer | File, options?: any) => {
      const fileUpload: FileUpload = {
        path: `${bucket}/${path}`,
        name: path.split('/').pop() || path,
        size: file instanceof Buffer ? file.length : file.size,
        mimetype: options?.contentType || 'application/octet-stream',
        buffer: file instanceof Buffer ? file : Buffer.from(await file.arrayBuffer()),
      };

      fileStore.set(fileUpload.path, fileUpload);

      return {
        data: {
          path: fileUpload.path,
          id: `file_${Date.now()}`,
          fullPath: fileUpload.path,
        },
        error: null,
      };
    }),

    download: vi.fn(async (path: string) => {
      const fullPath = `${bucket}/${path}`;
      const file = fileStore.get(fullPath);

      if (!file) {
        return {
          data: null,
          error: new Error('File not found'),
        };
      }

      return {
        data: new Blob([file.buffer], { type: file.mimetype }),
        error: null,
      };
    }),

    remove: vi.fn(async (paths: string[]) => {
      const removed = paths.map(path => {
        const fullPath = `${bucket}/${path}`;
        const exists = fileStore.has(fullPath);
        if (exists) {
          fileStore.delete(fullPath);
        }
        return fullPath;
      });

      return {
        data: removed,
        error: null,
      };
    }),

    list: vi.fn(async (path?: string) => {
      const prefix = path ? `${bucket}/${path}` : bucket;
      const files = Array.from(fileStore.entries())
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, file]) => ({
          name: file.name,
          id: key,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          last_accessed_at: new Date().toISOString(),
          metadata: {
            size: file.size,
            mimetype: file.mimetype,
          },
        }));

      return {
        data: files,
        error: null,
      };
    }),

    getPublicUrl: vi.fn((path: string) => {
      return {
        data: {
          publicUrl: `https://storage.example.com/${bucket}/${path}`,
        },
      };
    }),

    createSignedUrl: vi.fn(async (path: string, expiresIn: number) => {
      return {
        data: {
          signedUrl: `https://storage.example.com/${bucket}/${path}?token=signed_${Date.now()}`,
        },
        error: null,
      };
    }),
  }),
});

// Helper functions
export const getStoredFiles = () => Array.from(fileStore.values());

export const getStoredFile = (path: string) => fileStore.get(path);

export const clearStorage = () => fileStore.clear();

export const hasFile = (path: string) => fileStore.has(path);

// Mock image processing
export const createMockImageProcessor = () => ({
  resize: vi.fn(async (buffer: Buffer, width: number, height: number) => {
    return buffer; // In tests, just return the same buffer
  }),

  optimize: vi.fn(async (buffer: Buffer) => {
    return buffer;
  }),

  generateThumbnail: vi.fn(async (buffer: Buffer, size: number) => {
    return buffer;
  }),

  getMetadata: vi.fn(async (buffer: Buffer) => {
    return {
      width: 1920,
      height: 1080,
      format: 'jpeg',
      size: buffer.length,
    };
  }),
});
