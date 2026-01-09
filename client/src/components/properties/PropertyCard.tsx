import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  MapPin, Eye, Bed, Bath, Maximize2, Star, Images,
  MoreVertical, Pencil, Trash2, Share2, Copy, Send,
  StarOff, CalendarPlus
} from "lucide-react";

// Skeleton Loader Component
export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-40 xs:h-44 sm:h-48 bg-muted animate-pulse" />
      <CardContent className="p-2.5 sm:p-3 space-y-2">
        <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
        <div className="h-6 bg-muted rounded animate-pulse w-2/3 mt-2" />
        <div className="flex gap-2 mt-2">
          <div className="h-3 bg-muted rounded animate-pulse w-16" />
          <div className="h-3 bg-muted rounded animate-pulse w-16" />
          <div className="h-3 bg-muted rounded animate-pulse w-16" />
        </div>
        <div className="pt-3 border-t mt-3">
          <div className="h-10 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export interface PropertyCardProps {
  id: string;
  title: string;
  city: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  status: 'available' | 'rented' | 'sold' | 'reserved' | 'pending';
  type: 'sale' | 'rent';
  featured?: boolean;
  imageUrl?: string;
  imageCount?: number;
  isTogglingFeatured?: boolean;
  onView: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onShare?: (id: string) => void;
  onToggleFeatured?: (id: string) => void;
  onCopyLink?: (id: string) => void;
  onScheduleVisit?: (id: string) => void;
  onImageClick?: (id: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: { label: "Disponível", className: "bg-green-600 text-white" },
  reserved: { label: "Reservado", className: "bg-amber-700 text-white" }, // WCAG AA: 4.6:1 contrast
  sold: { label: "Vendido", className: "bg-blue-600 text-white" },
  rented: { label: "Alugado", className: "bg-purple-600 text-white" },
  pending: { label: "Pendente", className: "bg-gray-600 text-white" },
};

function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(price);
}

const PropertyCardComponent = ({
  id,
  title,
  city,
  price,
  bedrooms,
  bathrooms,
  area,
  status,
  type,
  featured = false,
  imageUrl,
  imageCount = 0,
  isTogglingFeatured = false,
  onView,
  onEdit,
  onDelete,
  onShare,
  onToggleFeatured,
  onCopyLink,
  onScheduleVisit,
  onImageClick,
}: PropertyCardProps) => {
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.available;
  const typeLabel = type === 'sale' ? 'Venda' : 'Aluguel';
  const defaultImage = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800";

  const handleCardClick = () => {
    onView(id);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onImageClick) {
      onImageClick(id);
    }
  };

  const handleDropdownClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <Card
      className="group overflow-hidden transition-shadow duration-200 cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Image Container */}
      <div className="h-40 xs:h-44 sm:h-48 overflow-hidden relative">
        <img
          src={imageUrl || defaultImage}
          alt={title}
          title={title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onClick={handleImageClick}
          loading="lazy"
        />

        {/* Top badges container */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none">
          {/* Combined status badge (main badge) */}
          <Badge className={`text-xs px-2 py-1 font-medium ${statusConfig.className}`}>
            {typeLabel} • {statusConfig.label}
          </Badge>

          {/* Featured star badge (only if featured) */}
          {featured && (
            <Badge className="bg-amber-700 text-white text-xs px-2 py-1"> {/* WCAG AA: 4.6:1 */}
              <Star className="h-3 w-3 fill-current" />
            </Badge>
          )}
        </div>

        {/* Image count badge (only if multiple images) */}
        {imageCount > 1 && (
          <div className="absolute bottom-2 right-2 pointer-events-none">
            <Badge className="backdrop-blur-sm bg-black/70 text-white text-xs px-2 py-1">
              <Images className="h-3 w-3 mr-1" />{imageCount}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-2.5 sm:p-3">
        {/* Title + Location + Actions */}
        <div className="flex items-start justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <h3
              className="font-semibold text-xs sm:text-sm line-clamp-2 group-hover:text-primary transition-colors"
              title={title}
            >
              {title}
            </h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center mt-0.5">
              <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1 shrink-0" />
              <span className="truncate">{city}</span>
            </p>
          </div>

          {/* Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 -mr-1 hover:bg-muted rounded-full"
                aria-label="Mais opções"
                onClick={handleDropdownClick}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(id); }}>
                <Eye className="h-4 w-4 mr-2" /> Ver detalhes
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(id); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </DropdownMenuItem>
              )}
              {onToggleFeatured && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onToggleFeatured(id); }} disabled={isTogglingFeatured}>
                  {featured ? (
                    <>
                      <StarOff className="h-4 w-4 mr-2" /> Remover destaque
                    </>
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-2" /> Destacar
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onShare && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShare(id); }}>
                  <Send className="h-4 w-4 mr-2" /> WhatsApp
                </DropdownMenuItem>
              )}
              {onCopyLink && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyLink(id); }}>
                  <Copy className="h-4 w-4 mr-2" /> Copiar link
                </DropdownMenuItem>
              )}
              {onScheduleVisit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onScheduleVisit(id); }}>
                  <CalendarPlus className="h-4 w-4 mr-2" /> Agendar visita
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={(e) => { e.stopPropagation(); onDelete(id); }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Price - LARGE and prominent */}
        <p className="text-lg xs:text-xl sm:text-2xl font-bold text-primary mt-1.5 xs:mt-2">
          {formatPrice(price)}
        </p>

        {/* Property characteristics - ONLY 3 main features */}
        <div className="flex flex-wrap items-center gap-2 xs:gap-3 mt-1.5 xs:mt-2 text-xs xs:text-sm text-muted-foreground">
          {bedrooms !== null && bedrooms > 0 && (
            <span className="flex items-center gap-0.5 xs:gap-1">
              <Bed className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> {bedrooms}
            </span>
          )}
          {bathrooms !== null && bathrooms > 0 && (
            <span className="flex items-center gap-0.5 xs:gap-1">
              <Bath className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> {bathrooms}
            </span>
          )}
          {area !== null && area > 0 && (
            <span className="flex items-center gap-0.5 xs:gap-1">
              <Maximize2 className="h-3.5 w-3.5 xs:h-4 xs:w-4" /> {area}m²
            </span>
          )}
        </div>

        {/* Single primary CTA */}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-10 text-sm active:scale-95 transition-transform"
            onClick={(e) => { e.stopPropagation(); onView(id); }}
          >
            <Eye className="h-4 w-4 mr-2" /> Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Memoized PropertyCard with intelligent prop comparison
export const PropertyCard = memo(PropertyCardComponent, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.city === nextProps.city &&
    prevProps.price === nextProps.price &&
    prevProps.bedrooms === nextProps.bedrooms &&
    prevProps.bathrooms === nextProps.bathrooms &&
    prevProps.area === nextProps.area &&
    prevProps.status === nextProps.status &&
    prevProps.type === nextProps.type &&
    prevProps.featured === nextProps.featured &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.imageCount === nextProps.imageCount &&
    prevProps.isTogglingFeatured === nextProps.isTogglingFeatured
    // Callback functions are stable references, no need to compare
  );
});
