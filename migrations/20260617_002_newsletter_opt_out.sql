-- Persistent newsletter opt-out audit fields.
--
-- The public unsubscribe endpoint must leave durable evidence that an email is
-- suppressed, even when the original newsletter subscription row does not exist.

ALTER TABLE newsletter_subscriptions
  ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP;

ALTER TABLE newsletter_subscriptions
  ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;

ALTER TABLE newsletter_subscriptions
  ADD COLUMN IF NOT EXISTS resubscribed_at TIMESTAMP;

UPDATE newsletter_subscriptions
SET
  unsubscribed_at = COALESCE(unsubscribed_at, NOW()),
  unsubscribe_reason = COALESCE(unsubscribe_reason, 'legacy_active_false')
WHERE active = false
  AND unsubscribed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_newsletter_subscriptions_active_email
  ON newsletter_subscriptions (active, LOWER(email));
