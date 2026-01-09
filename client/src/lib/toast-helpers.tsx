/**
 * Toast Helpers - Comprehensive toast notification patterns using Sonner
 *
 * This module provides a complete toast notification API with:
 * - Success, error, warning, and info presets
 * - CRUD operation helpers
 * - Promise-based async operations
 * - Custom icons with Lucide
 * - Auto-dismiss configuration (5 seconds default)
 * - Rich color theming via Sonner
 *
 * @module toast-helpers
 * @see https://sonner.emilkowal.ski/
 */

import React from "react";
import { toast as sonnerToast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  Copy,
  Trash2,
  Save,
  Plus,
  Edit,
  Send,
  Download,
  Upload,
  RefreshCw,
  Archive,
  Star,
  Share2,
  Link as LinkIcon,
} from "lucide-react";

// ==================== CORE CONFIGURATION ====================

/**
 * Default durations for different toast types (in milliseconds)
 */
export const TOAST_DURATIONS = {
  SUCCESS: 4000,
  ERROR: 5000,
  WARNING: 4500,
  INFO: 4000,
  LOADING: Infinity, // Loading toasts don't auto-dismiss
  QUICK: 2000,       // Quick feedback (copy, etc)
  ACTION: 10000,     // Toasts with actions need more time
} as const;

/**
 * Toast position configuration
 * Can be: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
 */
export const TOAST_POSITION = "top-right" as const;

// ==================== BASE TOAST FUNCTIONS ====================

/**
 * Success toast with green checkmark icon
 * Auto-dismisses after 4 seconds
 *
 * @example
 * toast.success("Dados salvos com sucesso!");
 * toast.success("Lead criado", "O lead foi adicionado ao sistema.");
 */
export const success = (message: string, description?: string) => {
  return sonnerToast.success(message, {
    description,
    icon: <CheckCircle2 className="w-5 h-5" />,
    duration: TOAST_DURATIONS.SUCCESS,
  });
};

/**
 * Error toast with red X icon
 * Auto-dismisses after 5 seconds (longer for errors)
 *
 * @example
 * toast.error("Erro ao salvar");
 * toast.error("Falha na operação", "Por favor, tente novamente.");
 */
export const error = (message: string, description?: string) => {
  return sonnerToast.error(message, {
    description,
    icon: <XCircle className="w-5 h-5" />,
    duration: TOAST_DURATIONS.ERROR,
  });
};

/**
 * Warning toast with yellow alert triangle icon
 * Auto-dismisses after 4.5 seconds
 *
 * @example
 * toast.warning("Alterações não salvas");
 * toast.warning("Atenção", "Alguns campos estão vazios.");
 */
export const warning = (message: string, description?: string) => {
  return sonnerToast.warning(message, {
    description,
    icon: <AlertTriangle className="w-5 h-5" />,
    duration: TOAST_DURATIONS.WARNING,
  });
};

/**
 * Info toast with blue info icon
 * Auto-dismisses after 4 seconds
 *
 * @example
 * toast.info("Nova funcionalidade disponível");
 * toast.info("Dica", "Use Ctrl+K para busca rápida.");
 */
export const info = (message: string, description?: string) => {
  return sonnerToast.info(message, {
    description,
    icon: <Info className="w-5 h-5" />,
    duration: TOAST_DURATIONS.INFO,
  });
};

/**
 * Loading toast that doesn't auto-dismiss
 * Returns a toast ID that can be used to dismiss or update
 *
 * @example
 * const toastId = toast.loading("Salvando...");
 * // Later: toast.dismiss(toastId);
 */
export const loading = (message: string, description?: string) => {
  return sonnerToast.loading(message, {
    description,
    icon: <Loader2 className="w-5 h-5 animate-spin" />,
    duration: TOAST_DURATIONS.LOADING,
  });
};

/**
 * Dismiss a specific toast or all toasts
 *
 * @example
 * toast.dismiss(toastId);  // Dismiss specific toast
 * toast.dismiss();         // Dismiss all toasts
 */
export const dismiss = (toastId?: string | number) => {
  sonnerToast.dismiss(toastId);
};

// ==================== PROMISE-BASED TOASTS ====================

/**
 * Promise toast - automatically shows loading, success, or error based on promise state
 * Perfect for async operations like API calls
 *
 * @example
 * toast.promise(
 *   saveProperty(data),
 *   {
 *     loading: "Salvando imóvel...",
 *     success: "Imóvel salvo com sucesso!",
 *     error: "Erro ao salvar imóvel",
 *   }
 * );
 *
 * // With dynamic messages
 * toast.promise(
 *   fetchUser(id),
 *   {
 *     loading: "Carregando...",
 *     success: (data) => `Bem-vindo, ${data.name}!`,
 *     error: (err) => `Erro: ${err.message}`,
 *   }
 * );
 */
export const promise = <T,>(
  promiseToRun: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  }
) => {
  return sonnerToast.promise(promiseToRun, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
};

// ==================== CRUD OPERATION HELPERS ====================

/**
 * CRUD operation toasts with appropriate icons and messages
 */
export const crud = {
  /**
   * Toast for successful creation
   * @example toast.crud.created("Imóvel");
   */
  created: (itemName = "Item") => {
    sonnerToast.success(`${itemName} criado com sucesso`, {
      icon: <Plus className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Toast for successful update/save
   * @example toast.crud.updated("Lead");
   */
  updated: (itemName = "Item") => {
    sonnerToast.success(`${itemName} atualizado com sucesso`, {
      icon: <Save className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Toast for successful deletion
   * @example toast.crud.deleted("Contrato");
   */
  deleted: (itemName = "Item") => {
    sonnerToast.success(`${itemName} excluído com sucesso`, {
      icon: <Trash2 className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Generic save success
   * @example toast.crud.saved("Configurações");
   */
  saved: (itemName = "Dados") => {
    sonnerToast.success(`${itemName} salvos com sucesso`, {
      icon: <CheckCircle2 className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Toast for successful archival
   * @example toast.crud.archived("Lead");
   */
  archived: (itemName = "Item") => {
    sonnerToast.success(`${itemName} arquivado`, {
      icon: <Archive className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },
};

// ==================== ACTION-SPECIFIC HELPERS ====================

/**
 * Common action toasts with specific icons
 */
export const action = {
  /**
   * Copy to clipboard success
   * @example toast.action.copied("Link do imóvel");
   */
  copied: (itemName = "Texto") => {
    sonnerToast.success(`${itemName} copiado`, {
      description: "Copiado para área de transferência",
      icon: <Copy className="w-5 h-5" />,
      duration: TOAST_DURATIONS.QUICK,
    });
  },

  /**
   * Share action
   * @example toast.action.shared("Imóvel");
   */
  shared: (itemName = "Item") => {
    sonnerToast.success(`${itemName} compartilhado`, {
      icon: <Share2 className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Download success
   * @example toast.action.downloaded("Relatório");
   */
  downloaded: (itemName = "Arquivo") => {
    sonnerToast.success(`${itemName} baixado`, {
      icon: <Download className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Upload success
   * @example toast.action.uploaded("Imagens");
   */
  uploaded: (itemName = "Arquivo") => {
    sonnerToast.success(`${itemName} enviado com sucesso`, {
      icon: <Upload className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Send message success
   * @example toast.action.sent("WhatsApp");
   */
  sent: (itemName = "Mensagem") => {
    sonnerToast.success(`${itemName} enviado`, {
      icon: <Send className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Favorite/star action
   * @example toast.action.favorited("Imóvel");
   */
  favorited: (itemName = "Item") => {
    sonnerToast.success(`${itemName} favoritado`, {
      icon: <Star className="w-5 h-5" />,
      duration: TOAST_DURATIONS.SUCCESS,
    });
  },

  /**
   * Link copied
   * @example toast.action.linkCopied();
   */
  linkCopied: () => {
    sonnerToast.success("Link copiado", {
      description: "Link copiado para área de transferência",
      icon: <LinkIcon className="w-5 h-5" />,
      duration: TOAST_DURATIONS.QUICK,
    });
  },

  /**
   * Data refreshed
   * @example toast.action.refreshed("Imóveis");
   */
  refreshed: (itemName = "Dados") => {
    sonnerToast.success(`${itemName} atualizados`, {
      icon: <RefreshCw className="w-5 h-5" />,
      duration: TOAST_DURATIONS.QUICK,
    });
  },
};

// ==================== ERROR HELPERS ====================

/**
 * Common error scenarios
 */
export const errors = {
  /**
   * Generic operation error
   * @example toast.errors.operation("salvar o imóvel");
   */
  operation: (operation = "realizar a operação") => {
    sonnerToast.error(`Erro ao ${operation}`, {
      description: "Por favor, tente novamente",
      icon: <XCircle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.ERROR,
    });
  },

  /**
   * Validation error
   * @example toast.errors.validation("Preencha todos os campos obrigatórios");
   */
  validation: (message = "Verifique os campos do formulário") => {
    sonnerToast.error("Erro de validação", {
      description: message,
      icon: <AlertTriangle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.ERROR,
    });
  },

  /**
   * Network/connection error
   * @example toast.errors.network();
   */
  network: () => {
    sonnerToast.error("Erro de conexão", {
      description: "Verifique sua conexão com a internet",
      icon: <XCircle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.ERROR,
    });
  },

  /**
   * Permission denied error
   * @example toast.errors.permission();
   */
  permission: () => {
    sonnerToast.error("Acesso negado", {
      description: "Você não tem permissão para esta ação",
      icon: <XCircle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.ERROR,
    });
  },

  /**
   * Not found error
   * @example toast.errors.notFound("Imóvel");
   */
  notFound: (itemName = "Item") => {
    sonnerToast.error(`${itemName} não encontrado`, {
      description: "O recurso solicitado não existe",
      icon: <XCircle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.ERROR,
    });
  },
};

// ==================== WARNING HELPERS ====================

/**
 * Common warning scenarios
 */
export const warnings = {
  /**
   * Unsaved changes warning
   * @example toast.warnings.unsavedChanges();
   */
  unsavedChanges: () => {
    sonnerToast.warning("Alterações não salvas", {
      description: "Certifique-se de salvar antes de sair",
      icon: <AlertTriangle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.WARNING,
    });
  },

  /**
   * Incomplete data warning
   * @example toast.warnings.incompleteData();
   */
  incompleteData: () => {
    sonnerToast.warning("Dados incompletos", {
      description: "Preencha todos os campos para melhor resultado",
      icon: <AlertTriangle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.WARNING,
    });
  },

  /**
   * Custom warning
   * @example toast.warnings.custom("Atenção", "Ação irreversível");
   */
  custom: (title: string, description?: string) => {
    sonnerToast.warning(title, {
      description,
      icon: <AlertTriangle className="w-5 h-5" />,
      duration: TOAST_DURATIONS.WARNING,
    });
  },
};

// ==================== ADVANCED TOASTS ====================

/**
 * Toast with action button
 * Perfect for undo actions or confirmations
 *
 * @example
 * toast.withAction(
 *   "Lead arquivado",
 *   "Desfazer",
 *   () => restoreLead(id)
 * );
 */
export const withAction = (
  message: string,
  actionLabel: string,
  onAction: () => void,
  description?: string
) => {
  return sonnerToast(message, {
    description,
    duration: TOAST_DURATIONS.ACTION,
    action: {
      label: actionLabel,
      onClick: onAction,
    },
  });
};

/**
 * Confirmation toast with confirm and cancel buttons
 *
 * @example
 * toast.confirm(
 *   "Deseja excluir este imóvel?",
 *   () => deleteProperty(id),
 *   () => console.log("Canceled")
 * );
 */
export const confirm = (
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  description?: string
) => {
  return sonnerToast(message, {
    description,
    duration: TOAST_DURATIONS.ACTION,
    action: {
      label: "Confirmar",
      onClick: onConfirm,
    },
    cancel: {
      label: "Cancelar",
      onClick: onCancel,
    },
  });
};

/**
 * Custom toast with full control
 * Use when presets don't fit your needs
 *
 * @example
 * toast.custom({
 *   message: "Custom message",
 *   description: "Custom description",
 *   icon: <MyIcon />,
 *   duration: 3000,
 * });
 */
export const custom = (options: {
  message: string;
  description?: string;
  icon?: React.ReactNode;
  duration?: number;
  action?: { label: string; onClick: () => void };
}) => {
  return sonnerToast(options.message, {
    description: options.description,
    icon: options.icon,
    duration: options.duration || TOAST_DURATIONS.INFO,
    action: options.action,
  });
};

// ==================== MAIN EXPORT ====================

/**
 * Main toast object with all methods
 * Can be imported and used directly
 *
 * @example
 * import { toast } from "@/lib/toast-helpers";
 *
 * toast.success("Saved!");
 * toast.error("Failed", "Please try again");
 * toast.crud.created("Property");
 * toast.action.copied("Link");
 * toast.promise(fetchData(), {...});
 */
export const toast = {
  // Base methods
  success,
  error,
  warning,
  info,
  loading,
  dismiss,

  // Promise-based
  promise,

  // CRUD operations
  crud,

  // Actions
  action,

  // Errors
  errors,

  // Warnings
  warnings,

  // Advanced
  withAction,
  confirm,
  custom,
};

// Default export for convenience
export default toast;
