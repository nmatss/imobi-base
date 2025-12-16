import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, Target, DollarSign, Clock, User, Activity, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface LeadScoreDisplayProps {
  leadId: string;
  compact?: boolean;
}

interface LeadScore {
  id: string;
  leadId: string;
  totalScore: number;
  budgetScore: number;
  engagementScore: number;
  profileScore: number;
  urgencyScore: number;
  behaviorScore: number;
  trend: string;
  calculatedAt: string;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
  if (score >= 60) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
  if (score >= 40) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
  return 'text-red-600 bg-red-100 dark:bg-red-900/30';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'Quente';
  if (score >= 60) return 'Morno';
  if (score >= 40) return 'Frio';
  return 'Muito Frio';
};

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
};

const scoreCategories = [
  { key: 'budgetScore', label: 'Orçamento', icon: DollarSign, description: 'Capacidade financeira do lead' },
  { key: 'engagementScore', label: 'Engajamento', icon: Activity, description: 'Interações e atividade recente' },
  { key: 'profileScore', label: 'Perfil', icon: User, description: 'Completude e qualidade do perfil' },
  { key: 'urgencyScore', label: 'Urgência', icon: Clock, description: 'Prazo e necessidade de compra' },
  { key: 'behaviorScore', label: 'Comportamento', icon: Target, description: 'Padrão de interesse demonstrado' },
];

export function LeadScoreDisplay({ leadId, compact = false }: LeadScoreDisplayProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: score, isLoading } = useQuery<LeadScore>({
    queryKey: ['lead-score', leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/score`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Erro ao carregar score');
      }
      return res.json();
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/score/calculate`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Erro ao recalcular score');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Score atualizado',
        description: 'O score do lead foi recalculado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['lead-score', leadId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!score) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <p>Score não calculado</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => recalculateMutation.mutate()}
          disabled={recalculateMutation.isPending}
        >
          {recalculateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Calcular Score
            </>
          )}
        </Button>
      </div>
    );
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm font-medium ${getScoreColor(score.totalScore)}`}>
              <span>{score.totalScore}</span>
              {getTrendIcon(score.trend)}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{getScoreLabel(score.totalScore)}</p>
              <p className="text-xs text-muted-foreground">
                Atualizado em {new Date(score.calculatedAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Lead Score
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => recalculateMutation.mutate()}
              disabled={recalculateMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} />
            </Button>
            <Badge className={getScoreColor(score.totalScore)}>
              {getScoreLabel(score.totalScore)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreColor(score.totalScore)}`}>
            <div>
              <div className="text-3xl font-bold">{score.totalScore}</div>
              <div className="flex items-center justify-center gap-1 text-xs">
                {getTrendIcon(score.trend)}
                <span>
                  {score.trend === 'up' ? 'Subindo' : score.trend === 'down' ? 'Caindo' : 'Estável'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Detalhamento</h4>
          {scoreCategories.map(({ key, label, icon: Icon, description }) => {
            const value = score[key as keyof LeadScore] as number;
            return (
              <TooltipProvider key={key}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1.5 cursor-help">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{label}</span>
                        </div>
                        <span className="font-medium">{value}/20</span>
                      </div>
                      <Progress value={(value / 20) * 100} className="h-2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Last Update */}
        <p className="text-xs text-muted-foreground text-center">
          Atualizado em {new Date(score.calculatedAt).toLocaleString('pt-BR')}
        </p>
      </CardContent>
    </Card>
  );
}

// Badge component for use in lists/tables
export function LeadScoreBadge({ leadId }: { leadId: string }) {
  return <LeadScoreDisplay leadId={leadId} compact />;
}
