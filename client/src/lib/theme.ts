// Tema da aplicação (light/dark/system). O `.dark` é aplicado no <html> e a paleta
// correspondente já está definida em index.css. Default: "light" (dark é opt-in).
export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "imobibase-theme";

export function getStoredTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {
    /* localStorage indisponível (modo privado/SSR) */
  }
  return "light";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolveTheme(theme) === "dark");
}

export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

let systemListener: ((e: MediaQueryListEvent) => void) | null = null;

// Chamado uma vez no boot (antes do render) para evitar flash de tema incorreto.
export function initTheme(): void {
  if (typeof window === "undefined") return;
  applyTheme(getStoredTheme());

  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  if (systemListener) {
    mql.removeEventListener("change", systemListener);
  }
  systemListener = () => {
    if (getStoredTheme() === "system") applyTheme("system");
  };
  mql.addEventListener("change", systemListener);
}
