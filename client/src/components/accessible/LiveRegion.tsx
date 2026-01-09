import React from 'react';

export interface LiveRegionProps {
  /** Content to announce */
  children: React.ReactNode;
  /** Politeness level */
  'aria-live'?: 'polite' | 'assertive' | 'off';
  /** Whether to announce the entire region or just changes */
  'aria-atomic'?: boolean;
  /** Relevant changes to announce */
  'aria-relevant'?: 'additions' | 'removals' | 'text' | 'all';
  /** Role for the live region */
  role?: 'status' | 'alert' | 'log' | 'timer';
}

/**
 * LiveRegion Component
 * Creates an ARIA live region for dynamic content updates
 * Implements WCAG 2.1 Status Messages (4.1.3)
 */
export function LiveRegion({
  children,
  'aria-live': ariaLive = 'polite',
  'aria-atomic': ariaAtomic = true,
  'aria-relevant': ariaRelevant = 'all',
  role = 'status',
}: LiveRegionProps) {
  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      aria-relevant={ariaRelevant}
      className="sr-only"
    >
      {children}
    </div>
  );
}
