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
import { AlertTriangle } from "lucide-react";

export interface UnsavedChangesDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * Componente de diálogo para confirmar navegação com alterações não salvas
 *
 * @example
 * ```tsx
 * <UnsavedChangesDialog
 *   open={showDialog}
 *   onOpenChange={setShowDialog}
 *   onConfirm={handleConfirmNavigation}
 *   onCancel={handleCancelNavigation}
 * />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = "Alterações não salvas",
  description = "Você tem alterações não salvas. Deseja realmente sair sem salvar?",
  confirmText = "Sair sem salvar",
  cancelText = "Continuar editando",
}: UnsavedChangesDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange?.(false);
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange?.(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook para usar UnsavedChangesDialog de forma imperativa
 *
 * @example
 * ```tsx
 * const { confirm, dialog } = useUnsavedChangesDialog();
 *
 * const handleNavigate = async (to: string) => {
 *   if (isDirty) {
 *     const shouldLeave = await confirm();
 *     if (shouldLeave) {
 *       navigate(to);
 *     }
 *   } else {
 *     navigate(to);
 *   }
 * };
 *
 * return (
 *   <>
 *     <YourForm />
 *     {dialog}
 *   </>
 * );
 * ```
 */
export function useUnsavedChangesDialog() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    resolve: ((value: boolean) => void) | null;
  }>({
    isOpen: false,
    resolve: null,
  });

  const confirm = React.useCallback(() => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        resolve,
      });
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    dialogState.resolve?.(true);
    setDialogState({ isOpen: false, resolve: null });
  }, [dialogState.resolve]);

  const handleCancel = React.useCallback(() => {
    dialogState.resolve?.(false);
    setDialogState({ isOpen: false, resolve: null });
  }, [dialogState.resolve]);

  const dialog = (
    <UnsavedChangesDialog
      open={dialogState.isOpen}
      onOpenChange={(open) => {
        if (!open) handleCancel();
      }}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, dialog };
}
