import React from "react";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

export interface AgendaItem {
  id: string;
  type: 'visit' | 'followup';
  time: string;
  client: string;
  property?: string;
  status: 'pending' | 'completed' | 'overdue';
  completed: boolean;
}

export interface DashboardAgendaProps {
  items: AgendaItem[];
  onToggleComplete: (id: string) => void;
  maxItems?: number;
}

const statusMap = {
  pending: 'new',
  completed: 'contract',
  overdue: 'lost',
} as const;

const statusLabels = {
  pending: 'Pendente',
  completed: 'Concluído',
  overdue: 'Atrasado',
} as const;

const typeLabels = {
  visit: 'Visita',
  followup: 'Follow-up',
} as const;

export function DashboardAgenda({
  items,
  onToggleComplete,
  maxItems = 5
}: DashboardAgendaProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Agenda de Hoje</CardTitle>
          </div>
          <Link href="/calendar">
            <Button variant="ghost" size="sm" className="text-xs -mr-2">
              Ver agenda completa
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {displayItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade agendada para hoje
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "group relative flex gap-3 p-3 rounded-lg border transition-all hover:border-muted-foreground/30 hover:shadow-sm",
                  item.completed && "opacity-60"
                )}
              >
                {/* Checkbox */}
                <div className="pt-0.5">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={() => onToggleComplete(item.id)}
                    className="h-4 w-4"
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Header: Time + Type */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{item.time}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {typeLabels[item.type]}
                    </span>
                  </div>

                  {/* Client */}
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className={cn(
                      "truncate",
                      item.completed && "line-through"
                    )}>
                      {item.client}
                    </span>
                  </div>

                  {/* Property (if applicable) */}
                  {item.property && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Home className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.property}</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="pt-1">
                    <StatusBadge
                      status={statusMap[item.status]}
                      size="sm"
                    >
                      {statusLabels[item.status]}
                    </StatusBadge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
