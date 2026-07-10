-- Missing core tables (Postgres parity)
-- ---------------------------------------------------------------------------
-- Estas 4 tabelas existem em shared/schema.ts e na init SQLite, mas nunca
-- tiveram um CREATE TABLE no conjunto migrations/*.sql. Em produção elas já
-- existem porque o provisionamento canônico é `drizzle-kit push` (db:push),
-- que materializa TODO o schema Drizzle. Esta migration apenas garante que
-- ambientes reconstruídos a partir de migrations (staging/DR) também as tenham.
--
-- Aditiva e segura para rodar múltiplas vezes (CREATE TABLE IF NOT EXISTS +
-- FKs/índices guardados). As FKs para lead_tags/user_roles são adicionadas em
-- DO-blocks condicionais porque essas tabelas-pai também dependem do db:push.
-- ---------------------------------------------------------------------------

-- interactions: histórico de interações de CRM por lead
CREATE TABLE IF NOT EXISTS interactions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR NOT NULL,
  user_id VARCHAR NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);

-- lead_tag_links: associação N:N entre leads e lead_tags
CREATE TABLE IF NOT EXISTS lead_tag_links (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR NOT NULL,
  tag_id VARCHAR NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_tag_links_lead ON lead_tag_links(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tag_links_tag ON lead_tag_links(tag_id);

-- user_permissions: overrides de permissão por usuário/role
CREATE TABLE IF NOT EXISTS user_permissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  role_id VARCHAR,
  custom_permissions JSON,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- property_coordinates: geocoding por imóvel (1:1)
CREATE TABLE IF NOT EXISTS property_coordinates (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id VARCHAR NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  geocoded_address TEXT,
  geocoded_at TIMESTAMP,
  manually_set BOOLEAN DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_property_coordinates_property
  ON property_coordinates(property_id);

-- Foreign keys (guardadas: só criadas se a tabela-pai existir e a FK ainda não)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_interactions_lead') THEN
    ALTER TABLE interactions ADD CONSTRAINT fk_interactions_lead
      FOREIGN KEY (lead_id) REFERENCES leads(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_interactions_user') THEN
    ALTER TABLE interactions ADD CONSTRAINT fk_interactions_user
      FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lead_tag_links_lead') THEN
    ALTER TABLE lead_tag_links ADD CONSTRAINT fk_lead_tag_links_lead
      FOREIGN KEY (lead_id) REFERENCES leads(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_tags')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_lead_tag_links_tag') THEN
    ALTER TABLE lead_tag_links ADD CONSTRAINT fk_lead_tag_links_tag
      FOREIGN KEY (tag_id) REFERENCES lead_tags(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_permissions_user') THEN
    ALTER TABLE user_permissions ADD CONSTRAINT fk_user_permissions_user
      FOREIGN KEY (user_id) REFERENCES users(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_user_permissions_role') THEN
    ALTER TABLE user_permissions ADD CONSTRAINT fk_user_permissions_role
      FOREIGN KEY (role_id) REFERENCES user_roles(id);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'properties')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_property_coordinates_property') THEN
    ALTER TABLE property_coordinates ADD CONSTRAINT fk_property_coordinates_property
      FOREIGN KEY (property_id) REFERENCES properties(id);
  END IF;
END $$;
