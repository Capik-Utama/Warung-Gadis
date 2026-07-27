-- ============================================================
-- WG POS – Warung Gadis
-- Database Migration v1.0
-- Supabase PostgreSQL
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Branches ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL DEFAULT '',
  phone       TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  phone         TEXT NOT NULL DEFAULT '',
  address       TEXT NOT NULL DEFAULT '',
  role          TEXT NOT NULL CHECK (role IN ('owner','manager','staff')) DEFAULT 'staff',
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- ─── User Permissions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_permissions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);

-- ─── Categories ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  icon       TEXT,
  branch_id  UUID REFERENCES branches(id) ON DELETE CASCADE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  sku           TEXT UNIQUE,
  capital_price BIGINT NOT NULL DEFAULT 0,
  base_price    BIGINT NOT NULL DEFAULT 0,
  stock         INT NOT NULL DEFAULT 0,
  min_stock     INT NOT NULL DEFAULT 5,
  unit          TEXT NOT NULL DEFAULT 'pcs',
  image_url     TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- ─── Product Prices per Branch ─────────────────────────────
CREATE TABLE IF NOT EXISTS product_prices (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  price      BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, branch_id)
);

-- ─── Suppliers ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  address    TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  notes      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Stock Logs ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('in','out','adjustment','sale')),
  quantity    INT NOT NULL,
  notes       TEXT,
  user_id     UUID NOT NULL REFERENCES users(id),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_logs_product ON stock_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_branch ON stock_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_created ON stock_logs(created_at DESC);

-- ─── Transactions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code           TEXT NOT NULL UNIQUE,
  branch_id      UUID NOT NULL REFERENCES branches(id),
  user_id        UUID NOT NULL REFERENCES users(id),
  customer_name  TEXT,
  customer_phone TEXT,
  status         TEXT NOT NULL CHECK (status IN ('pending','paid','debt','cancelled')) DEFAULT 'pending',
  payment_method TEXT CHECK (payment_method IN ('cash','qris','transfer')),
  total_amount   BIGINT NOT NULL DEFAULT 0,
  paid_amount    BIGINT NOT NULL DEFAULT 0,
  change_amount  BIGINT NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_branch ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- ─── Transaction Items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_items (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id),
  quantity       INT NOT NULL,
  unit_price     BIGINT NOT NULL,
  subtotal       BIGINT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('pending','paid','debt','cancelled')) DEFAULT 'pending',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trx_items_transaction ON transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_trx_items_product ON transaction_items(product_id);

-- ─── Debts ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id   UUID REFERENCES transactions(id) ON DELETE SET NULL,
  branch_id        UUID NOT NULL REFERENCES branches(id),
  customer_name    TEXT NOT NULL,
  customer_phone   TEXT,
  total_amount     BIGINT NOT NULL,
  paid_amount      BIGINT NOT NULL DEFAULT 0,
  remaining_amount BIGINT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('unpaid','partial','paid')) DEFAULT 'unpaid',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
CREATE INDEX IF NOT EXISTS idx_debts_branch ON debts(branch_id);

-- ─── Debt Payments ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debt_payments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  debt_id    UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  code       TEXT,
  amount     BIGINT NOT NULL,
  user_id    UUID NOT NULL REFERENCES users(id),
  branch_id  UUID NOT NULL REFERENCES branches(id),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt ON debt_payments(debt_id);

-- ─── Shifts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  branch_id   UUID NOT NULL REFERENCES branches(id),
  check_in    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out   TIMESTAMPTZ,
  system_cash BIGINT NOT NULL DEFAULT 0,
  actual_cash BIGINT,
  difference  BIGINT,
  notes       TEXT,
  status      TEXT NOT NULL CHECK (status IN ('active','pending_handover','closed')) DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shifts_user ON shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_branch ON shifts(branch_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);

-- ─── Shift Handovers ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS shift_handovers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_shift_id UUID NOT NULL REFERENCES shifts(id),
  from_user_id  UUID NOT NULL REFERENCES users(id),
  to_user_id    UUID NOT NULL REFERENCES users(id),
  branch_id     UUID NOT NULL REFERENCES branches(id),
  system_cash   BIGINT NOT NULL DEFAULT 0,
  actual_cash   BIGINT NOT NULL DEFAULT 0,
  difference    BIGINT NOT NULL DEFAULT 0,
  notes         TEXT,
  status        TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handovers_to_user ON shift_handovers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_handovers_status ON shift_handovers(status);

-- ─── Updated-at trigger ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'branches','users','categories','products','product_prices',
    'suppliers','transactions','debts'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- ─── Adjust stock function ─────────────────────────────────
CREATE OR REPLACE FUNCTION adjust_stock(p_product_id UUID, p_delta INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET stock = stock + p_delta WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- ─── Auto reduce stock on sale trigger ────────────────────
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'sale' THEN
    UPDATE products SET stock = GREATEST(0, stock - NEW.quantity) WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_on_sale
AFTER INSERT ON stock_logs
FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_sale();
