/**
 * Logger simples compartilhado.
 *
 * Vive num módulo-folha (sem dependências de app) para NÃO criar import circular:
 * antes `log` era exportado de server/index.ts, e como index.ts roda o bootstrap
 * do servidor num IIFE top-level, qualquer módulo que importasse `log` de index
 * (routes-whatsapp, business-api, etc.) disparava o bootstrap no import — gerando
 * um ciclo (routes-whatsapp -> index -> registerWhatsAppRoutes -> routes-whatsapp).
 */
export function log(message: string, source = "express"): void {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}
