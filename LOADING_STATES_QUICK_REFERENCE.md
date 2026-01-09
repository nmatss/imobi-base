# Loading States - Quick Reference

## Quick Start

### Import Components

```tsx
// Skeleton loaders
import {
  PropertyGridSkeleton,
  DashboardSkeleton,
  TableSkeleton,
  KanbanBoardSkeleton,
  // ... more skeletons
} from "@/components/ui/skeleton-loaders";

// Page loaders
import {
  PageLoader,
  InlineLoader,
  CardLoader,
  OverlayLoader,
} from "@/components/ui/page-loader";
```

## Common Patterns

### 1. Page Loading (Full Screen)

```tsx
function Dashboard() {
  const { data, loading } = useDashboardData();

  if (loading) {
    return <PageLoader fullScreen text="Carregando dashboard" />;
  }

  return <DashboardContent data={data} />;
}
```

### 2. Section Loading (Skeleton)

```tsx
function PropertiesList() {
  const { properties, loading } = useProperties();

  return (
    <div>
      <h1>Imóveis</h1>
      {loading ? (
        <PropertyGridSkeleton count={6} />
      ) : (
        <PropertyGrid properties={properties} />
      )}
    </div>
  );
}
```

### 3. Button Loading

```tsx
function SaveButton() {
  const [isSaving, setIsSaving] = useState(false);

  return (
    <Button disabled={isSaving} onClick={handleSave}>
      {isSaving ? (
        <>
          <InlineLoader size="sm" className="mr-2" />
          Salvando...
        </>
      ) : (
        "Salvar"
      )}
    </Button>
  );
}
```

### 4. Card Content Loading

```tsx
function ReportCard() {
  const { report, loading } = useReport();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatório Mensal</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <CardLoader lines={5} />
        ) : (
          <ReportContent data={report} />
        )}
      </CardContent>
    </Card>
  );
}
```

### 5. Table Loading

```tsx
function TransactionsTable() {
  const { transactions, loading } = useTransactions();

  if (loading) {
    return <TableSkeleton rows={8} columns={5} />;
  }

  return (
    <Table>
      {/* Table content */}
    </Table>
  );
}
```

### 6. Modal Processing

```tsx
function PaymentModal() {
  const [isProcessing, setIsProcessing] = useState(false);

  async function processPayment() {
    setIsProcessing(true);
    try {
      await submitPayment();
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <>
      <Dialog>
        {/* Dialog content */}
      </Dialog>
      {isProcessing && <OverlayLoader text="Processando pagamento" />}
    </>
  );
}
```

### 7. Progressive Loading

```tsx
function FinancialPage() {
  const { metrics, loading: metricsLoading } = useMetrics();
  const { charts, loading: chartsLoading } = useCharts();
  const { transactions, loading: transLoading } = useTransactions();

  return (
    <div>
      {metricsLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <FinancialCardSkeleton key={i} />)}
        </div>
      ) : (
        <MetricsCards data={metrics} />
      )}

      {chartsLoading ? (
        <FinancialChartsSkeleton />
      ) : (
        <Charts data={charts} />
      )}

      {transLoading ? (
        <TableSkeleton rows={10} columns={6} />
      ) : (
        <TransactionsTable data={transactions} />
      )}
    </div>
  );
}
```

### 8. Infinite Scroll

```tsx
function PropertyList() {
  const {
    properties,
    hasMore,
    loadMore,
    isLoadingMore,
  } = useInfiniteProperties();

  return (
    <div>
      {properties.map(p => (
        <PropertyCard key={p.id} {...p} />
      ))}

      {isLoadingMore && <PropertyCardSkeleton />}

      {hasMore && (
        <div ref={loadMoreRef}>
          {/* Intersection observer trigger */}
        </div>
      )}
    </div>
  );
}
```

## Component Quick Reference

### PageLoader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| size | 'sm' \| 'md' \| 'lg' | 'md' | Loader size |
| text | string | 'Carregando' | Loading text |
| description | string | - | Additional description |
| variant | 'spinner' \| 'dots' \| 'pulse' | 'spinner' | Animation type |
| fullScreen | boolean | false | Full viewport height |
| className | string | - | Additional classes |

### InlineLoader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| size | 'xs' \| 'sm' \| 'md' | 'sm' | Loader size |
| className | string | - | Additional classes |

### CardLoader Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| lines | number | 3 | Number of skeleton lines |
| showHeader | boolean | true | Show header skeleton |

### TableSkeleton Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| rows | number | 5 | Number of rows |
| columns | number | 4 | Number of columns |

## Accessibility Checklist

✅ **Always include:**

```tsx
<div
  role="status"
  aria-live="polite"
  aria-label="Carregando imóveis"
>
  <Skeleton />
  <span className="sr-only">Carregando imóveis...</span>
</div>
```

- `role="status"` - Announces to screen readers
- `aria-live="polite"` - Non-intrusive updates
- `aria-label` - Describes what's loading
- `sr-only` text - Hidden descriptive text

## Performance Tips

1. **Use Suspense for code splitting:**
```tsx
<Suspense fallback={<PageLoader />}>
  <LazyComponent />
</Suspense>
```

2. **Virtualize large lists:**
```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
// Only render visible items
```

3. **Progressive loading:**
```tsx
// Load critical data first
const { critical } = useCriticalData();
const { secondary } = useSecondaryData(); // Later
```

4. **Debounce loading states:**
```tsx
// Avoid flash of loading for fast requests
const debouncedLoading = useDebounce(loading, 200);
```

## Common Mistakes

### ❌ Don't: Generic text

```tsx
{loading && <div>Loading...</div>}
```

### ✅ Do: Structured skeleton

```tsx
{loading && <PropertyGridSkeleton count={6} />}
```

---

### ❌ Don't: Unmounted spinner

```tsx
{loading && <Loader2 className="animate-spin" />}
```

### ✅ Do: Context-appropriate loader

```tsx
{loading && <PageLoader text="Carregando dados" />}
```

---

### ❌ Don't: Layout shift

```tsx
{loading ? (
  <div className="h-10">Loading...</div>
) : (
  <div className="h-64">Content</div>
)}
```

### ✅ Do: Match dimensions

```tsx
{loading ? (
  <Skeleton className="h-64" />
) : (
  <div className="h-64">Content</div>
)}
```

---

### ❌ Don't: Missing accessibility

```tsx
<div className="animate-pulse" />
```

### ✅ Do: Include ARIA

```tsx
<div
  role="status"
  aria-label="Carregando"
  className="animate-pulse"
>
  <span className="sr-only">Carregando...</span>
</div>
```

## Cheat Sheet

| Need | Use This |
|------|----------|
| Full page initial load | `<PageLoader fullScreen />` |
| Section loading | Specific skeleton (e.g., `<PropertyGridSkeleton />`) |
| Button/inline | `<InlineLoader />` |
| Card content | `<CardLoader />` |
| Table | `<TableSkeleton rows={n} columns={m} />` |
| Modal processing | `<OverlayLoader />` |
| Custom skeleton | `<Skeleton className="..." />` |

## Examples by Page

| Page | Skeleton Component | Code |
|------|-------------------|------|
| Dashboard | DashboardSkeleton | `<DashboardSkeleton />` |
| Properties | PropertyGridSkeleton | `<PropertyGridSkeleton count={6} />` |
| Property Details | PropertyDetailsSkeleton | `<PropertyDetailsSkeleton />` |
| Leads/Kanban | KanbanBoardSkeleton | `<KanbanBoardSkeleton />` |
| Calendar | CalendarSkeleton | `<CalendarSkeleton />` |
| Financial | FinancialPageSkeleton | `<FinancialPageSkeleton />` |
| Rentals | RentalsPageSkeleton | `<RentalsPageSkeleton />` |
| Vendas | SalesPageSkeleton | `<SalesPageSkeleton />` |
| Settings | SettingsSkeleton | `<SettingsSkeleton />` |

## File Locations

- **Skeletons:** `/client/src/components/ui/skeleton-loaders.tsx`
- **Page Loaders:** `/client/src/components/ui/page-loader.tsx`
- **Base Skeleton:** `/client/src/components/ui/skeleton.tsx`
- **Documentation:** `/LOADING_STATES_IMPLEMENTATION.md`

## Support

For detailed documentation, see: `/LOADING_STATES_IMPLEMENTATION.md`

For implementation examples, check existing pages:
- `/client/src/pages/dashboard.tsx`
- `/client/src/pages/properties/list.tsx`
- `/client/src/pages/financial/components/FinancialDashboard.tsx`

---

**Last Updated:** 2025-12-25
**Version:** 1.0.0
