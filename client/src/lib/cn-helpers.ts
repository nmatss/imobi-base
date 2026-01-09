import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TYPOGRAPHY, STATUS_VARIANTS, type Status } from "./design-constants";

/**
 * Combine classes with tailwind-merge (já existe como cn())
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper para aplicar variantes de status
 */
export function getStatusClass(status: Status): string {
  return STATUS_VARIANTS[status] || STATUS_VARIANTS.neutral;
}

/**
 * Helper para aplicar tipografia
 */
export function getTypographyClass(variant: keyof typeof TYPOGRAPHY): string {
  return TYPOGRAPHY[variant];
}
