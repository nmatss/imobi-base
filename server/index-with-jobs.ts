import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerESignatureRoutes } from "./routes-esignature";
import { registerWhatsAppRoutes } from "./routes-whatsapp";
import { registerComplianceRoutes } from "./compliance/routes-compliance";
import { registerEmailRoutes } from "./routes-email";
import { registerJobRoutes } from "./routes-jobs";
import { registerAuthenticationRoutes } from "./auth";
import { registerFileRoutes } from "./routes-files";
import { serveStatic } from "./static";
import { createServer } from "http";
import { initializeSentry, addSentryErrorHandler } from "./monitoring/sentry";
import { initializeRedis, closeRedis } from "./cache/redis-client";
import { initializeJobs, shutdownJobs } from "./jobs";
import { secretManager } from "./security/secret-manager";

const app = express();
const httpServer = createServer(app);

// Initialize and validate secrets FIRST (critical security)
// This will fail-fast in production if required secrets are missing or invalid
secretManager.initialize(process.env);

// Initialize Sentry (before any other middleware)
initializeSentry(app);

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
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize Redis first
  try {
    await initializeRedis();
    log('Redis initialized', 'redis');
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
    console.log('Continuing without Redis - background jobs will not be available');
  }

  // Initialize background job system
  try {
    await initializeJobs();
    log('Background jobs initialized', 'jobs');
  } catch (error) {
    console.error('Failed to initialize background jobs:', error);
    console.log('Continuing without background jobs');
  }

  await registerRoutes(httpServer, app);

  // Register e-signature routes
  registerESignatureRoutes(app);

  // Register WhatsApp routes
  registerWhatsAppRoutes(app);

  // Register compliance routes (LGPD/GDPR)
  registerComplianceRoutes(app);

  // Register email routes
  registerEmailRoutes(app);

  // Register job management routes
  registerJobRoutes(app);

  // Register authentication routes (password reset, OAuth, etc.)
  registerAuthenticationRoutes(app);

  // Register file upload routes
  registerFileRoutes(app);

  // Add Sentry error handler (must be before custom error handlers)
  addSentryErrorHandler(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Error handled:', err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down gracefully...`);

    // Stop accepting new connections
    httpServer.close(() => {
      console.log('HTTP server closed');
    });

    try {
      // Shutdown background jobs
      await shutdownJobs();
      log('Background jobs shut down', 'jobs');

      // Close Redis connection
      await closeRedis();
      log('Redis connection closed', 'redis');

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Listen for termination signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled rejection at:', promise, 'reason:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
})();
