import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] touch-manipulation",
  {
    variants: {
      variant: {
        default:
           "bg-primary text-primary-foreground border border-primary/20 shadow-sm hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm border border-destructive/20 hover:bg-destructive/90 hover:shadow-md hover:-translate-y-0.5",
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:shadow-none",
        secondary:
          "border bg-secondary text-secondary-foreground border-secondary/20 shadow-xs hover:bg-secondary/80 hover:shadow-sm",
        ghost:
          "border border-transparent hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "min-h-11 px-4 py-2",
        sm: "min-h-9 rounded-md px-3 text-xs",
        lg: "min-h-12 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner className="mr-2" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
