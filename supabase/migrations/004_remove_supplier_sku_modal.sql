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

-- 4. Update default min_stock to 2
ALTER TABLE products ALTER COLUMN min_stock SET DEFAULT 2;
UPDATE products SET min_stock = 2 WHERE min_stock = 5;

-- 5. Drop suppliers table (if not already dropped)
DROP TABLE IF EXISTS suppliers CASCADE;

-- 6. Drop suppliers updated_at trigger
DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON suppliers;
