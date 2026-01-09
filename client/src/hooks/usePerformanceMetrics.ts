import { useEffect, useState } from 'react';

export interface WebVitals {
  // Largest Contentful Paint - Measures loading performance
  LCP: number | null;
  // First Input Delay - Measures interactivity
  FID: number | null;
  // Cumulative Layout Shift - Measures visual stability
  CLS: number | null;
  // First Contentful Paint - Measures when first content is painted
  FCP: number | null;
  // Time to First Byte - Measures server response time
  TTFB: number | null;
  // Time to Interactive - Measures when page becomes fully interactive
  TTI: number | null;
}

export interface PerformanceMetrics extends WebVitals {
  // Memory usage (if available)
  memoryUsage: number | null;
  // Navigation timing
  domContentLoaded: number | null;
  windowLoaded: number | null;
}

/**
 * Custom hook to measure Web Vitals and performance metrics
 *
 * Usage:
 * ```tsx
 * const metrics = usePerformanceMetrics();
 * console.log('LCP:', metrics.LCP);
 * console.log('FID:', metrics.FID);
 * console.log('CLS:', metrics.CLS);
 * ```
 *
 * Best Practices:
 * - LCP should be < 2.5s (good), < 4s (needs improvement)
 * - FID should be < 100ms (good), < 300ms (needs improvement)
 * - CLS should be < 0.1 (good), < 0.25 (needs improvement)
 * - FCP should be < 1.8s (good), < 3s (needs improvement)
 * - TTFB should be < 600ms (good), < 1800ms (needs improvement)
 */
export function usePerformanceMetrics(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    LCP: null,
    FID: null,
    CLS: null,
    FCP: null,
    TTFB: null,
    TTI: null,
    memoryUsage: null,
    domContentLoaded: null,
    windowLoaded: null,
  });

  useEffect(() => {
    // Check if Performance API is available
    if (typeof window === 'undefined' || !window.performance) {
      return;
    }

    // Measure TTFB (Time to First Byte)
    const measureTTFB = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart;
        setMetrics(prev => ({ ...prev, TTFB: ttfb }));
      }
    };

    // Measure FCP (First Contentful Paint)
    const measureFCP = () => {
      const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
      if (fcpEntry) {
        setMetrics(prev => ({ ...prev, FCP: fcpEntry.startTime }));
      }
    };

    // Measure LCP (Largest Contentful Paint)
    const measureLCP = () => {
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            if (lastEntry && lastEntry.renderTime) {
              setMetrics(prev => ({ ...prev, LCP: lastEntry.renderTime }));
            }
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // Cleanup after 10 seconds
          setTimeout(() => {
            lcpObserver.disconnect();
          }, 10000);
        } catch (error) {
          console.warn('LCP measurement not supported:', error);
        }
      }
    };

    // Measure FID (First Input Delay)
    const measureFID = () => {
      if ('PerformanceObserver' in window) {
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (entry.processingStart && entry.startTime) {
                const fid = entry.processingStart - entry.startTime;
                setMetrics(prev => ({ ...prev, FID: fid }));
              }
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Cleanup after 10 seconds
          setTimeout(() => {
            fidObserver.disconnect();
          }, 10000);
        } catch (error) {
          console.warn('FID measurement not supported:', error);
        }
      }
    };

    // Measure CLS (Cumulative Layout Shift)
    const measureCLS = () => {
      if ('PerformanceObserver' in window) {
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as any[]) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
                setMetrics(prev => ({ ...prev, CLS: clsValue }));
              }
            }
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });

          // Cleanup after 10 seconds
          setTimeout(() => {
            clsObserver.disconnect();
          }, 10000);
        } catch (error) {
          console.warn('CLS measurement not supported:', error);
        }
      }
    };

    // Measure DOM Content Loaded and Window Loaded
    const measureNavigationTiming = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        const windowLoaded = navigation.loadEventEnd - navigation.loadEventStart;
        setMetrics(prev => ({
          ...prev,
          domContentLoaded,
          windowLoaded,
        }));
      }
    };

    // Measure Memory Usage (Chrome only)
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    // Execute measurements
    measureTTFB();
    measureFCP();
    measureLCP();
    measureFID();
    measureCLS();

    // Wait for page load to measure navigation timing
    if (document.readyState === 'complete') {
      measureNavigationTiming();
      measureMemory();
    } else {
      window.addEventListener('load', () => {
        measureNavigationTiming();
        measureMemory();
      });
    }

    // Optionally log metrics to console in development
    if (process.env.NODE_ENV === 'development') {
      const logMetrics = setTimeout(() => {
        console.group('📊 Performance Metrics');
        console.log('LCP (Largest Contentful Paint):', metrics.LCP ? `${metrics.LCP.toFixed(2)}ms` : 'Measuring...');
        console.log('FID (First Input Delay):', metrics.FID ? `${metrics.FID.toFixed(2)}ms` : 'Waiting for interaction...');
        console.log('CLS (Cumulative Layout Shift):', metrics.CLS ? metrics.CLS.toFixed(3) : 'Measuring...');
        console.log('FCP (First Contentful Paint):', metrics.FCP ? `${metrics.FCP.toFixed(2)}ms` : 'Measuring...');
        console.log('TTFB (Time to First Byte):', metrics.TTFB ? `${metrics.TTFB.toFixed(2)}ms` : 'N/A');
        console.groupEnd();
      }, 3000);

      return () => clearTimeout(logMetrics);
    }
  }, []);

  return metrics;
}

/**
 * Helper function to report metrics to analytics or monitoring service
 */
export function reportWebVitals(metrics: WebVitals) {
  // Send to analytics service (Google Analytics, DataDog, etc.)
  if (typeof window !== 'undefined' && (window as any).gtag) {
    Object.entries(metrics).forEach(([metric, value]) => {
      if (value !== null) {
        (window as any).gtag('event', metric, {
          value: Math.round(metric === 'CLS' ? value * 1000 : value),
          event_category: 'Web Vitals',
          event_label: metric,
          non_interaction: true,
        });
      }
    });
  }
}

/**
 * Helper to get performance rating
 */
export function getPerformanceRating(metric: keyof WebVitals, value: number | null): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  if (value === null) return 'unknown';

  const thresholds = {
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    FCP: { good: 1800, poor: 3000 },
    TTFB: { good: 600, poor: 1800 },
    TTI: { good: 3800, poor: 7300 },
  };

  const threshold = thresholds[metric];
  if (!threshold) return 'unknown';

  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}
