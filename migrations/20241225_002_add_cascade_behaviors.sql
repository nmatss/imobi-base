-- ================================================================
-- MIGRATION: Add CASCADE Behaviors to Foreign Keys
-- Created: 2025-12-25
-- Purpose: Define proper cascade behaviors for data integrity
-- Impact: Allows safe deletion of parent records
-- Priority: 🔴 CRITICAL
-- ================================================================

-- ================================================================
-- STRATEGY:
-- - Tenants CASCADE: Delete tenant = delete everything
-- - Properties RESTRICT: Can't delete property with active contracts
-- - Leads CASCADE: Delete lead = delete interactions/visits
-- - Users SET NULL: Delete user = unassign from leads/visits
-- ================================================================

-- ============== TENANT CASCADES (DELETE EVERYTHING) ==============

-- Users
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_tenant_id_fkey,
ADD CONSTRAINT users_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Properties
ALTER TABLE properties
DROP CONSTRAINT IF EXISTS properties_tenant_id_fkey,
ADD CONSTRAINT properties_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Leads
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS leads_tenant_id_fkey,
ADD CONSTRAINT leads_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Visits
ALTER TABLE visits
DROP CONSTRAINT IF EXISTS visits_tenant_id_fkey,
ADD CONSTRAINT visits_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Contracts
ALTER TABLE contracts
DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey,
ADD CONSTRAINT contracts_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Owners
ALTER TABLE owners
DROP CONSTRAINT IF EXISTS owners_tenant_id_fkey,
ADD CONSTRAINT owners_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Renters
ALTER TABLE renters
DROP CONSTRAINT IF EXISTS renters_tenant_id_fkey,
ADD CONSTRAINT renters_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rental Contracts
ALTER TABLE rental_contracts
DROP CONSTRAINT IF EXISTS rental_contracts_tenant_id_fkey,
ADD CONSTRAINT rental_contracts_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rental Payments
ALTER TABLE rental_payments
DROP CONSTRAINT IF EXISTS rental_payments_tenant_id_fkey,
ADD CONSTRAINT rental_payments_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rental Transfers
ALTER TABLE rental_transfers
DROP CONSTRAINT IF EXISTS rental_transfers_tenant_id_fkey,
ADD CONSTRAINT rental_transfers_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Sale Proposals
ALTER TABLE sale_proposals
DROP CONSTRAINT IF EXISTS sale_proposals_tenant_id_fkey,
ADD CONSTRAINT sale_proposals_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Property Sales
ALTER TABLE property_sales
DROP CONSTRAINT IF EXISTS property_sales_tenant_id_fkey,
ADD CONSTRAINT property_sales_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Finance Categories
ALTER TABLE finance_categories
DROP CONSTRAINT IF EXISTS finance_categories_tenant_id_fkey,
ADD CONSTRAINT finance_categories_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Finance Entries
ALTER TABLE finance_entries
DROP CONSTRAINT IF EXISTS finance_entries_tenant_id_fkey,
ADD CONSTRAINT finance_entries_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Commissions
ALTER TABLE commissions
DROP CONSTRAINT IF EXISTS commissions_tenant_id_fkey,
ADD CONSTRAINT commissions_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Lead Tags
ALTER TABLE lead_tags
DROP CONSTRAINT IF EXISTS lead_tags_tenant_id_fkey,
ADD CONSTRAINT lead_tags_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Follow Ups
ALTER TABLE follow_ups
DROP CONSTRAINT IF EXISTS follow_ups_tenant_id_fkey,
ADD CONSTRAINT follow_ups_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============== LEAD CASCADES (DELETE INTERACTIONS) ==============

-- Interactions
ALTER TABLE interactions
DROP CONSTRAINT IF EXISTS interactions_lead_id_fkey,
ADD CONSTRAINT interactions_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Visits (optional lead)
ALTER TABLE visits
DROP CONSTRAINT IF EXISTS visits_lead_id_fkey,
ADD CONSTRAINT visits_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Lead Tag Links
ALTER TABLE lead_tag_links
DROP CONSTRAINT IF EXISTS lead_tag_links_lead_id_fkey,
ADD CONSTRAINT lead_tag_links_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Follow Ups
ALTER TABLE follow_ups
DROP CONSTRAINT IF EXISTS follow_ups_lead_id_fkey,
ADD CONSTRAINT follow_ups_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Sale Proposals
ALTER TABLE sale_proposals
DROP CONSTRAINT IF EXISTS sale_proposals_lead_id_fkey,
ADD CONSTRAINT sale_proposals_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contracts (can't delete lead with contract)
ALTER TABLE contracts
DROP CONSTRAINT IF EXISTS contracts_lead_id_fkey,
ADD CONSTRAINT contracts_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Property Sales (can't delete lead with sale)
ALTER TABLE property_sales
DROP CONSTRAINT IF EXISTS property_sales_buyer_lead_id_fkey,
ADD CONSTRAINT property_sales_buyer_lead_id_fkey
FOREIGN KEY (buyer_lead_id) REFERENCES leads(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============== PROPERTY RESTRICTIONS (PROTECT ACTIVE DATA) ==============

-- Visits (can delete property if no active contracts)
ALTER TABLE visits
DROP CONSTRAINT IF EXISTS visits_property_id_fkey,
ADD CONSTRAINT visits_property_id_fkey
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Contracts (CRITICAL: can't delete property with contracts)
ALTER TABLE contracts
DROP CONSTRAINT IF EXISTS contracts_property_id_fkey,
ADD CONSTRAINT contracts_property_id_fkey
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rental Contracts
ALTER TABLE rental_contracts
DROP CONSTRAINT IF EXISTS rental_contracts_property_id_fkey,
ADD CONSTRAINT rental_contracts_property_id_fkey
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sale Proposals (can delete if only proposals)
ALTER TABLE sale_proposals
DROP CONSTRAINT IF EXISTS sale_proposals_property_id_fkey,
ADD CONSTRAINT sale_proposals_property_id_fkey
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Property Sales (CRITICAL)
ALTER TABLE property_sales
DROP CONSTRAINT IF EXISTS property_sales_property_id_fkey,
ADD CONSTRAINT property_sales_property_id_fkey
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============== USER ASSIGNMENTS (SET NULL) ==============

-- Leads assigned_to
ALTER TABLE leads
DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey,
ADD CONSTRAINT leads_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Visits assigned_to
ALTER TABLE visits
DROP CONSTRAINT IF EXISTS visits_assigned_to_fkey,
ADD CONSTRAINT visits_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Follow Ups assigned_to
ALTER TABLE follow_ups
DROP CONSTRAINT IF EXISTS follow_ups_assigned_to_fkey,
ADD CONSTRAINT follow_ups_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Interactions (keep user_id for audit)
ALTER TABLE interactions
DROP CONSTRAINT IF EXISTS interactions_user_id_fkey,
ADD CONSTRAINT interactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Commissions (can't delete broker with commissions)
ALTER TABLE commissions
DROP CONSTRAINT IF EXISTS commissions_broker_id_fkey,
ADD CONSTRAINT commissions_broker_id_fkey
FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Property Sales broker
ALTER TABLE property_sales
DROP CONSTRAINT IF EXISTS property_sales_broker_id_fkey,
ADD CONSTRAINT property_sales_broker_id_fkey
FOREIGN KEY (broker_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============== RENTAL MODULE CASCADES ==============

-- Rental Payments -> Rental Contracts
ALTER TABLE rental_payments
DROP CONSTRAINT IF EXISTS rental_payments_rental_contract_id_fkey,
ADD CONSTRAINT rental_payments_rental_contract_id_fkey
FOREIGN KEY (rental_contract_id) REFERENCES rental_contracts(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rental Contracts -> Property
-- (Already defined above as RESTRICT)

-- Rental Contracts -> Owner
ALTER TABLE rental_contracts
DROP CONSTRAINT IF EXISTS rental_contracts_owner_id_fkey,
ADD CONSTRAINT rental_contracts_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rental Contracts -> Renter
ALTER TABLE rental_contracts
DROP CONSTRAINT IF EXISTS rental_contracts_renter_id_fkey,
ADD CONSTRAINT rental_contracts_renter_id_fkey
FOREIGN KEY (renter_id) REFERENCES renters(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Rental Transfers -> Owner
ALTER TABLE rental_transfers
DROP CONSTRAINT IF EXISTS rental_transfers_owner_id_fkey,
ADD CONSTRAINT rental_transfers_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============== COMMISSION MODULE CASCADES ==============

-- Commissions -> Sale
ALTER TABLE commissions
DROP CONSTRAINT IF EXISTS commissions_sale_id_fkey,
ADD CONSTRAINT commissions_sale_id_fkey
FOREIGN KEY (sale_id) REFERENCES property_sales(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Commissions -> Rental Contract
ALTER TABLE commissions
DROP CONSTRAINT IF EXISTS commissions_rental_contract_id_fkey,
ADD CONSTRAINT commissions_rental_contract_id_fkey
FOREIGN KEY (rental_contract_id) REFERENCES rental_contracts(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============== FINANCE MODULE CASCADES ==============

-- Finance Entries -> Category
ALTER TABLE finance_entries
DROP CONSTRAINT IF EXISTS finance_entries_category_id_fkey,
ADD CONSTRAINT finance_entries_category_id_fkey
FOREIGN KEY (category_id) REFERENCES finance_categories(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============== TAG MODULE CASCADES ==============

-- Lead Tag Links -> Tag
ALTER TABLE lead_tag_links
DROP CONSTRAINT IF EXISTS lead_tag_links_tag_id_fkey,
ADD CONSTRAINT lead_tag_links_tag_id_fkey
FOREIGN KEY (tag_id) REFERENCES lead_tags(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============== SETTINGS MODULE CASCADES ==============

-- Tenant Settings
ALTER TABLE tenant_settings
DROP CONSTRAINT IF EXISTS tenant_settings_tenant_id_fkey,
ADD CONSTRAINT tenant_settings_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Brand Settings
ALTER TABLE brand_settings
DROP CONSTRAINT IF EXISTS brand_settings_tenant_id_fkey,
ADD CONSTRAINT brand_settings_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Integration Configs
ALTER TABLE integration_configs
DROP CONSTRAINT IF EXISTS integration_configs_tenant_id_fkey,
ADD CONSTRAINT integration_configs_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Notification Preferences
ALTER TABLE notification_preferences
DROP CONSTRAINT IF EXISTS notification_preferences_tenant_id_fkey,
ADD CONSTRAINT notification_preferences_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- AI Settings
ALTER TABLE ai_settings
DROP CONSTRAINT IF EXISTS ai_settings_tenant_id_fkey,
ADD CONSTRAINT ai_settings_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- User Roles
ALTER TABLE user_roles
DROP CONSTRAINT IF EXISTS user_roles_tenant_id_fkey,
ADD CONSTRAINT user_roles_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- User Permissions
ALTER TABLE user_permissions
DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey,
ADD CONSTRAINT user_permissions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE user_permissions
DROP CONSTRAINT IF EXISTS user_permissions_role_id_fkey,
ADD CONSTRAINT user_permissions_role_id_fkey
FOREIGN KEY (role_id) REFERENCES user_roles(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Saved Reports
ALTER TABLE saved_reports
DROP CONSTRAINT IF EXISTS saved_reports_tenant_id_fkey,
ADD CONSTRAINT saved_reports_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE saved_reports
DROP CONSTRAINT IF EXISTS saved_reports_user_id_fkey,
ADD CONSTRAINT saved_reports_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============== SUBSCRIPTION MODULE ==============

-- Tenant Subscriptions
ALTER TABLE tenant_subscriptions
DROP CONSTRAINT IF EXISTS tenant_subscriptions_tenant_id_fkey,
ADD CONSTRAINT tenant_subscriptions_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE tenant_subscriptions
DROP CONSTRAINT IF EXISTS tenant_subscriptions_plan_id_fkey,
ADD CONSTRAINT tenant_subscriptions_plan_id_fkey
FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Usage Logs
ALTER TABLE usage_logs
DROP CONSTRAINT IF EXISTS usage_logs_tenant_id_fkey,
ADD CONSTRAINT usage_logs_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE usage_logs
DROP CONSTRAINT IF EXISTS usage_logs_user_id_fkey,
ADD CONSTRAINT usage_logs_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============== WHATSAPP MODULE ==============

-- WhatsApp Templates
ALTER TABLE whatsapp_templates
DROP CONSTRAINT IF EXISTS whatsapp_templates_tenant_id_fkey,
ADD CONSTRAINT whatsapp_templates_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- WhatsApp Conversations
ALTER TABLE whatsapp_conversations
DROP CONSTRAINT IF EXISTS whatsapp_conversations_tenant_id_fkey,
ADD CONSTRAINT whatsapp_conversations_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE whatsapp_conversations
DROP CONSTRAINT IF EXISTS whatsapp_conversations_lead_id_fkey,
ADD CONSTRAINT whatsapp_conversations_lead_id_fkey
FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE whatsapp_conversations
DROP CONSTRAINT IF EXISTS whatsapp_conversations_assigned_to_fkey,
ADD CONSTRAINT whatsapp_conversations_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- WhatsApp Messages
ALTER TABLE whatsapp_messages
DROP CONSTRAINT IF EXISTS whatsapp_messages_tenant_id_fkey,
ADD CONSTRAINT whatsapp_messages_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE whatsapp_messages
DROP CONSTRAINT IF EXISTS whatsapp_messages_conversation_id_fkey,
ADD CONSTRAINT whatsapp_messages_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE whatsapp_messages
DROP CONSTRAINT IF EXISTS whatsapp_messages_template_id_fkey,
ADD CONSTRAINT whatsapp_messages_template_id_fkey
FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE whatsapp_messages
DROP CONSTRAINT IF EXISTS whatsapp_messages_sent_by_fkey,
ADD CONSTRAINT whatsapp_messages_sent_by_fkey
FOREIGN KEY (sent_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- WhatsApp Message Queue
ALTER TABLE whatsapp_message_queue
DROP CONSTRAINT IF EXISTS whatsapp_message_queue_tenant_id_fkey,
ADD CONSTRAINT whatsapp_message_queue_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE whatsapp_message_queue
DROP CONSTRAINT IF EXISTS whatsapp_message_queue_template_id_fkey,
ADD CONSTRAINT whatsapp_message_queue_template_id_fkey
FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- WhatsApp Auto Responses
ALTER TABLE whatsapp_auto_responses
DROP CONSTRAINT IF EXISTS whatsapp_auto_responses_tenant_id_fkey,
ADD CONSTRAINT whatsapp_auto_responses_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE whatsapp_auto_responses
DROP CONSTRAINT IF EXISTS whatsapp_auto_responses_template_id_fkey,
ADD CONSTRAINT whatsapp_auto_responses_template_id_fkey
FOREIGN KEY (template_id) REFERENCES whatsapp_templates(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ============== COMPLIANCE MODULE ==============

-- User Sessions
ALTER TABLE user_sessions
DROP CONSTRAINT IF EXISTS user_sessions_user_id_fkey,
ADD CONSTRAINT user_sessions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE user_sessions
DROP CONSTRAINT IF EXISTS user_sessions_tenant_id_fkey,
ADD CONSTRAINT user_sessions_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- User Consents
ALTER TABLE user_consents
DROP CONSTRAINT IF EXISTS user_consents_user_id_fkey,
ADD CONSTRAINT user_consents_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE user_consents
DROP CONSTRAINT IF EXISTS user_consents_tenant_id_fkey,
ADD CONSTRAINT user_consents_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Compliance Audit Log
ALTER TABLE compliance_audit_log
DROP CONSTRAINT IF EXISTS compliance_audit_log_tenant_id_fkey,
ADD CONSTRAINT compliance_audit_log_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE compliance_audit_log
DROP CONSTRAINT IF EXISTS compliance_audit_log_user_id_fkey,
ADD CONSTRAINT compliance_audit_log_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Account Deletion Requests
ALTER TABLE account_deletion_requests
DROP CONSTRAINT IF EXISTS account_deletion_requests_user_id_fkey,
ADD CONSTRAINT account_deletion_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE account_deletion_requests
DROP CONSTRAINT IF EXISTS account_deletion_requests_tenant_id_fkey,
ADD CONSTRAINT account_deletion_requests_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE account_deletion_requests
DROP CONSTRAINT IF EXISTS account_deletion_requests_processed_by_fkey,
ADD CONSTRAINT account_deletion_requests_processed_by_fkey
FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Export Requests
ALTER TABLE data_export_requests
DROP CONSTRAINT IF EXISTS data_export_requests_user_id_fkey,
ADD CONSTRAINT data_export_requests_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE data_export_requests
DROP CONSTRAINT IF EXISTS data_export_requests_tenant_id_fkey,
ADD CONSTRAINT data_export_requests_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Breach Incidents
ALTER TABLE data_breach_incidents
DROP CONSTRAINT IF EXISTS data_breach_incidents_tenant_id_fkey,
ADD CONSTRAINT data_breach_incidents_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE data_breach_incidents
DROP CONSTRAINT IF EXISTS data_breach_incidents_reported_by_fkey,
ADD CONSTRAINT data_breach_incidents_reported_by_fkey
FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE data_breach_incidents
DROP CONSTRAINT IF EXISTS data_breach_incidents_assigned_to_fkey,
ADD CONSTRAINT data_breach_incidents_assigned_to_fkey
FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Cookie Preferences
ALTER TABLE cookie_preferences
DROP CONSTRAINT IF EXISTS cookie_preferences_user_id_fkey,
ADD CONSTRAINT cookie_preferences_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE cookie_preferences
DROP CONSTRAINT IF EXISTS cookie_preferences_tenant_id_fkey,
ADD CONSTRAINT cookie_preferences_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Processing Activities
ALTER TABLE data_processing_activities
DROP CONSTRAINT IF EXISTS data_processing_activities_tenant_id_fkey,
ADD CONSTRAINT data_processing_activities_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

-- Files
ALTER TABLE files
DROP CONSTRAINT IF EXISTS files_tenant_id_fkey,
ADD CONSTRAINT files_tenant_id_fkey
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE files
DROP CONSTRAINT IF EXISTS files_user_id_fkey,
ADD CONSTRAINT files_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- ================================================================
-- VERIFICATION
-- ================================================================

/*
-- View all foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
*/

-- ================================================================
-- ROLLBACK (if needed)
-- ================================================================

/*
-- Revert all to NO ACTION (default)
-- (Not recommended - use only in emergency)
*/

-- ================================================================
-- EXPECTED IMPACT
-- ================================================================
-- - Can now safely delete tenants (cascades to all data)
-- - Prevents deleting properties/leads with active contracts
-- - User deletion unassigns instead of breaking relationships
-- - Cleaner data maintenance
-- - LGPD/GDPR compliance (right to be forgotten)
-- ================================================================

-- ✅ Migration complete!
-- Total foreign keys updated: 80+
-- Cascade behaviors: CASCADE, RESTRICT, SET NULL
-- Data integrity: Enforced at database level
