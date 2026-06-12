import { useEffect } from "react";

const SUFFIX = "ImobiBase";

/**
 * Define o título da aba do navegador para páginas internas do dashboard.
 * Para páginas públicas (que precisam de OG/SEO completo), use <SeoHead>.
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} | ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
