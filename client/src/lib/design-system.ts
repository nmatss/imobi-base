/**
 * ImobiBase Design System - Central Exports
 *
 * Exporta todos os tokens e utilitários do design system
 * para facilitar as importações em outros arquivos.
 *
 * @example
 * import { statusColors, spacing, Button, StatusBadge, getStatusLabel } from "@/lib/design-system"
 */

// Re-export all design tokens
export {
  spacing,
  statusColors,
  semanticColors,
  tagColors,
  typography,
  fonts,
  radius,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  brandColors,
  neutralColors,
  cardSizes,
  iconSizes,
  getStatusColor,
  getSemanticColor,
  getStatusBadgeClasses,
  getSemanticBadgeClasses,
  getSpacing,
  type StatusColorKey,
  type SemanticColorKey,
  type SpacingKey,
  type TypographyKey,
  type BrandColorKey,
  type NeutralColorKey,
  type CardSizeKey,
  type IconSizeKey,
} from "./design-tokens";

// Re-export design helpers
export {
  getStatusBadgeClassName,
  getStatusColorVar,
  getStatusBackgroundStyle,
  getStatusTextStyle,
  getStatusLabel,
  getStatusIcon,
  isPositiveStatus,
  isNegativeStatus,
  isProgressStatus,
  getNextStatus,
  getPreviousStatus,
  getStatusProgress,
  getSemanticBadgeClassName,
  hslToRgb,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getStatusGradient,
  withOpacity,
  getStatusCardBorderStyle,
  getRandomTagColor,
  getStatusPulseClass,
  getStatusChipClassName,
  getCardSizeStyle,
  getCardSizeClassName,
  getIconSize,
  getIconClassName,
  getBrandPrimaryColor,
  getBrandSecondaryColor,
  getBrandPrimaryStyle,
  getBrandSecondaryStyle,
  getSpacingValue,
  getSpacingClassName,
  getGapClassName,
} from "./design-helpers";

// Re-export commonly used UI components
export { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
export { Badge, badgeVariants, type BadgeProps } from "@/components/ui/badge";
export { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
export {
  H1,
  H2,
  H3,
  H4,
  Text,
  Caption,
  Lead,
  Muted,
  InlineCode,
  List,
  ListItem,
  Blockquote,
  LabelText,
} from "@/components/ui/typography";

// Re-export card components
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
