/**
 * SSRF (Server-Side Request Forgery) Protection Integration Tests
 * Tests protection against internal network access and cloud metadata endpoints
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Express, type Request, type Response } from 'express';
import { validateExternalUrl } from '../../../server/security/url-validator';

function createTestApp(): Express {
  const app = express();

  app.use(express.json());

  // Webhook endpoint that fetches external URLs (potential SSRF vector)
  app.post('/api/webhooks/fetch', async (req: Request, res: Response) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate URL to prevent SSRF
    const validation = validateExternalUrl(url);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid or forbidden URL',
        code: 'SSRF_BLOCKED',
        details: validation.error,
      });
    }

    // In production, this would actually fetch the URL
    // For testing, we just return success if validation passed
    res.json({
      success: true,
      url,
      message: 'URL is valid and would be fetched',
    });
  });

  // Avatar/profile image endpoint (common SSRF vector)
  app.post('/api/users/avatar', async (req: Request, res: Response) => {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    const validation = validateExternalUrl(imageUrl);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid image URL',
        code: 'SSRF_BLOCKED',
        details: validation.error,
      });
    }

    res.json({
      success: true,
      avatarUrl: imageUrl,
    });
  });

  // Import data endpoint (another SSRF vector)
  app.post('/api/import', async (req: Request, res: Response) => {
    const { source } = req.body;

    if (!source) {
      return res.status(400).json({ error: 'Source URL is required' });
    }

    const validation = validateExternalUrl(source);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid source URL',
        code: 'SSRF_BLOCKED',
        details: validation.error,
      });
    }

    res.json({
      success: true,
      source,
      message: 'Import would proceed',
    });
  });

  return app;
}

describe('SSRF Protection Integration Tests', () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('Localhost/Loopback Protection', () => {
    it('should block localhost URL', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://localhost:3000/admin' })
        .expect(400);

      expect(res.body.error).toContain('Invalid or forbidden URL');
      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('Localhost access is forbidden');
    });

    it('should block 127.0.0.1 URL', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://127.0.0.1:8080/secrets' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('Localhost access is forbidden');
    });

    it('should block 0.0.0.0 URL', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://0.0.0.0:6379/redis' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('should block ::1 (IPv6 localhost)', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://[::1]:3000/admin' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });
  });

  describe('Private IP Range Protection', () => {
    it('should block 10.x.x.x private network', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://10.0.0.1/internal' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('private IP');
    });

    it('should block 172.16.x.x - 172.31.x.x private network', async () => {
      const res1 = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://172.16.0.1/admin' })
        .expect(400);

      expect(res1.body.code).toBe('SSRF_BLOCKED');

      const res2 = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://172.31.255.255/data' })
        .expect(400);

      expect(res2.body.code).toBe('SSRF_BLOCKED');
    });

    it('should block 192.168.x.x private network', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://192.168.1.1/router' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('private IP');
    });

    it('should block link-local addresses (169.254.x.x)', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://169.254.1.1/metadata' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });
  });

  describe('Cloud Metadata Endpoint Protection', () => {
    it('should block AWS metadata endpoint (169.254.169.254)', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://169.254.169.254/latest/meta-data/' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('forbidden');
    });

    it('should block AWS IMDSv2 IPv6 endpoint', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://[fd00:ec2::254]/latest/meta-data/' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('should block GCP metadata endpoint', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://metadata.google.internal/computeMetadata/v1/' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });
  });

  describe('Dangerous Protocol Protection', () => {
    it('should block file:// protocol', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'file:///etc/passwd' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('File and FTP protocols are forbidden');
    });

    it('should block ftp:// protocol', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'ftp://internal-ftp.local/files' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('File and FTP protocols are forbidden');
    });

    it('should block gopher:// protocol', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'gopher://internal.local:70/' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
      expect(res.body.details).toContain('not allowed');
    });

    it('should only allow http:// and https:// protocols', async () => {
      const httpsRes = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'https://example.com/api/data' })
        .expect(200);

      expect(httpsRes.body.success).toBe(true);

      const httpRes = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://example.com/api/data' })
        .expect(200);

      expect(httpRes.body.success).toBe(true);
    });
  });

  describe('URL Bypass Attempt Protection', () => {
    it('should block URL with @ symbol (credentials bypass attempt)', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://example.com@127.0.0.1/admin' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('should block decimal IP representation', async () => {
      // 127.0.0.1 = 2130706433 in decimal
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://2130706433/' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('should block hexadecimal IP representation', async () => {
      // 127.0.0.1 = 0x7f000001 in hex
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://0x7f000001/' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('should block octal IP representation', async () => {
      // 127.0.0.1 = 0177.0.0.1 in octal
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://0177.0.0.1/' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });
  });

  describe('DNS Rebinding Protection', () => {
    it('should validate hostname at request time, not DNS resolution time', async () => {
      // This test ensures we validate the hostname, not the resolved IP
      // In production, a malicious DNS could resolve to internal IP

      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://malicious-domain-that-could-resolve-to-localhost.com/' })
        .expect(200);

      // Would pass hostname validation but in production,
      // we should also validate resolved IP before making request
      expect(res.body.success).toBe(true);
    });
  });

  describe('Valid External URLs', () => {
    it('should allow valid HTTPS URLs', async () => {
      const validUrls = [
        'https://api.github.com/users',
        'https://www.google.com',
        'https://example.org/webhook',
      ];

      for (const url of validUrls) {
        const res = await request(app)
          .post('/api/webhooks/fetch')
          .send({ url })
          .expect(200);

        expect(res.body.success).toBe(true);
      }
    });

    it('should allow valid HTTP URLs', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: 'http://example.com/api' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Different Endpoint SSRF Protection', () => {
    it('should protect avatar upload endpoint', async () => {
      const res = await request(app)
        .post('/api/users/avatar')
        .send({ imageUrl: 'http://127.0.0.1/avatar.jpg' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('should protect import endpoint', async () => {
      const res = await request(app)
        .post('/api/import')
        .send({ source: 'http://192.168.1.1/data.csv' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });

    it('should allow valid avatar URL', async () => {
      const res = await request(app)
        .post('/api/users/avatar')
        .send({ imageUrl: 'https://cdn.example.com/avatars/user.jpg' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should allow valid import source', async () => {
      const res = await request(app)
        .post('/api/import')
        .send({ source: 'https://data.example.com/export.csv' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  describe('Malformed URL Protection', () => {
    it('should reject malformed URLs', async () => {
      const malformedUrls = [
        'not-a-url',
        'http://',
        'https://.com',
        '//example.com',
        'http://exam ple.com',
      ];

      for (const url of malformedUrls) {
        const res = await request(app)
          .post('/api/webhooks/fetch')
          .send({ url })
          .expect(400);

        expect(res.body.code).toBe('SSRF_BLOCKED');
      }
    });

    it('should reject empty URL', async () => {
      const res = await request(app)
        .post('/api/webhooks/fetch')
        .send({ url: '' })
        .expect(400);

      expect(res.body.code).toBe('SSRF_BLOCKED');
    });
  });
});
