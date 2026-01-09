import * as React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Variantes do ErrorState
 */
const errorStateVariants = cva(
  "flex flex-col items-center justify-center gap-4 text-center p-6 md:p-12",
  {
    variants: {
      variant: {
        default: "text-muted-foreground",
        destructive: "text-destructive",
        warning: "text-orange-600 dark:text-orange-400",
      },
      size: {
        sm: "min-h-[200px]",
        md: "min-h-[300px]",
        lg: "min-h-[400px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ErrorStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorStateVariants> {
  /**
   * Título do erro
   */
  title?: string;
  /**
   * Descrição detalhada do erro
   */
  description?: string;
  /**
   * Função callback para tentar novamente
   */
  onRetry?: () => void;
  /**
   * Texto do botão de retry
   */
  retryText?: string;
  /**
   * Ícone customizado (opcional)
   */
  icon?: React.ReactNode;
  /**
   * Ações adicionais customizadas
   */
  actions?: React.ReactNode;
  /**
   * Estado de loading durante retry
   */
  isRetrying?: boolean;
}

/**
 * Componente de estado de erro genérico
 * Similar ao EmptyState mas com ícone de erro e cores de erro
 *
 * @example
 * ```tsx
 * // Erro básico com retry
 * <ErrorState
 *   title="Erro ao carregar dados"
 *   description="Não foi possível carregar os dados. Tente novamente."
 *   onRetry={() => refetch()}
 * />
 *
 * // Erro destrutivo
 * <ErrorState
 *   variant="destructive"
 *   title="Falha crítica"
 *   description="Ocorreu um erro grave no sistema."
 * />
 *
 * // Erro com ações customizadas
 * <ErrorState
 *   title="Sem conexão"
 *   description="Verifique sua conexão com a internet"
 *   actions={
 *     <div className="flex gap-2">
 *       <Button onClick={retry}>Tentar novamente</Button>
 *       <Button variant="outline" onClick={goHome}>Ir para início</Button>
 *     </div>
 *   }
 * />
 * ```
 */
export function ErrorState({
  title = "Algo deu errado",
  description = "Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente.",
  onRetry,
  retryText = "Tentar novamente",
  icon,
  actions,
  variant = "default",
  size = "md",
  isRetrying = false,
  className,
  ...props
}: ErrorStateProps) {
  const iconColor = {
    default: "text-muted-foreground",
    destructive: "text-destructive",
    warning: "text-orange-600 dark:text-orange-400",
  };

  return (
    <div
      className={cn(errorStateVariants({ variant, size }), className)}
      role="alert"
      aria-live="polite"
      {...props}
    >
      {/* Ícone */}
      <div
        className={cn(
          "flex items-center justify-center w-16 h-16 rounded-full bg-muted",
          iconColor[variant || "default"]
        )}
        aria-hidden="true"
      >
        {icon || <AlertCircle className="w-8 h-8" />}
      </div>

      {/* Conteúdo */}
      <div className="max-w-sm space-y-2">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Ações */}
      {actions ? (
        <div className="flex flex-col sm:flex-row gap-2">{actions}</div>
      ) : onRetry ? (
        <Button
          onClick={onRetry}
          disabled={isRetrying}
          variant={variant === "destructive" ? "destructive" : "default"}
          className="min-w-[140px]"
        >
          {isRetrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Tentando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              {retryText}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * ErrorState compacto para uso em cards ou seções menores
 */
export function ErrorStateCompact({
  message = "Erro ao carregar",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg border border-destructive/50 bg-destructive/5",
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
        <p className="text-sm text-destructive font-medium">{message}</p>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          size="sm"
          variant="ghost"
          className="flex-shrink-0"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Tentar novamente</span>
        </Button>
      )}
    </div>
  );
}

/**
 * ErrorState inline para uso em formulários
 */
export function ErrorStateInline({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-2 text-sm text-destructive", className)}
      role="alert"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Hook para gerenciar estado de erro com retry automático
 */
export function useErrorState() {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const retryFnRef = React.useRef<(() => void | Promise<void>) | null>(null);

  const handleError = React.useCallback((error: Error, retryFn?: () => void | Promise<void>) => {
    setError(error);
    if (retryFn) {
      retryFnRef.current = retryFn;
    }
  }, []);

  const handleRetry = React.useCallback(async () => {
    if (!retryFnRef.current) return;

    setIsRetrying(true);
    try {
      await retryFnRef.current();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Erro desconhecido"));
    } finally {
      setIsRetrying(false);
    }
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  return {
    error,
    isRetrying,
    handleError,
    handleRetry,
    clearError,
    hasError: error !== null,
  };
}

export { errorStateVariants };
