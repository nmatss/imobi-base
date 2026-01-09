import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    metaImagesPlugin(),
    // Bundle analyzer - generates stats.html
    visualizer({
      filename: path.resolve(import.meta.dirname, "dist/stats.html"),
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: "treemap", // 'sunburst', 'treemap', 'network', 'raw-data', 'list'
    }),
    // PWA Support - DISABLED TEMPORARILY FOR DEBUGGING
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['favicon.ico'],
    //   manifest: {
    //     name: 'ImobiBase',
    //     short_name: 'ImobiBase',
    //     description: 'Sistema de gestão imobiliária completo',
    //     theme_color: '#1E7BE8',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     icons: [
    //       {
    //         src: '/favicon.ico',
    //         sizes: 'any',
    //         type: 'image/x-icon',
    //       },
    //     ],
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/api\./,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'api-cache',
    //           expiration: {
    //             maxEntries: 100,
    //             maxAgeSeconds: 60 * 60, // 1 hour
    //           },
    //         },
    //       },
    //     ],
    //   },
    // }),
    // Sentry plugin - Upload source maps in production
    mode === 'production' && process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
      sourcemaps: {
        assets: "./dist/public/assets/**",
        filesToDeleteAfterUpload: "./dist/public/assets/**/*.map",
      },
      release: {
        name: process.env.VERCEL_GIT_COMMIT_SHA || `release-${Date.now()}`,
        deploy: {
          env: mode,
        },
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: mode === 'production' ? 'hidden' : true, // Hidden source maps for production (Sentry only)
    minify: "esbuild",
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimized manual chunks for better code splitting
        manualChunks: {
          // Core React libraries
          'vendor-react': ['react', 'react-dom', 'wouter'],

          // UI Component libraries (Radix)
          'vendor-ui-dialog': ['@radix-ui/react-dialog', '@radix-ui/react-alert-dialog'],
          'vendor-ui-dropdown': ['@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-menubar'],
          'vendor-ui-forms': ['@radix-ui/react-checkbox', '@radix-ui/react-radio-group', '@radix-ui/react-switch', '@radix-ui/react-slider'],
          'vendor-ui-misc': ['@radix-ui/react-tooltip', '@radix-ui/react-popover', '@radix-ui/react-tabs', '@radix-ui/react-accordion'],

          // Charts and visualizations
          'vendor-charts': ['recharts'],

          // Forms and validation
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Date utilities
          'vendor-date': ['date-fns', 'react-day-picker'],

          // Maps
          'vendor-maps': ['leaflet', 'react-leaflet'],

          // Query and state
          'vendor-query': ['@tanstack/react-query'],

          // Icons
          'vendor-icons': ['lucide-react'],

          // Utilities
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
        // Better file naming for cache optimization
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Prevent source files from being copied to build
          const extType = assetInfo.name?.split('.').pop() || '';
          if (extType === 'tsx' || extType === 'ts' || extType === 'jsx') {
            throw new Error(`Source file ${assetInfo.name} should not be treated as asset`);
          }

          // Organize assets by type for better caching
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/i.test(assetInfo.name || '')) {
            return 'assets/img/[name]-[hash][extname]';
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wouter',
      '@tanstack/react-query',
    ],
  },
}));
