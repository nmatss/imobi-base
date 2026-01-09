-- SMS Queue Table
-- Stores queued SMS messages for processing
CREATE TABLE IF NOT EXISTS sms_queue (
  id SERIAL PRIMARY KEY,
  to VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  template_name VARCHAR(100),
  template_context JSONB,
  scheduled_for TIMESTAMP NOT NULL DEFAULT NOW(),
  priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  max_retries INTEGER NOT NULL DEFAULT 3,
  retry_count INTEGER NOT NULL DEFAULT 0,
  segments INTEGER DEFAULT 1,
  estimated_cost DECIMAL(10, 4) DEFAULT 0,
  twilio_sid VARCHAR(34),
  sent_at TIMESTAMP,
  last_error TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for sms_queue
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_scheduled_for ON sms_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_queue_priority ON sms_queue(priority);
CREATE INDEX IF NOT EXISTS idx_sms_queue_to ON sms_queue(to);
CREATE INDEX IF NOT EXISTS idx_sms_queue_created_at ON sms_queue(created_at);

-- SMS Logs Table
-- Stores all sent/received SMS messages for analytics
CREATE TABLE IF NOT EXISTS sms_logs (
  id SERIAL PRIMARY KEY,
  queue_id INTEGER REFERENCES sms_queue(id) ON DELETE SET NULL,
  to VARCHAR(20) NOT NULL,
  "from" VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL,
  twilio_sid VARCHAR(34) UNIQUE,
  segments INTEGER DEFAULT 1,
  cost DECIMAL(10, 4) DEFAULT 0,
  direction VARCHAR(10) NOT NULL DEFAULT 'outbound' CHECK (direction IN ('outbound', 'inbound')),
  template_name VARCHAR(100),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  error_code VARCHAR(10),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for sms_logs
CREATE INDEX IF NOT EXISTS idx_sms_logs_to ON sms_logs(to);
CREATE INDEX IF NOT EXISTS idx_sms_logs_from ON sms_logs("from");
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_sms_logs_twilio_sid ON sms_logs(twilio_sid);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sent_at ON sms_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_template_name ON sms_logs(template_name);
CREATE INDEX IF NOT EXISTS idx_sms_logs_direction ON sms_logs(direction);

-- SMS Opt-outs Table
-- Maintains opt-out/opt-in status for compliance
CREATE TABLE IF NOT EXISTS sms_opt_outs (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  opt_out_reason VARCHAR(50),
  opt_out_source VARCHAR(100),
  opted_out_at TIMESTAMP,
  opt_in_source VARCHAR(100),
  opt_in_consent_text TEXT,
  opted_in_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for sms_opt_outs
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_phone_number ON sms_opt_outs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_opt_outs_opted_in ON sms_opt_outs(opted_in);

-- Verification Codes Table
-- Stores 2FA/verification codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  purpose VARCHAR(50) NOT NULL DEFAULT 'verification',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for verification_codes
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone_number ON verification_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_verified ON verification_codes(verified);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);

-- Comments for documentation
COMMENT ON TABLE sms_queue IS 'Queue for SMS messages to be sent';
COMMENT ON TABLE sms_logs IS 'Log of all sent/received SMS messages for analytics';
COMMENT ON TABLE sms_opt_outs IS 'Opt-out/opt-in status for phone numbers (TCPA/GDPR compliance)';
COMMENT ON TABLE verification_codes IS '2FA and verification codes sent via SMS';

COMMENT ON COLUMN sms_queue.priority IS 'Message priority: high, normal, or low';
COMMENT ON COLUMN sms_queue.status IS 'Current status: pending, processing, sent, failed, or cancelled';
COMMENT ON COLUMN sms_queue.segments IS 'Number of SMS segments (1 segment = 160 chars)';
COMMENT ON COLUMN sms_queue.estimated_cost IS 'Estimated cost in USD';

COMMENT ON COLUMN sms_logs.direction IS 'Message direction: outbound or inbound';
COMMENT ON COLUMN sms_logs.cost IS 'Actual cost in USD';
COMMENT ON COLUMN sms_logs.segments IS 'Number of SMS segments';

COMMENT ON COLUMN sms_opt_outs.opted_in IS 'true = opted in, false = opted out';
COMMENT ON COLUMN sms_opt_outs.opt_out_reason IS 'Reason: user_request, complaint, bounce, or admin';

COMMENT ON COLUMN verification_codes.purpose IS 'Purpose: verification, password_reset, or login_verification';
COMMENT ON COLUMN verification_codes.attempts IS 'Number of verification attempts (max 5)';
