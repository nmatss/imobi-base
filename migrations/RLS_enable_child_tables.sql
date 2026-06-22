-- =============================================================================
-- RLS_enable_child_tables.sql — cobertura RLS para tabelas FILHAS (sem tenant_id)
-- =============================================================================
-- COMPLEMENTA migrations/RLS_enable.sql. NÃO APLICAR sem ler docs/RLS_RUNBOOK.md
-- e SEM validar com `npm run db:rls:verify` contra o banco real.
--
-- Por que um arquivo separado:
--   Estas tabelas NÃO possuem coluna `tenant_id` própria; o isolamento é por
--   relação com a tabela-pai (que já tem RLS por tenant). As políticas usam um
--   subselect na tabela-pai filtrando por current_setting('app.tenant_id').
--   Como a pai já tem FORCE RLS, o subselect também é filtrado por tenant
--   (defesa em profundidade) — o filtro explícito abaixo é redundante porém
--   intencional, para não depender apenas do RLS da pai.
--
-- FALHA FECHADO: se o request acessar estas tabelas SEM `SET LOCAL app.tenant_id`,
--   o subselect retorna 0 linhas e a tabela aparece vazia. Garanta que TODO
--   acesso a estas tabelas ocorra dentro de runWithTenantRlsContext(...).
--
-- ⚠️ TABELAS DE AUTH DELIBERADAMENTE NÃO INCLUÍDAS AQUI:
--   two_factor_auth, login_history, user_permissions.
--   Elas são escritas durante fluxos de autenticação (login/2FA) que podem NÃO
--   ter o GUC `app.tenant_id` setado (o tenant ainda não é conhecido em logins
--   falhos / por e-mail). Ligar FORCE RLS nelas ingenuamente QUEBRA o login
--   (insert fail-closed). Só habilitar após confirmar que o caminho de auth seta
--   o tenant context, com policy via user_id -> users.tenant_id, e validar.
-- =============================================================================

BEGIN;

-- Helper de leitura: cada policy abaixo segue o mesmo molde.
--   USING (<fk> IN (SELECT id FROM <pai> WHERE tenant_id = current_setting('app.tenant_id', true)))

-- ---- interactions (via leads) ----------------------------------------------
ALTER TABLE "interactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "interactions" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "interactions";
CREATE POLICY tenant_isolation ON "interactions"
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- lead_tag_links (via leads) --------------------------------------------
ALTER TABLE "lead_tag_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_tag_links" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "lead_tag_links";
CREATE POLICY tenant_isolation ON "lead_tag_links"
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- lead_scores (via leads) -----------------------------------------------
ALTER TABLE "lead_scores" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lead_scores" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "lead_scores";
CREATE POLICY tenant_isolation ON "lead_scores"
  USING (lead_id IN (SELECT id FROM leads WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (lead_id IN (SELECT id FROM leads WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- campaign_enrollments (via drip_campaigns) -----------------------------
ALTER TABLE "campaign_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_enrollments" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "campaign_enrollments";
CREATE POLICY tenant_isolation ON "campaign_enrollments"
  USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (campaign_id IN (SELECT id FROM drip_campaigns WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- campaign_steps (via drip_campaigns) -----------------------------------
ALTER TABLE "campaign_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "campaign_steps" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "campaign_steps";
CREATE POLICY tenant_isolation ON "campaign_steps"
  USING (campaign_id IN (SELECT id FROM drip_campaigns WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (campaign_id IN (SELECT id FROM drip_campaigns WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- buyer_selection_items (via buyer_selections) --------------------------
ALTER TABLE "buyer_selection_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "buyer_selection_items" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "buyer_selection_items";
CREATE POLICY tenant_isolation ON "buyer_selection_items"
  USING (selection_id IN (SELECT id FROM buyer_selections WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (selection_id IN (SELECT id FROM buyer_selections WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- digital_signatures (via contracts) ------------------------------------
ALTER TABLE "digital_signatures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "digital_signatures" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "digital_signatures";
CREATE POLICY tenant_isolation ON "digital_signatures"
  USING (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- contract_documents (via contracts) ------------------------------------
ALTER TABLE "contract_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_documents" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "contract_documents";
CREATE POLICY tenant_isolation ON "contract_documents"
  USING (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (contract_id IN (SELECT id FROM contracts WHERE tenant_id = current_setting('app.tenant_id', true)));

-- ---- property_coordinates (via properties) ---------------------------------
ALTER TABLE "property_coordinates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "property_coordinates" FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON "property_coordinates";
CREATE POLICY tenant_isolation ON "property_coordinates"
  USING (property_id IN (SELECT id FROM properties WHERE tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (property_id IN (SELECT id FROM properties WHERE tenant_id = current_setting('app.tenant_id', true)));

COMMIT;
