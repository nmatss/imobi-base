import React from "react";
import { lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Lazy load the FinancialCharts component to code-split Recharts
const FinancialCharts = lazy(() => import('@/pages/financial/components/FinancialCharts'));

// Skeleton loader for charts
function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted animate-pulse rounded w-32" />
          <div className="h-4 bg-muted animate-pulse rounded w-48 mt-1" />
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[300px] sm:h-[350px] lg:h-[400px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <div className="h-5 bg-muted animate-pulse rounded w-32" />
          <div className="h-4 bg-muted animate-pulse rounded w-48 mt-1" />
        </CardHeader>
        <CardContent className="p-2 sm:p-4">
          <div className="h-[300px] sm:h-[350px] lg:h-[400px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    </div>
  );
}

interface DashboardChartsProps {
  chartData: any;
  isLoading?: boolean;
}

/**
 * Lazy-loaded wrapper for FinancialCharts component
 * This code-splits Recharts library to reduce initial bundle size
 *
 * @param {Object} props - Component props
 * @param {any} props.chartData - Chart data to display
 * @param {boolean} props.isLoading - Loading state
 *
 * Performance Impact:
 * - Reduces initial bundle by ~120KB (gzipped)
 * - Charts load on-demand when needed
 * - Improves First Contentful Paint (FCP)
 * - Better Time to Interactive (TTI)
 */
export function DashboardCharts({ chartData, isLoading }: DashboardChartsProps) {
  return (
    <Suspense fallback={<ChartsSkeleton />}>
      <FinancialCharts chartData={chartData} isLoading={isLoading} />
    </Suspense>
  );
}

export default DashboardCharts;
