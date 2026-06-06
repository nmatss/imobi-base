-- =============================================================================
-- RLS_enable.sql  —  Row Level Security por tenant (ImobiBase)
-- =============================================================================
-- ARTEFATO PRONTO PARA APLICAR — NÃO APLIQUE SEM LER docs/RLS_RUNBOOK.md.
-- Requer o Postgres de produção (Supabase). Aplicar fora de ordem ou sem o
-- middleware que faz `SET LOCAL app.tenant_id` deixa o app SEM DADOS (políticas
-- USING avaliam para NULL e nenhuma linha é retornada).
--
-- Modelo de isolamento:
--   * Cada request abre uma transação e executa:
--         SET LOCAL app.tenant_id = '<uuid-do-tenant>';
--   * As políticas filtram por tenant_id = current_setting('app.tenant_id', true)::uuid
--   * current_setting(..., true) => retorna NULL (em vez de erro) quando a GUC
--     não foi setada; combinado com o USING, isso FALHA FECHADO (0 linhas).
--
-- IMPORTANTE sobre o role de conexão:
--   * RLS é IGNORADA por roles BYPASSRLS e pelo OWNER da tabela (a menos que
--     FORCE ROW LEVEL SECURITY seja aplicado). Este script usa FORCE para que
--     nem o owner escape das políticas. Rode as migrations/seed/admin com um
--     papel privilegiado (ex.: postgres) e a aplicação com um papel comum
--     NÃO-owner e NÃO-BYPASSRLS. Veja o runbook.
--
-- Idempotência: usa DROP POLICY IF EXISTS antes de CREATE POLICY.
-- =============================================================================

BEGIN;

-- ---- account_deletion_requests -------------------------------------------------------------------
ALTER TABLE "account_deletion_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account_deletion_requests" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "account_deletion_requests";
CREATE POLICY tenant_isolation ON "account_deletion_requests"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- ai_settings -------------------------------------------------------------------
ALTER TABLE "ai_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_settings" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "ai_settings";
CREATE POLICY tenant_isolation ON "ai_settings"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- audit_logs -------------------------------------------------------------------
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "audit_logs";
CREATE POLICY tenant_isolation ON "audit_logs"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- brand_settings -------------------------------------------------------------------
ALTER TABLE "brand_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_settings" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "brand_settings";
CREATE POLICY tenant_isolation ON "brand_settings"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- client_portal_access -------------------------------------------------------------------
ALTER TABLE "client_portal_access" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_portal_access" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "client_portal_access";
CREATE POLICY tenant_isolation ON "client_portal_access"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- commissions -------------------------------------------------------------------
ALTER TABLE "commissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commissions" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "commissions";
CREATE POLICY tenant_isolation ON "commissions"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- compliance_audit_log -------------------------------------------------------------------
ALTER TABLE "compliance_audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "compliance_audit_log" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "compliance_audit_log";
CREATE POLICY tenant_isolation ON "compliance_audit_log"
    USING (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- contracts -------------------------------------------------------------------
ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contracts" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "contracts";
CREATE POLICY tenant_isolation ON "contracts"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- cookie_preferences -------------------------------------------------------------------
ALTER TABLE "cookie_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cookie_preferences" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "cookie_preferences";
CREATE POLICY tenant_isolation ON "cookie_preferences"
    USING (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- data_breach_incidents -------------------------------------------------------------------
ALTER TABLE "data_breach_incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_breach_incidents" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "data_breach_incidents";
CREATE POLICY tenant_isolation ON "data_breach_incidents"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- data_export_requests -------------------------------------------------------------------
ALTER TABLE "data_export_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_export_requests" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "data_export_requests";
CREATE POLICY tenant_isolation ON "data_export_requests"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- data_processing_activities -------------------------------------------------------------------
ALTER TABLE "data_processing_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "data_processing_activities" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "data_processing_activities";
CREATE POLICY tenant_isolation ON "data_processing_activities"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- files -------------------------------------------------------------------
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "files" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "files";
CREATE POLICY tenant_isolation ON "files"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- finance_categories -------------------------------------------------------------------
ALTER TABLE "finance_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance_categories" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "finance_categories";
CREATE POLICY tenant_isolation ON "finance_categories"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- finance_entries -------------------------------------------------------------------
ALTER TABLE "finance_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "finance_entries" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "finance_entries";
CREATE POLICY tenant_isolation ON "finance_entries"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- follow_ups -------------------------------------------------------------------
ALTER TABLE "follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "follow_ups" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "follow_ups";
CREATE POLICY tenant_isolation ON "follow_ups"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- integration_configs -------------------------------------------------------------------
ALTER TABLE "integration_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "integration_configs" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "integration_configs";
CREATE POLICY tenant_isolation ON "integration_configs"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- lead_tags -------------------------------------------------------------------
ALTER TABLE "lead_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_tags" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "lead_tags";
CREATE POLICY tenant_isolation ON "lead_tags"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- leads -------------------------------------------------------------------
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leads" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "leads";
CREATE POLICY tenant_isolation ON "leads"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- maintenance_tickets -------------------------------------------------------------------
ALTER TABLE "maintenance_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "maintenance_tickets" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "maintenance_tickets";
CREATE POLICY tenant_isolation ON "maintenance_tickets"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- newsletter_subscriptions -------------------------------------------------------------------
ALTER TABLE "newsletter_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "newsletter_subscriptions" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "newsletter_subscriptions";
CREATE POLICY tenant_isolation ON "newsletter_subscriptions"
    USING (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- notification_preferences -------------------------------------------------------------------
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_preferences" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "notification_preferences";
CREATE POLICY tenant_isolation ON "notification_preferences"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- owners -------------------------------------------------------------------
ALTER TABLE "owners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "owners" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "owners";
CREATE POLICY tenant_isolation ON "owners"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- properties -------------------------------------------------------------------
ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "properties" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "properties";
CREATE POLICY tenant_isolation ON "properties"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- property_sales -------------------------------------------------------------------
ALTER TABLE "property_sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_sales" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "property_sales";
CREATE POLICY tenant_isolation ON "property_sales"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- rental_contracts -------------------------------------------------------------------
ALTER TABLE "rental_contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rental_contracts" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "rental_contracts";
CREATE POLICY tenant_isolation ON "rental_contracts"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- rental_payments -------------------------------------------------------------------
ALTER TABLE "rental_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rental_payments" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "rental_payments";
CREATE POLICY tenant_isolation ON "rental_payments"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- rental_transfers -------------------------------------------------------------------
ALTER TABLE "rental_transfers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rental_transfers" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "rental_transfers";
CREATE POLICY tenant_isolation ON "rental_transfers"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- renters -------------------------------------------------------------------
ALTER TABLE "renters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "renters" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "renters";
CREATE POLICY tenant_isolation ON "renters"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- sale_proposals -------------------------------------------------------------------
ALTER TABLE "sale_proposals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_proposals" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "sale_proposals";
CREATE POLICY tenant_isolation ON "sale_proposals"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- saved_reports -------------------------------------------------------------------
ALTER TABLE "saved_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_reports" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "saved_reports";
CREATE POLICY tenant_isolation ON "saved_reports"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- tenant_settings -------------------------------------------------------------------
ALTER TABLE "tenant_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_settings" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "tenant_settings";
CREATE POLICY tenant_isolation ON "tenant_settings"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- tenant_subscriptions -------------------------------------------------------------------
ALTER TABLE "tenant_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_subscriptions" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "tenant_subscriptions";
CREATE POLICY tenant_isolation ON "tenant_subscriptions"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- usage_logs -------------------------------------------------------------------
ALTER TABLE "usage_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "usage_logs" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "usage_logs";
CREATE POLICY tenant_isolation ON "usage_logs"
    USING (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- user_consents -------------------------------------------------------------------
ALTER TABLE "user_consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_consents" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "user_consents";
CREATE POLICY tenant_isolation ON "user_consents"
    USING (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id IS NULL
          OR tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- user_roles -------------------------------------------------------------------
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "user_roles";
CREATE POLICY tenant_isolation ON "user_roles"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- user_sessions -------------------------------------------------------------------
ALTER TABLE "user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_sessions" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "user_sessions";
CREATE POLICY tenant_isolation ON "user_sessions"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- users -------------------------------------------------------------------
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "users";
CREATE POLICY tenant_isolation ON "users"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- visits -------------------------------------------------------------------
ALTER TABLE "visits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "visits" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "visits";
CREATE POLICY tenant_isolation ON "visits"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- whatsapp_auto_responses -------------------------------------------------------------------
ALTER TABLE "whatsapp_auto_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_auto_responses" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "whatsapp_auto_responses";
CREATE POLICY tenant_isolation ON "whatsapp_auto_responses"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- whatsapp_conversations -------------------------------------------------------------------
ALTER TABLE "whatsapp_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_conversations" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "whatsapp_conversations";
CREATE POLICY tenant_isolation ON "whatsapp_conversations"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- whatsapp_message_queue -------------------------------------------------------------------
ALTER TABLE "whatsapp_message_queue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_message_queue" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "whatsapp_message_queue";
CREATE POLICY tenant_isolation ON "whatsapp_message_queue"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- whatsapp_messages -------------------------------------------------------------------
ALTER TABLE "whatsapp_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_messages" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "whatsapp_messages";
CREATE POLICY tenant_isolation ON "whatsapp_messages"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

-- ---- whatsapp_templates -------------------------------------------------------------------
ALTER TABLE "whatsapp_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "whatsapp_templates" FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON "whatsapp_templates";
CREATE POLICY tenant_isolation ON "whatsapp_templates"
    USING (
        tenant_id = current_setting('app.tenant_id', true)
    )
    WITH CHECK (
        tenant_id = current_setting('app.tenant_id', true)
    );

COMMIT;
