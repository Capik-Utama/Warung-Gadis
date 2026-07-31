-- ============================================================
-- Fase 2: Stok per cabang
-- Warung Gadis (Capik-Utama/Warung-Gadis)
-- ============================================================
-- Sebelumnya stok disimpan global di products.stock. Sekarang stok
-- disimpan per cabang di tabel product_stocks, mengikuti pola
-- product_prices yang sudah ada.
--
-- products.stock TIDAK dihapus di migrasi ini supaya deploy lama
-- tidak langsung rusak. Kolom itu hanya tidak lagi jadi sumber
-- kebenaran.
-- ============================================================

BEGIN;

-- ─── Tabel stok per cabang ──────────────────────────────────
CREATE TABLE IF NOT EXISTS product_stocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  stock      INT NOT NULL DEFAULT 0,
  min_stock  INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_product_stocks_product ON product_stocks(product_id);
CREATE INDEX IF NOT EXISTS idx_product_stocks_branch  ON product_stocks(branch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON product_stocks TO anon, authenticated;
GRANT ALL ON product_stocks TO service_role;

ALTER TABLE product_stocks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_stocks' AND policyname = 'allow_all'
  ) THEN
    CREATE POLICY "allow_all" ON product_stocks FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ─── Backfill ───────────────────────────────────────────────
-- Baris untuk semua kombinasi produk x cabang aktif.
-- Stok lama global masuk ke cabang tertua saja agar tidak terduplikasi.
WITH primary_branch AS (
  SELECT id FROM branches WHERE is_active ORDER BY created_at, id LIMIT 1
)
INSERT INTO product_stocks (product_id, branch_id, stock, min_stock)
SELECT
  p.id,
  b.id,
  CASE WHEN b.id = (SELECT id FROM primary_branch) THEN COALESCE(p.stock, 0) ELSE 0 END,
  COALESCE(p.min_stock, 5)
FROM products p
CROSS JOIN branches b
WHERE b.is_active
ON CONFLICT (product_id, branch_id) DO NOTHING;

-- ─── Fungsi penyesuaian stok per cabang ─────────────────────
CREATE OR REPLACE FUNCTION adjust_branch_stock(
  p_product_id UUID,
  p_branch_id  UUID,
  p_delta      INT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO product_stocks (product_id, branch_id, stock)
  VALUES (p_product_id, p_branch_id, GREATEST(0, p_delta))
  ON CONFLICT (product_id, branch_id) DO UPDATE
    SET stock = GREATEST(0, product_stocks.stock + p_delta),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION adjust_branch_stock(UUID, UUID, INT) TO anon, authenticated, service_role;

-- ─── Set stok ke nilai tertentu (dipakai UI "Ubah stok") ────
CREATE OR REPLACE FUNCTION set_branch_stock(
  p_product_id UUID,
  p_branch_id  UUID,
  p_stock      INT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO product_stocks (product_id, branch_id, stock)
  VALUES (p_product_id, p_branch_id, GREATEST(0, p_stock))
  ON CONFLICT (product_id, branch_id) DO UPDATE
    SET stock = GREATEST(0, p_stock),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION set_branch_stock(UUID, UUID, INT) TO anon, authenticated, service_role;

-- ─── Trigger penjualan: kurangi stok cabang, bukan global ───
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'sale' THEN
    PERFORM adjust_branch_stock(NEW.product_id, NEW.branch_id, -NEW.quantity);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- adjust_stock lama dibuat no-op aman agar kode lama tidak merusak data
CREATE OR REPLACE FUNCTION adjust_stock(p_product_id UUID, p_delta INT)
RETURNS VOID AS $$
BEGIN
  -- Stok kini per cabang; gunakan adjust_branch_stock.
  RAISE NOTICE 'adjust_stock sudah tidak dipakai, gunakan adjust_branch_stock';
END;
$$ LANGUAGE plpgsql;

-- ─── Produk baru otomatis dapat baris stok di semua cabang ──
CREATE OR REPLACE FUNCTION seed_product_stocks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_stocks (product_id, branch_id, stock, min_stock)
  SELECT NEW.id, b.id, 0, COALESCE(NEW.min_stock, 5)
  FROM branches b
  WHERE b.is_active
  ON CONFLICT (product_id, branch_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_product_stocks ON products;
CREATE TRIGGER trg_seed_product_stocks
AFTER INSERT ON products
FOR EACH ROW EXECUTE FUNCTION seed_product_stocks();

-- ─── Cabang baru otomatis dapat baris stok semua produk ─────
CREATE OR REPLACE FUNCTION seed_branch_stocks()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_stocks (product_id, branch_id, stock, min_stock)
  SELECT p.id, NEW.id, 0, COALESCE(p.min_stock, 5)
  FROM products p
  ON CONFLICT (product_id, branch_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seed_branch_stocks ON branches;
CREATE TRIGGER trg_seed_branch_stocks
AFTER INSERT ON branches
FOR EACH ROW EXECUTE FUNCTION seed_branch_stocks();

COMMIT;
