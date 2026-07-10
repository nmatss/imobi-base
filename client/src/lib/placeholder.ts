/**
 * Placeholder local para imóveis sem foto.
 *
 * Evita hotlink a imagens de terceiros (ex.: Unsplash) nos fallbacks de card —
 * remove dependência de disponibilidade externa e mantém a identidade do produto.
 * É um SVG inline (data URI), sem requisição de rede e sem custo de bundle.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="Imóvel sem foto"><rect width="800" height="600" fill="#e9edf3"/><g fill="#b3bccb"><path d="M400 224 546 340v152H254V340z"/><rect x="362" y="420" width="76" height="72" fill="#e9edf3"/></g><text x="400" y="545" font-family="system-ui, sans-serif" font-size="30" fill="#9aa6b8" text-anchor="middle">Sem foto</text></svg>`;

export const PROPERTY_PLACEHOLDER = `data:image/svg+xml,${encodeURIComponent(svg)}`;
