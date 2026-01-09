import React from "react";
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { School, Hospital, ShoppingCart, Bus, TreePine, UtensilsCrossed, MapPin, Star, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Place {
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
  distance?: number;
}

interface NearbyPlacesProps {
  propertyId: string;
  radius?: number;
}

interface Amenities {
  schools: Place[];
  hospitals: Place[];
  supermarkets: Place[];
  publicTransport: Place[];
  parks: Place[];
  restaurants: Place[];
}

interface WalkabilityScore {
  score: number;
  category: string;
  description: string;
  nearbyAmenities: {
    schools: number;
    hospitals: number;
    supermarkets: number;
    publicTransport: number;
    parks: number;
    restaurants: number;
  };
}

const ICONS = {
  schools: School,
  hospitals: Hospital,
  supermarkets: ShoppingCart,
  publicTransport: Bus,
  parks: TreePine,
  restaurants: UtensilsCrossed,
};

const LABELS = {
  schools: 'Escolas',
  hospitals: 'Hospitais',
  supermarkets: 'Supermercados',
  publicTransport: 'Transporte',
  parks: 'Parques',
  restaurants: 'Restaurantes',
};

export function NearbyPlaces({ propertyId, radius = 1000 }: NearbyPlacesProps) {
  const [amenities, setAmenities] = useState<Amenities | null>(null);
  const [walkability, setWalkability] = useState<WalkabilityScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNearbyPlaces();
    loadWalkability();
  }, [propertyId, radius]);

  const loadNearbyPlaces = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/maps/amenities/${propertyId}?radius=${radius}`);

      if (!response.ok) {
        throw new Error('Failed to load nearby places');
      }

      const data = await response.json();
      setAmenities(data);
    } catch (err: any) {
      console.error('Error loading nearby places:', err);
      setError(err.message || 'Failed to load nearby places');
    } finally {
      setLoading(false);
    }
  };

  const loadWalkability = async () => {
    try {
      const response = await fetch(`/api/maps/walkability/${propertyId}`);

      if (response.ok) {
        const data = await response.json();
        setWalkability(data);
      }
    } catch (err) {
      console.error('Error loading walkability:', err);
    }
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return '';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const getWalkabilityColor = (category: string): string => {
    switch (category) {
      case "walker's-paradise":
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'very-walkable':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'somewhat-walkable':
        return 'bg-amber-700 text-white dark:bg-amber-900 dark:text-amber-200'; // WCAG AA: 4.6:1 contrast
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!amenities) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Walkability Score */}
      {walkability && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Índice de Caminhabilidade</span>
              <Badge className={getWalkabilityColor(walkability.category)}>
                {walkability.score}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{walkability.description}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(LABELS).map(([key, label]) => {
                const Icon = ICONS[key as keyof typeof ICONS];
                const count = walkability.nearbyAmenities[key as keyof typeof walkability.nearbyAmenities];
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{label}:</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nearby Places Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Locais Próximos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="schools">
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 mb-4">
              {Object.entries(LABELS).map(([key, label]) => {
                const Icon = ICONS[key as keyof typeof ICONS];
                const count = amenities[key as keyof Amenities].length;
                return (
                  <TabsTrigger key={key} value={key} className="flex items-center gap-1.5">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{label}</span>
                    <Badge variant="secondary" className="ml-1">
                      {count}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(amenities).map(([key, places]) => (
              <TabsContent key={key} value={key} className="space-y-3">
                {places.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhum local encontrado nas proximidades
                  </p>
                ) : (
                  places.map((place: Place) => (
                    <div
                      key={place.placeId}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">{place.name}</h4>
                          {place.distance && (
                            <Badge variant="outline" className="flex-shrink-0">
                              {formatDistance(place.distance)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {place.address}
                        </p>
                        {place.rating && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-medium">{place.rating.toFixed(1)}</span>
                            {place.userRatingsTotal && (
                              <span className="text-xs text-muted-foreground">
                                ({place.userRatingsTotal})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
