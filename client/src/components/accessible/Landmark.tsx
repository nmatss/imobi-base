import React from 'react';
import { cn } from '@/lib/utils';

export interface LandmarkProps {
  /** Landmark role */
  role: 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'search' | 'region';
  /** Accessible label for the landmark */
  'aria-label'?: string;
  /** ID of element that labels this landmark */
  'aria-labelledby'?: string;
  /** Content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Render as specific element */
  as?: React.ElementType;
}

/**
 * Landmark Component
 * Provides proper ARIA landmarks for page structure
 * Implements WCAG 2.1 Info and Relationships (1.3.1) and Bypass Blocks (2.4.1)
 */
export function Landmark({
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  children,
  className,
  as: Component = 'div',
}: LandmarkProps) {
  // Ensure landmarks have labels if there are multiple of the same type
  const props: React.HTMLAttributes<HTMLElement> & {
    role: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
  } = {
    role,
    className: cn(className),
  };

  if (ariaLabel) {
    props['aria-label'] = ariaLabel;
  }

  if (ariaLabelledBy) {
    props['aria-labelledby'] = ariaLabelledBy;
  }

  return <Component {...props}>{children}</Component>;
}
