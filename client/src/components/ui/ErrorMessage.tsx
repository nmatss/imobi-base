import * as React from "react";
import {
  AlertCircle,
  AlertTriangle,
  Wifi,
  RefreshCw,
  Lock,
  ShieldAlert,
  Server,
  HelpCircle,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ErrorType,
  ErrorDetails,
  categorizeError,
  isRecoverableError,
  requiresReAuthentication,
} from "@/lib/error-handling";

// ==================== VARIANTES ====================

const errorMessageVariants = cva(
  "w-full",
  {
    variants: {
      variant: {
        inline: "border-l-4",
        card: "rounded-lg border",
        banner: "rounded-md",
        compact: "p-3",
      },
      severity: {
        error: "border-destructive bg-destructive/5",
        warning: "border-orange-500 bg-orange-500/5",
        info: "border-blue-500 bg-blue-500/5",
      },
    },
    defaultVariants: {
      variant: "card",
      severity: "error",
    },
  }
);

// ==================== ÍCONES POR TIPO DE ERRO ====================

const errorIcons: Record<ErrorType, React.ElementType> = {
  [ErrorType.NETWORK]: Wifi,
  [ErrorType.VALIDATION]: AlertCircle,
  [ErrorType.AUTHENTICATION]: Lock,
  [ErrorType.AUTHORIZATION]: ShieldAlert,
  [ErrorType.NOT_FOUND]: AlertCircle,
  [ErrorType.SERVER]: Server,
  [ErrorType.UNKNOWN]: HelpCircle,
};

// ==================== PROPS ====================

export interface ErrorMessageProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof errorMessageVariants> {
  /**
   * Erro a ser exibido (pode ser Error, string, ou ErrorDetails)
   */
  error: unknown | ErrorDetails;
  /**
   * Título customizado (sobrescreve o padrão)
   */
  title?: string;
  /**
   * Descrição customizada (sobrescreve a mensagem do erro)
   */
  description?: string;
  /**
   * Função para tentar novamente
   */
  onRetry?: () => void;
  /**
   * Texto do botão de retry
   */
  retryText?: string;
  /**
   * Estado de loading durante retry
   */
  isRetrying?: boolean;
  /**
   * Ações customizadas adicionais
   */
  actions?: React.ReactNode;
  /**
   * Se deve mostrar detalhes técnicos (apenas em desenvolvimento)
   */
  showTechnicalDetails?: boolean;
  /**
   * Se deve esconder o ícone
   */
  hideIcon?: boolean;
  /**
   * Callback quando o erro for fechado/dismissado
   */
  onDismiss?: () => void;
}

// ==================== COMPONENTE PRINCIPAL ====================

/**
 * Componente de mensagem de erro unificado
 * Categoriza automaticamente erros e exibe mensagens apropriadas
 *
 * @example
 * ```tsx
 * // Erro simples
 * <ErrorMessage error={error} onRetry={() => refetch()} />
 *
 * // Erro com título customizado
 * <ErrorMessage
 *   error={error}
 *   title="Falha ao carregar"
 *   variant="inline"
 * />
 *
 * // Erro com ações customizadas
 * <ErrorMessage
 *   error={error}
 *   actions={
 *     <div className="flex gap-2">
 *       <Button onClick={retry}>Tentar novamente</Button>
 *       <Button variant="outline" onClick={goBack}>Voltar</Button>
 *     </div>
 *   }
 * />
 * ```
 */
export function ErrorMessage({
  error,
  title,
  description,
  onRetry,
  retryText = "Tentar novamente",
  isRetrying = false,
  actions,
  showTechnicalDetails = false,
  hideIcon = false,
  onDismiss,
  variant = "card",
  severity = "error",
  className,
  ...props
}: ErrorMessageProps) {
  // Categoriza o erro se não for ErrorDetails
  const errorDetails: ErrorDetails = React.useMemo(() => {
    if (error && typeof error === 'object' && 'type' in error && 'message' in error) {
      return error as ErrorDetails;
    }
    return categorizeError(error);
  }, [error]);

  // Determina o ícone baseado no tipo de erro
  const Icon = errorIcons[errorDetails.type] || AlertCircle;

  // Determina se pode fazer retry
  const canRetry = isRecoverableError(errorDetails.type);

  // Determina a severidade baseada no tipo
  const errorSeverity = React.useMemo(() => {
    if (errorDetails.type === ErrorType.VALIDATION) return "warning";
    if (errorDetails.type === ErrorType.NOT_FOUND) return "info";
    return "error";
  }, [errorDetails.type]);

  const finalSeverity = severity || errorSeverity;

  return (
    <Alert
      className={cn(errorMessageVariants({ variant, severity: finalSeverity }), className)}
      role="alert"
      aria-live="polite"
      {...props}
    >
      {!hideIcon && (
        <Icon className="h-5 w-5" aria-hidden="true" />
      )}

      <div className="flex-1">
        <AlertTitle className="mb-2">
          {title || getTitleForErrorType(errorDetails.type)}
        </AlertTitle>

        <AlertDescription className="space-y-3">
          {/* Mensagem principal */}
          <p className="text-sm">
            {description || errorDetails.userMessage}
          </p>

          {/* Detalhes técnicos (apenas em desenvolvimento) */}
          {showTechnicalDetails && import.meta.env.DEV && errorDetails.originalError && (
            <details className="mt-2">
              <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {errorDetails.message}
              </pre>
              {errorDetails.statusCode && (
                <p className="text-xs text-muted-foreground mt-1">
                  Código: {errorDetails.statusCode}
                </p>
              )}
            </details>
          )}

          {/* Ações */}
          {(actions || (onRetry && canRetry)) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {actions ? (
                actions
              ) : onRetry && canRetry ? (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  size="sm"
                  variant={finalSeverity === "error" ? "destructive" : "default"}
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

              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                >
                  Dispensar
                </Button>
              )}
            </div>
          )}
        </AlertDescription>
      </div>
    </Alert>
  );
}

// ==================== VARIANTES ESPECIALIZADAS ====================

/**
 * Mensagem de erro inline compacta
 */
export function ErrorMessageInline({
  error,
  className,
  ...props
}: Omit<ErrorMessageProps, 'variant'>) {
  return (
    <ErrorMessage
      error={error}
      variant="inline"
      hideIcon={false}
      className={cn("py-2", className)}
      {...props}
    />
  );
}

/**
 * Mensagem de erro em formato de banner
 */
export function ErrorMessageBanner({
  error,
  className,
  ...props
}: Omit<ErrorMessageProps, 'variant'>) {
  return (
    <ErrorMessage
      error={error}
      variant="banner"
      className={className}
      {...props}
    />
  );
}

/**
 * Mensagem de erro compacta para cards
 */
export function ErrorMessageCompact({
  error,
  onRetry,
  className,
}: {
  error: unknown | ErrorDetails;
  onRetry?: () => void;
  className?: string;
}) {
  const errorDetails = React.useMemo(() => {
    if (error && typeof error === 'object' && 'type' in error) {
      return error as ErrorDetails;
    }
    return categorizeError(error);
  }, [error]);

  const Icon = errorIcons[errorDetails.type] || AlertCircle;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-md",
        "border border-destructive/50 bg-destructive/5",
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Icon className="h-4 w-4 text-destructive flex-shrink-0" />
        <p className="text-sm text-destructive font-medium truncate">
          {errorDetails.userMessage}
        </p>
      </div>
      {onRetry && isRecoverableError(errorDetails.type) && (
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

// ==================== HOOK PARA GERENCIAMENTO DE ERROS ====================

export interface UseErrorMessageReturn {
  error: ErrorDetails | null;
  setError: (error: unknown) => void;
  clearError: () => void;
  hasError: boolean;
  isRetrying: boolean;
  retry: () => Promise<void>;
}

/**
 * Hook para gerenciar estado de erro com retry
 */
export function useErrorMessage(
  retryFn?: () => void | Promise<void>
): UseErrorMessageReturn {
  const [error, setErrorState] = React.useState<ErrorDetails | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const setError = React.useCallback((error: unknown) => {
    const errorDetails = categorizeError(error);
    setErrorState(errorDetails);
  }, []);

  const clearError = React.useCallback(() => {
    setErrorState(null);
    setIsRetrying(false);
  }, []);

  const retry = React.useCallback(async () => {
    if (!retryFn) return;

    setIsRetrying(true);
    try {
      await retryFn();
      clearError();
    } catch (err) {
      setError(err);
    } finally {
      setIsRetrying(false);
    }
  }, [retryFn, setError, clearError]);

  return {
    error,
    setError,
    clearError,
    hasError: error !== null,
    isRetrying,
    retry,
  };
}

// ==================== UTILITÁRIOS ====================

function getTitleForErrorType(type: ErrorType): string {
  const titles: Record<ErrorType, string> = {
    [ErrorType.NETWORK]: "Erro de Conexão",
    [ErrorType.VALIDATION]: "Dados Inválidos",
    [ErrorType.AUTHENTICATION]: "Sessão Expirada",
    [ErrorType.AUTHORIZATION]: "Sem Permissão",
    [ErrorType.NOT_FOUND]: "Não Encontrado",
    [ErrorType.SERVER]: "Erro no Servidor",
    [ErrorType.UNKNOWN]: "Erro Inesperado",
  };

  return titles[type] || "Erro";
}
