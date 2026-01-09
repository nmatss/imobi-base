import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";

export interface ConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  isLoading?: boolean;
}

/**
 * Componente reutilizável para confirmação de ações
 * Especialmente útil para ações destrutivas como exclusões
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Excluir imóvel?"
 *   description="Esta ação não pode ser desfeita. O imóvel será permanentemente removido."
 *   onConfirm={handleDelete}
 *   variant="destructive"
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  variant = "default",
  isLoading = false,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      const result = onConfirm();
      if (result instanceof Promise) {
        await result;
      }
      onOpenChange?.(false);
    } catch (error) {
      console.error("Error in confirm action:", error);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {loading ? (
              <>
                <Spinner className="mr-2" />
                Processando...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook para usar o ConfirmDialog de forma imperativa
 *
 * @example
 * ```tsx
 * const confirm = useConfirmDialog();
 *
 * const handleDelete = async () => {
 *   const confirmed = await confirm({
 *     title: "Excluir imóvel?",
 *     description: "Esta ação não pode ser desfeita.",
 *     variant: "destructive"
 *   });
 *
 *   if (confirmed) {
 *     // Executar ação
 *   }
 * };
 * ```
 */
export function useConfirmDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    config: Omit<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm"> | null;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    config: null,
    resolve: null,
  });

  const confirm = React.useCallback(
    (config: Omit<ConfirmDialogProps, "open" | "onOpenChange" | "onConfirm">) => {
      return new Promise<boolean>((resolve) => {
        setDialogState({
          isOpen: true,
          config,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = React.useCallback(() => {
    dialogState.resolve?.(true);
    setDialogState({ isOpen: false, config: null, resolve: null });
  }, [dialogState.resolve]);

  const handleCancel = React.useCallback(() => {
    dialogState.resolve?.(false);
    setDialogState({ isOpen: false, config: null, resolve: null });
  }, [dialogState.resolve]);

  const dialog = dialogState.config ? (
    <ConfirmDialog
      open={dialogState.isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      onConfirm={handleConfirm}
      {...dialogState.config}
    />
  ) : null;

  return { confirm, dialog };
}
