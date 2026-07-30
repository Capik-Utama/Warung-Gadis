-- ============================================================
-- Warung Gadis – Warung Gadis
-- Database Migration: Remove Supplier, SKU, Modal
-- ============================================================

-- 1. Drop supplier_id column from stock_logs (if not already dropped)
ALTER TABLE stock_logs DROP COLUMN IF EXISTS supplier_id;

-- 2. Drop sku column from products (if not already dropped)
ALTER TABLE products DROP COLUMN IF EXISTS sku;

-- 3. Drop capital_price column from products (if not already dropped)
ALTER TABLE products DROP COLUMN IF EXISTS capital_price;

-- 4. Drop suppliers table (if not already dropped)
DROP TABLE IF EXISTS suppliers CASCADE;

-- 5. Update trigger to exclude suppliers table
DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;

-- Note: Run this migration in Supabase SQL Editor
-- This removes the Supplier menu, SKU (product code), and Modal (capital price) fields
