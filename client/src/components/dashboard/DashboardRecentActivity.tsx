import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Activity,
  UserPlus,
  Home,
  Calendar,
  FileText,
  FileSignature,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

export interface Activity {
  id: string;
  type: 'lead' | 'property' | 'visit' | 'proposal' | 'contract';
  description: string;
  user: string;
  timestamp: Date;
}

export interface DashboardRecentActivityProps {
  activities: Activity[];
  maxItems?: number;
}

const activityConfig = {
  lead: {
    icon: UserPlus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Novo Lead',
  },
  property: {
    icon: Home,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Propriedade',
  },
  visit: {
    icon: Calendar,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Visita',
  },
  proposal: {
    icon: FileText,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
    label: 'Proposta',
  },
  contract: {
    icon: FileSignature,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    label: 'Contrato',
  },
} as const;

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) return 'agora mesmo';
  if (diffInMinutes < 60) return `há ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
  if (diffInHours < 24) return `há ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
  if (diffInDays < 30) return `há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;

  return date.toLocaleDateString('pt-BR');
}

export function DashboardRecentActivity({
  activities,
  maxItems = 5
}: DashboardRecentActivityProps) {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          </div>
          <Link href="/activity">
            <Button variant="ghost" size="sm" className="text-xs -mr-2">
              Ver todas
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto">
        {displayActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade recente
            </p>
          </div>
        ) : (
          <div className="relative space-y-4">
            {/* Timeline vertical line */}
            <div className="absolute left-[19px] top-3 bottom-3 w-px bg-border" />

            {displayActivities.map((activity, index) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              const isLast = index === displayActivities.length - 1;

              return (
                <div
                  key={activity.id}
                  className="relative flex gap-3 group"
                >
                  {/* Icon with background */}
                  <div className={cn(
                    "relative z-10 flex items-center justify-center h-10 w-10 rounded-full shrink-0 transition-all",
                    config.bgColor,
                    "group-hover:ring-2 group-hover:ring-offset-2 group-hover:ring-primary/20"
                  )}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1 pb-2">
                    <div className="space-y-1">
                      {/* Description */}
                      <p className="text-sm leading-relaxed">
                        {activity.description}
                      </p>

                      {/* User and timestamp */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium">{activity.user}</span>
                        <span>•</span>
                        <time dateTime={activity.timestamp.toISOString()}>
                          {getRelativeTime(activity.timestamp)}
                        </time>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
