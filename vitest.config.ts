import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SENTRY_DSN": JSON.stringify(
      "https://test@sentry.io/123456",
    ),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    // Only run unit and integration tests (*.test.ts, *.test.tsx)
    // Exclude Playwright e2e tests (*.spec.ts)
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules",
      "**/node_modules/**",
      ".claude/**",
      "dist",
      "build",
      ".next",
      // Exclude all Playwright test files
      "**/*.spec.ts",
      "tests/e2e/**",
      "tests/accessibility/**",
      "tests/mobile/**",
      "tests/responsive/**",
      "tests/performance/**",
      "tests/visual/**",
      // Exclude smoke tests from default run (require running server)
      "tests/smoke/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      exclude: [
        "node_modules/",
        "dist/",
        "build/",
        "tests/",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "**/*.config.{ts,js}",
        "**/vite.ts",
        "**/static.ts",
        "script/**",
        "**/*.stories.tsx",
        "**/examples/**",
        "**/__tests__/**",
      ],
      // Ratchet — subir conforme cobertura cresce. Medido em 2026-06-10:
      // statements 9.66% | branches 6.93% | functions 7.45% | lines 10.04%.
      // Thresholds ~5 pontos abaixo do real para impedir regressão sem teatro.
      thresholds: {
        statements: 5,
        branches: 2,
        functions: 2,
        lines: 5,
      },
      all: true,
      include: ["client/src/**/*.{ts,tsx}", "server/**/*.ts"],
    },
    // Folga para starvation de worker em runs paralelos (WSL2/CI); os testes
    // em si são rápidos — timeout alto só evita flake sob contenção de CPU.
    // Em CI, 1 retry absorve o timeout esporádico por starvation (mesma
    // política do Playwright, que usa retries em CI). Local: sem retry,
    // para flakes ficarem visíveis durante o desenvolvimento.
    retry: process.env.CI ? 1 : 0,
    testTimeout: 20000,
    hookTimeout: 20000,
    teardownTimeout: 5000,
    isolate: true,
    pool: "threads",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server"),
      "@db": path.resolve(__dirname, "./db"),
    },
  },
});
