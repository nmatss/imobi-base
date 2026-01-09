/**
 * SVG SANITIZATION MODULE
 *
 * Prevents XSS attacks through malicious SVG files by:
 * 1. Removing JavaScript code and event handlers
 * 2. Blocking dangerous tags (script, iframe, object, etc.)
 * 3. Filtering out unsafe attributes
 * 4. Using DOMPurify for robust sanitization
 *
 * Security: P0 (Critical)
 * OWASP: A03:2021 - Injection
 */

import { JSDOM } from 'jsdom';
import DOMPurify from 'isomorphic-dompurify';

// Initialize DOMPurify with jsdom window
const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as Window);

/**
 * Sanitization configuration for SVG files
 * Based on OWASP recommendations for SVG security
 */
const SVG_SANITIZE_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },

  // Only allow safe SVG tags
  ALLOWED_TAGS: [
    'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline',
    'polygon', 'text', 'tspan', 'tref', 'textPath', 'defs', 'linearGradient',
    'radialGradient', 'stop', 'pattern', 'mask', 'clipPath', 'use', 'symbol',
    'title', 'desc', 'metadata', 'marker', 'filter', 'feGaussianBlur',
    'feOffset', 'feBlend', 'feColorMatrix', 'feComponentTransfer',
    'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
    'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feImage',
    'feMerge', 'feMergeNode', 'feMorphology', 'feSpecularLighting', 'feTile',
    'feTurbulence', 'feDistantLight', 'fePointLight', 'feSpotLight'
  ],

  // Only allow safe attributes
  ALLOWED_ATTR: [
    'xmlns', 'xmlns:xlink', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1',
    'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'd', 'fill', 'stroke',
    'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray',
    'stroke-dashoffset', 'transform', 'opacity', 'fill-opacity', 'stroke-opacity',
    'id', 'class', 'style', 'points', 'offset', 'stop-color', 'stop-opacity',
    'href', 'xlink:href', 'gradientUnits', 'gradientTransform', 'spreadMethod',
    'patternUnits', 'patternContentUnits', 'patternTransform', 'maskUnits',
    'maskContentUnits', 'clipPathUnits', 'in', 'in2', 'result', 'stdDeviation',
    'dx', 'dy', 'mode', 'type', 'values', 'tableValues', 'slope', 'intercept',
    'amplitude', 'exponent', 'k1', 'k2', 'k3', 'k4', 'operator', 'radius',
    'kernelMatrix', 'divisor', 'bias', 'targetX', 'targetY', 'edgeMode',
    'preserveAlpha', 'surfaceScale', 'specularConstant', 'specularExponent',
    'diffuseConstant', 'z', 'azimuth', 'elevation', 'pointsAtX', 'pointsAtY',
    'pointsAtZ', 'limitingConeAngle', 'baseFrequency', 'numOctaves', 'seed',
    'stitchTiles'
  ],

  // Block dangerous tags that could execute scripts
  FORBID_TAGS: [
    'script', 'iframe', 'object', 'embed', 'foreignObject', 'image',
    'video', 'audio', 'a', 'animate', 'animateTransform', 'set'
  ],

  // Block event handlers and other dangerous attributes
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
    'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onanimationend',
    'onanimationiteration', 'onanimationstart', 'ontransitionend',
    'onbegin', 'onend', 'onrepeat', 'xlink:href'
  ],

  // Don't allow data attributes (could be used for attacks)
  ALLOW_DATA_ATTR: false,

  // Additional security settings
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
  SAFE_FOR_TEMPLATES: true,
};

/**
 * Dangerous patterns to detect in SVG content
 * These patterns indicate potential XSS attacks
 */
const DANGEROUS_PATTERNS = [
  // Script tags
  /<script[\s\S]*?>/i,
  /<\/script>/i,

  // Iframe and embed tags
  /<iframe[\s\S]*?>/i,
  /<embed[\s\S]*?>/i,
  /<object[\s\S]*?>/i,

  // Foreign objects (can contain HTML)
  /<foreignObject[\s\S]*?>/i,

  // Event handlers
  /on\w+\s*=/i,

  // JavaScript protocol
  /javascript:/i,

  // Data URIs with HTML
  /data:text\/html/i,

  // Import or use external resources
  /@import/i,

  // CDATA sections (can hide malicious content)
  /<!\[CDATA\[[\s\S]*?\]\]>/i,
];

/**
 * Validates if SVG content is safe
 * Returns validation result with reason if unsafe
 */
export function isSVGSafe(svgContent: string): { safe: boolean; reason?: string } {
  if (!svgContent || typeof svgContent !== 'string') {
    return { safe: false, reason: 'Invalid SVG content: empty or not a string' };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(svgContent)) {
      return {
        safe: false,
        reason: `SVG contains dangerous pattern: ${pattern.source}`,
      };
    }
  }

  // Check for null bytes (can be used to bypass filters)
  if (svgContent.includes('\0')) {
    return {
      safe: false,
      reason: 'SVG contains null bytes',
    };
  }

  // Check if it's actually an SVG
  if (!/<svg[\s\S]*?>/i.test(svgContent)) {
    return {
      safe: false,
      reason: 'Content does not appear to be a valid SVG',
    };
  }

  return { safe: true };
}

/**
 * Sanitizes SVG content by removing JavaScript and dangerous elements
 * Uses DOMPurify with strict SVG-specific configuration
 *
 * @param svgContent - Raw SVG content as string
 * @returns Sanitized SVG content safe for rendering
 */
export function sanitizeSVG(svgContent: string): string {
  if (!svgContent || typeof svgContent !== 'string') {
    throw new Error('Invalid SVG content: must be a non-empty string');
  }

  // First validate for obvious threats
  const safetyCheck = isSVGSafe(svgContent);
  if (!safetyCheck.safe) {
    console.warn('[SVG_SANITIZER] Pre-sanitization check failed:', safetyCheck.reason);
  }

  // Sanitize with DOMPurify
  const sanitized = purify.sanitize(svgContent, SVG_SANITIZE_CONFIG);

  // Verify sanitization didn't produce empty result
  if (!sanitized || sanitized.trim().length === 0) {
    throw new Error('SVG sanitization resulted in empty content');
  }

  // Log sanitization for audit trail
  const sizeBefore = svgContent.length;
  const sizeAfter = sanitized.length;
  const reduction = ((sizeBefore - sizeAfter) / sizeBefore * 100).toFixed(2);

  if (sizeBefore !== sizeAfter) {
    console.log('[SVG_SANITIZER] Content sanitized:', {
      sizeBefore,
      sizeAfter,
      reductionPercent: reduction,
    });
  }

  return sanitized;
}

/**
 * Comprehensive SVG validation and sanitization
 * Combines safety checks with sanitization
 *
 * @param svgContent - Raw SVG content
 * @returns Object with sanitized content and validation details
 */
export function validateAndSanitizeSVG(svgContent: string): {
  safe: boolean;
  sanitized: string;
  reason?: string;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Initial safety check
  const safetyCheck = isSVGSafe(svgContent);
  if (!safetyCheck.safe) {
    warnings.push(safetyCheck.reason || 'Unknown safety issue');
  }

  try {
    // Attempt sanitization
    const sanitized = sanitizeSVG(svgContent);

    // Double-check sanitized content
    const postSanitizeCheck = isSVGSafe(sanitized);
    if (!postSanitizeCheck.safe) {
      return {
        safe: false,
        sanitized: '',
        reason: 'Sanitization failed to remove all threats',
        warnings: [...warnings, postSanitizeCheck.reason || 'Post-sanitize check failed'],
      };
    }

    return {
      safe: true,
      sanitized,
      warnings,
    };
  } catch (error) {
    return {
      safe: false,
      sanitized: '',
      reason: error instanceof Error ? error.message : 'Sanitization failed',
      warnings,
    };
  }
}

/**
 * Check if file extension and MIME type indicate SVG
 */
export function isSVGFile(filename: string, mimeType?: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  const isSvgExtension = ext === 'svg';
  const isSvgMime = mimeType === 'image/svg+xml';

  return isSvgExtension || isSvgMime;
}
