// @ts-nocheck
/**
 * Property Routes Module
 * RESTful API endpoints for property management
 *
 * This is an example of how to refactor routes.ts into modular route files
 */

import { Router } from 'express';
import { storage } from '../../storage';
import { validateBody, validateParams, validateQuery, ValidatedRequest } from '../../middleware/validate';
import { asyncHandler, NotFoundError } from '../../middleware/error-handler';
import {
  createPropertySchema,
  updatePropertySchema,
  propertyQuerySchema,
  idParamSchema,
} from '../../schemas';
import type { InsertProperty } from '@shared/schema-sqlite';

const router = Router();

/**
 * GET /api/properties
 * List all properties with filtering and pagination
 */
router.get(
  '/',
  validateQuery(propertyQuerySchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const { page, limit, ...filters } = req.query;

    const properties = await storage.getProperties({
      tenantId: req.user!.tenantId,
      page,
      limit,
      ...filters,
    });

    res.json(properties);
  })
);

/**
 * GET /api/properties/:id
 * Get a single property by ID
 */
router.get(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    const property = await storage.getProperty(req.params.id);

    if (!property) {
      throw new NotFoundError('Property');
    }

    // Check tenant access
    if (property.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Property');
    }

    res.json(property);
  })
);

/**
 * POST /api/properties
 * Create a new property
 */
router.post(
  '/',
  validateBody(createPropertySchema),
  asyncHandler(async (req: ValidatedRequest<InsertProperty>, res) => {
    const data = {
      ...req.body,
      tenantId: req.user!.tenantId,
    };

    const property = await storage.createProperty(data);
    res.status(201).json(property);
  })
);

/**
 * PATCH /api/properties/:id
 * Update an existing property
 */
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updatePropertySchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    // Check if property exists and belongs to tenant
    const existing = await storage.getProperty(req.params.id);
    if (!existing) {
      throw new NotFoundError('Property');
    }

    if (existing.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Property');
    }

    const property = await storage.updateProperty(req.params.id, req.body);
    res.json(property);
  })
);

/**
 * DELETE /api/properties/:id
 * Delete a property
 */
router.delete(
  '/:id',
  validateParams(idParamSchema),
  asyncHandler(async (req: ValidatedRequest, res) => {
    // Check if property exists and belongs to tenant
    const existing = await storage.getProperty(req.params.id);
    if (!existing) {
      throw new NotFoundError('Property');
    }

    if (existing.tenantId !== req.user!.tenantId) {
      throw new NotFoundError('Property');
    }

    const success = await storage.deleteProperty(req.params.id);
    res.json({ success });
  })
);

export default router;
