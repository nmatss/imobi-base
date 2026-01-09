import { useState, useEffect, useRef } from 'react';

/**
 * Throttle hook - limits how often a value can update
 * Useful for scroll handlers, resize events, etc.
 *
 * @param value - The value to throttle
 * @param delay - Minimum delay between updates in milliseconds (default: 500ms)
 * @returns The throttled value
 *
 * @example
 * ```tsx
 * const [scrollPosition, setScrollPosition] = useState(0);
 * const throttledScrollPosition = useThrottle(scrollPosition, 100);
 *
 * useEffect(() => {
 *   const handleScroll = () => setScrollPosition(window.scrollY);
 *   window.addEventListener('scroll', handleScroll);
 *   return () => window.removeEventListener('scroll', handleScroll);
 * }, []);
 * ```
 */
export function useThrottle<T>(value: T, delay: number = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= delay) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, delay - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}
