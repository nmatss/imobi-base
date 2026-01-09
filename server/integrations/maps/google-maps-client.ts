/**
 * Google Maps Client
 * Manages Google Maps API client initialization and configuration
 */

import { Client } from "@googlemaps/google-maps-services-js";

class GoogleMapsClient {
  private static instance: GoogleMapsClient;
  private client: Client;
  private apiKey: string;
  private isEnabled: boolean;

  private constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
    this.isEnabled = !!this.apiKey;

    if (!this.isEnabled) {
      console.warn("⚠️  Google Maps API key not configured. Maps features will be disabled.");
      console.warn("   Set GOOGLE_MAPS_API_KEY in your .env file to enable maps.");
    } else {
      console.log("✅ Google Maps API client initialized");
    }

    this.client = new Client({});
  }

  public static getInstance(): GoogleMapsClient {
    if (!GoogleMapsClient.instance) {
      GoogleMapsClient.instance = new GoogleMapsClient();
    }
    return GoogleMapsClient.instance;
  }

  public getClient(): Client {
    if (!this.isEnabled) {
      throw new Error("Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in your environment.");
    }
    return this.client;
  }

  public getApiKey(): string {
    if (!this.isEnabled) {
      throw new Error("Google Maps API is not configured. Please set GOOGLE_MAPS_API_KEY in your environment.");
    }
    return this.apiKey;
  }

  public isApiEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Check if the API key is valid by making a test request
   */
  public async validateApiKey(): Promise<boolean> {
    if (!this.isEnabled) {
      return false;
    }

    try {
      const response = await this.client.geocode({
        params: {
          address: "São Paulo, SP, Brazil",
          key: this.apiKey,
        },
      });
      return response.status === 200 && response.data.status === "OK";
    } catch (error) {
      console.error("Google Maps API key validation failed:", error);
      return false;
    }
  }
}

export default GoogleMapsClient.getInstance();
