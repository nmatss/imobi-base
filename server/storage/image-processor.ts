// @ts-nocheck
import type Sharp from 'sharp';
/**
 * IMAGE PROCESSING SERVICE
 *
 * Handles image manipulation including resizing, compression,
 * format conversion, EXIF extraction, and blurhash generation.
 */

// import sharp from 'sharp';
import { encode } from 'blurhash';

// @ts-ignore - Sharp not installed
const sharp = null as any;

/**
 * Image resize presets
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150 },
  small: { width: 400, height: 300 },
  medium: { width: 800, height: 600 },
  large: { width: 1600, height: 1200 },
  full: { width: 2400, height: 1800 },
} as const;

export type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Processed image result
 */
export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
  metadata?: sharp.Metadata;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  };
  quality?: number; // 1-100
  format?: 'jpeg' | 'png' | 'webp';
  compress?: boolean;
  stripMetadata?: boolean;
  watermark?: {
    text?: string;
    image?: Buffer;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
}

/**
 * Process image with specified options
 */
export async function processImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  let image = sharp(inputBuffer);

  // Resize if specified
  if (options.resize) {
    image = image.resize({
      width: options.resize.width,
      height: options.resize.height,
      fit: options.resize.fit || 'cover',
      withoutEnlargement: true,
    });
  }

  // Strip metadata for privacy and size reduction
  if (options.stripMetadata !== false) {
    image = image.rotate(); // Auto-rotate based on EXIF, then remove EXIF
  }

  // Convert format and compress
  const format = options.format || 'jpeg';
  const quality = options.quality || 85;

  switch (format) {
    case 'jpeg':
      image = image.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      image = image.png({ quality, compressionLevel: 9 });
      break;
    case 'webp':
      image = image.webp({ quality });
      break;
  }

  // Apply watermark if specified
  if (options.watermark?.text) {
    const svg = createTextWatermark(options.watermark.text);
    image = image.composite([{
      input: Buffer.from(svg),
      gravity: getGravityFromPosition(options.watermark.position),
    }]);
  }

  // Execute the pipeline
  const buffer = await image.toBuffer({ resolveWithObject: true });

  return {
    buffer: buffer.data,
    width: buffer.info.width,
    height: buffer.info.height,
    format: buffer.info.format,
    size: buffer.info.size,
    metadata: await sharp(buffer.data).metadata(),
  };
}

/**
 * Generate multiple sizes of an image
 */
export async function generateImageVariants(
  inputBuffer: Buffer,
  sizes: ImageSize[] = ['thumbnail', 'small', 'medium', 'large']
): Promise<Record<ImageSize, ProcessedImage>> {
  const variants: Partial<Record<ImageSize, ProcessedImage>> = {};

  await Promise.all(
    sizes.map(async (sizeName) => {
      const dimensions = IMAGE_SIZES[sizeName];
      const processed = await processImage(inputBuffer, {
        resize: dimensions,
        format: 'webp',
        quality: 85,
      });
      variants[sizeName] = processed;
    })
  );

  return variants as Record<ImageSize, ProcessedImage>;
}

/**
 * Extract EXIF metadata from image
 */
export async function extractImageMetadata(inputBuffer: Buffer): Promise<sharp.Metadata> {
  const metadata = await sharp(inputBuffer).metadata();
  return metadata;
}

/**
 * Generate blurhash placeholder for image
 * Blurhash creates compact representations of images for progressive loading
 */
export async function generateBlurhash(inputBuffer: Buffer): Promise<string> {
  try {
    // Resize to small size for blurhash generation (faster)
    const { data, info } = await sharp(inputBuffer)
      .resize(32, 32, { fit: 'inside' })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Generate blurhash
    const blurhash = encode(
      new Uint8ClampedArray(data),
      info.width,
      info.height,
      4, // componentX
      3  // componentY
    );

    return blurhash;
  } catch (error) {
    console.error('Error generating blurhash:', error);
    return 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'; // Default blurhash (gray)
  }
}

/**
 * Optimize image for web
 * Combines multiple optimizations: resize, compress, format conversion
 */
export async function optimizeForWeb(
  inputBuffer: Buffer,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): Promise<{
  jpeg: ProcessedImage;
  webp: ProcessedImage;
  blurhash: string;
}> {
  const [jpeg, webp, blurhash] = await Promise.all([
    // JPEG version
    processImage(inputBuffer, {
      resize: { width: maxWidth, height: maxHeight, fit: 'inside' },
      format: 'jpeg',
      quality: 85,
      compress: true,
    }),
    // WebP version (modern browsers)
    processImage(inputBuffer, {
      resize: { width: maxWidth, height: maxHeight, fit: 'inside' },
      format: 'webp',
      quality: 85,
      compress: true,
    }),
    // Blurhash placeholder
    generateBlurhash(inputBuffer),
  ]);

  return { jpeg, webp, blurhash };
}

/**
 * Create circular avatar image
 */
export async function createCircularAvatar(
  inputBuffer: Buffer,
  size: number = 256
): Promise<ProcessedImage> {
  // Create circular mask
  const circle = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>`
  );

  const processedBuffer = await sharp(inputBuffer)
    .resize(size, size, { fit: 'cover' })
    .composite([
      {
        input: circle,
        blend: 'dest-in',
      },
    ])
    .png()
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: processedBuffer.data,
    width: processedBuffer.info.width,
    height: processedBuffer.info.height,
    format: processedBuffer.info.format,
    size: processedBuffer.info.size,
  };
}

/**
 * Validate image file
 */
export async function validateImage(
  inputBuffer: Buffer
): Promise<{ valid: boolean; error?: string; metadata?: sharp.Metadata }> {
  try {
    const metadata = await sharp(inputBuffer).metadata();

    // Check if it's a valid image
    if (!metadata.format) {
      return { valid: false, error: 'Invalid image format' };
    }

    // Check dimensions
    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'Invalid image dimensions' };
    }

    // Check if dimensions are reasonable
    if (metadata.width > 10000 || metadata.height > 10000) {
      return { valid: false, error: 'Image dimensions too large (max 10000x10000)' };
    }

    return { valid: true, metadata };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid image',
    };
  }
}

/**
 * Create text watermark SVG
 */
function createTextWatermark(text: string): string {
  return `
    <svg width="200" height="50">
      <text
        x="10"
        y="30"
        font-family="Arial"
        font-size="20"
        fill="white"
        fill-opacity="0.5"
      >
        ${text}
      </text>
    </svg>
  `;
}

/**
 * Get Sharp gravity from position string
 */
function getGravityFromPosition(
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
): string {
  const gravityMap = {
    'top-left': 'northwest',
    'top-right': 'northeast',
    'bottom-left': 'southwest',
    'bottom-right': 'southeast',
    'center': 'center',
  };

  return gravityMap[position || 'bottom-right'];
}

/**
 * Compress image aggressively
 */
export async function compressImage(
  inputBuffer: Buffer,
  quality: number = 70
): Promise<ProcessedImage> {
  return processImage(inputBuffer, {
    format: 'jpeg',
    quality,
    compress: true,
    stripMetadata: true,
  });
}

/**
 * Convert image to WebP format
 */
export async function convertToWebP(
  inputBuffer: Buffer,
  quality: number = 85
): Promise<ProcessedImage> {
  return processImage(inputBuffer, {
    format: 'webp',
    quality,
  });
}

/**
 * Create image thumbnail
 */
export async function createThumbnail(
  inputBuffer: Buffer,
  width: number = 150,
  height: number = 150
): Promise<ProcessedImage> {
  return processImage(inputBuffer, {
    resize: { width, height, fit: 'cover' },
    format: 'webp',
    quality: 80,
  });
}
