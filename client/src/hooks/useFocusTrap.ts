import { useEffect, useCallback, RefObject } from 'react';

export interface FocusTrapOptions {
  /** Element to trap focus within */
  containerRef: RefObject<HTMLElement>;
  /** Enable the focus trap (default: true) */
  enabled?: boolean;
  /** Element to focus when trap activates */
  initialFocus?: RefObject<HTMLElement>;
  /** Element to return focus to when trap deactivates */
  returnFocus?: RefObject<HTMLElement> | HTMLElement;
  /** Callback when user tries to escape */
  onEscape?: () => void;
}

/**
 * Custom hook for implementing focus trapping in modals/dialogs
 * Ensures keyboard users stay within the modal
 * Complies with WCAG 2.1 Focus Order (2.4.3) and Keyboard (2.1.1)
 */
export function useFocusTrap(options: FocusTrapOptions) {
  const {
    containerRef,
    enabled = true,
    initialFocus,
    returnFocus,
    onEscape,
  } = options;

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const selector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(selector)
    ).filter((el) => {
      // Filter out elements that are not visible or are disabled
      return (
        !el.hasAttribute('disabled') &&
        el.tabIndex !== -1 &&
        !el.hidden &&
        el.offsetParent !== null
      );
    });
  }, [containerRef]);

  const handleTabKey = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // If shift + tab from first element, go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
      // If tab from last element, go to first
      else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [enabled, getFocusableElements]
  );

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (enabled && event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }
    },
    [enabled, onEscape]
  );

  // Store the element that had focus before trap was activated
  useEffect(() => {
    if (!enabled) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement;

    // Focus initial element or first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else {
        focusableElements[0].focus();
      }
    }

    // Return focus when trap is deactivated
    return () => {
      if (returnFocus) {
        const element =
          'current' in returnFocus ? returnFocus.current : returnFocus;
        element?.focus();
      } else {
        previouslyFocusedElement?.focus();
      }
    };
  }, [enabled, initialFocus, returnFocus, getFocusableElements]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [enabled, handleTabKey, handleEscape]);

  return {
    focusFirst: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) elements[0].focus();
    },
    focusLast: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) elements[elements.length - 1].focus();
    },
  };
}
