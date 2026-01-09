/**
 * SQL Injection Prevention Integration Tests
 * Tests protection against SQL injection attacks through parameterized queries
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import { sanitizeString, detectSqlInjection } from '../../../server/security/input-validation';

// Mock database - simulates SQL queries
class MockDatabase {
  private users: any[] = [];
  private properties: any[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.users = [
      { id: '1', email: 'admin@example.com', password: 'hashed_admin_pass', role: 'admin' },
      { id: '2', email: 'user@example.com', password: 'hashed_user_pass', role: 'user' },
      { id: '3', email: 'test@example.com', password: 'hashed_test_pass', role: 'user' },
    ];

    this.properties = [
      { id: '1', title: 'House 1', price: 100000, tenantId: 'tenant1' },
      { id: '2', title: 'House 2', price: 200000, tenantId: 'tenant1' },
      { id: '3', title: 'House 3', price: 300000, tenantId: 'tenant2' },
    ];
  }

  // SAFE: Parameterized query simulation
  getUserByEmailSafe(email: string) {
    // In real implementation, this would use parameterized queries
    // Example: db.query('SELECT * FROM users WHERE email = $1', [email])
    return this.users.find(u => u.email === email);
  }

  // UNSAFE: String concatenation (for testing detection)
  getUserByEmailUnsafe(email: string) {
    // This is intentionally vulnerable for testing
    // In production, NEVER do this!
    const query = `SELECT * FROM users WHERE email = '${email}'`;

    // Detect SQL injection attempts
    if (detectSqlInjection(query)) {
      throw new Error('SQL injection detected');
    }

    return this.users.find(u => u.email === email);
  }

  // SAFE: ID-based lookup with validation
  getPropertyByIdSafe(id: string, tenantId: string) {
    // Validate ID format
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error('Invalid ID format');
    }

    return this.properties.find(p => p.id === id && p.tenantId === tenantId);
  }

  // SAFE: Search with sanitization
  searchPropertiesSafe(searchTerm: string, tenantId: string) {
    const sanitized = sanitizeString(searchTerm, 100);
    if (!sanitized) {
      return [];
    }

    // In production: SELECT * FROM properties WHERE title ILIKE $1 AND tenantId = $2
    return this.properties.filter(p =>
      p.tenantId === tenantId &&
      p.title.toLowerCase().includes(sanitized.toLowerCase())
    );
  }

  // SAFE: Numeric filter with validation
  getPropertiesByPriceRange(min: number, max: number, tenantId: string) {
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw new Error('Invalid price range');
    }

    if (min < 0 || max < 0 || min > max) {
      throw new Error('Invalid price range');
    }

    return this.properties.filter(p =>
      p.tenantId === tenantId &&
      p.price >= min &&
      p.price <= max
    );
  }
}

function createTestApp(): Express {
  const app = express();
  const db = new MockDatabase();

  app.use(express.json());

  // User lookup endpoint (safe)
  app.get('/api/users/by-email', (req: Request, res: Response) => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Sanitize input
      const sanitized = sanitizeString(email, 255);
      if (!sanitized) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Use safe parameterized query
      const user = db.getUserByEmailSafe(sanitized);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Don't return password
      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Property lookup endpoint (safe with IDOR protection)
  app.get('/api/properties/:id', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tenantId = req.headers['x-tenant-id'] as string || 'tenant1';

      // Sanitize ID
      if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({
          error: 'Invalid ID format',
          code: 'INVALID_INPUT',
        });
      }

      const property = db.getPropertyByIdSafe(id, tenantId);

      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }

      res.json({ property });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Search endpoint (safe with sanitization)
  app.get('/api/properties/search', (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || 'tenant1';

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Detect SQL injection attempts
      if (detectSqlInjection(q)) {
        return res.status(400).json({
          error: 'Invalid search query',
          code: 'MALICIOUS_INPUT_DETECTED',
        });
      }

      const properties = db.searchPropertiesSafe(q, tenantId);
      res.json({ properties });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Filter endpoint (safe with type validation)
  app.get('/api/properties/filter', (req: Request, res: Response) => {
    try {
      const { minPrice, maxPrice } = req.query;
      const tenantId = req.headers['x-tenant-id'] as string || 'tenant1';

      const min = Number(minPrice);
      const max = Number(maxPrice);

      if (isNaN(min) || isNaN(max)) {
        return res.status(400).json({ error: 'Invalid price range' });
      }

      const properties = db.getPropertiesByPriceRange(min, max, tenantId);
      res.json({ properties });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Unsafe endpoint (for testing detection)
  app.get('/api/unsafe/user', (req: Request, res: Response) => {
    try {
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }

      // This will throw if SQL injection detected
      const user = db.getUserByEmailUnsafe(email);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { password, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error: any) {
      res.status(400).json({
        error: 'Security violation detected',
        code: 'SQL_INJECTION_DETECTED',
        details: error.message,
      });
    }
  });

  return app;
}

describe('SQL Injection Prevention Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Classic SQL Injection Attempts', () => {
    it('should block SQL injection with OR 1=1', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "admin@example.com' OR '1'='1" })
        .expect(400);

      expect(res.body.code).toBe('SQL_INJECTION_DETECTED');
      expect(res.body.details).toContain('SQL injection detected');
    });

    it('should block SQL injection with UNION SELECT', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "admin@example.com' UNION SELECT * FROM passwords--" })
        .expect(400);

      expect(res.body.code).toBe('SQL_INJECTION_DETECTED');
    });

    it('should block SQL injection with comment', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "admin@example.com'--" })
        .expect(400);

      expect(res.body.code).toBe('SQL_INJECTION_DETECTED');
    });

    it('should block SQL injection with semicolon', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "admin@example.com'; DROP TABLE users;--" })
        .expect(400);

      expect(res.body.code).toBe('SQL_INJECTION_DETECTED');
    });
  });

  describe('Safe Parameterized Queries', () => {
    it('should safely handle legitimate email lookups', async () => {
      const res = await request(app)
        .get('/api/users/by-email')
        .query({ email: 'admin@example.com' })
        .expect(200);

      expect(res.body.user.email).toBe('admin@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should safely handle email with special characters', async () => {
      // This is a legitimate email, not SQL injection
      const res = await request(app)
        .get('/api/users/by-email')
        .query({ email: "user+test@example.com" })
        .expect(404);

      // Should not find user but should not throw SQL injection error
      expect(res.body.error).toBe('User not found');
    });

    it('should sanitize and handle SQL-like strings in legitimate data', async () => {
      // Search for property with SQL-like text (legitimate use)
      const res = await request(app)
        .get('/api/properties/search')
        .query({ q: 'House 1' })
        .expect(200);

      expect(res.body.properties).toBeDefined();
      expect(Array.isArray(res.body.properties)).toBe(true);
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should validate property ID format', async () => {
      const res = await request(app)
        .get('/api/properties/invalid-id-with-quotes')
        .expect(400);

      expect(res.body.code).toBe('INVALID_INPUT');
    });

    it('should accept valid alphanumeric IDs', async () => {
      const res = await request(app)
        .get('/api/properties/1')
        .set('x-tenant-id', 'tenant1')
        .expect(200);

      expect(res.body.property.id).toBe('1');
    });

    it('should validate numeric price filters', async () => {
      const res = await request(app)
        .get('/api/properties/filter')
        .query({ minPrice: '100000', maxPrice: '200000' })
        .expect(200);

      expect(res.body.properties).toBeDefined();
      expect(res.body.properties.every((p: any) => p.price >= 100000 && p.price <= 200000)).toBe(true);
    });

    it('should reject non-numeric price filters', async () => {
      const res = await request(app)
        .get('/api/properties/filter')
        .query({ minPrice: "1000' OR '1'='1", maxPrice: '2000' })
        .expect(400);

      expect(res.body.error).toContain('Invalid price range');
    });
  });

  describe('Advanced SQL Injection Attempts', () => {
    it('should block time-based blind SQL injection', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "admin@example.com'; WAITFOR DELAY '00:00:05'--" })
        .expect(400);

      expect(res.body.code).toBe('SQL_INJECTION_DETECTED');
    });

    it('should block stacked queries', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "admin@example.com'; DELETE FROM users WHERE 1=1;--" })
        .expect(400);

      expect(res.body.code).toBe('SQL_INJECTION_DETECTED');
    });

    it('should block hex-encoded SQL injection', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "admin@example.com' OR 0x31=0x31--" })
        .expect(400);

      expect(res.body.code).toBe('SQL_INJECTION_DETECTED');
    });

    it('should detect SQL keywords in search query', async () => {
      const sqlKeywords = [
        "'; SELECT * FROM users--",
        "'; INSERT INTO users--",
        "'; UPDATE users SET--",
        "'; DELETE FROM users--",
        "'; DROP TABLE users--",
        "'; ALTER TABLE users--",
        "'; EXEC sp_executesql--",
      ];

      for (const keyword of sqlKeywords) {
        const res = await request(app)
          .get('/api/properties/search')
          .query({ q: keyword })
          .expect(400);

        expect(res.body.code).toBe('MALICIOUS_INPUT_DETECTED');
      }
    });
  });

  describe('Tenant Isolation (IDOR Prevention)', () => {
    it('should not allow access to other tenant properties', async () => {
      // Property 3 belongs to tenant2
      const res = await request(app)
        .get('/api/properties/3')
        .set('x-tenant-id', 'tenant1')
        .expect(404);

      expect(res.body.error).toBe('Property not found');
    });

    it('should allow access to own tenant properties', async () => {
      const res = await request(app)
        .get('/api/properties/1')
        .set('x-tenant-id', 'tenant1')
        .expect(200);

      expect(res.body.property.id).toBe('1');
      expect(res.body.property.tenantId).toBe('tenant1');
    });

    it('should filter search results by tenant', async () => {
      const res = await request(app)
        .get('/api/properties/search')
        .query({ q: 'House' })
        .set('x-tenant-id', 'tenant1')
        .expect(200);

      expect(res.body.properties.length).toBeGreaterThan(0);
      expect(res.body.properties.every((p: any) => p.tenantId === 'tenant1')).toBe(true);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should sanitize object-based queries', async () => {
      // Attempt to inject NoSQL query object
      const res = await request(app)
        .get('/api/users/by-email')
        .query({ email: JSON.stringify({ $ne: null }) })
        .expect(404);

      // Should be treated as string, not find user
      expect(res.body.error).toBe('User not found');
    });

    it('should handle JSON strings safely', async () => {
      const res = await request(app)
        .get('/api/properties/search')
        .query({ q: '{"$where": "this.price < 100000"}' })
        .expect(200);

      // Should treat as regular search string, not execute
      expect(res.body.properties).toBeDefined();
    });
  });

  describe('Input Length Validation', () => {
    it('should reject extremely long inputs', async () => {
      const longString = 'a'.repeat(10000);

      const res = await request(app)
        .get('/api/users/by-email')
        .query({ email: longString })
        .expect(400);

      expect(res.body.error).toBe('Invalid email format');
    });

    it('should sanitize to maximum length', async () => {
      const longSearch = 'House ' + 'a'.repeat(500);

      const res = await request(app)
        .get('/api/properties/search')
        .query({ q: longSearch })
        .expect(200);

      // Should handle gracefully with truncation
      expect(res.body.properties).toBeDefined();
    });
  });

  describe('Type Coercion Protection', () => {
    it('should reject non-string ID parameters', async () => {
      const res = await request(app)
        .get('/api/properties/["1","2","3"]')
        .expect(400);

      expect(res.body.code).toBe('INVALID_INPUT');
    });

    it('should validate number types strictly', async () => {
      const res = await request(app)
        .get('/api/properties/filter')
        .query({ minPrice: 'not-a-number', maxPrice: '200000' })
        .expect(400);

      expect(res.body.error).toContain('Invalid price range');
    });
  });

  describe('Error Message Security', () => {
    it('should not leak database structure in error messages', async () => {
      const res = await request(app)
        .get('/api/unsafe/user')
        .query({ email: "'; DROP TABLE users;--" })
        .expect(400);

      // Error message should be generic
      expect(res.body.error).not.toContain('table');
      expect(res.body.error).not.toContain('column');
      expect(res.body.error).not.toContain('syntax');
    });

    it('should provide user-friendly errors for invalid input', async () => {
      const res = await request(app)
        .get('/api/users/by-email')
        .query({ email: '' })
        .expect(400);

      expect(res.body.error).toBe('Invalid email format');
      // Should not reveal internal details
      expect(res.body.error).not.toContain('SQL');
      expect(res.body.error).not.toContain('database');
    });
  });
});
