# Code Patterns - ImobiBase

Este documento define os padrões de código, melhores práticas e convenções utilizadas no projeto ImobiBase.

## Índice

1. [React Patterns](#react-patterns)
2. [API Patterns](#api-patterns)
3. [TypeScript Best Practices](#typescript-best-practices)
4. [Testing Patterns](#testing-patterns)
5. [Error Handling](#error-handling)
6. [Performance Optimization](#performance-optimization)

---

## React Patterns

### 1. Component Structure

Sempre estruture componentes seguindo esta ordem:

```tsx
// 1. Imports
import { useState, useEffect } from "react";
import { useCustomHook } from "@/hooks/useCustomHook";
import { Button } from "@/components/ui/button";

// 2. Types/Interfaces
interface MyComponentProps {
  title: string;
  onAction: (id: string) => void;
}

// 3. Constants (se aplicável)
const DEFAULT_TITLE = "Default";

// 4. Component
export function MyComponent({ title, onAction }: MyComponentProps) {
  // 4.1 Hooks (state first, then effects, then custom hooks)
  const [isLoading, setIsLoading] = useState(false);
  const { data, refetch } = useCustomHook();

  useEffect(() => {
    // Effect logic
  }, []);

  // 4.2 Event handlers
  const handleAction = () => {
    setIsLoading(true);
    onAction("123");
  };

  // 4.3 Render helpers (optional)
  const renderContent = () => {
    if (isLoading) return <Loader />;
    return <Content />;
  };

  // 4.4 Return JSX
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleAction}>Action</Button>
      {renderContent()}
    </div>
  );
}
```

### 2. Custom Hooks

Use custom hooks para lógica reutilizável:

```tsx
// hooks/useDashboardData.ts
import { useState, useEffect } from "react";

export function useDashboardData(tenantId: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/dashboard/${tenantId}`);
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tenantId]);

  return { data, loading, error, refetch: () => fetchData() };
}
```

### 3. Context Pattern

Use Context para estado global:

```tsx
// lib/imobi-context.tsx
import { createContext, useContext, ReactNode } from "react";

type ImobiContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const ImobiContext = createContext<ImobiContextType | undefined>(undefined);

export function ImobiProvider({ children }: { children: ReactNode }) {
  // Context logic here
  return <ImobiContext.Provider value={value}>{children}</ImobiContext.Provider>;
}

export function useImobi() {
  const context = useContext(ImobiContext);
  if (!context) {
    throw new Error("useImobi must be used within ImobiProvider");
  }
  return context;
}
```

### 4. Lazy Loading & Code Splitting

Use lazy loading para páginas e componentes pesados:

```tsx
import { lazy, Suspense } from "react";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const PropertiesList = lazy(() => import("@/pages/properties/list"));

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Dashboard />
    </Suspense>
  );
}
```

### 5. Memoization

Use useMemo e useCallback para otimização:

```tsx
import { useMemo, useCallback } from "react";

function MyComponent({ items, onItemClick }) {
  // Memoize expensive calculations
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // Memoize callbacks to prevent re-renders
  const handleClick = useCallback((id: string) => {
    onItemClick(id);
  }, [onItemClick]);

  return <ItemList items={sortedItems} onClick={handleClick} />;
}
```

---

## API Patterns

### 1. API Route Structure

Organize rotas de forma clara e consistente:

```typescript
// server/routes.ts
export function registerRoutes(app: Express) {
  // Authentication routes
  app.post("/api/auth/login", loginHandler);
  app.post("/api/auth/logout", logoutHandler);
  app.get("/api/auth/me", getCurrentUser);

  // Resource routes (CRUD)
  app.get("/api/properties", getProperties);
  app.get("/api/properties/:id", getProperty);
  app.post("/api/properties", createProperty);
  app.put("/api/properties/:id", updateProperty);
  app.delete("/api/properties/:id", deleteProperty);
}
```

### 2. Request Validation

Sempre valide input usando schemas:

```typescript
import { z } from "zod";

const createPropertySchema = z.object({
  title: z.string().min(1, "Title is required"),
  price: z.string().regex(/^\d+(\.\d{2})?$/, "Invalid price format"),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  address: z.string().min(1, "Address is required"),
});

app.post("/api/properties", async (req, res) => {
  try {
    const data = createPropertySchema.parse(req.body);
    const property = await storage.createProperty(data);
    res.json(property);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation error", details: error.errors });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### 3. Error Handling in Routes

Use padrão consistente para erros:

```typescript
app.post("/api/properties", async (req, res) => {
  try {
    // Validation
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Business logic
    const property = await storage.createProperty(req.body);

    // Success response
    res.status(201).json(property);
  } catch (error: unknown) {
    // Type-safe error handling
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating property:", error);
    res.status(500).json({ error: message });
  }
});
```

### 4. Response Format

Use formato consistente para respostas:

```typescript
// Success response
res.json({
  success: true,
  data: result,
});

// Error response
res.status(400).json({
  success: false,
  error: "Error message",
  code: "VALIDATION_ERROR",
  details: validationErrors,
});

// Paginated response
res.json({
  items: results,
  total: totalCount,
  page: currentPage,
  pageSize: size,
  totalPages: Math.ceil(totalCount / size),
});
```

---

## TypeScript Best Practices

### 1. Avoid 'any' - Use Specific Types

❌ **Evite:**
```typescript
function processData(data: any) {
  return data.map((item: any) => item.value);
}
```

✅ **Use:**
```typescript
interface DataItem {
  id: string;
  value: number;
}

function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value);
}
```

### 2. Use 'unknown' for Error Handling

❌ **Evite:**
```typescript
try {
  // code
} catch (error: any) {
  console.log(error.message);
}
```

✅ **Use:**
```typescript
try {
  // code
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.log(message);
}
```

### 3. Use Generic Types

```typescript
// Utility type for API responses
type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// Usage
async function fetchProperty(id: string): Promise<ApiResponse<Property>> {
  try {
    const property = await storage.getProperty(id);
    return { success: true, data: property };
  } catch (error) {
    return { success: false, error: getErrorMessage(error) };
  }
}
```

### 4. Use Type Guards

```typescript
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

function isApiError<T>(response: ApiResponse<T>): response is { success: false; error: string } {
  return response.success === false;
}

// Usage
const response = await fetchData();
if (isApiError(response)) {
  console.error(response.error); // TypeScript knows this is an error
} else {
  console.log(response.data); // TypeScript knows this is the data
}
```

### 5. Use Utility Types

```typescript
// Pick specific properties
type PropertyPreview = Pick<Property, "id" | "title" | "price" | "images">;

// Make all properties optional
type PartialProperty = Partial<Property>;

// Make all properties required
type RequiredProperty = Required<Property>;

// Omit specific properties
type PropertyWithoutDates = Omit<Property, "createdAt" | "updatedAt">;

// Record type for key-value pairs
type PropertyStatusMap = Record<string, number>;
```

### 6. Use Branded Types for IDs

```typescript
type Brand<K, T> = K & { __brand: T };

type TenantId = Brand<string, "TenantId">;
type PropertyId = Brand<string, "PropertyId">;

// This prevents mixing different ID types
function getProperty(id: PropertyId) {
  // Implementation
}

const tenantId = "123" as TenantId;
const propertyId = "456" as PropertyId;

getProperty(propertyId); // OK
getProperty(tenantId); // Type error!
```

---

## Testing Patterns

### 1. Unit Test Structure

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch data successfully", async () => {
    // Arrange
    const mockData = { totalProperties: 10 };
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response)
    );

    // Act
    const { result } = renderHook(() => useDashboardData("tenant-1"));

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
      expect(result.current.loading).toBe(false);
    });
  });

  it("should handle errors", async () => {
    // Arrange
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

    // Act
    const { result } = renderHook(() => useDashboardData("tenant-1"));

    // Assert
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.loading).toBe(false);
    });
  });
});
```

### 2. Integration Test Pattern

```typescript
import { test, expect } from "@playwright/test";

test.describe("Property Management", () => {
  test("should create a new property", async ({ page }) => {
    // Navigate to properties page
    await page.goto("/properties");

    // Click create button
    await page.click('button:has-text("Novo Imóvel")');

    // Fill form
    await page.fill('input[name="title"]', "Casa de Praia");
    await page.fill('input[name="price"]', "500000");
    await page.selectOption('select[name="type"]', "sale");

    // Submit
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator(".toast")).toContainText("Imóvel criado com sucesso");
  });
});
```

---

## Error Handling

### 1. Frontend Error Boundaries

```tsx
import { Component, ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 2. Async Error Handling

```typescript
// Helper function
async function resultify<T>(promise: Promise<T>): Promise<AsyncResult<T, Error>> {
  try {
    const data = await promise;
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(getErrorMessage(error))
    };
  }
}

// Usage
const result = await resultify(fetchData());
if (!result.success) {
  console.error(result.error);
  return;
}
// TypeScript knows result.data exists here
console.log(result.data);
```

---

## Performance Optimization

### 1. Virtualization for Large Lists

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

function PropertyList({ properties }: { properties: Property[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: properties.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: "600px", overflow: "auto" }}>
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const property = properties[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <PropertyCard property={property} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 2. Debouncing User Input

```typescript
import { useDebounce } from "@/hooks/useDebounce";

function SearchInput() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    if (debouncedSearch) {
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### 3. Image Optimization

```tsx
function OptimizedImage({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy" // Native lazy loading
      decoding="async" // Async decoding
      style={{ contentVisibility: "auto" }} // CSS containment
    />
  );
}
```

---

## Conclusão

Estes padrões devem ser seguidos em todo o projeto para manter consistência, qualidade e manutenibilidade do código. Para dúvidas ou sugestões de novos padrões, abra uma issue no repositório.

**Última atualização:** 2024-12-25
**Versão:** 1.0.0
