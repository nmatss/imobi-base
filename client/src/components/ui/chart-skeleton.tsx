import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeleton loader para gráficos de barras
 */
export function ChartSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando gráfico">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-end gap-2 h-64">
        {[...Array(7)].map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1"
            style={{ height: `${Math.random() * 100 + 50}px` }}
          />
        ))}
      </div>
      <span className="sr-only">Carregando dados do gráfico...</span>
    </div>
  );
}

/**
 * Skeleton loader para gráfico de pizza
 */
export function PieChartSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Carregando gráfico de pizza">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center justify-center">
        <Skeleton className="h-48 w-48 rounded-full" />
      </div>
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-3 flex-1" />
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando dados do gráfico...</span>
    </div>
  );
}

/**
 * Skeleton loader para gráfico de linha
 */
export function LineChartSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando gráfico de linha">
      <Skeleton className="h-4 w-32" />
      <div className="h-64 relative">
        {/* Linhas de grade horizontais */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-px w-full" />
          ))}
        </div>
        {/* Área do gráfico */}
        <Skeleton className="absolute inset-x-0 bottom-0 h-32 opacity-20" />
      </div>
      <span className="sr-only">Carregando dados do gráfico...</span>
    </div>
  );
}

/**
 * Skeleton loader para gráfico em card
 */
export function ChartCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <ChartSkeleton />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton loader para área de gráfico (sem card)
 */
export function AreaChartSkeleton() {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando gráfico de área">
      <Skeleton className="h-4 w-32" />
      <div className="h-64 relative bg-muted/20 rounded-lg overflow-hidden">
        {/* Simula curva do gráfico */}
        <div className="absolute bottom-0 left-0 right-0 h-3/4">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0 80 Q 25 60, 50 70 T 100 50 L 100 100 L 0 100 Z"
              fill="url(#gradient)"
              className="text-primary animate-pulse"
            />
          </svg>
        </div>
      </div>
      <span className="sr-only">Carregando dados do gráfico...</span>
    </div>
  );
}

/**
 * Skeleton loader para dashboard com múltiplos gráficos
 */
export function ChartsDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Métricas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos principais */}
      <div className="grid gap-6 md:grid-cols-2">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
