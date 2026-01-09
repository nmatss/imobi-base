// @ts-nocheck
/**
 * Maps Routes
 * API endpoints for Google Maps integration
 *
 * 🔒 SECURITY: All routes require authentication to prevent API abuse
 * Google Maps API is pay-per-use, unauthorized access can cause financial costs
 */

import { Router, type Request, type Response } from "express";
import { requireAuth, requireAdmin } from "./middleware/auth";
import geocodingService from "./integrations/maps/geocoding-service";
import placesService from "./integrations/maps/places-service";
import distanceService from "./integrations/maps/distance-service";
import propertyLocationService from "./integrations/maps/property-location";
import googleMapsClient from "./integrations/maps/google-maps-client";
import mapsCache from "./integrations/maps/cache";
import rateLimit from "express-rate-limit";
import { validateBody, validateParams, validateQuery } from "./middleware/validate";
import { generateRateLimitKey } from "./middleware/rate-limit-key-generator";
import {
  geocodeSchema,
  reverseGeocodeSchema,
  validateAddressSchema,
  distanceSchema,
  directionsSchema,
  distanceMatrixSchema,
  autocompleteQuerySchema,
  propertyIdParamSchema,
  placeIdParamSchema,
  propertiesMapQuerySchema,
  nearbyPropertiesQuerySchema,
  geocodePropertySchema,
  updateCoordinatesSchema,
  batchGeocodeSchema,
  mapsStatusQuerySchema,
  nearbyPlacesQuerySchema,
} from "./schemas/maps";

const router = Router();

// 🔒 Apply authentication to ALL routes
router.use(requireAuth);

// ===== RATE LIMITING FOR MAPS API =====
/**
 * Rate limiter para Maps API (custo por requisição)
 * Limite conservador para proteger custos da API do Google Maps
 *
 * Custos aproximados Google Maps API:
 * - Geocoding: $0.005 por requisição
 * - Autocomplete: $0.003 por requisição
 * - Distance Matrix: $0.01 por cálculo
 * - Places: $0.017 por requisição
 */
const mapsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60, // 60 requisições por minuto (1 por segundo em média)
  message: { error: 'Maps API rate limit exceeded. Please slow down.' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limit para superadmin (opcional)
  skip: (req) => req.user?.role === 'super_admin',
});

// Rate limiter mais restritivo para batch geocode
const batchGeocodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 batch operations por hora
  message: { error: 'Batch geocoding limit exceeded. Maximum 10 batch operations per hour.' },
  keyGenerator: generateRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar globalmente no router
router.use(mapsLimiter);

/**
 * 🔒 SECURITY: Validate property belongs to user's tenant (prevents IDOR)
 */
async function validatePropertyTenant(propertyId: string, userTenantId: string): Promise<boolean> {
  try {
    // Import here to avoid circular dependency
    const { storage } = await import('./storage');
    const property = await storage.getPropertyById(propertyId);

    if (!property) {
      return false;
    }

    return property.tenantId === userTenantId;
  } catch (error) {
    console.error('[MAPS] Property validation error:', error);
    return false;
  }
}

/**
 * POST /api/maps/geocode
 * Geocode an address to coordinates
 * Validation: geocodeSchema
 */
router.post("/geocode", validateBody(geocodeSchema), async (req: Request, res: Response) => {
  try {
    // req.body is already validated and typed by Zod
    const { address } = req.body;

    const result = await geocodingService.geocodeAddress(address);

    if (!result) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Geocode error:", error);
    res.status(500).json({ error: "Failed to geocode address" });
  }
});

/**
 * POST /api/maps/reverse-geocode
 * Reverse geocode coordinates to address
 * Validation: reverseGeocodeSchema
 */
router.post("/reverse-geocode", validateBody(reverseGeocodeSchema), async (req: Request, res: Response) => {
  try {
    // req.body is already validated and typed by Zod (latitude/longitude are already numbers)
    const { latitude, longitude } = req.body;

    const result = await geocodingService.reverseGeocode(latitude, longitude);

    if (!result) {
      return res.status(404).json({ error: "Location not found" });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Reverse geocode error:", error);
    res.status(500).json({ error: "Failed to reverse geocode" });
  }
});

/**
 * POST /api/maps/validate-address
 * Validate and normalize an address
 * Validation: validateAddressSchema
 */
router.post("/validate-address", validateBody(validateAddressSchema), async (req: Request, res: Response) => {
  try {
    // req.body is already validated and typed by Zod
    const { address } = req.body;

    const result = await geocodingService.validateAddress(address);
    res.json(result);
  } catch (error: any) {
    console.error("Address validation error:", error);
    res.status(500).json({ error: "Failed to validate address" });
  }
});

/**
 * GET /api/maps/nearby/:propertyId
 * Get nearby places for a property
 * 🔒 SECURITY: Validates property belongs to user's tenant
 * Validation: propertyIdParamSchema, nearbyPlacesQuerySchema
 */
router.get("/nearby/:propertyId", validateParams(propertyIdParamSchema), validateQuery(nearbyPlacesQuerySchema), async (req: Request, res: Response) => {
  try {
    // req.params and req.query are already validated and typed by Zod
    const { propertyId } = req.params;
    const { type, radius } = req.query;

    // 🔒 SECURITY: Validate property ownership (prevent IDOR)
    const isValid = await validatePropertyTenant(propertyId, req.user!.tenantId);
    if (!isValid) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Get property coordinates
    const coords = await propertyLocationService.getPropertyCoordinates(propertyId);

    if (!coords) {
      return res.status(404).json({ error: "Property coordinates not found" });
    }

    const places = await placesService.searchNearby({
      latitude: coords.latitude,
      longitude: coords.longitude,
      type: type as any,
      radius: radius,
    });

    res.json(places);
  } catch (error: any) {
    console.error("Nearby search error:", error);
    res.status(500).json({ error: "Failed to search nearby places" });
  }
});

/**
 * GET /api/maps/amenities/:propertyId
 * Get nearby amenities for a property
 * 🔒 SECURITY: Validates property belongs to user's tenant
 * Validation: propertyIdParamSchema, nearbyPlacesQuerySchema
 */
router.get("/amenities/:propertyId", validateParams(propertyIdParamSchema), validateQuery(nearbyPlacesQuerySchema), async (req: Request, res: Response) => {
  try {
    // req.params and req.query are already validated and typed by Zod
    const { propertyId } = req.params;
    const { radius } = req.query;

    // 🔒 SECURITY: Validate property ownership (prevent IDOR)
    const isValid = await validatePropertyTenant(propertyId, req.user!.tenantId);
    if (!isValid) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Get property coordinates
    const coords = await propertyLocationService.getPropertyCoordinates(propertyId);

    if (!coords) {
      return res.status(404).json({ error: "Property coordinates not found" });
    }

    const amenities = await placesService.findAmenities(
      coords.latitude,
      coords.longitude,
      radius
    );

    res.json(amenities);
  } catch (error: any) {
    console.error("Amenities search error:", error);
    res.status(500).json({ error: "Failed to search amenities" });
  }
});

/**
 * GET /api/maps/walkability/:propertyId
 * Calculate walkability score for a property
 * 🔒 SECURITY: Validates property belongs to user's tenant
 * Validation: propertyIdParamSchema
 */
router.get("/walkability/:propertyId", validateParams(propertyIdParamSchema), async (req: Request, res: Response) => {
  try {
    // req.params is already validated and typed by Zod
    const { propertyId } = req.params;

    // 🔒 SECURITY: Validate property ownership (prevent IDOR)
    const isValid = await validatePropertyTenant(propertyId, req.user!.tenantId);
    if (!isValid) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Get property coordinates
    const coords = await propertyLocationService.getPropertyCoordinates(propertyId);

    if (!coords) {
      return res.status(404).json({ error: "Property coordinates not found" });
    }

    const walkabilityScore = await placesService.calculateWalkabilityScore(
      coords.latitude,
      coords.longitude
    );

    res.json(walkabilityScore);
  } catch (error: any) {
    console.error("Walkability calculation error:", error);
    res.status(500).json({ error: "Failed to calculate walkability score" });
  }
});

/**
 * POST /api/maps/distance
 * Calculate distance between two points
 * Validation: distanceSchema
 */
router.post("/distance", validateBody(distanceSchema), async (req: Request, res: Response) => {
  try {
    // req.body is already validated and typed by Zod
    const { origin, destination, mode } = req.body;

    const result = await distanceService.calculateDistance(origin, destination, mode);

    if (!result) {
      return res.status(404).json({ error: "Could not calculate distance" });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Distance calculation error:", error);
    res.status(500).json({ error: "Failed to calculate distance" });
  }
});

/**
 * POST /api/maps/directions
 * Get directions between two points
 * Validation: directionsSchema
 */
router.post("/directions", validateBody(directionsSchema), async (req: Request, res: Response) => {
  try {
    // req.body is already validated and typed by Zod
    const { origin, destination, mode } = req.body;

    const result = await distanceService.getDirections(origin, destination, mode);

    if (!result) {
      return res.status(404).json({ error: "Could not find directions" });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Directions error:", error);
    res.status(500).json({ error: "Failed to get directions" });
  }
});

/**
 * POST /api/maps/distance-matrix
 * Calculate distance from one point to multiple destinations
 * Validation: distanceMatrixSchema
 */
router.post("/distance-matrix", validateBody(distanceMatrixSchema), async (req: Request, res: Response) => {
  try {
    // req.body is already validated and typed by Zod
    const { origin, destinations, mode } = req.body;

    const result = await distanceService.calculateDistanceMatrix(origin, destinations, mode);

    if (!result) {
      return res.status(404).json({ error: "Could not calculate distance matrix" });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Distance matrix error:", error);
    res.status(500).json({ error: "Failed to calculate distance matrix" });
  }
});

/**
 * GET /api/maps/autocomplete
 * Address autocomplete suggestions
 * Validation: autocompleteQuerySchema
 */
router.get("/autocomplete", validateQuery(autocompleteQuerySchema), async (req: Request, res: Response) => {
  try {
    // req.query is already validated and typed by Zod
    const { input, lat, lng } = req.query;

    const location = lat && lng ? { lat, lng } : undefined;

    const suggestions = await placesService.autocomplete(input, location);
    res.json(suggestions);
  } catch (error: any) {
    console.error("Autocomplete error:", error);
    res.status(500).json({ error: "Failed to get autocomplete suggestions" });
  }
});

/**
 * GET /api/maps/place/:placeId
 * Get place details by place ID
 * Validation: placeIdParamSchema
 */
router.get("/place/:placeId", validateParams(placeIdParamSchema), async (req: Request, res: Response) => {
  try {
    // req.params is already validated and typed by Zod
    const { placeId } = req.params;

    const details = await placesService.getPlaceDetails(placeId);

    if (!details) {
      return res.status(404).json({ error: "Place not found" });
    }

    res.json(details);
  } catch (error: any) {
    console.error("Place details error:", error);
    res.status(500).json({ error: "Failed to get place details" });
  }
});

/**
 * GET /api/properties/map
 * Get all properties with coordinates for map display
 * Validation: propertiesMapQuerySchema
 */
router.get("/properties/map", validateQuery(propertiesMapQuerySchema), async (req: Request, res: Response) => {
  try {
    // req.query is already validated and typed by Zod
    const { tenantId } = req.query;

    const properties = await propertyLocationService.getPropertiesWithCoordinates(tenantId);
    res.json(properties);
  } catch (error: any) {
    console.error("Properties map error:", error);
    res.status(500).json({ error: "Failed to get properties for map" });
  }
});

/**
 * GET /api/properties/nearby
 * Find nearby properties
 * Validation: nearbyPropertiesQuerySchema
 */
router.get("/properties/nearby", validateQuery(nearbyPropertiesQuerySchema), async (req: Request, res: Response) => {
  try {
    // req.query is already validated and typed by Zod
    const { latitude, longitude, radius, tenantId } = req.query;

    const properties = await propertyLocationService.findNearbyProperties(
      latitude,
      longitude,
      radius,
      tenantId
    );

    res.json(properties);
  } catch (error: any) {
    console.error("Nearby properties error:", error);
    res.status(500).json({ error: "Failed to find nearby properties" });
  }
});

/**
 * POST /api/properties/:propertyId/geocode
 * Manually geocode a specific property
 * 🔒 SECURITY: Validates property belongs to user's tenant
 * Validation: propertyIdParamSchema, geocodePropertySchema
 */
router.post("/properties/:propertyId/geocode", validateParams(propertyIdParamSchema), validateBody(geocodePropertySchema), async (req: Request, res: Response) => {
  try {
    // req.params and req.body are already validated and typed by Zod
    const { propertyId } = req.params;
    const { address, city, state } = req.body;

    // 🔒 SECURITY: Validate property ownership (prevent IDOR)
    const isValid = await validatePropertyTenant(propertyId, req.user!.tenantId);
    if (!isValid) {
      return res.status(404).json({ error: "Property not found" });
    }

    const result = await propertyLocationService.geocodeProperty(propertyId, address, city, state);

    if (!result) {
      return res.status(404).json({ error: "Failed to geocode property" });
    }

    res.json(result);
  } catch (error: any) {
    console.error("Property geocode error:", error);
    res.status(500).json({ error: "Failed to geocode property" });
  }
});

/**
 * PUT /api/properties/:propertyId/coordinates
 * Update property coordinates manually
 * 🔒 SECURITY: Validates property belongs to user's tenant
 * Validation: propertyIdParamSchema, updateCoordinatesSchema
 */
router.put("/properties/:propertyId/coordinates", validateParams(propertyIdParamSchema), validateBody(updateCoordinatesSchema), async (req: Request, res: Response) => {
  try {
    // req.params and req.body are already validated and typed by Zod
    const { propertyId } = req.params;
    const { latitude, longitude } = req.body;

    // 🔒 SECURITY: Validate property ownership (prevent IDOR)
    const isValid = await validatePropertyTenant(propertyId, req.user!.tenantId);
    if (!isValid) {
      return res.status(404).json({ error: "Property not found" });
    }

    await propertyLocationService.updateCoordinatesManually(
      propertyId,
      latitude,
      longitude
    );

    res.json({ success: true, message: "Coordinates updated successfully" });
  } catch (error: any) {
    console.error("Update coordinates error:", error);
    res.status(500).json({ error: "Failed to update coordinates" });
  }
});

/**
 * POST /api/properties/batch-geocode
 * Batch geocode all properties without coordinates
 * 🔒 SECURITY: Validates tenantId matches authenticated user
 * 🔒 RATE LIMIT: 10 batch operations per hour with max 100 properties per batch
 * Validation: batchGeocodeSchema
 */
router.post("/properties/batch-geocode", batchGeocodeLimiter, validateBody(batchGeocodeSchema), async (req: Request, res: Response) => {
  try {
    // req.body is already validated and typed by Zod
    const { tenantId, maxResults } = req.body;

    // 🔒 SECURITY: Prevent cross-tenant batch operations (IDOR)
    if (tenantId !== req.user!.tenantId) {
      return res.status(403).json({ error: "Forbidden: Invalid tenant access" });
    }

    // 🔒 COST PROTECTION: Limite máximo de propriedades por batch
    const MAX_BATCH_SIZE = 100;
    const requestedMax = maxResults ? Math.min(maxResults, MAX_BATCH_SIZE) : MAX_BATCH_SIZE;

    // Verificar quantas propriedades sem coordenadas existem
    const propertiesWithoutCoords = await propertyLocationService.getPropertiesWithoutCoordinates(tenantId);

    if (propertiesWithoutCoords.length > MAX_BATCH_SIZE) {
      console.warn(`[MAPS] Large batch geocode request: ${propertiesWithoutCoords.length} properties for tenant ${tenantId}`);
      return res.status(400).json({
        error: `Batch too large. Maximum ${MAX_BATCH_SIZE} properties at once.`,
        total: propertiesWithoutCoords.length,
        suggestion: `Process in ${Math.ceil(propertiesWithoutCoords.length / MAX_BATCH_SIZE)} smaller batches`,
        maxBatchSize: MAX_BATCH_SIZE,
      });
    }

    const result = await propertyLocationService.batchGeocodeProperties(tenantId, requestedMax);
    res.json(result);
  } catch (error: any) {
    console.error("Batch geocode error:", error);
    res.status(500).json({ error: "Failed to batch geocode properties" });
  }
});

/**
 * GET /api/maps/status
 * Check Maps API status and configuration
 * Validation: mapsStatusQuerySchema
 */
router.get("/status", validateQuery(mapsStatusQuerySchema), async (req: Request, res: Response) => {
  try {
    // req.query is already validated and typed by Zod
    const { validate } = req.query;

    const isEnabled = googleMapsClient.isApiEnabled();
    const cacheStats = mapsCache.getStats();

    const status = {
      enabled: isEnabled,
      apiKeyConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
      cache: cacheStats,
    };

    // Optionally validate API key
    if (isEnabled && validate === "true") {
      const isValid = await googleMapsClient.validateApiKey();
      status["apiKeyValid"] = isValid;
    }

    res.json(status);
  } catch (error: any) {
    console.error("Maps status error:", error);
    res.status(500).json({ error: "Failed to get maps status" });
  }
});

/**
 * DELETE /api/maps/cache
 * Clear maps cache (admin only)
 * 🔒 SECURITY: Admin-only route
 */
router.delete("/cache", requireAdmin, async (req: Request, res: Response) => {
  try {
    mapsCache.clear();
    console.log(`[MAPS] Cache cleared by admin user: ${req.user?.id}`);
    res.json({ success: true, message: "Maps cache cleared" });
  } catch (error: any) {
    console.error("Cache clear error:", error);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

// ===== MONITORING & COST TRACKING =====
/**
 * FUTURE IMPLEMENTATION: API Cost Tracking
 *
 * Para implementar tracking de custos completo:
 * 1. Criar tabela `api_costs` no schema:
 *    - tenantId, service, operation, quantity, cost, timestamp
 *
 * 2. Middleware para trackear custos:
 *    async function trackMapsApiCost(
 *      operation: 'geocode' | 'reverse-geocode' | 'distance-matrix' | 'autocomplete',
 *      tenantId: string,
 *      quantity: number = 1
 *    ): Promise<void>
 *
 * 3. Verificar limites mensais por tenant
 *    - Rejeitar requisições se limite excedido
 *    - Enviar alertas próximo ao limite
 *
 * 4. Dashboard de custos para admins
 *    - Custos por tenant
 *    - Trending de uso
 *    - Alertas de uso excessivo
 */

/**
 * Middleware de monitoramento de uso alto
 * Monitora padrões de uso excessivo e loga alertas
 */
const apiUsageLog = new Map<string, { count: number; timestamp: number }>();

function monitorHighUsage(tenantId: string, operation: string): void {
  const key = `${tenantId}:${operation}`;
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  // Limpar registros antigos
  if (apiUsageLog.has(key)) {
    const usage = apiUsageLog.get(key)!;
    if (usage.timestamp < hourAgo) {
      apiUsageLog.delete(key);
    }
  }

  // Incrementar contador
  const current = apiUsageLog.get(key) || { count: 0, timestamp: now };
  current.count++;
  apiUsageLog.set(key, current);

  // Alertas de uso excessivo
  const ALERT_THRESHOLDS = {
    geocode: 500,
    autocomplete: 1000,
    'distance-matrix': 300,
    places: 400,
  };

  const threshold = ALERT_THRESHOLDS[operation as keyof typeof ALERT_THRESHOLDS] || 500;

  if (current.count > threshold) {
    console.warn(`[MAPS MONITORING] High ${operation} usage detected`, {
      tenantId,
      count: current.count,
      threshold,
      period: '1 hour',
      timestamp: new Date().toISOString(),
    });

    // TODO: Enviar alerta para admin
    // await sendAdminAlert({
    //   type: 'high_api_usage',
    //   service: 'google-maps',
    //   tenantId,
    //   operation,
    //   count: current.count,
    // });
  }
}

// Exemplo de uso nos endpoints (adicionar aos handlers conforme necessário):
// router.post("/geocode", async (req: Request, res: Response) => {
//   const tenantId = req.user!.tenantId;
//   monitorHighUsage(tenantId, 'geocode');
//   // ... resto do código
// });

export default router;
