import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  User,
  MoreVertical,
  Eye,
  Phone,
  ArrowRight,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  GripVertical,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types
export interface SaleOpportunity {
  id: string;
  property: {
    id: string;
    address: string;
    imageUrl?: string;
    askingPrice: number;
  };
  buyer: {
    name: string;
    avatar?: string;
  };
  proposedValue: number;
  stage: string;
  daysInStage: number;
  createdAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  opportunities: SaleOpportunity[];
  totalValue: number;
  color: string;
}

export interface SalesPipelineProps {
  stages: PipelineStage[];
  onMoveStage?: (opportunityId: string, newStage: string) => void;
  onViewOpportunity?: (opportunityId: string) => void;
  onContactBuyer?: (buyerId: string) => void;
}

// Helper to calculate percentage of asking price
const calculatePricePercentage = (proposed: number, asking: number): number => {
  return Math.round((proposed / asking) * 100);
};

// Helper to get badge variant based on percentage
const getPriceBadgeVariant = (percentage: number): "default" | "secondary" | "destructive" => {
  if (percentage >= 90) return "default";
  if (percentage >= 80) return "secondary";
  return "destructive";
};

// Format currency
const formatPrice = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Opportunity Card Component
interface OpportunityCardProps {
  opportunity: SaleOpportunity;
  onMoveStage?: (stageId: string) => void;
  onView?: () => void;
  onContact?: () => void;
  availableStages: PipelineStage[];
  isDragging?: boolean;
}

function OpportunityCard({
  opportunity,
  onMoveStage,
  onView,
  onContact,
  availableStages,
  isDragging = false,
}: OpportunityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: opportunity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const percentage = calculatePricePercentage(
    opportunity.proposedValue,
    opportunity.property.askingPrice
  );
  const badgeVariant = getPriceBadgeVariant(percentage);

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "group hover:shadow-md transition-all duration-200",
        isSortableDragging && "shadow-lg ring-2 ring-primary ring-offset-2",
        isDragging && "cursor-grabbing"
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Property Image and Address with Drag Handle */}
        <div className="flex items-start gap-3">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none p-1 hover:bg-muted rounded transition-colors flex-shrink-0 mt-1"
            aria-label="Arrastar card"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-muted">
            {opportunity.property.imageUrl ? (
              <img
                src={opportunity.property.imageUrl}
                alt={opportunity.property.address}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
              {opportunity.property.address}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Pedido: {formatPrice(opportunity.property.askingPrice)}
            </p>
          </div>
        </div>

        {/* Buyer Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={opportunity.buyer.avatar} />
            <AvatarFallback className="text-xs">
              {getInitials(opportunity.buyer.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              {opportunity.buyer.name}
            </p>
          </div>
        </div>

        {/* Proposed Value - HIGHLIGHT */}
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Proposta</p>
              <p className="text-lg font-bold text-primary">
                {formatPrice(opportunity.proposedValue)}
              </p>
            </div>
            <Badge variant={badgeVariant} className="gap-1">
              {percentage >= 100 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {percentage}%
            </Badge>
          </div>
        </div>

        {/* Days in Stage */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {opportunity.daysInStage === 0
              ? "Hoje"
              : opportunity.daysInStage === 1
              ? "1 dia neste estágio"
              : `${opportunity.daysInStage} dias neste estágio`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onView}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={onContact}
          >
            <Phone className="h-3.5 w-3.5 mr-1" />
            Contato
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableStages
                .filter((s) => s.id !== opportunity.stage)
                .map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => onMoveStage?.(stage.id)}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Mover para {stage.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// Stage Column Component
interface StageColumnProps {
  stage: PipelineStage;
  onMoveStage?: (opportunityId: string, newStage: string) => void;
  onViewOpportunity?: (opportunityId: string) => void;
  onContactBuyer?: (buyerId: string) => void;
  availableStages: PipelineStage[];
}

function StageColumn({
  stage,
  onMoveStage,
  onViewOpportunity,
  onContactBuyer,
  availableStages,
}: StageColumnProps) {
  const opportunityIds = stage.opportunities.map((opp) => opp.id);

  return (
    <div className="flex-shrink-0 w-[300px] sm:w-[320px] space-y-3">
      {/* Stage Header - ENHANCED */}
      <Card
        className="border-2 transition-colors"
        style={{ borderColor: `${stage.color}40` }}
      >
        <CardHeader className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />
              <CardTitle className="text-sm font-semibold">
                {stage.name}
              </CardTitle>
            </div>
            {/* CONTADOR DE LEADS */}
            <Badge
              variant="secondary"
              className="text-xs font-bold px-2.5 py-1"
              style={{
                backgroundColor: `${stage.color}20`,
                color: stage.color,
                borderColor: `${stage.color}40`,
              }}
            >
              {stage.opportunities.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1.5 text-primary">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-bold">
              {formatPrice(stage.totalValue)}
            </span>
          </div>
        </CardHeader>
      </Card>

      {/* Opportunities - DRAG AND DROP ZONE */}
      <SortableContext items={opportunityIds} strategy={verticalListSortingStrategy}>
        <div
          className={cn(
            "space-y-3 min-h-[200px] p-3 rounded-lg border-2 border-dashed transition-all",
            stage.opportunities.length === 0
              ? "border-muted bg-muted/20"
              : "border-transparent bg-transparent"
          )}
        >
          {stage.opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma oportunidade
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Arraste cards para cá
              </p>
            </div>
          ) : (
            stage.opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                opportunity={opportunity}
                onMoveStage={(stageId) => onMoveStage?.(opportunity.id, stageId)}
                onView={() => onViewOpportunity?.(opportunity.id)}
                onContact={() => onContactBuyer?.(opportunity.buyer.name)}
                availableStages={availableStages}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// Main Pipeline Component
export function SalesPipeline({
  stages,
  onMoveStage,
  onViewOpportunity,
  onContactBuyer,
}: SalesPipelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const totalOpportunities = stages.reduce(
    (sum, stage) => sum + stage.opportunities.length,
    0
  );
  const totalValue = stages.reduce((sum, stage) => sum + stage.totalValue, 0);

  // Calculate conversion rates between stages
  const getConversionRate = (fromIndex: number, toIndex: number): number => {
    if (fromIndex < 0 || toIndex >= stages.length) return 0;
    const fromCount = stages[fromIndex]?.opportunities.length || 0;
    const toCount = stages[toIndex]?.opportunities.length || 0;
    if (fromCount === 0) return 0;
    return Math.round((toCount / fromCount) * 100);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Find which stage the card was moved to
    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the opportunity and target stage
    let sourceStage: PipelineStage | undefined;
    let targetStage: PipelineStage | undefined;

    stages.forEach((stage) => {
      if (stage.opportunities.some((opp) => opp.id === activeId)) {
        sourceStage = stage;
      }
      if (stage.opportunities.some((opp) => opp.id === overId) || stage.id === overId) {
        targetStage = stage;
      }
    });

    // Move to different stage
    if (targetStage && sourceStage?.id !== targetStage.id) {
      onMoveStage?.(activeId, targetStage.id);
    }
  };

  // Scroll navigation
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // Width of column + gap
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Get the active opportunity for drag overlay
  const activeOpportunity = activeId
    ? stages
        .flatMap((s) => s.opportunities)
        .find((opp) => opp.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Oportunidades</p>
                <p className="text-xl font-bold">{totalOpportunities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold">{formatPrice(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                <p className="text-xl font-bold">
                  {getConversionRate(0, stages.length - 1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-lg font-bold">
                  {formatPrice(totalOpportunities > 0 ? totalValue / totalOpportunities : 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Stages - ENHANCED WITH NAVIGATION & RESPONSIVE */}
      <Card className="relative">
        <CardContent className="p-2 sm:p-4">
          {/* Navigation Arrows - Desktop only */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-background hover:bg-accent hover:scale-110 transition-all"
              onClick={() => scroll("left")}
              aria-label="Rolar para esquerda"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-background hover:bg-accent hover:scale-110 transition-all"
              onClick={() => scroll("right")}
              aria-label="Rolar para direita"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile hint */}
          <div className="lg:hidden mb-3 px-2">
            <p className="text-xs text-muted-foreground text-center">
              Deslize horizontalmente para navegar entre estágios
            </p>
          </div>

          {/* Pipeline Columns - RESPONSIVE */}
          <div
            ref={scrollContainerRef}
            className={cn(
              "flex gap-3 sm:gap-4 overflow-x-auto pb-2 scroll-smooth",
              "snap-x snap-mandatory lg:snap-none",
              "touch-pan-x"
            )}
            style={{ scrollbarWidth: "thin" }}
          >
            {stages.map((stage, index) => (
              <div
                key={stage.id}
                className="snap-start snap-always min-w-[280px] sm:min-w-[300px]"
              >
                <StageColumn
                  stage={stage}
                  onMoveStage={onMoveStage}
                  onViewOpportunity={onViewOpportunity}
                  onContactBuyer={onContactBuyer}
                  availableStages={stages}
                />
              </div>
            ))}
          </div>

          {/* Mobile Stage Indicators */}
          <div className="flex lg:hidden justify-center gap-2 mt-4">
            {stages.map((stage, idx) => (
              <button
                key={stage.id}
                onClick={() => {
                  if (scrollContainerRef.current) {
                    const scrollAmount = 300 * idx;
                    scrollContainerRef.current.scrollTo({
                      left: scrollAmount,
                      behavior: "smooth",
                    });
                  }
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  "hover:scale-125"
                )}
                style={{
                  backgroundColor: stage.color,
                  opacity: 0.4,
                }}
                aria-label={`Ir para ${stage.name}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeOpportunity && (
          <div className="opacity-90 rotate-3 scale-105">
            <OpportunityCard
              opportunity={activeOpportunity}
              availableStages={stages}
              isDragging
            />
          </div>
        )}
      </DragOverlay>

      {/* Conversion Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Funil de Conversão
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {stages.map((stage, index) => {
            const conversionFromPrevious =
              index > 0 ? getConversionRate(index - 1, index) : 100;
            const percentage =
              totalOpportunities > 0
                ? (stage.opportunities.length / totalOpportunities) * 100
                : 0;

            return (
              <div key={stage.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stage.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      {stage.opportunities.length} leads
                    </span>
                    {index > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {conversionFromPrevious}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-3">
                    <span className="text-xs font-medium text-primary-foreground mix-blend-difference">
                      {formatPrice(stage.totalValue)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      </div>
    </DndContext>
  );
}
