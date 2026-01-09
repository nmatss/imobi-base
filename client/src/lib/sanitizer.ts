/**
 * HTML/CSS/URL Sanitization Utilities
 * Protege contra ataques XSS usando DOMPurify
 */

import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML removendo scripts e elementos perigosos
 */
export function sanitizeHtml(dirty: string, options?: {
  allowedTags?: string[];
  allowedAttributes?: string[];
}): string {
  const config = {
    ALLOWED_TAGS: options?.allowedTags || [
      'b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li',
      'a', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'td', 'th',
    ],
    ALLOWED_ATTR: options?.allowedAttributes || [
      'href', 'target', 'class', 'id', 'style',
    ],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'form', 'input'],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
      'onmouseenter', 'onmouseleave', 'onfocus', 'onblur', 'onchange',
      'onsubmit', 'onkeydown', 'onkeyup', 'onkeypress',
    ],
  };

  // DOMPurify.sanitize retorna TrustedHTML em alguns ambientes, então convertemos para string
  const result = DOMPurify.sanitize(dirty, config);
  return typeof result === 'string' ? result : String(result);
}

/**
 * Sanitiza CSS removendo expressões perigosas
 */
export function sanitizeCss(css: string): string {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Remover expressões perigosas de CSS
  return css
    .replace(/javascript:/gi, '')
    .replace(/expression\(/gi, '')
    .replace(/behavior:/gi, '')
    .replace(/binding:/gi, '')
    .replace(/@import/gi, '')
    .replace(/url\s*\(/gi, '') // Desabilitar url()
    .replace(/[\x00-\x1f\x7f]/g, '') // Remover caracteres de controle
    .replace(/<|>/g, ''); // Remover < e >
}

/**
 * Sanitiza valor de atributo
 */
export function sanitizeAttribute(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return entities[char] || char;
    });
}

/**
 * Valida se uma URL é segura
 */
export function isSafeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url, window.location.origin);

    // Bloquear se não tem protocolo ou é relativa (sem detectar)
    // "not a url" se torna "http://localhost/not%20a%20url" no browser
    // Então precisamos validar melhor
    if (url.indexOf(':') === -1 && !url.startsWith('/')) {
      // URL relativa sem / ou protocolo - bloquear
      return false;
    }

    // Permitir apenas http, https, mailto
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return false;
    }

    return true;
  } catch {
    // Se não é uma URL válida, bloquear
    return false;
  }
}

/**
 * Sanitiza URL bloqueando protocolos perigosos
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '#';
  }

  // Bloquear javascript:, data:, vbscript:, file:, etc
  if (/^(javascript|data|vbscript|file):/i.test(url)) {
    return '#';
  }

  return isSafeUrl(url) ? url : '#';
}

// Componente React para renderizar HTML sanitizado foi movido para SafeHTML.tsx
