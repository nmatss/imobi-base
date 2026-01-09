import React, { InputHTMLAttributes, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";

interface SettingsFormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  validate?: (value: string) => Promise<string | null> | string | null;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url' | 'password' | 'textarea';
  debounceMs?: number;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

type ValidationState = 'idle' | 'validating' | 'valid' | 'warning' | 'error';

export function SettingsFormField({
  label,
  name,
  value,
  onChange,
  validate,
  helperText,
  required = false,
  disabled = false,
  type = 'text',
  debounceMs = 500,
  placeholder,
  maxLength,
  rows = 4,
  ...inputProps
}: SettingsFormFieldProps) {
  const [validationState, setValidationState] = useState<ValidationState>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup debounce timer
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performValidation = async (inputValue: string) => {
    if (!validate) {
      setValidationState('idle');
      setValidationMessage(null);
      return;
    }

    setValidationState('validating');

    try {
      const result = await Promise.resolve(validate(inputValue));

      if (result === null) {
        setValidationState('valid');
        setValidationMessage(null);
      } else {
        // Check if it's a warning (starts with "warning:")
        if (result.startsWith('warning:')) {
          setValidationState('warning');
          setValidationMessage(result.replace('warning:', '').trim());
        } else {
          setValidationState('error');
          setValidationMessage(result);
        }
      }
    } catch (error) {
      setValidationState('error');
      setValidationMessage('Erro ao validar campo');
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTouched(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    performValidation(value);
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);

    if (!validate || !touched) return;

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      performValidation(newValue);
    }, debounceMs);
  };

  const getInputClasses = () => {
    if (!touched || validationState === 'idle' || validationState === 'validating') {
      return '';
    }

    if (validationState === 'valid') {
      return 'border-green-500 focus-visible:ring-green-500 pr-10';
    }

    if (validationState === 'warning') {
      return 'border-yellow-500 focus-visible:ring-yellow-500 pr-10';
    }

    if (validationState === 'error') {
      return 'border-destructive focus-visible:ring-destructive pr-10';
    }

    return '';
  };

  const renderValidationIcon = () => {
    if (!touched || validationState === 'idle') return null;

    const iconClasses = "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4";

    switch (validationState) {
      case 'validating':
        return <Loader2 className={cn(iconClasses, "animate-spin text-muted-foreground")} />;
      case 'valid':
        return <CheckCircle2 className={cn(iconClasses, "text-green-500")} />;
      case 'warning':
        return <AlertTriangle className={cn(iconClasses, "text-yellow-500")} />;
      case 'error':
        return <AlertCircle className={cn(iconClasses, "text-destructive")} />;
      default:
        return null;
    }
  };

  const showValidationMessage = touched && validationMessage && validationState !== 'validating';

  return (
    <div className="grid gap-2">
      <Label htmlFor={name} className="flex items-center gap-2">
        {label}
        {required && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            Obrigatório
          </Badge>
        )}
      </Label>

      <div className="relative">
        {type === 'textarea' ? (
          <Textarea
            id={name}
            name={name}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={rows}
            className={cn('min-h-[100px]', getInputClasses())}
            aria-invalid={validationState === 'error'}
            aria-describedby={
              showValidationMessage
                ? `${name}-validation ${name}-helper`
                : helperText
                ? `${name}-helper`
                : undefined
            }
          />
        ) : (
          <Input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={maxLength}
            className={cn('h-11', getInputClasses())}
            aria-invalid={validationState === 'error'}
            aria-describedby={
              showValidationMessage
                ? `${name}-validation ${name}-helper`
                : helperText
                ? `${name}-helper`
                : undefined
            }
            {...inputProps}
          />
        )}
        {type !== 'textarea' && renderValidationIcon()}
      </div>

      {showValidationMessage && (
        <p
          id={`${name}-validation`}
          className={cn(
            "text-xs",
            validationState === 'error' && "text-destructive",
            validationState === 'warning' && "text-yellow-600"
          )}
        >
          {validationMessage}
        </p>
      )}

      {helperText && !showValidationMessage && (
        <p id={`${name}-helper`} className="text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
