/**
 * ImobiBase Design Tokens
 *
 * Sistema de design centralizado para garantir consistência visual
 * em toda a aplicação. Todos os valores devem ser referenciados deste arquivo.
 */

// ==================== SPACING ====================
// Sistema de espaçamento baseado em grid de 8pt (4px, 8px, 12px, 16px, 24px, 32px, 48px)

export const spacing = {
  xs: "0.25rem",   // 4px  - micro spacing
  sm: "0.5rem",    // 8px  - tight spacing
  md: "0.75rem",   // 12px - compact (NOVO)
  base: "1rem",    // 16px - base spacing (renomeado de md)
  lg: "1.5rem",    // 24px - comfortable
  xl: "2rem",      // 32px - spacious
  "2xl": "3rem",   // 48px - section divider
  "3xl": "4rem",   // 64px - major sections
  "4xl": "6rem",   // 96px - hero sections
} as const;

// ==================== COLORS ====================

/**
 * Cores Primárias e Secundárias do Sistema
 */
export const brandColors = {
  primary: {
    hex: "#0066FF",           // Azul primário
    rgb: "0 102 255",
    hsl: "217 100% 50%",
    light: "#3385FF",         // Versão mais clara
    dark: "#0052CC",          // Versão mais escura
    bg: "bg-blue-600",
    bgLight: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-600",
  },
  secondary: {
    hex: "#00AA44",           // Verde secundário
    rgb: "0 170 68",
    hsl: "144 100% 33%",
    light: "#00D455",         // Versão mais clara
    dark: "#008835",          // Versão mais escura
    bg: "bg-green-600",
    bgLight: "bg-green-50",
    text: "text-green-600",
    border: "border-green-600",
  },
} as const;

/**
 * Escala de Neutros (Gray Scale)
 */
export const neutralColors = {
  50: "#F9FAFB",    // Quase branco
  100: "#F3F4F6",   // Muito claro
  200: "#E5E7EB",   // Claro
  300: "#D1D5DB",   // Claro médio
  400: "#9CA3AF",   // Médio
  500: "#6B7280",   // Médio escuro
  600: "#4B5563",   // Escuro
  700: "#374151",   // Muito escuro
  800: "#1F2937",   // Quase preto
  900: "#111827",   // Preto
} as const;

/**
 * Cores de Status - Para Pipeline CRM e Leads
 * Cada status tem uma cor única e significativa para fácil identificação visual
 */
export const statusColors = {
  // Status de Leads/Pipeline
  new: {
    hex: "#3b82f6",           // azul - novo lead
    rgb: "59 130 246",
    hsl: "217 91% 60%",
    bg: "bg-blue-500",
    bgLight: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-300",
  },
  qualification: {
    hex: "#8b5cf6",           // roxo - em qualificação/contato
    rgb: "139 92 246",
    hsl: "258 90% 66%",
    bg: "bg-purple-500",
    bgLight: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-300",
  },
  visit: {
    hex: "#f97316",           // laranja - visita agendada
    rgb: "249 115 22",
    hsl: "25 95% 53%",
    bg: "bg-orange-500",
    bgLight: "bg-orange-100",
    text: "text-orange-700",
    border: "border-orange-300",
  },
  proposal: {
    hex: "#06b6d4",           // cyan - proposta enviada
    rgb: "6 182 212",
    hsl: "189 94% 43%",
    bg: "bg-cyan-500",
    bgLight: "bg-cyan-100",
    text: "text-cyan-700",
    border: "border-cyan-300",
  },
  negotiation: {
    hex: "#ec4899",           // rosa/pink - em negociação
    rgb: "236 72 153",
    hsl: "330 81% 60%",
    bg: "bg-pink-500",
    bgLight: "bg-pink-100",
    text: "text-pink-700",
    border: "border-pink-300",
  },
  contract: {
    hex: "#22c55e",           // verde - contrato/fechado
    rgb: "34 197 94",
    hsl: "142 71% 45%",
    bg: "bg-green-500",
    bgLight: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  closed: {
    hex: "#22c55e",           // verde - fechado (alias para contract)
    rgb: "34 197 94",
    hsl: "142 71% 45%",
    bg: "bg-green-500",
    bgLight: "bg-green-100",
    text: "text-green-700",
    border: "border-green-300",
  },
  lost: {
    hex: "#ef4444",           // vermelho - perdido
    rgb: "239 68 68",
    hsl: "0 72% 60%",
    bg: "bg-red-500",
    bgLight: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
  },
} as const;

/**
 * Cores Semânticas - Para feedback e estados
 */
export const semanticColors = {
  success: {
    hex: "#10b981",
    hsl: "160 84% 39%",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-300",
    darkBg: "dark:bg-emerald-900/30",
    darkText: "dark:text-emerald-400",
  },
  warning: {
    hex: "#B45309",        // Amber-700 (WCAG AA: 4.6:1 contrast on white)
    hsl: "38 92% 38%",
    bg: "bg-amber-700",     // Dark background for better contrast
    text: "text-white",     // White text on dark background
    border: "border-amber-800",
    darkBg: "dark:bg-amber-900/30",
    darkText: "dark:text-amber-400",
  },
  error: {
    hex: "#dc2626",
    hsl: "0 72% 51%",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-300",
    darkBg: "dark:bg-red-900/30",
    darkText: "dark:text-red-400",
  },
  info: {
    hex: "#0ea5e9",
    hsl: "199 89% 48%",
    bg: "bg-sky-100",
    text: "text-sky-700",
    border: "border-sky-300",
    darkBg: "dark:bg-sky-900/30",
    darkText: "dark:text-sky-400",
  },
} as const;

/**
 * Cores de Tags - Para categorização e etiquetas
 */
export const tagColors = [
  "#3b82f6",  // blue
  "#ef4444",  // red
  "#22c55e",  // green
  "#f59e0b",  // amber
  "#8b5cf6",  // purple
  "#ec4899",  // pink
  "#06b6d4",  // cyan
  "#84cc16",  // lime
  "#f97316",  // orange
  "#6366f1",  // indigo
] as const;

// ==================== TYPOGRAPHY ====================

/**
 * Escala Tipográfica
 * Baseada em escala de 1.25 (Major Third) para hierarquia clara
 */
export const typography = {
  h1: {
    size: "2.25rem",      // 36px
    weight: "700",
    lineHeight: "2.5rem",
    letterSpacing: "-0.02em",
  },
  h2: {
    size: "1.875rem",     // 30px
    weight: "600",
    lineHeight: "2.25rem",
    letterSpacing: "-0.01em",
  },
  h3: {
    size: "1.5rem",       // 24px
    weight: "600",
    lineHeight: "2rem",
    letterSpacing: "0",
  },
  h4: {
    size: "1.25rem",      // 20px
    weight: "500",
    lineHeight: "1.75rem",
    letterSpacing: "0",
  },
  h5: {
    size: "1.125rem",     // 18px
    weight: "500",
    lineHeight: "1.75rem",
    letterSpacing: "0",
  },
  h6: {
    size: "1rem",         // 16px
    weight: "500",
    lineHeight: "1.5rem",
    letterSpacing: "0",
  },
  body: {
    lg: {
      size: "1.125rem",   // 18px
      lineHeight: "1.75rem",
    },
    base: {
      size: "1rem",       // 16px
      lineHeight: "1.5rem",
    },
    sm: {
      size: "0.875rem",   // 14px
      lineHeight: "1.25rem",
    },
    xs: {
      size: "0.75rem",    // 12px
      lineHeight: "1rem",
    },
  },
} as const;

/**
 * Fontes
 */
export const fonts = {
  sans: "'Inter', sans-serif",
  heading: "'Plus Jakarta Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

// ==================== RADIUS ====================

export const radius = {
  none: "0",
  sm: "0.25rem",    // 4px
  md: "0.375rem",   // 6px
  lg: "0.5rem",     // 8px
  xl: "0.75rem",    // 12px
  "2xl": "1rem",    // 16px
  full: "9999px",
} as const;

// ==================== SHADOWS ====================

export const shadows = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
} as const;

// ==================== TRANSITIONS ====================

export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  base: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "300ms cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ==================== Z-INDEX ====================

export const zIndex = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

// ==================== BREAKPOINTS ====================

export const breakpoints = {
  xs: "480px",
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
  "3xl": "1920px",
} as const;

// ==================== CARD SIZES ====================

/**
 * Tamanhos padronizados de cards
 */
export const cardSizes = {
  compact: {
    padding: "0.75rem",      // 12px
    gap: "0.5rem",           // 8px
    minHeight: "80px",       // Altura mínima
  },
  normal: {
    padding: "1rem",         // 16px
    gap: "0.75rem",          // 12px
    minHeight: "120px",      // Altura mínima
  },
  expanded: {
    padding: "1.5rem",       // 24px
    gap: "1rem",             // 16px
    minHeight: "160px",      // Altura mínima
  },
} as const;

// ==================== ICON SIZES ====================

/**
 * Tamanhos padronizados de ícones
 */
export const iconSizes = {
  sm: "1rem",      // 16px
  md: "1.25rem",   // 20px (padrão)
  lg: "1.5rem",    // 24px
  xl: "2rem",      // 32px
  "2xl": "2.5rem", // 40px
  "3xl": "3rem",   // 48px
} as const;

// ==================== HELPER FUNCTIONS ====================

/**
 * Obtém a cor de um status específico
 */
export function getStatusColor(status: keyof typeof statusColors) {
  return statusColors[status] || statusColors.new;
}

/**
 * Obtém cor semântica
 */
export function getSemanticColor(type: keyof typeof semanticColors) {
  return semanticColors[type];
}

/**
 * Gera classe CSS para badge de status
 */
export function getStatusBadgeClasses(status: keyof typeof statusColors) {
  const color = getStatusColor(status);
  return `${color.bgLight} ${color.text} ${color.border} border px-2 py-0.5 rounded-full text-xs font-medium`;
}

/**
 * Gera classe CSS para badge semântico (WCAG AA compliant)
 */
export function getSemanticBadgeClasses(type: keyof typeof semanticColors) {
  const color = getSemanticColor(type);
  // Using solid backgrounds with white text for WCAG AA compliance (4.5:1+ contrast)
  return `${color.bg} ${color.text} ${color.border} ${color.darkBg} ${color.darkText} border px-2 py-0.5 rounded-full text-xs font-medium`;
}

/**
 * Converte valores de espaçamento para uso direto
 */
export function getSpacing(size: keyof typeof spacing): string {
  return spacing[size];
}

// ==================== TYPE EXPORTS ====================

export type StatusColorKey = keyof typeof statusColors;
export type SemanticColorKey = keyof typeof semanticColors;
export type SpacingKey = keyof typeof spacing;
export type TypographyKey = keyof typeof typography;
export type BrandColorKey = keyof typeof brandColors;
export type NeutralColorKey = keyof typeof neutralColors;
export type CardSizeKey = keyof typeof cardSizes;
export type IconSizeKey = keyof typeof iconSizes;
