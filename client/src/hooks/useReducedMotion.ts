import { useState, useEffect } from 'react';

/**
 * Custom hook to detect user's motion preferences
 * Respects prefers-reduced-motion media query
 * Complies with WCAG 2.1 Animation from Interactions (2.3.3)
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Get animation duration based on reduced motion preference
 * Returns minimal duration if reduced motion is preferred
 */
export function useAnimationDuration(normalDuration: number = 300): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? 1 : normalDuration;
}
