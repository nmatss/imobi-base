/**
 * Maps Validation Schemas
 * Zod schemas for Google Maps integration endpoints
 */

import { z } from 'zod';

/**
 * Geocode address schema
 */
export const geocodeSchema = z.object({
  address: z.string()
    .min(3, 'Address must be at least 3 characters')
    .max(500, 'Address too long'),
});

/**
 * Reverse geocode coordinates schema
 */
export const reverseGeocodeSchema = z.object({
  latitude: z.union([
    z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid latitude number');
      if (num < -90 || num > 90) throw new Error('Latitude must be between -90 and 90');
      return num;
    }),
  ]),
  longitude: z.union([
    z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid longitude number');
      if (num < -180 || num > 180) throw new Error('Longitude must be between -180 and 180');
      return num;
    }),
  ]),
});

/**
 * Validate address schema
 */
export const validateAddressSchema = z.object({
  address: z.string()
    .min(3, 'Address must be at least 3 characters')
    .max(500, 'Address too long'),
});

/**
 * Nearby places query schema
 */
export const nearbyPlacesQuerySchema = z.object({
  type: z.string().optional(),
  radius: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) throw new Error('Invalid radius number');
    if (num < 1 || num > 50000) throw new Error('Radius must be between 1 and 50000 meters');
    return num;
  }).optional(),
});

/**
 * Property ID parameter schema
 */
export const propertyIdParamSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID format'),
});

/**
 * Distance calculation schema
 */
export const distanceSchema = z.object({
  origin: z.string().min(3, 'Origin is required'),
  destination: z.string().min(3, 'Destination is required'),
  mode: z.enum(['driving', 'walking', 'bicycling', 'transit'], {
    errorMap: () => ({ message: 'Mode must be: driving, walking, bicycling, or transit' }),
  }).optional().default('driving'),
});

/**
 * Directions schema
 */
export const directionsSchema = z.object({
  origin: z.string().min(3, 'Origin is required'),
  destination: z.string().min(3, 'Destination is required'),
  mode: z.enum(['driving', 'walking', 'bicycling', 'transit'], {
    errorMap: () => ({ message: 'Mode must be: driving, walking, bicycling, or transit' }),
  }).optional().default('driving'),
});

/**
 * Distance matrix schema
 */
export const distanceMatrixSchema = z.object({
  origin: z.string().min(3, 'Origin is required'),
  destinations: z.array(z.string().min(3, 'Destination must be at least 3 characters'))
    .min(1, 'At least one destination is required')
    .max(25, 'Maximum 25 destinations allowed'),
  mode: z.enum(['driving', 'walking', 'bicycling', 'transit'], {
    errorMap: () => ({ message: 'Mode must be: driving, walking, bicycling, or transit' }),
  }).optional().default('driving'),
});

/**
 * Autocomplete query schema
 */
export const autocompleteQuerySchema = z.object({
  input: z.string().min(2, 'Input must be at least 2 characters').max(200, 'Input too long'),
  lat: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error('Invalid latitude number');
    if (num < -90 || num > 90) throw new Error('Latitude must be between -90 and 90');
    return num;
  }).optional(),
  lng: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error('Invalid longitude number');
    if (num < -180 || num > 180) throw new Error('Longitude must be between -180 and 180');
    return num;
  }).optional(),
});

/**
 * Place ID parameter schema
 */
export const placeIdParamSchema = z.object({
  placeId: z.string().min(1, 'Place ID is required'),
});

/**
 * Properties map query schema
 */
export const propertiesMapQuerySchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
});

/**
 * Nearby properties query schema
 */
export const nearbyPropertiesQuerySchema = z.object({
  latitude: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error('Invalid latitude number');
    if (num < -90 || num > 90) throw new Error('Latitude must be between -90 and 90');
    return num;
  }),
  longitude: z.string().transform((val) => {
    const num = parseFloat(val);
    if (isNaN(num)) throw new Error('Invalid longitude number');
    if (num < -180 || num > 180) throw new Error('Longitude must be between -180 and 180');
    return num;
  }),
  radius: z.string().transform((val) => {
    const num = parseInt(val, 10);
    if (isNaN(num)) throw new Error('Invalid radius number');
    if (num < 1 || num > 50000) throw new Error('Radius must be between 1 and 50000 meters');
    return num;
  }).optional(),
  tenantId: z.string().uuid('Invalid tenant ID').optional(),
});

/**
 * Geocode property schema
 */
export const geocodePropertySchema = z.object({
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
});

/**
 * Update coordinates schema
 */
export const updateCoordinatesSchema = z.object({
  latitude: z.union([
    z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid latitude number');
      if (num < -90 || num > 90) throw new Error('Latitude must be between -90 and 90');
      return num;
    }),
  ]),
  longitude: z.union([
    z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid longitude number');
      if (num < -180 || num > 180) throw new Error('Longitude must be between -180 and 180');
      return num;
    }),
  ]),
});

/**
 * Batch geocode schema
 */
export const batchGeocodeSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  maxResults: z.number().int().min(1, 'Max results must be >= 1').max(100, 'Max results must be <= 100').optional(),
});

/**
 * Maps status query schema
 */
export const mapsStatusQuerySchema = z.object({
  validate: z.enum(['true', 'false']).optional(),
});

// Export types
export type GeocodeInput = z.infer<typeof geocodeSchema>;
export type ReverseGeocodeInput = z.infer<typeof reverseGeocodeSchema>;
export type ValidateAddressInput = z.infer<typeof validateAddressSchema>;
export type DistanceInput = z.infer<typeof distanceSchema>;
export type DirectionsInput = z.infer<typeof directionsSchema>;
export type DistanceMatrixInput = z.infer<typeof distanceMatrixSchema>;
export type AutocompleteQueryInput = z.infer<typeof autocompleteQuerySchema>;
export type PropertiesMapQueryInput = z.infer<typeof propertiesMapQuerySchema>;
export type NearbyPropertiesQueryInput = z.infer<typeof nearbyPropertiesQuerySchema>;
export type GeocodePropertyInput = z.infer<typeof geocodePropertySchema>;
export type UpdateCoordinatesInput = z.infer<typeof updateCoordinatesSchema>;
export type BatchGeocodeInput = z.infer<typeof batchGeocodeSchema>;
