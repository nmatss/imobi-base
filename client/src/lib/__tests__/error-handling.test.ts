import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ErrorType,
  categorizeError,
  getOperationErrorMessage,
  errorLogger,
  withErrorHandling,
  isRecoverableError,
  requiresReAuthentication,
  extractErrorMessage,
  type ErrorDetails,
} from '../error-handling';

describe('Error Handling', () => {
  beforeEach(() => {
    errorLogger.clearLogs();
  });

  describe('categorizeError', () => {
    it('should categorize network errors', () => {
      const error = new Error('Failed to fetch');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.userMessage).toContain('conexão');
      expect(result.originalError).toBe(error);
    });

    it('should categorize timeout errors as network', () => {
      const error = new Error('Request timeout');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.NETWORK);
    });

    it('should categorize authentication errors', () => {
      const error = new Error('401 unauthorized');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.AUTHENTICATION);
      expect(result.statusCode).toBe(401);
      expect(result.userMessage).toContain('sessão');
    });

    it('should categorize authorization errors', () => {
      const error = new Error('403 forbidden');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.AUTHORIZATION);
      expect(result.statusCode).toBe(403);
      expect(result.userMessage).toContain('permissão');
    });

    it('should categorize not found errors', () => {
      const error = new Error('404 not found');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.NOT_FOUND);
      expect(result.statusCode).toBe(404);
    });

    it('should categorize validation errors', () => {
      const error = new Error('Validation failed: email is required');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.statusCode).toBe(400);
    });

    it('should categorize server errors', () => {
      const error = new Error('500 internal server error');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.SERVER);
      expect(result.statusCode).toBe(500);
    });

    it('should categorize unknown errors', () => {
      const error = new Error('Something went wrong');
      const result = categorizeError(error);

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.userMessage).toContain('inesperado');
    });

    it('should handle string errors', () => {
      const result = categorizeError('Error message');

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Error message');
      expect(result.userMessage).toBe('Error message');
    });

    it('should handle non-error objects', () => {
      const result = categorizeError({ foo: 'bar' });

      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.message).toBe('Unknown error');
    });

    it('should include timestamp', () => {
      const before = new Date();
      const result = categorizeError(new Error('test'));
      const after = new Date();

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('getOperationErrorMessage', () => {
    it('should return custom message if provided', () => {
      const message = getOperationErrorMessage('create', ErrorType.NETWORK, 'Custom error');

      expect(message).toBe('Custom error');
    });

    it('should return appropriate message for create operation', () => {
      const message = getOperationErrorMessage('create', ErrorType.VALIDATION);

      expect(message).toContain('inválidos');
    });

    it('should return appropriate message for update operation', () => {
      const message = getOperationErrorMessage('update', ErrorType.NOT_FOUND);

      expect(message).toContain('não encontrado');
    });

    it('should return appropriate message for delete operation', () => {
      const message = getOperationErrorMessage('delete', ErrorType.AUTHORIZATION);

      expect(message).toContain('permissão');
    });

    it('should return appropriate message for fetch operation', () => {
      const message = getOperationErrorMessage('fetch', ErrorType.SERVER);

      expect(message).toContain('servidor');
    });
  });

  describe('errorLogger', () => {
    it('should log errors', () => {
      const error = new Error('Test error');
      errorLogger.log(error, { component: 'TestComponent' });

      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].errorDetails.message).toBe('Test error');
      expect(logs[0].context.component).toBe('TestComponent');
    });

    it('should limit log history to maxLogs', () => {
      // Log more than max (100)
      for (let i = 0; i < 150; i++) {
        errorLogger.log(new Error(`Error ${i}`));
      }

      const logs = errorLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should clear logs', () => {
      errorLogger.log(new Error('Test'));
      expect(errorLogger.getLogs()).toHaveLength(1);

      errorLogger.clearLogs();
      expect(errorLogger.getLogs()).toHaveLength(0);
    });

    it('should filter logs by type', () => {
      errorLogger.log(new Error('Network error'));
      errorLogger.log(new Error('401 unauthorized'));
      errorLogger.log(new Error('Validation failed'));

      const networkLogs = errorLogger.getLogsByType(ErrorType.NETWORK);
      expect(networkLogs.length).toBeGreaterThan(0);
      expect(networkLogs[0].errorDetails.type).toBe(ErrorType.NETWORK);
    });

    it('should export logs as JSON', () => {
      errorLogger.log(new Error('Test error'));
      const exported = errorLogger.exportLogs();

      expect(() => JSON.parse(exported)).not.toThrow();
      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should include URL in context', () => {
      errorLogger.log(new Error('Test'));
      const logs = errorLogger.getLogs();

      expect(logs[0].context.url).toBeDefined();
    });
  });

  describe('withErrorHandling', () => {
    it('should return data on success', async () => {
      const fn = async () => 'success';
      const result = await withErrorHandling(fn);

      expect(result.data).toBe('success');
      expect(result.error).toBeUndefined();
    });

    it('should return error on failure', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };
      const result = await withErrorHandling(fn);

      expect(result.data).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
    });

    it('should log errors', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };
      await withErrorHandling(fn, { component: 'TestComponent' });

      const logs = errorLogger.getLogs();
      expect(logs).toHaveLength(1);
    });
  });

  describe('isRecoverableError', () => {
    it('should return true for network errors', () => {
      expect(isRecoverableError(ErrorType.NETWORK)).toBe(true);
    });

    it('should return true for server errors', () => {
      expect(isRecoverableError(ErrorType.SERVER)).toBe(true);
    });

    it('should return false for validation errors', () => {
      expect(isRecoverableError(ErrorType.VALIDATION)).toBe(false);
    });

    it('should return false for authentication errors', () => {
      expect(isRecoverableError(ErrorType.AUTHENTICATION)).toBe(false);
    });

    it('should return false for authorization errors', () => {
      expect(isRecoverableError(ErrorType.AUTHORIZATION)).toBe(false);
    });
  });

  describe('requiresReAuthentication', () => {
    it('should return true for authentication errors', () => {
      expect(requiresReAuthentication(ErrorType.AUTHENTICATION)).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(requiresReAuthentication(ErrorType.NETWORK)).toBe(false);
      expect(requiresReAuthentication(ErrorType.VALIDATION)).toBe(false);
      expect(requiresReAuthentication(ErrorType.SERVER)).toBe(false);
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract from string', () => {
      expect(extractErrorMessage('Error message')).toBe('Error message');
    });

    it('should extract from Error object', () => {
      const error = new Error('Test error');
      expect(extractErrorMessage(error)).toBe('Test error');
    });

    it('should extract from error property', () => {
      const error = { error: 'Error message' };
      expect(extractErrorMessage(error)).toBe('Error message');
    });

    it('should extract from data.error', () => {
      const error = { data: { error: 'Error message' } };
      expect(extractErrorMessage(error)).toBe('Error message');
    });

    it('should extract from response.data.error', () => {
      const error = { response: { data: { error: 'Error message' } } };
      expect(extractErrorMessage(error)).toBe('Error message');
    });

    it('should return default message for unknown format', () => {
      const error = { foo: 'bar' };
      expect(extractErrorMessage(error)).toBe('Erro desconhecido');
    });
  });
});
