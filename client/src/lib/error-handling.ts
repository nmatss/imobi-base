/**
 * Sistema robusto de tratamento de erros
 * Fornece categorização, mensagens amigáveis e logging unificado
 */

// ==================== TIPOS DE ERRO ====================

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  userMessage: string;
  originalError?: Error;
  statusCode?: number;
  context?: Record<string, any>;
  timestamp: Date;
}

// ==================== CATEGORIZAÇÃO DE ERROS ====================

/**
 * Categoriza erros baseado na mensagem ou código de status
 */
export function categorizeError(error: unknown): ErrorDetails {
  const timestamp = new Date();

  // Caso seja uma instância de Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Erros de rede
    if (
      message.includes('failed to fetch') ||
      message.includes('network') ||
      message.includes('timeout')
    ) {
      return {
        type: ErrorType.NETWORK,
        message: error.message,
        userMessage: 'Erro de conexão. Verifique sua internet e tente novamente.',
        originalError: error,
        timestamp,
      };
    }

    // Erros de autenticação
    if (
      message.includes('401') ||
      message.includes('unauthorized') ||
      message.includes('not authenticated')
    ) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: error.message,
        userMessage: 'Sua sessão expirou. Por favor, faça login novamente.',
        originalError: error,
        statusCode: 401,
        timestamp,
      };
    }

    // Erros de autorização
    if (
      message.includes('403') ||
      message.includes('forbidden') ||
      message.includes('not authorized')
    ) {
      return {
        type: ErrorType.AUTHORIZATION,
        message: error.message,
        userMessage: 'Você não tem permissão para realizar esta ação.',
        originalError: error,
        statusCode: 403,
        timestamp,
      };
    }

    // Erros de não encontrado
    if (
      message.includes('404') ||
      message.includes('not found')
    ) {
      return {
        type: ErrorType.NOT_FOUND,
        message: error.message,
        userMessage: 'O recurso solicitado não foi encontrado.',
        originalError: error,
        statusCode: 404,
        timestamp,
      };
    }

    // Erros de validação
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message,
        userMessage: 'Verifique os dados informados e tente novamente.',
        originalError: error,
        statusCode: 400,
        timestamp,
      };
    }

    // Erros de servidor
    if (message.includes('500') || message.includes('server error')) {
      return {
        type: ErrorType.SERVER,
        message: error.message,
        userMessage: 'Erro no servidor. Tente novamente em alguns instantes.',
        originalError: error,
        statusCode: 500,
        timestamp,
      };
    }

    // Erro desconhecido
    return {
      type: ErrorType.UNKNOWN,
      message: error.message,
      userMessage: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
      originalError: error,
      timestamp,
    };
  }

  // Caso seja uma string
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
      userMessage: error,
      timestamp,
    };
  }

  // Caso seja outro tipo
  return {
    type: ErrorType.UNKNOWN,
    message: 'Unknown error',
    userMessage: 'Ocorreu um erro inesperado. Por favor, tente novamente.',
    timestamp,
  };
}

// ==================== MENSAGENS DE ERRO ESPECÍFICAS ====================

/**
 * Mapeia tipos de operação para mensagens de erro específicas
 */
export const operationErrorMessages = {
  create: {
    [ErrorType.NETWORK]: 'Erro ao criar. Verifique sua conexão.',
    [ErrorType.VALIDATION]: 'Dados inválidos. Verifique os campos.',
    [ErrorType.AUTHENTICATION]: 'Sessão expirou. Faça login novamente.',
    [ErrorType.AUTHORIZATION]: 'Sem permissão para criar.',
    [ErrorType.SERVER]: 'Erro no servidor ao criar.',
    [ErrorType.UNKNOWN]: 'Erro ao criar. Tente novamente.',
    [ErrorType.NOT_FOUND]: 'Recurso não encontrado.',
  },
  update: {
    [ErrorType.NETWORK]: 'Erro ao atualizar. Verifique sua conexão.',
    [ErrorType.VALIDATION]: 'Dados inválidos. Verifique os campos.',
    [ErrorType.AUTHENTICATION]: 'Sessão expirou. Faça login novamente.',
    [ErrorType.AUTHORIZATION]: 'Sem permissão para atualizar.',
    [ErrorType.NOT_FOUND]: 'Registro não encontrado.',
    [ErrorType.SERVER]: 'Erro no servidor ao atualizar.',
    [ErrorType.UNKNOWN]: 'Erro ao atualizar. Tente novamente.',
  },
  delete: {
    [ErrorType.NETWORK]: 'Erro ao excluir. Verifique sua conexão.',
    [ErrorType.VALIDATION]: 'Não é possível excluir este registro.',
    [ErrorType.AUTHENTICATION]: 'Sessão expirou. Faça login novamente.',
    [ErrorType.AUTHORIZATION]: 'Sem permissão para excluir.',
    [ErrorType.NOT_FOUND]: 'Registro não encontrado.',
    [ErrorType.SERVER]: 'Erro no servidor ao excluir.',
    [ErrorType.UNKNOWN]: 'Erro ao excluir. Tente novamente.',
  },
  fetch: {
    [ErrorType.NETWORK]: 'Erro ao carregar. Verifique sua conexão.',
    [ErrorType.VALIDATION]: 'Parâmetros de busca inválidos.',
    [ErrorType.AUTHENTICATION]: 'Sessão expirou. Faça login novamente.',
    [ErrorType.AUTHORIZATION]: 'Sem permissão para visualizar.',
    [ErrorType.NOT_FOUND]: 'Dados não encontrados.',
    [ErrorType.SERVER]: 'Erro no servidor ao carregar.',
    [ErrorType.UNKNOWN]: 'Erro ao carregar. Tente novamente.',
  },
} as const;

/**
 * Obtém mensagem de erro específica para uma operação
 */
export function getOperationErrorMessage(
  operation: keyof typeof operationErrorMessages,
  errorType: ErrorType,
  customMessage?: string,
): string {
  if (customMessage) return customMessage;
  return operationErrorMessages[operation][errorType];
}

// ==================== LOGGER DE ERROS ====================

export interface ErrorLogEntry {
  errorDetails: ErrorDetails;
  context: {
    url?: string;
    component?: string;
    action?: string;
    userId?: string;
    [key: string]: any;
  };
}

class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;
  private isDevelopment = import.meta.env.DEV;

  log(error: unknown, context?: ErrorLogEntry['context']): void {
    const errorDetails = categorizeError(error);

    const entry: ErrorLogEntry = {
      errorDetails,
      context: {
        url: window.location.href,
        ...context,
      },
    };

    // Adiciona ao histórico
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log no console em desenvolvimento
    if (this.isDevelopment) {
      this.logToConsole(entry);
    }

    // Em produção, você pode enviar para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
    // this.sendToMonitoring(entry);
  }

  private logToConsole(entry: ErrorLogEntry): void {
    const { errorDetails, context } = entry;

    console.group(`❌ Error: ${errorDetails.type.toUpperCase()}`);
    console.error('Message:', errorDetails.message);
    console.error('User Message:', errorDetails.userMessage);
    console.error('Timestamp:', errorDetails.timestamp.toISOString());

    if (errorDetails.statusCode) {
      console.error('Status Code:', errorDetails.statusCode);
    }

    if (errorDetails.originalError) {
      console.error('Original Error:', errorDetails.originalError);
    }

    if (Object.keys(context).length > 0) {
      console.error('Context:', context);
    }

    console.groupEnd();
  }

  getLogs(): ErrorLogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  getLogsByType(type: ErrorType): ErrorLogEntry[] {
    return this.logs.filter(log => log.errorDetails.type === type);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Singleton instance
export const errorLogger = new ErrorLogger();

// ==================== UTILITÁRIOS ====================

/**
 * Wrapper para try-catch que automaticamente loga e categoriza erros
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: ErrorLogEntry['context'],
): Promise<{ data?: T; error?: ErrorDetails }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const errorDetails = categorizeError(error);
    errorLogger.log(error, context);
    return { error: errorDetails };
  }
}

/**
 * Verifica se um erro é recuperável (pode fazer retry)
 */
export function isRecoverableError(errorType: ErrorType): boolean {
  return [
    ErrorType.NETWORK,
    ErrorType.SERVER,
  ].includes(errorType);
}

/**
 * Verifica se um erro requer re-autenticação
 */
export function requiresReAuthentication(errorType: ErrorType): boolean {
  return errorType === ErrorType.AUTHENTICATION;
}

/**
 * Extrai mensagem de erro de diferentes formatos de resposta
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  if (error?.data?.error) return error.data.error;
  if (error?.response?.data?.error) return error.response.data.error;
  return 'Erro desconhecido';
}
