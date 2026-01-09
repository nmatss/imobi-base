import * as React from "react"
import { cn } from "@/lib/utils"
import { type StatusColorKey, getStatusColor } from "@/lib/design-tokens"

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: StatusColorKey
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-xs",
  lg: "px-2.5 py-1 text-sm",
}

/**
 * Badge component que usa automaticamente as cores do design system
 * baseado no status fornecido.
 *
 * Exemplo:
 * <StatusBadge status="new">Novo</StatusBadge>
 * <StatusBadge status="contract">Fechado</StatusBadge>
 */
function StatusBadge({
  status,
  size = "md",
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const color = getStatusColor(status)

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap transition-all",
        color.bgLight,
        color.text,
        color.border,
        sizeClasses[size],
        "dark:bg-opacity-20 dark:border-opacity-30",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { StatusBadge }
