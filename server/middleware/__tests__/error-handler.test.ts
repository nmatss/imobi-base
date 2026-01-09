import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  AppError,
  ValidationError,
  AuthError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  ServiceUnavailableError,
  BadRequestError,
  errorHandler,
  asyncHandler,
  notFoundHandler,
} from '../error-handler';

// Mock Sentry
vi.mock('@sentry/node', () => ({
  captureException: vi.fn(),
}));

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonSpy = vi.fn();
    statusSpy = vi.fn(() => ({ json: jsonSpy }));

    mockReq = {
      url: '/api/test',
      method: 'GET',
      path: '/api/test',
      ip: '127.0.0.1',
      body: {},
      query: {},
      params: {},
    };

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    };

    mockNext = vi.fn();
  });

  describe('Error Classes', () => {
    it('should create AppError with correct properties', () => {
      const error = new AppError('Test error', 500, true);

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create ValidationError with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should create AuthError with 401 status', () => {
      const error = new AuthError();

      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Authentication required');
    });

    it('should create ForbiddenError with 403 status', () => {
      const error = new ForbiddenError();

      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Access forbidden');
    });

    it('should create NotFoundError with 404 status', () => {
      const error = new NotFoundError('User');

      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
    });

    it('should create ConflictError with 409 status', () => {
      const error = new ConflictError();

      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
    });

    it('should create RateLimitError with 429 status', () => {
      const error = new RateLimitError();

      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests');
    });

    it('should create InternalError with 500 status', () => {
      const error = new InternalError();

      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
    });

    it('should create ServiceUnavailableError with 503 status', () => {
      const error = new ServiceUnavailableError();

      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service temporarily unavailable');
    });

    it('should create BadRequestError with 400 status', () => {
      const error = new BadRequestError();

      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Bad request');
    });
  });

  describe('errorHandler', () => {
    it('should handle AppError correctly', () => {
      const error = new NotFoundError('Property');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Property not found',
          statusCode: 404,
        })
      );
    });

    it('should handle ValidationError with errors array', () => {
      const zodErrors = [
        { path: ['name'], message: 'Name is required', code: 'invalid_type' },
        { path: ['email'], message: 'Invalid email', code: 'invalid_string' },
      ] as any;

      const error = new ValidationError('Validation failed', zodErrors);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          statusCode: 400,
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: 'name',
              message: 'Name is required',
            }),
          ]),
        })
      );
    });

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unknown error',
          statusCode: 500,
        })
      );
    });

    it('should hide error details in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal database error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(jsonSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'An unexpected error occurred',
          statusCode: 500,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      const response = jsonSpy.mock.calls[0][0];
      expect(response).toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('asyncHandler', () => {
    it('should handle successful async function', async () => {
      const asyncFn = vi.fn(async (req: Request, res: Response) => {
        res.json({ success: true });
      });

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should catch and forward errors to next', async () => {
      const error = new Error('Async error');
      const asyncFn = vi.fn(async () => {
        throw error;
      });

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle rejected promises', async () => {
      const error = new Error('Promise rejection');
      const asyncFn = vi.fn(() => Promise.reject(error));

      const wrappedFn = asyncHandler(asyncFn);
      await wrappedFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('notFoundHandler', () => {
    it('should create NotFoundError with route info', () => {
      notFoundHandler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route GET /api/test not found',
          statusCode: 404,
        })
      );
    });
  });
});
