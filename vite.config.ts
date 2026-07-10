import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { metaImagesPlugin } from "./vite-plugin-meta-images";
import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      jsxRuntime: "automatic",
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
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "brand/favicon.svg"],
      manifest: {
        name: "ImobiBase — Gestão Imobiliária Inteligente",
        short_name: "ImobiBase",
        description:
          "Sistema completo para gestão de imobiliárias: CRM, imóveis, financeiro e site público.",
        lang: "pt-BR",
        theme_color: "#0066CC",
        background_color: "#F9FAFB",
        display: "standalone",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
        ],
      },
    }),
    // Sentry plugin - Upload source maps in production
    mode === "production" &&
      process.env.SENTRY_AUTH_TOKEN &&
      sentryVitePlugin({
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
  ].filter(Boolean) as import("vite").PluginOption[],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: mode === "production" ? "hidden" : true, // Hidden source maps for production (Sentry only)
    minify: "esbuild",
    // Target modern browsers for smaller bundles
    target: "es2020",
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimized manual chunks for better code splitting.
        // Forma de função (não objeto) para capturar submódulos CJS como
        // lodash/isArray — o formato objeto só move o entry do pacote.
        manualChunks(id: string) {
          // Helper virtual de interop CJS do Rollup: compartilhado por todos
          // os chunks vendor; sem destino fixo ele "ancora" num chunk pesado
          // (charts/maps) e o torna dependência estática da entry.
          if (id.includes("commonjsHelpers") || id.includes("commonjs-dynamic-modules")) {
            return "vendor-shared";
          }
          if (!id.includes("node_modules")) return undefined;

          const pkg = (name: string) => id.includes(`node_modules/${name}/`);

          // Deps compartilhadas entre react-helmet (eager) e recharts (lazy).
          // Sem este chunk o Rollup as embute em vendor-charts, fazendo a
          // entry pré-carregar ~514 kB de charts em toda página pública.
          if (
            pkg("prop-types") ||
            pkg("react-is") ||
            pkg("lodash") ||
            pkg("tiny-invariant") ||
            pkg("fast-equals") ||
            pkg("eventemitter3")
          ) {
            return "vendor-shared";
          }

          // Charts and visualizations (+ deps exclusivas d3-*)
          if (pkg("recharts") || id.includes("node_modules/d3-")) {
            return "vendor-charts";
          }

          // Core React libraries
          if (pkg("react") || pkg("react-dom") || pkg("scheduler") || pkg("wouter")) {
            return "vendor-react";
          }

          // UI Component libraries (Radix)
          if (pkg("@radix-ui/react-dialog") || pkg("@radix-ui/react-alert-dialog")) {
            return "vendor-ui-dialog";
          }
          // Radix overlay primitives depend on each other through shared focus,
          // collection and popper internals. Keep them together to avoid circular
          // manual chunks in production builds.
          if (
            pkg("@radix-ui/react-dropdown-menu") ||
            pkg("@radix-ui/react-select") ||
            pkg("@radix-ui/react-menubar") ||
            pkg("@radix-ui/react-tooltip") ||
            pkg("@radix-ui/react-popover") ||
            pkg("@radix-ui/react-tabs") ||
            pkg("@radix-ui/react-accordion")
          ) {
            return "vendor-ui-overlays";
          }
          if (
            pkg("@radix-ui/react-checkbox") ||
            pkg("@radix-ui/react-radio-group") ||
            pkg("@radix-ui/react-switch") ||
            pkg("@radix-ui/react-slider")
          ) {
            return "vendor-ui-forms";
          }

          // Forms and validation
          if (pkg("react-hook-form") || pkg("@hookform/resolvers") || pkg("zod")) {
            return "vendor-forms";
          }

          // Date utilities
          if (pkg("date-fns") || pkg("react-day-picker")) {
            return "vendor-date";
          }

          // Maps
          if (pkg("leaflet") || pkg("react-leaflet")) {
            return "vendor-maps";
          }

          // Query and state
          if (pkg("@tanstack/react-query")) {
            return "vendor-query";
          }

          // Icons
          if (pkg("lucide-react")) {
            return "vendor-icons";
          }

          // Utilities
          if (pkg("clsx") || pkg("tailwind-merge") || pkg("class-variance-authority")) {
            return "vendor-utils";
          }

          return undefined;
        },
        // Better file naming for cache optimization
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          // Prevent source files from being copied to build
          const extType = assetInfo.name?.split(".").pop() || "";
          if (extType === "tsx" || extType === "ts" || extType === "jsx") {
            throw new Error(
              `Source file ${assetInfo.name} should not be treated as asset`,
            );
          }

          // Organize assets by type for better caching
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/i.test(assetInfo.name || "")) {
            return "assets/img/[name]-[hash][extname]";
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || "")) {
            return "assets/fonts/[name]-[hash][extname]";
          }
          return "assets/[name]-[hash][extname]";
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
    include: ["react", "react-dom", "wouter", "@tanstack/react-query"],
  },
}));
