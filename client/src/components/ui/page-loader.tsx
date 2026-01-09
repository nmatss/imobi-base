import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  /**
   * Tamanho do loader
   */
  size?: "sm" | "md" | "lg";
  /**
   * Texto personalizado
   */
  text?: string;
  /**
   * Descrição adicional
   */
  description?: string;
  /**
   * Tipo de loader
   */
  variant?: "spinner" | "dots" | "pulse";
  /**
   * Ocupar altura completa da viewport
   */
  fullScreen?: boolean;
  /**
   * Classes adicionais
   */
  className?: string;
}

/**
 * Componente de loading global para páginas
 *
 * @example
 * ```tsx
 * // Loading padrão
 * <PageLoader />
 *
 * // Loading com texto customizado
 * <PageLoader text="Processando dados" description="Isso pode levar alguns segundos" />
 *
 * // Loading em tela cheia
 * <PageLoader fullScreen />
 *
 * // Loading pequeno inline
 * <PageLoader size="sm" variant="dots" />
 * ```
 */
export function PageLoader({
  size = "md",
  text = "Carregando",
  description,
  variant = "spinner",
  fullScreen = false,
  className,
}: PageLoaderProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        fullScreen && "min-h-screen",
        !fullScreen && "py-12",
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={text}
    >
      <div className="flex flex-col items-center gap-4 px-4">
        {/* Loader Animation */}
        {variant === "spinner" && (
          <div className="relative">
            {/* Background ring */}
            <div className={cn("rounded-full border-4 border-muted", sizeClasses[size])} />
            {/* Animated ring */}
            <div
              className={cn(
                "absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin",
                sizeClasses[size]
              )}
            />
          </div>
        )}

        {variant === "dots" && (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "rounded-full bg-primary animate-bounce",
                  size === "sm" && "w-2 h-2",
                  size === "md" && "w-3 h-3",
                  size === "lg" && "w-4 h-4"
                )}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: "0.6s",
                }}
              />
            ))}
          </div>
        )}

        {variant === "pulse" && (
          <div className="relative">
            <div
              className={cn(
                "rounded-full bg-primary/20 animate-ping",
                sizeClasses[size]
              )}
            />
            <div
              className={cn(
                "absolute inset-0 rounded-full bg-primary animate-pulse",
                sizeClasses[size]
              )}
            />
          </div>
        )}

        {/* Text */}
        <div className="text-center space-y-1">
          <p className={cn("font-medium text-foreground", textSizeClasses[size])}>
            {text}...
          </p>
          {description && (
            <p className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-xs sm:text-sm")}>
              {description}
            </p>
          )}
        </div>

        {/* Screen reader text */}
        <span className="sr-only">{text}...</span>
      </div>
    </div>
  );
}

/**
 * Inline loader para uso em botões e componentes menores
 */
export function InlineLoader({
  size = "sm",
  className,
}: {
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const sizeClasses = {
    xs: "w-3 h-3",
    sm: "w-4 h-4",
    md: "w-5 h-5",
  };

  return (
    <Loader2
      className={cn("animate-spin text-current", sizeClasses[size], className)}
      aria-hidden="true"
    />
  );
}

/**
 * Loader para conteúdo de card
 */
export function CardLoader({
  lines = 3,
  showHeader = true,
}: {
  lines?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="space-y-4 p-6" role="status" aria-label="Carregando conteúdo">
      {showHeader && (
        <div className="space-y-2">
          <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
          <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-4 bg-muted animate-pulse rounded" />
        ))}
      </div>
      <span className="sr-only">Carregando conteúdo...</span>
    </div>
  );
}

/**
 * Loader para overlay de modal
 */
export function OverlayLoader({ text = "Processando" }: { text?: string }) {
  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
      role="status"
      aria-label={text}
    >
      <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-muted" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm font-medium">{text}...</p>
        <span className="sr-only">{text}...</span>
      </div>
    </div>
  );
}
