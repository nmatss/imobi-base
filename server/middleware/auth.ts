/**
 * Authentication Middleware
 * Provides authentication and authorization checks for protected routes
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Require authentication middleware
 * Ensures the user is authenticated before accessing protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !req.user) {
    console.log('Authentication failed:', {
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      path: req.path,
      method: req.method,
    });
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  // Ensure user has tenantId for multi-tenancy
  if (!req.user.tenantId) {
    console.warn('User authenticated but missing tenantId:', req.user);
    return res.status(403).json({
      error: 'Invalid user session',
      code: 'INVALID_SESSION'
    });
  }

  next();
}

/**
 * Require admin role middleware
 * Ensures the user has admin privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    console.log('Authorization failed - Admin required:', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
    });
    return res.status(403).json({
      error: 'Admin privileges required',
      code: 'FORBIDDEN'
    });
  }

  next();
}

/**
 * Require super admin role middleware
 * Ensures the user has super admin privileges
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== 'super_admin') {
    console.log('Authorization failed - Super Admin required:', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
    });
    return res.status(403).json({
      error: 'Super admin privileges required',
      code: 'FORBIDDEN'
    });
  }

  next();
}
