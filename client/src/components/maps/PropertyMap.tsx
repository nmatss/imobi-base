import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bed, Bath, Maximize, MapPin, ExternalLink } from 'lucide-react';

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom marker icons by property type
const createCustomIcon = (color: string) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "><div style="
      transform: rotate(45deg);
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 12px;
      font-weight: bold;
    ">🏠</div></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const TYPE_COLORS: Record<string, string> = {
  apartment: '#3b82f6',
  house: '#22c55e',
  land: '#f59e0b',
  commercial: '#8b5cf6',
  default: '#6b7280',
};

interface Property {
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
}

interface PropertyMapProps {
  tenantId: string;
  onPropertyClick?: (propertyId: string) => void;
  selectedPropertyId?: string;
  height?: string;
  className?: string;
}

// Component to handle map bounds
function MapBounds({ properties }: { properties: Property[] }) {
  const map = useMap();

  useEffect(() => {
    if (properties.length > 0) {
      const bounds = L.latLngBounds(
        properties.map(p => [p.latitude, p.longitude] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [properties, map]);

  return null;
}

export function PropertyMap({
  tenantId,
  onPropertyClick,
  selectedPropertyId,
  height = '500px',
  className = '',
}: PropertyMapProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/properties/map?tenantId=${tenantId}`);
        if (!res.ok) throw new Error('Erro ao carregar imóveis');
        const data = await res.json();
        setProperties(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchProperties();
    }
  }, [tenantId]);

  const defaultCenter: [number, number] = useMemo(() => {
    if (properties.length > 0) {
      const avgLat = properties.reduce((sum, p) => sum + p.latitude, 0) / properties.length;
      const avgLng = properties.reduce((sum, p) => sum + p.longitude, 0) / properties.length;
      return [avgLat, avgLng];
    }
    return [-23.5505, -46.6333]; // São Paulo default
  }, [properties]);

  const formatPrice = (price: string, category: string) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(num);
    return category === 'rent' ? `${formatted}/mês` : formatted;
  };

  const getFirstImage = (images: string | null) => {
    if (!images) return null;
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return null;
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-destructive/10 rounded-lg ${className}`} style={{ height }}>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-muted/30 rounded-lg ${className}`} style={{ height }}>
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-30" />
          <p className="text-sm text-muted-foreground">Nenhum imóvel com localização cadastrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden border ${className}`} style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBounds properties={properties} />

        {properties.map((property) => {
          const icon = createCustomIcon(TYPE_COLORS[property.type] || TYPE_COLORS.default);
          const image = getFirstImage(property.images);
          const isSelected = property.id === selectedPropertyId;

          return (
            <Marker
              key={property.id}
              position={[property.latitude, property.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onPropertyClick?.(property.id),
              }}
            >
              <Popup>
                <Card className="border-0 shadow-none min-w-[250px]">
                  {image && (
                    <div className="relative h-32 -mx-3 -mt-3 mb-2 overflow-hidden rounded-t-lg">
                      <img
                        src={image}
                        alt={property.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge className="absolute top-2 left-2 text-xs">
                        {property.category === 'rent' ? 'Aluguel' : 'Venda'}
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-0">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {property.title}
                    </h3>
                    <p className="text-primary font-bold text-lg mb-2">
                      {formatPrice(property.price, property.category)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                      {property.bedrooms && (
                        <span className="flex items-center gap-1">
                          <Bed className="h-3 w-3" /> {property.bedrooms}
                        </span>
                      )}
                      {property.bathrooms && (
                        <span className="flex items-center gap-1">
                          <Bath className="h-3 w-3" /> {property.bathrooms}
                        </span>
                      )}
                      {property.area && (
                        <span className="flex items-center gap-1">
                          <Maximize className="h-3 w-3" /> {property.area}m²
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3" />
                      {property.city}
                    </p>
                    <Button
                      size="sm"
                      className="w-full gap-1"
                      onClick={() => onPropertyClick?.(property.id)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ver detalhes
                    </Button>
                  </CardContent>
                </Card>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

// Export a simpler version for property detail pages
export function PropertyLocationMap({
  latitude,
  longitude,
  title,
  height = '300px',
}: {
  latitude: number;
  longitude: number;
  title: string;
  height?: string;
}) {
  return (
    <div className="rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>{title}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
