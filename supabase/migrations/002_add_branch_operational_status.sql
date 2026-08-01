-- ============================================================
-- Warung Gadis – Add Branch Operational Status
-- Database Migration v1.1
-- Supabase PostgreSQL
-- ============================================================

-- Add is_operational column to branches table
-- This column tracks whether a branch is currently open for business
ALTER TABLE branches
ADD COLUMN IF NOT EXISTS is_operational BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN branches.is_operational IS 'Whether the branch is currently open for business operations';

-- Update all existing branches to be operational by default
UPDATE branches SET is_operational = true WHERE is_operational IS NULL;

-- Create index for faster queries filtering by operational status
CREATE INDEX IF NOT EXISTS idx_branches_operational ON branches(is_operational);
