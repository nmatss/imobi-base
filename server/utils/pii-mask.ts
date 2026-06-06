/**
 * PII MASKING UTILITIES
 *
 * Mascaramento parcial de dados pessoais para uso em LOGS, telas de auditoria e
 * respostas onde o dado completo não é necessário. O objetivo é minimizar a
 * exposição de dados pessoais (LGPD Art. 6, III - princípio da necessidade)
 * mantendo legibilidade para diagnóstico (mostrando apenas os últimos dígitos).
 *
 * IMPORTANTE: mascaramento NÃO é anonimização nem criptografia. Para anonimização
 * irreversível use server/compliance/anonymizer.ts. Criptografia de coluna at-rest
 * é uma tarefa separada (ver "remaining" do track de compliance).
 */

/**
 * Mantém apenas os últimos `visible` caracteres de uma string, substituindo o
 * restante por `maskChar`. Retorna string vazia para entradas vazias.
 */
function maskTail(value: string, visible: number, maskChar = "*"): string {
  if (!value) return "";
  if (value.length <= visible) {
    return maskChar.repeat(value.length);
  }
  const masked = maskChar.repeat(value.length - visible);
  return masked + value.slice(value.length - visible);
}

/**
 * Mascara CPF (11 dígitos) ou CNPJ (14 dígitos), mostrando apenas os 2 últimos
 * dígitos. Preserva apenas o sufixo para conferência sem expor o documento.
 *
 * Ex.: CPF  "123.456.789-09"     vira algo como "...-09" (só os 2 finais)
 *      CNPJ "12.345.678/0001-95" vira algo como "...-95" (só os 2 finais)
 */
export function maskCpfCnpj(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";

  if (digits.length === 11) {
    const last = digits.slice(-2);
    return `***.***.**${last[0]}-${last}`;
  }

  if (digits.length === 14) {
    const last = digits.slice(-2);
    return `**.***.***/****-${last}`;
  }

  // Formato desconhecido: mascara tudo menos os 2 últimos dígitos.
  return maskTail(digits, 2);
}

/**
 * Mascara e-mail mostrando o primeiro caractere do usuário e o domínio.
 *
 * Ex.: "joao.silva@gmail.com" -> "j***@gmail.com"
 *      "a@b.com" -> "*@b.com"
 */
export function maskEmail(value: string | null | undefined): string {
  if (!value) return "";
  const at = value.indexOf("@");
  if (at <= 0) {
    // Sem domínio válido: mascara tudo menos o último caractere.
    return maskTail(value, 1);
  }
  const local = value.slice(0, at);
  const domain = value.slice(at);
  const first = local[0];
  return `${first}${"*".repeat(Math.max(local.length - 1, 1))}${domain}`;
}

/**
 * Mascara telefone mostrando apenas os 4 últimos dígitos.
 *
 * Ex.: "+55 (11) 98765-4321" -> "***********4321"
 */
export function maskPhone(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return maskTail(digits, 4);
}

/**
 * Mascara conta bancária / agência / chave Pix numérica mostrando apenas os 4
 * últimos dígitos.
 *
 * Ex.: "00012345-6" -> "*******45-6" (4 últimos visíveis: "45-6" => 4 chars)
 */
export function maskBankAccount(value: string | null | undefined): string {
  if (!value) return "";
  return maskTail(value, 4);
}

/**
 * Aplica o mascaramento adequado a um campo conhecido pelo nome.
 * Usado pelos loggers de auditoria para redigir dados pessoais sem perder o
 * sufixo útil para diagnóstico. Retorna o valor original (como string) quando o
 * campo não é reconhecido como PII.
 */
export function maskByFieldName(field: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  const lower = field.toLowerCase();

  if (lower.includes("cpf") || lower.includes("cnpj")) return maskCpfCnpj(str);
  if (lower.includes("email")) return maskEmail(str);
  if (lower.includes("phone") || lower.includes("telefone") || lower.includes("celular")) {
    return maskPhone(str);
  }
  if (
    lower.includes("bankaccount") ||
    lower.includes("bank_account") ||
    lower.includes("bankagency") ||
    lower.includes("bank_agency") ||
    lower.includes("pix")
  ) {
    return maskBankAccount(str);
  }

  return str;
}

/**
 * Conjunto de campos considerados PII para fins de mascaramento em logs.
 * Reutilizável por outros módulos.
 */
export const PII_FIELD_NAMES = [
  "cpfCnpj",
  "cpf",
  "cnpj",
  "email",
  "phone",
  "telefone",
  "celular",
  "bankAccount",
  "bankAgency",
  "pixKey",
] as const;
