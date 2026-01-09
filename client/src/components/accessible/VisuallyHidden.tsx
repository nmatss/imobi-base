import React from 'react';

export interface VisuallyHiddenProps {
  /** Content to hide visually but keep accessible to screen readers */
  children: React.ReactNode;
  /** Render as a specific element */
  as?: React.ElementType;
}

/**
 * VisuallyHidden Component
 * Hides content visually but keeps it accessible to screen readers
 * Uses the sr-only pattern from WCAG best practices
 */
export function VisuallyHidden({
  children,
  as: Component = 'span',
}: VisuallyHiddenProps) {
  return <Component className="sr-only">{children}</Component>;
}
