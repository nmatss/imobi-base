/**
 * Property Location Enhancement
 * Auto-geocodes properties and maintains coordinate data
 */

import geocodingService, { type GeocodeResult } from "./geocoding-service";
import { db, schema } from "../../db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface PropertyLocationData {
  propertyId: string;
  latitude: number;
  longitude: number;
  geocodedAddress: string;
  manuallySet: boolean;
}

class PropertyLocationService {
  /**
   * Auto-geocode property on creation
   */
  async geocodeProperty(propertyId: string, address: string, city: string, state: string): Promise<GeocodeResult | null> {
    const fullAddress = `${address}, ${city}, ${state}, Brasil`;
    console.log(`🗺️  Geocoding property ${propertyId}: ${fullAddress}`);

    const result = await geocodingService.geocodeAddress(fullAddress);

    if (!result) {
      console.warn(`⚠️  Failed to geocode property ${propertyId}`);
      return null;
    }

    // Store coordinates in database
    await this.savePropertyCoordinates({
      propertyId,
      latitude: result.latitude,
      longitude: result.longitude,
      geocodedAddress: result.formattedAddress,
      manuallySet: false,
    });

    return result;
  }

  /**
   * Save property coordinates to database
   * NOTE: Requires propertyCoordinates table - currently disabled
   */
  async savePropertyCoordinates(data: PropertyLocationData): Promise<void> {
    console.warn('⚠️  PropertyCoordinates table not yet implemented in schema');
    // TODO: Add propertyCoordinates table to schema
    // Schema should include: id, propertyId, latitude, longitude, geocodedAddress, geocodedAt, manuallySet, createdAt, updatedAt
    return;

    /* DISABLED UNTIL SCHEMA IS UPDATED
    try {
      // Check if coordinates already exist
      const existing = await db
        .select()
        .from(schema.propertyCoordinates)
        .where(eq(schema.propertyCoordinates.propertyId, data.propertyId))
        .limit(1);

      const now = new Date().toISOString();

      if (existing.length > 0) {
        // Update existing coordinates
        await db
          .update(schema.propertyCoordinates)
          .set({
            latitude: data.latitude,
            longitude: data.longitude,
            geocodedAddress: data.geocodedAddress,
            geocodedAt: now,
            manuallySet: data.manuallySet,
            updatedAt: now,
          })
          .where(eq(schema.propertyCoordinates.propertyId, data.propertyId));

        console.log(`✅ Updated coordinates for property ${data.propertyId}`);
      } else {
        // Insert new coordinates
        await db.insert(schema.propertyCoordinates).values({
          id: nanoid(),
          propertyId: data.propertyId,
          latitude: data.latitude,
          longitude: data.longitude,
          geocodedAddress: data.geocodedAddress,
          geocodedAt: now,
          manuallySet: data.manuallySet,
          createdAt: now,
          updatedAt: now,
        });

        console.log(`✅ Saved coordinates for property ${data.propertyId}`);
      }
    } catch (error: any) {
      console.error(`Error saving property coordinates:`, error.message);
      throw error;
    }
    */
  }

  /**
   * Get property coordinates from database
   * NOTE: Requires propertyCoordinates table - currently disabled
   */
  async getPropertyCoordinates(propertyId: string): Promise<PropertyLocationData | null> {
    console.warn('⚠️  PropertyCoordinates table not yet implemented in schema');
    return null;

    /* DISABLED UNTIL SCHEMA IS UPDATED
    try {
      const [coords] = await db
        .select()
        .from(schema.propertyCoordinates)
        .where(eq(schema.propertyCoordinates.propertyId, propertyId))
        .limit(1);

      if (!coords) {
        return null;
      }

      return {
        propertyId: coords.propertyId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        geocodedAddress: coords.geocodedAddress || "",
        manuallySet: coords.manuallySet || false,
      };
    } catch (error: any) {
      console.error(`Error fetching property coordinates:`, error.message);
      return null;
    }
    */
  }

  /**
   * Get all properties with coordinates for map display
   * NOTE: Requires propertyCoordinates table - currently disabled
   */
  async getPropertiesWithCoordinates(tenantId: string): Promise<Array<{
    id: string;
    title: string;
    price: string;
    type: string;
    category: string;
    status: string;
    city: string;
    address: string;
    bedrooms: number | null;
    bathrooms: number | null;
    area: number | null;
    images: string | null;
    latitude: number;
    longitude: number;
  }>> {
    console.warn('⚠️  PropertyCoordinates table not yet implemented in schema');
    return [];

    /* DISABLED UNTIL SCHEMA IS UPDATED
    try {
      const results = await db
        .select({
          id: schema.properties.id,
          title: schema.properties.title,
          price: schema.properties.price,
          type: schema.properties.type,
          category: schema.properties.category,
          status: schema.properties.status,
          city: schema.properties.city,
          address: schema.properties.address,
          bedrooms: schema.properties.bedrooms,
          bathrooms: schema.properties.bathrooms,
          area: schema.properties.area,
          images: schema.properties.images,
          latitude: schema.propertyCoordinates.latitude,
          longitude: schema.propertyCoordinates.longitude,
        })
        .from(schema.properties)
        .innerJoin(
          schema.propertyCoordinates,
          eq(schema.properties.id, schema.propertyCoordinates.propertyId)
        )
        .where(eq(schema.properties.tenantId, tenantId));

      return results;
    } catch (error: any) {
      console.error(`Error fetching properties with coordinates:`, error.message);
      return [];
    }
    */
  }

  /**
   * Find properties within a radius (in meters)
   * NOTE: Requires propertyCoordinates table - currently disabled
   */
  async findNearbyProperties(
    latitude: number,
    longitude: number,
    radiusMeters: number = 5000,
    tenantId?: string
  ): Promise<Array<{
    id: string;
    title: string;
    address: string;
    city: string;
    price: string;
    type: string;
    category: string;
    latitude: number;
    longitude: number;
    distance: number;
  }>> {
    console.warn('⚠️  PropertyCoordinates table not yet implemented in schema');
    return [];

    /* DISABLED UNTIL SCHEMA IS UPDATED
    try {
      // Get all properties with coordinates
      let query = db
        .select({
          id: schema.properties.id,
          title: schema.properties.title,
          address: schema.properties.address,
          city: schema.properties.city,
          price: schema.properties.price,
          type: schema.properties.type,
          category: schema.properties.category,
          tenantId: schema.properties.tenantId,
          latitude: schema.propertyCoordinates.latitude,
          longitude: schema.propertyCoordinates.longitude,
        })
        .from(schema.properties)
        .innerJoin(
          schema.propertyCoordinates,
          eq(schema.properties.id, schema.propertyCoordinates.propertyId)
        );

      if (tenantId) {
        query = query.where(eq(schema.properties.tenantId, tenantId)) as any;
      }

      const allProperties = await query;

      // Calculate distance for each property using Haversine formula
      const propertiesWithDistance = allProperties
        .map((property: any) => {
          const distance = this.haversineDistance(
            latitude,
            longitude,
            property.latitude,
            property.longitude
          );

          return {
            id: property.id,
            title: property.title,
            address: property.address,
            city: property.city,
            price: property.price,
            type: property.type,
            category: property.category,
            latitude: property.latitude,
            longitude: property.longitude,
            distance,
          };
        })
        .filter((property: any) => property.distance <= radiusMeters)
        .sort((a: any, b: any) => a.distance - b.distance);

      console.log(`✅ Found ${propertiesWithDistance.length} properties within ${radiusMeters}m`);
      return propertiesWithDistance;
    } catch (error: any) {
      console.error(`Error finding nearby properties:`, error.message);
      return [];
    }
    */
  }

  /**
   * Batch geocode all properties without coordinates
   * NOTE: Requires propertyCoordinates table - currently disabled
   */
  async batchGeocodeProperties(tenantId: string): Promise<{
    success: number;
    failed: number;
    total: number;
  }> {
    console.warn('⚠️  PropertyCoordinates table not yet implemented in schema');
    return { success: 0, failed: 0, total: 0 };

    /* DISABLED UNTIL SCHEMA IS UPDATED
    try {
      // Get all properties without coordinates
      const properties = await db
        .select({
          id: schema.properties.id,
          address: schema.properties.address,
          city: schema.properties.city,
          state: schema.properties.state,
        })
        .from(schema.properties)
        .leftJoin(
          schema.propertyCoordinates,
          eq(schema.properties.id, schema.propertyCoordinates.propertyId)
        )
        .where(eq(schema.properties.tenantId, tenantId));

      const propertiesWithoutCoords = properties.filter(
        (p: any) => !p.property_coordinates
      );

      let success = 0;
      let failed = 0;

      console.log(`🗺️  Starting batch geocoding for ${propertiesWithoutCoords.length} properties`);

      for (const property of propertiesWithoutCoords) {
        const result = await this.geocodeProperty(
          property.properties.id,
          property.properties.address,
          property.properties.city,
          property.properties.state
        );

        if (result) {
          success++;
        } else {
          failed++;
        }

        // Add delay to respect rate limits
        await this.delay(100);
      }

      console.log(`✅ Batch geocoding complete: ${success} success, ${failed} failed`);

      return {
        success,
        failed,
        total: propertiesWithoutCoords.length,
      };
    } catch (error: any) {
      console.error(`Error in batch geocoding:`, error.message);
      throw error;
    }
    */
  }

  /**
   * Update property coordinates manually
   */
  async updateCoordinatesManually(
    propertyId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    // Reverse geocode to get address
    const result = await geocodingService.reverseGeocode(latitude, longitude);

    await this.savePropertyCoordinates({
      propertyId,
      latitude,
      longitude,
      geocodedAddress: result?.formattedAddress || "",
      manuallySet: true,
    });
  }

  /**
   * Calculate Haversine distance between two points
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new PropertyLocationService();
