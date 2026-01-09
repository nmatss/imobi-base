/**
 * Maps Caching Strategy
 * Implements aggressive caching to reduce API costs
 * Google Maps Free Tier: 28,000 geocoding requests/month, 40,000 places/month
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MapsCache {
  private static instance: MapsCache;
  private cache: Map<string, CacheEntry<any>>;

  // Cache TTL configurations (in milliseconds)
  private readonly TTL = {
    GEOCODING: 30 * 24 * 60 * 60 * 1000,      // 30 days - addresses rarely change
    REVERSE_GEOCODING: 30 * 24 * 60 * 60 * 1000, // 30 days
    PLACES: 24 * 60 * 60 * 1000,              // 1 day - places can change
    DISTANCE: 7 * 24 * 60 * 60 * 1000,        // 7 days - routes change occasionally
    AUTOCOMPLETE: 60 * 60 * 1000,             // 1 hour - needs to be fresh
  };

  private constructor() {
    this.cache = new Map();
    this.startCleanupInterval();
  }

  public static getInstance(): MapsCache {
    if (!MapsCache.instance) {
      MapsCache.instance = new MapsCache();
    }
    return MapsCache.instance;
  }

  /**
   * Generate a cache key from parameters
   */
  private generateKey(prefix: string, params: any): string {
    const paramsString = JSON.stringify(params);
    return `${prefix}:${paramsString}`;
  }

  /**
   * Get value from cache
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  public set<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };
    this.cache.set(key, entry);
  }

  /**
   * Cache geocoding result
   */
  public cacheGeocoding(address: string, result: any): void {
    const key = this.generateKey("geocode", { address });
    this.set(key, result, this.TTL.GEOCODING);
  }

  /**
   * Get cached geocoding result
   */
  public getGeocoding(address: string): any | null {
    const key = this.generateKey("geocode", { address });
    return this.get(key);
  }

  /**
   * Cache reverse geocoding result
   */
  public cacheReverseGeocoding(lat: number, lng: number, result: any): void {
    const key = this.generateKey("reverse", { lat, lng });
    this.set(key, result, this.TTL.REVERSE_GEOCODING);
  }

  /**
   * Get cached reverse geocoding result
   */
  public getReverseGeocoding(lat: number, lng: number): any | null {
    const key = this.generateKey("reverse", { lat, lng });
    return this.get(key);
  }

  /**
   * Cache nearby places result
   */
  public cacheNearbyPlaces(lat: number, lng: number, type: string, radius: number, result: any): void {
    const key = this.generateKey("nearby", { lat, lng, type, radius });
    this.set(key, result, this.TTL.PLACES);
  }

  /**
   * Get cached nearby places result
   */
  public getNearbyPlaces(lat: number, lng: number, type: string, radius: number): any | null {
    const key = this.generateKey("nearby", { lat, lng, type, radius });
    return this.get(key);
  }

  /**
   * Cache distance calculation
   */
  public cacheDistance(origin: string, destination: string, mode: string, result: any): void {
    const key = this.generateKey("distance", { origin, destination, mode });
    this.set(key, result, this.TTL.DISTANCE);
  }

  /**
   * Get cached distance calculation
   */
  public getDistance(origin: string, destination: string, mode: string): any | null {
    const key = this.generateKey("distance", { origin, destination, mode });
    return this.get(key);
  }

  /**
   * Cache autocomplete results
   */
  public cacheAutocomplete(input: string, result: any): void {
    const key = this.generateKey("autocomplete", { input });
    this.set(key, result, this.TTL.AUTOCOMPLETE);
  }

  /**
   * Get cached autocomplete results
   */
  public getAutocomplete(input: string): any | null {
    const key = this.generateKey("autocomplete", { input });
    return this.get(key);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  public getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired entries every hour
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      const entries = Array.from(this.cache.entries());
      for (const [key, entry] of entries) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Maps cache cleanup: removed ${cleaned} expired entries`);
      }
    }, 60 * 60 * 1000); // Run every hour
  }
}

export default MapsCache.getInstance();
