import React, { ReactNode } from "react";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import { UnsavedChangesBanner, UnsavedChangesBar } from "@/components/ui/unsaved-changes-banner";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";

interface FormWithFeedbackProps {
  /**
   * Se o formulário tem mudanças não salvas
   */
  hasUnsavedChanges: boolean;
  /**
   * Callback ao salvar
   */
  onSave?: () => void | Promise<void>;
  /**
   * Callback ao descartar mudanças
   */
  onDiscard?: () => void;
  /**
   * Se está salvando
   */
  isSaving?: boolean;
  /**
   * Conteúdo do formulário
   */
  children: ReactNode;
  /**
   * Mostrar banner no topo
   */
  showBanner?: boolean;
  /**
   * Mostrar barra colorida
   */
  showBar?: boolean;
  /**
   * Habilitar confirmação ao navegar
   */
  enableNavigationPrompt?: boolean;
  /**
   * Classes adicionais
   */
  className?: string;
}

/**
 * Wrapper para formulários com feedback visual completo
 *
 * Fornece:
 * - Banner de mudanças não salvas
 * - Barra colorida no topo
 * - Dialog de confirmação ao navegar
 *
 * @example
 * ```tsx
 * const [formData, setFormData] = useState(initialData);
 * const { isDirty, resetForm } = useFormDirtyState(formData, initialData);
 *
 * <FormWithFeedback
 *   hasUnsavedChanges={isDirty}
 *   onSave={handleSave}
 *   onDiscard={() => {
 *     setFormData(initialData);
 *     resetForm();
 *   }}
 *   isSaving={isSaving}
 * >
 *   <YourFormContent />
 * </FormWithFeedback>
 * ```
 */
export function FormWithFeedback({
  hasUnsavedChanges,
  onSave,
  onDiscard,
  isSaving = false,
  children,
  showBanner = true,
  showBar = true,
  enableNavigationPrompt = true,
  className,
}: FormWithFeedbackProps) {
  const { confirmNavigation, cancelNavigation, blocker } = useUnsavedChanges(
    enableNavigationPrompt && hasUnsavedChanges
  );

  return (
    <>
      {/* Banner de mudanças não salvas */}
      {showBanner && (
        <UnsavedChangesBanner
          show={hasUnsavedChanges}
          onSave={onSave}
          onDiscard={onDiscard}
          isSaving={isSaving}
        />
      )}

      {/* Dialog de confirmação */}
      {enableNavigationPrompt && (
        <UnsavedChangesDialog
          open={blocker.state === "blocked"}
          onOpenChange={(open) => !open && cancelNavigation()}
          onConfirm={confirmNavigation}
          onCancel={cancelNavigation}
        />
      )}

      {/* Container do formulário */}
      <div className={className}>
        {/* Barra colorida no topo */}
        {showBar && <UnsavedChangesBar show={hasUnsavedChanges} />}

        {/* Conteúdo */}
        {children}
      </div>
    </>
  );
}
