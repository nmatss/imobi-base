module.exports = {
  ci: {
    collect: {
      // Start the preview server before running lighthouse
      startServerCommand: 'npm run preview',
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/login',
        'http://localhost:4173/dashboard',
        'http://localhost:4173/properties',
        'http://localhost:4173/leads',
      ],
      numberOfRuns: 3, // Run 3 times and take median
      settings: {
        // Throttling settings (mobile 4G)
        throttlingMethod: 'simulate',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        // Screen emulation
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 2.625,
        },
        // Skip certain audits that may not apply
        skipAudits: [
          'uses-http2',
          'canonical',
        ],
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance metrics
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.90 }],
        'categories:best-practices': ['error', { minScore: 0.90 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
        'categories:pwa': 'off', // PWA is optional

        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3400 }],

        // Resource optimization
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        'uses-optimized-images': ['warn', { maxNumericValue: 100000 }],
        'modern-image-formats': 'off', // Can be enabled when image optimization is ready
        'offscreen-images': 'warn',
        'render-blocking-resources': 'warn',
        'unminified-css': 'error',
        'unminified-javascript': 'error',

        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'valid-lang': 'error',
        'html-has-lang': 'error',

        // Best practices
        'errors-in-console': 'warn',
        'no-vulnerable-libraries': 'error',
        'js-libraries': 'off',
      },
    },
    upload: {
      // Upload results to temporary public storage (optional)
      target: 'temporary-public-storage',
    },
  },
};
