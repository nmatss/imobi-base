// @ts-nocheck
import { FieldError, FieldErrors } from "react-hook-form";

// ==================== ERROR HANDLING ====================

/**
 * Extrai mensagem de erro de um campo do formulário
 * @param error - Erro do campo
 * @returns Mensagem de erro ou undefined
 */
export function getErrorMessage(error: FieldError | undefined): string | undefined {
  return error?.message;
}

/**
 * Verifica se um campo tem erro
 * @param errors - Objeto de erros do formulário
 * @param fieldName - Nome do campo
 * @returns True se o campo tem erro
 */
export function hasError(errors: FieldErrors, fieldName: string): boolean {
  return !!errors[fieldName];
}

/**
 * Formata todos os erros do formulário para exibição
 * @param errors - Objeto de erros do formulário
 * @returns Array de mensagens de erro
 */
export function formatFormErrors(errors: FieldErrors): string[] {
  return Object.entries(errors).map(([field, error]) => {
    const errorObj = error as FieldError;
    return `${field}: ${errorObj.message}`;
  });
}

// ==================== VALUE FORMATTING ====================

/**
 * Formata valor monetário para exibição (R$ 1.234,56)
 * @param value - Valor em centavos ou string
 * @returns String formatada
 */
export function formatCurrency(value: string | number | null | undefined): string {
  if (!value && value !== 0) return "";

  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue);
}

/**
 * Remove formatação de moeda e retorna número
 * @param value - Valor formatado (ex: "R$ 1.234,56")
 * @returns Número
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[R$\s.]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/**
 * Formata CPF (123.456.789-01)
 * @param value - CPF sem formatação
 * @returns CPF formatado
 */
export function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return value;
}

/**
 * Remove formatação do CPF
 * @param value - CPF formatado
 * @returns CPF sem formatação
 */
export function parseCPF(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata telefone ((11) 98765-4321)
 * @param value - Telefone sem formatação
 * @returns Telefone formatado
 */
export function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");

  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }

  return value;
}

/**
 * Remove formatação do telefone
 * @param value - Telefone formatado
 * @returns Telefone sem formatação
 */
export function parsePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata CEP (12345-678)
 * @param value - CEP sem formatação
 * @returns CEP formatado
 */
export function formatCEP(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  return cleaned.replace(/(\d{5})(\d{3})/, "$1-$2");
}

/**
 * Remove formatação do CEP
 * @param value - CEP formatado
 * @returns CEP sem formatação
 */
export function parseCEP(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata percentual (10% -> 10,00)
 * @param value - Valor percentual
 * @returns String formatada
 */
export function formatPercentage(value: number | string): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(numValue)) return "0,00";

  return numValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ==================== INPUT MASKING ====================

/**
 * Aplica máscara de moeda em input
 * @param value - Valor do input
 * @returns Valor formatado
 */
export function currencyMask(value: string): string {
  let v = value.replace(/\D/g, "");
  v = (parseInt(v) / 100).toFixed(2);
  v = v.replace(".", ",");
  v = v.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
  return `R$ ${v}`;
}

/**
 * Aplica máscara de telefone em input
 * @param value - Valor do input
 * @returns Valor formatado
 */
export function phoneMask(value: string): string {
  return formatPhone(value);
}

/**
 * Aplica máscara de CPF em input
 * @param value - Valor do input
 * @returns Valor formatado
 */
export function cpfMask(value: string): string {
  return formatCPF(value);
}

/**
 * Aplica máscara de CEP em input
 * @param value - Valor do input
 * @returns Valor formatado
 */
export function cepMask(value: string): string {
  return formatCEP(value);
}

// ==================== VALIDATION HELPERS ====================

/**
 * Valida se um campo obrigatório está preenchido
 * @param value - Valor do campo
 * @returns True se válido
 */
export function isRequired(value: string | null | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * Valida tamanho mínimo de string
 * @param value - Valor do campo
 * @param min - Tamanho mínimo
 * @returns True se válido
 */
export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

/**
 * Valida tamanho máximo de string
 * @param value - Valor do campo
 * @param max - Tamanho máximo
 * @returns True se válido
 */
export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

/**
 * Valida se valor está entre min e max
 * @param value - Valor numérico
 * @param min - Valor mínimo
 * @param max - Valor máximo
 * @returns True se válido
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// ==================== FORM STATE HELPERS ====================

/**
 * Verifica se o formulário tem alterações não salvas
 * @param isDirty - Flag do react-hook-form
 * @param isSubmitting - Flag do react-hook-form
 * @returns True se tem alterações não salvas
 */
export function hasUnsavedChanges(isDirty: boolean, isSubmitting: boolean): boolean {
  return isDirty && !isSubmitting;
}

/**
 * Reseta valores do formulário para os valores iniciais
 * @param reset - Função reset do react-hook-form
 * @param defaultValues - Valores padrão
 */
export function resetForm<T>(reset: (values?: T) => void, defaultValues?: T): void {
  reset(defaultValues);
}

// ==================== DATA TRANSFORMATION ====================

/**
 * Converte string vazia em null
 * @param value - Valor string
 * @returns String ou null
 */
export function emptyStringToNull(value: string | undefined | null): string | null {
  if (!value || value.trim() === "") return null;
  return value;
}

/**
 * Converte null/undefined em string vazia
 * @param value - Valor
 * @returns String
 */
export function nullToEmptyString(value: string | null | undefined): string {
  return value ?? "";
}

/**
 * Converte string para número ou null
 * @param value - String numérica
 * @returns Número ou null
 */
export function stringToNumber(value: string | null | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Converte número para string
 * @param value - Número
 * @returns String
 */
export function numberToString(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toString();
}

/**
 * Prepara dados do formulário para envio à API
 * Remove strings vazias e converte para null quando apropriado
 * @param data - Dados do formulário
 * @returns Dados limpos
 */
export function prepareFormData<T extends Record<string, any>>(data: T): T {
  const cleaned = { ...data };

  Object.keys(cleaned).forEach((key) => {
    const value = cleaned[key];

    // Converte strings vazias em null
    if (typeof value === "string" && value.trim() === "") {
      cleaned[key] = null as any;
    }

    // Remove propriedades undefined
    if (value === undefined) {
      delete cleaned[key];
    }
  });

  return cleaned;
}

// ==================== AUTOCOMPLETE HELPERS ====================

/**
 * Busca endereço por CEP usando API ViaCEP
 * @param cep - CEP sem formatação
 * @returns Dados do endereço
 */
export async function fetchAddressByCEP(cep: string): Promise<{
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
} | null> {
  const cleanCEP = parseCEP(cep);

  if (cleanCEP.length !== 8) {
    return null;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();

    if (data.erro) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    return null;
  }
}

/**
 * Preenche campos de endereço automaticamente a partir do CEP
 * @param cep - CEP
 * @param setValue - Função setValue do react-hook-form
 */
export async function autoFillAddress(
  cep: string,
  setValue: (name: string, value: any) => void
): Promise<boolean> {
  const address = await fetchAddressByCEP(cep);

  if (!address) {
    return false;
  }

  setValue("address", address.logradouro);
  setValue("neighborhood", address.bairro);
  setValue("city", address.localidade);
  setValue("state", address.uf);

  return true;
}

// ==================== FILE UPLOAD HELPERS ====================

/**
 * Valida tamanho de arquivo
 * @param file - Arquivo
 * @param maxSizeMB - Tamanho máximo em MB
 * @returns True se válido
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Valida tipo de arquivo
 * @param file - Arquivo
 * @param allowedTypes - Tipos permitidos (ex: ["image/jpeg", "image/png"])
 * @returns True se válido
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Converte arquivo para base64
 * @param file - Arquivo
 * @returns Promise com string base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// ==================== DATE HELPERS ====================

/**
 * Formata data para input type="date" (YYYY-MM-DD)
 * @param date - Data
 * @returns String formatada
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return d.toISOString().split("T")[0];
}

/**
 * Formata data para exibição (DD/MM/YYYY)
 * @param date - Data
 * @returns String formatada
 */
export function formatDateForDisplay(date: Date | string | null | undefined): string {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return d.toLocaleDateString("pt-BR");
}

/**
 * Converte string de input (YYYY-MM-DD) para Date
 * @param dateString - String de data
 * @returns Date ou null
 */
export function parseInputDate(dateString: string): Date | null {
  if (!dateString) return null;

  const date = new Date(dateString + "T00:00:00");
  return isNaN(date.getTime()) ? null : date;
}
