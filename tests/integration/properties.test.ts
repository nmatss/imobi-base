import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createTestProperty } from '../utils/test-helpers';

// Mock Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  const properties = [
    createTestProperty({ id: 1, title: 'Apartment Downtown' }),
    createTestProperty({ id: 2, title: 'House Suburbia' }),
  ];

  // Mock properties routes
  app.get('/api/properties', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    res.json({
      properties,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: properties.length,
        pages: Math.ceil(properties.length / limitNum),
      },
    });
  });

  app.post('/api/properties', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, price, type } = req.body;

    if (!title || !price || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProperty = createTestProperty({
      id: properties.length + 1,
      title,
      price,
      type,
    });

    properties.push(newProperty);

    res.status(201).json({ property: newProperty });
  });

  app.put('/api/properties/:id', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const propertyIndex = properties.findIndex((p) => p.id === parseInt(id));

    if (propertyIndex === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }

    properties[propertyIndex] = {
      ...properties[propertyIndex],
      ...req.body,
    };

    res.json({ property: properties[propertyIndex] });
  });

  app.delete('/api/properties/:id', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const propertyIndex = properties.findIndex((p) => p.id === parseInt(id));

    if (propertyIndex === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }

    properties.splice(propertyIndex, 1);

    res.json({ success: true, message: 'Property deleted' });
  });

  app.get('/api/properties/public/:tenantId', (req, res) => {
    const { tenantId } = req.params;

    const publicProperties = properties.filter(
      (p) => p.tenantId === parseInt(tenantId) && p.status === 'available'
    );

    res.json({ properties: publicProperties });
  });

  return app;
};

describe('Properties API Integration Tests', () => {
  let app: express.Application;
  const authToken = 'Bearer test_token';

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/properties', () => {
    it('should get properties with authentication', async () => {
      const response = await request(app)
        .get('/api/properties')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.properties).toBeDefined();
      expect(Array.isArray(response.body.properties)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/properties').expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/properties?page=1&limit=10')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });
  });

  describe('POST /api/properties', () => {
    it('should create a new property', async () => {
      const newProperty = {
        title: 'New Apartment',
        price: 300000,
        type: 'apartment',
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
      };

      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', authToken)
        .send(newProperty)
        .expect(201);

      expect(response.body.property).toBeDefined();
      expect(response.body.property.title).toBe('New Apartment');
      expect(response.body.property.price).toBe(300000);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/properties')
        .send({ title: 'Test' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/properties')
        .set('Authorization', authToken)
        .send({ title: 'Incomplete Property' })
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should update an existing property', async () => {
      const updates = {
        title: 'Updated Apartment',
        price: 350000,
      };

      const response = await request(app)
        .put('/api/properties/1')
        .set('Authorization', authToken)
        .send(updates)
        .expect(200);

      expect(response.body.property).toBeDefined();
      expect(response.body.property.title).toBe('Updated Apartment');
      expect(response.body.property.price).toBe(350000);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/properties/1')
        .send({ title: 'Test' })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should fail with non-existent property', async () => {
      const response = await request(app)
        .put('/api/properties/9999')
        .set('Authorization', authToken)
        .send({ title: 'Test' })
        .expect(404);

      expect(response.body.error).toBe('Property not found');
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should delete a property', async () => {
      const response = await request(app)
        .delete('/api/properties/2')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Property deleted');
    });

    it('should fail without authentication', async () => {
      const response = await request(app).delete('/api/properties/1').expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should fail with non-existent property', async () => {
      const response = await request(app)
        .delete('/api/properties/9999')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.error).toBe('Property not found');
    });
  });

  describe('GET /api/properties/public/:tenantId', () => {
    it('should get public properties without authentication', async () => {
      const response = await request(app).get('/api/properties/public/1').expect(200);

      expect(response.body.properties).toBeDefined();
      expect(Array.isArray(response.body.properties)).toBe(true);
    });
  });
});
