import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";
import React from "react";

// Import monitoring and analytics
import { initializeSentryClient } from "./lib/monitoring/sentry-client";
import { initializeAnalytics, trackWebVital } from "./lib/analytics";

// Initialize Sentry BEFORE rendering the app
initializeSentryClient();

// Initialize Analytics
initializeAnalytics();

// Web Vitals monitoring
if (import.meta.env.PROD) {
  import('web-vitals').then(({ onCLS, onFCP, onLCP, onTTFB, onINP }) => {
    const sendToAnalytics = ({ name, value, id, rating }: { name: string; value: number; id: string; rating: 'good' | 'needs-improvement' | 'poor' }) => {
      // Log to console in production
      console.log(`[Web Vital] ${name}:`, {
        value: Math.round(name === 'CLS' ? value * 1000 : value),
        id,
        rating,
      });

      // Track in analytics
      trackWebVital(name, value, id, rating);

      // Send to analytics endpoint (if configured)
      if (window.location.hostname !== 'localhost') {
        fetch('/api/analytics/vitals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, value, id, rating }),
          keepalive: true,
        }).catch(() => {
          // Silently fail - analytics shouldn't break the app
        });
      }
    };

    // Core Web Vitals
    onCLS(sendToAnalytics);  // Cumulative Layout Shift
    onINP(sendToAnalytics);  // Interaction to Next Paint (replaces FID)
    onLCP(sendToAnalytics);  // Largest Contentful Paint

    // Other important metrics
    onFCP(sendToAnalytics);  // First Contentful Paint
    onTTFB(sendToAnalytics); // Time to First Byte
  });
}

// Accessibility validation in development
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, createRoot as typeof createRoot, 1000, {
      rules: [
        { id: 'color-contrast', enabled: true },
        { id: 'label', enabled: true },
        { id: 'button-name', enabled: true },
        { id: 'link-name', enabled: true },
        { id: 'aria-roles', enabled: true },
        { id: 'aria-valid-attr', enabled: true },
        { id: 'image-alt', enabled: true },
        { id: 'landmark-one-main', enabled: true },
      ],
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
