import { useEffect, useCallback, RefObject } from 'react';

export interface KeyboardNavOptions {
  /** Elements to navigate through (e.g., list items, menu items) */
  containerRef: RefObject<HTMLElement>;
  /** Selector for focusable elements within the container */
  itemSelector?: string;
  /** Enable arrow key navigation (default: true) */
  enableArrowKeys?: boolean;
  /** Enable Home/End keys (default: true) */
  enableHomeEnd?: boolean;
  /** Enable Tab trapping (default: false) */
  trapFocus?: boolean;
  /** Callback when an item is selected with Enter/Space */
  onSelect?: (element: HTMLElement) => void;
  /** Loop navigation (default: true) */
  loop?: boolean;
  /** Horizontal or vertical navigation (default: 'vertical') */
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Custom hook for implementing accessible keyboard navigation
 * Supports arrow keys, Tab, Home/End, Enter/Space
 * Complies with WCAG 2.1 keyboard navigation requirements
 */
export function useKeyboardNav(options: KeyboardNavOptions) {
  const {
    containerRef,
    itemSelector = '[role="menuitem"], [role="option"], [role="tab"], button:not([disabled]), a[href]',
    enableArrowKeys = true,
    enableHomeEnd = true,
    trapFocus = false,
    onSelect,
    loop = true,
    orientation = 'vertical',
  } = options;

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(itemSelector)
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);
  }, [containerRef, itemSelector]);

  const focusElement = useCallback((element: HTMLElement) => {
    element.focus();
    // Scroll into view if needed
    element.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const currentIndex = elements.findIndex((el) => el === document.activeElement);
      let nextIndex = currentIndex;

      const isVertical = orientation === 'vertical';
      const forwardKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const backwardKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      // Arrow key navigation
      if (enableArrowKeys) {
        if (event.key === forwardKey) {
          event.preventDefault();
          nextIndex = currentIndex + 1;
          if (nextIndex >= elements.length) {
            nextIndex = loop ? 0 : elements.length - 1;
          }
          focusElement(elements[nextIndex]);
        } else if (event.key === backwardKey) {
          event.preventDefault();
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) {
            nextIndex = loop ? elements.length - 1 : 0;
          }
          focusElement(elements[nextIndex]);
        }
      }

      // Home/End keys
      if (enableHomeEnd) {
        if (event.key === 'Home') {
          event.preventDefault();
          focusElement(elements[0]);
        } else if (event.key === 'End') {
          event.preventDefault();
          focusElement(elements[elements.length - 1]);
        }
      }

      // Enter/Space to select
      if ((event.key === 'Enter' || event.key === ' ') && onSelect) {
        const currentElement = document.activeElement as HTMLElement;
        if (elements.includes(currentElement)) {
          event.preventDefault();
          onSelect(currentElement);
        }
      }

      // Tab trapping
      if (trapFocus && event.key === 'Tab') {
        event.preventDefault();
        if (event.shiftKey) {
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = elements.length - 1;
        } else {
          nextIndex = currentIndex + 1;
          if (nextIndex >= elements.length) nextIndex = 0;
        }
        focusElement(elements[nextIndex]);
      }
    },
    [
      getFocusableElements,
      enableArrowKeys,
      enableHomeEnd,
      trapFocus,
      onSelect,
      loop,
      orientation,
      focusElement,
    ]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, handleKeyDown]);

  return {
    focusFirst: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) focusElement(elements[0]);
    },
    focusLast: () => {
      const elements = getFocusableElements();
      if (elements.length > 0) focusElement(elements[elements.length - 1]);
    },
  };
}
