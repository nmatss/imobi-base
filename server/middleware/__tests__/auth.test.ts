import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requireAuth, requireAdmin, requireSuperAdmin } from '../auth';

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn(() => ({ json: jsonSpy }));

    mockReq = {
      isAuthenticated: vi.fn(),
      user: undefined,
      path: '/api/test',
      method: 'GET',
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();
  });

  describe('requireAuth', () => {
    it('should allow authenticated user with tenantId', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        tenantId: 'tenant-123',
        role: 'user',
      } as any;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      mockReq.isAuthenticated = vi.fn(() => false);

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject authenticated user without tenantId', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        role: 'user',
      } as any;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Invalid user session',
        code: 'INVALID_SESSION',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if user object is missing', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = undefined;

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin user', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        tenantId: 'tenant-123',
        role: 'admin',
      } as any;

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should allow super_admin user', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        tenantId: 'tenant-123',
        role: 'super_admin',
      } as any;

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should reject regular user', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        tenantId: 'tenant-123',
        role: 'user',
      } as any;

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Admin privileges required',
        code: 'FORBIDDEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      mockReq.isAuthenticated = vi.fn(() => false);

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow super_admin user', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        tenantId: 'tenant-123',
        role: 'super_admin',
      } as any;

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should reject admin user', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        tenantId: 'tenant-123',
        role: 'admin',
      } as any;

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'Super admin privileges required',
        code: 'FORBIDDEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject regular user', () => {
      mockReq.isAuthenticated = vi.fn(() => true);
      mockReq.user = {
        id: 1,
        tenantId: 'tenant-123',
        role: 'user',
      } as any;

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
      mockReq.isAuthenticated = vi.fn(() => false);

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
