-- Visits: confirmation / reschedule / reminder / feedback / next-action workflow.
-- Additive and safe to run multiple times.

ALTER TABLE visits ADD COLUMN IF NOT EXISTS confirmation_token TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT 'pending';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS rescheduled_from_id VARCHAR;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS checklist_json TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS feedback_rating INTEGER;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS feedback_notes TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMP;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS next_action_type TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS next_action_due_at TIMESTAMP;

-- Self-referential FK for reschedules (guarded; added only once).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visits_rescheduled_from_id_fkey'
  ) THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_rescheduled_from_id_fkey
      FOREIGN KEY (rescheduled_from_id) REFERENCES visits(id);
  END IF;
END $$;

-- Partial unique index on confirmation_token (only when present).
CREATE UNIQUE INDEX IF NOT EXISTS uq_visits_confirmation_token
  ON visits(confirmation_token) WHERE confirmation_token IS NOT NULL;
