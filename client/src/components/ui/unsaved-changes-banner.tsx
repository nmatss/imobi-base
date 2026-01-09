import React from "react";
import { AlertCircle, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface UnsavedChangesBannerProps {
  /**
   * Se o banner deve ser exibido
   */
  show: boolean;
  /**
   * Callback ao clicar em salvar
   */
  onSave?: () => void;
  /**
   * Callback ao clicar em descartar
   */
  onDiscard?: () => void;
  /**
   * Se o save está em loading
   */
  isSaving?: boolean;
  /**
   * Texto customizado
   */
  message?: string;
  /**
   * Classes adicionais
   */
  className?: string;
  /**
   * Variante da cor
   */
  variant?: "warning" | "info" | "danger";
}

/**
 * Banner de aviso de mudanças não salvas
 *
 * @example
 * ```tsx
 * <UnsavedChangesBanner
 *   show={hasUnsavedChanges}
 *   onSave={handleSave}
 *   onDiscard={() => setHasUnsavedChanges(false)}
 *   isSaving={isSaving}
 * />
 * ```
 */
export function UnsavedChangesBanner({
  show,
  onSave,
  onDiscard,
  isSaving = false,
  message = "Você tem alterações não salvas",
  className,
  variant = "warning",
}: UnsavedChangesBannerProps) {
  if (!show) return null;

  const variantClasses = {
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-100",
    info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100",
    danger: "bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100",
  };

  const iconClasses = {
    warning: "text-yellow-600 dark:text-yellow-400",
    info: "text-blue-600 dark:text-blue-400",
    danger: "text-red-600 dark:text-red-400",
  };

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b px-4 py-3 shadow-md animate-in slide-in-from-top duration-300",
        variantClasses[variant],
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertCircle className={cn("h-5 w-5", iconClasses[variant])} aria-hidden="true" />
          <p className="text-sm font-medium">{message}</p>
        </div>

        {(onSave || onDiscard) && (
          <div className="flex items-center gap-2">
            {onSave && (
              <Button
                size="sm"
                onClick={onSave}
                disabled={isSaving}
                isLoading={isSaving}
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Save className="h-4 w-4" />
                Salvar
              </Button>
            )}
            {onDiscard && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDiscard}
                disabled={isSaving}
                className="text-current hover:bg-white/50 dark:hover:bg-black/20"
              >
                Descartar
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Banner em forma de barra no topo do card/formulário
 */
export function UnsavedChangesBar({
  show,
  className,
  variant = "warning",
}: Pick<UnsavedChangesBannerProps, "show" | "className" | "variant">) {
  if (!show) return null;

  const variantClasses = {
    warning: "bg-yellow-400 dark:bg-yellow-600",
    info: "bg-blue-400 dark:bg-blue-600",
    danger: "bg-red-400 dark:bg-red-600",
  };

  return (
    <div
      className={cn(
        "h-1 w-full animate-in slide-in-from-top duration-300",
        variantClasses[variant],
        className
      )}
      role="status"
      aria-label="Alterações não salvas"
    />
  );
}
