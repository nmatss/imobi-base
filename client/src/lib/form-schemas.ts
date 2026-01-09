import { z } from "zod";

// ==================== VALIDATORS ====================

/**
 * Valida CPF brasileiro
 */
function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let mod = sum % 11;
  let digit1 = mod < 2 ? 0 : 11 - mod;

  if (parseInt(cleaned.charAt(9)) !== digit1) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  mod = sum % 11;
  let digit2 = mod < 2 ? 0 : 11 - mod;

  return parseInt(cleaned.charAt(10)) === digit2;
}

/**
 * Valida telefone brasileiro
 */
function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  // Aceita: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  return cleaned.length === 10 || cleaned.length === 11;
}

/**
 * Valida email
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==================== CUSTOM ZOD VALIDATORS ====================

const cpfValidator = z.string().refine(validateCPF, {
  message: "CPF inválido",
});

const phoneValidator = z.string().refine(validatePhone, {
  message: "Telefone inválido. Use o formato: (XX) XXXXX-XXXX",
});

const currencyValidator = z
  .string()
  .refine((val) => {
    const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
    return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) >= 0;
  }, {
    message: "Valor monetário inválido",
  });

// ==================== PROPERTY SCHEMA ====================

export const propertySchema = z.object({
  title: z
    .string()
    .min(5, "O título deve ter no mínimo 5 caracteres")
    .max(200, "O título deve ter no máximo 200 caracteres"),

  description: z
    .string()
    .min(10, "A descrição deve ter no mínimo 10 caracteres")
    .max(5000, "A descrição deve ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),

  type: z.enum(["house", "apartment", "commercial", "land", "farm"]),

  category: z.enum(["sale", "rent", "both"]),

  price: z
    .string()
    .min(1, "Informe o preço")
    .refine((val) => {
      const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      return !isNaN(num) && num > 0;
    }, {
      message: "O preço deve ser maior que zero",
    }),

  address: z
    .string()
    .min(5, "O endereço deve ter no mínimo 5 caracteres")
    .max(300, "O endereço deve ter no máximo 300 caracteres"),

  city: z
    .string()
    .min(2, "A cidade deve ter no mínimo 2 caracteres")
    .max(100, "A cidade deve ter no máximo 100 caracteres"),

  state: z
    .string()
    .length(2, "Use a sigla do estado (ex: SP, RJ)")
    .toUpperCase(),

  zipCode: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido. Use o formato: 12345-678")
    .optional()
    .or(z.literal("")),

  neighborhood: z
    .string()
    .min(2, "O bairro deve ter no mínimo 2 caracteres")
    .max(100, "O bairro deve ter no máximo 100 caracteres")
    .optional()
    .or(z.literal("")),

  bedrooms: z
    .number()
    .int("Número de quartos deve ser inteiro")
    .min(0, "Número de quartos não pode ser negativo")
    .max(50, "Número de quartos não pode ser maior que 50")
    .optional()
    .nullable(),

  bathrooms: z
    .number()
    .int("Número de banheiros deve ser inteiro")
    .min(0, "Número de banheiros não pode ser negativo")
    .max(50, "Número de banheiros não pode ser maior que 50")
    .optional()
    .nullable(),

  area: z
    .number()
    .min(0, "Área não pode ser negativa")
    .max(1000000, "Área não pode ser maior que 1.000.000 m²")
    .optional()
    .nullable(),

  features: z
    .array(z.string())
    .optional()
    .default([]),

  images: z
    .array(z.string().url("URL de imagem inválida"))
    .optional()
    .default([]),

  status: z
    .enum(["available", "rented", "sold", "reserved"])
    .default("available"),

  featured: z.boolean().default(false),

  latitude: z
    .number()
    .min(-90, "Latitude inválida")
    .max(90, "Latitude inválida")
    .optional()
    .nullable(),

  longitude: z
    .number()
    .min(-180, "Longitude inválida")
    .max(180, "Longitude inválida")
    .optional()
    .nullable(),
});

export type PropertyFormData = z.infer<typeof propertySchema>;

// ==================== LEAD SCHEMA ====================

export const leadSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(200, "O nome deve ter no máximo 200 caracteres"),

  email: z
    .string()
    .email("E-mail inválido")
    .max(200, "E-mail muito longo"),

  phone: phoneValidator,

  source: z.enum([
    "Site",
    "WhatsApp",
    "Instagram",
    "Facebook",
    "Indicação",
    "Portal",
    "Telefone",
    "Outro"
  ]),

  budget: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
      return !isNaN(parseFloat(cleaned)) && parseFloat(cleaned) >= 0;
    }, {
      message: "Orçamento inválido",
    }),

  notes: z
    .string()
    .max(5000, "As notas devem ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),

  preferredType: z
    .enum(["house", "apartment", "commercial", "land", "farm"])
    .optional()
    .or(z.literal("")),

  preferredCategory: z
    .enum(["sale", "rent", "both"])
    .optional()
    .or(z.literal("")),

  preferredCity: z
    .string()
    .max(100, "Cidade muito longa")
    .optional()
    .or(z.literal("")),

  preferredNeighborhood: z
    .string()
    .max(100, "Bairro muito longo")
    .optional()
    .or(z.literal("")),

  minBedrooms: z
    .number()
    .int("Deve ser um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(50, "Valor muito alto")
    .optional()
    .nullable(),

  maxBedrooms: z
    .number()
    .int("Deve ser um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(50, "Valor muito alto")
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.minBedrooms !== null && data.minBedrooms !== undefined &&
        data.maxBedrooms !== null && data.maxBedrooms !== undefined) {
      return data.minBedrooms <= data.maxBedrooms;
    }
    return true;
  },
  {
    message: "Mínimo de quartos não pode ser maior que o máximo",
    path: ["minBedrooms"],
  }
);

export type LeadFormData = z.infer<typeof leadSchema>;

// ==================== CONTRACT SCHEMA ====================

export const contractSchema = z.object({
  propertyId: z
    .string()
    .min(1, "Selecione um imóvel"),

  leadId: z
    .string()
    .min(1, "Selecione um lead"),

  type: z.enum(["sale", "rent"]),

  status: z
    .enum(["draft", "active", "completed", "cancelled"])
    .default("draft"),

  value: z
    .string()
    .min(1, "Informe o valor do contrato")
    .refine((val) => {
      const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      return !isNaN(num) && num > 0;
    }, {
      message: "O valor deve ser maior que zero",
    }),

  terms: z
    .string()
    .max(10000, "Os termos devem ter no máximo 10000 caracteres")
    .optional()
    .or(z.literal("")),

  signedAt: z
    .date()
    .optional()
    .nullable(),
});

export type ContractFormData = z.infer<typeof contractSchema>;

// ==================== RENTAL CONTRACT SCHEMA ====================

export const rentalContractSchema = z.object({
  propertyId: z
    .string()
    .min(1, "Selecione um imóvel"),

  ownerId: z
    .string()
    .min(1, "Selecione o proprietário"),

  renterId: z
    .string()
    .min(1, "Selecione o inquilino"),

  rentValue: z
    .string()
    .min(1, "Informe o valor do aluguel")
    .refine((val) => {
      const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".");
      const num = parseFloat(cleaned);
      return !isNaN(num) && num > 0;
    }, {
      message: "O valor do aluguel deve ser maior que zero",
    }),

  condoFee: currencyValidator.optional().or(z.literal("")),

  iptuValue: currencyValidator.optional().or(z.literal("")),

  dueDay: z
    .number()
    .int("Dia de vencimento deve ser inteiro")
    .min(1, "Dia de vencimento deve ser entre 1 e 31")
    .max(31, "Dia de vencimento deve ser entre 1 e 31"),

  startDate: z.date(),

  endDate: z.date(),

  adjustmentIndex: z
    .enum(["IGPM", "IPCA", "CDI", "Other"])
    .default("IGPM"),

  depositValue: currencyValidator.optional().or(z.literal("")),

  administrationFee: z
    .string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    }, {
      message: "Taxa de administração deve ser entre 0 e 100%",
    })
    .default("10"),

  notes: z
    .string()
    .max(5000, "As notas devem ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
}).refine(
  (data) => {
    return data.endDate > data.startDate;
  },
  {
    message: "Data de término deve ser posterior à data de início",
    path: ["endDate"],
  }
);

export type RentalContractFormData = z.infer<typeof rentalContractSchema>;

// ==================== OWNER SCHEMA ====================

export const ownerSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(200, "O nome deve ter no máximo 200 caracteres"),

  email: z
    .string()
    .email("E-mail inválido")
    .max(200, "E-mail muito longo")
    .optional()
    .or(z.literal("")),

  phone: phoneValidator,

  cpfCnpj: cpfValidator.optional().or(z.literal("")),

  address: z
    .string()
    .max(300, "Endereço muito longo")
    .optional()
    .or(z.literal("")),

  bankName: z
    .string()
    .max(100, "Nome do banco muito longo")
    .optional()
    .or(z.literal("")),

  bankAgency: z
    .string()
    .max(20, "Agência muito longa")
    .optional()
    .or(z.literal("")),

  bankAccount: z
    .string()
    .max(30, "Conta muito longa")
    .optional()
    .or(z.literal("")),

  pixKey: z
    .string()
    .max(100, "Chave PIX muito longa")
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .max(5000, "As notas devem ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type OwnerFormData = z.infer<typeof ownerSchema>;

// ==================== RENTER SCHEMA ====================

export const renterSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(200, "O nome deve ter no máximo 200 caracteres"),

  email: z
    .string()
    .email("E-mail inválido")
    .max(200, "E-mail muito longo")
    .optional()
    .or(z.literal("")),

  phone: phoneValidator,

  cpfCnpj: cpfValidator.optional().or(z.literal("")),

  rg: z
    .string()
    .max(20, "RG muito longo")
    .optional()
    .or(z.literal("")),

  profession: z
    .string()
    .max(100, "Profissão muito longa")
    .optional()
    .or(z.literal("")),

  income: currencyValidator.optional().or(z.literal("")),

  address: z
    .string()
    .max(300, "Endereço muito longo")
    .optional()
    .or(z.literal("")),

  emergencyContact: z
    .string()
    .max(200, "Nome do contato muito longo")
    .optional()
    .or(z.literal("")),

  emergencyPhone: phoneValidator.optional().or(z.literal("")),

  notes: z
    .string()
    .max(5000, "As notas devem ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type RenterFormData = z.infer<typeof renterSchema>;

// ==================== USER SCHEMA ====================

export const userSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(200, "O nome deve ter no máximo 200 caracteres"),

  email: z
    .string()
    .email("E-mail inválido")
    .max(200, "E-mail muito longo"),

  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número")
    .optional(),

  confirmPassword: z
    .string()
    .optional(),

  role: z
    .enum(["admin", "manager", "broker", "user"])
    .default("user"),

  avatar: z
    .string()
    .url("URL de avatar inválida")
    .optional()
    .or(z.literal("")),
}).refine(
  (data) => {
    if (data.password && data.confirmPassword) {
      return data.password === data.confirmPassword;
    }
    return true;
  },
  {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  }
);

export type UserFormData = z.infer<typeof userSchema>;

// ==================== LOGIN SCHEMA ====================

export const loginSchema = z.object({
  email: z
    .string()
    .email("E-mail inválido")
    .max(200, "E-mail muito longo"),

  password: z
    .string()
    .min(1, "Informe a senha"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// ==================== INTERACTION SCHEMA ====================

export const interactionSchema = z.object({
  type: z.enum(["call", "email", "whatsapp", "visit", "note"]),

  content: z
    .string()
    .min(1, "Informe o conteúdo da interação")
    .max(5000, "O conteúdo deve ter no máximo 5000 caracteres"),
});

export type InteractionFormData = z.infer<typeof interactionSchema>;

// ==================== FOLLOW UP SCHEMA ====================

export const followUpSchema = z.object({
  type: z.enum(["call", "email", "whatsapp", "visit", "proposal", "other"]),

  dueAt: z.date(),

  notes: z
    .string()
    .max(5000, "As notas devem ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type FollowUpFormData = z.infer<typeof followUpSchema>;

// ==================== CALENDAR EVENT SCHEMA ====================

export const calendarEventSchema = z.object({
  type: z.enum(["visit", "meeting", "follow_up", "call", "contract_signing", "property_delivery", "inspection", "other"]),

  title: z
    .string()
    .min(3, "O título deve ter no mínimo 3 caracteres")
    .max(200, "O título deve ter no máximo 200 caracteres"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida. Use o formato YYYY-MM-DD"),

  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Horário inválido. Use o formato HH:MM"),

  duration: z
    .number()
    .int("Duração deve ser um número inteiro")
    .min(5, "Duração mínima de 5 minutos")
    .max(480, "Duração máxima de 8 horas"),

  clientId: z
    .string()
    .optional(),

  propertyId: z
    .string()
    .optional(),

  location: z
    .string()
    .max(300, "Localização muito longa")
    .optional()
    .or(z.literal("")),

  description: z
    .string()
    .max(5000, "A descrição deve ter no máximo 5000 caracteres")
    .optional()
    .or(z.literal("")),

  reminderMinutes: z
    .number()
    .int("Minutos devem ser um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(10080, "Máximo de 7 dias (10080 minutos)")
    .optional()
    .nullable(),

  participants: z
    .array(z.string())
    .optional()
    .default([]),
});

export type CalendarEventFormData = z.infer<typeof calendarEventSchema>;

// ==================== PUBLIC INTEREST SCHEMA ====================

export const publicInterestSchema = z.object({
  name: z
    .string()
    .min(3, "O nome deve ter no mínimo 3 caracteres")
    .max(200, "O nome deve ter no máximo 200 caracteres"),

  email: z
    .string()
    .email("E-mail inválido")
    .max(200, "E-mail muito longo"),

  phone: z
    .string()
    .refine((val) => {
      const cleaned = val.replace(/\D/g, "");
      return cleaned.length === 10 || cleaned.length === 11;
    }, {
      message: "Telefone inválido. Use o formato: (XX) XXXXX-XXXX",
    }),

  message: z
    .string()
    .max(1000, "A mensagem deve ter no máximo 1000 caracteres")
    .optional()
    .or(z.literal("")),
});

export type PublicInterestFormData = z.infer<typeof publicInterestSchema>;

// ==================== PROPERTY FILTER SCHEMA ====================

export const propertyFilterSchema = z.object({
  type: z
    .enum(["house", "apartment", "commercial", "land", "farm", ""])
    .optional(),

  category: z
    .enum(["sale", "rent", "both", ""])
    .optional(),

  city: z
    .string()
    .max(100, "Cidade muito longa")
    .optional()
    .or(z.literal("")),

  neighborhood: z
    .string()
    .max(100, "Bairro muito longo")
    .optional()
    .or(z.literal("")),

  minPrice: z
    .number()
    .min(0, "Preço mínimo não pode ser negativo")
    .optional()
    .nullable(),

  maxPrice: z
    .number()
    .min(0, "Preço máximo não pode ser negativo")
    .optional()
    .nullable(),

  minBedrooms: z
    .number()
    .int("Deve ser um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(50, "Valor muito alto")
    .optional()
    .nullable(),

  maxBedrooms: z
    .number()
    .int("Deve ser um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(50, "Valor muito alto")
    .optional()
    .nullable(),

  minArea: z
    .number()
    .min(0, "Área mínima não pode ser negativa")
    .optional()
    .nullable(),

  maxArea: z
    .number()
    .min(0, "Área máxima não pode ser negativa")
    .optional()
    .nullable(),

  status: z
    .enum(["available", "rented", "sold", "reserved", ""])
    .optional(),

  featured: z
    .boolean()
    .optional(),
}).refine(
  (data) => {
    if (data.minPrice !== null && data.minPrice !== undefined &&
        data.maxPrice !== null && data.maxPrice !== undefined) {
      return data.minPrice <= data.maxPrice;
    }
    return true;
  },
  {
    message: "Preço mínimo não pode ser maior que o preço máximo",
    path: ["minPrice"],
  }
).refine(
  (data) => {
    if (data.minBedrooms !== null && data.minBedrooms !== undefined &&
        data.maxBedrooms !== null && data.maxBedrooms !== undefined) {
      return data.minBedrooms <= data.maxBedrooms;
    }
    return true;
  },
  {
    message: "Mínimo de quartos não pode ser maior que o máximo",
    path: ["minBedrooms"],
  }
).refine(
  (data) => {
    if (data.minArea !== null && data.minArea !== undefined &&
        data.maxArea !== null && data.maxArea !== undefined) {
      return data.minArea <= data.maxArea;
    }
    return true;
  },
  {
    message: "Área mínima não pode ser maior que a área máxima",
    path: ["minArea"],
  }
);

export type PropertyFilterFormData = z.infer<typeof propertyFilterSchema>;
