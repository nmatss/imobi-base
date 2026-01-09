import * as React from "react"
import { cn } from "@/lib/utils"

// ==================== HEADING COMPONENTS ====================

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
}

export const H1 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as: Component = "h1", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "heading-1 scroll-m-20 tracking-tight",
          className
        )}
        {...props}
      />
    )
  }
)
H1.displayName = "H1"

export const H2 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as: Component = "h2", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "heading-2 scroll-m-20 tracking-tight",
          className
        )}
        {...props}
      />
    )
  }
)
H2.displayName = "H2"

export const H3 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as: Component = "h3", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "heading-3 scroll-m-20",
          className
        )}
        {...props}
      />
    )
  }
)
H3.displayName = "H3"

export const H4 = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, as: Component = "h4", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "heading-4 scroll-m-20",
          className
        )}
        {...props}
      />
    )
  }
)
H4.displayName = "H4"

// ==================== TEXT COMPONENTS ====================

interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "xs" | "sm" | "base" | "lg"
  variant?: "default" | "muted" | "subtle"
  as?: "p" | "span" | "div"
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, size = "base", variant = "default", as: Component = "p", ...props }, ref) => {
    const sizeClasses = {
      xs: "body-xs",
      sm: "body-sm",
      base: "body-base",
      lg: "body-lg",
    }

    const variantClasses = {
      default: "text-foreground",
      muted: "text-muted-foreground",
      subtle: "text-muted-foreground/70",
    }

    return (
      <Component
        ref={ref}
        className={cn(
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      />
    )
  }
)
Text.displayName = "Text"

// ==================== SPECIALIZED COMPONENTS ====================

interface CaptionProps extends React.HTMLAttributes<HTMLElement> {
  as?: "span" | "p" | "div"
}

export const Caption = React.forwardRef<HTMLElement, CaptionProps>(
  ({ className, as: Component = "span", ...props }, ref) => {
    return (
      <Component
        ref={ref as any}
        className={cn("caption", className)}
        {...props}
      />
    )
  }
)
Caption.displayName = "Caption"

interface LeadProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: "p" | "div"
}

export const Lead = React.forwardRef<HTMLParagraphElement, LeadProps>(
  ({ className, as: Component = "p", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn(
          "body-lg text-muted-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
Lead.displayName = "Lead"

interface MutedProps extends React.HTMLAttributes<HTMLParagraphElement> {
  as?: "p" | "span" | "div"
}

export const Muted = React.forwardRef<HTMLParagraphElement, MutedProps>(
  ({ className, as: Component = "p", ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("body-sm text-muted-foreground", className)}
        {...props}
      />
    )
  }
)
Muted.displayName = "Muted"

interface CodeProps extends React.HTMLAttributes<HTMLElement> {}

export const InlineCode = React.forwardRef<HTMLElement, CodeProps>(
  ({ className, ...props }, ref) => {
    return (
      <code
        ref={ref}
        className={cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
          className
        )}
        {...props}
      />
    )
  }
)
InlineCode.displayName = "InlineCode"

interface ListProps extends React.HTMLAttributes<HTMLElement> {
  variant?: "bullet" | "number"
}

export const List = React.forwardRef<HTMLElement, ListProps>(
  ({ className, variant = "bullet", children, ...props }, ref) => {
    const Component = variant === "number" ? "ol" : "ul"
    return (
      <Component
        ref={ref as any}
        className={cn(
          "ml-6 list-outside space-y-1",
          variant === "bullet" ? "list-disc" : "list-decimal",
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)
List.displayName = "List"

interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {}

export const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(
  ({ className, ...props }, ref) => {
    return (
      <li
        ref={ref}
        className={cn("body-base", className)}
        {...props}
      />
    )
  }
)
ListItem.displayName = "ListItem"

// ==================== BLOCKQUOTE ====================

interface BlockquoteProps extends React.HTMLAttributes<HTMLQuoteElement> {}

export const Blockquote = React.forwardRef<HTMLQuoteElement, BlockquoteProps>(
  ({ className, ...props }, ref) => {
    return (
      <blockquote
        ref={ref}
        className={cn(
          "mt-6 border-l-2 border-primary pl-6 italic text-muted-foreground",
          className
        )}
        {...props}
      />
    )
  }
)
Blockquote.displayName = "Blockquote"

// ==================== LABEL ====================

interface LabelTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  required?: boolean
}

export const LabelText = React.forwardRef<HTMLSpanElement, LabelTextProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
        {...props}
      >
        {children}
        {required && <span className="text-destructive ml-1">*</span>}
      </span>
    )
  }
)
LabelText.displayName = "LabelText"
