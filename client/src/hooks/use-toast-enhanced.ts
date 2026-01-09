import { toast as sonnerToast } from "sonner";

/**
 * Hook melhorado para toast notifications usando Sonner
 * Fornece métodos tipados para success, error, warning e info
 */
export function useToast() {
  const success = (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  };

  const error = (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  };

  const warning = (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 4500,
    });
  };

  const info = (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  };

  const loading = (message: string) => {
    return sonnerToast.loading(message);
  };

  const promise = <T,>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    });
  };

  const dismiss = (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  };

  // Create a toast object that has the same methods
  const toast = {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
  };

  return {
    success,
    error,
    warning,
    info,
    loading,
    promise,
    dismiss,
    toast, // Object with all methods for destructuring
  };
}

// Export direto das funções para uso sem hook
export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 4000,
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  },
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 4500,
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 4000,
    });
  },
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },
  promise: <T,>(
    promise: Promise<T>,
    {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: loadingMessage,
      success: successMessage,
      error: errorMessage,
    });
  },
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },
};
