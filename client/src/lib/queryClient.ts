import { QueryClient, QueryFunction, QueryCache, MutationCache } from "@tanstack/react-query";
import { errorLogger, categorizeError } from "@/lib/error-handling";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// ==================== CSRF TOKEN MANAGEMENT ====================
let csrfToken: string | null = null;

export function setCSRFToken(token: string) {
  csrfToken = token;
}

export function getCSRFToken(): string | null {
  return csrfToken;
}

export function clearCSRFToken() {
  csrfToken = null;
}

// ==================== API REQUEST WITH CSRF ====================
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};

  // Add CSRF token for state-changing requests (POST, PATCH, PUT, DELETE)
  const statefulMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
  if (statefulMethods.includes(method.toUpperCase()) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// ==================== CACHE STRATEGIES ====================
// Diferentes estratégias de cache para diferentes tipos de dados

export const cacheStrategies = {
  // Dados estáticos: cache-first (configurações, tipos, categorias)
  static: {
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },

  // Dados semi-estáticos: stale-while-revalidate (properties, contratos)
  semiStatic: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: "always" as const,
    refetchOnReconnect: true,
  },

  // Dados dinâmicos: network-first (leads, follow-ups, activities)
  dynamic: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: "always" as const,
    refetchOnReconnect: true,
  },

  // Dados em tempo real: sempre buscar (dashboard, metrics)
  realtime: {
    staleTime: 0, // sempre stale
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: "always" as const,
    refetchOnReconnect: true,
    refetchInterval: 30 * 1000, // refetch a cada 30 segundos
  },

  // Dados de detalhes: cache otimista
  detail: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  },
};

// ==================== QUERY CLIENT CONFIGURATION ====================

// Query Cache: global error handling
const queryCache = new QueryCache({
  onError: (error, query) => {
    // Log errors no sistema de error handling
    errorLogger.log(error, {
      type: 'query',
      queryHash: query.queryHash,
      queryKey: query.queryKey,
      state: query.state,
    });

    // Categoriza o erro para melhor tratamento
    const errorDetails = categorizeError(error);

    // Log no console
    console.error(`Query error [${query.queryHash}]:`, errorDetails);

    // Pode adicionar tracking/analytics aqui
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-ignore
      window.gtag('event', 'exception', {
        description: `Query error: ${errorDetails.message}`,
        fatal: false,
        error_type: errorDetails.type,
      });
    }
  },
  onSuccess: (data, query) => {
    // Pode adicionar logging de sucesso para debug
    if (import.meta.env.DEV) {
      console.log(`Query success [${query.queryHash}]`);
    }
  },
});

// Mutation Cache: global error handling
const mutationCache = new MutationCache({
  onError: (error, variables, _context, mutation) => {
    // Log errors no sistema de error handling
    errorLogger.log(error, {
      type: 'mutation',
      mutationId: mutation.mutationId,
      variables,
      state: mutation.state,
    });

    // Categoriza o erro
    const errorDetails = categorizeError(error);

    // Log mutation errors
    console.error(`Mutation error:`, errorDetails);

    // Pode adicionar tracking/analytics aqui
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-ignore
      window.gtag('event', 'exception', {
        description: `Mutation error: ${errorDetails.message}`,
        fatal: false,
        error_type: errorDetails.type,
      });
    }
  },
  onSuccess: (data, _variables, _context, mutation) => {
    // Log de sucesso em desenvolvimento
    if (import.meta.env.DEV) {
      console.log(`Mutation success [${mutation.mutationId}]`);
    }
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      // Usar estratégia semi-estática por padrão
      refetchOnWindowFocus: "always",
      refetchOnMount: false,
      refetchOnReconnect: true,
      // Keep data fresh for 5 minutes by default
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Keep unused data in cache for 30 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      // Retry failed requests with exponential backoff
      retry: (failureCount, error) => {
        // Não retry em erros 4xx (exceto 408 Request Timeout)
        if (error instanceof Error && error.message.startsWith('4')) {
          const statusCode = parseInt(error.message.split(':')[0]);
          if (statusCode !== 408 && statusCode >= 400 && statusCode < 500) {
            return false;
          }
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable network mode to handle offline scenarios
      networkMode: 'online',
      // Structural sharing para performance
      structuralSharing: true,
    },
    mutations: {
      // Retry mutations once on network errors (5xx)
      retry: (failureCount, error) => {
        // Só retry em erros 5xx
        if (error instanceof Error && error.message.startsWith('5')) {
          return failureCount < 1;
        }
        return false;
      },
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});

// ==================== CACHE UTILITIES ====================

/**
 * Invalida todas as queries relacionadas a uma entidade
 */
export function invalidateEntity(entity: string) {
  return queryClient.invalidateQueries({ queryKey: [entity] });
}

/**
 * Invalida múltiplas entidades de uma vez
 */
export function invalidateEntities(entities: string[]) {
  return Promise.all(entities.map(entity => invalidateEntity(entity)));
}

/**
 * Remove dados do cache de uma entidade específica
 */
export function removeEntityCache(entity: string, id?: string) {
  if (id) {
    return queryClient.removeQueries({ queryKey: [entity, 'detail', id] });
  }
  return queryClient.removeQueries({ queryKey: [entity] });
}

/**
 * Prefetch de dados para melhorar performance
 */
export async function prefetchEntity<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: { staleTime?: number }
) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
  });
}

/**
 * Atualiza dados no cache sem fazer request
 */
export function updateCacheData<T>(
  queryKey: readonly unknown[],
  updater: (old: T | undefined) => T
) {
  queryClient.setQueryData(queryKey, updater);
}

/**
 * Sincroniza cache após mutation
 */
export async function syncCacheAfterMutation(
  mutatedEntity: string,
  relatedEntities?: string[]
) {
  // Invalida a entidade mutada
  await invalidateEntity(mutatedEntity);

  // Invalida entidades relacionadas
  if (relatedEntities && relatedEntities.length > 0) {
    await invalidateEntities(relatedEntities);
  }
}

/**
 * Limpa todo o cache (use com cuidado!)
 */
export function clearAllCache() {
  return queryClient.clear();
}

/**
 * Reseta queries para um estado inicial
 */
export function resetQueries(queryKey?: readonly unknown[]) {
  if (queryKey) {
    return queryClient.resetQueries({ queryKey });
  }
  return queryClient.resetQueries();
}
