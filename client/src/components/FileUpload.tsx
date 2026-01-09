/**
 * FILE UPLOAD COMPONENT
 *
 * Drag & drop file upload with progress tracking,
 * preview, validation, and error handling.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, File, Image as ImageIcon, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { cn } from '@/lib/utils';

export interface FileUploadProps {
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
  multiple?: boolean;
  fileType?: 'image' | 'document' | 'avatar' | 'logo';
  bucket?: string;
  category?: string;
  entityType?: string;
  entityId?: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  blurhash?: string;
}

interface FileWithPreview extends File {
  preview?: string;
}

export function FileUpload({
  accept = 'image/*',
  maxSize = 10,
  maxFiles = 1,
  multiple = false,
  fileType = 'image',
  bucket,
  category,
  entityType,
  entityId,
  onUploadComplete,
  onUploadError,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate file size
  const validateFile = useCallback(
    (file: File): string | null => {
      const maxSizeBytes = maxSize * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `${file.name} exceeds maximum size of ${maxSize}MB`;
      }

      // Validate file type
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const mimeTypeMatch = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return type === fileExtension;
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });

      if (!mimeTypeMatch) {
        return `${file.name} is not an accepted file type`;
      }

      return null;
    },
    [accept, maxSize]
  );

  // Handle file selection
  const handleFiles = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const newErrors: string[] = [];
      const validFiles: FileWithPreview[] = [];

      // Check max files
      if (files.length + selectedFiles.length > maxFiles) {
        newErrors.push(`Maximum ${maxFiles} file(s) allowed`);
        setErrors(newErrors);
        return;
      }

      // Validate and prepare files
      Array.from(selectedFiles).forEach(file => {
        const error = validateFile(file);
        if (error) {
          newErrors.push(error);
        } else {
          const fileWithPreview = file as FileWithPreview;

          // Create preview for images
          if (file.type.startsWith('image/')) {
            fileWithPreview.preview = URL.createObjectURL(file);
          }

          validFiles.push(fileWithPreview);
        }
      });

      setErrors(newErrors);
      setFiles(prev => [...prev, ...validFiles]);
    },
    [files.length, maxFiles, validateFile]
  );

  // Drag & drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // Remove file from list
  const removeFile = useCallback((index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (removed.preview) {
        URL.revokeObjectURL(removed.preview);
      }
      return newFiles;
    });
  }, []);

  // Upload files
  const uploadFiles = useCallback(async () => {
    if (files.length === 0) return;

    setUploading(true);
    setErrors([]);
    const uploaded: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();

        // Determine endpoint based on file type
        let endpoint = '/api/files/upload';
        let fieldName = 'file';

        if (fileType === 'avatar') {
          endpoint = '/api/files/upload/avatar';
          fieldName = 'avatar';
        } else if (fileType === 'logo') {
          endpoint = '/api/files/upload/logo';
          fieldName = 'logo';
        } else if (fileType === 'image' && entityType === 'property') {
          // For now, upload images individually
          endpoint = '/api/files/upload';
        }

        formData.append(fieldName, file);
        formData.append('fileType', fileType);
        if (bucket) formData.append('bucket', bucket);
        if (category) formData.append('category', category);
        if (entityType) formData.append('entityType', entityType);
        if (entityId) formData.append('entityId', entityId);

        const xhr = new XMLHttpRequest();

        // Track progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          }
        });

        // Upload file
        const uploadPromise = new Promise<UploadedFile>((resolve, reject) => {
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const response = JSON.parse(xhr.responseText);
              resolve(response.file);
            } else {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || 'Upload failed'));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
          });

          xhr.open('POST', endpoint);
          xhr.send(formData);
        });

        const uploadedFile = await uploadPromise;
        uploaded.push(uploadedFile);

        // Cleanup preview
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      }

      setUploadedFiles(uploaded);
      setFiles([]);
      setUploadProgress({});

      if (onUploadComplete) {
        onUploadComplete(uploaded);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setErrors([errorMessage]);

      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  }, [files, fileType, bucket, category, entityType, entityId, onUploadComplete, onUploadError]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />

        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />

        <p className="text-lg font-medium mb-2">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>

        <p className="text-sm text-muted-foreground mb-4">
          or click to browse
        </p>

        <p className="text-xs text-muted-foreground">
          {multiple ? `Up to ${maxFiles} files` : 'Single file'} • Max {maxSize}MB each
        </p>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
          {errors.map((error, index) => (
            <div key={index} className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected files:</p>

          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 border rounded-lg bg-card"
            >
              {/* Preview or icon */}
              <div className="flex-shrink-0">
                {file.preview ? (
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-12 w-12 object-cover rounded"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                    <File className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>

                {/* Progress */}
                {uploading && uploadProgress[file.name] !== undefined && (
                  <div className="mt-2">
                    <Progress value={uploadProgress[file.name]} className="h-1" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {uploadProgress[file.name]}%
                    </p>
                  </div>
                )}
              </div>

              {/* Remove button */}
              {!uploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && !uploading && (
        <Button onClick={uploadFiles} className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          Upload {files.length} {files.length === 1 ? 'file' : 'files'}
        </Button>
      )}

      {/* Uploaded files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span>Successfully uploaded {uploadedFiles.length} file(s)</span>
          </div>
        </div>
      )}
    </div>
  );
}
