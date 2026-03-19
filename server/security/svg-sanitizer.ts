/**
 * SVG SANITIZATION MODULE
 *
 * Prevents XSS attacks through malicious SVG files by:
 * 1. Removing JavaScript code and event handlers
 * 2. Blocking dangerous tags (script, iframe, object, etc.)
 * 3. Filtering out unsafe attributes
 * 4. Using DOMPurify for robust sanitization (when available)
 *
 * Security: P0 (Critical)
 * OWASP: A03:2021 - Injection
 */

// Lazy-loaded DOMPurify instance (jsdom not available in all serverless environments)
let purify: any = null;

async function getPurify() {
  if (purify) return purify;
  try {
    const { JSDOM } = await import('jsdom');
    const DOMPurify = (await import('isomorphic-dompurify')).default;
    const window = new JSDOM('').window;
    purify = DOMPurify(window as any);
    return purify;
  } catch {
    console.warn('[SVG_SANITIZER] jsdom not available, using regex-only sanitization');
    return null;
  }
}

/**
 * Sanitization configuration for SVG files
 */
const SVG_SANITIZE_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
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
  FORBID_TAGS: [
    'script', 'iframe', 'object', 'embed', 'foreignObject', 'image',
    'video', 'audio', 'a', 'animate', 'animateTransform', 'set'
  ],
  FORBID_ATTR: [
    'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
    'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onanimationend',
    'onanimationiteration', 'onanimationstart', 'ontransitionend',
    'onbegin', 'onend', 'onrepeat', 'xlink:href'
  ],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
  RETURN_TRUSTED_TYPE: false,
  SAFE_FOR_TEMPLATES: true,
};

/**
 * Dangerous patterns to detect in SVG content
 */
const DANGEROUS_PATTERNS = [
  /<script[\s\S]*?>/i,
  /<\/script>/i,
  /<iframe[\s\S]*?>/i,
  /<embed[\s\S]*?>/i,
  /<object[\s\S]*?>/i,
  /<foreignObject[\s\S]*?>/i,
  /on\w+\s*=/i,
  /javascript:/i,
  /data:text\/html/i,
  /@import/i,
  /<!\[CDATA\[[\s\S]*?\]\]>/i,
];

export function isSVGSafe(svgContent: string): { safe: boolean; reason?: string } {
  if (!svgContent || typeof svgContent !== 'string') {
    return { safe: false, reason: 'Invalid SVG content: empty or not a string' };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(svgContent)) {
      return { safe: false, reason: `SVG contains dangerous pattern: ${pattern.source}` };
    }
  }

  if (svgContent.includes('\0')) {
    return { safe: false, reason: 'SVG contains null bytes' };
  }

  if (!/<svg[\s\S]*?>/i.test(svgContent)) {
    return { safe: false, reason: 'Content does not appear to be a valid SVG' };
  }

  return { safe: true };
}

/**
 * Regex-based SVG sanitization fallback (when jsdom is not available)
 */
function regexSanitizeSVG(svgContent: string): string {
  let sanitized = svgContent;
  // Remove script tags and content
  sanitized = sanitized.replace(/<script[\s\S]*?<\/script>/gi, '');
  // Remove event handlers
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript:/gi, '');
  // Remove dangerous tags
  for (const tag of SVG_SANITIZE_CONFIG.FORBID_TAGS) {
    const regex = new RegExp(`<${tag}[\\s\\S]*?(?:<\\/${tag}>|\\/>)`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }
  return sanitized;
}

export async function sanitizeSVG(svgContent: string): Promise<string> {
  if (!svgContent || typeof svgContent !== 'string') {
    throw new Error('Invalid SVG content: must be a non-empty string');
  }

  const safetyCheck = isSVGSafe(svgContent);
  if (!safetyCheck.safe) {
    console.warn('[SVG_SANITIZER] Pre-sanitization check failed:', safetyCheck.reason);
  }

  const p = await getPurify();
  const sanitized = p
    ? p.sanitize(svgContent, SVG_SANITIZE_CONFIG)
    : regexSanitizeSVG(svgContent);

  if (!sanitized || sanitized.trim().length === 0) {
    throw new Error('SVG sanitization resulted in empty content');
  }

  return sanitized;
}

export async function validateAndSanitizeSVG(svgContent: string): Promise<{
  safe: boolean;
  sanitized: string;
  reason?: string;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const safetyCheck = isSVGSafe(svgContent);
  if (!safetyCheck.safe) {
    warnings.push(safetyCheck.reason || 'Unknown safety issue');
  }

  try {
    const sanitized = await sanitizeSVG(svgContent);
    const postSanitizeCheck = isSVGSafe(sanitized);
    if (!postSanitizeCheck.safe) {
      return {
        safe: false, sanitized: '',
        reason: 'Sanitization failed to remove all threats',
        warnings: [...warnings, postSanitizeCheck.reason || 'Post-sanitize check failed'],
      };
    }
    return { safe: true, sanitized, warnings };
  } catch (error) {
    return {
      safe: false, sanitized: '',
      reason: error instanceof Error ? error.message : 'Sanitization failed',
      warnings,
    };
  }
}

export function isSVGFile(filename: string, mimeType?: string): boolean {
  const ext = filename.toLowerCase().split('.').pop();
  return ext === 'svg' || mimeType === 'image/svg+xml';
}
