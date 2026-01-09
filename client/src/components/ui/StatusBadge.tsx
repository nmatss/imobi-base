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

// WCAG AA Compliant (4.5:1 contrast ratio) - Solid backgrounds with white text
const STATUS_STYLES: Record<Status, string> = {
  success: 'bg-emerald-700 text-white border-emerald-800',
  warning: 'bg-amber-700 text-white border-amber-800',
  error: 'bg-red-700 text-white border-red-800',
  info: 'bg-blue-700 text-white border-blue-800',
  neutral: 'bg-slate-700 text-white border-slate-800',
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
