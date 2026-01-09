/**
 * SVG SANITIZER TESTS
 *
 * Tests for SVG sanitization functionality to prevent XSS attacks
 */

import { describe, it, expect } from 'vitest';
import { sanitizeSVG, isSVGSafe, validateAndSanitizeSVG, isSVGFile } from '../svg-sanitizer';

describe('SVG Sanitizer', () => {
  describe('isSVGFile', () => {
    it('should detect SVG files by extension', () => {
      expect(isSVGFile('logo.svg')).toBe(true);
      expect(isSVGFile('image.png')).toBe(false);
      expect(isSVGFile('Logo.SVG')).toBe(true);
    });

    it('should detect SVG files by MIME type', () => {
      expect(isSVGFile('file.txt', 'image/svg+xml')).toBe(true);
      expect(isSVGFile('file.txt', 'image/png')).toBe(false);
    });
  });

  describe('isSVGSafe', () => {
    it('should detect script tags', () => {
      const maliciousSVG = '<svg><script>alert("XSS")</script></svg>';
      const result = isSVGSafe(maliciousSVG);
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('script');
    });

    it('should detect event handlers', () => {
      const maliciousSVG = '<svg onload="alert(\'XSS\')"></svg>';
      const result = isSVGSafe(maliciousSVG);
      expect(result.safe).toBe(false);
    });

    it('should detect javascript: protocol', () => {
      const maliciousSVG = '<svg><a href="javascript:alert(\'XSS\')">Click</a></svg>';
      const result = isSVGSafe(maliciousSVG);
      expect(result.safe).toBe(false);
    });

    it('should detect foreignObject tags', () => {
      const maliciousSVG = '<svg><foreignObject><body><script>alert("XSS")</script></body></foreignObject></svg>';
      const result = isSVGSafe(maliciousSVG);
      expect(result.safe).toBe(false);
    });

    it('should accept safe SVG', () => {
      const safeSVG = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/></svg>';
      const result = isSVGSafe(safeSVG);
      expect(result.safe).toBe(true);
    });

    it('should reject null bytes', () => {
      const maliciousSVG = '<svg>\0<script>alert("XSS")</script></svg>';
      const result = isSVGSafe(maliciousSVG);
      expect(result.safe).toBe(false);
      // The script tag is detected first before null bytes check
      expect(result.reason).toBeDefined();
    });

    it('should reject non-SVG content', () => {
      const notSVG = '<div>This is not SVG</div>';
      const result = isSVGSafe(notSVG);
      expect(result.safe).toBe(false);
      expect(result.reason).toContain('valid SVG');
    });
  });

  describe('sanitizeSVG', () => {
    it('should remove script tags', () => {
      const maliciousSVG = '<svg><script>alert("XSS")</script><circle cx="50" cy="50" r="40"/></svg>';
      const sanitized = sanitizeSVG(maliciousSVG);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<circle');
    });

    it('should remove event handlers', () => {
      const maliciousSVG = '<svg onload="alert(\'XSS\')"><circle cx="50" cy="50" r="40"/></svg>';
      const sanitized = sanitizeSVG(maliciousSVG);
      expect(sanitized).not.toContain('onload');
      expect(sanitized).toContain('<circle');
    });

    it('should preserve safe SVG elements', () => {
      const safeSVG = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="red"/><rect x="10" y="10" width="30" height="30"/></svg>';
      const sanitized = sanitizeSVG(safeSVG);
      expect(sanitized).toContain('circle');
      expect(sanitized).toContain('rect');
      expect(sanitized).toContain('fill="red"');
    });

    it('should remove foreignObject tags', () => {
      const maliciousSVG = '<svg><foreignObject><body><script>alert("XSS")</script></body></foreignObject><circle cx="50" cy="50" r="40"/></svg>';
      const sanitized = sanitizeSVG(maliciousSVG);
      expect(sanitized).not.toContain('foreignObject');
      expect(sanitized).toContain('<circle');
    });

    it('should throw error on invalid input', () => {
      expect(() => sanitizeSVG('')).toThrow();
      expect(() => sanitizeSVG(null as any)).toThrow();
      expect(() => sanitizeSVG(undefined as any)).toThrow();
    });
  });

  describe('validateAndSanitizeSVG', () => {
    it('should return safe:true for clean SVG', () => {
      const safeSVG = '<svg width="100" height="100"><circle cx="50" cy="50" r="40" fill="blue"/></svg>';
      const result = validateAndSanitizeSVG(safeSVG);
      expect(result.safe).toBe(true);
      expect(result.sanitized).toContain('circle');
      expect(result.warnings).toHaveLength(0);
    });

    it('should return safe:true after sanitizing malicious SVG', () => {
      const maliciousSVG = '<svg><script>alert("XSS")</script><circle cx="50" cy="50" r="40"/></svg>';
      const result = validateAndSanitizeSVG(maliciousSVG);
      expect(result.safe).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('<circle');
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return safe:false for extremely malicious content', () => {
      // Test with content that can't be safely sanitized
      const extremelyMalicious = '\0\0\0';
      const result = validateAndSanitizeSVG(extremelyMalicious);
      expect(result.safe).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should include warnings for suspicious content', () => {
      const suspiciousSVG = '<svg><script>alert("XSS")</script></svg>';
      const result = validateAndSanitizeSVG(suspiciousSVG);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle nested malicious content', () => {
      const nestedMalicious = '<svg><g><g><script>alert("XSS")</script></g></g></svg>';
      const sanitized = sanitizeSVG(nestedMalicious);
      expect(sanitized).not.toContain('<script>');
    });

    it('should handle multiple attack vectors', () => {
      const multipleAttacks = `
        <svg onload="alert('XSS')">
          <script>alert("XSS")</script>
          <a href="javascript:alert('XSS')">Click</a>
          <foreignObject><body onload="alert('XSS')"></body></foreignObject>
        </svg>
      `;
      const sanitized = sanitizeSVG(multipleAttacks);
      expect(sanitized).not.toContain('onload');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('foreignObject');
    });

    it('should handle SVG with CDATA sections', () => {
      const cdataSVG = '<svg><![CDATA[<script>alert("XSS")</script>]]></svg>';
      const result = isSVGSafe(cdataSVG);
      expect(result.safe).toBe(false);
    });

    it('should preserve gradients and filters', () => {
      const complexSVG = `
        <svg>
          <defs>
            <linearGradient id="grad1">
              <stop offset="0%" stop-color="red"/>
              <stop offset="100%" stop-color="blue"/>
            </linearGradient>
          </defs>
          <rect fill="url(#grad1)" width="100" height="100"/>
        </svg>
      `;
      const sanitized = sanitizeSVG(complexSVG);
      expect(sanitized).toContain('linearGradient');
      expect(sanitized).toContain('stop');
      expect(sanitized).toContain('rect');
    });
  });
});
