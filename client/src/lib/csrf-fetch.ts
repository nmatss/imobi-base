// Interceptor global de fetch: injeta X-CSRF-Token em TODA requisição
// state-changing (POST/PUT/PATCH/DELETE) same-origin quando há token em memória.
//
// Motivação: o middleware csrfProtection (server/routes.ts) exige o header em todo
// path não-excluído. Dezenas de componentes fazem fetch() cru sem o header e dariam
// 403 em produção. Em vez de converter cada call site (frágil — código novo
// reintroduz o bug), centralizamos a injeção aqui. apiRequest/csrfHeaders já setam
// o header; o guard `has('X-CSRF-Token')` evita duplicação. Rotas excluídas no
// servidor (login, webhooks, fluxos pré-auth) ignoram o header — injetar é inócuo.
//
// Instalado uma única vez no boot (client/src/main.tsx), antes do render.

import { getCSRFToken } from "@/lib/queryClient";

const STATEFUL = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isSameOrigin(url: string): boolean {
  // URLs relativas ("/api/...") são sempre same-origin.
  if (url.startsWith("/")) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

export function installCSRFFetchInterceptor(): void {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { __csrfFetchPatched?: boolean };
  if (w.__csrfFetchPatched) return;
  w.__csrfFetchPatched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const method = (
        init?.method ||
        (input instanceof Request ? input.method : "GET")
      ).toUpperCase();

      if (STATEFUL.has(method)) {
        const token = getCSRFToken();
        if (token && isSameOrigin(resolveUrl(input))) {
          const headers = new Headers(
            init?.headers ?? (input instanceof Request ? input.headers : undefined),
          );
          if (!headers.has("X-CSRF-Token")) {
            headers.set("X-CSRF-Token", token);
          }
          init = {
            ...init,
            headers,
            // O cookie csrf-token precisa acompanhar a requisição.
            credentials: init?.credentials ?? "include",
          };
        }
      }
    } catch {
      // Nunca quebrar o fetch por causa do interceptor.
    }
    return originalFetch(input, init);
  };
}
