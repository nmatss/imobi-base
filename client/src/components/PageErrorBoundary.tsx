/**
 * Page-Level Error Boundary
 * Wraps page sections with customizable error handling and recovery
 */

import React from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  /** Nome da página/seção para contexto */
  pageName?: string;
  /** Nome do componente específico */
  componentName?: string;
  /** Se deve mostrar diálogo de feedback do Sentry */
  showDialog?: boolean;
  /** Fallback customizado (se não quiser o padrão) */
  fallback?: React.ReactNode;
  /** Callback quando erro é capturado */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Se deve tentar recuperar automaticamente */
  autoRecover?: boolean;
  /** Tempo para recuperação automática (ms) */
  autoRecoverDelay?: number;
}

/**
 * Fallback UI leve para seções dentro de páginas
 */
function SectionErrorFallback({
  error,
  resetError,
  componentName,
}: {
  error: Error;
  resetError: () => void;
  componentName?: string;
}) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <CardTitle className="text-lg">
            Erro ao carregar {componentName || "esta seção"}
          </CardTitle>
        </div>
        <CardDescription>
          Ocorreu um erro inesperado. Você pode tentar novamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {import.meta.env.DEV && (
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="font-mono text-xs text-destructive">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            onClick={resetError}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Tentar Novamente
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            size="sm"
            className="gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Recarregar Página
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Page Error Boundary Component
 * Wraps page content with error handling
 */
export function PageErrorBoundary({
  children,
  pageName,
  componentName,
  showDialog = false,
  fallback,
  onError,
  autoRecover = false,
  autoRecoverDelay = 3000,
}: PageErrorBoundaryProps) {
  const [recoveryAttempts, setRecoveryAttempts] = React.useState(0);
  const [isRecovering, setIsRecovering] = React.useState(false);

  const handleError = React.useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      // Log para console
      console.error(
        `[PageErrorBoundary] Error in ${pageName || componentName || "page"}:`,
        error,
        errorInfo
      );

      // Callback customizado
      onError?.(error, errorInfo);

      // Auto-recovery (com limite de tentativas)
      if (autoRecover && recoveryAttempts < 3) {
        setIsRecovering(true);
        setTimeout(() => {
          setRecoveryAttempts((prev) => prev + 1);
          setIsRecovering(false);
          // ErrorBoundary will reset via key change
        }, autoRecoverDelay);
      }
    },
    [pageName, componentName, onError, autoRecover, autoRecoverDelay, recoveryAttempts]
  );

  // Fallback customizado ou padrão
  const errorFallback = fallback || (
    <SectionErrorFallback
      error={new Error("Erro desconhecido")}
      resetError={() => setRecoveryAttempts(0)}
      componentName={componentName || pageName}
    />
  );

  return (
    <ErrorBoundary
      key={`boundary-${recoveryAttempts}`}
      componentName={componentName || pageName || "PageSection"}
      onError={handleError}
      showDialog={showDialog}
    >
      {isRecovering ? (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-warning">
              <RefreshCcw className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                Recuperando {componentName || "seção"}... (Tentativa{" "}
                {recoveryAttempts + 1}/3)
              </span>
            </div>
          </CardContent>
        </Card>
      ) : (
        children
      )}
    </ErrorBoundary>
  );
}

/**
 * Hook para disparar erro manualmente (útil para testes)
 */
export function useThrowError() {
  const [error, setError] = React.useState<Error | null>(null);

  const throwError = React.useCallback((message: string) => {
    setError(new Error(message));
  }, []);

  if (error) {
    throw error;
  }

  return throwError;
}

/**
 * HOC para adicionar ErrorBoundary a componentes
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => (
    <PageErrorBoundary componentName={componentName || Component.name}>
      <Component {...props} />
    </PageErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    componentName || Component.name || "Component"
  })`;

  return WrappedComponent;
}
