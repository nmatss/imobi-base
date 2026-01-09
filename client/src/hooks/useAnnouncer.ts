import { useCallback, useEffect, useRef } from 'react';

type AnnouncementPriority = 'polite' | 'assertive';

/**
 * Custom hook for making announcements to screen readers
 * Creates a live region for dynamic content updates
 * Complies with WCAG 2.1 Status Messages (4.1.3)
 */
export function useAnnouncer() {
  const politeRef = useRef<HTMLDivElement | null>(null);
  const assertiveRef = useRef<HTMLDivElement | null>(null);

  // Create live regions on mount
  useEffect(() => {
    // Polite announcer
    if (!document.getElementById('a11y-announcer-polite')) {
      const politeDiv = document.createElement('div');
      politeDiv.id = 'a11y-announcer-polite';
      politeDiv.setAttribute('role', 'status');
      politeDiv.setAttribute('aria-live', 'polite');
      politeDiv.setAttribute('aria-atomic', 'true');
      politeDiv.className = 'sr-only';
      document.body.appendChild(politeDiv);
      politeRef.current = politeDiv;
    } else {
      politeRef.current = document.getElementById(
        'a11y-announcer-polite'
      ) as HTMLDivElement;
    }

    // Assertive announcer
    if (!document.getElementById('a11y-announcer-assertive')) {
      const assertiveDiv = document.createElement('div');
      assertiveDiv.id = 'a11y-announcer-assertive';
      assertiveDiv.setAttribute('role', 'alert');
      assertiveDiv.setAttribute('aria-live', 'assertive');
      assertiveDiv.setAttribute('aria-atomic', 'true');
      assertiveDiv.className = 'sr-only';
      document.body.appendChild(assertiveDiv);
      assertiveRef.current = assertiveDiv;
    } else {
      assertiveRef.current = document.getElementById(
        'a11y-announcer-assertive'
      ) as HTMLDivElement;
    }

    return () => {
      // Cleanup is handled by the app, don't remove on unmount
    };
  }, []);

  const announce = useCallback(
    (message: string, priority: AnnouncementPriority = 'polite') => {
      const announcer =
        priority === 'assertive' ? assertiveRef.current : politeRef.current;

      if (announcer) {
        // Clear previous message
        announcer.textContent = '';

        // Small delay to ensure screen readers pick up the change
        setTimeout(() => {
          announcer.textContent = message;
        }, 100);

        // Clear after announcement
        setTimeout(() => {
          announcer.textContent = '';
        }, 1000);
      }
    },
    []
  );

  return { announce };
}
