/**
 * CDN CONFIGURATION
 *
 * Configure CDN settings for image optimization,
 * caching, and lazy loading support.
 */

/**
 * CDN providers supported
 */
export enum CDNProvider {
  SUPABASE = 'supabase',
  CLOUDFLARE = 'cloudflare',
  VERCEL = 'vercel',
  CLOUDINARY = 'cloudinary',
}

/**
 * Image optimization parameters for CDN URLs
 */
export interface ImageOptimizationParams {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  blur?: number;
  sharpen?: boolean;
}

/**
 * Cache control headers for different file types
 */
export const CACHE_HEADERS = {
  images: {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
    'CDN-Cache-Control': 'public, max-age=31536000',
  },
  documents: {
    'Cache-Control': 'private, max-age=3600', // 1 hour
    'CDN-Cache-Control': 'private, max-age=3600',
  },
  avatars: {
    'Cache-Control': 'public, max-age=86400', // 1 day
    'CDN-Cache-Control': 'public, max-age=86400',
  },
  exports: {
    'Cache-Control': 'private, no-cache, no-store, must-revalidate',
    'CDN-Cache-Control': 'private, no-cache',
  },
} as const;

/**
 * Get optimized CDN URL for Supabase Storage
 * Supabase uses their built-in image transformation
 */
export function getSupabaseOptimizedUrl(
  baseUrl: string,
  params: ImageOptimizationParams = {}
): string {
  const url = new URL(baseUrl);

  if (params.width) {
    url.searchParams.set('width', params.width.toString());
  }

  if (params.height) {
    url.searchParams.set('height', params.height.toString());
  }

  if (params.quality) {
    url.searchParams.set('quality', params.quality.toString());
  }

  if (params.format && params.format !== 'auto') {
    url.searchParams.set('format', params.format);
  }

  return url.toString();
}

/**
 * Get optimized CDN URL for Cloudflare Images
 */
export function getCloudflareOptimizedUrl(
  accountId: string,
  imageId: string,
  params: ImageOptimizationParams = {}
): string {
  const options: string[] = [];

  if (params.width) options.push(`width=${params.width}`);
  if (params.height) options.push(`height=${params.height}`);
  if (params.quality) options.push(`quality=${params.quality}`);
  if (params.fit) options.push(`fit=${params.fit}`);
  if (params.format) options.push(`format=${params.format}`);
  if (params.blur) options.push(`blur=${params.blur}`);
  if (params.sharpen) options.push('sharpen=1');

  const variant = options.length > 0 ? `/${options.join(',')}` : '/public';

  return `https://imagedelivery.net/${accountId}/${imageId}${variant}`;
}

/**
 * Get optimized CDN URL for Vercel Image Optimization
 */
export function getVercelOptimizedUrl(
  baseUrl: string,
  params: ImageOptimizationParams = {}
): string {
  const url = new URL('/_next/image', 'https://your-domain.vercel.app');
  url.searchParams.set('url', baseUrl);

  if (params.width) {
    url.searchParams.set('w', params.width.toString());
  }

  if (params.quality) {
    url.searchParams.set('q', params.quality.toString());
  }

  return url.toString();
}

/**
 * Get optimized CDN URL for Cloudinary
 */
export function getCloudinaryOptimizedUrl(
  cloudName: string,
  publicId: string,
  params: ImageOptimizationParams = {}
): string {
  const transformations: string[] = [];

  if (params.width) transformations.push(`w_${params.width}`);
  if (params.height) transformations.push(`h_${params.height}`);
  if (params.quality) transformations.push(`q_${params.quality}`);
  if (params.fit) {
    const cloudinaryFit = params.fit === 'cover' ? 'fill' : params.fit;
    transformations.push(`c_${cloudinaryFit}`);
  }
  if (params.format) transformations.push(`f_${params.format}`);
  if (params.blur) transformations.push(`e_blur:${params.blur}`);
  if (params.sharpen) transformations.push('e_sharpen');

  const transformation = transformations.length > 0
    ? `${transformations.join(',')}/`
    : '';

  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformation}${publicId}`;
}

/**
 * Generate responsive image srcset
 */
export function generateResponsiveSrcSet(
  baseUrl: string,
  provider: CDNProvider = CDNProvider.SUPABASE,
  sizes: number[] = [320, 640, 768, 1024, 1280, 1536, 1920]
): string {
  const srcset = sizes.map(width => {
    let optimizedUrl: string;

    switch (provider) {
      case CDNProvider.SUPABASE:
        optimizedUrl = getSupabaseOptimizedUrl(baseUrl, { width, quality: 85 });
        break;
      case CDNProvider.CLOUDFLARE:
        // Extract image ID from URL
        const imageId = baseUrl.split('/').pop() || '';
        const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
        optimizedUrl = getCloudflareOptimizedUrl(accountId, imageId, { width, quality: 85 });
        break;
      case CDNProvider.VERCEL:
        optimizedUrl = getVercelOptimizedUrl(baseUrl, { width, quality: 85 });
        break;
      default:
        optimizedUrl = getSupabaseOptimizedUrl(baseUrl, { width, quality: 85 });
    }

    return `${optimizedUrl} ${width}w`;
  });

  return srcset.join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizesAttribute(breakpoints?: {
  mobile?: string;
  tablet?: string;
  desktop?: string;
}): string {
  const defaultBreakpoints = {
    mobile: '100vw',
    tablet: '50vw',
    desktop: '33vw',
  };

  const sizes = { ...defaultBreakpoints, ...breakpoints };

  return [
    `(max-width: 768px) ${sizes.mobile}`,
    `(max-width: 1024px) ${sizes.tablet}`,
    sizes.desktop,
  ].join(', ');
}

/**
 * Preload critical images for better performance
 */
export function generateImagePreloadTags(images: Array<{
  url: string;
  type?: string;
  media?: string;
}>): string {
  return images
    .map(img => {
      const type = img.type || 'image/webp';
      const media = img.media ? ` media="${img.media}"` : '';
      return `<link rel="preload" as="image" href="${img.url}" type="${type}"${media}>`;
    })
    .join('\n');
}

/**
 * Get blur data URL for lazy loading placeholders
 */
export function getBlurDataUrl(blurhash: string, width: number = 32, height: number = 32): string {
  // For now, return a simple gray placeholder
  // In a full implementation, you would decode the blurhash
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Cfilter id='b' color-interpolation-filters='sRGB'%3E%3CfeGaussianBlur stdDeviation='20'/%3E%3C/filter%3E%3Cimage filter='url(%23b)' x='0' y='0' height='100%25' width='100%25' href='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mM8c+bMfwAGgwKq0xvCjgAAAABJRU5ErkJggg=='/%3E%3C/svg%3E`;
}

/**
 * CDN configuration helper
 */
export class CDNConfig {
  private provider: CDNProvider;
  private config: Record<string, any>;

  constructor(provider: CDNProvider = CDNProvider.SUPABASE, config: Record<string, any> = {}) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Get optimized image URL
   */
  getOptimizedUrl(url: string, params: ImageOptimizationParams = {}): string {
    switch (this.provider) {
      case CDNProvider.SUPABASE:
        return getSupabaseOptimizedUrl(url, params);
      case CDNProvider.CLOUDFLARE:
        const imageId = url.split('/').pop() || '';
        return getCloudflareOptimizedUrl(this.config.accountId, imageId, params);
      case CDNProvider.VERCEL:
        return getVercelOptimizedUrl(url, params);
      case CDNProvider.CLOUDINARY:
        const publicId = url.split('/').pop() || '';
        return getCloudinaryOptimizedUrl(this.config.cloudName, publicId, params);
      default:
        return url;
    }
  }

  /**
   * Get responsive srcset
   */
  getResponsiveSrcSet(url: string, sizes?: number[]): string {
    return generateResponsiveSrcSet(url, this.provider, sizes);
  }

  /**
   * Get cache headers for file type
   */
  getCacheHeaders(fileType: keyof typeof CACHE_HEADERS): Record<string, string> {
    return CACHE_HEADERS[fileType];
  }
}

/**
 * Export default CDN configuration
 */
export const defaultCDN = new CDNConfig(
  process.env.CDN_PROVIDER as CDNProvider || CDNProvider.SUPABASE,
  {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  }
);
