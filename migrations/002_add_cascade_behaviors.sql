-- ============================================
-- ADD CASCADE BEHAVIORS TO FOREIGN KEYS
-- Migration: 002_add_cascade_behaviors.sql
-- Purpose: Configure ON DELETE and ON UPDATE behaviors for referential integrity
-- ============================================

-- =============== USERS TABLE ===============
-- When a tenant is deleted, cascade delete all users
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_tenant_id_tenants_id_fk,
  ADD CONSTRAINT users_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== PROPERTIES TABLE ===============
-- When a tenant is deleted, cascade delete all properties
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_tenant_id_tenants_id_fk,
  ADD CONSTRAINT properties_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== LEADS TABLE ===============
-- When a tenant is deleted, cascade delete all leads
-- When assigned user is deleted, set NULL
ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_tenant_id_tenants_id_fk,
  ADD CONSTRAINT leads_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE leads
  DROP CONSTRAINT IF EXISTS leads_assigned_to_users_id_fk,
  ADD CONSTRAINT leads_assigned_to_fk
    FOREIGN KEY (assigned_to)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =============== INTERACTIONS TABLE ===============
-- When a lead is deleted, cascade delete all interactions
-- When a user is deleted, prevent deletion (RESTRICT)
ALTER TABLE interactions
  DROP CONSTRAINT IF EXISTS interactions_lead_id_leads_id_fk,
  ADD CONSTRAINT interactions_lead_id_fk
    FOREIGN KEY (lead_id)
    REFERENCES leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE interactions
  DROP CONSTRAINT IF EXISTS interactions_user_id_users_id_fk,
  ADD CONSTRAINT interactions_user_id_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- =============== VISITS TABLE ===============
-- When property is deleted, cascade delete visits
-- When lead is deleted, set NULL (visits can exist without lead)
-- When assigned user is deleted, set NULL
ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_tenant_id_tenants_id_fk,
  ADD CONSTRAINT visits_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_property_id_properties_id_fk,
  ADD CONSTRAINT visits_property_id_fk
    FOREIGN KEY (property_id)
    REFERENCES properties(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_lead_id_leads_id_fk,
  ADD CONSTRAINT visits_lead_id_fk
    FOREIGN KEY (lead_id)
    REFERENCES leads(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE visits
  DROP CONSTRAINT IF EXISTS visits_assigned_to_users_id_fk,
  ADD CONSTRAINT visits_assigned_to_fk
    FOREIGN KEY (assigned_to)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =============== CONTRACTS TABLE ===============
ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_tenant_id_tenants_id_fk,
  ADD CONSTRAINT contracts_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_property_id_properties_id_fk,
  ADD CONSTRAINT contracts_property_id_fk
    FOREIGN KEY (property_id)
    REFERENCES properties(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_lead_id_leads_id_fk,
  ADD CONSTRAINT contracts_lead_id_fk
    FOREIGN KEY (lead_id)
    REFERENCES leads(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- =============== OWNERS TABLE ===============
ALTER TABLE owners
  DROP CONSTRAINT IF EXISTS owners_tenant_id_tenants_id_fk,
  ADD CONSTRAINT owners_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== RENTERS TABLE ===============
ALTER TABLE renters
  DROP CONSTRAINT IF EXISTS renters_tenant_id_tenants_id_fk,
  ADD CONSTRAINT renters_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== RENTAL_CONTRACTS TABLE ===============
-- Prevent deletion of property/owner/renter if they have active contracts
ALTER TABLE rental_contracts
  DROP CONSTRAINT IF EXISTS rental_contracts_tenant_id_tenants_id_fk,
  ADD CONSTRAINT rental_contracts_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE rental_contracts
  DROP CONSTRAINT IF EXISTS rental_contracts_property_id_properties_id_fk,
  ADD CONSTRAINT rental_contracts_property_id_fk
    FOREIGN KEY (property_id)
    REFERENCES properties(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE rental_contracts
  DROP CONSTRAINT IF EXISTS rental_contracts_owner_id_owners_id_fk,
  ADD CONSTRAINT rental_contracts_owner_id_fk
    FOREIGN KEY (owner_id)
    REFERENCES owners(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE rental_contracts
  DROP CONSTRAINT IF EXISTS rental_contracts_renter_id_renters_id_fk,
  ADD CONSTRAINT rental_contracts_renter_id_fk
    FOREIGN KEY (renter_id)
    REFERENCES renters(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- =============== RENTAL_PAYMENTS TABLE ===============
-- When rental contract is deleted, cascade delete all payments
ALTER TABLE rental_payments
  DROP CONSTRAINT IF EXISTS rental_payments_tenant_id_tenants_id_fk,
  ADD CONSTRAINT rental_payments_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE rental_payments
  DROP CONSTRAINT IF EXISTS rental_payments_rental_contract_id_rental_contracts_id_fk,
  ADD CONSTRAINT rental_payments_rental_contract_id_fk
    FOREIGN KEY (rental_contract_id)
    REFERENCES rental_contracts(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== RENTAL_TRANSFERS TABLE ===============
ALTER TABLE rental_transfers
  DROP CONSTRAINT IF EXISTS rental_transfers_tenant_id_tenants_id_fk,
  ADD CONSTRAINT rental_transfers_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE rental_transfers
  DROP CONSTRAINT IF EXISTS rental_transfers_owner_id_owners_id_fk,
  ADD CONSTRAINT rental_transfers_owner_id_fk
    FOREIGN KEY (owner_id)
    REFERENCES owners(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- =============== SALE_PROPOSALS TABLE ===============
ALTER TABLE sale_proposals
  DROP CONSTRAINT IF EXISTS sale_proposals_tenant_id_tenants_id_fk,
  ADD CONSTRAINT sale_proposals_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE sale_proposals
  DROP CONSTRAINT IF EXISTS sale_proposals_property_id_properties_id_fk,
  ADD CONSTRAINT sale_proposals_property_id_fk
    FOREIGN KEY (property_id)
    REFERENCES properties(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE sale_proposals
  DROP CONSTRAINT IF EXISTS sale_proposals_lead_id_leads_id_fk,
  ADD CONSTRAINT sale_proposals_lead_id_fk
    FOREIGN KEY (lead_id)
    REFERENCES leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== PROPERTY_SALES TABLE ===============
ALTER TABLE property_sales
  DROP CONSTRAINT IF EXISTS property_sales_tenant_id_tenants_id_fk,
  ADD CONSTRAINT property_sales_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE property_sales
  DROP CONSTRAINT IF EXISTS property_sales_property_id_properties_id_fk,
  ADD CONSTRAINT property_sales_property_id_fk
    FOREIGN KEY (property_id)
    REFERENCES properties(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE property_sales
  DROP CONSTRAINT IF EXISTS property_sales_buyer_lead_id_leads_id_fk,
  ADD CONSTRAINT property_sales_buyer_lead_id_fk
    FOREIGN KEY (buyer_lead_id)
    REFERENCES leads(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE property_sales
  DROP CONSTRAINT IF EXISTS property_sales_seller_id_owners_id_fk,
  ADD CONSTRAINT property_sales_seller_id_fk
    FOREIGN KEY (seller_id)
    REFERENCES owners(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE property_sales
  DROP CONSTRAINT IF EXISTS property_sales_broker_id_users_id_fk,
  ADD CONSTRAINT property_sales_broker_id_fk
    FOREIGN KEY (broker_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =============== COMMISSIONS TABLE ===============
ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_tenant_id_tenants_id_fk,
  ADD CONSTRAINT commissions_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_sale_id_property_sales_id_fk,
  ADD CONSTRAINT commissions_sale_id_fk
    FOREIGN KEY (sale_id)
    REFERENCES property_sales(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_rental_contract_id_rental_contracts_id_fk,
  ADD CONSTRAINT commissions_rental_contract_id_fk
    FOREIGN KEY (rental_contract_id)
    REFERENCES rental_contracts(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE commissions
  DROP CONSTRAINT IF EXISTS commissions_broker_id_users_id_fk,
  ADD CONSTRAINT commissions_broker_id_fk
    FOREIGN KEY (broker_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- =============== FINANCE_CATEGORIES TABLE ===============
ALTER TABLE finance_categories
  DROP CONSTRAINT IF EXISTS finance_categories_tenant_id_tenants_id_fk,
  ADD CONSTRAINT finance_categories_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== FINANCE_ENTRIES TABLE ===============
ALTER TABLE finance_entries
  DROP CONSTRAINT IF EXISTS finance_entries_tenant_id_tenants_id_fk,
  ADD CONSTRAINT finance_entries_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE finance_entries
  DROP CONSTRAINT IF EXISTS finance_entries_category_id_finance_categories_id_fk,
  ADD CONSTRAINT finance_entries_category_id_fk
    FOREIGN KEY (category_id)
    REFERENCES finance_categories(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =============== LEAD_TAGS TABLE ===============
ALTER TABLE lead_tags
  DROP CONSTRAINT IF EXISTS lead_tags_tenant_id_tenants_id_fk,
  ADD CONSTRAINT lead_tags_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== LEAD_TAG_LINKS TABLE ===============
ALTER TABLE lead_tag_links
  DROP CONSTRAINT IF EXISTS lead_tag_links_lead_id_leads_id_fk,
  ADD CONSTRAINT lead_tag_links_lead_id_fk
    FOREIGN KEY (lead_id)
    REFERENCES leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE lead_tag_links
  DROP CONSTRAINT IF EXISTS lead_tag_links_tag_id_lead_tags_id_fk,
  ADD CONSTRAINT lead_tag_links_tag_id_fk
    FOREIGN KEY (tag_id)
    REFERENCES lead_tags(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

-- =============== FOLLOW_UPS TABLE ===============
ALTER TABLE follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_tenant_id_tenants_id_fk,
  ADD CONSTRAINT follow_ups_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_lead_id_leads_id_fk,
  ADD CONSTRAINT follow_ups_lead_id_fk
    FOREIGN KEY (lead_id)
    REFERENCES leads(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_assigned_to_users_id_fk,
  ADD CONSTRAINT follow_ups_assigned_to_fk
    FOREIGN KEY (assigned_to)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =============== FILES TABLE ===============
ALTER TABLE files
  DROP CONSTRAINT IF EXISTS files_tenant_id_tenants_id_fk,
  ADD CONSTRAINT files_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE files
  DROP CONSTRAINT IF EXISTS files_user_id_users_id_fk,
  ADD CONSTRAINT files_user_id_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- =============== WHATSAPP TABLES ===============
ALTER TABLE whatsapp_templates
  DROP CONSTRAINT IF EXISTS whatsapp_templates_tenant_id_tenants_id_fk,
  ADD CONSTRAINT whatsapp_templates_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE whatsapp_conversations
  DROP CONSTRAINT IF EXISTS whatsapp_conversations_tenant_id_tenants_id_fk,
  ADD CONSTRAINT whatsapp_conversations_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE whatsapp_conversations
  DROP CONSTRAINT IF EXISTS whatsapp_conversations_lead_id_leads_id_fk,
  ADD CONSTRAINT whatsapp_conversations_lead_id_fk
    FOREIGN KEY (lead_id)
    REFERENCES leads(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE whatsapp_conversations
  DROP CONSTRAINT IF EXISTS whatsapp_conversations_assigned_to_users_id_fk,
  ADD CONSTRAINT whatsapp_conversations_assigned_to_fk
    FOREIGN KEY (assigned_to)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_tenant_id_tenants_id_fk,
  ADD CONSTRAINT whatsapp_messages_tenant_id_fk
    FOREIGN KEY (tenant_id)
    REFERENCES tenants(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_conversation_id_whatsapp_conversations_id_fk,
  ADD CONSTRAINT whatsapp_messages_conversation_id_fk
    FOREIGN KEY (conversation_id)
    REFERENCES whatsapp_conversations(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_template_id_whatsapp_templates_id_fk,
  ADD CONSTRAINT whatsapp_messages_template_id_fk
    FOREIGN KEY (template_id)
    REFERENCES whatsapp_templates(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_sent_by_users_id_fk,
  ADD CONSTRAINT whatsapp_messages_sent_by_fk
    FOREIGN KEY (sent_by)
    REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- COMMENT for documentation
COMMENT ON CONSTRAINT users_tenant_id_fk ON users IS 'Cascade delete users when tenant is deleted';
COMMENT ON CONSTRAINT rental_contracts_property_id_fk ON rental_contracts IS 'Prevent property deletion if active rental contracts exist';
COMMENT ON CONSTRAINT commissions_broker_id_fk ON commissions IS 'Prevent broker deletion if unpaid commissions exist';
