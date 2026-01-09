/**
 * Distance & Routing Service
 * Handles distance calculations, routing, and travel time estimations
 */

import googleMapsClient from "./google-maps-client";
import mapsCache from "./cache";
import type { TravelMode } from "@googlemaps/google-maps-services-js";

export interface DistanceResult {
  distance: {
    value: number; // in meters
    text: string;  // formatted (e.g., "5.2 km")
  };
  duration: {
    value: number; // in seconds
    text: string;  // formatted (e.g., "15 min")
  };
  mode: string;
}

export interface RouteResult {
  distance: DistanceResult["distance"];
  duration: DistanceResult["duration"];
  startAddress: string;
  endAddress: string;
  mode: string;
  steps?: Array<{
    instruction: string;
    distance: string;
    duration: string;
  }>;
  polyline?: string;
}

export interface DistanceMatrixResult {
  origin: string;
  destinations: Array<{
    address: string;
    distance: DistanceResult["distance"];
    duration: DistanceResult["duration"];
  }>;
}

class DistanceService {
  /**
   * Calculate distance between two points
   */
  async calculateDistance(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number },
    mode: TravelMode = "driving" as TravelMode
  ): Promise<DistanceResult | null> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - distance calculation skipped");
      return null;
    }

    const originStr = typeof origin === "string" ? origin : `${origin.lat},${origin.lng}`;
    const destStr = typeof destination === "string" ? destination : `${destination.lat},${destination.lng}`;

    // Check cache first
    const cached = mapsCache.getDistance(originStr, destStr, mode);
    if (cached) {
      console.log(`📍 Distance cache hit`);
      return cached;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const response = await client.distancematrix({
        params: {
          origins: [origin],
          destinations: [destination],
          mode,
          key: apiKey,
          language: "pt-BR" as any,
          units: "metric" as any,
        },
      });

      if (response.data.status !== "OK" || !response.data.rows[0]?.elements[0]) {
        console.warn(`Distance calculation failed:`, response.data.status);
        return null;
      }

      const element = response.data.rows[0].elements[0];

      if (element.status !== "OK") {
        console.warn(`Distance element failed:`, element.status);
        return null;
      }

      const result: DistanceResult = {
        distance: {
          value: element.distance.value,
          text: element.distance.text,
        },
        duration: {
          value: element.duration.value,
          text: element.duration.text,
        },
        mode,
      };

      // Cache the result
      mapsCache.cacheDistance(originStr, destStr, mode, result);

      console.log(`✅ Calculated distance: ${result.distance.text} (${result.duration.text})`);
      return result;
    } catch (error: any) {
      console.error("Distance calculation error:", error.message);
      return null;
    }
  }

  /**
   * Get driving directions between two points
   */
  async getDirections(
    origin: string | { lat: number; lng: number },
    destination: string | { lat: number; lng: number },
    mode: TravelMode = "driving" as TravelMode
  ): Promise<RouteResult | null> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - directions skipped");
      return null;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const response = await client.directions({
        params: {
          origin,
          destination,
          mode,
          key: apiKey,
          language: "pt-BR" as any,
          units: "metric" as any,
          alternatives: false,
        },
      });

      if (response.data.status !== "OK" || !response.data.routes[0]) {
        console.warn(`Directions failed:`, response.data.status);
        return null;
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      const steps = leg.steps.map((step) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ""), // Strip HTML
        distance: step.distance.text,
        duration: step.duration.text,
      }));

      const result: RouteResult = {
        distance: {
          value: leg.distance.value,
          text: leg.distance.text,
        },
        duration: {
          value: leg.duration.value,
          text: leg.duration.text,
        },
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        mode,
        steps,
        polyline: route.overview_polyline.points,
      };

      console.log(`✅ Got directions: ${result.distance.text} (${result.duration.text})`);
      return result;
    } catch (error: any) {
      console.error("Directions error:", error.message);
      return null;
    }
  }

  /**
   * Calculate distance from one origin to multiple destinations
   */
  async calculateDistanceMatrix(
    origin: string | { lat: number; lng: number },
    destinations: Array<string | { lat: number; lng: number }>,
    mode: TravelMode = "driving" as TravelMode
  ): Promise<DistanceMatrixResult | null> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - distance matrix skipped");
      return null;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const response = await client.distancematrix({
        params: {
          origins: [origin],
          destinations,
          mode,
          key: apiKey,
          language: "pt-BR" as any,
          units: "metric" as any,
        },
      });

      if (response.data.status !== "OK" || !response.data.rows[0]) {
        console.warn(`Distance matrix failed:`, response.data.status);
        return null;
      }

      const row = response.data.rows[0];
      const originAddress = response.data.origin_addresses[0];
      const destinationAddresses = response.data.destination_addresses;

      const results = row.elements.map((element, index) => ({
        address: destinationAddresses[index],
        distance: element.status === "OK" ? {
          value: element.distance.value,
          text: element.distance.text,
        } : { value: 0, text: "N/A" },
        duration: element.status === "OK" ? {
          value: element.duration.value,
          text: element.duration.text,
        } : { value: 0, text: "N/A" },
      }));

      const result: DistanceMatrixResult = {
        origin: originAddress,
        destinations: results,
      };

      console.log(`✅ Distance matrix calculated for ${destinations.length} destinations`);
      return result;
    } catch (error: any) {
      console.error("Distance matrix error:", error.message);
      return null;
    }
  }

  /**
   * Find properties within a certain distance from a point
   */
  async findNearbyProperties(
    properties: Array<{ id: string; latitude: number; longitude: number; address: string }>,
    targetLocation: { lat: number; lng: number },
    maxDistance: number = 5000 // meters
  ): Promise<Array<{ id: string; address: string; distance: number; duration: number }>> {
    const nearbyProperties: Array<{ id: string; address: string; distance: number; duration: number }> = [];

    // First, filter by straight-line distance (Haversine) to reduce API calls
    const candidateProperties = properties.filter((prop) => {
      const straightLineDistance = this.haversineDistance(
        targetLocation.lat,
        targetLocation.lng,
        prop.latitude,
        prop.longitude
      );
      return straightLineDistance <= maxDistance * 1.5; // Add buffer
    });

    // Then calculate actual driving distance for candidates
    for (const property of candidateProperties) {
      const result = await this.calculateDistance(
        targetLocation,
        { lat: property.latitude, lng: property.longitude },
        "driving" as TravelMode
      );

      if (result && result.distance.value <= maxDistance) {
        nearbyProperties.push({
          id: property.id,
          address: property.address,
          distance: result.distance.value,
          duration: result.duration.value,
        });
      }
    }

    // Sort by distance
    nearbyProperties.sort((a, b) => a.distance - b.distance);

    return nearbyProperties;
  }

  /**
   * Calculate straight-line distance using Haversine formula
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
   * Calculate travel time to work or important locations
   */
  async calculateCommuteTime(
    propertyLocation: { lat: number; lng: number },
    workLocation: { lat: number; lng: number }
  ): Promise<{
    driving?: DistanceResult;
    transit?: DistanceResult;
    walking?: DistanceResult;
  }> {
    const [driving, transit, walking] = await Promise.all([
      this.calculateDistance(propertyLocation, workLocation, "driving" as TravelMode),
      this.calculateDistance(propertyLocation, workLocation, "transit" as TravelMode),
      this.calculateDistance(propertyLocation, workLocation, "walking" as TravelMode),
    ]);

    return {
      ...(driving && { driving }),
      ...(transit && { transit }),
      ...(walking && { walking }),
    };
  }
}

export default new DistanceService();
