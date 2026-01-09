/**
 * Monitoring & Analytics Integration Example
 *
 * Este arquivo demonstra como usar Sentry e Analytics no ImobiBase
 */

import { useState, useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { captureException, addBreadcrumb, measureAsync, Profiler } from "@/lib/monitoring";
import { useAnalytics, usePageTracking, useTimeTracking } from "@/hooks/useAnalytics";

/**
 * Exemplo 1: Error Boundary com Sentry
 */
function ErrorBoundaryExample() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error("This is a test error captured by ErrorBoundary!");
  }

  return (
    <ErrorBoundary
      componentName="ErrorBoundaryExample"
      showDialog={true}
    >
      <Card>
        <CardHeader>
          <CardTitle>Error Boundary Test</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShouldError(true)}>
            Trigger Error
          </Button>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
}

/**
 * Exemplo 2: Captura Manual de Erros
 */
function ManualErrorCapture() {
  const handleAsyncError = async () => {
    try {
      // Adicionar breadcrumb antes da operação
      addBreadcrumb(
        "User clicked save button",
        "user_action",
        { action: "save", form: "property" }
      );

      // Simular operação que pode falhar
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Property" }),
      });

      if (!response.ok) {
        throw new Error("Failed to save property");
      }
    } catch (error) {
      // Capturar erro com contexto
      captureException(error as Error, {
        context: "property_creation",
        endpoint: "/api/properties",
        method: "POST",
      });

      // Mostrar erro para usuário
      alert("Erro ao salvar imóvel. Nossa equipe foi notificada.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Error Capture</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAsyncError}>
          Save Property (May Fail)
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Exemplo 3: Performance Monitoring
 */
function PerformanceMonitoring() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);

    // Medir performance da operação
    const result = await measureAsync(
      "load_dashboard_data",
      "http.request",
      async () => {
        // Simular fetch
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { properties: 42, leads: 18, contracts: 5 };
      }
    );

    setData(result);
    setLoading(false);
  };

  return (
    <Profiler id="PerformanceMonitoring" name="Performance Monitoring Component">
      <Card>
        <CardHeader>
          <CardTitle>Performance Monitoring</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={loadData} disabled={loading}>
            {loading ? "Loading..." : "Load Data"}
          </Button>
          {data && (
            <pre className="bg-muted p-2 rounded">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </Profiler>
  );
}

/**
 * Exemplo 4: Analytics Tracking
 */
function AnalyticsExample() {
  const {
    trackFeatureUsage,
    trackGoal,
    trackSearch,
    trackForm,
    trackButtonClick,
  } = useAnalytics();

  // Track time on page
  useTimeTracking("MonitoringExample");

  const handleFeatureClick = () => {
    trackFeatureUsage("properties", "filter", {
      filterType: "price",
      priceRange: "100k-500k",
    });
  };

  const handleConversion = () => {
    trackGoal("property_created", 1, {
      propertyType: "apartment",
      value: 250000,
    });
  };

  const handleSearch = () => {
    const query = "apartamento 2 quartos";
    trackSearch(query, 15); // 15 results
  };

  const handleFormSubmit = (success: boolean) => {
    trackForm("lead_creation", success, success ? undefined : "Email invalid");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analytics Tracking</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handleFeatureClick} variant="outline">
            Track Feature
          </Button>
          <Button onClick={handleConversion} variant="outline">
            Track Goal
          </Button>
          <Button onClick={handleSearch} variant="outline">
            Track Search
          </Button>
          <Button onClick={() => handleFormSubmit(true)} variant="outline">
            Track Form Success
          </Button>
          <Button onClick={() => handleFormSubmit(false)} variant="outline">
            Track Form Error
          </Button>
          <Button
            onClick={() => trackButtonClick("example_button", "MonitoringExample")}
            variant="outline"
          >
            Track Click
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Exemplo 5: Page Tracking
 */
function PageTrackingExample() {
  // Automatically track page views
  usePageTracking();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Page views are automatically tracked when the route changes.
          This includes navigation via React Router.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Main Example Component
 */
export default function MonitoringExample() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Monitoring & Analytics Examples
        </h1>
        <p className="text-muted-foreground">
          Demonstração de integração com Sentry, PostHog e Google Analytics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ErrorBoundaryExample />
        <ManualErrorCapture />
        <PerformanceMonitoring />
        <AnalyticsExample />
        <PageTrackingExample />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Use ErrorBoundary para componentes críticos</h3>
            <code className="text-sm bg-muted p-1 rounded">
              {'<ErrorBoundary componentName="CriticalFeature">'}
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Adicione breadcrumbs antes de operações críticas</h3>
            <code className="text-sm bg-muted p-1 rounded">
              {'addBreadcrumb("User action", "category", { data })'}
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Capture erros com contexto relevante</h3>
            <code className="text-sm bg-muted p-1 rounded">
              {'captureException(error, { userId, operation })'}
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Track eventos importantes</h3>
            <code className="text-sm bg-muted p-1 rounded">
              {'trackFeatureUsage("feature", "action", metadata)'}
            </code>
          </div>

          <div>
            <h3 className="font-semibold mb-2">5. Use Profiler para componentes complexos</h3>
            <code className="text-sm bg-muted p-1 rounded">
              {'<Profiler id="MyComponent">'}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
