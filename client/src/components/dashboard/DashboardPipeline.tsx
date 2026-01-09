import React, { useState, memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Lead {
  id: string;
  name: string;
  propertyInterest?: string;
  estimatedValue?: number;
  daysInStage: number;
  avatar?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  leads: Lead[];
  color: string;
}

export interface DashboardPipelineProps {
  stages: PipelineStage[];
  onLeadClick?: (leadId: string) => void;
  maxCardsVisible?: number;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const LeadCard = memo(function LeadCard({ lead, onClick }: { lead: Lead; onClick?: () => void }) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border border-border/50",
        onClick && "touch-manipulation"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={lead.avatar} alt={lead.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {getInitials(lead.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate" title={lead.name}>
              {lead.name}
            </h4>
            {lead.propertyInterest && (
              <p className="text-xs text-muted-foreground truncate" title={lead.propertyInterest}>
                {lead.propertyInterest}
              </p>
            )}
          </div>
        </div>

        {lead.estimatedValue && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-sm font-semibold text-primary">
              {formatCurrency(lead.estimatedValue)}
            </p>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {lead.daysInStage === 0
              ? 'Hoje'
              : lead.daysInStage === 1
              ? '1 dia'
              : `${lead.daysInStage} dias`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
});

const PipelineColumn = memo(function PipelineColumn({
  stage,
  maxCardsVisible = 3,
  onLeadClick,
}: {
  stage: PipelineStage;
  maxCardsVisible?: number;
  onLeadClick?: (leadId: string) => void;
}) {
  const visibleLeads = stage.leads.slice(0, maxCardsVisible);
  const remainingCount = Math.max(0, stage.leads.length - maxCardsVisible);

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1">
      <CardHeader className="px-0 pb-3 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <h3 className="font-semibold text-sm">{stage.name}</h3>
          </div>
          <Badge
            variant="secondary"
            className="text-xs"
            style={{
              backgroundColor: `${stage.color}15`,
              color: stage.color,
              borderColor: `${stage.color}30`
            }}
          >
            {stage.leads.length}
          </Badge>
        </div>
      </CardHeader>

      <div className="space-y-3 flex-1">
        {visibleLeads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onLeadClick?.(lead.id)}
          />
        ))}

        {remainingCount > 0 && (
          <Button
            variant="ghost"
            className="w-full justify-between text-xs h-9"
            onClick={() => {
              // Navigate to full pipeline view or expand column
              console.log(`Ver mais ${remainingCount} leads do estágio ${stage.name}`);
            }}
          >
            <span>Ver mais {remainingCount}</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}

        {stage.leads.length === 0 && (
          <div className="flex items-center justify-center py-8 px-4 border-2 border-dashed border-border/50 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              Nenhum lead neste estágio
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export const DashboardPipeline = memo(function DashboardPipeline({
  stages,
  onLeadClick,
  maxCardsVisible = 3
}: DashboardPipelineProps) {
  const [activeTab, setActiveTab] = useState(stages[0]?.id || '');

  return (
    <div className="w-full">
      {/* Desktop: 5 columns side by side */}
      <div className="hidden lg:flex gap-4 overflow-x-auto pb-2">
        {stages.map(stage => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            maxCardsVisible={maxCardsVisible}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      {/* Tablet: 3 columns with horizontal scroll */}
      <div className="hidden md:flex lg:hidden gap-4 overflow-x-auto pb-2 scroll-smooth">
        {stages.map(stage => (
          <PipelineColumn
            key={stage.id}
            stage={stage}
            maxCardsVisible={maxCardsVisible}
            onLeadClick={onLeadClick}
          />
        ))}
      </div>

      {/* Mobile: Tabs (1 stage at a time) */}
      <div className="md:hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-auto flex-wrap justify-start gap-1 p-1 bg-muted/50">
            {stages.map(stage => (
              <TabsTrigger
                key={stage.id}
                value={stage.id}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:shadow-sm"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <span>{stage.name}</span>
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4 px-1.5 ml-1"
                  style={{
                    backgroundColor: `${stage.color}15`,
                    color: stage.color,
                  }}
                >
                  {stage.leads.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {stages.map(stage => (
            <TabsContent key={stage.id} value={stage.id} className="mt-4">
              <PipelineColumn
                stage={stage}
                maxCardsVisible={maxCardsVisible}
                onLeadClick={onLeadClick}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
});
