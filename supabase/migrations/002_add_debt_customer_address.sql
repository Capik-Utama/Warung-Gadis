-- Migration: Add customer_address to debts table
-- Date: 2026-07-28

ALTER TABLE debts
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Also add index for searching debts by customer name
CREATE INDEX IF NOT EXISTS idx_debts_customer_name ON debts(customer_name);
