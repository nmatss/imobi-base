import React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string;
  /** Link text */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * SkipLink Component
 * Provides keyboard users a way to skip repetitive content
 * Implements WCAG 2.1 Bypass Blocks (2.4.1)
 */
export function SkipLink({ targetId, children, className }: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        'skip-link',
        'absolute -top-10 left-4 z-[100] px-4 py-2',
        'bg-primary text-primary-foreground rounded-md',
        'font-medium text-sm',
        'focus:top-4 transition-all',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      {children}
    </a>
  );
}
