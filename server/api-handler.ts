import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerESignatureRoutes } from "./routes-esignature";
import { registerWhatsAppRoutes } from "./routes-whatsapp";
import { registerComplianceRoutes } from "./compliance/routes-compliance";
import { registerEmailRoutes } from "./routes-email";
import { registerJobRoutes } from "./routes-jobs";
import { registerAuthenticationRoutes } from "./auth";
import { registerFileRoutes } from "./routes-files";
import { registerSitemapRoutes } from "./routes-sitemap";
import { registerAutoMarketingRoutes } from "./routes-auto-marketing";
import { registerAVMRoutes as registerAvmRoutes } from "./routes-avm";
import { registerIsaRoutes } from "./routes-isa";
import { registerInspectionRoutes } from "./routes-inspections";
import { registerPortalRoutes } from "./routes-portal";
import { registerExtensionRoutes } from "./routes-extensions";
import { registerDocsRoutes } from "./routes-docs";
import { createServer } from "http";
import { initializeSentry, addSentryErrorHandler } from "./monitoring/sentry";
import { initializeRedis } from "./cache/redis-client";
import { sanitizeResponse, shouldSkipDetailedLogging } from "./utils/log-sanitizer";
import { secretManager } from "./security/secret-manager";

const app = express();
const httpServer = createServer(app);

// Initialize and validate secrets FIRST (critical security)
secretManager.initialize(process.env);

// Initialize Sentry (before any other middleware)
initializeSentry(app);

// Initialize Redis with graceful degradation for serverless
try {
  initializeRedis();
} catch (err) {
  console.warn("Redis initialization failed (expected in serverless):", err);
}

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Security headers
const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

app.use((_req, res, next) => {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  next();
});

// CORS for Vercel
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
  const origin = req.headers.origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : '';
  if (corsOrigin) {
    res.setHeader("Access-Control-Allow-Origin", corsOrigin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  next();
});

// Request logging middleware
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      // Only log response details for non-sensitive endpoints
      if (capturedJsonResponse && !shouldSkipDetailedLogging(path)) {
        const sanitized = sanitizeResponse(capturedJsonResponse, 500);
        logLine += ` :: ${sanitized}`;
      }

      log(logLine);
    }
  });

  next();
});

// Register all routes
(async () => {
  await registerRoutes(httpServer, app);

  // Register e-signature routes
  registerESignatureRoutes(app);

  // Register WhatsApp routes
  registerWhatsAppRoutes(app);

  // Register compliance routes (LGPD/GDPR)
  registerComplianceRoutes(app);

  // Register email routes
  registerEmailRoutes(app);

  // Register job routes (API-only, no BullMQ workers)
  registerJobRoutes(app);

  // Register authentication routes (password reset, OAuth, etc.)
  registerAuthenticationRoutes(app);

  // Register file upload routes
  registerFileRoutes(app);

  // Register sitemap routes (SEO)
  registerSitemapRoutes(app);

  // Register auto-marketing routes (AI content generation)
  registerAutoMarketingRoutes(app);

  // Register AVM routes (property valuation)
  registerAvmRoutes(app);

  // Register ISA routes (virtual sales agent)
  registerIsaRoutes(app);

  // Register inspection routes (vistoria digital)
  registerInspectionRoutes(app);

  // Register portal routes (owner/renter self-service)
  registerPortalRoutes(app);

  // Register extension routes (settings, roles, permissions, integrations)
  registerExtensionRoutes(app);

  // Register API docs routes (OpenAPI/Swagger)
  registerDocsRoutes(app);

  // Add Sentry error handler (must be before custom error handlers)
  addSentryErrorHandler(app);

  app.use((err: Error & { status?: number; statusCode?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error handled:', err);
    res.status(status).json({ message });
  });
})();

// Debug: catch startup errors and expose them
let startupError: Error | null = null;

const handler = (req: Request, res: Response, next: NextFunction) => {
  if (startupError) {
    res.status(500).json({
      error: 'Startup failed',
      message: startupError.message,
      stack: startupError.stack?.split('\n').slice(0, 5),
    });
    return;
  }
  app(req, res, next);
};

// Wrap the async init to capture errors
process.on('unhandledRejection', (reason: any) => {
  startupError = reason instanceof Error ? reason : new Error(String(reason));
  console.error('Unhandled rejection during startup:', reason);
});

export default handler;
