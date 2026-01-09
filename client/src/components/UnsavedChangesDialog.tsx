import React from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface UnsavedChangesDialogProps {
  /**
   * Se o dialog deve estar aberto
   */
  open: boolean;
  /**
   * Callback ao mudar estado
   */
  onOpenChange: (open: boolean) => void;
  /**
   * Callback ao confirmar saída sem salvar
   */
  onConfirm: () => void;
  /**
   * Callback ao cancelar (continuar editando)
   */
  onCancel?: () => void;
}

/**
 * Dialog de confirmação para mudanças não salvas
 * Usado quando o usuário tenta navegar ou fechar com dados não salvos
 *
 * @example
 * ```tsx
 * const { hasUnsavedChanges, confirmNavigation, cancelNavigation, blocker } = useUnsavedChanges();
 *
 * <UnsavedChangesDialog
 *   open={blocker.state === "blocked"}
 *   onOpenChange={(open) => !open && cancelNavigation()}
 *   onConfirm={confirmNavigation}
 * />
 * ```
 */
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: UnsavedChangesDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Descartar alterações?"
      description="Você tem alterações não salvas. Se sair agora, todas as alterações serão perdidas. Tem certeza que deseja continuar?"
      confirmText="Descartar e sair"
      cancelText="Continuar editando"
      onConfirm={onConfirm}
      variant="destructive"
    />
  );
}
