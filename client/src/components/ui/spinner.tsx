import React from "react";
import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

interface SpinnerProps extends React.ComponentProps<"svg"> {
  /**
   * Size variant for the spinner
   * @default "default"
   */
  size?: "sm" | "default" | "lg" | "xl";
  /**
   * Animation speed
   * @default "normal"
   */
  speed?: "slow" | "normal" | "fast";
}

const sizeClasses = {
  sm: "size-3",
  default: "size-4",
  lg: "size-6",
  xl: "size-8",
};

const speedClasses = {
  slow: "animate-spin-slow",
  normal: "animate-spin",
  fast: "animate-spin-fast",
};

function Spinner({
  className,
  size = "default",
  speed = "normal",
  ...props
}: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      aria-live="polite"
      className={cn(
        sizeClasses[size],
        speedClasses[speed],
        "text-current",
        className
      )}
      {...props}
    />
  )
}

export { Spinner }
