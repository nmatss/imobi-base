/**
 * Sistema de espaçamento padronizado (8pt grid)
 * Baseado em VISUAL_ARCHITECTURE_REVISION.md linhas 170-183
 */
export const SPACING = {
  compact: '1rem',      // 16px - uso raro, elementos muito próximos
  default: '1.5rem',    // 24px - padrão geral
  comfortable: '2rem',  // 32px - seções
} as const;

/**
 * Paleta de cores semânticas
 * Baseado em VISUAL_ARCHITECTURE_REVISION.md linhas 185-202
 */
export const SEMANTIC_COLORS = {
  primary: '#1E7BE8',    // Azul - Ações principais
  success: '#10B981',    // Verde - Concluído, disponível
  warning: '#F59E0B',    // Âmbar - Atenção, pendente
  error: '#DC2626',      // Vermelho - Erro, urgente
  info: '#0EA5E9',       // Azul claro - Informação
  neutral: '#64748B',    // Cinza - Dados neutros
} as const;

/**
 * Tamanhos de tipografia
 * Baseado em VISUAL_ARCHITECTURE_REVISION.md linhas 205-215
 */
export const TYPOGRAPHY = {
  h1: 'text-2xl sm:text-3xl font-bold',
  h2: 'text-xl sm:text-2xl font-semibold',
  h3: 'text-lg sm:text-xl font-semibold',
  h4: 'text-base sm:text-lg font-medium',
  bodyLarge: 'text-base',
  body: 'text-sm',
  caption: 'text-xs text-muted-foreground',
} as const;

/**
 * Breakpoints responsivos
 */
export const BREAKPOINTS = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Durações de animação
 */
export const ANIMATION_DURATION = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
} as const;

/**
 * Status mapping para cores
 */
export const STATUS_VARIANTS = {
  success: 'badge-success',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  neutral: 'badge-neutral',
} as const;

export type Status = keyof typeof STATUS_VARIANTS;
