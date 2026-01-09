/**
 * Authentication Routes Index
 * Centralized registration of all authentication routes
 */

import type { Express } from "express";
import { registerPasswordResetRoutes } from "./password-reset";
import { registerEmailVerificationRoutes } from "./email-verification";
import { registerGoogleOAuthRoutes } from "./oauth-google";
import { registerMicrosoftOAuthRoutes } from "./oauth-microsoft";
import { registerOAuthLinkingRoutes } from "./oauth-linking";
import { registerSessionManagementRoutes, startSessionCleanupJob } from "./session-manager";
import { registerSecurityRoutes } from "./security";

export function registerAuthenticationRoutes(app: Express): void {
  console.log("Registering authentication routes...");

  // Password Reset
  registerPasswordResetRoutes(app);

  // Email Verification
  registerEmailVerificationRoutes(app);

  // OAuth Providers
  registerGoogleOAuthRoutes(app);
  registerMicrosoftOAuthRoutes(app);

  // OAuth Account Linking
  registerOAuthLinkingRoutes(app);

  // Session Management
  registerSessionManagementRoutes(app);

  // Account Security
  registerSecurityRoutes(app);

  // Start background jobs
  startSessionCleanupJob();

  console.log("Authentication routes registered successfully");
}

// Export individual functions for selective use
export {
  registerPasswordResetRoutes,
  registerEmailVerificationRoutes,
  registerGoogleOAuthRoutes,
  registerMicrosoftOAuthRoutes,
  registerOAuthLinkingRoutes,
  registerSessionManagementRoutes,
  registerSecurityRoutes,
};

// Export helper functions
export { validatePasswordStrength, checkPasswordHistory } from "./security";
export { createSession, validateSession, updateSessionActivity } from "./session-manager";
export { sendVerificationTokenToUser } from "./email-verification";
export * from "./email-service";
