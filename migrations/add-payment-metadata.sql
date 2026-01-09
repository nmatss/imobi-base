-- Add metadata column to tenant_subscriptions table for storing payment gateway IDs
-- This column will store JSON data including stripeCustomerId, mercadoPagoCustomerId, etc.

ALTER TABLE tenant_subscriptions
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add comment to explain the purpose
COMMENT ON COLUMN tenant_subscriptions.metadata IS 'Store payment gateway customer IDs (stripeCustomerId, mercadoPagoCustomerId, etc.)';

-- Create index for faster queries on metadata
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_metadata ON tenant_subscriptions USING gin(metadata);
