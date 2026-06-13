import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { installCSRFFetchInterceptor } from "../csrf-fetch";
import { setCSRFToken, clearCSRFToken } from "../queryClient";

// Captura os argumentos repassados ao fetch original para inspecionar headers.
function lastHeaders(spy: ReturnType<typeof vi.fn>): Headers {
  const init = spy.mock.calls.at(-1)?.[1] as RequestInit | undefined;
  return new Headers(init?.headers || {});
}

describe("installCSRFFetchInterceptor", () => {
  let baseFetch: ReturnType<typeof vi.fn>;
  let originalFetch: typeof window.fetch;

  beforeEach(() => {
    clearCSRFToken();
    originalFetch = window.fetch;
    baseFetch = vi.fn(() => Promise.resolve(new Response("{}", { status: 200 })));
    window.fetch = baseFetch as unknown as typeof window.fetch;
    // Permite reinstalar em cada teste (o interceptor guarda contra duplo-patch).
    (window as unknown as { __csrfFetchPatched?: boolean }).__csrfFetchPatched = false;
    installCSRFFetchInterceptor();
  });

  afterEach(() => {
    window.fetch = originalFetch;
    (window as unknown as { __csrfFetchPatched?: boolean }).__csrfFetchPatched = false;
    clearCSRFToken();
  });

  it("injeta X-CSRF-Token em POST same-origin quando há token", async () => {
    setCSRFToken("tok-123");
    await window.fetch("/api/properties", { method: "POST", body: "{}" });
    expect(lastHeaders(baseFetch).get("X-CSRF-Token")).toBe("tok-123");
  });

  it("NÃO injeta em GET", async () => {
    setCSRFToken("tok-123");
    await window.fetch("/api/properties", { method: "GET" });
    expect(lastHeaders(baseFetch).get("X-CSRF-Token")).toBeNull();
  });

  it("NÃO injeta quando não há token (fluxo pré-auth)", async () => {
    await window.fetch("/api/auth/forgot-password", { method: "POST", body: "{}" });
    expect(lastHeaders(baseFetch).get("X-CSRF-Token")).toBeNull();
  });

  it("não duplica/sobrescreve header já presente", async () => {
    setCSRFToken("tok-123");
    await window.fetch("/api/x", { method: "DELETE", headers: { "X-CSRF-Token": "manual" } });
    expect(lastHeaders(baseFetch).get("X-CSRF-Token")).toBe("manual");
  });

  it("não injeta em requisição cross-origin", async () => {
    setCSRFToken("tok-123");
    await window.fetch("https://external.example.com/hook", { method: "POST", body: "{}" });
    expect(lastHeaders(baseFetch).get("X-CSRF-Token")).toBeNull();
  });

  it("default credentials=include ao injetar", async () => {
    setCSRFToken("tok-123");
    await window.fetch("/api/y", { method: "PATCH", body: "{}" });
    const init = baseFetch.mock.calls.at(-1)?.[1] as RequestInit;
    expect(init.credentials).toBe("include");
  });
});
