import { toast as sonnerToast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

/**
 * Hook para feedback visual via toast notifications
 * Usa Sonner para toasts modernos e acessíveis
 *
 * @example
 * ```tsx
 * const toast = useToastFeedback();
 *
 * // Toast de sucesso
 * toast.success("Dados salvos com sucesso!");
 *
 * // Toast de erro
 * toast.error("Erro ao salvar dados");
 *
 * // Toast com promise (loading -> success/error)
 * toast.promise(saveData(), {
 *   loading: "Salvando...",
 *   success: "Salvo com sucesso!",
 *   error: "Erro ao salvar"
 * });
 * ```
 */
export function useToastFeedback() {
  const success = (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      icon: CheckCircle2,
      duration: 4000,
    });
  };

  const error = (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      icon: XCircle,
      duration: 5000,
    });
  };

  const warning = (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: AlertTriangle,
      duration: 4500,
    });
  };

  const info = (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      icon: Info,
      duration: 4000,
    });
  };

  const loading = (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
      duration: Infinity, // Não fecha automaticamente
    });
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  };

  const dismiss = (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
  };
}

/**
 * Helpers de toast para operações CRUD comuns
 */
export const toastHelpers = {
  /**
   * Toast de sucesso ao salvar
   */
  saved: (itemName = "Dados") => {
    sonnerToast.success(`${itemName} salvos com sucesso`, {
      icon: CheckCircle2,
      duration: 3000,
    });
  },

  /**
   * Toast de sucesso ao criar
   */
  created: (itemName = "Item") => {
    sonnerToast.success(`${itemName} criado com sucesso`, {
      icon: CheckCircle2,
      duration: 3000,
    });
  },

  /**
   * Toast de sucesso ao atualizar
   */
  updated: (itemName = "Item") => {
    sonnerToast.success(`${itemName} atualizado com sucesso`, {
      icon: CheckCircle2,
      duration: 3000,
    });
  },

  /**
   * Toast de sucesso ao deletar
   */
  deleted: (itemName = "Item") => {
    sonnerToast.success(`${itemName} deletado com sucesso`, {
      icon: CheckCircle2,
      duration: 3000,
    });
  },

  /**
   * Toast de erro genérico
   */
  errorGeneric: (action = "realizar a operação") => {
    sonnerToast.error(`Erro ao ${action}`, {
      description: "Por favor, tente novamente",
      icon: XCircle,
      duration: 5000,
    });
  },

  /**
   * Toast de erro de validação
   */
  validationError: (message = "Verifique os campos do formulário") => {
    sonnerToast.error("Erro de validação", {
      description: message,
      icon: AlertTriangle,
      duration: 5000,
    });
  },

  /**
   * Toast de aviso ao sair sem salvar
   */
  unsavedChanges: () => {
    sonnerToast.warning("Você tem alterações não salvas", {
      description: "Certifique-se de salvar antes de sair",
      icon: AlertTriangle,
      duration: 5000,
    });
  },

  /**
   * Toast de sucesso ao copiar
   */
  copied: (itemName = "Texto") => {
    sonnerToast.success(`${itemName} copiado para área de transferência`, {
      icon: CheckCircle2,
      duration: 2000,
    });
  },

  /**
   * Toast para operações que requerem confirmação
   */
  confirmAction: (message: string, onConfirm: () => void) => {
    sonnerToast(message, {
      action: {
        label: "Confirmar",
        onClick: onConfirm,
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
      duration: 10000,
    });
  },
};
