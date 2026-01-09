# Google Maps API Integration - Complete Guide

This document provides comprehensive documentation for the Google Maps API integration in ImobiBase.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Architecture](#architecture)
4. [Services](#services)
5. [API Routes](#api-routes)
6. [Components](#components)
7. [Caching Strategy](#caching-strategy)
8. [Cost Optimization](#cost-optimization)
9. [Usage Examples](#usage-examples)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Google Maps integration provides:

- **Geocoding**: Convert addresses to coordinates and vice versa
- **Places Search**: Find nearby amenities (schools, hospitals, restaurants, etc.)
- **Distance Calculations**: Calculate distances and travel times
- **Walkability Scores**: Automated scoring based on nearby amenities
- **Address Autocomplete**: Smart address input with suggestions
- **Map Visualization**: Interactive maps with clustering support

---

## Setup

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the following APIs:
   - Geocoding API
   - Places API
   - Distance Matrix API
   - Directions API
   - Maps JavaScript API
4. Create API credentials (API Key)
5. Set API key restrictions (recommended):
   - HTTP referrers for client-side
   - IP addresses for server-side

### 2. Configure Environment

Add to your `.env` file:

```bash
GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3. Install Dependencies

The required package is already installed:

```bash
npm install @googlemaps/google-maps-services-js
```

For client-side maps (already installed):

```bash
npm install leaflet react-leaflet react-leaflet-cluster
```

---

## Architecture

```
server/
  integrations/
    maps/
      google-maps-client.ts       # API client initialization
      geocoding-service.ts        # Address <-> Coordinates
      places-service.ts           # Nearby places & amenities
      distance-service.ts         # Distance & routing
      property-location.ts        # Property geocoding
      cache.ts                    # Caching layer
  routes-maps.ts                  # API endpoints

client/
  components/
    maps/
      PropertyMap.tsx             # Single property map
      PropertyListMap.tsx         # Multiple properties with clustering
      AddressAutocomplete.tsx     # Address input with suggestions
      NearbyPlaces.tsx            # Nearby amenities display
```

---

## Services

### Geocoding Service

**Purpose**: Convert addresses to coordinates and vice versa.

```typescript
import geocodingService from './integrations/maps/geocoding-service';

// Forward geocoding
const result = await geocodingService.geocodeAddress(
  'Av. Paulista, 1578 - Bela Vista, São Paulo - SP'
);
// Returns: { latitude, longitude, formattedAddress, addressComponents }

// Reverse geocoding
const address = await geocodingService.reverseGeocode(-23.5505, -46.6333);

// Validate address
const { valid, normalized } = await geocodingService.validateAddress(address);

// Batch geocoding
const results = await geocodingService.batchGeocode([address1, address2, ...]);
```

### Places Service

**Purpose**: Find nearby places and calculate walkability.

```typescript
import placesService from './integrations/maps/places-service';

// Search nearby places
const places = await placesService.searchNearby({
  latitude: -23.5505,
  longitude: -46.6333,
  radius: 1000, // meters
  type: 'school',
});

// Find all amenities
const amenities = await placesService.findAmenities(lat, lng, 1000);
// Returns: { schools, hospitals, supermarkets, publicTransport, parks, restaurants }

// Calculate walkability score
const score = await placesService.calculateWalkabilityScore(lat, lng);
// Returns: { score: 0-100, category, description, nearbyAmenities }

// Address autocomplete
const suggestions = await placesService.autocomplete('Av. Paul');

// Get place details
const details = await placesService.getPlaceDetails(placeId);
```

### Distance Service

**Purpose**: Calculate distances and get directions.

```typescript
import distanceService from './integrations/maps/distance-service';

// Calculate distance
const distance = await distanceService.calculateDistance(
  originAddress,
  destinationAddress,
  'driving' // or 'walking', 'transit', 'bicycling'
);
// Returns: { distance: { value, text }, duration: { value, text }, mode }

// Get directions
const route = await distanceService.getDirections(origin, destination, 'driving');
// Returns: { distance, duration, steps, polyline }

// Distance matrix (one to many)
const matrix = await distanceService.calculateDistanceMatrix(
  origin,
  [dest1, dest2, dest3],
  'driving'
);

// Find nearby properties
const nearby = await distanceService.findNearbyProperties(
  properties,
  targetLocation,
  5000 // max distance in meters
);

// Calculate commute time
const commute = await distanceService.calculateCommuteTime(
  propertyLocation,
  workLocation
);
// Returns: { driving, transit, walking }
```

### Property Location Service

**Purpose**: Auto-geocode properties and manage coordinates.

```typescript
import propertyLocationService from './integrations/maps/property-location';

// Geocode property
const result = await propertyLocationService.geocodeProperty(
  propertyId,
  address,
  city,
  state
);

// Save coordinates
await propertyLocationService.savePropertyCoordinates({
  propertyId,
  latitude,
  longitude,
  geocodedAddress,
  manuallySet: false,
});

// Get property coordinates
const coords = await propertyLocationService.getPropertyCoordinates(propertyId);

// Get all properties with coordinates
const properties = await propertyLocationService.getPropertiesWithCoordinates(tenantId);

// Find nearby properties
const nearby = await propertyLocationService.findNearbyProperties(
  latitude,
  longitude,
  5000, // radius in meters
  tenantId
);

// Batch geocode all properties
const result = await propertyLocationService.batchGeocodeProperties(tenantId);
// Returns: { success, failed, total }

// Update coordinates manually
await propertyLocationService.updateCoordinatesManually(
  propertyId,
  latitude,
  longitude
);
```

---

## API Routes

All routes are prefixed with `/api/maps`.

### Geocoding

```http
POST /api/maps/geocode
Body: { address: string }
Returns: GeocodeResult

POST /api/maps/reverse-geocode
Body: { latitude: number, longitude: number }
Returns: ReverseGeocodeResult

POST /api/maps/validate-address
Body: { address: string }
Returns: { valid: boolean, normalized?: string }
```

### Places

```http
GET /api/maps/nearby/:propertyId?type=school&radius=1000
Returns: Place[]

GET /api/maps/amenities/:propertyId?radius=1000
Returns: { schools: Place[], hospitals: Place[], ... }

GET /api/maps/walkability/:propertyId
Returns: WalkabilityScore

GET /api/maps/autocomplete?input=Av.+Paul&lat=-23.5&lng=-46.6
Returns: AddressSuggestion[]

GET /api/maps/place/:placeId
Returns: PlaceDetails
```

### Distance & Routing

```http
POST /api/maps/distance
Body: { origin: string|LatLng, destination: string|LatLng, mode?: string }
Returns: DistanceResult

POST /api/maps/directions
Body: { origin: string|LatLng, destination: string|LatLng, mode?: string }
Returns: RouteResult

POST /api/maps/distance-matrix
Body: { origin: string|LatLng, destinations: Array, mode?: string }
Returns: DistanceMatrixResult
```

### Properties

```http
GET /api/maps/properties/map?tenantId=xxx
Returns: Property[]

GET /api/maps/properties/nearby?latitude=-23.5&longitude=-46.6&radius=5000&tenantId=xxx
Returns: NearbyProperty[]

POST /api/maps/properties/:propertyId/geocode
Body: { address: string, city: string, state: string }
Returns: GeocodeResult

PUT /api/maps/properties/:propertyId/coordinates
Body: { latitude: number, longitude: number }
Returns: { success: boolean }

POST /api/maps/properties/batch-geocode
Body: { tenantId: string }
Returns: { success: number, failed: number, total: number }
```

### Admin

```http
GET /api/maps/status?validate=true
Returns: { enabled: boolean, apiKeyConfigured: boolean, apiKeyValid?: boolean, cache: CacheStats }

DELETE /api/maps/cache
Returns: { success: boolean }
```

---

## Components

### AddressAutocomplete

Smart address input with Google Places autocomplete.

```tsx
import { AddressAutocomplete } from '@/components/maps';

<AddressAutocomplete
  value={address}
  onChange={setAddress}
  onSelect={(suggestion) => {
    console.log('Selected:', suggestion);
  }}
  label="Endereço"
  placeholder="Digite o endereço..."
  required
/>
```

### NearbyPlaces

Display nearby amenities with walkability score.

```tsx
import { NearbyPlaces } from '@/components/maps';

<NearbyPlaces
  propertyId={property.id}
  radius={1000} // meters
/>
```

### PropertyMap

Display single property on map.

```tsx
import { PropertyLocationMap } from '@/components/maps';

<PropertyLocationMap
  latitude={property.latitude}
  longitude={property.longitude}
  title={property.title}
  height="400px"
/>
```

### PropertyListMap

Display multiple properties with clustering.

```tsx
import { PropertyListMap } from '@/components/maps';

<PropertyListMap
  tenantId={tenantId}
  onPropertyClick={(propertyId) => navigate(`/properties/${propertyId}`)}
  selectedPropertyId={currentPropertyId}
  height="600px"
  enableClustering={true}
/>
```

---

## Caching Strategy

The integration implements aggressive caching to minimize API costs:

| Cache Type | TTL | Reason |
|------------|-----|--------|
| Geocoding | 30 days | Addresses rarely change |
| Reverse Geocoding | 30 days | Coordinates are static |
| Places | 1 day | Places can change |
| Distance | 7 days | Routes change occasionally |
| Autocomplete | 1 hour | Needs to be fresh |

**Cache Statistics**:

```typescript
import mapsCache from './integrations/maps/cache';

const stats = mapsCache.getStats();
// Returns: { size: number, keys: string[] }

mapsCache.clear(); // Clear all cache
```

**How Caching Works**:

1. Check cache before making API request
2. Return cached result if found and not expired
3. Make API request if cache miss
4. Store result in cache with appropriate TTL
5. Background cleanup every hour to remove expired entries

---

## Cost Optimization

### Google Maps API Pricing (as of 2024)

**Free Tier**:
- 28,000 geocoding requests/month
- 40,000 places requests/month
- 40,000 distance matrix requests/month

**Best Practices to Reduce Costs**:

1. **Aggressive Caching** ✅
   - Implemented: 30-day cache for geocoding
   - Reduces repeated requests by ~90%

2. **Batch Operations** ✅
   - Use `batchGeocode()` for multiple properties
   - Add delays between batches to respect rate limits

3. **Store Coordinates** ✅
   - All coordinates stored in `property_coordinates` table
   - Maps work offline with stored data
   - Only geocode new/updated properties

4. **Lazy Loading**
   - Only load nearby places when user requests
   - Use radius limits (default 1km)

5. **Client-Side Maps**
   - Using Leaflet (free) instead of Google Maps JavaScript API
   - OpenStreetMap tiles (free)
   - Only use Google APIs for data, not visualization

### Cost Monitoring

Check API usage:

```bash
# Get cache statistics
GET /api/maps/status

# Clear cache if needed (forces fresh API calls)
DELETE /api/maps/cache
```

Monitor in Google Cloud Console:
- APIs & Services > Dashboard
- Check daily request counts
- Set budget alerts

---

## Usage Examples

### Example 1: Auto-geocode Property on Creation

```typescript
// In property creation handler
app.post('/api/properties', async (req, res) => {
  const property = await storage.createProperty(req.body);

  // Auto-geocode in background
  propertyLocationService.geocodeProperty(
    property.id,
    property.address,
    property.city,
    property.state
  ).catch(err => console.error('Geocoding failed:', err));

  res.json(property);
});
```

### Example 2: Search Properties Near Location

```tsx
const SearchNearby = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyProperties, setNearbyProperties] = useState([]);

  const findNearby = async () => {
    // Get user location
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;

      // Find properties within 5km
      const res = await fetch(
        `/api/maps/properties/nearby?latitude=${latitude}&longitude=${longitude}&radius=5000`
      );
      const properties = await res.json();
      setNearbyProperties(properties);
    });
  };

  return (
    <button onClick={findNearby}>
      Encontrar imóveis próximos
    </button>
  );
};
```

### Example 3: Calculate Commute Time

```tsx
const CommuteCalculator = ({ propertyId }) => {
  const [workAddress, setWorkAddress] = useState('');
  const [commute, setCommute] = useState(null);

  const calculate = async () => {
    // Get property coordinates
    const propertyRes = await fetch(`/api/maps/properties/${propertyId}/coordinates`);
    const property = await propertyRes.json();

    // Calculate commute
    const res = await fetch('/api/maps/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: property.latitude, lng: property.longitude },
        destination: workAddress,
        mode: 'driving',
      }),
    });

    const route = await res.json();
    setCommute(route);
  };

  return (
    <div>
      <AddressAutocomplete
        value={workAddress}
        onChange={setWorkAddress}
        label="Endereço do Trabalho"
      />
      <button onClick={calculate}>Calcular Tempo</button>
      {commute && (
        <p>
          Distância: {commute.distance.text}
          Tempo: {commute.duration.text}
        </p>
      )}
    </div>
  );
};
```

### Example 4: Batch Geocode All Properties

```bash
# Admin task to geocode all properties without coordinates
POST /api/maps/properties/batch-geocode
Body: { tenantId: "tenant-id" }

# Response:
{
  "success": 45,
  "failed": 2,
  "total": 47
}
```

---

## Troubleshooting

### API Key Not Working

**Symptoms**: Error "Google Maps API is not configured"

**Solutions**:
1. Check `.env` file has `GOOGLE_MAPS_API_KEY`
2. Restart server after adding key
3. Validate key: `GET /api/maps/status?validate=true`
4. Check API restrictions in Google Cloud Console

### Geocoding Fails

**Symptoms**: Properties not showing on map

**Causes**:
- Incomplete addresses (missing city/state)
- Invalid address format
- API quota exceeded

**Solutions**:
```bash
# Check property address
SELECT id, address, city, state FROM properties WHERE id = ?

# Manually geocode
POST /api/maps/properties/:propertyId/geocode
Body: { address: "...", city: "...", state: "..." }

# Check API status
GET /api/maps/status
```

### Cache Issues

**Symptoms**: Outdated data showing

**Solutions**:
```bash
# Clear cache
DELETE /api/maps/cache

# Check cache stats
GET /api/maps/status
```

### Rate Limits

**Symptoms**: "OVER_QUERY_LIMIT" errors

**Solutions**:
1. Implement delays in batch operations (already done)
2. Monitor daily usage in Google Cloud Console
3. Upgrade to paid plan if needed
4. Reduce batch sizes

### Map Not Displaying

**Symptoms**: Blank map or errors

**Causes**:
- Missing Leaflet CSS
- JavaScript errors
- No properties with coordinates

**Solutions**:
```tsx
// Ensure CSS is imported
import 'leaflet/dist/leaflet.css';

// Check console for errors
// Verify properties have coordinates
GET /api/maps/properties/map?tenantId=xxx
```

---

## Database Schema

The `property_coordinates` table stores geocoded data:

```sql
CREATE TABLE property_coordinates (
  id TEXT PRIMARY KEY,
  property_id TEXT NOT NULL UNIQUE,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  geocoded_address TEXT,
  geocoded_at TEXT,
  manually_set INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (property_id) REFERENCES properties(id)
);
```

---

## Security Considerations

1. **API Key Protection**:
   - Never expose API key in client-side code
   - All API calls go through backend
   - Set API restrictions in Google Cloud Console

2. **Rate Limiting**:
   - Already implemented in routes
   - 500 requests per 15 minutes

3. **Input Validation**:
   - All user inputs sanitized
   - Coordinates validated before storage

4. **Caching Security**:
   - Cache is server-side only
   - No sensitive data in cache keys

---

## Support

For issues or questions:

1. Check this documentation
2. Review error logs in server console
3. Verify Google Cloud Console for API issues
4. Check cache statistics: `GET /api/maps/status`

---

## Changelog

### Version 1.0 (2024-12-24)
- Initial implementation
- Geocoding service with caching
- Places service with walkability scores
- Distance and routing calculations
- Property location management
- React components for maps and autocomplete
- Comprehensive API routes
- Cost optimization with aggressive caching

---

**Generated by Agent 7 - Maps & Geocoding Engineer**
