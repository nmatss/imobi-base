import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Variantes do LoadingState
 * Baseado nas classes CSS skeleton do documento (linhas 732-745)
 */
const loadingStateVariants = cva(
  "animate-pulse bg-muted rounded",
  {
    variants: {
      variant: {
        card: "skeleton-card h-32 w-full",
        text: "skeleton-text h-4 w-full",
        circle: "skeleton-avatar rounded-full",
        table: "h-12 w-full",
        list: "h-16 w-full",
      },
    },
    defaultVariants: {
      variant: "text",
    },
  }
);

export interface LoadingStateProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingStateVariants> {
  /**
   * Número de elementos skeleton a serem renderizados
   */
  count?: number;
  /**
   * Espaçamento entre elementos (quando count > 1)
   */
  spacing?: "sm" | "md" | "lg";
}

/**
 * Componente de Loading State com skeleton loaders flexíveis
 *
 * Baseado nas classes CSS do sistema:
 * - skeleton-card: Card completo
 * - skeleton-text: Linha de texto
 * - skeleton-avatar: Avatar circular
 * - skeleton: Base genérica
 *
 * @example
 * ```tsx
 * // Card loading
 * <LoadingState variant="card" />
 *
 * // Multiple text lines
 * <LoadingState variant="text" count={3} spacing="md" />
 *
 * // Circle avatar
 * <LoadingState variant="circle" className="w-12 h-12" />
 *
 * // Table rows
 * <LoadingState variant="table" count={5} spacing="sm" />
 * ```
 */
export function LoadingState({
  variant = "text",
  count = 1,
  spacing = "md",
  className,
  ...props
}: LoadingStateProps) {
  const spacingClasses = {
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
  };

  if (count === 1) {
    return (
      <div
        className={cn(loadingStateVariants({ variant }), className)}
        role="status"
        aria-label="Carregando..."
        {...props}
      >
        <span className="sr-only">Carregando...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(spacingClasses[spacing])}
      role="status"
      aria-label="Carregando..."
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(loadingStateVariants({ variant }), className)}
          {...props}
        >
          <span className="sr-only">Carregando item {index + 1}...</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para conteúdo de texto com larguras variadas
 * Útil para simular parágrafos de texto
 */
export function TextSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-full", "w-5/6", "w-4/6", "w-full", "w-3/4"];

  return (
    <div className="space-y-2" role="status" aria-label="Carregando texto...">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-4 animate-pulse bg-muted rounded skeleton-text",
            widths[index % widths.length],
            className
          )}
        />
      ))}
      <span className="sr-only">Carregando texto...</span>
    </div>
  );
}

/**
 * Skeleton para cards com imagem e conteúdo
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "skeleton-card animate-pulse bg-muted rounded-lg overflow-hidden",
        className
      )}
      role="status"
      aria-label="Carregando card..."
    >
      <div className="h-48 bg-muted-foreground/10" />
      <div className="p-4 space-y-3">
        <div className="h-6 bg-muted-foreground/20 rounded w-3/4" />
        <div className="h-4 bg-muted-foreground/20 rounded w-1/2" />
        <div className="flex gap-2 pt-2">
          <div className="h-8 bg-muted-foreground/20 rounded w-20" />
          <div className="h-8 bg-muted-foreground/20 rounded w-20" />
        </div>
      </div>
      <span className="sr-only">Carregando card...</span>
    </div>
  );
}

/**
 * Skeleton para lista de itens com avatar
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-4 p-4", className)}
      role="status"
      aria-label="Carregando item..."
    >
      <div className="skeleton-avatar w-12 h-12 rounded-full animate-pulse bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted animate-pulse rounded w-3/4 skeleton-text" />
        <div className="h-3 bg-muted animate-pulse rounded w-1/2 skeleton-text" />
      </div>
      <div className="h-8 w-20 bg-muted animate-pulse rounded" />
      <span className="sr-only">Carregando item...</span>
    </div>
  );
}

/**
 * Skeleton para tabela com linhas e colunas
 */
export function TableRowSkeleton({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      role="status"
      aria-label="Carregando linha da tabela..."
    >
      {Array.from({ length: columns }).map((_, index) => (
        <div
          key={index}
          className="h-12 bg-muted animate-pulse rounded skeleton"
        />
      ))}
      <span className="sr-only">Carregando linha da tabela...</span>
    </div>
  );
}

export { loadingStateVariants };
