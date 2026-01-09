import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

/**
 * Skeleton para cards de imóveis
 */
export function PropertyCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="h-48 w-full rounded-b-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para grid de imóveis
 */
export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para lista de itens
 */
export function ListItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4 border rounded-lg">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * Skeleton para tabela
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-10 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para card de dashboard
 */
export function DashboardCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para DashboardMetrics (4 cards de KPI)
 */
export function DashboardMetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Carregando métricas do dashboard">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="w-12 h-12 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Carregando métricas do dashboard...</span>
    </div>
  );
}

/**
 * Skeleton para card de Lead
 */
export function LeadCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="pt-2 border-t">
        <Skeleton className="h-3 w-full" />
      </div>
    </Card>
  );
}

/**
 * Skeleton para gráfico individual
 */
export function ChartSkeleton() {
  return (
    <Card role="status" aria-label="Carregando gráfico">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[300px] sm:h-[350px] lg:h-[400px] relative overflow-hidden rounded">
          <Skeleton className="absolute inset-0" />
          {/* Simulated chart bars for better UX */}
          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
            {[40, 65, 55, 80, 60, 75, 50, 70].map((height, j) => (
              <div
                key={j}
                className="flex-1 bg-primary/20 animate-pulse rounded-t"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
      <span className="sr-only">Carregando gráfico...</span>
    </Card>
  );
}

/**
 * Skeleton específico para gráficos financeiros (FinancialCharts)
 * Mantém a mesma estrutura de dois gráficos lado a lado
 */
export function FinancialChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-2" role="status" aria-label="Carregando gráficos financeiros">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="h-[300px] sm:h-[350px] lg:h-[400px] relative overflow-hidden rounded">
              <Skeleton className="absolute inset-0" />
              {/* Simulated chart bars for better UX */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2">
                {[40, 65, 55, 80, 60, 75].map((height, j) => (
                  <div
                    key={j}
                    className="flex-1 bg-primary/20 animate-pulse rounded-t"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      <span className="sr-only">Carregando gráficos financeiros...</span>
    </div>
  );
}

/**
 * Skeleton para dashboard completo
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Skeleton para card de lead no Kanban
 */
export function KanbanCardSkeleton() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </Card>
  );
}

/**
 * Skeleton para coluna do Kanban
 */
export function KanbanColumnSkeleton() {
  return (
    <div className="flex-1 min-w-[300px] space-y-4">
      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-8" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <KanbanCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton para board Kanban completo
 */
export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <KanbanColumnSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton para formulário
 */
export function FormSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton para detalhes de imóvel
 */
export function PropertyDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-96 w-full rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton para página de calendário
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton para página de configurações
 */
export function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        {/* Content */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para cards de métricas financeiras
 */
export function FinancialCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton para página financeira completa
 */
export function FinancialPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <FinancialCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full" />
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={8} columns={5} />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton para página de aluguéis
 */
export function RentalsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} columns={6} />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton para página de vendas
 */
export function SalesPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Pipeline Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-20 w-full" />
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <ListItemSkeleton key={i} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton para loading global da página
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
