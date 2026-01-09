/**
 * Analytics Hook
 *
 * React hook for tracking analytics events, page views, and user behavior
 */

import { useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  trackPageView,
  trackEvent,
  trackFeature,
  trackConversion,
  trackSearch,
  trackFormSubmit,
  trackClick,
  identifyUser,
  resetUser,
} from "@/lib/analytics";

/**
 * Automatically track page views on route changes
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    trackPageView(location.pathname, document.title);
  }, [location]);
}

/**
 * Hook for tracking custom events
 */
export function useAnalytics() {
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, {
      action: eventName,
      ...properties,
    });
  }, []);

  const trackFeatureUsage = useCallback((featureName: string, action: string, metadata?: Record<string, any>) => {
    trackFeature(featureName, action, metadata);
  }, []);

  const trackGoal = useCallback((goalName: string, value?: number, metadata?: Record<string, any>) => {
    trackConversion(goalName, value, metadata);
  }, []);

  const trackSearchQuery = useCallback((query: string, resultsCount?: number) => {
    trackSearch(query, resultsCount);
  }, []);

  const trackForm = useCallback((formName: string, success: boolean, errorMessage?: string) => {
    trackFormSubmit(formName, success, errorMessage);
  }, []);

  const trackButtonClick = useCallback((elementName: string, location?: string) => {
    trackClick(elementName, location);
  }, []);

  const identify = useCallback((user: {
    id: string;
    email?: string;
    name?: string;
    tenantId?: string;
    role?: string;
  }) => {
    identifyUser(user);
  }, []);

  const reset = useCallback(() => {
    resetUser();
  }, []);

  return {
    track,
    trackFeatureUsage,
    trackGoal,
    trackSearchQuery,
    trackForm,
    trackButtonClick,
    identify,
    reset,
  };
}

/**
 * Hook for tracking component visibility (impressions)
 */
export function useImpressionTracking(
  elementName: string,
  metadata?: Record<string, any>
) {
  useEffect(() => {
    trackEvent("impression", {
      category: "UI Interaction",
      action: "viewed",
      label: elementName,
      element: elementName,
      ...metadata,
    });
  }, [elementName, metadata]);
}

/**
 * Hook for tracking time spent on page
 */
export function useTimeTracking(pageName: string) {
  useEffect(() => {
    const startTime = Date.now();

    return () => {
      const timeSpent = Date.now() - startTime;
      trackEvent("time_on_page", {
        category: "Engagement",
        action: "time_spent",
        label: pageName,
        value: Math.round(timeSpent / 1000), // in seconds
        page: pageName,
        time_ms: timeSpent,
      });
    };
  }, [pageName]);
}

export default useAnalytics;
