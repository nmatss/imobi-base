/**
 * Testes de Sanitização XSS
 * Valida que todas as funções de sanitização estão bloqueando XSS
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeCss,
  sanitizeAttribute,
  isSafeUrl,
  sanitizeUrl,
} from '../sanitizer';

describe('Sanitização XSS', () => {
  describe('sanitizeHtml', () => {
    it('deve remover tags <script>', () => {
      const dirty = '<p>Safe</p><script>alert("XSS")</script>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
      expect(clean).not.toContain('alert');
      expect(clean).toContain('<p>Safe</p>');
    });

    it('deve remover atributos onerror', () => {
      const dirty = '<img src="x" onerror="alert(\'XSS\')" />';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('alert');
    });

    it('deve remover tags <iframe>', () => {
      const dirty = '<p>Safe</p><iframe src="evil.com"></iframe>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<iframe>');
      expect(clean).not.toContain('evil.com');
    });

    it('deve permitir HTML seguro', () => {
      const safe = '<p><strong>Bold</strong> and <em>italic</em></p>';
      const clean = sanitizeHtml(safe);
      expect(clean).toBe(safe);
    });

    it('deve remover javascript: em links', () => {
      const dirty = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('deve respeitar allowedTags customizadas', () => {
      const html = '<p>Text</p><strong>Bold</strong>';
      const clean = sanitizeHtml(html, { allowedTags: ['p'] });
      expect(clean).toContain('<p>');
      expect(clean).not.toContain('<strong>');
    });
  });

  describe('sanitizeCss', () => {
    it('deve remover javascript: de CSS', () => {
      const dirty = 'background: url(javascript:alert("XSS"))';
      const clean = sanitizeCss(dirty);
      expect(clean).not.toContain('javascript:');
    });

    it('deve remover expression()', () => {
      const dirty = 'width: expression(alert("XSS"))';
      const clean = sanitizeCss(dirty);
      expect(clean).not.toContain('expression(');
    });

    it('deve remover @import', () => {
      const dirty = '@import url("evil.css")';
      const clean = sanitizeCss(dirty);
      expect(clean).not.toContain('@import');
    });

    it('deve remover behavior:', () => {
      const dirty = 'behavior: url("evil.htc")';
      const clean = sanitizeCss(dirty);
      expect(clean).not.toContain('behavior:');
    });

    it('deve remover url()', () => {
      const dirty = 'background: url("image.png")';
      const clean = sanitizeCss(dirty);
      expect(clean).not.toContain('url(');
    });

    it('deve permitir cores e valores simples', () => {
      const safe = '#ff0000';
      const clean = sanitizeCss(safe);
      expect(clean).toBe('#ff0000');
    });

    it('deve lidar com valores vazios', () => {
      expect(sanitizeCss('')).toBe('');
      expect(sanitizeCss(null as any)).toBe('');
      expect(sanitizeCss(undefined as any)).toBe('');
    });
  });

  describe('sanitizeAttribute', () => {
    it('deve escapar caracteres HTML', () => {
      const dirty = '<script>alert("XSS")</script>';
      const clean = sanitizeAttribute(dirty);
      expect(clean).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });

    it('deve escapar aspas', () => {
      const dirty = 'Text with "quotes" and \'quotes\'';
      const clean = sanitizeAttribute(dirty);
      expect(clean).toContain('&quot;');
      expect(clean).toContain('&#x27;');
    });

    it('deve lidar com valores vazios', () => {
      expect(sanitizeAttribute('')).toBe('');
      expect(sanitizeAttribute(null as any)).toBe('');
    });
  });

  describe('isSafeUrl', () => {
    it('deve aceitar URLs HTTP/HTTPS', () => {
      expect(isSafeUrl('https://example.com')).toBe(true);
      expect(isSafeUrl('http://example.com')).toBe(true);
    });

    it('deve aceitar mailto:', () => {
      expect(isSafeUrl('mailto:test@example.com')).toBe(true);
    });

    it('deve rejeitar javascript:', () => {
      expect(isSafeUrl('javascript:alert("XSS")')).toBe(false);
    });

    it('deve rejeitar data:', () => {
      expect(isSafeUrl('data:text/html,<script>alert("XSS")</script>')).toBe(false);
    });

    it('deve rejeitar vbscript:', () => {
      expect(isSafeUrl('vbscript:msgbox("XSS")')).toBe(false);
    });

    it('deve rejeitar file:', () => {
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
    });

    it('deve lidar com valores inválidos', () => {
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl(null as any)).toBe(false);
      expect(isSafeUrl('not a url')).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('deve retornar URLs seguras inalteradas', () => {
      const safe = 'https://example.com';
      expect(sanitizeUrl(safe)).toBe(safe);
    });

    it('deve bloquear javascript:', () => {
      expect(sanitizeUrl('javascript:alert("XSS")')).toBe('#');
    });

    it('deve bloquear data:', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("XSS")</script>')).toBe('#');
    });

    it('deve bloquear vbscript:', () => {
      expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('#');
    });

    it('deve lidar com valores vazios', () => {
      expect(sanitizeUrl('')).toBe('#');
      expect(sanitizeUrl(null as any)).toBe('#');
    });
  });

  describe('Vetores de XSS avançados', () => {
    it('deve bloquear XSS com codificação HTML', () => {
      const dirty = '<img src=x onerror="&#97;&#108;&#101;&#114;&#116;&#40;&#49;&#41;">';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onerror');
    });

    it('deve bloquear XSS com uppercase', () => {
      const dirty = '<SCRIPT>alert("XSS")</SCRIPT>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('SCRIPT');
      expect(clean).not.toContain('alert');
    });

    it('deve bloquear XSS com espaços', () => {
      const dirty = '<img src=x o n e r r o r=alert(1)>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('alert');
    });

    it('deve bloquear SVG com XSS', () => {
      const dirty = '<svg><script>alert("XSS")</script></svg>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('<script>');
    });

    it('deve bloquear event handlers misturados', () => {
      const dirty = '<div onload="alert(1)" onclick="alert(2)">Test</div>';
      const clean = sanitizeHtml(dirty);
      expect(clean).not.toContain('onload');
      expect(clean).not.toContain('onclick');
    });
  });
});
