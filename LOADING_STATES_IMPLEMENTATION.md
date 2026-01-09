# Loading States Implementation Guide

## Overview

This document describes the comprehensive loading states system implemented across the ImobiBase application. The system provides consistent, accessible, and performant loading indicators throughout the user interface.

## Components

### 1. Skeleton Loaders (`skeleton-loaders.tsx`)

Reusable skeleton components that match the structure of actual content:

#### Available Skeletons

- **PropertyCardSkeleton** - For property cards
- **PropertyGridSkeleton** - Grid of property cards
- **ListItemSkeleton** - Generic list items
- **TableSkeleton** - Table rows and columns
- **DashboardCardSkeleton** - Dashboard metric cards
- **DashboardSkeleton** - Full dashboard layout
- **KanbanCardSkeleton** - Kanban board cards
- **KanbanColumnSkeleton** - Kanban columns
- **KanbanBoardSkeleton** - Complete Kanban board
- **FormSkeleton** - Form inputs
- **PropertyDetailsSkeleton** - Property details page
- **CalendarSkeleton** - Calendar view
- **SettingsSkeleton** - Settings page
- **FinancialCardSkeleton** - Financial metric cards
- **FinancialPageSkeleton** - Full financial page
- **RentalsPageSkeleton** - Rentals page
- **SalesPageSkeleton** - Sales/Vendas page
- **PageSkeleton** - Generic page loader

#### Usage Example

```tsx
import { PropertyGridSkeleton } from "@/components/ui/skeleton-loaders";

function PropertiesList() {
  const { properties, loading } = useImobi();

  if (loading) {
    return <PropertyGridSkeleton count={6} />;
  }

  return <PropertyGrid properties={properties} />;
}
```

### 2. Page Loader (`page-loader.tsx`)

Flexible loading component for different contexts:

#### Variants

- **spinner** (default) - Rotating circle
- **dots** - Bouncing dots animation
- **pulse** - Pulsing circle

#### Sizes

- **sm** - Small, inline usage
- **md** - Medium, default
- **lg** - Large, full-screen

#### Components

- **PageLoader** - Main page loading indicator
- **InlineLoader** - For buttons and inline elements
- **CardLoader** - For card content areas
- **OverlayLoader** - Modal overlay loading

#### Usage Examples

```tsx
// Full page loading
<PageLoader fullScreen text="Carregando dados" />

// Inline in button
<Button disabled={isLoading}>
  {isLoading ? <InlineLoader /> : "Salvar"}
</Button>

// Card content
<Card>
  <CardHeader>
    <CardTitle>Relatórios</CardTitle>
  </CardHeader>
  <CardContent>
    {loading ? <CardLoader lines={5} /> : <ReportContent />}
  </CardContent>
</Card>

// Overlay during processing
{isProcessing && <OverlayLoader text="Processando pagamento" />}
```

### 3. Loading State (`LoadingState.tsx`)

Generic skeleton component with variants:

```tsx
import { LoadingState } from "@/components/ui/LoadingState";

// Single element
<LoadingState variant="card" />

// Multiple elements
<LoadingState variant="text" count={3} spacing="md" />

// Custom styling
<LoadingState variant="circle" className="w-16 h-16" />
```

## Implementation by Page

### Dashboard

- **Metrics**: 4 `DashboardCardSkeleton` components
- **Pipeline**: `KanbanBoardSkeleton` for leads pipeline
- **Charts**: Custom skeleton with simulated chart bars
- **Activity**: `ListItemSkeleton` components

```tsx
// In dashboard.tsx
{loading ? (
  <DashboardSkeleton />
) : (
  <DashboardContent />
)}
```

### Properties

- **Grid View**: `PropertyGridSkeleton` with responsive columns
- **List View**: `PropertyCardSkeleton` components
- **Details**: `PropertyDetailsSkeleton`

The properties page uses virtualization with loading states for optimal performance.

### Leads/Kanban

- **Board**: `KanbanBoardSkeleton` showing column structure
- **Cards**: `KanbanCardSkeleton` for individual leads

### Calendar

- **Calendar Grid**: `CalendarSkeleton` with day cells
- **Events**: Skeleton representations of calendar events

### Financial

- **Metrics**: `FinancialCardSkeleton` (4 cards)
- **Charts**: Custom chart skeleton with animated bars
- **Transactions**: Table skeleton with realistic structure

Enhanced with:
- Simulated chart elements for better UX
- Shimmer effects on loading cards
- Proper ARIA labels for accessibility

### Rentals

- **Dashboard**: `RentalDashboard` component with loading prop
- **Alerts**: `RentalAlerts` component with loading state
- **Tables**: Table skeletons in each tab

### Vendas (Sales)

- **Pipeline**: `SalesPageSkeleton` with pipeline cards
- **Activity**: List item skeletons

### Settings

- **Layout**: `SettingsSkeleton` with sidebar and content area
- **Forms**: Form field skeletons

## Best Practices

### 1. Match Content Structure

Always create skeleton loaders that match the actual content structure:

```tsx
// ✅ Good - Matches actual structure
<div className="grid grid-cols-3 gap-4">
  {Array.from({ length: 6 }).map((_, i) => (
    <PropertyCardSkeleton key={i} />
  ))}
</div>

// ❌ Bad - Generic spinner
{loading && <div>Loading...</div>}
```

### 2. Use Semantic HTML

Include proper ARIA attributes:

```tsx
<div role="status" aria-label="Carregando imóveis">
  <PropertyGridSkeleton />
  <span className="sr-only">Carregando imóveis...</span>
</div>
```

### 3. Progressive Enhancement

Show partial content when possible:

```tsx
<DashboardMetrics
  metrics={metrics}
  loading={metricsLoading}
/>
<DashboardCharts
  data={chartData}
  loading={chartsLoading}
/>
```

### 4. Avoid Layout Shift

Ensure skeletons have the same dimensions as actual content:

```tsx
// Skeleton matches card height
<Skeleton className="h-48 w-full" />

// Actual card
<Card className="h-48">
  <CardContent>...</CardContent>
</Card>
```

### 5. Suspense Boundaries

Use React Suspense for code-split routes:

```tsx
import { lazy, Suspense } from "react";
import { PageLoader } from "@/components/ui/page-loader";

const Dashboard = lazy(() => import("@/pages/dashboard"));

function App() {
  return (
    <Suspense fallback={<PageLoader fullScreen />}>
      <Dashboard />
    </Suspense>
  );
}
```

### 6. Optimistic UI

Show immediate feedback, load in background:

```tsx
function PropertyCard({ id }) {
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleUpdate() {
    setIsUpdating(true);
    try {
      await updateProperty(id);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Card className={cn(isUpdating && "opacity-60")}>
      {/* Content */}
      {isUpdating && <InlineLoader className="absolute top-2 right-2" />}
    </Card>
  );
}
```

### 7. Long Operations

For operations > 3 seconds, show progress or description:

```tsx
<PageLoader
  text="Processando dados"
  description="Isso pode levar alguns segundos"
/>
```

## Performance Considerations

### 1. Virtualization

Large lists use `@tanstack/react-virtual` with loading states:

```tsx
// Properties list uses virtualization
const rowVirtualizer = useVirtualizer({
  count: rowCount,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 280,
  overscan: 5,
});
```

### 2. Lazy Loading

Code-split pages load with Suspense:

```tsx
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Properties = lazy(() => import("@/pages/properties/list"));
```

### 3. Progressive Loading

Load critical data first:

```tsx
// Dashboard loads metrics, then charts, then activity
const { metrics, loading: metricsLoading } = useDashboardMetrics();
const { charts, loading: chartsLoading } = useDashboardCharts();
const { activity, loading: activityLoading } = useRecentActivity();
```

## Accessibility

All loading states include:

1. **role="status"** - Announces loading to screen readers
2. **aria-label** - Describes what's loading
3. **aria-live="polite"** - Non-intrusive announcements
4. **sr-only text** - Hidden text for screen readers

```tsx
<div
  role="status"
  aria-live="polite"
  aria-label="Carregando imóveis"
>
  <PropertyGridSkeleton />
  <span className="sr-only">Carregando imóveis...</span>
</div>
```

## Animation

### Pulse Animation

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Shimmer Effect

```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

Add to Tailwind config:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'shimmer': 'shimmer 2s infinite',
      },
    },
  },
}
```

## Testing

### Unit Tests

```tsx
import { render, screen } from "@testing-library/react";
import { PropertyGridSkeleton } from "@/components/ui/skeleton-loaders";

test("renders loading skeleton with correct structure", () => {
  render(<PropertyGridSkeleton count={3} />);
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.getByText(/carregando/i)).toBeInTheDocument();
});
```

### Visual Regression

Use Storybook for visual testing:

```tsx
// skeleton-loaders.stories.tsx
export const PropertyGrid = {
  render: () => <PropertyGridSkeleton count={6} />,
};
```

## Migration Guide

### Replace Generic Loading Text

**Before:**
```tsx
{loading && <div>Carregando...</div>}
```

**After:**
```tsx
{loading && <PropertyGridSkeleton count={6} />}
```

### Replace Spinner with Skeleton

**Before:**
```tsx
{loading && <Loader2 className="animate-spin" />}
```

**After:**
```tsx
{loading && <PageLoader size="md" text="Carregando dados" />}
```

### Add Structure to Table Loading

**Before:**
```tsx
{loading && <div className="animate-pulse">...</div>}
```

**After:**
```tsx
{loading && <TableSkeleton rows={5} columns={4} />}
```

## Common Patterns

### Page with Multiple Sections

```tsx
function FinancialPage() {
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  if (metricsLoading && chartsLoading && tableLoading) {
    // Initial page load
    return <FinancialPageSkeleton />;
  }

  return (
    <>
      <FinancialMetrics loading={metricsLoading} />
      <FinancialCharts loading={chartsLoading} />
      <TransactionTable loading={tableLoading} />
    </>
  );
}
```

### Infinite Scroll

```tsx
function PropertyList() {
  const { properties, hasMore, loadMore, loading } = useInfiniteProperties();

  return (
    <div>
      {properties.map(p => <PropertyCard key={p.id} {...p} />)}
      {loading && <PropertyCardSkeleton />}
      {hasMore && <div ref={loadMoreRef} />}
    </div>
  );
}
```

### Search Results

```tsx
function SearchResults({ query }) {
  const { results, loading } = useSearch(query);

  if (loading && results.length === 0) {
    return <ListItemSkeleton count={5} />;
  }

  return (
    <>
      {results.map(r => <ResultItem key={r.id} {...r} />)}
      {loading && <InlineLoader />}
    </>
  );
}
```

## Troubleshooting

### Loading State Stuck

Check that loading state is properly updated:

```tsx
// ✅ Good
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetchData().finally(() => setLoading(false));
}, []);

// ❌ Bad - missing finally
useEffect(() => {
  setLoading(true);
  fetchData();
  setLoading(false); // Runs before async completes
}, []);
```

### Layout Shift

Ensure skeleton matches content:

```tsx
// Measure actual content height and match it
<Skeleton className="h-[280px]" /> // Matches PropertyCard height
```

### Performance Issues

Use virtualization for large lists:

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

// Only render visible items
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 100,
});
```

## Resources

- [Skeleton Loaders Component](/client/src/components/ui/skeleton-loaders.tsx)
- [Page Loader Component](/client/src/components/ui/page-loader.tsx)
- [Loading State Component](/client/src/components/ui/LoadingState.tsx)
- [Dashboard Implementation](/client/src/pages/dashboard.tsx)
- [Properties Implementation](/client/src/pages/properties/list.tsx)
- [Financial Implementation](/client/src/pages/financial/index.tsx)

## Changelog

### 2025-12-25 - Initial Implementation
- ✅ Created comprehensive skeleton loader components
- ✅ Implemented page-loader component with multiple variants
- ✅ Enhanced all major pages with proper loading states
- ✅ Added accessibility features (ARIA labels, screen reader text)
- ✅ Improved financial page loaders with chart simulations
- ✅ Updated transaction table with structured skeleton
- ✅ Enhanced App.tsx PageLoader component
- ✅ Added shimmer effects and animations
- ✅ Created this documentation
