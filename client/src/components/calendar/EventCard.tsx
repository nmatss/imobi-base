import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MapPin, Users, FileText, Building, Video, GripVertical } from "lucide-react";
import { format } from "date-fns";

export type EventType = 'visit' | 'followup' | 'meeting' | 'other';
export type EventStatus = 'pending' | 'completed' | 'cancelled';

export interface EventCardProps {
  id: string;
  type: EventType;
  title: string;
  startTime: Date;
  endTime: Date;
  client?: string;
  location?: string;
  status: EventStatus;
  participants?: number;
  hasNotes?: boolean;
  color: string;
  onClick?: (id: string) => void;
  compact?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

// Configuração de cores por tipo de evento
export const EVENT_TYPE_CONFIG = {
  visit: {
    label: 'Visita',
    color: '#3b82f6', // blue-500
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-500',
    icon: Building
  },
  followup: {
    label: 'Follow-up',
    color: '#22c55e', // green-500
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-500',
    icon: User
  },
  meeting: {
    label: 'Reunião',
    color: '#a855f7', // purple-500
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-500',
    icon: Users
  },
  other: {
    label: 'Outro',
    color: '#6b7280', // gray-500
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-500',
    icon: FileText
  }
};

const STATUS_CONFIG = {
  pending: {
    label: 'Pendente',
    variant: 'default' as const,
    className: 'bg-blue-100 text-blue-700'
  },
  completed: {
    label: 'Concluído',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-700'
  },
  cancelled: {
    label: 'Cancelado',
    variant: 'default' as const,
    className: 'bg-red-100 text-red-700'
  }
};

export function EventCard({
  id,
  type,
  title,
  startTime,
  endTime,
  client,
  location,
  status,
  participants,
  hasNotes,
  color,
  onClick,
  compact = false,
  draggable = false,
  onDragStart,
  onDragEnd
}: EventCardProps) {
  const typeConfig = EVENT_TYPE_CONFIG[type];
  const statusConfig = STATUS_CONFIG[status];
  const TypeIcon = typeConfig.icon;

  const handleClick = () => {
    if (onClick) {
      onClick(id);
    }
  };

  // Versão compacta para vista de mês
  if (compact) {
    return (
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={handleClick}
        className={cn(
          "group relative flex items-center gap-1.5 px-2 py-1 rounded text-xs cursor-pointer transition-all border-l-2",
          typeConfig.bgColor,
          typeConfig.textColor,
          draggable && "hover:shadow-sm active:scale-95 cursor-grab active:cursor-grabbing"
        )}
        style={{ borderLeftColor: color }}
      >
        {draggable && (
          <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0 -ml-1" />
        )}
        <Clock className="h-3 w-3 shrink-0" />
        <span className="font-medium truncate flex-1">
          {format(startTime, "HH:mm")} {title}
        </span>
      </div>
    );
  }

  // Versão completa para vistas de dia e semana
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      className={cn(
        "group relative rounded-lg border-l-4 bg-card shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer overflow-hidden",
        draggable && "cursor-grab active:cursor-grabbing hover:scale-[1.02] active:scale-[0.98]"
      )}
      style={{ borderLeftColor: color }}
    >
      {/* Header com horário e tipo */}
      <div className="flex items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          {draggable && (
            <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
          )}
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TypeIcon className="h-4 w-4" style={{ color }} />
          <Badge className={cn("text-[10px] px-2 py-0.5", statusConfig.className)}>
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="px-3 pb-3 space-y-2">
        {/* Título */}
        <h4 className="font-medium text-sm truncate">{title}</h4>

        {/* Cliente */}
        {client && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{client}</span>
          </div>
        )}

        {/* Localização */}
        {location && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        )}

        {/* Metadados adicionais */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {participants && participants > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{participants}</span>
            </div>
          )}
          {hasNotes && (
            <div className="flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" />
              <span>Notas</span>
            </div>
          )}
        </div>
      </div>

      {/* Barra de status lateral (hover) */}
      <div
        className="absolute inset-y-0 left-0 w-1 transition-all group-hover:w-1.5"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}
