import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * FormField Component - WCAG AA Compliant Form Field Wrapper
 *
 * Implements best practices for accessible forms:
 * - Associates label with input using htmlFor/id
 * - Displays error messages with aria-describedby
 * - Marks required fields with aria-required
 * - Sets aria-invalid for validation errors
 * - Provides visual indicators for required fields
 */

export interface FormFieldProps {
  /** Unique ID for the input field */
  id: string;
  /** Label text */
  label: string;
  /** Whether the field is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Helper text to display below the input */
  helperText?: string;
  /** Form field element (Input, Select, Textarea, etc.) */
  children: React.ReactElement;
  /** Additional className for the container */
  className?: string;
}

export function FormField({
  id,
  label,
  required = false,
  error,
  helperText,
  children,
  className,
}: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  // Clone the child element and add accessibility props
  const childWithProps = React.cloneElement(children, {
    id,
    "aria-required": required,
    "aria-invalid": !!error,
    "aria-describedby": describedBy,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="campo obrigatório">
            *
          </span>
        )}
      </Label>

      {childWithProps}

      {helperText && !error && (
        <p id={helperId} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}

      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
