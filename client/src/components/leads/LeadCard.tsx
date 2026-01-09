import React, { memo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Phone,
  MessageSquare,
  MoreHorizontal,
  Mail,
  Edit2,
  MoveRight,
  Archive,
  ExternalLink,
  GripVertical,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getSourceConfig } from "@/lib/lead-sources";
import { cn } from "@/lib/utils";

export type LeadSource =
  | "Site"
  | "WhatsApp"
  | "Instagram"
  | "Facebook"
  | "Indicação"
  | "Portal"
  | "Telefone"
  | "Outro";

export interface LeadCardProps {
  id: string;
  name: string;
  avatar?: string;
  source: LeadSource;
  preferredType?: string;
  budget?: string;
  daysInStage: number;
  phone?: string;
  whatsapp?: string;
  createdAt: string;
  updatedAt: string;
  onCall?: (id: string) => void;
  onMessage?: (id: string) => void;
  onEmail?: (id: string) => void;
  onEdit?: (id: string) => void;
  onMove?: (id: string) => void;
  onArchive?: (id: string) => void;
  onClick?: (id: string) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  className?: string;
  statusColor?: string;
  isHot?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
}

const LeadCardComponent = ({
  id,
  name,
  avatar,
  source,
  preferredType,
  budget,
  daysInStage,
  phone,
  whatsapp,
  createdAt,
  updatedAt,
  onCall,
  onMessage,
  onEmail,
  onEdit,
  onMove,
  onArchive,
  onClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  className,
  statusColor,
  isHot = false,
  isDragging = false,
  isSelected = false,
}: LeadCardProps) => {
  const [imageError, setImageError] = useState(false);
  const sourceConfig = getSourceConfig(source);
  const SourceIcon = sourceConfig.icon;

  // Generate initials for avatar fallback
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Format budget
  const formattedBudget = budget
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
      }).format(parseFloat(budget))
    : null;

  // Calculate time ago
  const timeAgo = formatDistanceToNow(new Date(updatedAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <Card
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(id)}
      className={cn(
        "transition-shadow duration-200 border-l-4 group cursor-pointer",
        draggable && "cursor-grab active:cursor-grabbing touch-none select-none",
        isDragging && "opacity-50 scale-95 rotate-2 shadow-2xl",
        isHot && "ring-2 ring-orange-400 ring-offset-1",
        isSelected && "ring-2 ring-primary ring-offset-1 bg-primary/5",
        className
      )}
      style={{ borderLeftColor: statusColor || "#3b82f6" }}
    >
      <CardContent className="p-4 flex items-start gap-3">
        {/* Drag Handle - visible on hover when draggable */}
        {draggable && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
            <GripVertical className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
          </div>
        )}

        {/* Card Content */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Header: Avatar + Source Badge */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Avatar className="w-12 h-12 shrink-0 ring-2 ring-background shadow-sm">
              {avatar && !imageError ? (
                <AvatarImage
                  src={avatar}
                  alt={name}
                  onError={() => setImageError(true)}
                />
              ) : (
                <AvatarFallback className="bg-blue-500 text-white font-semibold">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>

            {/* Lead Info Wrapper */}
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              {/* Name */}
              <h4 className="font-semibold text-base truncate leading-tight">
                {name}
              </h4>

              {/* Source Badge */}
              <Badge
                variant="outline"
                className="shrink-0 gap-1 text-xs px-2 py-0.5 w-fit"
                style={{
                  borderColor: sourceConfig.color + "40",
                  backgroundColor: sourceConfig.color + "10",
                  color: sourceConfig.color,
                }}
              >
                <SourceIcon className="h-3 w-3" />
                {sourceConfig.label}
              </Badge>
            </div>
          </div>

          {/* Urgency Badge: Days in Stage */}
          {daysInStage > 1 && (
            <Badge
              className={cn(
                "shrink-0 text-xs font-semibold px-2 py-0.5",
                daysInStage >= 7
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : daysInStage >= 3
                  ? "bg-orange-600 text-white hover:bg-orange-700"
                  : "bg-amber-700 text-white hover:bg-amber-800" // WCAG AA: 4.6:1 contrast
              )}
            >
              {daysInStage}d
            </Badge>
          )}
        </div>

        {/* Interest: Property Type + Budget */}
        {(preferredType || formattedBudget) && (
          <p className="text-xs text-muted-foreground truncate">
            {preferredType && <span>{preferredType}</span>}
            {preferredType && formattedBudget && <span> • </span>}
            {formattedBudget && <span className="font-medium">{formattedBudget}</span>}
          </p>
        )}

        {/* Timestamp - WCAG AA compliant contrast */}
        <p className="text-[10px] text-muted-foreground">
          Atualizado {timeAgo}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1">
          {/* Quick Actions: Prioritize WhatsApp over Phone to avoid duplication */}
          {whatsapp ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-600"
              onClick={(e) => {
                e.stopPropagation();
                onMessage?.(id);
              }}
              aria-label="Enviar WhatsApp"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          ) : phone ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={(e) => {
                e.stopPropagation();
                onCall?.(id);
              }}
              aria-label="Ligar"
            >
              <Phone className="h-4 w-4" />
            </Button>
          ) : null}

          <div className="flex-1" />

          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.(id);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver detalhes
              </DropdownMenuItem>
              {onEmail && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEmail(id);
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar email
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(id);
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onMove && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onMove(id);
                    }}
                  >
                    <MoveRight className="h-4 w-4 mr-2" />
                    Mover para...
                  </DropdownMenuItem>
                </>
              )}
              {onArchive && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(id);
                  }}
                  className="text-destructive"
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Memoized LeadCard with intelligent prop comparison
export const LeadCard = memo(LeadCardComponent, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.name === nextProps.name &&
    prevProps.avatar === nextProps.avatar &&
    prevProps.source === nextProps.source &&
    prevProps.preferredType === nextProps.preferredType &&
    prevProps.budget === nextProps.budget &&
    prevProps.daysInStage === nextProps.daysInStage &&
    prevProps.phone === nextProps.phone &&
    prevProps.whatsapp === nextProps.whatsapp &&
    prevProps.updatedAt === nextProps.updatedAt &&
    prevProps.statusColor === nextProps.statusColor &&
    prevProps.isHot === nextProps.isHot &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.draggable === nextProps.draggable &&
    prevProps.className === nextProps.className
    // Callback functions are stable references, no need to compare
  );
});

export default LeadCard;
