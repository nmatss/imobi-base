-- Migration: Add SEO fields to brand_settings table
-- Description: Adds SEO meta tags configuration and WhatsApp toggle to brand settings

ALTER TABLE brand_settings
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS seo_keywords TEXT,
ADD COLUMN IF NOT EXISTS og_image TEXT,
ADD COLUMN IF NOT EXISTS google_analytics_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT true;

-- Comment on the new columns
COMMENT ON COLUMN brand_settings.seo_title IS 'Default SEO title for the public portal';
COMMENT ON COLUMN brand_settings.seo_description IS 'Default SEO meta description for the public portal';
COMMENT ON COLUMN brand_settings.seo_keywords IS 'SEO keywords for the public portal';
COMMENT ON COLUMN brand_settings.og_image IS 'Open Graph image URL for social media sharing';
COMMENT ON COLUMN brand_settings.google_analytics_id IS 'Google Analytics tracking ID';
COMMENT ON COLUMN brand_settings.whatsapp_enabled IS 'Enable/disable WhatsApp floating button on public portal';
