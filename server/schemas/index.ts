// @ts-nocheck
/**
 * Zod Validation Schemas
 * Centralized validation schemas for all API endpoints
 */

import { z } from 'zod';
import {
  insertPropertySchema,
  insertLeadSchema,
  insertVisitSchema,
  insertContractSchema,
  insertInteractionSchema,
  insertOwnerSchema,
  insertRenterSchema,
  insertRentalContractSchema,
  insertRentalPaymentSchema,
  insertRentalTransferSchema,
  insertSaleProposalSchema,
  insertPropertySaleSchema,
  insertFinanceCategorySchema,
  insertFinanceEntrySchema,
  insertLeadTagSchema,
  insertFollowUpSchema,
  insertCommissionSchema,
} from '@shared/schema-sqlite';

// ============== COMMON SCHEMAS ==============

export const idParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============== AUTH SCHEMAS ==============

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantId: z.string().uuid().optional(),
});

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ============== PROPERTY SCHEMAS ==============

export const createPropertySchema = insertPropertySchema.extend({
  price: z.string().or(z.number()),
});

export const updatePropertySchema = createPropertySchema.partial();

export const propertyQuerySchema = paginationSchema.extend({
  type: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  bedrooms: z.coerce.number().int().optional(),
  bathrooms: z.coerce.number().int().optional(),
  status: z.enum(['available', 'rented', 'sold', 'pending']).optional(),
  featured: z.coerce.boolean().optional(),
  search: z.string().optional(),
});

// ============== LEAD SCHEMAS ==============

export const createLeadSchema = insertLeadSchema.extend({
  budget: z.string().or(z.number()).optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadQuerySchema = paginationSchema.extend({
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  source: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  search: z.string().optional(),
});

export const leadStatusSchema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
});

// ============== INTERACTION SCHEMAS ==============

export const createInteractionSchema = insertInteractionSchema;

export const interactionQuerySchema = paginationSchema.extend({
  leadId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  type: z.enum(['call', 'email', 'whatsapp', 'visit', 'note']).optional(),
});

// ============== VISIT SCHEMAS ==============

export const createVisitSchema = insertVisitSchema;

export const updateVisitSchema = createVisitSchema.partial();

export const visitQuerySchema = paginationSchema.extend({
  propertyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no-show']).optional(),
  assignedTo: z.string().uuid().optional(),
  date: z.string().datetime().optional(),
});

// ============== CONTRACT SCHEMAS ==============

export const createContractSchema = insertContractSchema.extend({
  value: z.string().or(z.number()),
});

export const updateContractSchema = createContractSchema.partial();

export const contractQuerySchema = paginationSchema.extend({
  propertyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  type: z.enum(['sale', 'rental', 'lease']).optional(),
  status: z.enum(['draft', 'pending', 'signed', 'active', 'expired', 'cancelled']).optional(),
});

// ============== OWNER SCHEMAS ==============

export const createOwnerSchema = insertOwnerSchema;

export const updateOwnerSchema = createOwnerSchema.partial();

export const ownerQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

// ============== RENTER SCHEMAS ==============

export const createRenterSchema = insertRenterSchema.extend({
  income: z.string().or(z.number()).optional(),
});

export const updateRenterSchema = createRenterSchema.partial();

export const renterQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
});

// ============== RENTAL CONTRACT SCHEMAS ==============

export const createRentalContractSchema = insertRentalContractSchema.extend({
  rentValue: z.string().or(z.number()),
  condoFee: z.string().or(z.number()).optional(),
  iptuValue: z.string().or(z.number()).optional(),
  depositValue: z.string().or(z.number()).optional(),
  administrationFee: z.string().or(z.number()).optional(),
});

export const updateRentalContractSchema = createRentalContractSchema.partial();

export const rentalContractQuerySchema = paginationSchema.extend({
  propertyId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  renterId: z.string().uuid().optional(),
  status: z.enum(['active', 'expired', 'cancelled', 'pending']).optional(),
});

// ============== RENTAL PAYMENT SCHEMAS ==============

export const createRentalPaymentSchema = insertRentalPaymentSchema.extend({
  rentValue: z.string().or(z.number()),
  condoFee: z.string().or(z.number()).optional(),
  iptuValue: z.string().or(z.number()).optional(),
  extraCharges: z.string().or(z.number()).optional(),
  discounts: z.string().or(z.number()).optional(),
  totalValue: z.string().or(z.number()),
  paidValue: z.string().or(z.number()).optional(),
});

export const updateRentalPaymentSchema = createRentalPaymentSchema.partial();

export const rentalPaymentQuerySchema = paginationSchema.extend({
  rentalContractId: z.string().uuid().optional(),
  status: z.enum(['pending', 'paid', 'late', 'cancelled']).optional(),
  referenceMonth: z.string().optional(),
});

// ============== RENTAL TRANSFER SCHEMAS ==============

export const createRentalTransferSchema = insertRentalTransferSchema.extend({
  grossAmount: z.string().or(z.number()),
  administrationFee: z.string().or(z.number()).optional(),
  maintenanceDeductions: z.string().or(z.number()).optional(),
  otherDeductions: z.string().or(z.number()).optional(),
  netAmount: z.string().or(z.number()),
});

export const updateRentalTransferSchema = createRentalTransferSchema.partial();

export const rentalTransferQuerySchema = paginationSchema.extend({
  ownerId: z.string().uuid().optional(),
  status: z.enum(['pending', 'paid']).optional(),
  referenceMonth: z.string().optional(),
});

// ============== SALE PROPOSAL SCHEMAS ==============

export const createSaleProposalSchema = insertSaleProposalSchema.extend({
  proposedValue: z.string().or(z.number()),
});

export const updateSaleProposalSchema = createSaleProposalSchema.partial();

export const saleProposalQuerySchema = paginationSchema.extend({
  propertyId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  status: z.enum(['pending', 'accepted', 'rejected', 'countered', 'expired']).optional(),
});

// ============== PROPERTY SALE SCHEMAS ==============

export const createPropertySaleSchema = insertPropertySaleSchema.extend({
  saleValue: z.string().or(z.number()),
  commissionRate: z.string().or(z.number()).optional(),
  commissionValue: z.string().or(z.number()).optional(),
});

export const updatePropertySaleSchema = createPropertySaleSchema.partial();

export const propertySaleQuerySchema = paginationSchema.extend({
  propertyId: z.string().uuid().optional(),
  buyerLeadId: z.string().uuid().optional(),
  brokerId: z.string().uuid().optional(),
  status: z.enum(['completed', 'pending', 'cancelled']).optional(),
});

// ============== FINANCE CATEGORY SCHEMAS ==============

export const createFinanceCategorySchema = insertFinanceCategorySchema;

export const updateFinanceCategorySchema = createFinanceCategorySchema.partial();

export const financeCategoryQuerySchema = paginationSchema.extend({
  type: z.enum(['income', 'expense']).optional(),
});

// ============== FINANCE ENTRY SCHEMAS ==============

export const createFinanceEntrySchema = insertFinanceEntrySchema.extend({
  amount: z.string().or(z.number()),
});

export const updateFinanceEntrySchema = createFinanceEntrySchema.partial();

export const financeEntryQuerySchema = paginationSchema.extend({
  categoryId: z.string().uuid().optional(),
  flow: z.enum(['in', 'out']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sourceType: z.string().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
});

// ============== LEAD TAG SCHEMAS ==============

export const createLeadTagSchema = insertLeadTagSchema;

export const updateLeadTagSchema = createLeadTagSchema.partial();

// ============== FOLLOW-UP SCHEMAS ==============

export const createFollowUpSchema = insertFollowUpSchema;

export const updateFollowUpSchema = createFollowUpSchema.partial();

export const followUpQuerySchema = paginationSchema.extend({
  leadId: z.string().uuid().optional(),
  assignedTo: z.string().uuid().optional(),
  status: z.enum(['pending', 'completed', 'cancelled']).optional(),
  type: z.enum(['call', 'email', 'whatsapp', 'visit', 'other']).optional(),
});

// ============== COMMISSION SCHEMAS ==============

export const createCommissionSchema = insertCommissionSchema.extend({
  transactionValue: z.string().or(z.number()),
  commissionRate: z.string().or(z.number()),
  grossCommission: z.string().or(z.number()),
  agencySplit: z.string().or(z.number()),
  brokerCommission: z.string().or(z.number()),
});

export const updateCommissionSchema = createCommissionSchema.partial();

export const commissionQuerySchema = paginationSchema.extend({
  brokerId: z.string().uuid().optional(),
  transactionType: z.enum(['sale', 'rental']).optional(),
  status: z.enum(['pending', 'approved', 'paid']).optional(),
});

// ============== PAYMENT SCHEMAS ==============

export const createStripeSubscriptionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  paymentMethodId: z.string().optional(),
  trialDays: z.number().int().min(0).max(90).optional(),
});

export const cancelStripeSubscriptionSchema = z.object({
  subscriptionId: z.string().min(1, 'Subscription ID is required'),
  immediate: z.boolean().optional().default(false),
});

export const updatePaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

export const createPixPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ is required'),
});

export const createBoletoPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

// ============== E-SIGNATURE SCHEMAS ==============

export const uploadDocumentSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  filename: z.string().min(1, 'Filename is required'),
  contentBase64: z.string().min(1, 'Document content is required'),
  deadline: z.string().datetime().optional(),
  autoClose: z.boolean().optional().default(true),
  locale: z.string().optional().default('pt-BR'),
});

export const createSignatureRequestSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  documentKey: z.string().min(1, 'Document key is required'),
  listName: z.string().optional(),
  signers: z.array(z.object({
    name: z.string().min(1, 'Signer name is required'),
    email: z.string().email('Invalid signer email'),
    phone: z.string().optional(),
    cpf: z.string().optional(),
  })).min(1, 'At least one signer is required'),
  signingConfig: z.object({
    order: z.enum(['parallel', 'sequential']).optional(),
    refusable: z.boolean().optional(),
  }).optional(),
});

export const addSignerSchema = z.object({
  tenantId: z.string().uuid().optional(),
  documentKey: z.string().min(1, 'Document key is required'),
  listKey: z.string().min(1, 'List key is required'),
  signer: z.object({
    name: z.string().min(1, 'Signer name is required'),
    email: z.string().email('Invalid signer email'),
    phone: z.string().optional(),
    cpf: z.string().optional(),
  }),
});

export const sendSignatureSchema = z.object({
  tenantId: z.string().uuid().optional(),
  listKey: z.string().min(1, 'List key is required'),
  message: z.string().optional(),
});

export const cancelDocumentSchema = z.object({
  tenantId: z.string().uuid().optional(),
  reason: z.string().optional(),
});

export const generateContractSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  contractType: z.enum(['rental', 'sale']),
  contractData: z.any(), // Validated per contract type
  contractId: z.string().uuid().optional(),
});

// ============== FILE UPLOAD SCHEMAS ==============

export const fileQuerySchema = paginationSchema.extend({
  category: z.string().optional(),
  relatedTo: z.string().optional(),
  relatedId: z.string().uuid().optional(),
});

// ============== WHATSAPP SCHEMAS ==============

export const sendWhatsAppMessageSchema = z.object({
  phoneNumber: z.string().min(10, 'Invalid phone number'),
  message: z.string().min(1, 'Message is required'),
  templateId: z.string().uuid().optional(),
  variables: z.record(z.string()).optional(),
});

export const createWhatsAppTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  category: z.enum(['leads', 'properties', 'visits', 'contracts', 'payments']),
  bodyText: z.string().min(1, 'Body text is required'),
  headerType: z.enum(['text', 'image', 'document', 'video']).optional(),
  headerContent: z.string().optional(),
  footerText: z.string().optional(),
  buttons: z.any().optional(),
  variables: z.array(z.string()).optional(),
});
