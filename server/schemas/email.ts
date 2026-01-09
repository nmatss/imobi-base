/**
 * Email Validation Schemas
 * Zod schemas for email service endpoints
 */

import { z } from 'zod';

/**
 * Tenant branding schema for email customization
 */
export const tenantBrandingSchema = z.object({
  logo: z.string().url('Invalid logo URL').optional(),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format (must be hex #RRGGBB)').optional(),
  companyName: z.string().max(100, 'Company name too long').optional(),
});

/**
 * Email attachment schema
 */
export const emailAttachmentSchema = z.object({
  filename: z.string().max(255, 'Filename too long'),
  content: z.string().min(1, 'Content is required'),
  encoding: z.string().optional(),
});

/**
 * Send single email schema
 */
export const sendEmailSchema = z.object({
  to: z.union([
    z.string().email('Invalid email address'),
    z.array(z.string().email('Invalid email address')).max(100, 'Maximum 100 recipients'),
  ]),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html: z.string().optional(),
  text: z.string().optional(),
  templateName: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  tenantBranding: tenantBrandingSchema.optional(),
  attachments: z.array(emailAttachmentSchema).max(10, 'Maximum 10 attachments').optional(),
  replyTo: z.string().email('Invalid reply-to email').optional(),
  priority: z.enum(['high', 'normal', 'low'], {
    errorMap: () => ({ message: 'Priority must be: high, normal, or low' }),
  }).optional(),
  queue: z.boolean().optional(),
}).refine((data) => data.html || data.text || data.templateName, {
  message: "Either html, text, or templateName is required",
});

/**
 * Bulk email recipient schema
 */
export const bulkEmailRecipientSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  html: z.string().optional(),
  text: z.string().optional(),
  templateName: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  attachments: z.array(emailAttachmentSchema).max(10, 'Maximum 10 attachments').optional(),
  replyTo: z.string().email('Invalid reply-to email').optional(),
  priority: z.enum(['high', 'normal', 'low']).optional(),
}).refine((data) => data.html || data.text || data.templateName, {
  message: "Either html, text, or templateName is required",
});

/**
 * Send bulk emails schema
 */
export const sendBulkEmailSchema = z.object({
  emails: z.array(bulkEmailRecipientSchema)
    .min(1, 'At least one email is required')
    .max(1000, 'Maximum 1000 emails per batch'),
});

/**
 * Test email schema
 */
export const testEmailSchema = z.object({
  to: z.string().email('Invalid email address').optional(),
});

/**
 * Preview template schema
 */
export const previewTemplateSchema = z.object({
  data: z.record(z.any()).optional(),
  branding: tenantBrandingSchema.optional(),
});

/**
 * Template name parameter schema
 */
export const templateNameParamSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
});

// Export types
export type SendEmailInput = z.infer<typeof sendEmailSchema>;
export type SendBulkEmailInput = z.infer<typeof sendBulkEmailSchema>;
export type TestEmailInput = z.infer<typeof testEmailSchema>;
export type PreviewTemplateInput = z.infer<typeof previewTemplateSchema>;
export type TenantBranding = z.infer<typeof tenantBrandingSchema>;
