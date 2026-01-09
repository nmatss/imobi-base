/**
 * SafeHTML Component
 * Componente React para renderizar HTML sanitizado de forma segura
 * Protege contra ataques XSS usando DOMPurify
 */

import React from "react";
import { sanitizeHtml, sanitizeUrl } from '@/lib/sanitizer';

interface SafeHTMLProps {
  /**
   * HTML a ser renderizado (será sanitizado automaticamente)
   */
  html: string;
  /**
   * Classes CSS para aplicar ao container
   */
  className?: string;
  /**
   * Tags HTML permitidas (se não especificado, usa lista padrão)
   */
  allowedTags?: string[];
  /**
   * Atributos HTML permitidos (se não especificado, usa lista padrão)
   */
  allowedAttributes?: string[];
}

/**
 * Renderiza HTML sanitizado de forma segura
 *
 * @example
 * ```tsx
 * <SafeHTML html={userContent} className="prose" />
 * ```
 *
 * @example
 * ```tsx
 * <SafeHTML
 *   html={richTextContent}
 *   allowedTags={['p', 'strong', 'em', 'a']}
 *   allowedAttributes={['href', 'class']}
 * />
 * ```
 */
export function SafeHTML({
  html,
  className,
  allowedTags,
  allowedAttributes,
}: SafeHTMLProps) {
  const sanitized = sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
  });

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

interface SafeLinkProps {
  /**
   * URL do link (será validada automaticamente)
   */
  href: string;
  /**
   * Texto do link
   */
  children: React.ReactNode;
  /**
   * Classes CSS
   */
  className?: string;
  /**
   * Target do link (_blank, _self, etc)
   */
  target?: string;
  /**
   * Rel attribute (se target="_blank", será automaticamente "noopener noreferrer")
   */
  rel?: string;
}

/**
 * Componente de link seguro que valida URLs
 *
 * @example
 * ```tsx
 * <SafeLink href={userUrl} target="_blank">
 *   Clique aqui
 * </SafeLink>
 * ```
 */
export function SafeLink({
  href,
  children,
  className,
  target,
  rel,
}: SafeLinkProps) {
  const safeUrl = sanitizeUrl(href);

  // Se target é _blank, adicionar noopener noreferrer automaticamente
  const safeRel = target === '_blank'
    ? 'noopener noreferrer'
    : rel;

  return (
    <a
      href={safeUrl}
      className={className}
      target={target}
      rel={safeRel}
    >
      {children}
    </a>
  );
}
