import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, PieChart, Target, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type AIPrompt = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  category: 'analysis' | 'planning' | 'alert';
};

const AI_PROMPTS: AIPrompt[] = [
  {
    id: 'monthly_summary',
    title: 'Resumo financeiro do mês da imobiliária',
    description: 'Análise completa das receitas, despesas e margem operacional',
    icon: TrendingUp,
    category: 'analysis',
  },
  {
    id: 'expense_categories',
    title: 'Identificar categorias com maior gasto',
    description: 'Descubra onde sua imobiliária está gastando mais',
    icon: PieChart,
    category: 'analysis',
  },
  {
    id: 'commission_impact',
    title: 'Simular impacto de aumento de comissão',
    description: 'Calcule o efeito de mudanças nas taxas de comissão',
    icon: Target,
    category: 'planning',
  },
  {
    id: 'operational_margin',
    title: 'Análise de margem operacional',
    description: 'Avalie a rentabilidade e eficiência operacional',
    icon: TrendingUp,
    category: 'analysis',
  },
  {
    id: 'cash_flow_alerts',
    title: 'Alertas de fluxo de caixa',
    description: 'Identifique problemas potenciais de liquidez',
    icon: AlertCircle,
    category: 'alert',
  },
];

const iconA11yProps = { "aria-hidden": true, focusable: false } as const;

type Props = {
  onPromptSelect?: (promptId: string) => void;
};

export default function FinancialAI({ onPromptSelect }: Props) {
  const categoryColors = {
    analysis: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    planning: 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
    alert: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
        <div className="flex items-center gap-2">
          <div className="rounded-full p-2 bg-purple-100 dark:bg-purple-900/50">
            <Sparkles
              {...iconA11yProps}
              className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400"
            />
          </div>
          <CardTitle className="text-sm sm:text-base">Assistente Financeiro AI</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-4">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {AI_PROMPTS.map((prompt) => {
            const Icon = prompt.icon;
            return (
              <button
                key={prompt.id}
                onClick={() => onPromptSelect?.(prompt.id)}
                className="p-3 sm:p-4 rounded-xl border-2 border-transparent hover:border-primary hover:shadow-md transition-all text-left group bg-card hover:bg-accent/50"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                    <Icon
                      {...iconA11yProps}
                      className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600 dark:text-purple-400"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="font-semibold text-xs sm:text-sm line-clamp-2">
                        {prompt.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`${categoryColors[prompt.category]} text-[10px] px-1.5 py-0.5 shrink-0`}
                      >
                        {prompt.category === 'analysis' && 'Análise'}
                        {prompt.category === 'planning' && 'Planejamento'}
                        {prompt.category === 'alert' && 'Alerta'}
                      </Badge>
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                      {prompt.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
