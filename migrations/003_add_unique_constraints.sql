-- ============================================
-- ADD UNIQUE CONSTRAINTS TO DATABASE SCHEMA
-- Migration: 003_add_unique_constraints.sql
-- Purpose: Prevent duplicate data and ensure data integrity
-- ============================================

-- =============== TENANTS TABLE ===============
-- Slug must be unique (already defined in schema)
-- Ensure no duplicates in email if provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_email_unique
  ON tenants(email)
  WHERE email IS NOT NULL;

-- =============== USERS TABLE ===============
-- Email is already unique globally
-- Add unique constraint for email within tenant (compound unique)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_tenant_email_unique
  ON users(tenant_id, email);

-- =============== WHATSAPP TEMPLATES TABLE ===============
-- Template name must be unique within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_templates_tenant_name_unique
  ON whatsapp_templates(tenant_id, name);

-- WABA Template ID must be globally unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_templates_waba_id_unique
  ON whatsapp_templates(waba_template_id)
  WHERE waba_template_id IS NOT NULL;

-- =============== WHATSAPP CONVERSATIONS TABLE ===============
-- Phone number should be unique within tenant (one conversation per contact)
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_tenant_phone_unique
  ON whatsapp_conversations(tenant_id, phone_number)
  WHERE status != 'closed';

-- =============== WHATSAPP MESSAGES TABLE ===============
-- WABA Message ID must be globally unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_messages_waba_id_unique
  ON whatsapp_messages(waba_message_id)
  WHERE waba_message_id IS NOT NULL;

-- =============== USER_SESSIONS TABLE ===============
-- Session token must be globally unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token_unique
  ON user_sessions(session_token);

-- =============== LEAD_TAGS TABLE ===============
-- Tag name must be unique within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_tags_tenant_name_unique
  ON lead_tags(tenant_id, name);

-- =============== LEAD_TAG_LINKS TABLE ===============
-- A lead can have a tag only once (prevent duplicate tag assignments)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_tag_links_lead_tag_unique
  ON lead_tag_links(lead_id, tag_id);

-- =============== FINANCE_CATEGORIES TABLE ===============
-- Category name must be unique within tenant and type
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_categories_tenant_name_type_unique
  ON finance_categories(tenant_id, name, type);

-- =============== USER_ROLES TABLE ===============
-- Role name must be unique within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_tenant_name_unique
  ON user_roles(tenant_id, name);

-- =============== USER_PERMISSIONS TABLE ===============
-- A user can have only one role (or custom permissions)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_user_unique
  ON user_permissions(user_id);

-- =============== INTEGRATION_CONFIGS TABLE ===============
-- Integration name must be unique within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_configs_tenant_integration_unique
  ON integration_configs(tenant_id, integration_name);

-- =============== SAVED_REPORTS TABLE ===============
-- Report name must be unique within tenant and user
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_reports_tenant_user_name_unique
  ON saved_reports(tenant_id, user_id, name);

-- =============== TENANT_SETTINGS TABLE ===============
-- tenant_id is already unique (defined in schema)

-- =============== BRAND_SETTINGS TABLE ===============
-- tenant_id is already unique (defined in schema)

-- Custom domain must be globally unique if provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_settings_custom_domain_unique
  ON brand_settings(custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Subdomain must be globally unique if provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_brand_settings_subdomain_unique
  ON brand_settings(subdomain)
  WHERE subdomain IS NOT NULL;

-- =============== AI_SETTINGS TABLE ===============
-- tenant_id is already unique (defined in schema)

-- =============== TENANT_SUBSCRIPTIONS TABLE ===============
-- tenant_id is already unique (defined in schema)

-- =============== NOTIFICATION_PREFERENCES TABLE ===============
-- Event type must be unique within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_tenant_event_unique
  ON notification_preferences(tenant_id, event_type);

-- =============== OWNERS TABLE ===============
-- CPF/CNPJ should be unique within tenant if provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_tenant_cpf_cnpj_unique
  ON owners(tenant_id, cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;

-- =============== RENTERS TABLE ===============
-- CPF/CNPJ should be unique within tenant if provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_renters_tenant_cpf_cnpj_unique
  ON renters(tenant_id, cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;

-- =============== RENTAL_PAYMENTS TABLE ===============
-- Reference month should be unique per rental contract
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_payments_contract_month_unique
  ON rental_payments(rental_contract_id, reference_month);

-- =============== RENTAL_TRANSFERS TABLE ===============
-- Reference month should be unique per owner
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_transfers_owner_month_unique
  ON rental_transfers(owner_id, reference_month);

-- =============== COOKIE_PREFERENCES TABLE ===============
-- Session ID should be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_cookie_preferences_session_unique
  ON cookie_preferences(session_id)
  WHERE session_id IS NOT NULL;

-- User ID should be unique (one preference per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cookie_preferences_user_unique
  ON cookie_preferences(user_id)
  WHERE user_id IS NOT NULL;

-- =============== DATA_PROCESSING_ACTIVITIES TABLE ===============
-- Activity name should be unique within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_processing_activities_tenant_name_unique
  ON data_processing_activities(tenant_id, name);

-- =============== FILES TABLE ===============
-- File path should be unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_path_unique
  ON files(path);

-- =============== WHATSAPP_AUTO_RESPONSES TABLE ===============
-- Auto response name should be unique within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_auto_responses_tenant_name_unique
  ON whatsapp_auto_responses(tenant_id, name);

-- COMMENT for documentation
COMMENT ON INDEX idx_users_tenant_email_unique IS 'Ensures email is unique within each tenant';
COMMENT ON INDEX idx_rental_payments_contract_month_unique IS 'Prevents duplicate payment records for the same month';
COMMENT ON INDEX idx_lead_tag_links_lead_tag_unique IS 'Prevents duplicate tag assignments to the same lead';
