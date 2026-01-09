/**
 * Analytics Integration
 *
 * Unified analytics interface for multiple providers:
 * - PostHog (Product Analytics, Feature Flags, Session Replay)
 * - Google Analytics 4 (Web Analytics)
 * - Web Vitals (Performance Monitoring)
 */

import posthog from "posthog-js";
import ReactGA from "react-ga4";

const isDevelopment = import.meta.env.DEV;

// Configuration
const POSTHOG_API_KEY = import.meta.env.VITE_POSTHOG_API_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;

interface AnalyticsUser {
  id: string;
  email?: string;
  name?: string;
  tenantId?: string;
  role?: string;
  [key: string]: any;
}

interface AnalyticsEvent {
  category?: string;
  action: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

/**
 * Initialize all analytics providers
 */
export function initializeAnalytics() {
  // PostHog
  if (POSTHOG_API_KEY && !isDevelopment) {
    posthog.init(POSTHOG_API_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      session_recording: {
        recordCrossOriginIframes: false,
        maskAllInputs: true,
        maskTextSelector: ".sensitive",
      },
      persistence: "localStorage",
      loaded: (ph) => {
        if (isDevelopment) {
          ph.opt_out_capturing();
        }
      },
    });
    console.log("✅ PostHog initialized");
  }

  // Google Analytics 4
  if (GA_MEASUREMENT_ID && !isDevelopment) {
    ReactGA.initialize(GA_MEASUREMENT_ID, {
      gaOptions: {
        anonymizeIp: true,
        cookieFlags: "SameSite=None;Secure",
      },
    });
    console.log("✅ Google Analytics initialized");
  }

  // Web Vitals (already initialized in main.tsx)
  console.log("✅ Analytics providers initialized");
}

/**
 * Identify user across all platforms
 */
export function identifyUser(user: AnalyticsUser) {
  if (isDevelopment) return;

  // PostHog
  if (POSTHOG_API_KEY) {
    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
      tenant_id: user.tenantId,
      role: user.role,
      ...user,
    });
  }

  // Google Analytics - Set user properties
  if (GA_MEASUREMENT_ID) {
    ReactGA.set({
      userId: user.id,
      user_properties: {
        tenant_id: user.tenantId,
        role: user.role,
      },
    });
  }
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (isDevelopment) return;

  // PostHog
  if (POSTHOG_API_KEY) {
    posthog.reset();
  }

  // Google Analytics
  if (GA_MEASUREMENT_ID) {
    ReactGA.set({ userId: null });
  }
}

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  if (isDevelopment) {
    console.log("📊 Page View:", path, title);
    return;
  }

  // PostHog
  if (POSTHOG_API_KEY) {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      path,
      title,
    });
  }

  // Google Analytics
  if (GA_MEASUREMENT_ID) {
    ReactGA.send({
      hitType: "pageview",
      page: path,
      title,
    });
  }
}

/**
 * Track custom event
 */
export function trackEvent(eventName: string, properties?: AnalyticsEvent) {
  if (isDevelopment) {
    console.log("📊 Event:", eventName, properties);
    return;
  }

  // PostHog
  if (POSTHOG_API_KEY) {
    posthog.capture(eventName, properties);
  }

  // Google Analytics
  if (GA_MEASUREMENT_ID && properties) {
    ReactGA.event({
      category: properties.category || "General",
      action: properties.action || eventName,
      label: properties.label,
      value: properties.value,
    });
  }
}

/**
 * Track feature usage
 */
export function trackFeature(featureName: string, action: string, metadata?: Record<string, any>) {
  trackEvent(`feature_${featureName}`, {
    category: "Feature Usage",
    action,
    feature: featureName,
    ...metadata,
  });
}

/**
 * Track conversion/goal
 */
export function trackConversion(goalName: string, value?: number, metadata?: Record<string, any>) {
  trackEvent(`conversion_${goalName}`, {
    category: "Conversion",
    action: goalName,
    value,
    ...metadata,
  });
}

/**
 * Track error
 */
export function trackError(error: Error, context?: Record<string, any>) {
  if (isDevelopment) {
    console.log("📊 Error tracked:", error.message, context);
    return;
  }

  // PostHog
  if (POSTHOG_API_KEY) {
    posthog.capture("error", {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    });
  }

  // Google Analytics
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      category: "Error",
      action: error.message,
      label: context?.page || window.location.pathname,
      nonInteraction: true,
    });
  }
}

/**
 * Track timing/performance
 */
export function trackTiming(
  category: string,
  variable: string,
  value: number,
  label?: string
) {
  if (isDevelopment) {
    console.log("📊 Timing:", category, variable, value, "ms");
    return;
  }

  // PostHog
  if (POSTHOG_API_KEY) {
    posthog.capture("timing", {
      category,
      variable,
      value,
      label,
    });
  }

  // Google Analytics
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      category: "Timing",
      action: variable,
      value: Math.round(value),
      label: label || category,
    });
  }
}

/**
 * Check if feature flag is enabled (PostHog)
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (isDevelopment || !POSTHOG_API_KEY) {
    return false;
  }

  return posthog.isFeatureEnabled(flagKey) || false;
}

/**
 * Get feature flag variant (PostHog)
 */
export function getFeatureFlag(flagKey: string): string | boolean {
  if (isDevelopment || !POSTHOG_API_KEY) {
    return false;
  }

  return posthog.getFeatureFlag(flagKey) || false;
}

/**
 * Track A/B test variant
 */
export function trackExperiment(experimentName: string, variant: string) {
  trackEvent("experiment_viewed", {
    category: "Experiment",
    action: "viewed",
    experiment_name: experimentName,
    variant,
  });
}

/**
 * Start session recording (PostHog)
 */
export function startRecording() {
  if (isDevelopment || !POSTHOG_API_KEY) return;
  posthog.startSessionRecording();
}

/**
 * Stop session recording (PostHog)
 */
export function stopRecording() {
  if (isDevelopment || !POSTHOG_API_KEY) return;
  posthog.stopSessionRecording();
}

/**
 * Track search
 */
export function trackSearch(query: string, resultsCount?: number) {
  trackEvent("search", {
    category: "Search",
    action: "query",
    label: query,
    value: resultsCount,
    search_query: query,
    results_count: resultsCount,
  });
}

/**
 * Track form submission
 */
export function trackFormSubmit(formName: string, success: boolean, errorMessage?: string) {
  trackEvent("form_submit", {
    category: "Form",
    action: success ? "submit_success" : "submit_error",
    label: formName,
    form_name: formName,
    success,
    error_message: errorMessage,
  });
}

/**
 * Track button click
 */
export function trackClick(elementName: string, location?: string) {
  trackEvent("click", {
    category: "UI Interaction",
    action: "click",
    label: elementName,
    element: elementName,
    location: location || window.location.pathname,
  });
}

/**
 * Track Web Vitals
 */
export function trackWebVital(
  metric: string,
  value: number,
  id: string,
  rating: "good" | "needs-improvement" | "poor"
) {
  if (isDevelopment) {
    console.log(`📊 Web Vital - ${metric}:`, value, rating);
    return;
  }

  // PostHog
  if (POSTHOG_API_KEY) {
    posthog.capture("web_vital", {
      metric,
      value: Math.round(value),
      id,
      rating,
    });
  }

  // Google Analytics
  if (GA_MEASUREMENT_ID) {
    ReactGA.event({
      category: "Web Vitals",
      action: metric,
      value: Math.round(value),
      label: rating,
      nonInteraction: true,
    });
  }
}

export default {
  initializeAnalytics,
  identifyUser,
  resetUser,
  trackPageView,
  trackEvent,
  trackFeature,
  trackConversion,
  trackError,
  trackTiming,
  isFeatureEnabled,
  getFeatureFlag,
  trackExperiment,
  startRecording,
  stopRecording,
  trackSearch,
  trackFormSubmit,
  trackClick,
  trackWebVital,
};
