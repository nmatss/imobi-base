import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
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
import { captureException } from "./monitoring/sentry";
import { getCorsOrigins, isCorsOriginAllowed } from "./config/cors";

const app = express();
const httpServer = createServer(app);

// Initialize and validate secrets FIRST (critical security)
secretManager.initialize(process.env);

// Initialize Sentry (before any other middleware)
initializeSentry(app);

// Initialize Redis with graceful degradation for serverless.
// IMPORTANTE: initializeRedis é ASYNC — um try/catch síncrono NÃO captura a
// rejeição do `await ping()` interno; ela viraria unhandledRejection e
// envenenaria a instância via startupError. Tratamos a promise explicitamente:
// sem Redis o app segue normalmente (cache/rate-limit degradam para memória).
initializeRedis().catch((err) => {
  console.warn(
    "Redis indisponível — seguindo sem Redis (degradação graciosa):",
    err instanceof Error ? err.message : err,
  );
});

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
app.use(cookieParser());

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
  const origin = req.headers.origin;
  const allowedOrigins = getCorsOrigins();
  if (isCorsOriginAllowed(origin, allowedOrigins) && origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
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

// Register all routes. Exposed as a readiness promise so the serverless handler
// can `await` it before dispatching the first request (avoids a cold-start race
// where the handler is exported and serves traffic before routes are mounted).
const appReadyPromise: Promise<void> = (async () => {
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

  app.use((err: Error & { status?: number; statusCode?: number }, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === "production";

    // Always log full error server-side / to Sentry.
    console.error('Error handled:', err);
    captureException(err, { path: req.path, method: req.method, status });

    // Never leak internal error details (message/stack) for 5xx in production.
    // 4xx messages are intentional and safe to surface.
    if (status >= 500 && isProduction) {
      res.status(status).json({ message: "Internal Server Error" });
      return;
    }

    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
})();

// Capture a fatal startup error so the handler can fail closed without leaking
// the stack trace to clients.
let startupError: Error | null = null;
// Flag de prontidão: depois que o app fica pronto, rejeições tardias NÃO podem
// mais envenenar a instância warm (ver handler de unhandledRejection abaixo).
let appReady = false;
appReadyPromise
  .then(() => {
    appReady = true;
  })
  .catch((err) => {
    startupError = err instanceof Error ? err : new Error(String(err));
    console.error('Startup failed during route registration:', err);
  });

const handler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Block until routes are registered (cold-start race fix).
    await appReadyPromise;
  } catch {
    // Swallow here; handled via startupError below.
  }

  if (startupError) {
    captureException(startupError, { phase: 'startup' });
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json(
      isProduction
        ? { message: "Service temporarily unavailable" }
        : {
            error: 'Startup failed',
            message: startupError.message,
            stack: startupError.stack?.split('\n').slice(0, 5),
          },
    );
    return;
  }

  app(req, res, next);
};

// Captura rejeições tardias de STARTUP apenas. Depois que o app está pronto,
// uma rejeição avulsa (ex.: ping de Redis, job em background) NÃO pode setar
// startupError — isso envenenaria permanentemente a instância warm, fazendo o
// handler responder 500 a TODAS as requests seguintes. Pós-ready: só log+Sentry.
process.on('unhandledRejection', (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  if (!appReady) {
    startupError = err;
    console.error('Unhandled rejection during startup:', reason);
    return;
  }
  console.error('Unhandled rejection (instância warm, não fatal):', reason);
  captureException(err, { phase: 'runtime-unhandled-rejection' });
});

export { appReadyPromise };
export default handler;
