-- ============================================
-- ADD CHECK CONSTRAINTS TO DATABASE SCHEMA
-- Migration: 001_add_check_constraints.sql
-- Purpose: Add data validation at database level
-- ============================================

-- PROPERTIES table
ALTER TABLE properties
  ADD CONSTRAINT check_price_positive CHECK (CAST(price AS NUMERIC) > 0),
  ADD CONSTRAINT check_bedrooms_non_negative CHECK (bedrooms IS NULL OR bedrooms >= 0),
  ADD CONSTRAINT check_bathrooms_non_negative CHECK (bathrooms IS NULL OR bathrooms >= 0),
  ADD CONSTRAINT check_area_positive CHECK (area IS NULL OR area > 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('available', 'sold', 'rented', 'unavailable', 'pending'));

-- LEADS table
ALTER TABLE leads
  ADD CONSTRAINT check_budget_positive CHECK (budget IS NULL OR CAST(budget AS NUMERIC) > 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('new', 'contacted', 'qualified', 'negotiation', 'won', 'lost')),
  ADD CONSTRAINT check_bedrooms_range CHECK (
    (min_bedrooms IS NULL OR min_bedrooms >= 0) AND
    (max_bedrooms IS NULL OR max_bedrooms >= 0) AND
    (min_bedrooms IS NULL OR max_bedrooms IS NULL OR min_bedrooms <= max_bedrooms)
  );

-- CONTRACTS table
ALTER TABLE contracts
  ADD CONSTRAINT check_value_positive CHECK (CAST(value AS NUMERIC) > 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('draft', 'pending', 'active', 'completed', 'cancelled'));

-- RENTAL_CONTRACTS table
ALTER TABLE rental_contracts
  ADD CONSTRAINT check_rent_value_positive CHECK (CAST(rent_value AS NUMERIC) > 0),
  ADD CONSTRAINT check_condo_fee_non_negative CHECK (condo_fee IS NULL OR CAST(condo_fee AS NUMERIC) >= 0),
  ADD CONSTRAINT check_iptu_non_negative CHECK (iptu_value IS NULL OR CAST(iptu_value AS NUMERIC) >= 0),
  ADD CONSTRAINT check_due_day_range CHECK (due_day >= 1 AND due_day <= 31),
  ADD CONSTRAINT check_dates_logical CHECK (end_date > start_date),
  ADD CONSTRAINT check_deposit_non_negative CHECK (deposit_value IS NULL OR CAST(deposit_value AS NUMERIC) >= 0),
  ADD CONSTRAINT check_admin_fee_percentage CHECK (administration_fee IS NULL OR (CAST(administration_fee AS NUMERIC) >= 0 AND CAST(administration_fee AS NUMERIC) <= 100)),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('draft', 'active', 'expired', 'terminated', 'pending_renewal'));

-- RENTAL_PAYMENTS table
ALTER TABLE rental_payments
  ADD CONSTRAINT check_rent_value_positive CHECK (CAST(rent_value AS NUMERIC) > 0),
  ADD CONSTRAINT check_total_value_positive CHECK (CAST(total_value AS NUMERIC) > 0),
  ADD CONSTRAINT check_paid_value_non_negative CHECK (paid_value IS NULL OR CAST(paid_value AS NUMERIC) >= 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'partial')),
  ADD CONSTRAINT check_discounts_non_negative CHECK (discounts IS NULL OR CAST(discounts AS NUMERIC) >= 0),
  ADD CONSTRAINT check_extra_charges_non_negative CHECK (extra_charges IS NULL OR CAST(extra_charges AS NUMERIC) >= 0);

-- RENTAL_TRANSFERS table
ALTER TABLE rental_transfers
  ADD CONSTRAINT check_gross_amount_positive CHECK (CAST(gross_amount AS NUMERIC) > 0),
  ADD CONSTRAINT check_net_amount_positive CHECK (CAST(net_amount AS NUMERIC) > 0),
  ADD CONSTRAINT check_deductions_non_negative CHECK (
    (administration_fee IS NULL OR CAST(administration_fee AS NUMERIC) >= 0) AND
    (maintenance_deductions IS NULL OR CAST(maintenance_deductions AS NUMERIC) >= 0) AND
    (other_deductions IS NULL OR CAST(other_deductions AS NUMERIC) >= 0)
  ),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'paid', 'cancelled'));

-- SALE_PROPOSALS table
ALTER TABLE sale_proposals
  ADD CONSTRAINT check_proposed_value_positive CHECK (CAST(proposed_value AS NUMERIC) > 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired'));

-- PROPERTY_SALES table
ALTER TABLE property_sales
  ADD CONSTRAINT check_sale_value_positive CHECK (CAST(sale_value AS NUMERIC) > 0),
  ADD CONSTRAINT check_commission_rate_percentage CHECK (commission_rate IS NULL OR (CAST(commission_rate AS NUMERIC) >= 0 AND CAST(commission_rate AS NUMERIC) <= 100)),
  ADD CONSTRAINT check_commission_value_non_negative CHECK (commission_value IS NULL OR CAST(commission_value AS NUMERIC) >= 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('completed', 'pending', 'cancelled'));

-- COMMISSIONS table
ALTER TABLE commissions
  ADD CONSTRAINT check_transaction_value_positive CHECK (CAST(transaction_value AS NUMERIC) > 0),
  ADD CONSTRAINT check_commission_rate_percentage CHECK (CAST(commission_rate AS NUMERIC) >= 0 AND CAST(commission_rate AS NUMERIC) <= 100),
  ADD CONSTRAINT check_gross_commission_positive CHECK (CAST(gross_commission AS NUMERIC) > 0),
  ADD CONSTRAINT check_agency_split_percentage CHECK (CAST(agency_split AS NUMERIC) >= 0 AND CAST(agency_split AS NUMERIC) <= 100),
  ADD CONSTRAINT check_broker_commission_positive CHECK (CAST(broker_commission AS NUMERIC) > 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  ADD CONSTRAINT check_transaction_type_valid CHECK (transaction_type IN ('sale', 'rental'));

-- FINANCE_ENTRIES table
ALTER TABLE finance_entries
  ADD CONSTRAINT check_amount_positive CHECK (CAST(amount AS NUMERIC) > 0),
  ADD CONSTRAINT check_flow_valid CHECK (flow IN ('income', 'expense')),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'completed', 'cancelled'));

-- FINANCE_CATEGORIES table
ALTER TABLE finance_categories
  ADD CONSTRAINT check_type_valid CHECK (type IN ('income', 'expense'));

-- RENTERS table
ALTER TABLE renters
  ADD CONSTRAINT check_income_non_negative CHECK (income IS NULL OR CAST(income AS NUMERIC) >= 0);

-- VISITS table
ALTER TABLE visits
  ADD CONSTRAINT check_status_valid CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show'));

-- INTERACTIONS table
ALTER TABLE interactions
  ADD CONSTRAINT check_type_valid CHECK (type IN ('call', 'email', 'whatsapp', 'sms', 'meeting', 'visit', 'note'));

-- FOLLOW_UPS table
ALTER TABLE follow_ups
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'completed', 'cancelled')),
  ADD CONSTRAINT check_type_valid CHECK (type IN ('call', 'email', 'whatsapp', 'meeting', 'visit'));

-- PLANS table
ALTER TABLE plans
  ADD CONSTRAINT check_price_non_negative CHECK (CAST(price AS NUMERIC) >= 0),
  ADD CONSTRAINT check_max_users_positive CHECK (max_users > 0),
  ADD CONSTRAINT check_max_properties_positive CHECK (max_properties > 0),
  ADD CONSTRAINT check_max_integrations_non_negative CHECK (max_integrations >= 0);

-- TENANT_SUBSCRIPTIONS table
ALTER TABLE tenant_subscriptions
  ADD CONSTRAINT check_status_valid CHECK (status IN ('trial', 'active', 'suspended', 'cancelled', 'expired')),
  ADD CONSTRAINT check_period_dates_logical CHECK (
    current_period_start IS NULL OR
    current_period_end IS NULL OR
    current_period_end > current_period_start
  );

-- WHATSAPP_TEMPLATES table
ALTER TABLE whatsapp_templates
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD CONSTRAINT check_usage_count_non_negative CHECK (usage_count >= 0),
  ADD CONSTRAINT check_category_valid CHECK (category IN ('leads', 'properties', 'visits', 'contracts', 'payments', 'general'));

-- WHATSAPP_CONVERSATIONS table
ALTER TABLE whatsapp_conversations
  ADD CONSTRAINT check_status_valid CHECK (status IN ('active', 'waiting', 'closed')),
  ADD CONSTRAINT check_unread_count_non_negative CHECK (unread_count >= 0);

-- WHATSAPP_MESSAGES table
ALTER TABLE whatsapp_messages
  ADD CONSTRAINT check_direction_valid CHECK (direction IN ('inbound', 'outbound')),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed'));

-- WHATSAPP_MESSAGE_QUEUE table
ALTER TABLE whatsapp_message_queue
  ADD CONSTRAINT check_priority_range CHECK (priority >= 1 AND priority <= 10),
  ADD CONSTRAINT check_retry_count_non_negative CHECK (retry_count >= 0),
  ADD CONSTRAINT check_max_retries_positive CHECK (max_retries > 0),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled'));

-- WHATSAPP_AUTO_RESPONSES table
ALTER TABLE whatsapp_auto_responses
  ADD CONSTRAINT check_priority_range CHECK (priority >= 1 AND priority <= 10),
  ADD CONSTRAINT check_trigger_type_valid CHECK (trigger_type IN ('keyword', 'business_hours', 'first_contact', 'all_messages'));

-- USER_CONSENTS table
ALTER TABLE user_consents
  ADD CONSTRAINT check_consent_type_valid CHECK (consent_type IN ('marketing', 'analytics', 'necessary', 'preferences')),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('given', 'withdrawn', 'expired'));

-- ACCOUNT_DELETION_REQUESTS table
ALTER TABLE account_deletion_requests
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected'));

-- DATA_EXPORT_REQUESTS table
ALTER TABLE data_export_requests
  ADD CONSTRAINT check_status_valid CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  ADD CONSTRAINT check_format_valid CHECK (format IN ('json', 'csv', 'pdf')),
  ADD CONSTRAINT check_file_size_non_negative CHECK (file_size IS NULL OR file_size >= 0);

-- DATA_BREACH_INCIDENTS table
ALTER TABLE data_breach_incidents
  ADD CONSTRAINT check_severity_valid CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ADD CONSTRAINT check_status_valid CHECK (status IN ('detected', 'investigating', 'contained', 'resolved')),
  ADD CONSTRAINT check_affected_records_non_negative CHECK (affected_records IS NULL OR affected_records >= 0);

-- INTEGRATION_CONFIGS table
ALTER TABLE integration_configs
  ADD CONSTRAINT check_status_valid CHECK (status IN ('connected', 'disconnected', 'error', 'pending'));

-- FILES table
ALTER TABLE files
  ADD CONSTRAINT check_size_positive CHECK (size > 0);

-- USER_SESSIONS table
ALTER TABLE user_sessions
  ADD CONSTRAINT check_session_dates_logical CHECK (expires_at > created_at);

-- COMPLIANCE_AUDIT_LOG table
ALTER TABLE compliance_audit_log
  ADD CONSTRAINT check_action_valid CHECK (action IN ('view', 'create', 'update', 'delete', 'export', 'anonymize', 'login', 'logout'));

-- DATA_PROCESSING_ACTIVITIES table
ALTER TABLE data_processing_activities
  ADD CONSTRAINT check_legal_basis_valid CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interest', 'public_task', 'legitimate_interest'));

-- COMMENT for documentation
COMMENT ON CONSTRAINT check_price_positive ON properties IS 'Ensures property price is always positive';
COMMENT ON CONSTRAINT check_due_day_range ON rental_contracts IS 'Due day must be between 1 and 31';
COMMENT ON CONSTRAINT check_commission_rate_percentage ON commissions IS 'Commission rate must be between 0% and 100%';
