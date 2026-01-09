/**
 * Design System Helpers
 *
 * Funções utilitárias para facilitar o uso do design system
 */

import {
  type StatusColorKey,
  type CardSizeKey,
  type IconSizeKey,
  statusColors,
  semanticColors,
  brandColors,
  cardSizes,
  iconSizes,
  spacing,
} from "./design-tokens";

/**
 * Gera className completo para um badge de status com variações de tamanho
 */
export function getStatusBadgeClassName(
  status: StatusColorKey,
  size: "sm" | "md" | "lg" = "md"
): string {
  const color = statusColors[status];
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-2.5 py-1 text-sm",
  };

  return `inline-flex items-center rounded-full border font-medium whitespace-nowrap ${color.bgLight} ${color.text} ${color.border} ${sizeClasses[size]} dark:bg-opacity-20 dark:border-opacity-30`;
}

/**
 * Retorna a cor em formato CSS var para uso em estilos inline
 */
export function getStatusColorVar(status: StatusColorKey): string {
  return `hsl(var(--color-status-${status}))`;
}

/**
 * Gera estilo inline para background com cor de status
 */
export function getStatusBackgroundStyle(status: StatusColorKey) {
  return {
    backgroundColor: statusColors[status].hex,
  };
}

/**
 * Gera estilo inline para texto com cor de status
 */
export function getStatusTextStyle(status: StatusColorKey) {
  return {
    color: statusColors[status].hex,
  };
}

/**
 * Retorna label amigável para status
 */
export function getStatusLabel(status: StatusColorKey): string {
  const labels: Record<StatusColorKey, string> = {
    new: "Novo",
    qualification: "Em Qualificação",
    visit: "Visita Agendada",
    proposal: "Proposta Enviada",
    negotiation: "Em Negociação",
    contract: "Fechado",
    closed: "Concluído",
    lost: "Perdido",
  };
  return labels[status] || status;
}

/**
 * Retorna ícone sugerido para cada status (compatível com lucide-react)
 */
export function getStatusIcon(status: StatusColorKey): string {
  const icons: Record<StatusColorKey, string> = {
    new: "Sparkles",
    qualification: "Phone",
    visit: "Calendar",
    proposal: "FileText",
    negotiation: "MessageSquare",
    contract: "CheckCircle",
    closed: "CheckCircle2",
    lost: "XCircle",
  };
  return icons[status] || "Circle";
}

/**
 * Determina se um status é considerado "positivo" para fins de estilo
 */
export function isPositiveStatus(status: StatusColorKey): boolean {
  return ["contract", "closed"].includes(status);
}

/**
 * Determina se um status é considerado "negativo" para fins de estilo
 */
export function isNegativeStatus(status: StatusColorKey): boolean {
  return ["lost"].includes(status);
}

/**
 * Determina se um status é considerado "em progresso" para fins de estilo
 */
export function isProgressStatus(status: StatusColorKey): boolean {
  return ["new", "qualification", "visit", "proposal", "negotiation"].includes(status);
}

/**
 * Retorna próximo status no pipeline (se aplicável)
 */
export function getNextStatus(currentStatus: StatusColorKey): StatusColorKey | null {
  const pipeline: StatusColorKey[] = [
    "new",
    "qualification",
    "visit",
    "proposal",
    "negotiation",
    "contract",
  ];
  const currentIndex = pipeline.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === pipeline.length - 1) {
    return null;
  }
  return pipeline[currentIndex + 1];
}

/**
 * Retorna status anterior no pipeline (se aplicável)
 */
export function getPreviousStatus(currentStatus: StatusColorKey): StatusColorKey | null {
  const pipeline: StatusColorKey[] = [
    "new",
    "qualification",
    "visit",
    "proposal",
    "negotiation",
    "contract",
  ];
  const currentIndex = pipeline.indexOf(currentStatus);
  if (currentIndex <= 0) {
    return null;
  }
  return pipeline[currentIndex - 1];
}

/**
 * Retorna progresso percentual no pipeline (0-100)
 */
export function getStatusProgress(status: StatusColorKey): number {
  const pipeline: StatusColorKey[] = [
    "new",
    "qualification",
    "visit",
    "proposal",
    "negotiation",
    "contract",
  ];
  const index = pipeline.indexOf(status);
  if (index === -1) return 0;
  return Math.round((index / (pipeline.length - 1)) * 100);
}

/**
 * Gera className para badge semântico
 */
export function getSemanticBadgeClassName(
  type: "success" | "warning" | "error" | "info",
  size: "sm" | "md" | "lg" = "md"
): string {
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-2.5 py-1 text-sm",
  };

  return `badge-${type} ${sizeClasses[size]}`;
}

/**
 * Converte valor HSL para RGB
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4)),
  ];
}

/**
 * Calcula contraste entre duas cores (ratio)
 * Útil para verificar acessibilidade WCAG
 */
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hex
      .replace("#", "")
      .match(/.{2}/g)
      ?.map((x) => parseInt(x, 16) / 255) || [0, 0, 0];

    const [r, g, b] = rgb.map((val) => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Verifica se o contraste atende WCAG AA (mínimo 4.5:1 para texto normal)
 */
export function meetsWCAGAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 4.5;
}

/**
 * Verifica se o contraste atende WCAG AAA (mínimo 7:1 para texto normal)
 */
export function meetsWCAGAAA(foreground: string, background: string): boolean {
  return getContrastRatio(foreground, background) >= 7;
}

/**
 * Gera gradiente CSS para um status
 */
export function getStatusGradient(status: StatusColorKey, direction: "to-r" | "to-b" = "to-r"): string {
  const color = statusColors[status];
  const directionMap = {
    "to-r": "to right",
    "to-b": "to bottom",
  };
  return `linear-gradient(${directionMap[direction]}, ${color.hex}, ${color.hex}dd)`;
}

/**
 * Retorna cor com opacidade ajustada
 */
export function withOpacity(hex: string, opacity: number): string {
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${hex}${alpha}`;
}

/**
 * Gera estilos para card com cor de status na borda esquerda
 */
export function getStatusCardBorderStyle(status: StatusColorKey) {
  return {
    borderLeft: `4px solid ${statusColors[status].hex}`,
  };
}

/**
 * Sorteia uma cor de tag aleatória
 */
export function getRandomTagColor(): string {
  const colors = [
    "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
    "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Retorna className para animação de pulsação baseada em status
 */
export function getStatusPulseClass(status: StatusColorKey): string {
  if (status === "new") {
    return "animate-pulse";
  }
  return "";
}

/**
 * Gera className completo para um chip/tag de status clicável
 */
export function getStatusChipClassName(
  status: StatusColorKey,
  isActive: boolean = false
): string {
  const color = statusColors[status];
  const baseClasses = `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all cursor-pointer`;
  const colorClasses = isActive
    ? `${color.bg} text-white shadow-md`
    : `${color.bgLight} ${color.text} ${color.border} border hover:${color.bg} hover:text-white`;

  return `${baseClasses} ${colorClasses}`;
}

/**
 * Retorna estilo para card com tamanho específico
 */
export function getCardSizeStyle(size: CardSizeKey = "normal") {
  const cardSize = cardSizes[size];
  return {
    padding: cardSize.padding,
    gap: cardSize.gap,
    minHeight: cardSize.minHeight,
  };
}

/**
 * Gera className para card com tamanho específico
 */
export function getCardSizeClassName(size: CardSizeKey = "normal"): string {
  const classMap: Record<CardSizeKey, string> = {
    compact: "p-3 space-y-2 min-h-[80px]",
    normal: "p-4 space-y-3 min-h-[120px]",
    expanded: "p-6 space-y-4 min-h-[160px]",
  };
  return classMap[size];
}

/**
 * Retorna tamanho de ícone em pixels
 */
export function getIconSize(size: IconSizeKey = "md"): string {
  return iconSizes[size];
}

/**
 * Gera className para ícone com tamanho específico
 */
export function getIconClassName(size: IconSizeKey = "md"): string {
  const classMap: Record<IconSizeKey, string> = {
    sm: "w-4 h-4",      // 16px
    md: "w-5 h-5",      // 20px
    lg: "w-6 h-6",      // 24px
    xl: "w-8 h-8",      // 32px
    "2xl": "w-10 h-10", // 40px
    "3xl": "w-12 h-12", // 48px
  };
  return classMap[size];
}

/**
 * Retorna cor primária da marca
 */
export function getBrandPrimaryColor(variant: "default" | "light" | "dark" = "default"): string {
  if (variant === "light") return brandColors.primary.light;
  if (variant === "dark") return brandColors.primary.dark;
  return brandColors.primary.hex;
}

/**
 * Retorna cor secundária da marca
 */
export function getBrandSecondaryColor(variant: "default" | "light" | "dark" = "default"): string {
  if (variant === "light") return brandColors.secondary.light;
  if (variant === "dark") return brandColors.secondary.dark;
  return brandColors.secondary.hex;
}

/**
 * Gera estilo inline com cor primária da marca
 */
export function getBrandPrimaryStyle(variant: "default" | "light" | "dark" = "default") {
  return {
    backgroundColor: getBrandPrimaryColor(variant),
  };
}

/**
 * Gera estilo inline com cor secundária da marca
 */
export function getBrandSecondaryStyle(variant: "default" | "light" | "dark" = "default") {
  return {
    backgroundColor: getBrandSecondaryColor(variant),
  };
}

/**
 * Retorna valor de espaçamento por chave
 */
export function getSpacingValue(key: keyof typeof spacing): string {
  return spacing[key];
}

/**
 * Gera className de espaçamento (padding/margin) usando tokens
 */
export function getSpacingClassName(
  type: "p" | "px" | "py" | "pt" | "pb" | "pl" | "pr" | "m" | "mx" | "my" | "mt" | "mb" | "ml" | "mr",
  size: keyof typeof spacing
): string {
  const sizeMap: Record<keyof typeof spacing, string> = {
    xs: "1",
    sm: "2",
    md: "3",
    base: "4",
    lg: "6",
    xl: "8",
    "2xl": "12",
    "3xl": "16",
    "4xl": "24",
  };
  return `${type}-${sizeMap[size]}`;
}

/**
 * Gera className de gap usando tokens de spacing
 */
export function getGapClassName(size: keyof typeof spacing): string {
  const sizeMap: Record<keyof typeof spacing, string> = {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    base: "gap-4",
    lg: "gap-6",
    xl: "gap-8",
    "2xl": "gap-12",
    "3xl": "gap-16",
    "4xl": "gap-24",
  };
  return sizeMap[size];
}
