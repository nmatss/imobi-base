-- ================================================================
-- MIGRATION: Feature Tables (módulos sem persistência + ports SQLite->PG)
-- Created: 2026-06-10
-- Purpose: Criar no Postgres de produção as tabelas dos módulos que hoje
--          não têm persistência em lugar nenhum (Vistorias, AVM, ISA,
--          Auto-Marketing) e portar as tabelas que existiam só no
--          schema-sqlite (analytics + 10 tabelas de routes-features).
--          Espelha exatamente shared/schema.ts.
-- Impact: Zero downtime, aditivo e idempotente (IF NOT EXISTS em tudo).
-- Priority: 🔴 P0 (esses módulos 500am em produção sem as tabelas)
-- ================================================================

-- ==================== ANALYTICS ====================
-- Consumidores: server/routes-analytics.ts, server/storage.ts (ANALYTICS)

CREATE TABLE IF NOT EXISTS analytics_events (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  user_id VARCHAR,
  event_type TEXT NOT NULL,
  event_name TEXT,
  path TEXT,
  metric_name TEXT,
  metric_value REAL,
  metric_rating TEXT,
  error_message TEXT,
  error_stack TEXT,
  properties TEXT,
  user_agent TEXT,
  session_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON analytics_events(tenant_id);

-- ==================== LEAD INTELLIGENCE (routes-features) ====================

CREATE TABLE IF NOT EXISTS lead_scores (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR NOT NULL UNIQUE REFERENCES leads(id),
  total_score INTEGER NOT NULL DEFAULT 0,
  budget_score INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0,
  profile_score INTEGER DEFAULT 0,
  urgency_score INTEGER DEFAULT 0,
  behavior_score INTEGER DEFAULT 0,
  temperature TEXT DEFAULT 'cold',
  last_calculated TIMESTAMP NOT NULL DEFAULT now(),
  score_history TEXT,
  predicted_conversion REAL,
  next_best_action TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drip_campaigns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  total_enrolled INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drip_campaigns_tenant ON drip_campaigns(tenant_id);

CREATE TABLE IF NOT EXISTS campaign_steps (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR NOT NULL REFERENCES drip_campaigns(id),
  step_order INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  delay_hours INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  template_variables TEXT,
  conditions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_enrollments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR NOT NULL REFERENCES drip_campaigns(id),
  lead_id VARCHAR NOT NULL REFERENCES leads(id),
  current_step INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  enrolled_at TIMESTAMP NOT NULL DEFAULT now(),
  completed_at TIMESTAMP,
  last_step_at TIMESTAMP,
  next_step_at TIMESTAMP
);

-- ==================== PROPERTY FEATURES (routes-features) ====================

CREATE TABLE IF NOT EXISTS virtual_tours (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR NOT NULL REFERENCES properties(id),
  tour_type TEXT NOT NULL,
  tour_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS property_comparisons (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  user_id VARCHAR REFERENCES users(id),
  lead_id VARCHAR REFERENCES leads(id),
  session_id TEXT,
  property_ids TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_comparisons_tenant ON property_comparisons(tenant_id);

-- ==================== DIGITAL SIGNATURES (routes-features) ====================

CREATE TABLE IF NOT EXISTS digital_signatures (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR NOT NULL REFERENCES contracts(id),
  signer_type TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_document TEXT,
  signature_data TEXT,
  signature_hash TEXT,
  ip_address TEXT,
  user_agent TEXT,
  geo_location TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  signed_at TIMESTAMP,
  expires_at TIMESTAMP,
  token TEXT UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_documents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR NOT NULL REFERENCES contracts(id),
  document_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_hash TEXT,
  generated_by VARCHAR REFERENCES users(id),
  is_finalized BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- ==================== DASHBOARD CUSTOMIZATION (routes-features) ====================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL DEFAULT 'Principal',
  is_default BOOLEAN DEFAULT false,
  layout TEXT NOT NULL,
  widgets TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_tenant ON dashboard_layouts(tenant_id);

CREATE TABLE IF NOT EXISTS widget_types (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  component TEXT NOT NULL,
  default_config TEXT,
  min_width INTEGER DEFAULT 1,
  min_height INTEGER DEFAULT 1,
  max_width INTEGER,
  max_height INTEGER,
  required_permissions TEXT,
  is_active BOOLEAN DEFAULT true
);

-- ==================== INSPECTIONS / VISTORIAS ====================
-- Consumidores: server/routes-inspections.ts, server/storage.ts (INSPECTIONS),
-- server/services/inspection-service.ts

CREATE TABLE IF NOT EXISTS property_inspections (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  property_id VARCHAR NOT NULL REFERENCES properties(id),
  rental_contract_id VARCHAR,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  inspector_name TEXT NOT NULL,
  inspector_id VARCHAR REFERENCES users(id),
  renter_name TEXT,
  renter_id VARCHAR,
  scheduled_date TIMESTAMP,
  completed_date TIMESTAMP,
  signed_at TIMESTAMP,
  overall_condition TEXT,
  general_notes TEXT,
  total_damages REAL,
  previous_inspection_id VARCHAR,
  inspector_signature TEXT,
  renter_signature TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_inspections_tenant ON property_inspections(tenant_id);

CREATE TABLE IF NOT EXISTS inspection_rooms (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id VARCHAR NOT NULL REFERENCES property_inspections(id),
  room_type TEXT NOT NULL,
  room_label TEXT NOT NULL,
  overall_condition TEXT,
  notes TEXT,
  photos TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inspection_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR NOT NULL REFERENCES inspection_rooms(id),
  item_name TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'good',
  description TEXT,
  has_damage BOOLEAN DEFAULT false,
  damage_description TEXT,
  estimated_repair_cost REAL,
  photos TEXT,
  previous_condition TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

-- ==================== AVM (AUTOMATED VALUATION MODEL) ====================
-- Consumidores: server/routes-avm.ts, server/services/avm-engine.ts,
-- server/storage.ts (AVM)

CREATE TABLE IF NOT EXISTS property_valuations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  property_id VARCHAR REFERENCES properties(id),
  property_type TEXT NOT NULL,
  category TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  neighborhood TEXT,
  address TEXT,
  area REAL NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking_spaces INTEGER,
  features TEXT,
  condition TEXT,
  year_built INTEGER,
  estimated_value REAL,
  min_value REAL,
  max_value REAL,
  price_per_sqm REAL,
  confidence_score REAL,
  comparables_count INTEGER,
  comparables_data TEXT,
  market_trend TEXT,
  adjustments TEXT,
  methodology TEXT,
  report_url TEXT,
  requested_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_property_valuations_tenant ON property_valuations(tenant_id);

CREATE TABLE IF NOT EXISTS market_indices (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  city TEXT NOT NULL,
  state TEXT,
  property_type TEXT NOT NULL,
  category TEXT NOT NULL,
  avg_price_per_sqm REAL,
  median_price REAL,
  sample_size INTEGER,
  trend TEXT DEFAULT 'stable',
  trend_percentage REAL,
  period TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_market_indices_tenant ON market_indices(tenant_id);

-- ==================== ISA (INSIDE SALES AGENT) ====================
-- Consumidores: server/routes-isa.ts, server/integrations/whatsapp/isa-engine.ts,
-- server/storage.ts (ISA)

CREATE TABLE IF NOT EXISTS isa_conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  lead_id VARCHAR REFERENCES leads(id),
  phone_number TEXT NOT NULL,
  lead_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  conversation_stage TEXT DEFAULT 'greeting',
  qualification_data TEXT,
  interested_property_ids TEXT,
  temperature TEXT DEFAULT 'unknown',
  message_count INTEGER DEFAULT 0,
  assigned_agent_id VARCHAR REFERENCES users(id),
  transferred_at TIMESTAMP,
  visit_scheduled_id VARCHAR,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_isa_conversations_tenant ON isa_conversations(tenant_id);

CREATE TABLE IF NOT EXISTS isa_messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES isa_conversations(id),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  sent_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_isa_messages_conversation ON isa_messages(conversation_id);

CREATE TABLE IF NOT EXISTS isa_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL UNIQUE REFERENCES tenants(id),
  enabled BOOLEAN DEFAULT false,
  greeting TEXT,
  personality TEXT DEFAULT 'professional',
  working_hours TEXT,
  auto_qualify BOOLEAN DEFAULT true,
  auto_schedule_visits BOOLEAN DEFAULT false,
  transfer_to_human_threshold INTEGER DEFAULT 10,
  faq_responses TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP
);

-- ==================== AUTO-MARKETING ====================
-- Consumidores: server/routes-auto-marketing.ts, server/storage.ts (AUTO-MARKETING)

CREATE TABLE IF NOT EXISTS auto_marketing_content (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  property_id VARCHAR NOT NULL REFERENCES properties(id),
  description TEXT,
  description_tone TEXT,
  social_media_post TEXT,
  social_media_hashtags TEXT,
  email_subject TEXT,
  email_html TEXT,
  microsite_content TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_at TIMESTAMP,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auto_marketing_content_tenant ON auto_marketing_content(tenant_id);
