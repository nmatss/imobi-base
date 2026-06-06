import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle, Info, Circle } from "lucide-react";

type Status = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: Status;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  /** Show icon alongside text for better accessibility (WCAG AA) */
  showIcon?: boolean;
  /** ARIA label override for screen readers */
  ariaLabel?: string;
}

// WCAG AA Compliant (4.5:1+ contrast ratio) - Soft tonal backgrounds with -700 text.
// The *-100 background paired with *-700 foreground is the standard accessible token
// pairing used across the design system (see badge/MetricCard trend tokens).
const STATUS_STYLES: Record<Status, string> = {
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_ICONS: Record<Status, typeof CheckCircle> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
  neutral: Circle,
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  showIcon = true,
  ariaLabel
}: StatusBadgeProps) {
  const Icon = STATUS_ICONS[status];

  return (
    <Badge
      className={cn(
        STATUS_STYLES[status],
        'gap-1.5 border',
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'md' && 'text-sm px-2.5 py-1',
        size === 'lg' && 'text-base px-3 py-1.5'
      )}
      ariaLabel={ariaLabel || `Status: ${label}`}
    >
      {showIcon && <Icon className={cn(
        size === 'sm' && 'w-3 h-3',
        size === 'md' && 'w-3.5 h-3.5',
        size === 'lg' && 'w-4 h-4'
      )} aria-hidden="true" />}
      {label}
    </Badge>
  );
}
