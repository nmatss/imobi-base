/**
 * Places Service
 * Handles nearby places search, autocomplete, and amenities discovery
 */

import googleMapsClient from "./google-maps-client";
import mapsCache from "./cache";
import type { PlaceType1 } from "@googlemaps/google-maps-services-js";

export interface Place {
  placeId: string;
  name: string;
  address: string;
  types: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  rating?: number;
  userRatingsTotal?: number;
  photoReference?: string;
  distance?: number; // in meters
}

export interface NearbyPlacesOptions {
  latitude: number;
  longitude: number;
  radius?: number; // in meters, default 1000
  type?: PlaceType1;
  keyword?: string;
}

export interface WalkabilityScore {
  score: number; // 0-100
  category: "car-dependent" | "somewhat-walkable" | "very-walkable" | "walker's-paradise";
  nearbyAmenities: {
    schools: number;
    hospitals: number;
    supermarkets: number;
    publicTransport: number;
    parks: number;
    restaurants: number;
  };
  description: string;
}

class PlacesService {
  private readonly DEFAULT_RADIUS = 1000; // 1km
  private readonly WALKABILITY_RADIUS = 1000; // 1km for walkability calculation

  /**
   * Search nearby places
   */
  async searchNearby(options: NearbyPlacesOptions): Promise<Place[]> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - nearby search skipped");
      return [];
    }

    const radius = options.radius || this.DEFAULT_RADIUS;

    // Check cache first
    const cached = mapsCache.getNearbyPlaces(
      options.latitude,
      options.longitude,
      options.type || "all",
      radius
    );
    if (cached) {
      console.log(`📍 Nearby places cache hit`);
      return cached;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const params: any = {
        location: { lat: options.latitude, lng: options.longitude },
        radius,
        key: apiKey,
        language: "pt-BR" as any,
      };

      if (options.type) {
        params.type = options.type;
      }

      if (options.keyword) {
        params.keyword = options.keyword;
      }

      const response = await client.placesNearby({ params });

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        console.warn(`Nearby places search failed:`, response.data.status);
        return [];
      }

      const places = (response.data.results || []).map((result) => {
        const place: Place = {
          placeId: result.place_id || "",
          name: result.name || "",
          address: result.vicinity || "",
          types: result.types || [],
          location: {
            latitude: result.geometry?.location.lat || 0,
            longitude: result.geometry?.location.lng || 0,
          },
          rating: result.rating,
          userRatingsTotal: result.user_ratings_total,
          photoReference: result.photos?.[0]?.photo_reference,
        };

        // Calculate distance
        if (result.geometry?.location) {
          place.distance = this.calculateDistance(
            options.latitude,
            options.longitude,
            result.geometry.location.lat,
            result.geometry.location.lng
          );
        }

        return place;
      });

      // Cache the results
      mapsCache.cacheNearbyPlaces(
        options.latitude,
        options.longitude,
        options.type || "all",
        radius,
        places
      );

      console.log(`✅ Found ${places.length} nearby places`);
      return places;
    } catch (error: any) {
      console.error("Nearby places search error:", error.message);
      return [];
    }
  }

  /**
   * Find specific amenities near a location
   */
  async findAmenities(latitude: number, longitude: number, radius: number = 1000): Promise<{
    schools: Place[];
    hospitals: Place[];
    supermarkets: Place[];
    publicTransport: Place[];
    parks: Place[];
    restaurants: Place[];
  }> {
    const [schools, hospitals, supermarkets, publicTransport, parks, restaurants] = await Promise.all([
      this.searchNearby({ latitude, longitude, radius, type: "school" as PlaceType1 }),
      this.searchNearby({ latitude, longitude, radius, type: "hospital" as PlaceType1 }),
      this.searchNearby({ latitude, longitude, radius, type: "supermarket" as PlaceType1 }),
      this.searchNearby({ latitude, longitude, radius, type: "transit_station" as PlaceType1 }),
      this.searchNearby({ latitude, longitude, radius, type: "park" as PlaceType1 }),
      this.searchNearby({ latitude, longitude, radius, type: "restaurant" as PlaceType1 }),
    ]);

    return {
      schools,
      hospitals,
      supermarkets,
      publicTransport,
      parks,
      restaurants,
    };
  }

  /**
   * Calculate walkability score based on nearby amenities
   */
  async calculateWalkabilityScore(latitude: number, longitude: number): Promise<WalkabilityScore> {
    const amenities = await this.findAmenities(latitude, longitude, this.WALKABILITY_RADIUS);

    const counts = {
      schools: amenities.schools.length,
      hospitals: amenities.hospitals.length,
      supermarkets: amenities.supermarkets.length,
      publicTransport: amenities.publicTransport.length,
      parks: amenities.parks.length,
      restaurants: amenities.restaurants.length,
    };

    // Calculate score based on amenity counts and weights
    const weights = {
      schools: 10,
      hospitals: 10,
      supermarkets: 15,
      publicTransport: 20,
      parks: 15,
      restaurants: 10,
    };

    let score = 0;
    score += Math.min(counts.schools * weights.schools, weights.schools * 3);
    score += Math.min(counts.hospitals * weights.hospitals, weights.hospitals * 2);
    score += Math.min(counts.supermarkets * weights.supermarkets, weights.supermarkets * 3);
    score += Math.min(counts.publicTransport * weights.publicTransport, weights.publicTransport * 3);
    score += Math.min(counts.parks * weights.parks, weights.parks * 3);
    score += Math.min(counts.restaurants * weights.restaurants, weights.restaurants * 5);

    // Normalize to 0-100
    score = Math.min(score, 100);

    let category: WalkabilityScore["category"];
    let description: string;

    if (score >= 90) {
      category = "walker's-paradise";
      description = "Paraíso do pedestre - Você pode fazer quase tudo a pé";
    } else if (score >= 70) {
      category = "very-walkable";
      description = "Muito caminhável - A maioria das necessidades pode ser feita a pé";
    } else if (score >= 50) {
      category = "somewhat-walkable";
      description = "Razoavelmente caminhável - Algumas necessidades a pé";
    } else {
      category = "car-dependent";
      description = "Dependente de carro - A maioria das necessidades requer carro";
    }

    return {
      score: Math.round(score),
      category,
      nearbyAmenities: counts,
      description,
    };
  }

  /**
   * Autocomplete address search
   */
  async autocomplete(input: string, location?: { lat: number; lng: number }): Promise<Array<{
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
  }>> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - autocomplete skipped");
      return [];
    }

    if (!input || input.length < 3) {
      return [];
    }

    // Check cache first
    const cached = mapsCache.getAutocomplete(input);
    if (cached) {
      console.log(`📍 Autocomplete cache hit: ${input}`);
      return cached;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const params: any = {
        input,
        key: apiKey,
        language: "pt-BR" as any,
        components: ["country:br"],
      };

      if (location) {
        params.location = location;
        params.radius = 50000; // 50km radius
      }

      const response = await client.placeAutocomplete({ params });

      if (response.data.status !== "OK" && response.data.status !== "ZERO_RESULTS") {
        console.warn(`Autocomplete failed:`, response.data.status);
        return [];
      }

      const predictions = (response.data.predictions || []).map((prediction) => ({
        description: prediction.description,
        placeId: prediction.place_id,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
      }));

      // Cache the results
      mapsCache.cacheAutocomplete(input, predictions);

      return predictions;
    } catch (error: any) {
      console.error("Autocomplete error:", error.message);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId: string): Promise<{
    name: string;
    address: string;
    location: { latitude: number; longitude: number };
    phone?: string;
    website?: string;
    rating?: number;
    reviews?: number;
  } | null> {
    if (!googleMapsClient.isApiEnabled()) {
      console.warn("Google Maps API not configured - place details skipped");
      return null;
    }

    try {
      const client = googleMapsClient.getClient();
      const apiKey = googleMapsClient.getApiKey();

      const response = await client.placeDetails({
        params: {
          place_id: placeId,
          key: apiKey,
          language: "pt-BR" as any,
          fields: ["name", "formatted_address", "geometry", "formatted_phone_number", "website", "rating", "user_ratings_total"],
        },
      });

      if (response.data.status !== "OK" || !response.data.result) {
        console.warn(`Place details failed for: ${placeId}`);
        return null;
      }

      const result = response.data.result;

      return {
        name: result.name || "",
        address: result.formatted_address || "",
        location: {
          latitude: result.geometry?.location.lat || 0,
          longitude: result.geometry?.location.lng || 0,
        },
        phone: result.formatted_phone_number,
        website: result.website,
        rating: result.rating,
        reviews: result.user_ratings_total,
      };
    } catch (error: any) {
      console.error("Place details error:", error.message);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
}

export default new PlacesService();
