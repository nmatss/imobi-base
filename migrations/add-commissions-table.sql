-- Migration: Add commissions table for broker commission tracking
-- Date: 2024-12-14

CREATE TABLE IF NOT EXISTS commissions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id),
  sale_id VARCHAR REFERENCES property_sales(id),
  rental_contract_id VARCHAR REFERENCES rental_contracts(id),
  broker_id VARCHAR NOT NULL REFERENCES users(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'rental')),
  transaction_value DECIMAL(12, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL,
  gross_commission DECIMAL(12, 2) NOT NULL,
  agency_split DECIMAL(5, 2) NOT NULL DEFAULT 50,
  broker_commission DECIMAL(12, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_commissions_tenant_id ON commissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commissions_broker_id ON commissions(broker_id);
CREATE INDEX IF NOT EXISTS idx_commissions_sale_id ON commissions(sale_id);
CREATE INDEX IF NOT EXISTS idx_commissions_rental_contract_id ON commissions(rental_contract_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_commissions_transaction_type ON commissions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at DESC);

-- Add comment to table
COMMENT ON TABLE commissions IS 'Tracks broker commissions from property sales and rentals';
COMMENT ON COLUMN commissions.transaction_type IS 'Type of transaction: sale or rental';
COMMENT ON COLUMN commissions.commission_rate IS 'Percentage rate of commission';
COMMENT ON COLUMN commissions.gross_commission IS 'Total commission amount before split';
COMMENT ON COLUMN commissions.agency_split IS 'Percentage of commission going to broker(s)';
COMMENT ON COLUMN commissions.broker_commission IS 'Final commission amount for the broker';
COMMENT ON COLUMN commissions.status IS 'Commission status: pending, approved, or paid';
