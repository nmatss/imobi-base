/**
 * Zod Validation Middleware
 * Type-safe request validation for Express routes
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from './error-handler';

/**
 * Validates request body against a Zod schema
 * @param schema Zod schema to validate against
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Invalid request body', error.issues));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates query parameters against a Zod schema
 * @param schema Zod schema to validate against
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Invalid query parameters', error.issues));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates route parameters against a Zod schema
 * @param schema Zod schema to validate against
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Invalid route parameters', error.issues));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Validates request headers against a Zod schema
 * @param schema Zod schema to validate against
 */
export function validateHeaders<T>(schema: ZodSchema<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.headers = await schema.parseAsync(req.headers) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError('Invalid request headers', error.issues));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Type-safe request with validated body
 */
export interface ValidatedRequest<TBody = any, TQuery = any, TParams = any> extends Request {
  body: TBody;
  query: TQuery & any;
  params: TParams & any;
}
