/**
 * Hook unificado para mutations com error handling robusto
 * Integra automaticamente logging, toast notifications e retry
 */

import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast-enhanced";
import {
  categorizeError,
  errorLogger,
  ErrorDetails,
  ErrorType,
  getOperationErrorMessage,
  isRecoverableError,
} from "@/lib/error-handling";

// ==================== TIPOS ====================

export type OperationType = "create" | "update" | "delete" | "fetch";

export interface ApiMutationOptions<TData, TVariables> {
  /** Tipo de operação (para mensagens específicas) */
  operation: OperationType;
  /** Nome do recurso (ex: "lead", "propriedade") */
  resourceName: string;
  /** Keys do React Query para invalidar */
  invalidateKeys?: string[][];
  /** Mensagem de sucesso customizada */
  successMessage?: string | ((data: TData) => string);
  /** Mensagem de erro customizada */
  errorMessage?: string | ((error: ErrorDetails) => string);
  /** Se deve mostrar toast de sucesso */
  showSuccessToast?: boolean;
  /** Se deve mostrar toast de erro */
  showErrorToast?: boolean;
  /** Callback de sucesso adicional */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /** Callback de erro adicional */
  onError?: (error: ErrorDetails, variables: TVariables) => void;
  /** Contexto adicional para logging */
  logContext?: Record<string, any>;
}

// ==================== HOOK PRINCIPAL ====================

/**
 * Hook para mutations com error handling automático
 *
 * @example
 * ```tsx
 * const createLead = useApiMutation({
 *   mutationFn: (data) => createLeadApi(data),
 *   operation: "create",
 *   resourceName: "lead",
 *   invalidateKeys: [["leads"]],
 * });
 *
 * // Usar
 * createLead.mutate(leadData);
 * ```
 */
export function useApiMutation<TData = unknown, TVariables = unknown>(
  options: ApiMutationOptions<TData, TVariables> &
    Pick<UseMutationOptions<TData, Error, TVariables>, "mutationFn" | "mutationKey">
) {
  const queryClient = useQueryClient();
  const { success, error: showErrorToast } = useToast();

  const {
    operation,
    resourceName,
    invalidateKeys = [],
    successMessage,
    errorMessage,
    showSuccessToast = true,
    showErrorToast: showErrorToastProp = true,
    onSuccess: onSuccessCallback,
    onError: onErrorCallback,
    logContext = {},
    mutationFn,
    mutationKey,
  } = options;

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    mutationKey,

    onSuccess: (data, variables, context) => {
      // Invalida queries
      if (invalidateKeys.length > 0) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      // Toast de sucesso
      if (showSuccessToast) {
        const message =
          typeof successMessage === "function"
            ? successMessage(data)
            : successMessage || getDefaultSuccessMessage(operation, resourceName);

        success(message);
      }

      // Callback customizado
      onSuccessCallback?.(data, variables);
    },

    onError: (error, variables, context) => {
      // Categoriza o erro
      const errorDetails = categorizeError(error);

      // Log do erro
      errorLogger.log(error, {
        operation,
        resourceName,
        variables,
        ...logContext,
      });

      // Toast de erro
      if (showErrorToastProp) {
        const message =
          typeof errorMessage === "function"
            ? errorMessage(errorDetails)
            : errorMessage ||
              getOperationErrorMessage(operation, errorDetails.type) ||
              errorDetails.userMessage;

        showErrorToast("Erro", message);
      }

      // Callback customizado
      onErrorCallback?.(errorDetails, variables);
    },

    retry: (failureCount, error) => {
      const errorDetails = categorizeError(error);

      // Não retenta erros de validação, autenticação ou autorização
      if (
        [ErrorType.VALIDATION, ErrorType.AUTHENTICATION, ErrorType.AUTHORIZATION].includes(
          errorDetails.type
        )
      ) {
        return false;
      }

      // Retenta uma vez para erros recuperáveis
      if (isRecoverableError(errorDetails.type)) {
        return failureCount < 1;
      }

      return false;
    },

    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s...
      return Math.min(1000 * 2 ** attemptIndex, 10000);
    },
  });
}

// ==================== HOOKS ESPECIALIZADOS ====================

/**
 * Hook para operações de criação
 */
export function useCreateMutation<TData = unknown, TVariables = unknown>(
  options: Omit<ApiMutationOptions<TData, TVariables>, "operation"> &
    Pick<UseMutationOptions<TData, Error, TVariables>, "mutationFn" | "mutationKey">
) {
  return useApiMutation({
    ...options,
    operation: "create",
  });
}

/**
 * Hook para operações de atualização
 */
export function useUpdateMutation<TData = unknown, TVariables = unknown>(
  options: Omit<ApiMutationOptions<TData, TVariables>, "operation"> &
    Pick<UseMutationOptions<TData, Error, TVariables>, "mutationFn" | "mutationKey">
) {
  return useApiMutation({
    ...options,
    operation: "update",
  });
}

/**
 * Hook para operações de exclusão
 */
export function useDeleteMutation<TData = unknown, TVariables = unknown>(
  options: Omit<ApiMutationOptions<TData, TVariables>, "operation"> &
    Pick<UseMutationOptions<TData, Error, TVariables>, "mutationFn" | "mutationKey">
) {
  return useApiMutation({
    ...options,
    operation: "delete",
  });
}

// ==================== UTILITÁRIOS ====================

function getDefaultSuccessMessage(operation: OperationType, resourceName: string): string {
  const messages: Record<OperationType, string> = {
    create: `${capitalize(resourceName)} criado com sucesso`,
    update: `${capitalize(resourceName)} atualizado com sucesso`,
    delete: `${capitalize(resourceName)} removido com sucesso`,
    fetch: `${capitalize(resourceName)} carregado com sucesso`,
  };

  return messages[operation] || "Operação concluída com sucesso";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
