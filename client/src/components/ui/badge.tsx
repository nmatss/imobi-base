/**
 * BADGE COMPONENT - USAGE GUIDELINES
 *
 * USAGE BEST PRACTICES:
 *
 * 1. QUANTITY CONTROL:
 *    - MAX 1-2 badges per UI element
 *    - Prioritize most important information
 *    - Avoid visual clutter and information overload
 *
 * 2. WCAG AA COMPLIANT SEMANTIC VARIANTS:
 *    - success: Emerald-700 bg + white text (4.5:1+) - Available, completed, positive states
 *    - warning: Amber-700 bg + white text (4.5:1+) - Attention needed, pending actions
 *    - info: Blue-700 bg + white text (4.5:1+) - Informational states
 *    - new: Green-700 bg + white text (4.5:1+) - New leads, fresh items
 *    - proposal: Cyan-700 bg + white text (4.5:1+) - Proposals, offers
 *    - destructive: Red bg + white text - Urgent alerts, errors
 *    - default: Primary color - General purpose
 *    - secondary: Muted color - Low priority
 *    - outline: Border only - Subtle indicators
 *
 * 3. AVOID DECORATIVE USAGE:
 *    - Only use badges for meaningful information
 *    - Don't use badges just for visual decoration
 *    - Each badge should communicate specific status or data
 *
 * 4. CURRENT USAGE EXAMPLES:
 *    - properties/list.tsx: Category + Status (1 badge), Featured (conditional), Photo count
 *    - leads/kanban.tsx: Lead source, follow-up count, urgency status
 *    - dashboard.tsx: Counts, status indicators, featured items
 *
 * 5. ACCESSIBILITY (WCAG AA COMPLIANCE):
 *    - All badge variants meet WCAG AA contrast ratio (4.5:1 minimum)
 *    - Solid backgrounds with white text for maximum readability
 *    - Don't rely solely on color to convey information
 *    - Use ariaLabel prop for screen reader context
 */

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // @replit
  // Whitespace-nowrap: Badges should never wrap.
  "whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" +
  " hover-elevate ",
  {
    variants: {
      variant: {
        default:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          // @replit no hover because we use hover-elevate
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          // @replit shadow-xs instead of shadow, no hover because we use hover-elevate
          "border-transparent bg-destructive text-destructive-foreground shadow-xs",
          // @replit shadow-xs" - use badge outline variable
        outline: "text-foreground border [border-color:var(--badge-outline)]",
        // WCAG AA Compliant status badges - solid backgrounds + white text
        success: "border-transparent bg-emerald-700 text-white shadow-xs hover:bg-emerald-800",
        warning: "border-transparent bg-amber-700 text-white shadow-xs hover:bg-amber-800",
        info: "border-transparent bg-blue-700 text-white shadow-xs hover:bg-blue-800",
        // New lead status - solid green
        new: "border-transparent bg-green-700 text-white shadow-xs hover:bg-green-800",
        // Proposal status - solid cyan
        proposal: "border-transparent bg-cyan-700 text-white shadow-xs hover:bg-cyan-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Accessible label for screen readers (optional, defaults to content) */
  ariaLabel?: string;
}

function Badge({ className, variant, ariaLabel, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      role="status"
      aria-label={ariaLabel}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
