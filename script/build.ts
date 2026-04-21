import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile } from "fs/promises";
import { generateSitemap } from "../scripts/generate-sitemap";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("generating sitemap.xml...");
  await generateSitemap();

  console.log("building client...");
  await viteBuild();

  // Skip standalone server build on Vercel (not needed for serverless)
  if (!process.env.VERCEL) {
    console.log("building server...");
    const pkg = JSON.parse(await readFile("package.json", "utf-8"));
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    const externals = allDeps.filter((dep) => !allowlist.includes(dep));

    await esbuild({
      entryPoints: ["server/index.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/index.cjs",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      minify: true,
      external: externals,
      logLevel: "info",
    });
  }

  console.log("building serverless function...");
  // Only exclude truly native addons (C++ bindings) that can't be bundled
  const nativeOnly = [
    "better-sqlite3", "bufferutil", "utf-8-validate", "cpu-features", "ssh2",
    "@sentry/profiling-node", "@sentry-internal/node-cpu-profiler",
    "canvas",
  ];
  await esbuild({
    entryPoints: ["server/api-handler.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "api/_handler.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: nativeOnly,
    logLevel: "info",
    banner: {
      js: 'import { createRequire as __createRequire } from "module"; const require = __createRequire(import.meta.url);',
    },
  });

  // Write wrapper that lazy-loads handler on first request (no top-level await)
  await writeFile("api/index.mjs", `
let app = null;
let initPromise = null;

async function ensureApp() {
  if (app) return app;
  if (!initPromise) {
    initPromise = import('./_handler.mjs').then(mod => {
      app = mod.default;
      return app;
    });
  }
  return initPromise;
}

export default async function handler(req, res) {
  try {
    const appHandler = await ensureApp();
    appHandler(req, res);
  } catch (e) {
    console.error('HANDLER ERROR:', e.message, e.stack);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Handler failed',
      message: e.message,
      stack: e.stack?.split('\\n').slice(0, 10),
    }));
  }
}
`.trim());
  console.log("  api/index.mjs wrapper created");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
