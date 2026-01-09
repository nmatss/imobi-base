/**
 * Geocoding Service
 * Handles address geocoding and reverse geocoding with Google Maps API
 */

import googleMapsClient from "./google-maps-client";
import mapsCache from "./cache";
import type { AddressComponent, GeocodeResult as GoogleGeocodeResult } from "@googlemaps/google-maps-services-js";

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
  addressComponents: {
    street?: string;
    streetNumber?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    stateCode?: string;
    country?: string;
    countryCode?: string;
    postalCode?: string;
  };
  placeId?: string;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  addressComponents: GeocodeResult["addressComponents"];
  placeId?: string;
}

class GeocodingService {
  /**
   * Forward geocoding: Convert address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - geocoding skipped");
      return null;
    }

    // Check cache first
    const cached = mapsCache.getGeocoding(address);
    if (cached) {
      console.log(`📍 Geocoding cache hit: ${address}`);
      return cached;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const response = await client.geocode({
        params: {
          address,
          key: apiKey,
          language: "pt-BR" as any,
          region: "br",
        },
      });

      if (response.data.status !== "OK" || !response.data.results[0]) {
        console.warn(`Geocoding failed for address: ${address}`, response.data.status);
        return null;
      }

      const result = response.data.results[0];
      const geocodeResult = this.parseGeocodingResult(result);

      // Cache the result
      mapsCache.cacheGeocoding(address, geocodeResult);

      console.log(`✅ Geocoded: ${address} -> ${geocodeResult.latitude}, ${geocodeResult.longitude}`);
      return geocodeResult;
    } catch (error: any) {
      console.error("Geocoding error:", error.message);
      return null;
    }
  }

  /**
   * Reverse geocoding: Convert coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - reverse geocoding skipped");
      return null;
    }

    // Check cache first
    const cached = mapsCache.getReverseGeocoding(latitude, longitude);
    if (cached) {
      console.log(`📍 Reverse geocoding cache hit: ${latitude}, ${longitude}`);
      return cached;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const response = await client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: apiKey,
          language: "pt-BR" as any,
        },
      });

      if (response.data.status !== "OK" || !response.data.results[0]) {
        console.warn(`Reverse geocoding failed for: ${latitude}, ${longitude}`);
        return null;
      }

      const result = response.data.results[0];
      const reverseResult: ReverseGeocodeResult = {
        formattedAddress: result.formatted_address,
        addressComponents: this.parseAddressComponents(result.address_components),
        placeId: result.place_id,
      };

      // Cache the result
      mapsCache.cacheReverseGeocoding(latitude, longitude, reverseResult);

      console.log(`✅ Reverse geocoded: ${latitude}, ${longitude} -> ${reverseResult.formattedAddress}`);
      return reverseResult;
    } catch (error: any) {
      console.error("Reverse geocoding error:", error.message);
      return null;
    }
  }

  /**
   * Batch geocode multiple addresses
   */
  async batchGeocode(addresses: string[]): Promise<Map<string, GeocodeResult | null>> {
    const results = new Map<string, GeocodeResult | null>();

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(async (address) => {
        const result = await this.geocodeAddress(address);
        results.set(address, result);
      });

      await Promise.all(batchPromises);

      // Add delay between batches to respect rate limits
      if (i + batchSize < addresses.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * Validate and normalize address
   */
  async validateAddress(address: string): Promise<{ valid: boolean; normalized?: string }> {
    const result = await this.geocodeAddress(address);

    if (!result) {
      return { valid: false };
    }

    return {
      valid: true,
      normalized: result.formattedAddress,
    };
  }

  /**
   * Parse Google Maps geocoding result into our format
   */
  private parseGeocodingResult(result: GoogleGeocodeResult): GeocodeResult {
    return {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
      formattedAddress: result.formatted_address,
      addressComponents: this.parseAddressComponents(result.address_components),
      placeId: result.place_id,
    };
  }

  /**
   * Parse address components from Google Maps API response
   */
  private parseAddressComponents(components: AddressComponent[]): GeocodeResult["addressComponents"] {
    const parsed: GeocodeResult["addressComponents"] = {};

    for (const component of components) {
      const types = component.types as string[];

      if (types.includes("street_number")) {
        parsed.streetNumber = component.long_name;
      } else if (types.includes("route")) {
        parsed.street = component.long_name;
      } else if (types.includes("sublocality") || types.includes("neighborhood")) {
        parsed.neighborhood = component.long_name;
      } else if (types.includes("administrative_area_level_2") || types.includes("locality")) {
        parsed.city = component.long_name;
      } else if (types.includes("administrative_area_level_1")) {
        parsed.state = component.long_name;
        parsed.stateCode = component.short_name;
      } else if (types.includes("country")) {
        parsed.country = component.long_name;
        parsed.countryCode = component.short_name;
      } else if (types.includes("postal_code")) {
        parsed.postalCode = component.long_name;
      }
    }

    return parsed;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default new GeocodingService();
