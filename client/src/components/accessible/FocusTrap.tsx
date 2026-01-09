import React, { RefObject } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export interface FocusTrapProps {
  /** Content to wrap with focus trap */
  children: React.ReactNode;
  /** Enable the focus trap */
  enabled?: boolean;
  /** Element to return focus to when trap deactivates */
  returnFocus?: HTMLElement;
  /** Callback when user tries to escape */
  onEscape?: () => void;
  /** Additional className */
  className?: string;
}

/**
 * FocusTrap Component
 * Traps focus within a container for modals and dialogs
 * Implements WCAG 2.1 Keyboard (2.1.1) and Focus Order (2.4.3)
 */
export function FocusTrap({
  children,
  enabled = true,
  returnFocus,
  onEscape,
  className,
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  useFocusTrap({
    containerRef: containerRef as RefObject<HTMLElement>,
    enabled,
    returnFocus,
    onEscape,
  });

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
