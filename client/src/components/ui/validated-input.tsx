import * as React from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

// ==================== VALIDATED INPUT ====================

export interface ValidatedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
  isRequired?: boolean;
  showValidIcon?: boolean;
  registration?: UseFormRegisterReturn;
}

export const ValidatedInput = React.forwardRef<
  HTMLInputElement,
  ValidatedInputProps
>(
  (
    {
      className,
      label,
      error,
      description,
      isRequired,
      showValidIcon = true,
      registration,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || registration?.name || `input-${Math.random()}`;
    const isValid = !error && props.value && String(props.value).length > 0;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn(error && "text-destructive")}>
            {label}
            {isRequired && <span className="text-destructive ml-1">*</span>}
          </Label>
        )}

        <div className="relative">
          <Input
            id={inputId}
            ref={ref}
            className={cn(
              "transition-colors",
              error && "border-destructive focus-visible:ring-destructive",
              isValid &&
                showValidIcon &&
                "border-green-500 focus-visible:ring-green-500",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${inputId}-error`
                : description
                ? `${inputId}-description`
                : undefined
            }
            {...registration}
            {...props}
          />

          {/* Ícone de validação */}
          {showValidIcon && isValid && !props.disabled && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </div>
          )}

          {error && !props.disabled && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          )}
        </div>

        {/* Mensagem de descrição */}
        {description && !error && (
          <p
            id={`${inputId}-description`}
            className="text-sm text-muted-foreground flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {description}
          </p>
        )}

        {/* Mensagem de erro */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

// ==================== VALIDATED TEXTAREA ====================

export interface ValidatedTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  description?: string;
  isRequired?: boolean;
  showCharCount?: boolean;
  registration?: UseFormRegisterReturn;
}

export const ValidatedTextarea = React.forwardRef<
  HTMLTextAreaElement,
  ValidatedTextareaProps
>(
  (
    {
      className,
      label,
      error,
      description,
      isRequired,
      showCharCount = false,
      registration,
      id,
      maxLength,
      value,
      ...props
    },
    ref
  ) => {
    const inputId = id || registration?.name || `textarea-${Math.random()}`;
    const currentLength = value ? String(value).length : 0;

    return (
      <div className="space-y-2">
        {label && (
          <div className="flex items-center justify-between">
            <Label
              htmlFor={inputId}
              className={cn(error && "text-destructive")}
            >
              {label}
              {isRequired && <span className="text-destructive ml-1">*</span>}
            </Label>

            {showCharCount && maxLength && (
              <span
                className={cn(
                  "text-xs text-muted-foreground",
                  currentLength > maxLength * 0.9 && "text-orange-500",
                  currentLength >= maxLength && "text-destructive"
                )}
              >
                {currentLength}/{maxLength}
              </span>
            )}
          </div>
        )}

        <Textarea
          id={inputId}
          ref={ref}
          className={cn(
            "transition-colors",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${inputId}-error`
              : description
              ? `${inputId}-description`
              : undefined
          }
          maxLength={maxLength}
          value={value}
          {...registration}
          {...props}
        />

        {/* Mensagem de descrição */}
        {description && !error && (
          <p
            id={`${inputId}-description`}
            className="text-sm text-muted-foreground flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            {description}
          </p>
        )}

        {/* Mensagem de erro */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedTextarea.displayName = "ValidatedTextarea";

// ==================== VALIDATED SELECT ====================

export interface ValidatedSelectWrapperProps {
  label?: string;
  error?: string;
  description?: string;
  isRequired?: boolean;
  children: React.ReactNode;
  id?: string;
}

export function ValidatedSelectWrapper({
  label,
  error,
  description,
  isRequired,
  children,
  id,
}: ValidatedSelectWrapperProps) {
  const selectId = id || `select-${Math.random()}`;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={selectId} className={cn(error && "text-destructive")}>
          {label}
          {isRequired && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const childProps = child.props as Record<string, any>;
            return React.cloneElement(child as React.ReactElement<any>, {
              id: selectId,
              className: cn(
                childProps.className,
                error && "border-destructive focus:ring-destructive"
              ),
              "aria-invalid": !!error,
              "aria-describedby": error
                ? `${selectId}-error`
                : description
                ? `${selectId}-description`
                : undefined,
            });
          }
          return child;
        })}

        {error && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="h-4 w-4 text-destructive" />
          </div>
        )}
      </div>

      {/* Mensagem de descrição */}
      {description && !error && (
        <p
          id={`${selectId}-description`}
          className="text-sm text-muted-foreground flex items-center gap-1"
        >
          <Info className="h-3 w-3" />
          {description}
        </p>
      )}

      {/* Mensagem de erro */}
      {error && (
        <p
          id={`${selectId}-error`}
          className="text-sm text-destructive flex items-center gap-1 animate-in fade-in-0 slide-in-from-top-1"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
